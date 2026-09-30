alter table public.students
  add column if not exists phone text,
  add column if not exists parent_guardian_name text,
  add column if not exists parent_guardian_phone text;
