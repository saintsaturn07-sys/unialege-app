create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  category text not null check (category in ('Academic', 'Examination', 'School Event', 'General', 'Fees')),
  description text not null check (length(btrim(description)) between 1 and 300),
  details text not null check (length(btrim(details)) between 1 and 10000),
  target_class text check (target_class is null or target_class in ('JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3')),
  target_stream text check (target_stream is null or target_stream in ('science', 'commercial', 'art')),
  is_published boolean not null default false,
  published_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_stream_requires_senior_class check (
    target_stream is null or coalesce(target_class in ('SS 1', 'SS 2', 'SS 3'), false)
  )
);

create index if not exists announcements_published_created_idx
  on public.announcements (is_published, created_at desc);
create index if not exists announcements_target_class_idx
  on public.announcements (target_class, target_stream)
  where is_published = true;

alter table public.announcements enable row level security;
revoke all privileges on table public.announcements from anon, authenticated;
grant select, insert, update, delete on table public.announcements to service_role;
