import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus, Building2, Crown } from 'lucide-react'
import Link from 'next/link'

async function getTeamData(userId: string) {
  const supabase = await createClient()

  // Get user's team memberships
  const { data: memberships } = await supabase
    .from('team_members')
    .select(`
      role,
      teams (
        id,
        name,
        created_at
      )
    `)
    .eq('user_id', userId)

  if (!memberships || memberships.length === 0) {
    return { teams: [], isOwner: false }
  }

  // Get team member counts and stats
  const teams = await Promise.all(
    memberships.map(async (m) => {
      const team = m.teams as { id: string; name: string; created_at: string }

      // Get member count
      const { count: memberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)

      // Get team sessions count
      const { count: sessionCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)

      return {
        ...team,
        role: m.role,
        memberCount: memberCount || 0,
        sessionCount: sessionCount || 0,
      }
    })
  )

  return {
    teams,
    isOwner: memberships.some(m => m.role === 'owner'),
  }
}

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { teams, isOwner } = await getTeamData(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-slate-400">Manage your team and view aggregated analytics</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Team Yet</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              Create a team to share analytics with your colleagues and managers.
              Team members can view aggregated statistics across all members.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="border-slate-700 bg-slate-800/50 hover:border-slate-600 transition-colors">
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
                <CardDescription className="text-slate-400">
                  Created {new Date(team.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold text-white">{team.memberCount}</div>
                    <div className="text-xs text-slate-400">Members</div>
                  </div>
                  <div className="text-center p-3 bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold text-white">{team.sessionCount}</div>
                    <div className="text-xs text-slate-400">Sessions</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/team/${team.id}`} className="flex-1">
                    <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                      View Dashboard
                    </Button>
                  </Link>
                  {(team.role === 'owner' || team.role === 'admin') && (
                    <Link href="/team/members">
                      <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
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

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Team Features</CardTitle>
          <CardDescription className="text-slate-400">
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
                <p className="text-sm text-slate-400">
                  View aggregated stats across all team members
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Project Insights</h4>
                <p className="text-sm text-slate-400">
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
                <p className="text-sm text-slate-400">
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
