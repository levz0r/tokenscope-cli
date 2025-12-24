import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/components/analytics/SummaryCards'
import { ToolUsageChart } from '@/components/analytics/ToolUsageChart'
import { RecentActivity } from '@/components/analytics/RecentActivity'
import { Database } from '@/lib/supabase/types'

async function getAnalytics(supabase: SupabaseClient<Database>, userId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', thirtyDaysAgo.toISOString())
    .order('start_time', { ascending: false })

  // Get tool uses
  const { data: toolUses } = await supabase
    .from('tool_uses')
    .select('*, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('timestamp', thirtyDaysAgo.toISOString())

  // Get file changes
  const { data: fileChanges } = await supabase
    .from('file_changes')
    .select('*, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('timestamp', thirtyDaysAgo.toISOString())

  // Get git operations
  const { data: gitOps } = await supabase
    .from('git_operations')
    .select('*, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('timestamp', thirtyDaysAgo.toISOString())

  // Calculate stats
  const toolBreakdown = (toolUses || []).reduce((acc, t) => {
    acc[t.tool_name] = (acc[t.tool_name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const linesAdded = (fileChanges || []).reduce((sum, f) => sum + (f.lines_added || 0), 0)
  const linesRemoved = (fileChanges || []).reduce((sum, f) => sum + (f.lines_removed || 0), 0)
  const uniqueFiles = new Set((fileChanges || []).map(f => f.file_path)).size

  return {
    totalSessions: sessions?.length || 0,
    totalToolUses: toolUses?.length || 0,
    totalFileChanges: fileChanges?.length || 0,
    totalGitOps: gitOps?.length || 0,
    linesAdded,
    linesRemoved,
    uniqueFiles,
    toolBreakdown,
    recentSessions: sessions?.slice(0, 5) || [],
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const analytics = await getAnalytics(supabase, user.id)

  const toolData = Object.entries(analytics.toolBreakdown)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Your Claude Code analytics overview</p>
      </div>

      <SummaryCards
        sessions={analytics.totalSessions}
        toolUses={analytics.totalToolUses}
        linesAdded={analytics.linesAdded}
        linesRemoved={analytics.linesRemoved}
        gitOps={analytics.totalGitOps}
        uniqueFiles={analytics.uniqueFiles}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Tool Usage</CardTitle>
            <CardDescription className="text-slate-400">
              Distribution of tool calls over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ToolUsageChart data={toolData} />
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Recent Sessions</CardTitle>
            <CardDescription className="text-slate-400">
              Your latest coding sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity sessions={analytics.recentSessions} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
