-- ============================================
-- 팀 가입 승인 시스템
-- ============================================

-- 1. team_members 테이블에 status 컬럼 추가
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. 기존 멤버들은 모두 approved 상태로 설정
UPDATE team_members SET status = 'approved' WHERE status IS NULL;

-- 3. RLS 정책 업데이트 - pending 상태도 조회 가능하도록
DROP POLICY IF EXISTS "Users can view own memberships" ON team_members;
CREATE POLICY "Users can view own memberships"
  ON team_members FOR SELECT
  USING (auth.uid() = user_id);

-- 4. 팀 오너/코치는 pending 요청도 볼 수 있음
DROP POLICY IF EXISTS "Owners can view pending requests" ON team_members;
CREATE POLICY "Owners can view pending requests"
  ON team_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role = 'coach' AND tm.status = 'approved')
  );
