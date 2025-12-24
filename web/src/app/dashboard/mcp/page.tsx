import { getServerAuth, createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plug, Zap, Server, PieChart, TrendingUp } from 'lucide-react'

interface MCPStats {
  total_mcp_calls: number
  servers: Array<{ server_name: string; count: number }>
  top_tools: Array<{
    tool_name: string
    short_name: string
    server: string
    count: number
    success_count: number
  }>
  daily_usage: Array<{ date: string; count: number }>
  mcp_vs_native: { mcp: number; native: number }
}

interface ToolUse {
  tool_name: string
  success: boolean
  timestamp: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getMCPStats(
  userId: string,
  db: any
): Promise<MCPStats | null> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get all tool uses for this user
  const { data: toolUsesData } = await db
    .from('tool_uses')
    .select('tool_name, success, timestamp, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('timestamp', thirtyDaysAgo.toISOString())

  const toolUses = (toolUsesData || []) as ToolUse[]
  if (toolUses.length === 0) {
    return null
  }

  // Filter MCP tools (those starting with mcp__)
  const mcpTools = toolUses.filter(t => t.tool_name.startsWith('mcp__'))
  const nativeTools = toolUses.filter(t => !t.tool_name.startsWith('mcp__'))

  if (mcpTools.length === 0) {
    return null
  }

  // Parse MCP tool names: mcp__server_name__tool_name
  const parseToolName = (fullName: string) => {
    const parts = fullName.split('__')
    if (parts.length >= 3) {
      const server = parts[1]
      const tool = parts.slice(2).join('__')
      return { server, tool, shortName: tool }
    }
    return { server: 'unknown', tool: fullName, shortName: fullName }
  }

  // Aggregate by server
  const serverMap = new Map<string, number>()
  const toolMap = new Map<string, { count: number; successCount: number; server: string; shortName: string }>()
  const dailyMap = new Map<string, number>()

  for (const t of mcpTools) {
    const { server, tool, shortName } = parseToolName(t.tool_name)

    // Server counts
    serverMap.set(server, (serverMap.get(server) || 0) + 1)

    // Tool counts
    const existing = toolMap.get(t.tool_name) || { count: 0, successCount: 0, server, shortName }
    existing.count++
    if (t.success) existing.successCount++
    toolMap.set(t.tool_name, existing)

    // Daily counts
    const date = t.timestamp.split('T')[0]
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
  }

  // Convert to arrays
  const servers = Array.from(serverMap.entries())
    .map(([server_name, count]) => ({ server_name, count }))
    .sort((a, b) => b.count - a.count)

  const top_tools = Array.from(toolMap.entries())
    .map(([tool_name, data]) => ({
      tool_name,
      short_name: data.shortName,
      server: data.server,
      count: data.count,
      success_count: data.successCount,
    }))
    .sort((a, b) => b.count - a.count)

  // Create daily usage array for last 30 days
  const daily_usage: Array<{ date: string; count: number }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    daily_usage.push({
      date: dateStr,
      count: dailyMap.get(dateStr) || 0,
    })
  }

  return {
    total_mcp_calls: mcpTools.length,
    servers,
    top_tools,
    daily_usage,
    mcp_vs_native: {
      mcp: mcpTools.length,
      native: nativeTools.length,
    },
  }
}

function getServerDisplayName(serverName: string): string {
  const names: Record<string, string> = {
    'plugin_linear_linear': 'Linear',
    'plugin_context7_context7': 'Context7',
    'plugin_playwright_playwright': 'Playwright',
    'plugin_supabase_supabase': 'Supabase',
  }
  return names[serverName] || serverName.replace(/_/g, ' ').replace(/plugin /i, '')
}

function getServerColor(index: number): string {
  const colors = ['text-blue-400', 'text-green-400', 'text-purple-400', 'text-orange-400', 'text-pink-400', 'text-cyan-400']
  return colors[index % colors.length]
}

export default async function MCPPage() {
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const stats = await getMCPStats(user.id, db)

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">MCP Usage</h1>
          <p className="text-slate-400">Model Context Protocol integrations</p>
        </div>
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plug className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No MCP Data Yet</h3>
            <p className="text-slate-400 text-center max-w-md">
              MCP tool usage will appear here once you start using MCP integrations
              like Linear, Context7, Playwright, and more.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const mcpPercentage = stats.mcp_vs_native.mcp + stats.mcp_vs_native.native > 0
    ? Math.round((stats.mcp_vs_native.mcp / (stats.mcp_vs_native.mcp + stats.mcp_vs_native.native)) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">MCP Usage</h1>
        <p className="text-slate-400">Model Context Protocol integrations</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Total MCP Calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.total_mcp_calls.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Server className="h-4 w-4" />
              MCP Servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.servers?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Unique Tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{stats.top_tools?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              MCP vs Native
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{mcpPercentage}%</div>
            <p className="text-xs text-slate-500">of all tool calls</p>
          </CardContent>
        </Card>
      </div>

      {/* Servers Breakdown */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">MCP Servers</CardTitle>
          <CardDescription className="text-slate-400">
            Usage breakdown by integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.servers && stats.servers.length > 0 ? (
            <div className="space-y-4">
              {stats.servers.map((server, index) => {
                const percentage = stats.total_mcp_calls > 0
                  ? Math.round((server.count / stats.total_mcp_calls) * 100)
                  : 0
                return (
                  <div key={server.server_name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${getServerColor(index)}`}>
                        {getServerDisplayName(server.server_name)}
                      </span>
                      <span className="text-slate-400">
                        {server.count.toLocaleString()} calls ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getServerColor(index).replace('text-', 'bg-')}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No MCP server usage recorded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Top Tools */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Top MCP Tools</CardTitle>
          <CardDescription className="text-slate-400">
            Most frequently used MCP tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.top_tools && stats.top_tools.length > 0 ? (
            <div className="space-y-2">
              {stats.top_tools.slice(0, 10).map((tool, index) => {
                const successRate = tool.count > 0
                  ? Math.round((tool.success_count / tool.count) * 100)
                  : 0
                return (
                  <div
                    key={tool.tool_name}
                    className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 w-6">{index + 1}.</span>
                      <div>
                        <div className="font-medium text-white">{tool.short_name}</div>
                        <div className="text-xs text-slate-500">
                          {getServerDisplayName(tool.server)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-white">{tool.count}</div>
                      <div className={`text-xs ${successRate >= 90 ? 'text-green-400' : successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {successRate}% success
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No MCP tools used yet</p>
          )}
        </CardContent>
      </Card>

      {/* Usage Trend */}
      {stats.daily_usage && stats.daily_usage.length > 0 && (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily MCP Usage
            </CardTitle>
            <CardDescription className="text-slate-400">
              Last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {stats.daily_usage.map((day) => {
                const maxCount = Math.max(...stats.daily_usage.map(d => d.count))
                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${day.date}: ${day.count} calls`}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
