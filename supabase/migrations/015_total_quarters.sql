-- Add total_quarters column to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS total_quarters INTEGER DEFAULT 4;

-- Relax the quarter_number constraint to allow up to 8 quarters
ALTER TABLE quarters DROP CONSTRAINT IF EXISTS quarters_quarter_number_check;
ALTER TABLE quarters ADD CONSTRAINT quarters_quarter_number_check CHECK (quarter_number >= 1 AND quarter_number <= 8);

-- Update the auto-create trigger to use total_quarters
CREATE OR REPLACE FUNCTION public.create_quarters_for_match()
RETURNS TRIGGER AS $$
DECLARE
  i INTEGER;
  total INTEGER;
BEGIN
  total := COALESCE(NEW.total_quarters, 4);
  FOR i IN 1..total LOOP
    INSERT INTO quarters (match_id, quarter_number) VALUES (NEW.id, i);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
