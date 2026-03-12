create table if not exists public.item_requests (
  id uuid primary key default gen_random_uuid(),
  item_id bigint not null references public.gear_items(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  request_kind text not null check (request_kind in ('borrow', 'keep')),
  status text not null default 'pending' check (status in ('pending', 'cancelled', 'fulfilled')),
  message text not null,
  requester_name text,
  requester_email text,
  desired_pickup_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists item_requests_owner_status_idx
  on public.item_requests (owner_id, status, created_at desc);

create index if not exists item_requests_requester_status_idx
  on public.item_requests (requester_id, status, created_at desc);

create unique index if not exists item_requests_one_pending_per_item_idx
  on public.item_requests (item_id)
  where status = 'pending';

create or replace function public.set_item_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists item_requests_set_updated_at on public.item_requests;

create trigger item_requests_set_updated_at
before update on public.item_requests
for each row
execute function public.set_item_requests_updated_at();

alter table public.item_requests enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'item_requests'
      and policyname = 'item_requests_select_own'
  ) then
    create policy item_requests_select_own
      on public.item_requests
      for select
      using (auth.uid() = owner_id or auth.uid() = requester_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'item_requests'
      and policyname = 'item_requests_update_own'
  ) then
    create policy item_requests_update_own
      on public.item_requests
      for update
      using (auth.uid() = owner_id or auth.uid() = requester_id)
      with check (auth.uid() = owner_id or auth.uid() = requester_id);
  end if;
end
$$;
