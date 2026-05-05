-- ============================================
-- 팀 푸시 토큰 조회 함수 수정
-- 팀 소유자(감독)의 토큰도 포함하도록 수정
-- ============================================

CREATE OR REPLACE FUNCTION get_team_push_tokens(p_team_id UUID)
RETURNS TABLE (
  user_id UUID,
  token TEXT,
  platform TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- 팀 멤버의 토큰
  SELECT pt.user_id, pt.token, pt.platform
  FROM push_tokens pt
  JOIN team_members tm ON tm.user_id = pt.user_id
  WHERE tm.team_id = p_team_id
  AND tm.status = 'approved'
  AND (tm.is_removed IS NULL OR tm.is_removed = FALSE)
  AND pt.is_active = TRUE

  UNION

  -- 팀 소유자(감독)의 토큰
  SELECT pt.user_id, pt.token, pt.platform
  FROM push_tokens pt
  JOIN teams t ON t.user_id = pt.user_id
  WHERE t.id = p_team_id
  AND pt.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
