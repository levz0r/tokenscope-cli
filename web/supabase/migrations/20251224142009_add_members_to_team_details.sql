-- Update get_team_details to include team members

CREATE OR REPLACE FUNCTION get_team_details(
  target_team_id UUID,
  requesting_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  user_role TEXT;
BEGIN
  -- Get user's role in this team
  SELECT role INTO user_role
  FROM team_members
  WHERE team_id = target_team_id AND user_id = requesting_user_id;

  -- If user is not a member, return NULL
  IF user_role IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', t.id,
    'name', t.name,
    'created_at', t.created_at,
    'user_role', user_role,
    'member_count', (SELECT COUNT(*) FROM team_members WHERE team_id = t.id),
    'total_sessions', (SELECT COUNT(*) FROM sessions WHERE team_id = t.id),
    'total_tool_uses', (
      SELECT COUNT(*) FROM tool_uses tu
      JOIN sessions s ON s.id = tu.session_id
      WHERE s.team_id = t.id
    ),
    'total_file_changes', (
      SELECT COUNT(*) FROM file_changes fc
      JOIN sessions s ON s.id = fc.session_id
      WHERE s.team_id = t.id
    ),
    'total_git_operations', (
      SELECT COUNT(*) FROM git_operations go
      JOIN sessions s ON s.id = go.session_id
      WHERE s.team_id = t.id
    ),
    'total_duration_minutes', (
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 60), 0)
      FROM sessions WHERE team_id = t.id
    ),
    'members', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', p.id,
          'email', p.email,
          'name', p.name,
          'role', tm.role,
          'joined', tm.created_at
        ) ORDER BY tm.created_at
      ), '[]'::json)
      FROM team_members tm
      JOIN profiles p ON p.id = tm.user_id
      WHERE tm.team_id = t.id
    )
  ) INTO result
  FROM teams t
  WHERE t.id = target_team_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
