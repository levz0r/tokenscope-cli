import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderKanban, Terminal, FileCode, Clock, GitCommit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Session {
  id: string
  project_name: string | null
  start_time: string
  end_time: string | null
  tool_uses: { count: number }[]
  file_changes: { count: number }[]
  git_operations: { count: number }[]
}

interface FileChange {
  session_id: string
  lines_added: number
  lines_removed: number
}

interface ProjectStats {
  name: string
  sessions: number
  toolUses: number
  fileChanges: number
  linesAdded: number
  linesRemoved: number
  gitOps: number
  totalMinutes: number
  lastActive: string
}

async function getProjectStats(userId: string): Promise<{
  projects: ProjectStats[]
  stats: { totalProjects: number; totalSessions: number; avgSessionsPerProject: number }
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  // Get all sessions with project names and counts (uses Supabase aggregation, no 1000 limit)
  const { data: sessionsData } = await supabase
    .from('sessions')
    .select(`
      id, project_name, start_time, end_time,
      tool_uses(count),
      file_changes(count),
      git_operations(count)
    `)
    .eq('user_id', userId)
    .order('start_time', { ascending: false })

  const sessions = (sessionsData || []) as Session[]
  if (sessions.length === 0) {
    return { projects: [], stats: { totalProjects: 0, totalSessions: 0, avgSessionsPerProject: 0 } }
  }

  const sessionIds = sessions.map(s => s.id)

  // Get file changes for line counts (limited sample for aggregation)
  const { data: fileChangesData } = await supabase
    .from('file_changes')
    .select('session_id, lines_added, lines_removed')
    .in('session_id', sessionIds)
    .limit(10000)

  const fileChanges = (fileChangesData || []) as FileChange[]

  // Group by project
  const projectMap = new Map<string, {
    sessions: Session[]
    toolUses: number
    fileChanges: number
    linesAdded: number
    linesRemoved: number
    gitOps: number
  }>()

  // Initialize projects from sessions and aggregate counts
  for (const session of sessions) {
    const projectName = session.project_name || 'Unknown Project'
    if (!projectMap.has(projectName)) {
      projectMap.set(projectName, {
        sessions: [],
        toolUses: 0,
        fileChanges: 0,
        linesAdded: 0,
        linesRemoved: 0,
        gitOps: 0,
      })
    }
    const project = projectMap.get(projectName)!
    project.sessions.push(session)
    // Use aggregated counts from session query (no 1000 limit)
    project.toolUses += session.tool_uses?.[0]?.count || 0
    project.fileChanges += session.file_changes?.[0]?.count || 0
    project.gitOps += session.git_operations?.[0]?.count || 0
  }

  // Create session to project mapping for line counts
  const sessionToProject = new Map<string, string>()
  for (const session of sessions) {
    sessionToProject.set(session.id, session.project_name || 'Unknown Project')
  }

  // Aggregate line counts per project
  for (const fc of fileChanges) {
    const projectName = sessionToProject.get(fc.session_id)
    if (projectName && projectMap.has(projectName)) {
      const project = projectMap.get(projectName)!
      project.linesAdded += fc.lines_added || 0
      project.linesRemoved += fc.lines_removed || 0
    }
  }

  // Convert to array with stats
  const projects: ProjectStats[] = Array.from(projectMap.entries()).map(([name, data]) => {
    const totalMinutes = data.sessions.reduce((sum, s) => {
      const start = new Date(s.start_time)
      const end = s.end_time ? new Date(s.end_time) : new Date()
      return sum + (end.getTime() - start.getTime()) / 60000
    }, 0)

    const lastSession = data.sessions[0]
    const lastActive = lastSession?.end_time || lastSession?.start_time || new Date().toISOString()

    return {
      name,
      sessions: data.sessions.length,
      toolUses: data.toolUses,
      fileChanges: data.fileChanges,
      linesAdded: data.linesAdded,
      linesRemoved: data.linesRemoved,
      gitOps: data.gitOps,
      totalMinutes,
      lastActive,
    }
  })

  // Sort by most recent activity
  projects.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())

  const totalProjects = projects.filter(p => p.name !== 'Unknown Project').length
  const totalSessions = sessions.length

  return {
    projects,
    stats: {
      totalProjects,
      totalSessions,
      avgSessionsPerProject: totalProjects > 0 ? Math.round(totalSessions / totalProjects) : 0,
    },
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { projects, stats } = await getProjectStats(user.id)

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400">Analytics by project</p>
        </div>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Project Data Yet</h3>
            <p className="text-gray-400 text-center max-w-md">
              Project analytics will appear here once you sync sessions from Claude Code.
              Projects are detected from the directory you run Claude Code in.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <p className="text-gray-400">Analytics by project</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Total Projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalProjects}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Total Sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.totalSessions}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Sessions/Project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{stats.avgSessionsPerProject}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">All Projects</CardTitle>
          <CardDescription className="text-gray-400">
            Your coding activity by project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.name}
                className="p-4 bg-[#0a0a0a] rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="h-5 w-5 text-blue-400" />
                    <div>
                      <h3 className="font-medium text-white">{project.name}</h3>
                      <p className="text-xs text-gray-500">
                        Last active {formatDistanceToNow(new Date(project.lastActive), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{formatDuration(project.totalMinutes)}</div>
                    <p className="text-xs text-gray-500">total time</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-[#0a0a0a] rounded px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <Terminal className="h-3 w-3" />
                      Sessions
                    </div>
                    <div className="text-sm font-medium text-white">{project.sessions}</div>
                  </div>

                  <div className="bg-[#0a0a0a] rounded px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <FileCode className="h-3 w-3" />
                      Tool Uses
                    </div>
                    <div className="text-sm font-medium text-white">{project.toolUses.toLocaleString()}</div>
                  </div>

                  <div className="bg-[#0a0a0a] rounded px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <FileCode className="h-3 w-3" />
                      Files Changed
                    </div>
                    <div className="text-sm font-medium text-white">{project.fileChanges}</div>
                  </div>

                  <div className="bg-[#0a0a0a] rounded px-3 py-2">
                    <div className="text-xs text-gray-400 mb-1">Lines</div>
                    <div className="text-sm font-medium">
                      <span className="text-emerald-400">+{project.linesAdded.toLocaleString()}</span>
                      {' / '}
                      <span className="text-red-400">-{project.linesRemoved.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a] rounded px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <GitCommit className="h-3 w-3" />
                      Git Ops
                    </div>
                    <div className="text-sm font-medium text-white">{project.gitOps}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
