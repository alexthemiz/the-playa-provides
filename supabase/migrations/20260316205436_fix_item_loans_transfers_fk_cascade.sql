-- Fix item_loans: owner_id and borrower_id → CASCADE on profiles.id
ALTER TABLE item_loans
  DROP CONSTRAINT IF EXISTS item_loans_owner_id_fkey,
  DROP CONSTRAINT IF EXISTS item_loans_borrower_id_fkey;

ALTER TABLE item_loans
  ADD CONSTRAINT item_loans_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT item_loans_borrower_id_fkey
    FOREIGN KEY (borrower_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix item_transfers: owner_id and recipient_id → CASCADE on profiles.id
ALTER TABLE item_transfers
  DROP CONSTRAINT IF EXISTS item_transfers_owner_id_fkey,
  DROP CONSTRAINT IF EXISTS item_transfers_recipient_id_fkey;

ALTER TABLE item_transfers
  ADD CONSTRAINT item_transfers_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT item_transfers_recipient_id_fkey
    FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
