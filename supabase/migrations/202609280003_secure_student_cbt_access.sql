-- Additive schema step. Apply before deploying the server-mediated routes.

alter table public.students
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists students_auth_user_id_uidx
  on public.students (auth_user_id)
  where auth_user_id is not null;

alter table public.exams
  add column if not exists question_count integer not null default 40;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exams_question_count_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams add constraint exams_question_count_check
      check (question_count between 1 and 500);
  end if;
end $$;

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  exam_id uuid not null references public.exams(id) on delete restrict,
  subject text not null,
  session text not null,
  term text not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  question_snapshot jsonb not null check (jsonb_typeof(question_snapshot) = 'array' and jsonb_array_length(question_snapshot) > 0),
  correct_count integer,
  score_out_of_70 numeric(5,2),
  created_at timestamptz not null default now(),
  check (ends_at > started_at),
  check (correct_count is null or correct_count >= 0),
  check (score_out_of_70 is null or score_out_of_70 between 0 and 70),
  check ((status = 'in_progress' and submitted_at is null) or (status = 'submitted' and submitted_at is not null))
);

create unique index if not exists exam_attempts_one_active_per_student_exam_uidx
  on public.exam_attempts (student_id, exam_id)
  where status = 'in_progress';
create index if not exists exam_attempts_student_created_idx
  on public.exam_attempts (student_id, created_at desc);
create index if not exists exam_attempts_exam_idx
  on public.exam_attempts (exam_id, created_at desc);

create table if not exists public.exam_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid not null,
  selected_option text not null check (selected_option in ('A', 'B', 'C', 'D')),
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists exam_attempt_answers_attempt_idx
  on public.exam_attempt_answers (attempt_id);

alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_answers enable row level security;
revoke all privileges on table public.exam_attempts, public.exam_attempt_answers from anon, authenticated;
grant select, insert, update, delete on table public.exam_attempts, public.exam_attempt_answers to service_role;

create or replace function public.submit_cbt_attempt(p_attempt_id uuid, p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.exam_attempts%rowtype;
  v_total integer;
  v_correct integer;
  v_score numeric(5,2);
  v_result_count integer;
  v_result_id uuid;
begin
  select * into v_attempt
  from public.exam_attempts
  where id = p_attempt_id and student_id = p_student_id
  for update;

  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.status <> 'in_progress' then raise exception 'Attempt already submitted'; end if;

  select count(*) into v_total
  from jsonb_array_elements(v_attempt.question_snapshot);
  if v_total < 1 then raise exception 'Attempt has no questions'; end if;

  select count(*) into v_correct
  from jsonb_array_elements(v_attempt.question_snapshot) q
  join public.exam_attempt_answers a
    on a.attempt_id = v_attempt.id
   and a.question_id::text = q.value ->> 'id'
   and a.selected_option = q.value ->> 'correct_option';

  v_score := round((v_correct::numeric * 70) / v_total, 2);

  -- Serialize result updates for this student's subject/session/term.
  perform pg_advisory_xact_lock(hashtextextended(
    p_student_id::text || ':' || v_attempt.subject || ':' || v_attempt.session || ':' || v_attempt.term, 0
  ));
  select count(*) into v_result_count
  from public.results
  where student_id = p_student_id and subject = v_attempt.subject
    and session = v_attempt.session and term = v_attempt.term;
  if v_result_count > 1 then raise exception 'Multiple matching results require administrator review'; end if;
  if v_result_count = 1 then
    select id into v_result_id from public.results
    where student_id = p_student_id and subject = v_attempt.subject
      and session = v_attempt.session and term = v_attempt.term
    limit 1;
  end if;

  update public.exam_attempts
  set status = 'submitted', submitted_at = now(), correct_count = v_correct, score_out_of_70 = v_score
  where id = v_attempt.id;

  if v_result_count = 1 then
    update public.results set exam_score = v_score where id = v_result_id;
  else
    insert into public.results (student_id, subject, ca_score, exam_score, session, term)
    values (p_student_id, v_attempt.subject, 0, v_score, v_attempt.session, v_attempt.term)
    returning id into v_result_id;
  end if;

  return jsonb_build_object('correct', v_correct, 'total', v_total, 'score_out_of_70', v_score, 'result_id', v_result_id);
end;
$$;

create or replace function public.save_cbt_attempt_answer(
  p_attempt_id uuid, p_student_id uuid, p_question_id uuid, p_selected_option text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.exam_attempts%rowtype;
begin
  if p_selected_option not in ('A', 'B', 'C', 'D') then raise exception 'Invalid answer option'; end if;
  select * into v_attempt
  from public.exam_attempts
  where id = p_attempt_id and student_id = p_student_id
  for update;
  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.status <> 'in_progress' or v_attempt.ends_at < now() then
    raise exception 'Attempt cannot accept answers';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_attempt.question_snapshot) q
    where q.value ->> 'id' = p_question_id::text
  ) then raise exception 'Question is not part of attempt'; end if;
  insert into public.exam_attempt_answers (attempt_id, question_id, selected_option, updated_at)
  values (p_attempt_id, p_question_id, p_selected_option, now())
  on conflict (attempt_id, question_id)
  do update set selected_option = excluded.selected_option, updated_at = excluded.updated_at;
  return true;
end;
$$;

revoke all on function public.submit_cbt_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.submit_cbt_attempt(uuid, uuid) to service_role;
revoke all on function public.save_cbt_attempt_answer(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.save_cbt_attempt_answer(uuid, uuid, uuid, text) to service_role;
