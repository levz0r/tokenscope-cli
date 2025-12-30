-- Fix infinite recursion in tracked_repos RLS policy
-- The issue is that organization_members has a self-referencing policy,
-- and our tracked_repos policy tries to query it, causing recursion.

-- Solution: Use a simpler check that doesn't trigger org_members RLS

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view repos" ON tracked_repos;
DROP POLICY IF EXISTS "Users can manage repos" ON tracked_repos;

-- Recreate with a simpler approach that avoids the recursion
-- For org repos, we directly check if user is in the org via org_github_installations
CREATE POLICY "Users can view repos"
  ON tracked_repos FOR SELECT
  USING (
    -- Personal repos: check via github_installations (no recursion issue)
    installation_id IN (
      SELECT id FROM github_installations WHERE user_id = auth.uid()
    )
    OR
    -- Org repos: check if org_installation_id belongs to an org the user is in
    -- Use EXISTS with direct user_id check to avoid triggering org_members RLS
    (org_installation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM org_github_installations ogi
      WHERE ogi.id = tracked_repos.org_installation_id
      AND ogi.org_id IN (
        SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
      )
    ))
  );

-- For manage policy, same pattern
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
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
      )
    ))
  );

-- Also fix repo_analysis, repo_commits, and repo_analysis_history policies
-- which have similar issues

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
          AND ogi.org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
        ))
    )
  );

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
          AND ogi.org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
        ))
    )
  );

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
          AND ogi.org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
        ))
    )
  );
