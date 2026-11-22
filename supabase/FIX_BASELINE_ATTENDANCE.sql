-- ===================================================================
-- MOVA CAMPUS — FIX BASELINE ATTENDANCE COLUMNS
-- Target Database: Supabase PostgreSQL
-- File: supabase/FIX_BASELINE_ATTENDANCE.sql
--
-- FIXES:
-- column subjects.baseline_attended does not exist
--
-- SAFE & NON-DESTRUCTIVE:
-- - Preserves all existing subjects and attendance records.
-- - Never drops tables or columns.
-- - Reloads PostgREST schema cache immediately via NOTIFY pgrst.
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/bwoczemdwolwmxbnkxfl
-- 2. Go to "SQL Editor" on the left menu.
-- 3. Click "New query", paste this file, and click "Run".
-- ===================================================================

-- 1. Safely add baseline attendance columns to public.subjects
alter table public.subjects
  add column if not exists baseline_attended integer not null default 0,
  add column if not exists baseline_total integer not null default 0,
  add column if not exists baseline_as_of_date date;

-- 2. Ensure constraints exist safely
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

-- 3. Ensure permissions
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select on public.subjects to anon;

-- 4. Reload PostgREST schema cache immediately
notify pgrst, 'reload schema';

-- 5. Verification query
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'subjects'
order by ordinal_position;
