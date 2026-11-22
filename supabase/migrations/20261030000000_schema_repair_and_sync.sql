-- ===================================================================
-- Migration: 20261030000000_schema_repair_and_sync.sql
-- Mova Campus — Database Schema Synchronization and Cache Repair
-- ===================================================================

-- Ensure required PostgreSQL extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 1. Functions
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security invoker set search_path = '';

revoke all on function public.handle_updated_at() from public;
grant execute on function public.handle_updated_at() to authenticated, anon;

create or replace function public.calculate_age(dob date)
returns integer as $$
begin
  if dob is null then
    return null;
  end if;
  return date_part('year', age(current_date, dob))::integer;
end;
$$ language plpgsql stable security invoker set search_path = '';

revoke all on function public.calculate_age(date) from public;
grant execute on function public.calculate_age(date) to authenticated, anon;

-- 2. Profiles Table & Repair
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  date_of_birth date default '2002-01-01'::date,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles
  add column if not exists name text,
  add column if not exists date_of_birth date default '2002-01-01'::date,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name'
  ) then
    execute 'update public.profiles set name = full_name where name is null and full_name is not null';
  end if;
end $$;

update public.profiles set name = 'Student' where name is null or trim(name) = '';
update public.profiles set date_of_birth = '2002-01-01'::date where date_of_birth is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'check_profiles_name_valid') then
    alter table public.profiles add constraint check_profiles_name_valid
      check (char_length(trim(name)) >= 1 and char_length(name) <= 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_profiles_date_of_birth_valid') then
    alter table public.profiles add constraint check_profiles_date_of_birth_valid
      check (date_of_birth <= current_date and date_of_birth >= '1900-01-01');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_profiles_avatar_url_valid') then
    alter table public.profiles add constraint check_profiles_avatar_url_valid
      check (avatar_url is null or char_length(avatar_url) <= 2048);
  end if;
end $$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;

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
    '2002-01-01'::date,
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

-- 3. Tasks Table & Repair
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Task',
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
  updated_at timestamptz default now() not null
);

alter table public.tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text default 'Untitled Task',
  add column if not exists description text,
  add column if not exists due_date date,
  add column if not exists due_time text,
  add column if not exists priority text default 'medium',
  add column if not exists category text default 'academic',
  add column if not exists estimated_duration integer,
  add column if not exists is_completed boolean default false,
  add column if not exists completed_at timestamptz,
  add column if not exists recurrence text default 'none',
  add column if not exists recurrence_interval integer default 1,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.tasks set priority = 'medium' where priority is null;
