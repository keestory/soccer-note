-- Self-rated ability card (FIFA-style) + strength tags for member profiles
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS attributes JSONB,       -- {pace,shooting,passing,dribbling,defending,physical} each 1-99
  ADD COLUMN IF NOT EXISTS strength_tags TEXT[];
