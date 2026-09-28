-- Cutover step. Apply after deploying and confirming the replacement server routes.
-- Policies are removed by catalog lookup; no deployed policy names are assumed.

alter table public.students enable row level security;
alter table public.results enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_answers enable row level security;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array['students', 'results', 'exams', 'exam_questions', 'exam_attempts', 'exam_attempt_answers'])
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

revoke all privileges on table
  public.students, public.results, public.exams, public.exam_questions,
  public.exam_attempts, public.exam_attempt_answers
from anon, authenticated;

grant select, insert, update, delete on table
  public.students, public.results, public.exams, public.exam_questions,
  public.exam_attempts, public.exam_attempt_answers
to service_role;

-- Also clear any per-column grants if the project previously issued them.
do $$
declare
  t record;
  column_list text;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any (array['students', 'results', 'exams', 'exam_questions', 'exam_attempts', 'exam_attempt_answers'])
  loop
    select string_agg(format('%I', column_name), ', ' order by ordinal_position)
      into column_list
    from information_schema.columns
    where table_schema = 'public' and table_name = t.table_name;
    if column_list is not null then
      execute format('revoke all (%s) on table public.%I from anon, authenticated', column_list, t.table_name);
    end if;
  end loop;
end $$;
