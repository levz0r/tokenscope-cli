-- Get team members for management page
-- Only returns data if user is owner/admin of a team

CREATE OR REPLACE FUNCTION get_team_members(requesting_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  user_team_id UUID;
  user_role TEXT;
  team_name TEXT;
BEGIN
  -- Get user's first team where they are owner/admin
  SELECT tm.team_id, tm.role, t.name
  INTO user_team_id, user_role, team_name
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.user_id = requesting_user_id
    AND tm.role IN ('owner', 'admin')
  LIMIT 1;

  -- If user is not owner/admin of any team, return null
  IF user_team_id IS NULL THEN
    RETURN json_build_object('team', null, 'members', '[]'::json, 'userRole', null);
  END IF;

  -- Get all members of this team
  SELECT json_build_object(
    'team', json_build_object('id', user_team_id, 'name', team_name),
    'userRole', user_role,
    'members', COALESCE((
      SELECT json_agg(member_data ORDER BY member_data.joined)
      FROM (
        SELECT
          p.id,
          p.email,
          p.name,
          tm.role,
          tm.created_at as joined
        FROM team_members tm
        JOIN profiles p ON p.id = tm.user_id
        WHERE tm.team_id = user_team_id
      ) member_data
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_team_members TO authenticated;
