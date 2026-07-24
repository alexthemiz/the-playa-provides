-- Public, token-scoped preview for the pre-auth claim page. Returns only the
-- safe-to-show subset — never exposes owner_id, borrower_email, or lets the
-- caller enumerate rows without already knowing the token.
create or replace function public.get_informal_loan_preview(p_token uuid)
returns table (
  item_name text,
  item_image_url text,
  owner_display_name text,
  handed_over_at date,
  return_by date,
  damage_agreement numeric,
  loss_agreement numeric,
  status text
)
language sql
security definer
set search_path = public
as $$
  select
    gi.item_name,
    gi.image_urls[1],
    coalesce(p.preferred_name, p.username),
    il.handed_over_at,
    il.return_by,
    il.damage_agreement,
    il.loss_agreement,
    il.status
  from public.informal_loans il
  join public.gear_items gi on gi.id = il.item_id
  join public.profiles p on p.id = il.owner_id
  where il.invite_token = p_token;
$$;

-- Converts an informal loan into a real, tracked item_loans row for the
-- CALLING (already-authenticated) user. Mirrors confirm_transfer_receipt's
-- trust boundary: the caller never gets a direct table grant on
-- informal_loans for this — this function does the sensitive read/write on
-- their behalf, scoped strictly to the one row matching the token.
--
-- The status flip IS the concurrency check (`where ... and status =
-- 'active'`), not a separate select-then-update — two people clicking the
-- same claim link near-simultaneously must not both be able to pass a
-- read-only check before either commits. Only one concurrent caller can
-- ever successfully flip a given row's status away from 'active'; the
-- loser's UPDATE simply matches zero rows, so v_informal.id comes back
-- null for them and they get a clean "no longer available" error instead
-- of a duplicate item_loans row being created.
create or replace function public.claim_informal_loan(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_informal informal_loans%rowtype;
  v_new_loan_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be logged in to claim a loan';
  end if;

  if exists (select 1 from informal_loans where invite_token = p_token and owner_id = auth.uid()) then
    raise exception 'You can''t claim your own loan';
  end if;

  update informal_loans
  set status = 'converted', updated_at = now()
  where invite_token = p_token and status = 'active'
  returning * into v_informal;

  if v_informal.id is null then
    raise exception 'This loan is no longer available to claim';
  end if;

  insert into item_loans (item_id, owner_id, borrower_id, status, return_by, damage_agreement, loss_agreement, notes)
  values (v_informal.item_id, v_informal.owner_id, auth.uid(), 'pending_handover', v_informal.return_by, v_informal.damage_agreement, v_informal.loss_agreement, v_informal.notes)
  returning id into v_new_loan_id;

  update informal_loans set converted_loan_id = v_new_loan_id where id = v_informal.id;

  insert into notifications (recipient_id, actor_id, type, item_id)
  values (v_informal.owner_id, auth.uid(), 'informal_loan_claimed', v_informal.item_id);

  return v_new_loan_id;
end;
$$;
