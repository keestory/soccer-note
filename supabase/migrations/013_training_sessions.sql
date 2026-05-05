-- ============================================
-- Migration 013: Training Sessions
-- ============================================

-- ============================================
-- TRAINING_SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  training_date DATE NOT NULL,
  training_type TEXT NOT NULL DEFAULT 'mixed' CHECK (training_type IN ('mini-game', 'passing', 'shooting', 'fitness', 'tactics', 'mixed', 'other')),
  location TEXT,
  duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_team_id ON training_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(training_date DESC);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT - team members and owner can view
CREATE POLICY "Team members can view training sessions"
  ON training_sessions FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'approved')
    OR
    EXISTS (SELECT 1 FROM teams WHERE teams.id = training_sessions.team_id AND teams.user_id = auth.uid())
  );
-- RLS: INSERT - owner or coaches/members with can_edit_matches
CREATE POLICY "Authorized can insert training sessions"
  ON training_sessions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = training_sessions.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = training_sessions.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'approved'
      AND (tm.role = 'coach' OR tm.can_edit_matches = true)
    )
  );

-- RLS: UPDATE
CREATE POLICY "Authorized can update training sessions"
  ON training_sessions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = training_sessions.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = training_sessions.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'approved'
      AND (tm.role = 'coach' OR tm.can_edit_matches = true)
    )
  );

-- RLS: DELETE
CREATE POLICY "Authorized can delete training sessions"
  ON training_sessions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = training_sessions.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = training_sessions.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'approved'
      AND (tm.role = 'coach' OR tm.can_edit_matches = true)
    )
  );

-- updated_at trigger
CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON training_sessions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRAINING_ATTENDEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS training_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  rating DECIMAL(3,1) CHECK (rating IS NULL OR (rating BETWEEN 1 AND 10)),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(training_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_training_attendees_training_id ON training_attendees(training_id);
CREATE INDEX IF NOT EXISTS idx_training_attendees_player_id ON training_attendees(player_id);

ALTER TABLE training_attendees ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT
CREATE POLICY "Team members can view training attendees"
  ON training_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = training_attendees.training_id
      AND (
        ts.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'approved')
        OR
        EXISTS (SELECT 1 FROM teams WHERE teams.id = ts.team_id AND teams.user_id = auth.uid())
      )
    )
  );

-- RLS: INSERT
CREATE POLICY "Authorized can insert training attendees"
  ON training_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = training_attendees.training_id
      AND (
        EXISTS (SELECT 1 FROM teams WHERE teams.id = ts.team_id AND teams.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = ts.team_id
          AND tm.user_id = auth.uid()
          AND tm.status = 'approved'
          AND (tm.role = 'coach' OR tm.can_edit_matches = true)
        )
      )
    )
  );

-- RLS: UPDATE
CREATE POLICY "Authorized can update training attendees"
  ON training_attendees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = training_attendees.training_id
      AND (
        EXISTS (SELECT 1 FROM teams WHERE teams.id = ts.team_id AND teams.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = ts.team_id
          AND tm.user_id = auth.uid()
          AND tm.status = 'approved'
          AND (tm.role = 'coach' OR tm.can_edit_matches = true)
        )
      )
    )
  );

-- RLS: DELETE
CREATE POLICY "Authorized can delete training attendees"
  ON training_attendees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = training_attendees.training_id
      AND (
        EXISTS (SELECT 1 FROM teams WHERE teams.id = ts.team_id AND teams.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = ts.team_id
          AND tm.user_id = auth.uid()
          AND tm.status = 'approved'
          AND (tm.role = 'coach' OR tm.can_edit_matches = true)
        )
      )
    )
  );

-- updated_at trigger
CREATE TRIGGER update_training_attendees_updated_at
  BEFORE UPDATE ON training_attendees FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VISIBILITY SETTINGS UPDATE
-- ============================================
ALTER TABLE team_visibility_settings
ADD COLUMN IF NOT EXISTS show_training_records BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_training_feedback BOOLEAN DEFAULT FALSE;
