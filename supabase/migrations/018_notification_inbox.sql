-- ============================================
-- 알림함 기능 (Notification Inbox)
-- ============================================

-- 1. notification_receipts 테이블에 read_at 컬럼 추가
ALTER TABLE notification_receipts ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 2. 읽지 않은 알림 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_receipts_user_unread
  ON notification_receipts(user_id, sent_at DESC)
  WHERE read_at IS NULL;

-- 3. 사용자별 알림 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_receipts_user_sent
  ON notification_receipts(user_id, sent_at DESC);

-- 4. 사용자 알림 조회 함수
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

-- 5. 읽지 않은 알림 개수 조회 함수
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count_result
  FROM notification_receipts
  WHERE user_id = p_user_id AND read_at IS NULL;

  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 알림 읽음 처리 함수
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_receipt_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_receipt_ids IS NULL THEN
    -- 전체 읽음 처리
    UPDATE notification_receipts
    SET read_at = NOW()
    WHERE user_id = p_user_id AND read_at IS NULL;
  ELSE
    -- 선택된 알림만 읽음 처리
    UPDATE notification_receipts
    SET read_at = NOW()
    WHERE user_id = p_user_id
    AND id = ANY(p_receipt_ids)
    AND read_at IS NULL;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
