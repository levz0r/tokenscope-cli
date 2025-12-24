import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GitTable } from '@/components/analytics/GitTable'
import { GitBranch, GitCommit, GitMerge, GitPullRequest } from 'lucide-react'

interface GitOp {
  id: string
  operation_type: string
  command: string | null
  timestamp: string
  exit_code: number
  sessions?: { project_name: string | null }
}

async function getGitStats(userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data: gitOpsData } = await supabase
    .from('git_operations')
    .select('*, sessions!inner(user_id, project_name)')
    .eq('sessions.user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(100)

  const gitOps = (gitOpsData || []) as GitOp[]
  if (gitOps.length === 0) return { operations: [], stats: { commits: 0, pushes: 0, pulls: 0, branches: 0, merges: 0, other: 0 } }

  // Count by operation type - check both operation_type and command
  const stats = {
    commits: 0,
    pushes: 0,
    pulls: 0,
    branches: 0,
    merges: 0,
    other: 0,
  }

  for (const op of gitOps) {
    const type = (op.operation_type || '').toLowerCase()

    // Match exact operation types from the hook
    switch (type) {
      case 'commit':
        stats.commits++
        break
      case 'push':
      case 'pr-create':
        stats.pushes++
        break
      case 'pull':
        stats.pulls++
        break
      case 'checkout':
      case 'branch':
        stats.branches++
        break
      case 'merge':
      case 'pr-merge':
        stats.merges++
        break
      default:
        // status, diff, log, add, reset, stash, rebase, etc.
        stats.other++
    }
  }

  return {
    operations: gitOps.map(op => ({
      ...op,
      project_name: op.sessions?.project_name ?? null,
    })),
    stats,
  }
}

export default async function GitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { operations, stats } = await getGitStats(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Git Operations</h1>
        <p className="text-gray-400">Your version control activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <GitCommit className="h-4 w-4" />
              Commits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.commits}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <GitPullRequest className="h-4 w-4" />
              Pushes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.pushes}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Branches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{stats.branches}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Merges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{stats.merges}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Other
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{stats.other}</div>
            <p className="text-xs text-gray-500">add, diff, status, etc.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Recent Git Operations</CardTitle>
          <CardDescription className="text-gray-400">
            Your version control activity history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GitTable operations={operations} />
        </CardContent>
      </Card>
    </div>
  )
}
