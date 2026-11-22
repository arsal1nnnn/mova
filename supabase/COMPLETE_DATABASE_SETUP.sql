-- ===================================================================
-- MOVA CAMPUS — CONSOLIDATED COMPLETE DATABASE SETUP
-- Target Database: Supabase PostgreSQL
-- File: supabase/COMPLETE_DATABASE_SETUP.sql
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/bwoczemdwolwmxbnkxfl
-- 2. Go to the "SQL Editor" tab on the left sidebar.
-- 3. Click "New query", paste the entire contents of this file, and click "Run".
--
-- This script is completely safe, idempotent, and preserves existing data.
-- It creates all tables, functions, triggers, indexes, and RLS policies
-- required by Mova Campus:
--   1. public.profiles
--   2. public.tasks
--   3. public.classes
--   4. public.subjects
--   5. public.attendance_records
-- ===================================================================

-- Ensure standard extensions exist
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ===================================================================
-- 1. SHARED UTILITY FUNCTIONS & TRIGGERS
-- ===================================================================

-- Function to automatically update updated_at timestamp on row modification
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security invoker set search_path = '';

revoke all on function public.handle_updated_at() from public;
grant execute on function public.handle_updated_at() to authenticated;

-- Function to dynamically calculate age from date_of_birth
create or replace function public.calculate_age(dob date)
returns integer as $$
begin
  if dob is null then
    return null;
  end if;
  return date_part('year', age(current_date, dob))::integer;
end;
$$ language plpgsql stable security invoker set search_path = '';

comment on function public.calculate_age(date) is 'Computes current calendar age from date of birth without storing stale age values.';

revoke all on function public.calculate_age(date) from public;
grant execute on function public.calculate_age(date) to authenticated;


-- ===================================================================
-- 2. TABLE: public.profiles
-- Linked 1-to-1 with auth.users
-- ===================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  date_of_birth date not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint check_name_valid
    check (char_length(trim(name)) >= 1 and char_length(name) <= 100),
  constraint check_date_of_birth_valid
    check (date_of_birth <= current_date and date_of_birth >= '1900-01-01'),
  constraint check_avatar_url_valid
    check (avatar_url is null or char_length(avatar_url) <= 2048)
);

comment on table public.profiles is 'User profiles for Mova campus life.';
comment on column public.profiles.id is 'Primary key linked 1-to-1 with auth.users(id).';
comment on column public.profiles.name is 'User chosen display name.';
comment on column public.profiles.date_of_birth is 'User date of birth in YYYY-MM-DD format.';
comment on column public.profiles.avatar_url is 'Reference path or URL to the user uploaded avatar image.';

-- Auto update timestamp trigger
drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.profiles enable row level security;

-- Least-privilege RLS Policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

-- Automatic Profile Provisioning on User Signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'student'), '@', 1),
    'Student'
  );

  insert into public.profiles (id, name, date_of_birth, avatar_url)
  values (
    new.id,
    display_name,
    '2002-01-01', -- Sensible default college student birthdate
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ===================================================================
-- 3. TABLE: public.tasks
-- Student tasks, assignments, deadlines and routine focus
-- ===================================================================

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

comment on table public.tasks is 'Task management records for Mova campus routine and productivity.';
comment on column public.tasks.id is 'Unique task identifier.';
comment on column public.tasks.user_id is 'Owner reference linked to auth.users(id).';
comment on column public.tasks.title is 'Short descriptive title of the task.';
comment on column public.tasks.due_date is 'Optional calendar due date (YYYY-MM-DD).';
comment on column public.tasks.due_time is 'Optional 24-hour due time (HH:MM).';

-- Indexes
create index if not exists idx_tasks_user_id
  on public.tasks(user_id);

create index if not exists idx_tasks_user_status_due
  on public.tasks(user_id, is_completed, due_date);

-- Auto update timestamp trigger
drop trigger if exists on_tasks_updated on public.tasks;
create trigger on_tasks_updated
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.tasks enable row level security;

-- Least-privilege RLS Policies
drop policy if exists "Users can view own tasks" on public.tasks;
create policy "Users can view own tasks"
  on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
  on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
  on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
  on public.tasks for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ===================================================================
-- 4. TABLE: public.classes
-- Recurring weekly timetable slots
-- ===================================================================

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

  constraint check_classes_subject_name_valid
    check (char_length(trim(subject_name)) >= 1 and char_length(subject_name) <= 100),
  constraint check_classes_title_valid
    check (char_length(trim(title)) >= 1 and char_length(title) <= 120),
  constraint check_classes_weekday_valid
    check (weekday >= 0 and weekday <= 6),
  constraint check_classes_start_time_valid
    check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint check_classes_end_time_valid
    check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint check_classes_time_range_valid
    check (end_time > start_time),
  constraint check_classes_room_valid
    check (room is null or (char_length(trim(room)) >= 1 and char_length(room) <= 100))
);

comment on table public.classes is 'Recurring weekly college class slots for the Mova timetable.';
comment on column public.classes.weekday is 'Day of week: 0 = Sunday, 6 = Saturday.';
comment on column public.classes.start_time is 'Local class start time in 24-hour HH:MM format.';
comment on column public.classes.end_time is 'Local class end time in 24-hour HH:MM format.';

