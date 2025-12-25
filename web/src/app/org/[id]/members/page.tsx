import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Building2, Crown, Shield, Clock } from 'lucide-react'
import Link from 'next/link'
import { InviteOrgMemberForm } from '@/components/org/InviteOrgMemberForm'
import { OrgMemberActions } from '@/components/org/OrgMemberActions'

interface OrgMember {
  id: string
  userId: string
  email: string
  name: string | null
  role: string
  createdAt: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
  profiles: { email: string; name: string | null } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrgMembers(orgId: string, userId: string, db: any) {
  // Check membership and role
  const { data: membership } = await db
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return null
  }

  // Get org name
  const { data: org } = await db
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  // Get members
  const { data: membersData } = await db
    .from('organization_members')
    .select(`
      id,
      role,
      created_at,
      user_id,
      profiles:user_id (id, email, name)
    `)
    .eq('org_id', orgId)
    .order('created_at')

  const members: OrgMember[] = (membersData || []).map((m: {
    id: string
    role: string
    created_at: string
    user_id: string
    profiles: { id: string; email: string; name: string | null }
  }) => ({
    id: m.id,
    userId: m.user_id,
    email: m.profiles?.email,
    name: m.profiles?.name,
    role: m.role,
    createdAt: m.created_at,
  }))

  // Get pending invites
  const { data: invites } = await db
    .from('organization_invites')
    .select('id, email, role, expires_at, created_at, profiles:invited_by(email, name)')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return {
    orgName: org?.name || 'Organization',
    userRole: membership.role,
    members,
    pendingInvites: (invites || []) as PendingInvite[],
  }
}

export default async function OrgMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = await params
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const data = await getOrgMembers(orgId, user.id, db)

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
        <p className="text-gray-400">Only org owners and admins can manage members.</p>
        <Link href="/org" className="mt-4">
          <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
            Back to Organizations
          </Button>
        </Link>
      </div>
    )
  }

  const { orgName, userRole, members, pendingInvites } = data
  const isOwner = userRole === 'owner'
  const adminCount = members.filter(m => m.role === 'owner' || m.role === 'admin').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/org/${orgId}`} className="text-gray-400 hover:text-white">
              {orgName}
            </Link>
            <span className="text-gray-600">/</span>
            <h1 className="text-2xl font-bold text-white">Members</h1>
          </div>
          <p className="text-gray-400">Manage organization members</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{members.length}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Admins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{adminCount}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Invites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{pendingInvites.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Form */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Invite Member</CardTitle>
          <CardDescription className="text-gray-400">
            Send an invite to add someone to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteOrgMemberForm orgId={orgId} />
        </CardContent>
      </Card>

      {/* Members List */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Members</CardTitle>
          <CardDescription className="text-gray-400">
            Current organization members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {(member.name || member.email)?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {member.name || member.email}
                      {member.userId === user.id && (
                        <span className="text-gray-500 ml-2">(you)</span>
                      )}
                    </p>
                    {member.name && (
                      <p className="text-sm text-gray-500">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    member.role === 'owner'
                      ? 'bg-amber-400/10 text-amber-400'
                      : member.role === 'admin'
                      ? 'bg-blue-400/10 text-blue-400'
                      : 'bg-gray-400/10 text-gray-400'
                  }`}>
                    {member.role === 'owner' && <Crown className="h-3 w-3" />}
                    {member.role === 'admin' && <Shield className="h-3 w-3" />}
                    {member.role}
                  </span>
                  {member.userId !== user.id && member.role !== 'owner' && (
                    <OrgMemberActions
                      memberId={member.id}
                      orgId={orgId}
                      currentRole={member.role}
                      isOwner={isOwner}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-white">Pending Invites</CardTitle>
            <CardDescription className="text-gray-400">
              Invites awaiting acceptance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg"
                >
                  <div>
                    <p className="font-medium text-white">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Invited as {invite.role} · Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-400">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
