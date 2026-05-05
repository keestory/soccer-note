-- Add review text and media columns to quarter_records
ALTER TABLE quarter_records
  ADD COLUMN IF NOT EXISTS praise_text TEXT,
  ADD COLUMN IF NOT EXISTS improvement_text TEXT,
  ADD COLUMN IF NOT EXISTS highlight_text TEXT,
  ADD COLUMN IF NOT EXISTS media_urls TEXT[];
