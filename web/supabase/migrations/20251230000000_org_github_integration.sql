-- Organization-level GitHub App installations
CREATE TABLE org_github_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,  -- one per org
  installation_id BIGINT NOT NULL UNIQUE,  -- exclusive: one GitHub org per TokenScope org
  github_org_name TEXT NOT NULL,
  github_org_id BIGINT NOT NULL UNIQUE,    -- exclusive constraint
  connected_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add org_installation_id to tracked_repos for org repos
-- Either installation_id (personal) OR org_installation_id (org) will be set
ALTER TABLE tracked_repos
  ADD COLUMN org_installation_id UUID REFERENCES org_github_installations(id) ON DELETE CASCADE;

-- Make installation_id nullable since org repos won't have it
ALTER TABLE tracked_repos
  ALTER COLUMN installation_id DROP NOT NULL;

-- Add constraint: either installation_id or org_installation_id must be set (but not both)
ALTER TABLE tracked_repos
  ADD CONSTRAINT tracked_repos_installation_check
  CHECK (
    (installation_id IS NOT NULL AND org_installation_id IS NULL) OR
    (installation_id IS NULL AND org_installation_id IS NOT NULL)
  );

-- Indexes
CREATE INDEX idx_org_github_installations_org_id ON org_github_installations(org_id);
CREATE INDEX idx_tracked_repos_org_installation ON tracked_repos(org_installation_id);

-- Enable RLS
ALTER TABLE org_github_installations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_github_installations

-- Org members can view their org's GitHub installation
CREATE POLICY "Org members can view org github installation"
  ON org_github_installations FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Org owners/admins can create GitHub installations
CREATE POLICY "Org owners/admins can create org github installation"
  ON org_github_installations FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Org owners/admins can update GitHub installations
CREATE POLICY "Org owners/admins can update org github installation"
  ON org_github_installations FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Org owners/admins can delete GitHub installations
CREATE POLICY "Org owners/admins can delete org github installation"
  ON org_github_installations FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Update tracked_repos RLS to include org repos

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can view own repos" ON tracked_repos;
DROP POLICY IF EXISTS "Users can manage own repos" ON tracked_repos;

-- Users can view repos from their personal installations OR their org installations
CREATE POLICY "Users can view repos"
  ON tracked_repos FOR SELECT
  USING (
    -- Personal repos
    installation_id IN (
      SELECT id FROM github_installations WHERE user_id = auth.uid()
    )
    OR
    -- Org repos (any org member can view)
    org_installation_id IN (
      SELECT ogi.id FROM org_github_installations ogi
      JOIN organization_members om ON ogi.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Users can manage their personal repos, admins/owners can manage org repos
CREATE POLICY "Users can manage repos"
  ON tracked_repos FOR ALL
  USING (
    -- Personal repos
    installation_id IN (
      SELECT id FROM github_installations WHERE user_id = auth.uid()
    )
    OR
    -- Org repos (only admins/owners can manage)
    org_installation_id IN (
      SELECT ogi.id FROM org_github_installations ogi
      JOIN organization_members om ON ogi.org_id = om.org_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

-- Update repo_analysis RLS to include org repos
DROP POLICY IF EXISTS "Users can view own repo analysis" ON repo_analysis;

CREATE POLICY "Users can view repo analysis"
  ON repo_analysis FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      LEFT JOIN github_installations gi ON tr.installation_id = gi.id
      LEFT JOIN org_github_installations ogi ON tr.org_installation_id = ogi.id
      WHERE
        gi.user_id = auth.uid()
        OR ogi.org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    )
  );

-- Update repo_commits RLS to include org repos
DROP POLICY IF EXISTS "Users can view own repo commits" ON repo_commits;

CREATE POLICY "Users can view repo commits"
  ON repo_commits FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      LEFT JOIN github_installations gi ON tr.installation_id = gi.id
      LEFT JOIN org_github_installations ogi ON tr.org_installation_id = ogi.id
      WHERE
        gi.user_id = auth.uid()
        OR ogi.org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    )
  );

-- Update repo_analysis_history RLS to include org repos
DROP POLICY IF EXISTS "Users can view own repo history" ON repo_analysis_history;

CREATE POLICY "Users can view repo history"
  ON repo_analysis_history FOR SELECT
  USING (
    repo_id IN (
      SELECT tr.id FROM tracked_repos tr
      LEFT JOIN github_installations gi ON tr.installation_id = gi.id
      LEFT JOIN org_github_installations ogi ON tr.org_installation_id = ogi.id
      WHERE
        gi.user_id = auth.uid()
        OR ogi.org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    )
  );
