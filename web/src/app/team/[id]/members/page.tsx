import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Users, Mail, Crown, Shield, User, Clock, Layers } from 'lucide-react'
import Link from 'next/link'
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

interface MemberRow {
  role: string
  created_at: string
  user_id: string
  profiles: { id: string; email: string; name: string | null } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTeamMembers(teamId: string, userId: string, db: any) {
  // Check user's membership in this team
  const { data: membership } = await db
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  // Also check if user is org admin (they can manage all teams in the org)
  const { data: team } = await db
    .from('teams')
    .select('id, name, org_id')
    .eq('id', teamId)
    .single()

  if (!team) {
    return { team: null, members: [], pendingInvites: [], userRole: null }
  }

  let userRole = membership?.role || null

  // If user isn't a team member, check org membership
  if (!userRole && team.org_id) {
    const { data: orgMembership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', team.org_id)
      .eq('user_id', userId)
      .single()

    if (orgMembership?.role === 'owner' || orgMembership?.role === 'admin') {
      userRole = 'admin' // Org admins have admin access to teams
    }
  }

  if (!userRole) {
    return { team: null, members: [], pendingInvites: [], userRole: null }
  }

  const canManage = userRole === 'owner' || userRole === 'admin'

  // Get all team members
  const { data: membersData } = await db
    .from('team_members')
    .select('role, created_at, user_id, profiles(id, email, name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  const teamMembers: TeamMember[] = ((membersData || []) as MemberRow[]).map(m => ({
    id: m.profiles?.id || m.user_id,
    email: m.profiles?.email || '',
    name: m.profiles?.name || null,
    role: m.role as 'owner' | 'admin' | 'member',
    joined: m.created_at,
  }))

  // Get pending invites if user can manage
  let pendingInvites: PendingInvite[] = []
  if (canManage) {
    const { data: invitesData } = await db
      .from('team_invites')
      .select('id, email, role, created_at, expires_at')
      .eq('team_id', teamId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    pendingInvites = (invitesData || []) as PendingInvite[]
  }

  return {
    team,
    members: teamMembers,
    pendingInvites,
    userRole: userRole as 'owner' | 'admin' | 'member',
  }
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

export default async function TeamMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const { team, members, pendingInvites, userRole } = await getTeamMembers(teamId, user.id, db)

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Layers className="h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
        <p className="text-gray-400 text-center max-w-md mb-6">
          You don&apos;t have access to manage this team&apos;s members.
        </p>
        <Link href="/team">
          <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
            Back to Teams
          </Button>
        </Link>
      </div>
    )
  }

  const canManage = userRole === 'owner' || userRole === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/team" className="text-gray-400 hover:text-white">
            Teams
          </Link>
          <span className="text-gray-600">/</span>
          <Link href={`/team/${teamId}`} className="text-gray-400 hover:text-white">
            {team.name}
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="text-2xl font-bold text-white">Members</h1>
        </div>
        <p className="text-gray-400">Manage {team.name} members</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{members.length}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Admins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {members.filter(m => m.role === 'admin' || m.role === 'owner').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Pending Invites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{pendingInvites.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Members</CardTitle>
          <CardDescription className="text-gray-400">
            People with access to {team.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-white/10 text-white">
                      {member.email?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">
                      {member.name || member.email?.split('@')[0] || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getRoleBadge(member.role)}
                  {canManage && member.role !== 'owner' && member.id !== user.id && (
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
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-white">Pending Invites</CardTitle>
            <CardDescription className="text-gray-400">
              Invitations waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-full">
                      <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{invite.email}</div>
                      <div className="text-xs text-gray-500">
                        Invited {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(invite.role)}
                    <span className="text-xs text-gray-500">
                      Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-white">Invite by Email</CardTitle>
            <CardDescription className="text-gray-400">
              Send an invite link to add new team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm teamId={team.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
