-- ===================================================================
-- Mova Campus — Attendance Tracking Migration
-- Migration: 20261028000000_create_attendance.sql
--
-- Adds two tables:
--   1. public.subjects   — user-scoped subject list with attendance targets
--   2. public.attendance_records — individual dated attendance entries
--
-- Preserves all existing tables (profiles, tasks, classes).
-- ===================================================================

-- 1. Create the public.subjects table
--    Each student defines their subjects and sets a minimum attendance target.
--    Subject names are unique per user (case-insensitive via unique index).
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_percentage integer not null default 75,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Constraints
  constraint check_subjects_name_valid
    check (char_length(trim(name)) >= 1 and char_length(name) <= 100),
  constraint check_subjects_target_valid
    check (target_percentage >= 1 and target_percentage <= 100)
);

-- Unique subject name per user (case-insensitive)
create unique index if not exists uq_subjects_user_name
  on public.subjects (user_id, lower(trim(name)));

-- Comments
comment on table public.subjects is 'User-scoped subjects with individual attendance targets for Mova Campus.';
comment on column public.subjects.id is 'Unique subject identifier.';
comment on column public.subjects.user_id is 'Owner reference linked to auth.users(id).';
comment on column public.subjects.name is 'Subject or course name (e.g. Data Structures).';
comment on column public.subjects.target_percentage is 'Minimum attendance target percentage (1-100, default 75).';
comment on column public.subjects.created_at is 'Record creation timestamp.';
comment on column public.subjects.updated_at is 'Record modification timestamp.';

-- Index for user queries
create index if not exists idx_subjects_user_id
  on public.subjects(user_id);

-- Trigger for updated_at (reuses handle_updated_at from profiles migration)
drop trigger if exists on_subjects_updated on public.subjects;
create trigger on_subjects_updated
  before update on public.subjects
  for each row
  execute function public.handle_updated_at();

-- RLS
alter table public.subjects enable row level security;

create policy "Users can view own subjects"
  on public.subjects for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own subjects"
  on public.subjects for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own subjects"
  on public.subjects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own subjects"
  on public.subjects for delete to authenticated
  using ((select auth.uid()) = user_id);


-- 2. Create the public.attendance_records table
--    Each row represents ONE class occurrence on a specific date.
--    A student may have multiple classes of the same subject per day
--    (e.g. lecture + lab), so (subject_id, date) is NOT unique.
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  date date not null,
  status text not null default 'present',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Constraints
  constraint check_attendance_status_valid
    check (status in ('present', 'absent')),
  constraint check_attendance_date_not_future
    check (date <= current_date + interval '1 day')
);

-- Comments
comment on table public.attendance_records is 'Individual dated attendance records for Mova Campus attendance tracking.';
comment on column public.attendance_records.id is 'Unique attendance record identifier.';
comment on column public.attendance_records.user_id is 'Owner reference linked to auth.users(id).';
comment on column public.attendance_records.subject_id is 'Subject this attendance record belongs to.';
comment on column public.attendance_records.date is 'Calendar date of the class occurrence.';
comment on column public.attendance_records.status is 'Attendance status: present or absent.';
comment on column public.attendance_records.created_at is 'Record creation timestamp.';
comment on column public.attendance_records.updated_at is 'Record modification timestamp.';

-- Indexes for primary query shapes
create index if not exists idx_attendance_user_id
  on public.attendance_records(user_id);

create index if not exists idx_attendance_subject_id
  on public.attendance_records(subject_id);

create index if not exists idx_attendance_user_subject_date
  on public.attendance_records(user_id, subject_id, date);

create index if not exists idx_attendance_user_date
  on public.attendance_records(user_id, date);

-- Trigger for updated_at
drop trigger if exists on_attendance_records_updated on public.attendance_records;
create trigger on_attendance_records_updated
  before update on public.attendance_records
  for each row
  execute function public.handle_updated_at();

-- RLS
alter table public.attendance_records enable row level security;

create policy "Users can view own attendance"
  on public.attendance_records for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own attendance"
  on public.attendance_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own attendance"
  on public.attendance_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own attendance"
  on public.attendance_records for delete to authenticated
  using ((select auth.uid()) = user_id);
