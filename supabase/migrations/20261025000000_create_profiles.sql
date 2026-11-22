-- ===================================================================
-- Mova — Phase 1, Task 4: User/Profile Data Model Migration
-- Migration: 20261025000000_create_profiles.sql
-- ===================================================================

-- 1. Create the public.profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  date_of_birth date not null,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Sensible input constraints
  constraint check_name_valid
    check (char_length(trim(name)) >= 1 and char_length(name) <= 100),
  constraint check_date_of_birth_valid
    check (date_of_birth <= current_date and date_of_birth >= '1900-01-01'),
  constraint check_avatar_url_valid
    check (avatar_url is null or char_length(avatar_url) <= 2048)
);

-- Comments describing columns
comment on table public.profiles is 'User profiles for Mova campus life RPG.';
comment on column public.profiles.id is 'Primary key linked 1-to-1 with auth.users(id).';
comment on column public.profiles.name is 'User chosen display name.';
comment on column public.profiles.date_of_birth is 'User date of birth in YYYY-MM-DD format. Age is derived dynamically.';
comment on column public.profiles.avatar_url is 'Reference path or URL to the user uploaded avatar image.';
comment on column public.profiles.created_at is 'Timestamp when the profile record was created.';
comment on column public.profiles.updated_at is 'Timestamp when the profile record was last modified.';

-- 2. Automatically update updated_at timestamp on record modification
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security invoker set search_path = '';

revoke all on function public.handle_updated_at() from public;
grant execute on function public.handle_updated_at() to authenticated;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- 3. SQL helper function to calculate age dynamically from date_of_birth
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

-- Least-privilege permissions: restrict execution from public, grant only to authenticated users
revoke all on function public.calculate_age(date) from public;
grant execute on function public.calculate_age(date) to authenticated;

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 5. Least-privilege RLS Policies
-- SELECT: Authenticated user can view only their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- INSERT: Authenticated user can insert only their own profile (auth.uid() must match id)
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- UPDATE: Authenticated user can update only their own profile, and cannot reassign ownership
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- DELETE: Authenticated user can delete only their own profile
create policy "Users can delete own profile"
  on public.profiles
  for delete
  to authenticated
  using ((select auth.uid()) = id);
