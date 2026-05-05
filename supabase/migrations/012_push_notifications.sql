-- ============================================
-- FCM 푸시 알림 시스템 (Push Notifications)
-- ============================================

-- 1. 푸시 토큰 저장 테이블
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT,  -- 디바이스 식별자 (선택)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = TRUE;

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 토큰만 관리 가능
CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens FOR ALL
  USING (user_id = auth.uid());

-- 서비스 역할은 모든 토큰 조회 가능 (알림 발송용)
CREATE POLICY "Service role can read all tokens"
  ON push_tokens FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. 알림 발송 내역 테이블
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',  -- 추가 데이터 (match_id 등)
  notification_type TEXT NOT NULL CHECK (notification_type IN ('manual', 'new_match', 'match_update', 'system')),
  recipients_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_team_id ON notifications(team_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 코치/팀 소유자는 팀 알림 관리 가능
CREATE POLICY "Coaches can manage team notifications"
  ON notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams WHERE teams.id = notifications.team_id AND teams.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = notifications.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'coach'
      AND tm.status = 'approved'
    )
  );

-- 팀 멤버는 알림 내역 조회 가능
CREATE POLICY "Team members can view notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = notifications.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'approved'
    )
  );

-- 3. 개별 알림 수신 기록 (선택적)
CREATE TABLE IF NOT EXISTS notification_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id UUID REFERENCES push_tokens(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  UNIQUE(notification_id, user_id, token_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_receipts_notification_id ON notification_receipts(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_receipts_user_id ON notification_receipts(user_id);

ALTER TABLE notification_receipts ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림 수신 기록만 조회 가능
CREATE POLICY "Users can view their own receipts"
  ON notification_receipts FOR SELECT
  USING (user_id = auth.uid());

-- 코치는 팀 알림 수신 기록 조회 가능
CREATE POLICY "Coaches can view team notification receipts"
  ON notification_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      JOIN teams t ON t.id = n.team_id
      WHERE n.id = notification_receipts.notification_id
      AND (t.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = n.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'coach'
        AND tm.status = 'approved'
      ))
    )
  );

-- 서비스 역할은 수신 기록 관리 가능
CREATE POLICY "Service role can manage receipts"
  ON notification_receipts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. updated_at 트리거
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 팀 멤버의 푸시 토큰 조회 함수 (알림 발송용)
CREATE OR REPLACE FUNCTION get_team_push_tokens(p_team_id UUID)
RETURNS TABLE (
  user_id UUID,
  token TEXT,
  platform TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.user_id, pt.token, pt.platform
  FROM push_tokens pt
  JOIN team_members tm ON tm.user_id = pt.user_id
  WHERE tm.team_id = p_team_id
  AND tm.status = 'approved'
  AND pt.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
