-- ===================================================================
-- Mova — Phase 2, Task 1: Task Management Migration
-- Migration: 20261026000000_create_tasks.sql
-- ===================================================================

-- 1. Create the public.tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  due_time text,
  priority text not null default 'medium',
  category text not null default 'academic',
  estimated_duration integer,
  is_completed boolean not null default false,
  completed_at timestamptz,
  recurrence text not null default 'none',
  recurrence_interval integer not null default 1,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Constraints
  constraint check_tasks_title_valid
    check (char_length(trim(title)) >= 1 and char_length(title) <= 200),
  constraint check_tasks_description_valid
    check (description is null or char_length(description) <= 2000),
  constraint check_tasks_due_time_valid
    check (due_time is null or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint check_tasks_priority_valid
    check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint check_tasks_category_valid
    check (category in ('academic', 'personal', 'work', 'health', 'other')),
  constraint check_tasks_estimated_duration_valid
    check (estimated_duration is null or (estimated_duration >= 1 and estimated_duration <= 1440)),
  constraint check_tasks_recurrence_valid
    check (recurrence in ('none', 'daily', 'weekdays', 'weekly', 'monthly')),
  constraint check_tasks_recurrence_interval_valid
    check (recurrence_interval >= 1 and recurrence_interval <= 365)
);

-- Comments describing table and columns
comment on table public.tasks is 'Task management records for Mova campus routine and productivity.';
comment on column public.tasks.id is 'Unique task identifier.';
comment on column public.tasks.user_id is 'Owner reference linked to auth.users(id).';
comment on column public.tasks.title is 'Short descriptive title of the task.';
comment on column public.tasks.description is 'Detailed task description or notes.';
comment on column public.tasks.due_date is 'Optional calendar due date (YYYY-MM-DD).';
comment on column public.tasks.due_time is 'Optional 24-hour due time (HH:MM).';
comment on column public.tasks.priority is 'Task priority level: low, medium, high, urgent.';
comment on column public.tasks.category is 'Task category: academic, personal, work, health, other.';
comment on column public.tasks.estimated_duration is 'Estimated duration in minutes (1 to 1440).';
comment on column public.tasks.is_completed is 'Completion status flag.';
comment on column public.tasks.completed_at is 'Timestamp when task was marked completed.';
comment on column public.tasks.recurrence is 'Recurrence pattern: none, daily, weekdays, weekly, monthly.';
comment on column public.tasks.recurrence_interval is 'Multiplier for recurrence interval.';
comment on column public.tasks.created_at is 'Record creation timestamp.';
comment on column public.tasks.updated_at is 'Record modification timestamp.';

-- 2. Indexes for efficient user query filtering
create index if not exists idx_tasks_user_id
  on public.tasks(user_id);

create index if not exists idx_tasks_user_status_due
  on public.tasks(user_id, is_completed, due_date);

-- 3. Trigger for updated_at
drop trigger if exists on_tasks_updated on public.tasks;
create trigger on_tasks_updated
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
alter table public.tasks enable row level security;

-- 5. Least-Privilege RLS Policies
-- SELECT: Users can only view their own tasks
create policy "Users can view own tasks"
  on public.tasks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT: Users can only create tasks for themselves
create policy "Users can insert own tasks"
  on public.tasks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- UPDATE: Users can only update their own tasks, cannot reassign user_id
create policy "Users can update own tasks"
  on public.tasks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- DELETE: Users can only delete their own tasks
create policy "Users can delete own tasks"
  on public.tasks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
