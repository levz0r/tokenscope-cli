-- SECURITY DEFINER functions for Claude Code Analytics
-- These functions bypass RLS but validate permissions internally

-- ============================================
-- 1. CREATE TEAM WITH OWNER
-- ============================================
CREATE OR REPLACE FUNCTION create_team_with_owner(
  team_name TEXT,
  owner_id UUID
)
RETURNS JSON AS $$
DECLARE
  new_team_id UUID;
  result JSON;
BEGIN
  IF team_name IS NULL OR trim(team_name) = '' THEN
    RAISE EXCEPTION 'Team name is required';
  END IF;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner ID is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = owner_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO teams (name)
  VALUES (trim(team_name))
  RETURNING id INTO new_team_id;

  INSERT INTO team_members (team_id, user_id, role)
  VALUES (new_team_id, owner_id, 'owner');

  SELECT json_build_object(
    'id', t.id,
    'name', t.name,
    'created_at', t.created_at
  ) INTO result
  FROM teams t
  WHERE t.id = new_team_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_team_with_owner TO authenticated;

-- ============================================
-- 2. GET USER'S TEAMS WITH STATS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_teams(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF target_user_id IS NULL THEN
    RETURN json_build_object('teams', '[]'::json, 'isOwner', false);
  END IF;

  SELECT json_build_object(
    'teams', COALESCE((
      SELECT json_agg(team_data)
      FROM (
        SELECT
          t.id,
          t.name,
          t.created_at,
          tm.role,
          (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as "memberCount",
          (SELECT COUNT(*) FROM sessions WHERE team_id = t.id) as "sessionCount"
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = target_user_id
        ORDER BY t.created_at DESC
      ) team_data
    ), '[]'::json),
    'isOwner', EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = target_user_id AND role = 'owner'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_teams TO authenticated;

-- ============================================
-- 3. GET TEAM DETAILS WITH STATS
-- ============================================
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
    )
  ) INTO result
  FROM teams t
  WHERE t.id = target_team_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_team_details TO authenticated;

-- ============================================
-- 4. DELETE TEAM (OWNERS ONLY)
-- ============================================
CREATE OR REPLACE FUNCTION delete_team(
  target_team_id UUID,
  requesting_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if user is owner of this team
  SELECT role INTO user_role
  FROM team_members
  WHERE team_id = target_team_id AND user_id = requesting_user_id;

  IF user_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are not a member of this team');
  END IF;

  IF user_role != 'owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only team owners can delete teams');
  END IF;

  -- Delete the team (cascades to team_members, sessions will have team_id set to NULL)
  DELETE FROM teams WHERE id = target_team_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_team TO authenticated;
