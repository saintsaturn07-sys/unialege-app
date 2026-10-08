create table if not exists public.student_announcement_reads (
  student_id uuid not null references public.students(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  constraint student_announcement_reads_student_announcement_key unique (student_id, announcement_id)
);

create index if not exists student_announcement_reads_announcement_idx
  on public.student_announcement_reads (announcement_id);

alter table public.student_announcement_reads enable row level security;
revoke all privileges on table public.student_announcement_reads from anon, authenticated;
grant select, insert, update, delete on table public.student_announcement_reads to service_role;
