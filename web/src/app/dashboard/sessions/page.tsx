import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SessionsTable } from '@/components/analytics/SessionsTable'
import { formatDistanceToNow } from 'date-fns'

interface SessionData {
  id: string
  local_session_id: string
  project_name: string | null
  start_time: string
  end_time: string | null
  source: string | null
  reason: string | null
  tool_uses: { count: number }[]
  file_changes: { count: number }[]
  git_operations: { count: number }[]
}

async function getSessions(userId: string): Promise<SessionData[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      *,
      tool_uses(count),
      file_changes(count),
      git_operations(count)
    `)
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(100)

  return (sessions || []) as SessionData[]
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const sessions = await getSessions(user.id)

  // Calculate session stats
  const totalSessions = sessions.length
  const activeSessions = sessions.filter(s => !s.end_time).length
  const avgToolsPerSession = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.tool_uses?.[0]?.count || 0), 0) / sessions.length)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sessions</h1>
        <p className="text-gray-500">Your Claude Code session history</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalSessions}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Active Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{activeSessions}</div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Avg Tools/Session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{avgToolsPerSession}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-white">Session History</CardTitle>
          <CardDescription className="text-gray-500">
            All your coding sessions with Claude Code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsTable sessions={sessions} />
        </CardContent>
      </Card>
    </div>
  )
}
