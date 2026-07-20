alter table public.profiles
  add column if not exists checklist_dismissed boolean not null default false,
  add column if not exists has_browsed boolean not null default false;
