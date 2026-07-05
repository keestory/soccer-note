-- MOM (Man of the Match) 투표
CREATE TABLE IF NOT EXISTS match_mom_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, voter_user_id)
);

ALTER TABLE match_mom_votes ENABLE ROW LEVEL SECURITY;

-- 같은 팀 멤버만 투표 가능
CREATE POLICY "team_members_can_vote" ON match_mom_votes
  FOR INSERT WITH CHECK (
    auth.uid() = voter_user_id
    AND EXISTS (
      SELECT 1 FROM matches m
      JOIN team_members tm ON tm.team_id = m.team_id
      WHERE m.id = match_id AND tm.user_id = auth.uid()
    )
  );

-- 투표 결과 조회: 같은 팀 멤버
CREATE POLICY "team_members_can_read_votes" ON match_mom_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN team_members tm ON tm.team_id = m.team_id
      WHERE m.id = match_id AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM matches m
      JOIN teams t ON t.id = m.team_id
      WHERE m.id = match_id AND t.user_id = auth.uid()
    )
  );

-- 본인 투표 삭제 가능
CREATE POLICY "voter_can_delete" ON match_mom_votes
  FOR DELETE USING (auth.uid() = voter_user_id);

CREATE INDEX idx_mom_votes_match ON match_mom_votes(match_id);
CREATE INDEX idx_mom_votes_player ON match_mom_votes(voted_player_id);
