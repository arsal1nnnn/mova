-- ===================================================================
-- MOVA CAMPUS — BASELINE ATTENDANCE SETUP SCRIPT
-- Run this script in the Supabase SQL Editor to enable baseline
-- attendance intelligence for Mova Campus.
--
-- Safe and non-destructive: Preserves all existing subjects and records.
-- ===================================================================

-- 1. Add baseline attendance columns to public.subjects
alter table public.subjects
  add column if not exists baseline_attended integer not null default 0,
  add column if not exists baseline_total integer not null default 0,
  add column if not exists baseline_as_of_date date;

-- 2. Add constraints safely
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

-- 3. Verify columns exist
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'subjects'
order by ordinal_position;
