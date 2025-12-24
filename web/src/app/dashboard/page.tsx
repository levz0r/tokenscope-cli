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
  const toolBreakdown = ((toolUses || []) as ToolUse[]).reduce((acc, t) => {
    acc[t.tool_name] = (acc[t.tool_name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const linesAdded = ((fileChanges || []) as FileChange[]).reduce((sum, f) => sum + (f.lines_added || 0), 0)
  const linesRemoved = ((fileChanges || []) as FileChange[]).reduce((sum, f) => sum + (f.lines_removed || 0), 0)
  const uniqueFiles = new Set(((fileChanges || []) as Array<{file_path: string}>).map(f => f.file_path)).size

  // Count MCP calls
  const mcpCalls = ((toolUses || []) as ToolUse[]).filter(t => t.tool_name.startsWith('mcp__')).length

  // Calculate success rate
  const successCount = ((toolUses || []) as ToolUse[]).filter(t => t.success).length
  const successRate = toolUses?.length > 0 ? Math.round((successCount / toolUses.length) * 100) : 100

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
    mcpCalls,
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
        <p className="text-gray-500">Your Claude Code analytics overview</p>
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
