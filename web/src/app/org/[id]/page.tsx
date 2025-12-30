import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Building2, Terminal, FileCode, GitCommit, Clock, FolderKanban, Crown, Shield } from 'lucide-react'
import Link from 'next/link'
import { DeleteOrgButton } from '@/components/org/DeleteOrgButton'
import { OrgGitHubConnect } from '@/components/org/OrgGitHubConnect'

interface OrgMember {
  id: string
  userId: string
  email: string
  name: string | null
  role: string
}

interface OrgDetails {
  id: string
  name: string
  slug: string | null
  created_at: string
  role: string
  memberCount: number
  teamCount: number
  sessionCount: number
  toolUsesCount: number
  fileChangesCount: number
  gitOpsCount: number
  totalHours: number
  members: OrgMember[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOrgDetails(orgId: string, userId: string, db: any): Promise<OrgDetails | null> {
  // Check membership
  const { data: membership } = await db
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single()

  if (!membership) return null

  // Get org
  const { data: org } = await db
    .from('organizations')
    .select('id, name, slug, created_at')
    .eq('id', orgId)
    .single()

  if (!org) return null

  // Get counts
  const { count: memberCount } = await db
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  const { count: teamCount } = await db
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  // Get team IDs for this org
  const { data: teams } = await db
    .from('teams')
    .select('id')
    .eq('org_id', orgId)

  const teamIds = (teams || []).map((t: { id: string }) => t.id)

  let sessionCount = 0
  let toolUsesCount = 0
  let fileChangesCount = 0
  let gitOpsCount = 0
  let totalMinutes = 0

  if (teamIds.length > 0) {
    // Get session stats
    const { data: sessions, count: sessionCountResult } = await db
      .from('sessions')
      .select('start_time, end_time', { count: 'exact' })
      .in('team_id', teamIds)
      .limit(1000)

    sessionCount = sessionCountResult || 0

    // Calculate total hours
    totalMinutes = (sessions || []).reduce((sum: number, s: { start_time: string; end_time: string | null }) => {
      const start = new Date(s.start_time)
      const end = s.end_time ? new Date(s.end_time) : new Date()
      return sum + (end.getTime() - start.getTime()) / 60000
    }, 0)

    // Get session IDs
    const { data: allSessions } = await db
      .from('sessions')
      .select('id')
      .in('team_id', teamIds)

    const sessionIds = (allSessions || []).map((s: { id: string }) => s.id)

    if (sessionIds.length > 0) {
      const { count: toolCount } = await db
        .from('tool_uses')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
      toolUsesCount = toolCount || 0

      const { count: fileCount } = await db
        .from('file_changes')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
      fileChangesCount = fileCount || 0

      const { count: gitCount } = await db
        .from('git_operations')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
      gitOpsCount = gitCount || 0
    }
  }

  // Get members
  const { data: membersData } = await db
    .from('organization_members')
    .select(`
      id,
      role,
      user_id,
      profiles:user_id (id, email, name)
    `)
    .eq('org_id', orgId)
    .order('created_at')
    .limit(10)

  const members = (membersData || []).map((m: {
    id: string
    role: string
    user_id: string
    profiles: { id: string; email: string; name: string | null }
  }) => ({
    id: m.id,
    userId: m.user_id,
    email: m.profiles?.email,
    name: m.profiles?.name,
    role: m.role,
  }))

  return {
    ...org,
    role: membership.role,
    memberCount: memberCount || 0,
    teamCount: teamCount || 0,
    sessionCount,
    toolUsesCount,
    fileChangesCount,
    gitOpsCount,
    totalHours: Math.round(totalMinutes / 60),
    members,
  }
}

export default async function OrgDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = await params
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const org = await getOrgDetails(orgId, user.id, db)

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Organization Not Found</h3>
        <p className="text-gray-400">You don&apos;t have access to this organization.</p>
        <Link href="/org" className="mt-4">
          <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
            Back to Organizations
          </Button>
        </Link>
      </div>
    )
  }

  const isOwner = org.role === 'owner'
  const isAdmin = org.role === 'admin' || isOwner

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            {org.role === 'owner' && (
              <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                <Crown className="h-3 w-3" />
                Owner
              </span>
            )}
            {org.role === 'admin' && (
              <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                <Shield className="h-3 w-3" />
                Admin
              </span>
            )}
          </div>
          <p className="text-gray-400">Organization dashboard</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/org/${org.id}/teams`}>
            <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
              <FolderKanban className="h-4 w-4 mr-2" />
              Teams
            </Button>
          </Link>
          {isAdmin && (
            <Link href={`/org/${org.id}/members`}>
              <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                <Users className="h-4 w-4 mr-2" />
                Members
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{org.memberCount}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{org.teamCount}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{org.sessionCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Tool Uses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{org.toolUsesCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <GitCommit className="h-4 w-4" />
              Git Ops
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{org.gitOpsCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">{org.totalHours.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* GitHub Integration */}
      <OrgGitHubConnect
        orgId={org.id}
        orgName={org.name}
        userRole={org.role as 'owner' | 'admin' | 'member'}
      />

      {/* Members Preview */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Members</CardTitle>
              <CardDescription className="text-gray-400">
                Organization members
              </CardDescription>
            </div>
            {isAdmin && (
              <Link href={`/org/${org.id}/members`}>
                <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                  Manage Members
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {org.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {(member.name || member.email)?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {member.name || member.email}
                    </p>
                    {member.name && (
                      <p className="text-xs text-gray-500">{member.email}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  member.role === 'owner'
                    ? 'bg-amber-400/10 text-amber-400'
                    : member.role === 'admin'
                    ? 'bg-blue-400/10 text-blue-400'
                    : 'bg-gray-400/10 text-gray-400'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
            <CardDescription className="text-gray-400">
              Irreversible actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteOrgButton orgId={org.id} orgName={org.name} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
