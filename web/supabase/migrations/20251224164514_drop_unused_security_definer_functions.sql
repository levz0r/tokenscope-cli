-- Drop unused SECURITY DEFINER functions
-- These functions were replaced with TypeScript application logic using the service role client

-- Drop team management functions
DROP FUNCTION IF EXISTS create_team_with_owner(TEXT, UUID);
DROP FUNCTION IF EXISTS get_user_teams(UUID);
DROP FUNCTION IF EXISTS get_team_details(UUID, UUID);
DROP FUNCTION IF EXISTS delete_team(UUID, UUID);
DROP FUNCTION IF EXISTS get_team_members(UUID);

-- Drop analytics function
DROP FUNCTION IF EXISTS get_mcp_stats(UUID);
