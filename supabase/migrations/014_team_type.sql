-- Add team_type column to teams table
-- 'club': 아카데미/유소년팀 (학부모 기능 활성화)
-- 'social': 성인 동호회 (학부모 기능 비활성화)

ALTER TABLE teams
ADD COLUMN IF NOT EXISTS team_type text NOT NULL DEFAULT 'social'
CHECK (team_type IN ('club', 'social'));

-- Existing teams default to 'social' (least disruptive)
-- Teams with any parent members should be updated to 'club'
UPDATE teams
SET team_type = 'club'
WHERE id IN (
  SELECT DISTINCT team_id
  FROM team_members
  WHERE role = 'parent'
);
