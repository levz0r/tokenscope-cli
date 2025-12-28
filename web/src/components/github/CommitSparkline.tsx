'use client'

import { useEffect, useState } from 'react'

interface WeekData {
  week: string
  ai: number
  human: number
  total: number
}

interface CommitSparklineProps {
  repoId: string
}

export function CommitSparkline({ repoId }: CommitSparklineProps) {
  const [history, setHistory] = useState<WeekData[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredWeek, setHoveredWeek] = useState<WeekData | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/github/repos/${repoId}/history`)
        if (response.ok) {
          const data = await response.json()
          setHistory(data.history || [])
        }
      } catch (e) {
        console.error('Failed to fetch commit history:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [repoId])

  if (loading) {
    return <div className="w-24 h-8 bg-white/5 rounded animate-pulse" />
  }

  // If no history, show "No data"
  if (history.length === 0) {
    return <div className="w-24 h-8 flex items-center justify-center text-xs text-gray-500">No data</div>
  }

  // Generate 12 weeks relative to the most recent commit (not today)
  const weeks = 12
  const fullHistory: WeekData[] = []

  // Find the most recent week with data
  const sortedHistory = [...history].sort((a, b) => b.week.localeCompare(a.week))
  const mostRecentWeek = new Date(sortedHistory[0].week)

  // Get the start of each week for the 12 weeks ending at most recent commit
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(mostRecentWeek)
    date.setDate(date.getDate() - (i * 7))
    // Get start of week (Sunday)
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    const weekKey = startOfWeek.toISOString().split('T')[0]

    // Find if we have data for this week
    const weekData = history.find(w => w.week === weekKey)
    fullHistory.push(weekData || { week: weekKey, ai: 0, human: 0, total: 0 })
  }

  // Calculate max for scaling (minimum 1 to avoid division by zero)
  const maxTotal = Math.max(...fullHistory.map(w => w.total), 1)

  // SVG dimensions - fixed width with consistent bars
  const width = 96
  const height = 32
  const barWidth = 6
  const gap = 2

  return (
    <div className="relative group">
      <svg width={width} height={height} className="overflow-visible">
        {fullHistory.map((week, i) => {
          const x = i * (barWidth + gap) + 2
          const totalHeight = (week.total / maxTotal) * (height - 4)
          const aiHeight = (week.ai / maxTotal) * (height - 4)
          const humanHeight = totalHeight - aiHeight
          const hasData = week.total > 0

          return (
            <g
              key={week.week}
              onMouseEnter={() => setHoveredWeek(week)}
              onMouseLeave={() => setHoveredWeek(null)}
              className="cursor-pointer"
            >
              {/* Invisible hit area for hover */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={height}
                className="fill-transparent"
              />
              {/* Empty week indicator */}
              {!hasData && (
                <rect
                  x={x}
                  y={height - 3}
                  width={barWidth}
                  height={1}
                  className="fill-white/10"
                />
              )}
              {/* Human commits (bottom) */}
              {humanHeight > 0 && (
                <rect
                  x={x}
                  y={height - 2 - humanHeight}
                  width={barWidth}
                  height={humanHeight}
                  rx={1}
                  className="fill-slate-600"
                />
              )}
              {/* AI commits (top, stacked) */}
              {aiHeight > 0 && (
                <rect
                  x={x}
                  y={height - 2 - totalHeight}
                  width={barWidth}
                  height={aiHeight}
                  rx={1}
                  className="fill-orange-500"
                />
              )}
            </g>
          )
        })}
      </svg>
      {/* Tooltip on hover */}
      {hoveredWeek && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 rounded text-xs whitespace-nowrap pointer-events-none z-50 border border-white/10">
          <div className="text-gray-400 mb-0.5">
            {(() => {
              const startDate = new Date(hoveredWeek.week)
              const endDate = new Date(startDate)
              endDate.setDate(endDate.getDate() + 6)
              const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return `${format(startDate)} - ${format(endDate)}`
            })()}
          </div>
          {hoveredWeek.total > 0 ? (
            <div className="flex gap-3">
              <span className="text-orange-400">{hoveredWeek.ai} <span className="text-orange-300">Claude</span></span>
              <span className="text-gray-300">{hoveredWeek.human} <span className="text-gray-400">Human</span></span>
            </div>
          ) : (
            <div className="text-gray-500">No commits</div>
          )}
        </div>
      )}
    </div>
  )
}
