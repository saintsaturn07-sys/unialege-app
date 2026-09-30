-- Add explicit publication and assessment classification to the existing
-- academic result flow. Existing results remain intact and start unpublished
-- so an administrator can review them before they affect student reports.

alter table public.results
  add column if not exists is_published boolean not null default false,
  add column if not exists ca_recorded boolean not null default false,
  add column if not exists assessment_type text not null default 'unclassified';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'results_assessment_type_check'
      and conrelid = 'public.results'::regclass
  ) then
    alter table public.results
      add constraint results_assessment_type_check
      check (assessment_type in ('formal', 'mock', 'unclassified'));
  end if;
end $$;

alter table public.exams
  add column if not exists assessment_type text not null default 'unclassified';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exams_assessment_type_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_assessment_type_check
      check (assessment_type in ('formal', 'mock', 'unclassified'));
  end if;
end $$;

create index if not exists results_published_session_term_idx
  on public.results (session, term, student_id)
  where is_published = true;

create or replace function public.submit_cbt_attempt(p_attempt_id uuid, p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.exam_attempts%rowtype;
  v_exam public.exams%rowtype;
  v_total integer;
  v_correct integer;
  v_score numeric(5,2);
  v_result_count integer := 0;
  v_result_id uuid;
begin
  select * into v_attempt
  from public.exam_attempts
  where id = p_attempt_id and student_id = p_student_id
  for update;

  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.status <> 'in_progress' then raise exception 'Attempt already submitted'; end if;

  select * into v_exam from public.exams where id = v_attempt.exam_id;
  if not found then raise exception 'Exam not found'; end if;

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

  update public.exam_attempts
  set status = 'submitted', submitted_at = now(), correct_count = v_correct, score_out_of_70 = v_score
  where id = v_attempt.id;

  -- CBT attempts are always scored and retained above. Only completed attempts
  -- for exams still published as formal assessments feed academic results.
  if v_exam.status = 'published' and v_exam.assessment_type = 'formal' then
    perform pg_advisory_xact_lock(hashtextextended(
      p_student_id::text || ':' || v_attempt.subject || ':' || v_attempt.session || ':' || v_attempt.term, 0
    ));
    select count(*) into v_result_count
    from public.results
    where student_id = p_student_id and subject = v_attempt.subject
      and session = v_attempt.session and term = v_attempt.term
      and assessment_type = 'formal';
    if v_result_count > 1 then raise exception 'Multiple matching results require administrator review'; end if;
    if v_result_count = 1 then
      select id into v_result_id from public.results
      where student_id = p_student_id and subject = v_attempt.subject
        and session = v_attempt.session and term = v_attempt.term
        and assessment_type = 'formal'
      limit 1;
      update public.results set exam_score = v_score where id = v_result_id;
    else
      insert into public.results (student_id, subject, ca_score, exam_score, session, term, ca_recorded, assessment_type)
      values (p_student_id, v_attempt.subject, 0, v_score, v_attempt.session, v_attempt.term, false, 'formal')
      returning id into v_result_id;
    end if;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'total', v_total,
    'score_out_of_70', v_score,
    'result_id', v_result_id
  );
end;
$$;

revoke all on function public.submit_cbt_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.submit_cbt_attempt(uuid, uuid) to service_role;
