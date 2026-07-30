create or replace function public.sync_gear_item_loan_flag()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_item_id bigint;
begin
  -- DELETE triggers have no NEW row, only OLD -- coalesce covers both so
  -- this one function handles insert/update/delete on either loan table.
  target_item_id := coalesce(new.item_id, old.item_id);

  update public.gear_items
  set is_on_loan = (
    exists (select 1 from public.item_loans where item_id = target_item_id and status in ('pending_handover', 'active', 'return_pending'))
    or exists (select 1 from public.informal_loans where item_id = target_item_id and status = 'active')
  )
  where id = target_item_id;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists item_loans_sync_gear_flag on public.item_loans;
create trigger item_loans_sync_gear_flag
  after insert or update of status or delete on public.item_loans
  for each row
  execute function public.sync_gear_item_loan_flag();

drop trigger if exists informal_loans_sync_gear_flag on public.informal_loans;
create trigger informal_loans_sync_gear_flag
  after insert or update of status or delete on public.informal_loans
  for each row
  execute function public.sync_gear_item_loan_flag();
