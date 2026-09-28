-- CBT exam management tables for the existing browser Supabase client.
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  class_name text not null,
  session text not null,
  term text not null,
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  question_order integer not null default 0 check (question_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists exams_class_session_term_idx
  on public.exams (class_name, session, term);
create index if not exists exams_status_idx
  on public.exams (status);
create index if not exists exam_questions_exam_order_idx
  on public.exam_questions (exam_id, question_order, created_at);

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;

grant select, insert, update, delete on public.exams to anon;
grant select, insert, update, delete on public.exam_questions to anon;

drop policy if exists "Anon can manage exams" on public.exams;
create policy "Anon can manage exams" on public.exams
  for all to anon using (true) with check (true);

drop policy if exists "Anon can manage exam questions" on public.exam_questions;
create policy "Anon can manage exam questions" on public.exam_questions
  for all to anon using (true) with check (true);
