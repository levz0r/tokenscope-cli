-- Fix RLS infinite recursion in team_members policies
-- Run this in the Supabase SQL Editor

-- Step 1: Create a SECURITY DEFINER function to get user's team IDs
-- This bypasses RLS, breaking the recursion
CREATE OR REPLACE FUNCTION get_user_team_ids(check_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT team_id FROM team_members WHERE user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop the problematic policies
DROP POLICY IF EXISTS "Users can view team memberships" ON team_members;
DROP POLICY IF EXISTS "Team admins can manage members" ON team_members;
DROP POLICY IF EXISTS "Team members can view team sessions" ON sessions;
DROP POLICY IF EXISTS "Team members can view team tool uses" ON tool_uses;
DROP POLICY IF EXISTS "Team members can view team file changes" ON file_changes;
DROP POLICY IF EXISTS "Team members can view team git operations" ON git_operations;
DROP POLICY IF EXISTS "Team members can view teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update teams" ON teams;
DROP POLICY IF EXISTS "Team members can view subscription" ON subscriptions;
DROP POLICY IF EXISTS "Team owners can manage subscription" ON subscriptions;

-- Step 3: Recreate policies using the helper function

-- Team members: users can see their own memberships + memberships of teams they're in
CREATE POLICY "Users can view own team memberships" ON team_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view team memberships of their teams" ON team_members
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team admins can manage members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

-- Teams: use the helper function
CREATE POLICY "Team members can view teams" ON teams
  FOR SELECT USING (id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team owners can update teams" ON teams
  FOR UPDATE USING (
    id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
    )
  );

-- Sessions: team access via helper function
CREATE POLICY "Team members can view team sessions" ON sessions
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

-- Tool uses: team access via helper function
CREATE POLICY "Team members can view team tool uses" ON tool_uses
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
    )
  );

-- File changes: team access via helper function
CREATE POLICY "Team members can view team file changes" ON file_changes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
    )
  );

-- Git operations: team access via helper function
CREATE POLICY "Team members can view team git operations" ON git_operations
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
    )
  );

-- Subscriptions: team access via helper function
CREATE POLICY "Team members can view subscription" ON subscriptions
  FOR SELECT USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team owners can manage subscription" ON subscriptions
  FOR ALL USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'owner'
    )
  );
