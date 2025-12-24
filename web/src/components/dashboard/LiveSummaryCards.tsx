'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { SummaryCards } from '@/components/analytics/SummaryCards'

interface LiveSummaryCardsProps {
  userId: string
  initialData: {
    sessions: number
    toolUses: number
    linesAdded: number
    linesRemoved: number
    gitOps: number
    uniqueFiles: number
    mcpCalls: number
    successRate: number
  }
}

export function LiveSummaryCards({ userId, initialData }: LiveSummaryCardsProps) {
  const [data, setData] = useState(initialData)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Subscribe to new sessions
    const sessionsChannel = supabase
      .channel('live-sessions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setData(prev => ({ ...prev, sessions: prev.sessions + 1 }))
        }
      )
      .subscribe()

    // Subscribe to new tool uses
    const toolUsesChannel = supabase
      .channel('live-tool-uses')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tool_uses',
        },
        (payload) => {
          const toolName = payload.new.tool_name as string
          const success = payload.new.success as boolean
          const isMcp = toolName?.startsWith('mcp__')

          setData(prev => {
            const newToolUses = prev.toolUses + 1
            const newMcpCalls = isMcp ? prev.mcpCalls + 1 : prev.mcpCalls
            // Recalculate success rate (approximate)
            const totalCalls = newToolUses
            const successCalls = Math.round(prev.successRate * prev.toolUses / 100) + (success ? 1 : 0)
            const newSuccessRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 100

            return {
              ...prev,
              toolUses: newToolUses,
              mcpCalls: newMcpCalls,
              successRate: newSuccessRate,
            }
          })
        }
      )
      .subscribe()

    // Subscribe to new file changes
    const fileChangesChannel = supabase
      .channel('live-file-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'file_changes',
        },
        (payload) => {
          const linesAdded = (payload.new.lines_added as number) || 0
          const linesRemoved = (payload.new.lines_removed as number) || 0

          setData(prev => ({
            ...prev,
            linesAdded: prev.linesAdded + linesAdded,
            linesRemoved: prev.linesRemoved + linesRemoved,
            uniqueFiles: prev.uniqueFiles + 1, // Approximate - could be same file
          }))
        }
      )
      .subscribe()

    // Subscribe to new git operations
    const gitOpsChannel = supabase
      .channel('live-git-ops')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'git_operations',
        },
        () => {
          setData(prev => ({ ...prev, gitOps: prev.gitOps + 1 }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(toolUsesChannel)
      supabase.removeChannel(fileChangesChannel)
      supabase.removeChannel(gitOpsChannel)
    }
  }, [userId])

  return (
    <SummaryCards
      sessions={data.sessions}
      toolUses={data.toolUses}
      linesAdded={data.linesAdded}
      linesRemoved={data.linesRemoved}
      gitOps={data.gitOps}
      uniqueFiles={data.uniqueFiles}
      mcpCalls={data.mcpCalls}
      successRate={data.successRate}
    />
  )
}
