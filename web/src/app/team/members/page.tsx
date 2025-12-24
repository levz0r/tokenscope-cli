import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, Mail, Crown, Shield, User, Clock } from 'lucide-react'
import { InviteMemberForm } from '@/components/team/InviteMemberForm'
import { MemberActions } from '@/components/team/MemberActions'
import { formatDistanceToNow } from 'date-fns'

interface TeamMember {
  id: string
  email: string
  name: string | null
  role: 'owner' | 'admin' | 'member'
  joined: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

interface TeamData {
  team: { id: string; name: string } | null
  members: TeamMember[]
  pendingInvites: PendingInvite[]
  userRole: 'owner' | 'admin' | 'member' | null
}

interface MembershipData {
  team_id: string
  role: string
}

interface MemberRow {
  role: string
  created_at: string
  user_id: string
  profiles: { id: string; email: string; name: string | null } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTeamMembers(
  userId: string,
  db: any
): Promise<TeamData> {
  // Get user's team membership where they have admin/owner rights
  const { data: membershipData } = await db
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  const membership = membershipData as MembershipData | null
  if (!membership) {
    return { team: null, members: [], pendingInvites: [], userRole: null }
  }

  // Get team details
  const { data: team } = await db
    .from('teams')
    .select('id, name')
    .eq('id', membership.team_id)
    .single()

  if (!team) {
    return { team: null, members: [], pendingInvites: [], userRole: null }
  }

  // Get all team members
  const { data: membersData } = await db
    .from('team_members')
    .select('role, created_at, user_id, profiles(id, email, name)')
    .eq('team_id', team.id)
    .order('created_at', { ascending: true })

  const teamMembers: TeamMember[] = ((membersData || []) as MemberRow[]).map(m => ({
    id: m.profiles?.id || m.user_id,
    email: m.profiles?.email || '',
    name: m.profiles?.name || null,
    role: m.role as 'owner' | 'admin' | 'member',
    joined: m.created_at,
  }))

  // Get pending invites
  const { data: invitesData } = await db
    .from('team_invites')
    .select('id, email, role, created_at, expires_at')
    .eq('team_id', team.id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const pendingInvites = (invitesData || []) as PendingInvite[]

  return {
    team,
    members: teamMembers,
    pendingInvites,
    userRole: membership.role as 'owner' | 'admin' | 'member',
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return <Crown className="h-4 w-4 text-amber-400" />
    case 'admin':
      return <Shield className="h-4 w-4 text-blue-400" />
    default:
      return <User className="h-4 w-4 text-slate-400" />
  }
}

function getRoleBadge(role: string) {
  const styles: Record<string, string> = {
    owner: 'bg-amber-400/10 text-amber-400',
    admin: 'bg-blue-400/10 text-blue-400',
    member: 'bg-slate-400/10 text-slate-400',
  }

  return (
    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${styles[role] || styles.member}`}>
      {getRoleIcon(role)}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

export default async function TeamMembersPage() {
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const { team, members, pendingInvites, userRole } = await getTeamMembers(user.id, db)

  if (!team) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Members</h1>
          <p className="text-slate-400">Manage your team</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Team Access</h3>
            <p className="text-slate-400 text-center max-w-md">
              You need to be an owner or admin of a team to manage members.
              Create a team first or ask your team owner for admin access.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Team Members</h1>
        <p className="text-slate-400">Manage {team.name} members</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total Members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{members.length}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Admins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {members.filter(m => m.role === 'admin' || m.role === 'owner').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Pending Invites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{pendingInvites.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Members</CardTitle>
          <CardDescription className="text-slate-400">
            People with access to {team.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-slate-900 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-slate-700 text-white">
                      {member.email?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">
                      {member.name || member.email?.split('@')[0] || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-400">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getRoleBadge(member.role)}
                  {userRole && member.role !== 'owner' && member.id !== user.id && (
                    <MemberActions
                      memberId={member.id}
                      memberRole={member.role as 'admin' | 'member'}
                      teamId={team.id}
                      currentUserRole={userRole as 'owner' | 'admin'}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pendingInvites.length > 0 && (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Pending Invites</CardTitle>
            <CardDescription className="text-slate-400">
              Invitations waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-full">
                      <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{invite.email}</div>
                      <div className="text-xs text-slate-500">
                        Invited {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(invite.role)}
                    <span className="text-xs text-slate-500">
                      Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Invite by Email</CardTitle>
          <CardDescription className="text-slate-400">
            Send an invite link to add new team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteMemberForm teamId={team.id} />
        </CardContent>
      </Card>
    </div>
  )
}
