alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'new_item', 'new_follower', 'transfer_accepted', 'transfer_declined',
    'loan_accepted', 'loan_declined', 'item_request', 'camp_join',
    'camp_claim_approved', 'camp_claim_denied', 'loan_return_confirmed',
    'camp_member_removed', 'wish_list_match', 'loan_pickup_ready', 'transfer_pickup_ready',
    'loan_return_pending', 'loan_initiated', 'transfer_initiated'
  ));
