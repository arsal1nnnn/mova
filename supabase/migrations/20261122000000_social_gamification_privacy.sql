-- ===================================================================
-- Migration: 20261122000000_social_gamification_privacy.sql
-- Mova Campus — Friends, Social Privacy, Gamification & Data Controls
-- ===================================================================

-- 1. Extend profiles with social, gamification, and privacy columns
alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists friend_code text,
  add column if not exists is_discoverable boolean not null default true,
  add column if not exists is_streak_public boolean not null default true,
  add column if not exists is_points_public boolean not null default true,
  add column if not exists total_points integer not null default 0,
  add column if not exists current_level integer not null default 1;

-- Add constraints safely
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'check_profiles_username_format') then
    alter table public.profiles add constraint check_profiles_username_format
      check (username is null or (char_length(username) >= 3 and char_length(username) <= 30 and username ~ '^[a-zA-Z0-9_]+$'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_profiles_bio_length') then
    alter table public.profiles add constraint check_profiles_bio_length
      check (bio is null or char_length(bio) <= 300);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_profiles_total_points_nonneg') then
    alter table public.profiles add constraint check_profiles_total_points_nonneg
      check (total_points >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'check_profiles_current_level_positive') then
    alter table public.profiles add constraint check_profiles_current_level_positive
      check (current_level >= 1);
  end if;
end $$;

-- Unique indexes on username and friend_code
create unique index if not exists uq_profiles_username on public.profiles (lower(trim(username))) where username is not null;
create unique index if not exists uq_profiles_friend_code on public.profiles (friend_code) where friend_code is not null;

-- Auto-generate friend code for profiles without one
update public.profiles
set friend_code = 'MOVA-' || upper(substr(md5(id::text || clock_timestamp()::text), 1, 6))
where friend_code is null;

-- 2. Friend Requests Table
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint check_friend_requests_status
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  constraint check_friend_requests_not_self
    check (sender_id != receiver_id)
);

create unique index if not exists uq_friend_requests_sender_receiver
  on public.friend_requests (sender_id, receiver_id);
create index if not exists idx_friend_requests_receiver_status
  on public.friend_requests (receiver_id, status);
create index if not exists idx_friend_requests_sender_status
  on public.friend_requests (sender_id, status);

-- 3. Friendships Table (Two-way friendship mapping)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,

  constraint check_friendships_not_self
    check (user_id != friend_id)
);

create unique index if not exists uq_friendships_user_friend
  on public.friendships (user_id, friend_id);
create index if not exists idx_friendships_user_id
  on public.friendships (user_id);
create index if not exists idx_friendships_friend_id
  on public.friendships (friend_id);

-- 4. User Blocks Table
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,

  constraint check_user_blocks_not_self
    check (blocker_id != blocked_id)
);

create unique index if not exists uq_user_blocks_pair
  on public.user_blocks (blocker_id, blocked_id);

-- 5. User Reports Table
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz default now() not null
);

create index if not exists idx_user_reports_reporter
  on public.user_reports (reporter_id);

-- 6. Reward Ledger Table (Immutable point/XP audit trail & duplicate prevention)
create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null default 0,
  xp integer not null default 0,
  reason text not null,
  reference_type text,
  reference_id text,
  created_at timestamptz default now() not null
);

create index if not exists idx_reward_ledger_user_id on public.reward_ledger (user_id);
create unique index if not exists uq_reward_ledger_reference
  on public.reward_ledger (user_id, reference_type, reference_id)
  where reference_type is not null and reference_id is not null;

-- 7. User Achievements Table
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  title text not null,
  description text not null,
  unlocked_at timestamptz default now() not null
);

create unique index if not exists uq_user_achievements_key
  on public.user_achievements (user_id, achievement_key);

-- 8. User Settings Table
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  task_reminders boolean not null default true,
  class_reminders boolean not null default true,
  attendance_reminders boolean not null default true,
  friend_requests_notify boolean not null default true,
  theme_preference text not null default 'light',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Triggers for updated_at
drop trigger if exists on_friend_requests_updated on public.friend_requests;
create trigger on_friend_requests_updated
  before update on public.friend_requests
  for each row execute function public.handle_updated_at();

drop trigger if exists on_user_settings_updated on public.user_settings;
create trigger on_user_settings_updated
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

-- 9. Row Level Security (RLS) Policies

-- Profiles: Users can see own profile in full, or public discovery info of discoverable users
alter table public.profiles enable row level security;

