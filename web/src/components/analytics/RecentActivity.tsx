'use client'

import { formatDistanceToNow } from 'date-fns'
import { Activity, Clock } from 'lucide-react'

interface Session {
  id: string
  local_session_id: string
  start_time: string
  end_time: string | null
  project_name: string | null
}

interface RecentActivityProps {
  sessions: Session[]
}

export function RecentActivity({ sessions }: RecentActivityProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-slate-500">
        <Activity className="h-8 w-8 mb-2" />
        <p>No sessions yet</p>
        <p className="text-sm">Sync your analytics to see activity here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const startTime = new Date(session.start_time)
        const endTime = session.end_time ? new Date(session.end_time) : null
        const duration = endTime
          ? Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60)
          : null

        return (
          <div
            key={session.id}
            className="flex items-start gap-4 p-3 rounded-lg bg-slate-700/30"
          >
            <div className="mt-1">
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.project_name || 'Unknown Project'}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(startTime, { addSuffix: true })}
                </span>
                {duration !== null && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>{duration} min</span>
                  </>
                )}
              </div>
            </div>
            {!endTime && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
                Active
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
