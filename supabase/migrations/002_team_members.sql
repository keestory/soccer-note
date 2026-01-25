-- Team Members & Invite System Migration

-- Add invite_code to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Create team_members table for many-to-many relationship
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('coach', 'member')),
  -- Permissions (coach can set these for members)
  can_edit_players BOOLEAN DEFAULT FALSE,
  can_edit_matches BOOLEAN DEFAULT FALSE,
  can_edit_quarters BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team members policies
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Coaches can manage team members" ON team_members;
CREATE POLICY "Coaches can manage team members"
  ON team_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'coach'
  ));

DROP POLICY IF EXISTS "Users can join teams via invite" ON team_members;
CREATE POLICY "Users can join teams via invite"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update teams table policies to work with team_members
DROP POLICY IF EXISTS "Users can CRUD own teams" ON teams;
CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid())
  );

CREATE POLICY "Coaches can update teams"
  ON teams FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid() AND team_members.role = 'coach')
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete teams"
  ON teams FOR DELETE
  USING (user_id = auth.uid());

-- Update players policies
DROP POLICY IF EXISTS "Users can CRUD players of own teams" ON players;
CREATE POLICY "Team members can view players"
  ON players FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = players.team_id AND tm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
  ));

CREATE POLICY "Authorized users can manage players"
  ON players FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = players.team_id AND tm.user_id = auth.uid()
    AND (tm.role = 'coach' OR tm.can_edit_players = true)
  ));

CREATE POLICY "Authorized users can update players"
  ON players FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = players.team_id AND tm.user_id = auth.uid()
    AND (tm.role = 'coach' OR tm.can_edit_players = true)
  ));

CREATE POLICY "Authorized users can delete players"
  ON players FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = players.team_id AND tm.user_id = auth.uid()
    AND (tm.role = 'coach' OR tm.can_edit_players = true)
  ));

-- Update matches policies similarly
DROP POLICY IF EXISTS "Users can CRUD matches of own teams" ON matches;
CREATE POLICY "Team members can view matches"
  ON matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = matches.team_id AND tm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid()
  ));

CREATE POLICY "Authorized users can manage matches"
  ON matches FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = matches.team_id AND tm.user_id = auth.uid()
    AND (tm.role = 'coach' OR tm.can_edit_matches = true)
  ));

CREATE POLICY "Authorized users can update matches"
  ON matches FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = matches.team_id AND tm.user_id = auth.uid()
    AND (tm.role = 'coach' OR tm.can_edit_matches = true)
  ));

CREATE POLICY "Authorized users can delete matches"
  ON matches FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = matches.team_id AND tm.user_id = auth.uid()
    AND (tm.role = 'coach' OR tm.can_edit_matches = true)
  ));

-- Function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate invite code for new teams
CREATE OR REPLACE FUNCTION set_team_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_team_invite_code_trigger ON teams;
CREATE TRIGGER set_team_invite_code_trigger
  BEFORE INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION set_team_invite_code();

-- Auto-add creator as coach when team is created
CREATE OR REPLACE FUNCTION add_team_creator_as_coach()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role, can_edit_players, can_edit_matches, can_edit_quarters)
  VALUES (NEW.id, NEW.user_id, 'coach', true, true, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS add_team_creator_trigger ON teams;
CREATE TRIGGER add_team_creator_trigger
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION add_team_creator_as_coach();

-- Update existing teams with invite codes
UPDATE teams SET invite_code = generate_invite_code() WHERE invite_code IS NULL;

-- Add existing team owners as coaches in team_members (for migration)
INSERT INTO team_members (team_id, user_id, role, can_edit_players, can_edit_matches, can_edit_quarters)
SELECT id, user_id, 'coach', true, true, true
FROM teams
WHERE NOT EXISTS (
  SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = teams.user_id
);
