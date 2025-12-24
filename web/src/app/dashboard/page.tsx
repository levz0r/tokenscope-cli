import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToolUsageChart } from '@/components/analytics/ToolUsageChart'
import { RecentActivity } from '@/components/analytics/RecentActivity'
import { LiveSummaryCards } from '@/components/dashboard/LiveSummaryCards'

interface ToolUse { tool_name: string; success: boolean }
interface FileChange { lines_added: number; lines_removed: number }
interface Session { id: string; start_time: string; end_time: string | null; project_name: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAnalytics(supabase: any, userId: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get session count and IDs
  const [sessionsCountResult, sessionsData] = await Promise.all([
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('start_time', thirtyDaysAgo.toISOString()),
    supabase
      .from('sessions')
      .select('id, start_time, end_time, project_name')
      .eq('user_id', userId)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: false })
      .limit(1000),
  ])

  const sessions = sessionsData.data || []
  const sessionIds = sessions.map((s: { id: string }) => s.id)
  const totalSessions = sessionsCountResult.count || 0

  // If no sessions, return early with zeros
  if (sessionIds.length === 0) {
    return {
      totalSessions: 0,
      totalToolUses: 0,
      totalFileChanges: 0,
      totalGitOps: 0,
      linesAdded: 0,
      linesRemoved: 0,
      uniqueFiles: 0,
      toolBreakdown: {},
      recentSessions: [],
      mcpCalls: 0,
      successRate: 100,
    }
  }

  // Get all counts using Supabase's count feature (no 1000 row limit)
  const [toolUsesCount, fileChangesCount, gitOpsCount, mcpCallsCount] = await Promise.all([
    supabase
      .from('tool_uses')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .gte('timestamp', thirtyDaysAgo.toISOString()),
    supabase
      .from('file_changes')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .gte('timestamp', thirtyDaysAgo.toISOString()),
    supabase
      .from('git_operations')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .gte('timestamp', thirtyDaysAgo.toISOString()),
    supabase
      .from('tool_uses')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .like('tool_name', 'mcp__%'),
  ])

  // Get tool uses data for breakdown chart only (limited sample)
  const { data: toolUses } = await supabase
    .from('tool_uses')
    .select('tool_name, success')
    .in('session_id', sessionIds)
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .limit(5000)

  // Get file changes for line counts (aggregated would be better but Supabase doesn't support it well)
  const { data: fileChanges } = await supabase
    .from('file_changes')
    .select('file_path, lines_added, lines_removed')
    .in('session_id', sessionIds)
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .limit(5000)

  // Calculate stats
  const toolBreakdown = ((toolUses || []) as ToolUse[]).reduce((acc, t) => {
    acc[t.tool_name] = (acc[t.tool_name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const linesAdded = ((fileChanges || []) as FileChange[]).reduce((sum, f) => sum + (f.lines_added || 0), 0)
  const linesRemoved = ((fileChanges || []) as FileChange[]).reduce((sum, f) => sum + (f.lines_removed || 0), 0)
  const uniqueFiles = new Set(((fileChanges || []) as Array<{file_path: string}>).map(f => f.file_path)).size

  // Calculate success rate from sample data
  const successCount = ((toolUses || []) as ToolUse[]).filter(t => t.success).length
  const toolSampleSize = toolUses?.length || 0
  const successRate = toolSampleSize > 0 ? Math.round((successCount / toolSampleSize) * 100) : 100

  return {
    totalSessions,
    totalToolUses: toolUsesCount.count || 0,
    totalFileChanges: fileChangesCount.count || 0,
    totalGitOps: gitOpsCount.count || 0,
    linesAdded,
    linesRemoved,
    uniqueFiles,
    toolBreakdown,
    recentSessions: sessions.slice(0, 5),
    mcpCalls: mcpCallsCount.count || 0,
    successRate,
  }
}

function formatToolName(name: string): string {
  // MCP tools: mcp__plugin_linear_linear__list_issues -> Linear: list_issues
  if (name.startsWith('mcp__')) {
    const parts = name.split('__')
    if (parts.length >= 3) {
      const serverPart = parts[1] // e.g., "plugin_linear_linear"
      const toolPart = parts.slice(2).join('__') // e.g., "list_issues"
      // Extract readable server name
      const serverName = serverPart
        .replace('plugin_', '')
        .split('_')[0] // Take first part: "linear"
      const capitalizedServer = serverName.charAt(0).toUpperCase() + serverName.slice(1)
      return `${capitalizedServer}: ${toolPart}`
    }
  }
  return name
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const analytics = await getAnalytics(supabase, user.id)

  const toolData = Object.entries(analytics.toolBreakdown)
    .map(([name, count]) => ({ name: formatToolName(name), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Show top 10 tools

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500">Your AI coding analytics overview</p>
      </div>

      <LiveSummaryCards
        userId={user.id}
        initialData={{
          sessions: analytics.totalSessions,
          toolUses: analytics.totalToolUses,
          linesAdded: analytics.linesAdded,
          linesRemoved: analytics.linesRemoved,
          gitOps: analytics.totalGitOps,
          uniqueFiles: analytics.uniqueFiles,
          mcpCalls: analytics.mcpCalls,
          successRate: analytics.successRate,
        }}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-white">Tool Usage</CardTitle>
            <CardDescription className="text-gray-500">
              Distribution of tool calls over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ToolUsageChart data={toolData} />
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-white">Recent Sessions</CardTitle>
            <CardDescription className="text-gray-500">
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
