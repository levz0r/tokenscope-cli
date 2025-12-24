import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, FileType, TrendingUp, Clock, FolderTree } from 'lucide-react'

interface ToolUse {
  tool_name: string
  success: boolean
  timestamp: string
}

interface FileChange {
  file_path: string
  lines_added: number
  lines_removed: number
  timestamp: string
}

interface Session {
  id: string
  start_time: string
  end_time: string | null
}

interface InsightsData {
  successRate: number
  successCount: number
  errorCount: number
  fileTypes: Array<{ extension: string; count: number; percentage: number }>
  codeChurn: Array<{ date: string; added: number; removed: number }>
  sessionDurations: Array<{ range: string; count: number }>
  directoryActivity: Array<{ directory: string; count: number; percentage: number }>
}

async function getInsightsData(userId: string): Promise<InsightsData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get tool uses with success field
  const { data: toolUsesData } = await supabase
    .from('tool_uses')
    .select('tool_name, success, timestamp, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('timestamp', thirtyDaysAgo.toISOString())

  const toolUses = (toolUsesData || []) as ToolUse[]

  // Get file changes
  const { data: fileChangesData } = await supabase
    .from('file_changes')
    .select('file_path, lines_added, lines_removed, timestamp, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .gte('timestamp', thirtyDaysAgo.toISOString())

  const fileChanges = (fileChangesData || []) as FileChange[]

  // Get sessions
  const { data: sessionsData } = await supabase
    .from('sessions')
    .select('id, start_time, end_time')
    .eq('user_id', userId)
    .gte('start_time', thirtyDaysAgo.toISOString())

  const sessions = (sessionsData || []) as Session[]

  // 1. Success/Error rates
  const successCount = toolUses.filter(t => t.success).length
  const errorCount = toolUses.filter(t => !t.success).length
  const successRate = toolUses.length > 0 ? Math.round((successCount / toolUses.length) * 100) : 0

  // 2. File types breakdown
  const extensionMap = new Map<string, number>()
  for (const fc of fileChanges) {
    // Get filename from path, then extract extension
    const filename = fc.file_path.split('/').pop() || ''
    const lastDotIndex = filename.lastIndexOf('.')
    // Only treat as extension if dot exists and isn't at the start (hidden files)
    const ext = lastDotIndex > 0 ? filename.slice(lastDotIndex + 1).toLowerCase() : 'other'
    extensionMap.set(ext, (extensionMap.get(ext) || 0) + 1)
  }
  const totalFiles = fileChanges.length
  const allFileTypes = Array.from(extensionMap.entries())
    .map(([extension, count]) => ({
      extension,
      count,
      percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Take top 9 (excluding "other"), then append "other" at the end if it exists
  const otherType = allFileTypes.find(ft => ft.extension === 'other')
  const regularTypes = allFileTypes.filter(ft => ft.extension !== 'other').slice(0, otherType ? 9 : 10)
  const fileTypes = otherType ? [...regularTypes, otherType] : regularTypes

  // 3. Code churn over time (last 14 days)
  const churnMap = new Map<string, { added: number; removed: number }>()
  for (const fc of fileChanges) {
    const date = fc.timestamp.split('T')[0]
    const existing = churnMap.get(date) || { added: 0, removed: 0 }
    existing.added += fc.lines_added || 0
    existing.removed += fc.lines_removed || 0
    churnMap.set(date, existing)
  }

  const today = new Date()
  const codeChurn: Array<{ date: string; added: number; removed: number }> = []
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const data = churnMap.get(dateStr) || { added: 0, removed: 0 }
    codeChurn.push({ date: dateStr, ...data })
  }

  // 4. Session duration distribution
  const durationBuckets = {
    '< 5 min': 0,
    '5-15 min': 0,
    '15-30 min': 0,
    '30-60 min': 0,
    '1-2 hours': 0,
    '> 2 hours': 0,
  }

  for (const session of sessions) {
    const start = new Date(session.start_time)
    const end = session.end_time ? new Date(session.end_time) : new Date()
    const minutes = (end.getTime() - start.getTime()) / 60000

    if (minutes < 5) durationBuckets['< 5 min']++
    else if (minutes < 15) durationBuckets['5-15 min']++
    else if (minutes < 30) durationBuckets['15-30 min']++
    else if (minutes < 60) durationBuckets['30-60 min']++
    else if (minutes < 120) durationBuckets['1-2 hours']++
    else durationBuckets['> 2 hours']++
  }

  const sessionDurations = Object.entries(durationBuckets).map(([range, count]) => ({
    range,
    count,
  }))

  // 5. Directory activity
  const directoryMap = new Map<string, number>()
  for (const fc of fileChanges) {
    let path = fc.file_path
    // Remove common absolute path prefixes to get project-relative paths
    // Match patterns like /Users/*/Dev/*/ or /home/*/ or ~/
    path = path.replace(/^\/Users\/[^/]+\/(?:Dev|Development|Projects|Code|repos)\/[^/]+\//, '')
    path = path.replace(/^\/home\/[^/]+\/[^/]+\//, '')
    path = path.replace(/^~\/[^/]+\//, '')
    path = path.replace(/^\.\//, '')

    const parts = path.split('/').filter(Boolean)
    // Get first directory level, or group root files together
    const directory = parts.length > 1 ? parts[0] : '(root)'
    directoryMap.set(directory, (directoryMap.get(directory) || 0) + 1)
  }

  const directoryActivity = Array.from(directoryMap.entries())
    .map(([directory, count]) => ({
      directory,
      count,
      percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    successRate,
    successCount,
    errorCount,
    fileTypes,
    codeChurn,
    sessionDurations,
    directoryActivity,
  }
}

function getExtensionColor(ext: string): string {
  const colors: Record<string, string> = {
    ts: 'bg-blue-500',
    tsx: 'bg-blue-400',
    js: 'bg-yellow-500',
    jsx: 'bg-yellow-400',
    py: 'bg-emerald-500',
    go: 'bg-cyan-500',
    rs: 'bg-orange-500',
    java: 'bg-red-500',
    css: 'bg-pink-500',
    html: 'bg-orange-400',
    json: 'bg-gray-500',
    md: 'bg-purple-500',
    sql: 'bg-blue-600',
    sh: 'bg-emerald-600',
  }
  return colors[ext] || 'bg-gray-500'
}

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const insights = await getInsightsData(user.id)

  const maxChurn = Math.max(...insights.codeChurn.map(d => Math.max(d.added, d.removed)), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Insights</h1>
        <p className="text-gray-400">Detailed analytics and patterns</p>
      </div>

      {/* Success Rate */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Success Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">{insights.successRate}%</div>
            <p className="text-xs text-gray-500">of tool calls succeeded</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Successful Calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{insights.successCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              Failed Calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{insights.errorCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* File Types */}
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileType className="h-5 w-5" />
              File Types
            </CardTitle>
            <CardDescription className="text-gray-400">
              Languages and file types modified
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.fileTypes.length > 0 ? (
              <div className="space-y-3">
                {insights.fileTypes.map((ft) => (
                  <div key={ft.extension} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`text-white ${ft.extension === 'other' ? 'italic text-gray-400' : 'font-mono'}`}>{ft.extension === 'other' ? 'other' : `.${ft.extension}`}</span>
                      <span className="text-gray-400">{ft.count} ({ft.percentage}%)</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getExtensionColor(ft.extension)} rounded-full`}
                        style={{ width: `${ft.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No file data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Session Duration Distribution */}
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Lengths
            </CardTitle>
            <CardDescription className="text-gray-400">
              Distribution of session durations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.sessionDurations.map((sd) => {
                const maxCount = Math.max(...insights.sessionDurations.map(s => s.count), 1)
                const percentage = (sd.count / maxCount) * 100
                return (
                  <div key={sd.range} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">{sd.range}</span>
                      <span className="text-gray-400">{sd.count} sessions</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Code Churn */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Code Churn (Last 14 Days)
          </CardTitle>
          <CardDescription className="text-gray-400">
            Lines added vs removed over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-emerald-500 rounded" />
                Added
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded" />
                Removed
              </span>
            </div>
            <div className="flex items-end gap-1 h-32">
              {insights.codeChurn.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col gap-0.5">
                  <div
                    className="bg-emerald-500 rounded-t w-full"
                    style={{ height: `${(day.added / maxChurn) * 60}px` }}
                    title={`${day.date}: +${day.added} lines`}
                  />
                  <div
                    className="bg-red-500 rounded-b w-full"
                    style={{ height: `${(day.removed / maxChurn) * 60}px` }}
                    title={`${day.date}: -${day.removed} lines`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{insights.codeChurn[0]?.date.slice(5)}</span>
              <span>{insights.codeChurn[insights.codeChurn.length - 1]?.date.slice(5)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Activity */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Directory Activity
          </CardTitle>
          <CardDescription className="text-gray-400">
            Most active directories in your codebase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.directoryActivity.length > 0 ? (
            <div className="space-y-3">
              {insights.directoryActivity.map((dir, index) => (
                <div key={dir.directory} className="flex items-center gap-3">
                  <span className="text-gray-500 w-6 text-right">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white font-mono truncate max-w-[200px]" title={dir.directory}>
                        {dir.directory}
                      </span>
                      <span className="text-gray-400">{dir.count} changes ({dir.percentage}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${dir.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No directory data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
