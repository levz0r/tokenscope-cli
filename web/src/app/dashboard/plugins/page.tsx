import { getServerAuth } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Puzzle, Zap, Bot, Package, TrendingUp } from 'lucide-react'

interface PluginStats {
  total_skill_uses: number
  total_agent_spawns: number
  total_plugins: number
  top_skills: Array<{
    skill_name: string
    plugin_name: string | null
    count: number
  }>
  top_agents: Array<{
    agent_type: string
    count: number
    background_count: number
  }>
  installed_plugins: Array<{
    plugin_name: string
    plugin_source: string | null
    has_skills: boolean
    has_agents: boolean
    has_hooks: boolean
    has_mcp: boolean
    first_seen: string
    last_seen: string
  }>
  daily_usage: Array<{ date: string; skills: number; agents: number }>
}

interface SkillUse {
  skill_name: string
  plugin_name: string | null
  timestamp: string
}

interface AgentSpawn {
  agent_type: string
  background: boolean
  timestamp: string
}

interface InstalledPlugin {
  plugin_name: string
  plugin_source: string | null
  has_skills: boolean
  has_agents: boolean
  has_hooks: boolean
  has_mcp: boolean
  first_seen: string
  last_seen: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPluginStats(
  userId: string,
  db: any
): Promise<PluginStats | null> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get skill uses
  const { data: skillUsesData } = await db
    .from('skill_uses')
    .select('skill_name, plugin_name, timestamp, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('timestamp', thirtyDaysAgo.toISOString())

  const skillUses = (skillUsesData || []) as SkillUse[]

  // Get agent spawns
  const { data: agentSpawnsData } = await db
    .from('agent_spawns')
    .select('agent_type, background, timestamp, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('timestamp', thirtyDaysAgo.toISOString())

  const agentSpawns = (agentSpawnsData || []) as AgentSpawn[]

  // Get installed plugins
  const { data: pluginsData } = await db
    .from('installed_plugins')
    .select('*')
    .eq('user_id', userId)

  const installedPlugins = (pluginsData || []) as InstalledPlugin[]

  // If no data at all, return null to show empty state
  if (skillUses.length === 0 && agentSpawns.length === 0 && installedPlugins.length === 0) {
    return null
  }

  // Aggregate skill uses
  const skillMap = new Map<string, { plugin_name: string | null; count: number }>()
  const dailyMap = new Map<string, { skills: number; agents: number }>()

  for (const s of skillUses) {
    const key = s.plugin_name ? `${s.plugin_name}:${s.skill_name}` : s.skill_name
    const existing = skillMap.get(key) || { plugin_name: s.plugin_name, count: 0 }
    existing.count++
    skillMap.set(key, existing)

    const date = s.timestamp.split('T')[0]
    const daily = dailyMap.get(date) || { skills: 0, agents: 0 }
    daily.skills++
    dailyMap.set(date, daily)
  }

  // Aggregate agent spawns
  const agentMap = new Map<string, { count: number; background_count: number }>()

  for (const a of agentSpawns) {
    const existing = agentMap.get(a.agent_type) || { count: 0, background_count: 0 }
    existing.count++
    if (a.background) existing.background_count++
    agentMap.set(a.agent_type, existing)

    const date = a.timestamp.split('T')[0]
    const daily = dailyMap.get(date) || { skills: 0, agents: 0 }
    daily.agents++
    dailyMap.set(date, daily)
  }

  // Convert to arrays
  const top_skills = Array.from(skillMap.entries())
    .map(([skill_name, data]) => ({
      skill_name: skill_name.includes(':') ? skill_name.split(':')[1] : skill_name,
      plugin_name: data.plugin_name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)

  const top_agents = Array.from(agentMap.entries())
    .map(([agent_type, data]) => ({
      agent_type,
      count: data.count,
      background_count: data.background_count,
    }))
    .sort((a, b) => b.count - a.count)

  // Create daily usage array for last 30 days
  const daily_usage: Array<{ date: string; skills: number; agents: number }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const daily = dailyMap.get(dateStr) || { skills: 0, agents: 0 }
    daily_usage.push({
      date: dateStr,
      skills: daily.skills,
      agents: daily.agents,
    })
  }

  return {
    total_skill_uses: skillUses.length,
    total_agent_spawns: agentSpawns.length,
    total_plugins: installedPlugins.length,
    top_skills,
    top_agents,
    installed_plugins: installedPlugins,
    daily_usage,
  }
}

function getAgentColor(agentType: string): string {
  const colors: Record<string, string> = {
    'Explore': 'text-blue-400',
    'Plan': 'text-green-400',
    'code-architect': 'text-purple-400',
    'bug-diagnostician': 'text-red-400',
    'security-auditor': 'text-orange-400',
    'github-cli-expert': 'text-cyan-400',
    'general-purpose': 'text-slate-400',
  }
  return colors[agentType] || 'text-slate-400'
}

export default async function PluginsPage() {
  const { user, db } = await getServerAuth()

  if (!user || !db) return null

  const stats = await getPluginStats(user.id, db)

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Plugins & Agents</h1>
          <p className="text-slate-400">Skills, agents, and plugin ecosystem usage</p>
        </div>
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Puzzle className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Plugin Data Yet</h3>
            <p className="text-slate-400 text-center max-w-md">
              Plugin usage data will appear here once you start using skills (slash commands),
              agents, or install Claude Code plugins.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Plugins & Agents</h1>
        <p className="text-slate-400">Skills, agents, and plugin ecosystem usage</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Skill Invocations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.total_skill_uses.toLocaleString()}</div>
            <p className="text-xs text-slate-500">last 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agent Spawns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.total_agent_spawns.toLocaleString()}</div>
            <p className="text-xs text-slate-500">last 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Installed Plugins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{stats.total_plugins}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Unique Skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{stats.top_skills.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Skills */}
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Top Skills</CardTitle>
            <CardDescription className="text-slate-400">
              Most frequently used slash commands
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.top_skills.length > 0 ? (
              <div className="space-y-2">
                {stats.top_skills.slice(0, 10).map((skill, index) => (
                  <div
                    key={`${skill.plugin_name || ''}:${skill.skill_name}`}
                    className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 w-6">{index + 1}.</span>
                      <div>
                        <div className="font-medium text-white">/{skill.skill_name}</div>
                        {skill.plugin_name && (
                          <div className="text-xs text-slate-500">
                            {skill.plugin_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="font-medium text-white">{skill.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No skill usage recorded yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Top Agents</CardTitle>
            <CardDescription className="text-slate-400">
              Most frequently spawned subagents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.top_agents.length > 0 ? (
              <div className="space-y-2">
                {stats.top_agents.slice(0, 10).map((agent, index) => {
                  const bgPercent = agent.count > 0
                    ? Math.round((agent.background_count / agent.count) * 100)
                    : 0
                  return (
                    <div
                      key={agent.agent_type}
                      className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 w-6">{index + 1}.</span>
                        <div>
                          <div className={`font-medium ${getAgentColor(agent.agent_type)}`}>
                            {agent.agent_type}
                          </div>
                          {agent.background_count > 0 && (
                            <div className="text-xs text-slate-500">
                              {bgPercent}% background
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="font-medium text-white">{agent.count}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No agent spawns recorded yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Installed Plugins */}
      {stats.installed_plugins.length > 0 && (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Installed Plugins</CardTitle>
            <CardDescription className="text-slate-400">
              Plugins detected in your Claude Code environment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.installed_plugins.map((plugin) => (
                <div
                  key={`${plugin.plugin_name}:${plugin.plugin_source}`}
                  className="flex items-center justify-between p-4 bg-slate-900 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">{plugin.plugin_name}</div>
                    {plugin.plugin_source && (
                      <div className="text-xs text-slate-500">{plugin.plugin_source}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {plugin.has_skills && (
                      <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
                        Skills
                      </span>
                    )}
                    {plugin.has_agents && (
                      <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                        Agents
                      </span>
                    )}
                    {plugin.has_hooks && (
                      <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded">
                        Hooks
                      </span>
                    )}
                    {plugin.has_mcp && (
                      <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded">
                        MCP
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Trend */}
      {stats.daily_usage.some(d => d.skills > 0 || d.agents > 0) && (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Activity
            </CardTitle>
            <CardDescription className="text-slate-400">
              Skills and agent usage over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {stats.daily_usage.map((day) => {
                const total = day.skills + day.agents
                const maxTotal = Math.max(...stats.daily_usage.map(d => d.skills + d.agents))
                const height = maxTotal > 0 ? (total / maxTotal) * 100 : 0
                const skillPercent = total > 0 ? (day.skills / total) * 100 : 0
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col rounded-t overflow-hidden"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${day.date}: ${day.skills} skills, ${day.agents} agents`}
                  >
                    <div
                      className="bg-green-500 opacity-70 hover:opacity-100 transition-opacity"
                      style={{ height: `${100 - skillPercent}%` }}
                    />
                    <div
                      className="bg-blue-500 opacity-70 hover:opacity-100 transition-opacity"
                      style={{ height: `${skillPercent}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-slate-400">Skills</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-slate-400">Agents</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
