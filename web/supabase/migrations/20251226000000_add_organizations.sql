-- Add organizations layer above teams

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- 3. Create organization_invites table
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES profiles(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- 4. Add org_id to teams table (nullable initially for migration)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_org_id ON organization_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON teams(org_id);

-- 6. Migrate existing teams: create an org for each team
-- For each team, create an organization with the same name
-- and make the team owner the org owner
DO $$
DECLARE
  team_record RECORD;
  new_org_id UUID;
  owner_id UUID;
BEGIN
  FOR team_record IN SELECT id, name FROM teams WHERE org_id IS NULL
  LOOP
    -- Create organization with same name as team
    INSERT INTO organizations (name)
    VALUES (team_record.name)
    RETURNING id INTO new_org_id;

    -- Find the team owner
    SELECT user_id INTO owner_id
    FROM team_members
    WHERE team_id = team_record.id AND role = 'owner'
    LIMIT 1;

    -- Add team owner as org owner
    IF owner_id IS NOT NULL THEN
      INSERT INTO organization_members (org_id, user_id, role)
      VALUES (new_org_id, owner_id, 'owner')
      ON CONFLICT (org_id, user_id) DO NOTHING;
    END IF;

    -- Link team to organization
    UPDATE teams SET org_id = new_org_id WHERE id = team_record.id;
  END LOOP;
END $$;

-- 7. Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for organizations
CREATE POLICY "Users can view orgs they are members of"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org owners can update their orgs"
  ON organizations FOR UPDATE
  USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Org owners can delete their orgs"
  ON organizations FOR DELETE
  USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Authenticated users can create orgs"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 9. RLS Policies for organization_members
CREATE POLICY "Users can view members of their orgs"
  ON organization_members FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org owners/admins can add members"
  ON organization_members FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Org owners can update member roles"
  ON organization_members FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Org owners/admins can remove members"
  ON organization_members FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- 10. RLS Policies for organization_invites
CREATE POLICY "Org owners/admins can view invites"
  ON organization_invites FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Org owners/admins can create invites"
  ON organization_invites FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Org owners/admins can delete invites"
  ON organization_invites FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Anyone can view invite by token for acceptance"
  ON organization_invites FOR SELECT
  USING (token IS NOT NULL);
