import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

interface SyncSession {
  local_session_id: string
  start_time: string
  end_time?: string | null
  project_name?: string | null
  source?: string | null
  reason?: string | null
}

interface SyncToolUse {
  local_session_id: string
  tool_name: string
  tool_use_id?: string | null
  timestamp: string
  success?: boolean
}

interface SyncFileChange {
  local_session_id: string
  file_path: string
  operation: 'write' | 'edit' | 'read'
  lines_added?: number
  lines_removed?: number
  timestamp: string
}

interface SyncGitOperation {
  local_session_id: string
  command?: string | null
  operation_type: string
  exit_code?: number
  timestamp: string
}

interface SyncPayload {
  sessions?: SyncSession[]
  tool_uses?: SyncToolUse[]
  file_changes?: SyncFileChange[]
  git_operations?: SyncGitOperation[]
}

export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.substring(7)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    // Look up user by API key
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('api_key', apiKey)
      .limit(1)

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const user_id = profiles[0].id

    // Get user's team (if any)
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user_id)
      .eq('role', 'owner')
      .limit(1)

    const team_id = membership?.[0]?.team_id || null

    // Parse request body
    const payload: SyncPayload = await request.json()
    const counts = {
      sessions: 0,
      tool_uses: 0,
      file_changes: 0,
      git_operations: 0,
    }

    // Map to store local_session_id -> cloud session id
    const sessionIdMap = new Map<string, string>()

    // 1. Sync sessions (upsert)
    if (payload.sessions && payload.sessions.length > 0) {
      for (const session of payload.sessions) {
        const { data, error } = await supabase
          .from('sessions')
          .upsert(
            {
              user_id,
              team_id,
              local_session_id: session.local_session_id,
              start_time: session.start_time,
              end_time: session.end_time,
              project_name: session.project_name,
              source: session.source,
              reason: session.reason,
            },
            {
              onConflict: 'user_id,local_session_id',
            }
          )
          .select('id, local_session_id')
          .single()

        if (!error && data) {
          sessionIdMap.set(data.local_session_id, data.id)
          counts.sessions++
        }
      }
    }

    // Helper to get cloud session ID
    const getSessionId = async (localId: string): Promise<string | null> => {
      if (sessionIdMap.has(localId)) {
        return sessionIdMap.get(localId)!
      }

      // Look up in database
      const { data } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user_id)
        .eq('local_session_id', localId)
        .single()

      if (data) {
        sessionIdMap.set(localId, data.id)
        return data.id
      }
      return null
    }

    // 2. Sync tool uses
    if (payload.tool_uses && payload.tool_uses.length > 0) {
      for (const toolUse of payload.tool_uses) {
        const sessionId = await getSessionId(toolUse.local_session_id)
        if (!sessionId) continue

        const { error } = await supabase.from('tool_uses').insert({
          session_id: sessionId,
          tool_name: toolUse.tool_name,
          tool_use_id: toolUse.tool_use_id,
          timestamp: toolUse.timestamp,
          success: toolUse.success ?? true,
        })

        if (!error) counts.tool_uses++
      }
    }

    // 3. Sync file changes
    if (payload.file_changes && payload.file_changes.length > 0) {
      for (const fileChange of payload.file_changes) {
        const sessionId = await getSessionId(fileChange.local_session_id)
        if (!sessionId) continue

        const { error } = await supabase.from('file_changes').insert({
          session_id: sessionId,
          file_path: fileChange.file_path,
          operation: fileChange.operation,
          lines_added: fileChange.lines_added ?? 0,
          lines_removed: fileChange.lines_removed ?? 0,
          timestamp: fileChange.timestamp,
        })

        if (!error) counts.file_changes++
      }
    }

    // 4. Sync git operations
    if (payload.git_operations && payload.git_operations.length > 0) {
      for (const gitOp of payload.git_operations) {
        const sessionId = await getSessionId(gitOp.local_session_id)
        if (!sessionId) continue

        const { error } = await supabase.from('git_operations').insert({
          session_id: sessionId,
          command: gitOp.command,
          operation_type: gitOp.operation_type,
          exit_code: gitOp.exit_code ?? 0,
          timestamp: gitOp.timestamp,
        })

        if (!error) counts.git_operations++
      }
    }

    return NextResponse.json({
      success: true,
      synced: counts,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'sync' })
}
