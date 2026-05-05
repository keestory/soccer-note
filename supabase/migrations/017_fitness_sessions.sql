-- Fitness Sessions: Store Apple Watch fitness data during matches/training
CREATE TABLE fitness_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,

  -- Session info
  position TEXT NOT NULL CHECK (position IN ('GK', 'DF', 'MF', 'FW')),
  is_match BOOLEAN DEFAULT true,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,

  -- Distance metrics (in meters)
  total_distance_meters DECIMAL(10,2) DEFAULT 0,
  sprint_distance_meters DECIMAL(10,2) DEFAULT 0,
  sprint_count INTEGER DEFAULT 0,

  -- Heart rate
  average_heart_rate DECIMAL(5,1) DEFAULT 0,
  max_heart_rate DECIMAL(5,1) DEFAULT 0,

  -- Other metrics
  active_calories DECIMAL(8,2) DEFAULT 0,
  average_speed DECIMAL(5,2) DEFAULT 0, -- m/s
  max_speed DECIMAL(5,2) DEFAULT 0, -- m/s

  -- Quarter breakdown (for matches)
  quarter_distances JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fitness_sessions_player_id ON fitness_sessions(player_id);
CREATE INDEX idx_fitness_sessions_match_id ON fitness_sessions(match_id);
CREATE INDEX idx_fitness_sessions_team_id ON fitness_sessions(team_id);
CREATE INDEX idx_fitness_sessions_start_time ON fitness_sessions(start_time DESC);

-- RLS
ALTER TABLE fitness_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Team owners and approved members can view fitness sessions
CREATE POLICY "Team members can view fitness sessions"
  ON fitness_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = auth.uid()
    WHERE t.id = fitness_sessions.team_id
    AND (t.user_id = auth.uid() OR tm.status = 'approved')
  ));

-- Policy: Players can insert their own fitness sessions (via team_members.linked_player_id)
CREATE POLICY "Players can insert own fitness sessions"
  ON fitness_sessions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.linked_player_id = fitness_sessions.player_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'approved'
  ) OR EXISTS (
    -- Team owners/coaches can also insert for any player
    SELECT 1 FROM teams t
    WHERE t.id = fitness_sessions.team_id
    AND t.user_id = auth.uid()
  ));

-- Policy: Players can update their own fitness sessions
CREATE POLICY "Players can update own fitness sessions"
  ON fitness_sessions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.linked_player_id = fitness_sessions.player_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'approved'
  ) OR EXISTS (
    -- Team owners/coaches can also update
    SELECT 1 FROM teams t
    WHERE t.id = fitness_sessions.team_id
    AND t.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_fitness_sessions_updated_at
  BEFORE UPDATE ON fitness_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Aggregated fitness stats per player
CREATE OR REPLACE VIEW player_fitness_stats AS
SELECT
  p.id as player_id,
  p.name as player_name,
  p.team_id,
  COUNT(fs.id) as total_sessions,
  COUNT(CASE WHEN fs.is_match THEN 1 END) as match_sessions,
  COUNT(CASE WHEN NOT fs.is_match THEN 1 END) as training_sessions,
  ROUND(AVG(fs.total_distance_meters)::numeric, 0) as avg_distance_meters,
  ROUND(AVG(fs.sprint_count)::numeric, 1) as avg_sprint_count,
  ROUND(AVG(fs.average_heart_rate)::numeric, 0) as avg_heart_rate,
  MAX(fs.max_speed) as top_speed,
  SUM(fs.active_calories) as total_calories
FROM players p
LEFT JOIN fitness_sessions fs ON fs.player_id = p.id
GROUP BY p.id, p.name, p.team_id;

-- Grant access to the view
GRANT SELECT ON player_fitness_stats TO authenticated;

COMMENT ON TABLE fitness_sessions IS 'Apple Watch fitness tracking data synced from SoccerNote Watch app';
