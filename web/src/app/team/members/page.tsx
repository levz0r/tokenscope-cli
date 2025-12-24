import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, Plus, Mail, Crown, Shield, User, MoreVertical } from 'lucide-react'

async function getTeamMembers(userId: string) {
  const supabase = await createClient()

  // Get user's team where they are owner/admin
  const { data: membership } = await supabase
    .from('team_members')
    .select(`
      role,
      team_id,
      teams (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .single()

  if (!membership) {
    return { team: null, members: [], userRole: null }
  }

  const team = membership.teams as { id: string; name: string }

  // Get all members of this team
  const { data: members } = await supabase
    .from('team_members')
    .select(`
      role,
      created_at,
      profiles (
        id,
        email,
        name
      )
    `)
    .eq('team_id', team.id)
    .order('created_at', { ascending: true })

  return {
    team,
    members: members?.map(m => ({
      ...m.profiles,
      role: m.role,
      joined: m.created_at,
    })) || [],
    userRole: membership.role,
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { team, members, userRole } = await getTeamMembers(user.id)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Members</h1>
          <p className="text-slate-400">Manage {team.name} members</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
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
            <div className="text-2xl font-bold text-slate-400">0</div>
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
                  {userRole === 'owner' && member.role !== 'owner' && (
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Invite by Email</CardTitle>
          <CardDescription className="text-slate-400">
            Send an invite link to add new team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="colleague@company.com"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Mail className="mr-2 h-4 w-4" />
              Send Invite
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
