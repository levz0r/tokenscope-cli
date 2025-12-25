import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Crown } from 'lucide-react'
import { CreateOrgButton } from '@/components/org/CreateOrgButton'
import { OrgCardActions } from '@/components/org/OrgCardActions'

interface Organization {
  id: string
  name: string
  slug: string | null
  created_at: string
  role: string
  memberCount: number
  teamCount: number
}

interface MembershipData {
  role: string
  org_id: string
}

interface OrgRow {
  id: string
  name: string
  slug: string | null
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrgData(userId: string, db: any) {
  // Get user's org memberships
  const { data: membershipsData, error: membershipError } = await db
    .from('organization_members')
    .select('role, org_id')
    .eq('user_id', userId)

  const memberships = (membershipsData || []) as MembershipData[]
  if (membershipError || !memberships.length) {
    return { organizations: [] }
  }

  // Get organizations with counts
  const orgIds = memberships.map(m => m.org_id)
  const { data: orgsData } = await db
    .from('organizations')
    .select('id, name, slug, created_at')
    .in('id', orgIds)

  const orgs = (orgsData || []) as OrgRow[]
  if (!orgs.length) {
    return { organizations: [] }
  }

  // Get member and team counts for each org
  const orgsWithStats: Organization[] = await Promise.all(
    orgs.map(async (org) => {
      const membership = memberships.find(m => m.org_id === org.id)

      const { count: memberCount } = await db
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)

      const { count: teamCount } = await db
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)

      return {
        ...org,
        role: membership?.role || 'member',
        memberCount: memberCount || 0,
        teamCount: teamCount || 0,
      }
    })
  )

  return { organizations: orgsWithStats }
}

export default async function OrgPage() {
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const { organizations } = await getOrgData(user.id, db)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="text-gray-400">Manage your organizations and teams</p>
        </div>
        <CreateOrgButton />
      </div>

      {organizations.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Organizations Yet</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Create an organization to manage multiple teams and share analytics
              with your colleagues.
            </p>
            <CreateOrgButton variant="large" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id} className="border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-400" />
                    {org.name}
                  </CardTitle>
                  {org.role === 'owner' && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  )}
                  {org.role === 'admin' && (
                    <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <CardDescription className="text-gray-400">
                  Created {new Date(org.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-[#0a0a0a] rounded-lg">
                    <div className="text-2xl font-bold text-white">{org.memberCount}</div>
                    <div className="text-xs text-gray-400">Members</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] rounded-lg">
                    <div className="text-2xl font-bold text-white">{org.teamCount}</div>
                    <div className="text-xs text-gray-400">Teams</div>
                  </div>
                </div>
                <OrgCardActions
                  orgId={org.id}
                  canManageMembers={org.role === 'owner' || org.role === 'admin'}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Organization Features</CardTitle>
          <CardDescription className="text-gray-400">
            What you get with organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Multi-Team Management</h4>
                <p className="text-sm text-gray-400">
                  Organize multiple teams under one org
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Org-Wide Access</h4>
                <p className="text-sm text-gray-400">
                  Org admins can access all teams
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Crown className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Centralized Billing</h4>
                <p className="text-sm text-gray-400">
                  One subscription for all teams
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
