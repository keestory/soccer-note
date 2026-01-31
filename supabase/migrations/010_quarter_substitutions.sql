CREATE TABLE quarter_substitutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter_id UUID REFERENCES quarters(id) ON DELETE CASCADE NOT NULL,
  player_out_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  player_in_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  minute INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quarter_substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view substitutions"
  ON quarter_substitutions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quarters q
    JOIN matches m ON m.id = q.match_id
    JOIN teams t ON t.id = m.team_id
    LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = auth.uid()
    WHERE q.id = quarter_substitutions.quarter_id
    AND (t.user_id = auth.uid() OR tm.status = 'approved')
  ));

CREATE POLICY "Team editors can manage substitutions"
  ON quarter_substitutions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quarters q
    JOIN matches m ON m.id = q.match_id
    JOIN teams t ON t.id = m.team_id
    LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = auth.uid()
    WHERE q.id = quarter_substitutions.quarter_id
    AND (t.user_id = auth.uid() OR (tm.status = 'approved' AND tm.can_edit_quarters = true))
  ));
