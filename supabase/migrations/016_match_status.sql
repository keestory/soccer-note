-- Add status column to matches: 'upcoming' | 'completed'
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('upcoming', 'completed'));

-- Existing matches are all completed
UPDATE matches SET status = 'completed' WHERE status IS NULL;
