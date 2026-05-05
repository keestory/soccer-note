-- ============================================
-- 부모-선수 연결 시스템 (Parent-Player Linking)
-- ============================================

-- 1. team_members 테이블에 부모용 필드 추가
-- child_name: 부모가 가입 시 입력한 자녀 이름
-- linked_player_id: 코치가 연결한 선수 ID
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS child_name TEXT,
ADD COLUMN IF NOT EXISTS linked_player_id UUID REFERENCES players(id) ON DELETE SET NULL;

-- 2. 팀 visibility 설정 테이블
CREATE TABLE IF NOT EXISTS team_visibility_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- 부모에게 보여줄 기능들
  show_match_records BOOLEAN DEFAULT TRUE,      -- 경기 기록 열람
  show_player_stats BOOLEAN DEFAULT TRUE,       -- 선수 통계 열람
  show_player_ratings BOOLEAN DEFAULT FALSE,    -- 선수 평점 열람
  show_quarter_details BOOLEAN DEFAULT FALSE,   -- 쿼터별 상세 기록
  show_formation BOOLEAN DEFAULT TRUE,          -- 포메이션 열람
  show_attendance BOOLEAN DEFAULT TRUE,         -- 출석 현황 열람
  show_goals_assists BOOLEAN DEFAULT TRUE,      -- 골/어시스트 열람
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id)
);

CREATE INDEX IF NOT EXISTS idx_visibility_team_id ON team_visibility_settings(team_id);

ALTER TABLE team_visibility_settings ENABLE ROW LEVEL SECURITY;

-- 코치/팀오너만 visibility 설정 관리 가능
CREATE POLICY "Coaches can manage visibility settings"
  ON team_visibility_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_visibility_settings.team_id AND teams.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_visibility_settings.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'coach'
    AND tm.status = 'approved'
  ));

-- 팀 멤버는 설정 조회 가능
CREATE POLICY "Members can view visibility settings"
  ON team_visibility_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_visibility_settings.team_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'approved'
  ));

-- 3. 팀 생성 시 기본 visibility 설정 자동 생성
CREATE OR REPLACE FUNCTION create_default_visibility_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_visibility_settings (team_id)
  VALUES (NEW.id)
  ON CONFLICT (team_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_visibility_settings_trigger ON teams;
CREATE TRIGGER create_visibility_settings_trigger
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION create_default_visibility_settings();

-- 4. 기존 팀에 대해 visibility 설정 생성
INSERT INTO team_visibility_settings (team_id)
SELECT id FROM teams
WHERE NOT EXISTS (
  SELECT 1 FROM team_visibility_settings WHERE team_visibility_settings.team_id = teams.id
);

-- 5. team_members role 업데이트 (parent 역할 추가)
ALTER TABLE team_members
DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE team_members
ADD CONSTRAINT team_members_role_check CHECK (role IN ('coach', 'member', 'parent'));

-- 6. updated_at 트리거
CREATE TRIGGER update_visibility_settings_updated_at
  BEFORE UPDATE ON team_visibility_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. linked_player_id 인덱스
CREATE INDEX IF NOT EXISTS idx_team_members_linked_player ON team_members(linked_player_id);