-- Add a policy allowing authenticated users to see discoverable profiles for friend search
drop policy if exists "Authenticated users can search discoverable profiles" on public.profiles;
create policy "Authenticated users can search discoverable profiles"
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (
      is_discoverable = true
      and not exists (
        select 1 from public.user_blocks
        where (blocker_id = (select auth.uid()) and blocked_id = public.profiles.id)
           or (blocker_id = public.profiles.id and blocked_id = (select auth.uid()))
      )
    )
  );

-- Friend Requests RLS
alter table public.friend_requests enable row level security;

drop policy if exists "Users can view relevant friend requests" on public.friend_requests;
create policy "Users can view relevant friend requests"
  on public.friend_requests
  for select
  to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests"
  on public.friend_requests
  for insert
  to authenticated
  with check ((select auth.uid()) = sender_id);

drop policy if exists "Users can update relevant friend requests" on public.friend_requests;
create policy "Users can update relevant friend requests"
  on public.friend_requests
  for update
  to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id)
  with check ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

drop policy if exists "Users can delete own friend requests" on public.friend_requests;
create policy "Users can delete own friend requests"
  on public.friend_requests
  for delete
  to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

-- Friendships RLS
alter table public.friendships enable row level security;

drop policy if exists "Users can view own friendships" on public.friendships;
create policy "Users can view own friendships"
  on public.friendships
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own friendships" on public.friendships;
create policy "Users can insert own friendships"
  on public.friendships
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own friendships" on public.friendships;
create policy "Users can delete own friendships"
  on public.friendships
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- User Blocks RLS
alter table public.user_blocks enable row level security;

drop policy if exists "Users can view own blocks" on public.user_blocks;
create policy "Users can view own blocks"
  on public.user_blocks
  for select
  to authenticated
  using ((select auth.uid()) = blocker_id);

drop policy if exists "Users can create blocks" on public.user_blocks;
create policy "Users can create blocks"
  on public.user_blocks
  for insert
  to authenticated
  with check ((select auth.uid()) = blocker_id);

drop policy if exists "Users can remove own blocks" on public.user_blocks;
create policy "Users can remove own blocks"
  on public.user_blocks
  for delete
  to authenticated
  using ((select auth.uid()) = blocker_id);

-- User Reports RLS
alter table public.user_reports enable row level security;

drop policy if exists "Users can create reports" on public.user_reports;
create policy "Users can create reports"
  on public.user_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

-- Reward Ledger RLS
alter table public.reward_ledger enable row level security;

drop policy if exists "Users can view own reward ledger" on public.reward_ledger;
create policy "Users can view own reward ledger"
  on public.reward_ledger
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own rewards" on public.reward_ledger;
create policy "Users can insert own rewards"
  on public.reward_ledger
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- User Achievements RLS
alter table public.user_achievements enable row level security;

drop policy if exists "Users can view achievements" on public.user_achievements;
create policy "Users can view achievements"
  on public.user_achievements
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.friendships
      where user_id = (select auth.uid()) and friend_id = public.user_achievements.user_id
    )
  );

drop policy if exists "Users can unlock own achievements" on public.user_achievements;
create policy "Users can unlock own achievements"
  on public.user_achievements
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- User Settings RLS
alter table public.user_settings enable row level security;

drop policy if exists "Users can view own settings" on public.user_settings;
create policy "Users can view own settings"
  on public.user_settings
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 10. Account Deletion RPC (Security Definer)
create or replace function public.delete_user_account()
returns boolean as $$
declare
  caller_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Delete all user data safely in cascade order
  delete from public.tasks where user_id = caller_id;
  delete from public.attendance_records where user_id = caller_id;
  delete from public.subjects where user_id = caller_id;
  delete from public.classes where user_id = caller_id;
  delete from public.friend_requests where sender_id = caller_id or receiver_id = caller_id;
  delete from public.friendships where user_id = caller_id or friend_id = caller_id;
  delete from public.user_blocks where blocker_id = caller_id or blocked_id = caller_id;
  delete from public.user_reports where reporter_id = caller_id;
  delete from public.reward_ledger where user_id = caller_id;
  delete from public.user_achievements where user_id = caller_id;
  delete from public.user_settings where user_id = caller_id;
  delete from public.profiles where id = caller_id;

  return true;
end;
$$ language plpgsql security definer set search_path = '';

revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;

-- 11. Grant permissions
grant select, insert, update, delete on public.friend_requests to authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant insert on public.user_reports to authenticated;
grant select, insert on public.reward_ledger to authenticated;
grant select, insert on public.user_achievements to authenticated;
grant select, insert, update on public.user_settings to authenticated;

-- 12. Reload PostgREST schema cache
notify pgrst, 'reload schema';
