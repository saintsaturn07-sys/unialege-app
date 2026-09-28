-- Reusable questions live independently of a specific exam. Generated exam
-- questions are copied into exam_questions so the existing CBT stays intact.

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3')),
  category text check (category is null or category in ('science', 'commercial', 'arts')),
  subject text not null check (btrim(subject) <> ''),
  topic text not null check (btrim(topic) <> ''),
  question text not null check (btrim(question) <> ''),
  option_a text not null check (btrim(option_a) <> ''),
  option_b text not null check (btrim(option_b) <> ''),
  option_c text not null check (btrim(option_c) <> ''),
  option_d text not null check (btrim(option_d) <> ''),
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  explanation text,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  marks numeric(6,2) not null default 1 check (marks > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Prevent exact question text from being entered twice for the same level and subject.
create unique index if not exists question_bank_level_subject_question_uidx
  on public.question_bank (level, lower(btrim(subject)), lower(btrim(question)));
create index if not exists question_bank_active_filter_idx
  on public.question_bank (level, category, lower(btrim(subject)), lower(btrim(topic)))
  where is_active;

-- Existing class_name remains the exam level (for example, "JSS 1"). These
-- nullable filters preserve existing exams and allow stream/topic targeting.
alter table public.exams
  add column if not exists category text,
  add column if not exists topic text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exams_question_bank_category_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams add constraint exams_question_bank_category_check
      check (category is null or category in ('science', 'commercial', 'arts'));
  end if;
end $$;

-- Preserve which bank records were copied, without changing existing question rows.
alter table public.exam_questions
  add column if not exists bank_question_id uuid
  references public.question_bank(id) on delete set null;

create unique index if not exists exam_questions_bank_question_uidx
  on public.exam_questions (exam_id, bank_question_id)
  where bank_question_id is not null;

alter table public.question_bank enable row level security;
revoke all privileges on table public.question_bank from anon, authenticated;
grant select, insert, update, delete on table public.question_bank to service_role;

create or replace function public.generate_exam_questions_from_bank(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exam public.exams%rowtype;
  v_level text;
  v_existing integer;
  v_needed integer;
  v_selected_ids uuid[];
  v_inserted integer;
begin
  select * into v_exam
  from public.exams
  where id = p_exam_id
  for update;

  if not found then raise exception 'Exam not found'; end if;

  v_level := regexp_replace(upper(v_exam.class_name), '[^A-Z0-9]', '', 'g');
  if v_level not in ('JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3') then
    raise exception 'Exam class is not a supported school level';
  end if;

  select count(*) into v_existing
  from public.exam_questions
  where exam_id = p_exam_id;
  v_needed := greatest(coalesce(v_exam.question_count, 40) - v_existing, 0);
  if v_needed = 0 then
    return jsonb_build_object('inserted', 0, 'existing', v_existing, 'target', coalesce(v_exam.question_count, 40));
  end if;

  select coalesce(array_agg(candidate.id), array[]::uuid[])
    into v_selected_ids
  from (
    select bank.id
    from public.question_bank bank
    where bank.is_active
      and bank.level = v_level
      and lower(btrim(bank.subject)) = lower(btrim(v_exam.subject))
      and (
        (v_exam.category is null and bank.category is null)
        or (v_exam.category is not null and (bank.category is null or bank.category = v_exam.category))
      )
      and (nullif(btrim(v_exam.topic), '') is null or lower(btrim(bank.topic)) = lower(btrim(v_exam.topic)))
      and not exists (
        select 1
        from public.exam_questions existing_question
        where existing_question.exam_id = p_exam_id
          and (
            existing_question.bank_question_id = bank.id
            or lower(btrim(existing_question.question_text)) = lower(btrim(bank.question))
          )
      )
    order by random()
    limit v_needed
  ) candidate;

  if coalesce(cardinality(v_selected_ids), 0) < v_needed then
    raise exception 'Not enough matching active bank questions: requested %, available %',
      v_needed, coalesce(cardinality(v_selected_ids), 0);
  end if;

  with selected as (
    select bank.*,
      row_number() over (order by array_position(v_selected_ids, bank.id)) as ordinal
    from public.question_bank bank
    where bank.id = any(v_selected_ids)
  ), question_start as (
    select coalesce(max(question_order), -1) + 1 as first_order
    from public.exam_questions
    where exam_id = p_exam_id
  )
  insert into public.exam_questions (
    exam_id, bank_question_id, question_text, option_a, option_b, option_c,
    option_d, correct_answer, question_order
  )
  select p_exam_id, selected.id, selected.question, selected.option_a, selected.option_b,
    selected.option_c, selected.option_d, selected.correct_answer,
    question_start.first_order + selected.ordinal - 1
  from selected cross join question_start
  order by selected.ordinal;

  get diagnostics v_inserted = row_count;
  return jsonb_build_object('inserted', v_inserted, 'existing', v_existing, 'target', coalesce(v_exam.question_count, 40));
end;
$$;

revoke all on function public.generate_exam_questions_from_bank(uuid) from public, anon, authenticated;
grant execute on function public.generate_exam_questions_from_bank(uuid) to service_role;
