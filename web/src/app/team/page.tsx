import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Building2, Crown } from 'lucide-react'
import Link from 'next/link'
import { CreateTeamButton } from '@/components/team/CreateTeamButton'

interface Team {
  id: string
  name: string
  created_at: string
  role: string
  memberCount: number
  sessionCount: number
}

interface MembershipData {
  role: string
  team_id: string
}

interface TeamRow {
  id: string
  name: string
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTeamData(userId: string, db: any) {
  // Get user's team memberships
  const { data: membershipsData, error: membershipError } = await db
    .from('team_members')
    .select('role, team_id')
    .eq('user_id', userId)

  const memberships = (membershipsData || []) as MembershipData[]
  if (membershipError || !memberships.length) {
    return { teams: [], isOwner: false }
  }

  // Get teams with counts
  const teamIds = memberships.map(m => m.team_id)
  const { data: teamsData } = await db
    .from('teams')
    .select('id, name, created_at')
    .in('id', teamIds)

  const teams = (teamsData || []) as TeamRow[]
  if (!teams.length) {
    return { teams: [], isOwner: false }
  }

  // Get member counts for each team
  const teamsWithStats: Team[] = await Promise.all(
    teams.map(async (team) => {
      const membership = memberships.find(m => m.team_id === team.id)

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
        role: membership?.role || 'member',
        memberCount: memberCount || 0,
        sessionCount: sessionCount || 0,
      }
    })
  )

  return {
    teams: teamsWithStats,
    isOwner: memberships.some(m => m.role === 'owner'),
  }
}

export default async function TeamPage() {
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const { teams } = await getTeamData(user.id, db)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-gray-400">Manage your team and view aggregated analytics</p>
        </div>
        <CreateTeamButton />
      </div>

      {teams.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Team Yet</h3>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Create a team to share analytics with your colleagues and managers.
              Team members can view aggregated statistics across all members.
            </p>
            <CreateTeamButton variant="large" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-400" />
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
                <div className="flex gap-2">
                  <Link href={`/team/${team.id}`} className="flex-1">
                    <Button variant="outline" className="w-full border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                      View Dashboard
                    </Button>
                  </Link>
                  {(team.role === 'owner' || team.role === 'admin') && (
                    <Link href="/team/members">
                      <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                        <Users className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Team Features</CardTitle>
          <CardDescription className="text-gray-400">
            What you get with a team subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Team Analytics</h4>
                <p className="text-sm text-gray-400">
                  View aggregated stats across all team members
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Project Insights</h4>
                <p className="text-sm text-gray-400">
                  Track productivity across team projects
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Crown className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Admin Controls</h4>
                <p className="text-sm text-gray-400">
                  Manage members and permissions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
