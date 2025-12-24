import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, Clock, GitCommit, FileCode, Terminal, AlertTriangle, Crown, Shield, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DeleteTeamButton } from '@/components/team/DeleteTeamButton'

interface TeamMember {
  id: string
  email: string
  name: string | null
  role: 'owner' | 'admin' | 'member'
  joined: string
}

interface TeamDetails {
  id: string
  name: string
  created_at: string
  user_role: 'owner' | 'admin' | 'member'
  member_count: number
  total_sessions: number
  total_tool_uses: number
  total_file_changes: number
  total_git_operations: number
  total_duration_minutes: number
  members: TeamMember[]
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return <Crown className="h-4 w-4 text-amber-400" />
    case 'admin':
      return <Shield className="h-4 w-4 text-blue-400" />
    default:
      return <User className="h-4 w-4 text-gray-400" />
  }
}

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    owner: 'bg-amber-400/10 text-amber-400',
    admin: 'bg-blue-400/10 text-blue-400',
    member: 'bg-gray-400/10 text-gray-400',
  }
  return (
    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${styles[role] || styles.member}`}>
      {getRoleIcon(role)}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

interface SessionData {
  id: string
  start_time: string
  end_time: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTeamDetails(
  teamId: string,
  userId: string,
  db: any
): Promise<TeamDetails | null> {
  // Check if user is a member of this team
  const { data: membership } = await db
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    return null // User is not a member
  }

  // Get team details
  const { data: team } = await db
    .from('teams')
    .select('id, name, created_at')
    .eq('id', teamId)
    .single()

  if (!team) {
    return null
  }

  // Get member count
  const { count: memberCount } = await db
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)

  // Get session stats
  const { data: sessionsData } = await db
    .from('sessions')
    .select('id, start_time, end_time')
    .eq('team_id', teamId)

  const sessions = (sessionsData || []) as SessionData[]
  const sessionIds = sessions.map(s => s.id)
  const totalDurationMinutes = sessions.reduce((sum, s) => {
    const start = new Date(s.start_time)
    const end = s.end_time ? new Date(s.end_time) : new Date()
    return sum + (end.getTime() - start.getTime()) / 60000
  }, 0)

  // Get tool uses count
  const { count: toolUsesCount } = sessionIds.length > 0
    ? await db
        .from('tool_uses')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
    : { count: 0 }

  // Get file changes count
  const { count: fileChangesCount } = sessionIds.length > 0
    ? await db
        .from('file_changes')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
    : { count: 0 }

  // Get git operations count
  const { count: gitOpsCount } = sessionIds.length > 0
    ? await db
        .from('git_operations')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
    : { count: 0 }

  // Get team members
  const { data: members } = await db
    .from('team_members')
    .select('role, created_at, user_id, profiles(id, email, name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  interface MemberRow {
    role: string
    created_at: string
    user_id: string
    profiles: { id: string; email: string; name: string | null } | null
  }
  const teamMembers: TeamMember[] = ((members || []) as MemberRow[]).map(m => ({
    id: m.profiles?.id || m.user_id,
    email: m.profiles?.email || '',
    name: m.profiles?.name || null,
    role: m.role as 'owner' | 'admin' | 'member',
    joined: m.created_at,
  }))

  return {
    id: team.id,
    name: team.name,
    created_at: team.created_at,
    user_role: membership.role as 'owner' | 'admin' | 'member',
    member_count: memberCount || 0,
    total_sessions: sessions.length,
    total_tool_uses: toolUsesCount || 0,
    total_file_changes: fileChangesCount || 0,
    total_git_operations: gitOpsCount || 0,
    total_duration_minutes: totalDurationMinutes,
    members: teamMembers,
  }
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const team = await getTeamDetails(id, user.id, db)

  if (!team) {
    notFound()
  }

  const stats = [
    { label: 'Members', value: team.member_count, icon: Users, color: 'text-blue-400' },
    { label: 'Sessions', value: team.total_sessions, icon: Terminal, color: 'text-emerald-400' },
    { label: 'Tool Uses', value: team.total_tool_uses.toLocaleString(), icon: FileCode, color: 'text-purple-400' },
    { label: 'File Changes', value: team.total_file_changes.toLocaleString(), icon: FileCode, color: 'text-orange-400' },
    { label: 'Git Operations', value: team.total_git_operations, icon: GitCommit, color: 'text-pink-400' },
    { label: 'Total Time', value: `${Math.round(team.total_duration_minutes / 60)}h`, icon: Clock, color: 'text-cyan-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/team">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{team.name}</h1>
          <p className="text-gray-400">Team dashboard and analytics</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-white/5 bg-white/[0.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Team Members</CardTitle>
          <CardDescription className="text-gray-400">
            People in this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {team.members && team.members.length > 0 ? (
            <div className="space-y-3">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-white/10 text-white text-sm">
                        {member.email?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white text-sm">
                        {member.name || member.email?.split('@')[0] || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </div>
                  </div>
                  {getRoleBadge(member.role)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No members yet</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-gray-400">
            Latest sessions from team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            Activity feed coming soon...
          </p>
        </CardContent>
      </Card>

      {team.user_role === 'owner' && (
        <Card className="border-red-900/50 bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-gray-400">
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-red-900/50 rounded-lg bg-[#0a0a0a]/50">
              <div>
                <h4 className="font-medium text-white">Delete this team</h4>
                <p className="text-sm text-gray-400">
                  Once you delete a team, there is no going back. All data will be permanently removed.
                </p>
              </div>
              <DeleteTeamButton teamId={team.id} teamName={team.name} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
