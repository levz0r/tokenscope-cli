import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Layers, Crown } from 'lucide-react'
import Link from 'next/link'
import { CreateTeamInOrgButton } from '@/components/org/CreateTeamInOrgButton'
import { TeamCardActions } from '@/components/org/TeamCardActions'

interface Team {
  id: string
  name: string
  created_at: string
  memberCount: number
  sessionCount: number
  hasAccess: boolean
  role: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrgTeams(orgId: string, userId: string, db: any) {
  // Check membership
  const { data: membership } = await db
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()

  if (!membership) return null

  // Get org name
  const { data: org } = await db
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  // Get teams
  const { data: teamsData } = await db
    .from('teams')
    .select('id, name, created_at')
    .eq('org_id', orgId)
    .order('name')

  const isOrgAdmin = membership.role === 'owner' || membership.role === 'admin'

  // Get user's team memberships
  const teamIds = (teamsData || []).map((t: { id: string }) => t.id)
  const { data: teamMemberships } = await db
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .in('team_id', teamIds)

  // Get counts for each team
  const teams: Team[] = await Promise.all(
    (teamsData || []).map(async (team: { id: string; name: string; created_at: string }) => {
      const teamMembership = teamMemberships?.find((m: { team_id: string }) => m.team_id === team.id)

      const { count: memberCount } = await db
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)

      const { count: sessionCount } = await db
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)

      return {
        ...team,
        memberCount: memberCount || 0,
        sessionCount: sessionCount || 0,
        hasAccess: isOrgAdmin || !!teamMembership,
        role: isOrgAdmin ? 'admin' : (teamMembership?.role || null),
      }
    })
  )

  return {
    orgName: org?.name || 'Organization',
    userRole: membership.role,
    teams,
  }
}

export default async function OrgTeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = await params
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const data = await getOrgTeams(orgId, user.id, db)

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
        <p className="text-gray-400">You don&apos;t have access to this organization.</p>
        <Link href="/org" className="mt-4">
          <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
            Back to Organizations
          </Button>
        </Link>
      </div>
    )
  }

  const { orgName, userRole, teams } = data
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/org/${orgId}`} className="text-gray-400 hover:text-white">
              {orgName}
            </Link>
            <span className="text-gray-600">/</span>
            <h1 className="text-2xl font-bold text-white">Teams</h1>
          </div>
          <p className="text-gray-400">Teams in this organization</p>
        </div>
        {isAdmin && <CreateTeamInOrgButton orgId={orgId} />}
      </div>

      {teams.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Teams Yet</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Create teams to organize your members and track analytics separately.
            </p>
            {isAdmin && <CreateTeamInOrgButton orgId={orgId} variant="large" />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className={`border-white/5 bg-white/[0.02] transition-colors ${
                team.hasAccess ? 'hover:border-white/10' : 'opacity-60'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-400" />
                    {team.name}
                  </CardTitle>
                  {team.role === 'owner' && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  )}
                </div>
                <CardDescription className="text-gray-400">
                  Created {new Date(team.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-[#0a0a0a] rounded-lg">
                    <div className="text-2xl font-bold text-white">{team.memberCount}</div>
                    <div className="text-xs text-gray-400">Members</div>
                  </div>
                  <div className="text-center p-3 bg-[#0a0a0a] rounded-lg">
                    <div className="text-2xl font-bold text-white">{team.sessionCount}</div>
                    <div className="text-xs text-gray-400">Sessions</div>
                  </div>
                </div>
                <TeamCardActions
                  teamId={team.id}
                  teamName={team.name}
                  hasAccess={team.hasAccess}
                  canManage={team.role === 'owner' || team.role === 'admin'}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
