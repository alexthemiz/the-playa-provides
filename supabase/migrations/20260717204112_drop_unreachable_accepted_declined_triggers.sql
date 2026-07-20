-- These triggers fire on item_loans/item_transfers.status = 'accepted'/'declined',
-- but the app's actual state machine never writes those values (it uses
-- pending_handover/active/return_pending/complete/cancelled/disputed, and
-- transfer accept/decline is handled via manual client-side notification
-- inserts instead). Confirmed unreachable — dead weight, never fired.
drop trigger if exists on_loan_status_change on public.item_loans;
drop trigger if exists on_transfer_status_change on public.item_transfers;
drop function if exists public.notify_on_loan_status_change();
drop function if exists public.notify_on_transfer_status_change();
