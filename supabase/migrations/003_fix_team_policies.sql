-- Fix team creation policies

-- Drop the problematic "Coaches can manage team members" policy that uses FOR ALL
-- FOR ALL with USING creates implicit WITH CHECK which can block INSERT operations
DROP POLICY IF EXISTS "Coaches can manage team members" ON team_members;

-- Create separate policies for each operation type
CREATE POLICY "Coaches can select team members"
  ON team_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'coach'
  ));

CREATE POLICY "Coaches can update team members"
  ON team_members FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'coach'
  ));

CREATE POLICY "Coaches can delete team members"
  ON team_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'coach'
  ));

-- Ensure the INSERT policy allows users to add themselves
DROP POLICY IF EXISTS "Users can join teams via invite" ON team_members;
CREATE POLICY "Users can join teams via invite"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Make sure the trigger function can bypass RLS by using SECURITY DEFINER
-- and also grant it explicit permissions
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
