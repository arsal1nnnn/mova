-- ===================================================================
-- Migration: 20261031000000_add_baseline_attendance.sql
-- Mova Campus — Add Baseline Attendance Columns to public.subjects
-- ===================================================================

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

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select on public.subjects to anon;

notify pgrst, 'reload schema';
