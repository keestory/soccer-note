-- Player intro / member profile fields
-- Adds a self-introduction, multiple preferred positions, and preferred
-- back numbers so a team can present its members as a roster.
-- (Contact numbers and birthdates are intentionally NOT stored here.)

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS preferred_positions TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_numbers TEXT;
