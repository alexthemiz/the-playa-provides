-- Add returning_2027 boolean to camps (2026 burn is over; rolling the per-year "returning" field forward)
ALTER TABLE camps
  ADD COLUMN IF NOT EXISTS returning_2027 boolean DEFAULT NULL;
