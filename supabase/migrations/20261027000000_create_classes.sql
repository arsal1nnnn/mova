-- ===================================================================
-- Mova — Phase 2, Task 2: Timetable / Routine Management Migration
-- Migration: 20261027000000_create_classes.sql
-- ===================================================================

-- 1. Create the public.classes table
--    A class is a recurring weekly timetable entry: it occupies one
--    (weekday, start_time, end_time) slot and repeats every week.
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  title text not null,
  weekday smallint not null,
  start_time text not null,
  end_time text not null,
  room text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Constraints
  constraint check_classes_subject_name_valid
    check (char_length(trim(subject_name)) >= 1 and char_length(subject_name) <= 100),
  constraint check_classes_title_valid
    check (char_length(trim(title)) >= 1 and char_length(title) <= 120),
  -- Weekday follows JavaScript Date#getDay(): 0 = Sunday, 6 = Saturday
  constraint check_classes_weekday_valid
    check (weekday >= 0 and weekday <= 6),
  constraint check_classes_start_time_valid
    check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint check_classes_end_time_valid
    check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- HH:MM text compares correctly lexicographically, so this rejects
  -- empty and inverted time ranges without extra casting.
  constraint check_classes_time_range_valid
    check (end_time > start_time),
  constraint check_classes_room_valid
    check (room is null or (char_length(trim(room)) >= 1 and char_length(room) <= 100))
);

-- Comments describing table and columns
comment on table public.classes is 'Recurring weekly college class slots for the Mova timetable.';
comment on column public.classes.id is 'Unique class slot identifier.';
comment on column public.classes.user_id is 'Owner reference linked to auth.users(id).';
comment on column public.classes.subject_name is 'Subject or course name (e.g. Data Structures).';
comment on column public.classes.title is 'Class title or activity (e.g. Lecture, Lab Batch B).';
comment on column public.classes.weekday is 'Day of week: 0 = Sunday, 6 = Saturday.';
comment on column public.classes.start_time is 'Local class start time in 24-hour HH:MM format.';
comment on column public.classes.end_time is 'Local class end time in 24-hour HH:MM format.';
comment on column public.classes.room is 'Optional room or location label.';
comment on column public.classes.created_at is 'Record creation timestamp.';
comment on column public.classes.updated_at is 'Record modification timestamp.';

-- 2. Indexes for the primary query shapes
--    (fetch a user's whole week, or one weekday of it)
create index if not exists idx_classes_user_id
  on public.classes(user_id);

create index if not exists idx_classes_user_weekday_time
  on public.classes(user_id, weekday, start_time);

-- 3. Trigger for updated_at
drop trigger if exists on_classes_updated on public.classes;
create trigger on_classes_updated
  before update on public.classes
  for each row
  execute function public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
alter table public.classes enable row level security;

-- 5. Least-Privilege RLS Policies
-- SELECT: Users can only view their own timetable
create policy "Users can view own classes"
  on public.classes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT: Users can only create classes for themselves
create policy "Users can insert own classes"
  on public.classes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- UPDATE: Users can only update their own classes and cannot reassign ownership
create policy "Users can update own classes"
  on public.classes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- DELETE: Users can only delete their own classes
create policy "Users can delete own classes"
  on public.classes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
