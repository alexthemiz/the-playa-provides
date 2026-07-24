-- Fix informal_loans: owner_id → CASCADE on profiles.id, matching the
-- precedent set in 20260316205436_fix_item_loans_transfers_fk_cascade.sql
-- for item_loans/item_transfers. Without cascade, deleting a profile that
-- still has ANY informal_loans row referencing it as owner (even an old
-- returned/cancelled/converted one) fails with a FK violation.
ALTER TABLE public.informal_loans
  DROP CONSTRAINT IF EXISTS informal_loans_owner_id_fkey;

ALTER TABLE public.informal_loans
  ADD CONSTRAINT informal_loans_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Close the TOCTOU race in prevent_informal_loan_on_active_item(): that
-- trigger does a plain read-then-raise with no lock, so two near-
-- simultaneous inserts for the same item can both read is_on_loan = false
-- before either commits, letting both through. A partial unique index
-- enforces "at most one active informal loan per item" atomically at the
-- constraint level, closing the race regardless of trigger timing. The
-- trigger itself is NOT replaced — it still blocks a new informal loan
-- against an item that's on loan via a REAL item_loans row, a cross-table
-- case this index can't express. Doesn't conflict with the existing
-- informal_loans_invite_token_idx (different column).
create unique index informal_loans_one_active_per_item_idx
  on public.informal_loans (item_id)
  where (status = 'active');
