-- Match attendees: track which players attended each match
CREATE TABLE match_attendees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

ALTER TABLE match_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view match attendees"
  ON match_attendees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches m
    JOIN teams t ON t.id = m.team_id
    LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = auth.uid()
    WHERE m.id = match_attendees.match_id
    AND (t.user_id = auth.uid() OR tm.status = 'approved')
  ));

CREATE POLICY "Team editors can insert match attendees"
  ON match_attendees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM matches m
    JOIN teams t ON t.id = m.team_id
    LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = auth.uid()
    WHERE m.id = match_attendees.match_id
    AND (t.user_id = auth.uid() OR (tm.status = 'approved' AND tm.can_edit_matches = true))
  ));

CREATE POLICY "Team editors can delete match attendees"
  ON match_attendees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM matches m
    JOIN teams t ON t.id = m.team_id
    LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = auth.uid()
    WHERE m.id = match_attendees.match_id
    AND (t.user_id = auth.uid() OR (tm.status = 'approved' AND tm.can_edit_matches = true))
  ));
