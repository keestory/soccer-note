-- ============================================
-- 알림 확인 완료 기능 (Notification Confirmation)
-- ============================================

-- 1. notification_receipts 테이블에 confirmed_at 컬럼 추가
ALTER TABLE notification_receipts ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- 2. 확인 완료 처리용 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_receipts_confirmed
  ON notification_receipts(notification_id, confirmed_at)
  WHERE confirmed_at IS NOT NULL;

-- 3. 알림 확인 완료 처리 함수
CREATE OR REPLACE FUNCTION confirm_notification(
  p_user_id UUID,
  p_receipt_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notification_receipts
  SET confirmed_at = NOW()
  WHERE id = p_receipt_id
  AND user_id = p_user_id
  AND confirmed_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 알림별 확인 통계 조회 함수
CREATE OR REPLACE FUNCTION get_notification_confirmation_stats(p_notification_id UUID)
RETURNS TABLE (
  total_sent INTEGER,
  read_count INTEGER,
  confirmed_count INTEGER,
  recipients JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_sent,
    COUNT(nr.read_at)::INTEGER as read_count,
    COUNT(nr.confirmed_at)::INTEGER as confirmed_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', nr.user_id,
          'display_name', p.display_name,
          'read_at', nr.read_at,
          'confirmed_at', nr.confirmed_at
        )
        ORDER BY nr.confirmed_at DESC NULLS LAST, nr.read_at DESC NULLS LAST
      ),
      '[]'::jsonb
    ) as recipients
  FROM notification_receipts nr
  LEFT JOIN profiles p ON p.id = nr.user_id
  WHERE nr.notification_id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. get_user_notifications 함수 업데이트 (confirmed_at 포함)
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  receipt_id UUID,
  notification_id UUID,
  team_id UUID,
  team_name TEXT,
  title TEXT,
  body TEXT,
  data JSONB,
  notification_type TEXT,
  status TEXT,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nr.id as receipt_id,
    n.id as notification_id,
    n.team_id,
    t.name as team_name,
    n.title,
    n.body,
    n.data,
    n.notification_type,
    nr.status,
    nr.read_at,
    nr.clicked_at,
    nr.confirmed_at,
    nr.sent_at,
    n.created_at
  FROM notification_receipts nr
  JOIN notifications n ON n.id = nr.notification_id
  JOIN teams t ON t.id = n.team_id
  WHERE nr.user_id = p_user_id
  AND (NOT p_unread_only OR nr.read_at IS NULL)
  ORDER BY nr.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
