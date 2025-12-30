-- Fix infinite recursion in organization_members RLS policy
-- The problem is that organization_members has a self-referencing SELECT policy:
-- "org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())"
-- This causes infinite recursion when any other policy tries to check org membership.

-- Solution: Create a security definer function to get user's org_ids without RLS

-- Create a function that returns the org_ids a user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM organization_members WHERE user_id = user_uuid;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_org_ids(UUID) TO authenticated;

-- Now fix the organization_members policy to use direct user_id check
-- instead of self-referencing subquery
DROP POLICY IF EXISTS "Users can view members of their orgs" ON organization_members;

CREATE POLICY "Users can view members of their orgs"
  ON organization_members FOR SELECT
  USING (
    -- User can always see their own membership records
    user_id = auth.uid()
    OR
    -- User can see other members of orgs they belong to (using security definer function)
    org_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- Now update tracked_repos policies to use the function
DROP POLICY IF EXISTS "Users can view repos" ON tracked_repos;
DROP POLICY IF EXISTS "Users can manage repos" ON tracked_repos;

CREATE POLICY "Users can view repos"
  ON tracked_repos FOR SELECT
  USING (
    -- Personal repos
    installation_id IN (
      SELECT id FROM github_installations WHERE user_id = auth.uid()
    )
    OR
    -- Org repos: check if user is in the org that owns this installation
    (org_installation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_github_installations ogi
      WHERE ogi.id = tracked_repos.org_installation_id
      AND ogi.org_id IN (SELECT get_user_org_ids(auth.uid()))
    ))
  );

CREATE POLICY "Users can manage repos"
  ON tracked_repos FOR ALL
  USING (
    -- Personal repos
    installation_id IN (
      SELECT id FROM github_installations WHERE user_id = auth.uid()
    )
    OR
    -- Org repos (only admins/owners can manage)
    (org_installation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_github_installations ogi
      WHERE ogi.id = tracked_repos.org_installation_id
      AND ogi.org_id IN (
        SELECT org_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    ))
  );

-- Update repo_analysis policies
DROP POLICY IF EXISTS "Users can view repo analysis" ON repo_analysis;
CREATE POLICY "Users can view repo analysis"
  ON repo_analysis FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      WHERE
        tr.installation_id IN (SELECT id FROM github_installations WHERE user_id = auth.uid())
        OR (tr.org_installation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM org_github_installations ogi
          WHERE ogi.id = tr.org_installation_id
          AND ogi.org_id IN (SELECT get_user_org_ids(auth.uid()))
        ))
    )
  );

-- Update repo_commits policies
DROP POLICY IF EXISTS "Users can view repo commits" ON repo_commits;
CREATE POLICY "Users can view repo commits"
  ON repo_commits FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      WHERE
        tr.installation_id IN (SELECT id FROM github_installations WHERE user_id = auth.uid())
        OR (tr.org_installation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM org_github_installations ogi
          WHERE ogi.id = tr.org_installation_id
          AND ogi.org_id IN (SELECT get_user_org_ids(auth.uid()))
        ))
    )
  );

-- Update repo_analysis_history policies
DROP POLICY IF EXISTS "Users can view repo history" ON repo_analysis_history;
CREATE POLICY "Users can view repo history"
  ON repo_analysis_history FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      WHERE
        tr.installation_id IN (SELECT id FROM github_installations WHERE user_id = auth.uid())
        OR (tr.org_installation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM org_github_installations ogi
          WHERE ogi.id = tr.org_installation_id
          AND ogi.org_id IN (SELECT get_user_org_ids(auth.uid()))
        ))
    )
  );
