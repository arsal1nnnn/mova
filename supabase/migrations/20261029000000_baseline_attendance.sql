-- ===================================================================
-- Mova Campus — Baseline Attendance Intelligence Migration
-- Migration: 20261029000000_baseline_attendance.sql
--
-- Non-destructive addition of baseline attendance columns to public.subjects.
-- Supports aggregate historical attendance imported from college reports
-- or manually entered, without fabricating fake individual records.
-- ===================================================================

-- 1. Add baseline attendance columns
alter table public.subjects
  add column if not exists baseline_attended integer not null default 0,
  add column if not exists baseline_total integer not null default 0,
  add column if not exists baseline_as_of_date date;

-- 2. Add validation constraints safely
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

-- 3. Comments
comment on column public.subjects.baseline_attended is 'Aggregated historical classes attended as of baseline_as_of_date.';
comment on column public.subjects.baseline_total is 'Aggregated historical classes conducted as of baseline_as_of_date.';
comment on column public.subjects.baseline_as_of_date is 'Date when baseline attendance was recorded or imported from report.';
