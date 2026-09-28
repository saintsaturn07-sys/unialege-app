-- Run once in the Supabase SQL Editor (or with the Supabase migrations CLI).
-- Existing student records remain valid: both new values are nullable.
alter table public.students
  add column if not exists field_of_study text,
  add column if not exists trade_subject text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_field_of_study_check'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_field_of_study_check
      check (field_of_study is null or field_of_study in ('science', 'commercial', 'art'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'students_trade_subject_check'
      and conrelid = 'public.students'::regclass
  ) then
    alter table public.students
      add constraint students_trade_subject_check
      check (trade_subject is null or trade_subject in (
        'Solar Photovoltaic Installation and Maintenance',
        'Fashion Design and Garment Making',
        'Livestock Farming',
        'Beauty and Cosmetology',
        'Computer Hardware and GSM Repairs',
        'Horticulture and Crop Production'
      ));
  end if;
end $$;
