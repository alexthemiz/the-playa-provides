alter table public.gear_items add column if not exists is_on_loan boolean not null default false;

create or replace function public.sync_gear_item_loan_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gear_items
  set is_on_loan = (new.status in ('pending_handover', 'active', 'return_pending'))
  where id = new.item_id;
  return new;
end;
$$;

drop trigger if exists item_loans_sync_gear_flag on public.item_loans;
create trigger item_loans_sync_gear_flag
  after insert or update of status on public.item_loans
  for each row
  execute function public.sync_gear_item_loan_flag();

update public.gear_items g
set is_on_loan = true
where exists (
  select 1 from public.item_loans l
  where l.item_id = g.id
  and l.status in ('pending_handover', 'active', 'return_pending')
);
