ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'new_item', 'new_follower', 'transfer_accepted', 'transfer_declined',
  'loan_accepted', 'loan_declined', 'item_request', 'camp_join',
  'camp_claim_approved', 'camp_claim_denied', 'loan_return_confirmed',
  'camp_member_removed', 'wish_list_match'
]));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS meta jsonb;
