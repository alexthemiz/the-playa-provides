-- 1. Add role to user_camp_affiliations
ALTER TABLE user_camp_affiliations
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin'));

-- 2. Add new camps columns
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS homebase text,
  ADD COLUMN IF NOT EXISTS playa_location text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}';

-- 3. Expand notifications_type_check to include camp_member_removed
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'new_item',
    'new_follower',
    'transfer_accepted',
    'transfer_declined',
    'loan_accepted',
    'loan_declined',
    'item_request',
    'camp_join',
    'camp_claim_approved',
    'camp_claim_denied',
    'loan_return_confirmed',
    'camp_member_removed'
  ]));
