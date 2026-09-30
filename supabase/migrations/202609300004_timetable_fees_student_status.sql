-- Additive tables for administrator-managed timetables and fee records.
-- Existing student accounts remain active by default.

alter table public.students
  add column if not exists is_active boolean not null default true;

create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  day_of_week text not null check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  period integer not null check (period between 1 and 16),
  start_time time not null,
  end_time time not null,
  subject text not null check (length(btrim(subject)) between 1 and 100),
  teacher text check (teacher is null or length(btrim(teacher)) <= 100),
  class_name text not null check (class_name in ('JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3')),
  target_stream text check (target_stream is null or target_stream in ('science', 'commercial', 'art')),
  session text not null check (length(btrim(session)) between 4 and 20),
  term text not null check (term in ('First Term', 'Second Term', 'Third Term')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (target_stream is null or class_name in ('SS 1', 'SS 2', 'SS 3'))
);

create unique index if not exists timetable_entries_slot_uidx
  on public.timetable_entries (class_name, coalesce(target_stream, ''), session, term, day_of_week, period);
create index if not exists timetable_entries_student_lookup_idx
  on public.timetable_entries (class_name, session, term, day_of_week, period);

create table if not exists public.fee_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  amount_due numeric(12,2) not null check (amount_due >= 0),
  target_class text check (target_class is null or target_class in ('JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3')),
  target_stream text check (target_stream is null or target_stream in ('science', 'commercial', 'art')),
  session text not null check (length(btrim(session)) between 4 and 20),
  term text not null check (term in ('First Term', 'Second Term', 'Third Term')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (target_stream is null or coalesce(target_class in ('SS 1', 'SS 2', 'SS 3'), false))
);

create index if not exists fee_items_scope_idx
  on public.fee_items (session, term, target_class, target_stream)
  where is_active = true;

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  fee_item_id uuid not null references public.fee_items(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  reference text not null unique check (length(btrim(reference)) between 1 and 120),
  status text not null check (status in ('completed', 'pending', 'failed')),
  paid_at timestamptz,
  recorded_by text not null,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  check ((status = 'completed' and paid_at is not null) or status <> 'completed')
);

create index if not exists fee_payments_student_created_idx
  on public.fee_payments (student_id, created_at desc);
create index if not exists fee_payments_item_status_idx
  on public.fee_payments (fee_item_id, status);

alter table public.timetable_entries enable row level security;
alter table public.fee_items enable row level security;
alter table public.fee_payments enable row level security;
revoke all privileges on table public.timetable_entries, public.fee_items, public.fee_payments from anon, authenticated;
grant select, insert, update, delete on table public.timetable_entries, public.fee_items, public.fee_payments to service_role;
