import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface Session {
  id: string
  start_time: string
  end_time: string | null
}

interface FileChange {
  lines_added: number
  lines_removed: number
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30', 10)

    // Check for API key auth first (for CLI)
    const authHeader = request.headers.get('Authorization')
    let userId: string

    const db = createAdminClient()

    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7)

      // Look up user by API key in profiles table
      const { data: profiles } = await db
        .from('profiles')
        .select('id')
        .eq('api_key', apiKey)
        .limit(1) as { data: { id: string }[] | null }

      if (!profiles || profiles.length === 0) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        )
      }

      userId = profiles[0].id
    } else {
      // Session-based auth (for web dashboard)
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      userId = user.id
    }

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get sessions
    const { data: sessionsData } = await db
      .from('sessions')
      .select('id, start_time, end_time')
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())

    const sessions = (sessionsData || []) as Session[]
    const sessionIds = sessions.map(s => s.id)

    // Get tool uses
    const { count: toolUsesCount } = sessionIds.length > 0
      ? await db
          .from('tool_uses')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
      : { count: 0 }

    // Get file changes
    const { data: fileChangesData } = sessionIds.length > 0
      ? await db
          .from('file_changes')
          .select('lines_added, lines_removed')
          .in('session_id', sessionIds)
      : { data: [] }

    const fileChanges = (fileChangesData || []) as FileChange[]

    // Get git operations
    const { count: gitOpsCount } = sessionIds.length > 0
      ? await db
          .from('git_operations')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
      : { count: 0 }

    // Calculate stats
    const totalDurationMinutes = sessions.reduce((sum, s) => {
      const start = new Date(s.start_time)
      const end = s.end_time ? new Date(s.end_time) : new Date()
      return sum + (end.getTime() - start.getTime()) / 60000
    }, 0)

    const linesAdded = fileChanges.reduce((sum, f) => sum + (f.lines_added || 0), 0)
    const linesRemoved = fileChanges.reduce((sum, f) => sum + (f.lines_removed || 0), 0)

    const data = {
      total_sessions: sessions.length,
      total_tool_uses: toolUsesCount || 0,
      total_file_changes: fileChanges.length,
      total_git_operations: gitOpsCount || 0,
      total_duration_minutes: Math.round(totalDurationMinutes),
      lines_added: linesAdded,
      lines_removed: linesRemoved,
    }

    return NextResponse.json({
      success: true,
      data,
      period: {
        days,
        from: startDate.toISOString(),
        to: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
