-- Add returning_status to user_camp_affiliations
ALTER TABLE user_camp_affiliations
  ADD COLUMN IF NOT EXISTS returning_status text
    CHECK (returning_status IN ('yes', 'maybe', 'no'));

-- Add returning_2026 boolean to camps
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS returning_2026 boolean DEFAULT NULL;