-- Indexes
create index if not exists idx_classes_user_id
  on public.classes(user_id);

create index if not exists idx_classes_user_weekday_time
  on public.classes(user_id, weekday, start_time);

-- Auto update timestamp trigger
drop trigger if exists on_classes_updated on public.classes;
create trigger on_classes_updated
  before update on public.classes
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.classes enable row level security;

-- Least-privilege RLS Policies
drop policy if exists "Users can view own classes" on public.classes;
create policy "Users can view own classes"
  on public.classes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own classes" on public.classes;
create policy "Users can insert own classes"
  on public.classes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own classes" on public.classes;
create policy "Users can update own classes"
  on public.classes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own classes" on public.classes;
create policy "Users can delete own classes"
  on public.classes for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ===================================================================
-- ===================================================================
-- 5. TABLE: public.subjects
-- User-scoped subject list with individual attendance targets
-- and baseline attendance intelligence
-- ===================================================================

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_percentage integer not null default 75,
  baseline_attended integer not null default 0,
  baseline_total integer not null default 0,
  baseline_as_of_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint check_subjects_name_valid
    check (char_length(trim(name)) >= 1 and char_length(name) <= 100),
  constraint check_subjects_target_valid
    check (target_percentage >= 1 and target_percentage <= 100)
);

-- Ensure baseline columns exist even if table pre-existed
alter table public.subjects
  add column if not exists baseline_attended integer not null default 0,
  add column if not exists baseline_total integer not null default 0,
  add column if not exists baseline_as_of_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'check_subjects_baseline_attended_nonneg') then
    alter table public.subjects add constraint check_subjects_baseline_attended_nonneg check (baseline_attended >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_subjects_baseline_total_nonneg') then
    alter table public.subjects add constraint check_subjects_baseline_total_nonneg check (baseline_total >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_subjects_baseline_valid') then
    alter table public.subjects add constraint check_subjects_baseline_valid check (baseline_attended <= baseline_total);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_subjects_baseline_date_valid') then
    alter table public.subjects add constraint check_subjects_baseline_date_valid check (baseline_as_of_date is null or baseline_as_of_date <= current_date + interval '1 day');
  end if;
end $$;

comment on table public.subjects is 'User-scoped subjects with individual attendance targets for Mova Campus.';

-- Unique subject name per user (case-insensitive)
create unique index if not exists uq_subjects_user_name
  on public.subjects (user_id, lower(trim(name)));

create index if not exists idx_subjects_user_id
  on public.subjects(user_id);

-- Auto update timestamp trigger
drop trigger if exists on_subjects_updated on public.subjects;
create trigger on_subjects_updated
  before update on public.subjects
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.subjects enable row level security;

-- Least-privilege RLS Policies
drop policy if exists "Users can view own subjects" on public.subjects;
create policy "Users can view own subjects"
  on public.subjects for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own subjects" on public.subjects;
create policy "Users can insert own subjects"
  on public.subjects for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own subjects" on public.subjects;
create policy "Users can update own subjects"
  on public.subjects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own subjects" on public.subjects;
create policy "Users can delete own subjects"
  on public.subjects for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ===================================================================
-- 6. TABLE: public.attendance_records
-- Individual dated attendance entries (present / absent)
-- ===================================================================

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  date date not null,
  status text not null default 'present',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint check_attendance_status_valid
    check (status in ('present', 'absent')),
  constraint check_attendance_date_not_future
    check (date <= current_date + interval '1 day')
);

comment on table public.attendance_records is 'Individual dated attendance records for Mova Campus attendance tracking.';

-- Indexes
create index if not exists idx_attendance_user_id
  on public.attendance_records(user_id);

create index if not exists idx_attendance_subject_id
  on public.attendance_records(subject_id);

create index if not exists idx_attendance_user_subject_date
  on public.attendance_records(user_id, subject_id, date);

create index if not exists idx_attendance_user_date
  on public.attendance_records(user_id, date);

-- Auto update timestamp trigger
drop trigger if exists on_attendance_records_updated on public.attendance_records;
create trigger on_attendance_records_updated
  before update on public.attendance_records
  for each row
  execute function public.handle_updated_at();

-- Enable RLS
alter table public.attendance_records enable row level security;

-- Least-privilege RLS Policies
drop policy if exists "Users can view own attendance" on public.attendance_records;
create policy "Users can view own attendance"
  on public.attendance_records for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own attendance" on public.attendance_records;
create policy "Users can insert own attendance"
  on public.attendance_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own attendance" on public.attendance_records;
create policy "Users can update own attendance"
  on public.attendance_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own attendance" on public.attendance_records;
create policy "Users can delete own attendance"
  on public.attendance_records for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ===================================================================
-- 7. GRANT PERMISSIONS TO AUTHENTICATED AND ANON ROLES
-- ===================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, anon;
grant execute on all routines in schema public to authenticated, anon;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to authenticated, anon;
alter default privileges in schema public grant execute on routines to authenticated, anon;


-- ===================================================================
-- 8. REFRESH POSTGREST SCHEMA CACHE
-- ===================================================================

notify pgrst, 'reload schema';

-- ===================================================================
-- END OF COMPLETE DATABASE SETUP
-- ===================================================================
