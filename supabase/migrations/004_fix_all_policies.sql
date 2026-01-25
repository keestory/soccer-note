-- Comprehensive fix for all RLS policies

-- ============================================
-- TEAMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD own teams" ON teams;
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Coaches can update teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Owners can delete teams" ON teams;

-- Simple and clear policies
CREATE POLICY "Anyone can view teams with invite code"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team owner can update"
  ON teams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Team owner can delete"
  ON teams FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TEAM_MEMBERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Coaches can manage team members" ON team_members;
DROP POLICY IF EXISTS "Users can join teams via invite" ON team_members;
DROP POLICY IF EXISTS "Coaches can select team members" ON team_members;
DROP POLICY IF EXISTS "Coaches can update team members" ON team_members;
DROP POLICY IF EXISTS "Coaches can delete team members" ON team_members;

-- Users can see their own membership records
CREATE POLICY "Users can view own memberships"
  ON team_members FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see other members of teams they belong to
CREATE POLICY "Members can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Anyone can insert themselves as a member
CREATE POLICY "Users can join teams"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Team owner or coach can update members
CREATE POLICY "Owner or coach can update members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role = 'coach')
  );

-- Team owner or coach can delete members (but not themselves)
CREATE POLICY "Owner or coach can delete members"
  ON team_members FOR DELETE
  USING (
    (
      EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.user_id = auth.uid())
      OR
      EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role = 'coach')
    )
    AND team_members.user_id != auth.uid()
  );

-- ============================================
-- PLAYERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD players of own teams" ON players;
DROP POLICY IF EXISTS "Team members can view players" ON players;
DROP POLICY IF EXISTS "Authorized users can manage players" ON players;
DROP POLICY IF EXISTS "Authorized users can update players" ON players;
DROP POLICY IF EXISTS "Authorized users can delete players" ON players;

CREATE POLICY "Team members can view players"
  ON players FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid())
  );

CREATE POLICY "Authorized can insert players"
  ON players FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = players.team_id AND tm.user_id = auth.uid() AND (tm.role = 'coach' OR tm.can_edit_players))
  );

CREATE POLICY "Authorized can update players"
  ON players FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = players.team_id AND tm.user_id = auth.uid() AND (tm.role = 'coach' OR tm.can_edit_players))
  );

CREATE POLICY "Authorized can delete players"
  ON players FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = players.team_id AND tm.user_id = auth.uid() AND (tm.role = 'coach' OR tm.can_edit_players))
  );

-- ============================================
-- MATCHES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD matches of own teams" ON matches;
DROP POLICY IF EXISTS "Team members can view matches" ON matches;
DROP POLICY IF EXISTS "Authorized users can manage matches" ON matches;
DROP POLICY IF EXISTS "Authorized users can update matches" ON matches;
DROP POLICY IF EXISTS "Authorized users can delete matches" ON matches;

CREATE POLICY "Team members can view matches"
  ON matches FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid())
  );

CREATE POLICY "Authorized can insert matches"
  ON matches FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = matches.team_id AND tm.user_id = auth.uid() AND (tm.role = 'coach' OR tm.can_edit_matches))
  );

CREATE POLICY "Authorized can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = matches.team_id AND tm.user_id = auth.uid() AND (tm.role = 'coach' OR tm.can_edit_matches))
  );

CREATE POLICY "Authorized can delete matches"
  ON matches FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = matches.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = matches.team_id AND tm.user_id = auth.uid() AND (tm.role = 'coach' OR tm.can_edit_matches))
  );

-- ============================================
-- QUARTERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD quarters of own matches" ON quarters;

CREATE POLICY "Team members can access quarters"
  ON quarters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = quarters.match_id
      AND (
        m.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        OR
        EXISTS (SELECT 1 FROM teams WHERE teams.id = m.team_id AND teams.user_id = auth.uid())
      )
    )
  );

-- ============================================
-- QUARTER_RECORDS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can CRUD quarter_records of own matches" ON quarter_records;

CREATE POLICY "Team members can access quarter_records"
  ON quarter_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quarters q
      JOIN matches m ON m.id = q.match_id
      WHERE q.id = quarter_records.quarter_id
      AND (
        m.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        OR
        EXISTS (SELECT 1 FROM teams WHERE teams.id = m.team_id AND teams.user_id = auth.uid())
      )
    )
  );

-- ============================================
-- TRIGGER FIX
-- ============================================
DROP TRIGGER IF EXISTS add_team_creator_trigger ON teams;
DROP FUNCTION IF EXISTS add_team_creator_as_coach();

CREATE OR REPLACE FUNCTION add_team_creator_as_coach()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role, can_edit_players, can_edit_matches, can_edit_quarters)
  VALUES (NEW.id, NEW.user_id, 'coach', true, true, true)
  ON CONFLICT (team_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_team_creator_trigger
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION add_team_creator_as_coach();