update public.tasks set category = 'academic' where category is null;
update public.tasks set recurrence = 'none' where recurrence is null;
update public.tasks set recurrence_interval = 1 where recurrence_interval is null;
update public.tasks set is_completed = false where is_completed is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'check_tasks_title_valid') then
    alter table public.tasks add constraint check_tasks_title_valid
      check (char_length(trim(title)) >= 1 and char_length(title) <= 200);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_tasks_description_valid') then
    alter table public.tasks add constraint check_tasks_description_valid
      check (description is null or char_length(description) <= 2000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_tasks_due_time_valid') then
    alter table public.tasks add constraint check_tasks_due_time_valid
      check (due_time is null or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_tasks_priority_valid') then
    alter table public.tasks add constraint check_tasks_priority_valid
      check (priority in ('low', 'medium', 'high', 'urgent'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_tasks_category_valid') then
    alter table public.tasks add constraint check_tasks_category_valid
      check (category in ('academic', 'personal', 'work', 'health', 'other'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_tasks_estimated_duration_valid') then
    alter table public.tasks add constraint check_tasks_estimated_duration_valid
      check (estimated_duration is null or (estimated_duration >= 1 and estimated_duration <= 1440));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_tasks_recurrence_valid') then
    alter table public.tasks add constraint check_tasks_recurrence_valid
      check (recurrence in ('none', 'daily', 'weekdays', 'weekly', 'monthly'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_tasks_recurrence_interval_valid') then
    alter table public.tasks add constraint check_tasks_recurrence_interval_valid
      check (recurrence_interval >= 1 and recurrence_interval <= 365);
  end if;
end $$;

create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_user_status_due on public.tasks(user_id, is_completed, due_date);

drop trigger if exists on_tasks_updated on public.tasks;
create trigger on_tasks_updated
  before update on public.tasks
  for each row execute function public.handle_updated_at();

alter table public.tasks enable row level security;

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

-- 4. Classes Table & Repair
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null default 'General',
  title text not null default 'Lecture',
  weekday smallint not null default 1,
  start_time text not null default '09:00',
  end_time text not null default '10:00',
  room text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.classes
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists subject_name text default 'General',
  add column if not exists title text default 'Lecture',
  add column if not exists weekday smallint default 1,
  add column if not exists start_time text default '09:00',
  add column if not exists end_time text default '10:00',
  add column if not exists room text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'check_classes_subject_name_valid') then
    alter table public.classes add constraint check_classes_subject_name_valid
      check (char_length(trim(subject_name)) >= 1 and char_length(subject_name) <= 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_classes_title_valid') then
    alter table public.classes add constraint check_classes_title_valid
      check (char_length(trim(title)) >= 1 and char_length(title) <= 120);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_classes_weekday_valid') then
    alter table public.classes add constraint check_classes_weekday_valid
      check (weekday >= 0 and weekday <= 6);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_classes_start_time_valid') then
    alter table public.classes add constraint check_classes_start_time_valid
      check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_classes_end_time_valid') then
    alter table public.classes add constraint check_classes_end_time_valid
      check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_classes_time_range_valid') then
    alter table public.classes add constraint check_classes_time_range_valid
      check (end_time > start_time);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_classes_room_valid') then
    alter table public.classes add constraint check_classes_room_valid
      check (room is null or (char_length(trim(room)) >= 1 and char_length(room) <= 100));
  end if;
end $$;

create index if not exists idx_classes_user_id on public.classes(user_id);
create index if not exists idx_classes_user_weekday_time on public.classes(user_id, weekday, start_time);

drop trigger if exists on_classes_updated on public.classes;
create trigger on_classes_updated
  before update on public.classes
  for each row execute function public.handle_updated_at();

alter table public.classes enable row level security;

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

-- 5. Subjects Table & Repair (including Baseline Attendance)
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_percentage integer not null default 75,
  baseline_attended integer not null default 0,
  baseline_total integer not null default 0,
  baseline_as_of_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.subjects
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists target_percentage integer default 75,
  add column if not exists baseline_attended integer default 0,
  add column if not exists baseline_total integer default 0,
  add column if not exists baseline_as_of_date date,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.subjects set target_percentage = 75 where target_percentage is null;
update public.subjects set baseline_attended = 0 where baseline_attended is null;
update public.subjects set baseline_total = 0 where baseline_total is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'check_subjects_name_valid') then
    alter table public.subjects add constraint check_subjects_name_valid
      check (char_length(trim(name)) >= 1 and char_length(name) <= 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_subjects_target_valid') then
    alter table public.subjects add constraint check_subjects_target_valid
      check (target_percentage >= 1 and target_percentage <= 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_subjects_baseline_attended_nonneg') then
    alter table public.subjects add constraint check_subjects_baseline_attended_nonneg
      check (baseline_attended >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_subjects_baseline_total_nonneg') then
    alter table public.subjects add constraint check_subjects_baseline_total_nonneg
      check (baseline_total >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_subjects_baseline_valid') then
    alter table public.subjects add constraint check_subjects_baseline_valid
      check (baseline_attended <= baseline_total);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_subjects_baseline_date_valid') then
    alter table public.subjects add constraint check_subjects_baseline_date_valid
      check (baseline_as_of_date is null or baseline_as_of_date <= current_date + interval '1 day');
  end if;
end $$;

create unique index if not exists uq_subjects_user_name
  on public.subjects (user_id, lower(trim(name)));

create index if not exists idx_subjects_user_id
  on public.subjects(user_id);

drop trigger if exists on_subjects_updated on public.subjects;
create trigger on_subjects_updated
  before update on public.subjects
  for each row execute function public.handle_updated_at();

alter table public.subjects enable row level security;

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

-- 6. Attendance Records Table & Repair
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  date date not null,
  status text not null default 'present',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.attendance_records
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists subject_id uuid references public.subjects(id) on delete cascade,
  add column if not exists date date,
  add column if not exists status text default 'present',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.attendance_records set status = 'present' where status is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'check_attendance_status_valid') then
    alter table public.attendance_records add constraint check_attendance_status_valid
      check (status in ('present', 'absent'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_attendance_date_not_future') then
    alter table public.attendance_records add constraint check_attendance_date_not_future
      check (date <= current_date + interval '1 day');
  end if;
end $$;

create index if not exists idx_attendance_user_id on public.attendance_records(user_id);
create index if not exists idx_attendance_subject_id on public.attendance_records(subject_id);
create index if not exists idx_attendance_user_subject_date on public.attendance_records(user_id, subject_id, date);
create index if not exists idx_attendance_user_date on public.attendance_records(user_id, date);

drop trigger if exists on_attendance_records_updated on public.attendance_records;
create trigger on_attendance_records_updated
  before update on public.attendance_records
  for each row execute function public.handle_updated_at();

alter table public.attendance_records enable row level security;

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

-- 7. Grant Permissions
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, anon;
grant execute on all routines in schema public to authenticated, anon;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to authenticated, anon;
alter default privileges in schema public grant execute on routines to authenticated, anon;

-- 8. Refresh PostgREST Schema Cache
notify pgrst, 'reload schema';
