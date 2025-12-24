'use client'

import { format } from 'date-fns'

interface DailyData {
  date: string
  count: number
  dayOfWeek: number
}

interface ActivityHeatmapProps {
  data: DailyData[]
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-slate-800'
    const ratio = count / maxCount
    if (ratio < 0.25) return 'bg-emerald-900/50'
    if (ratio < 0.5) return 'bg-emerald-700/60'
    if (ratio < 0.75) return 'bg-emerald-500/70'
    return 'bg-emerald-400'
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Group data by week
  const weeks: DailyData[][] = []
  let currentWeek: DailyData[] = []

  // Fill in any missing days at the start
  if (data.length > 0) {
    const firstDayOfWeek = data[0].dayOfWeek
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: '', count: -1, dayOfWeek: i })
    }
  }

  for (const day of data) {
    currentWeek.push(day)
    if (day.dayOfWeek === 6) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  if (data.every(d => d.count === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-slate-400">No activity data yet</p>
        <p className="text-sm text-slate-500">
          Sync your analytics to see daily patterns
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <div className="w-8 flex flex-col gap-1 text-xs text-slate-500">
          {dayLabels.map((label, i) => (
            <div key={label} className="h-4 flex items-center">
              {i % 2 === 1 ? label : ''}
            </div>
          ))}
        </div>
        <div className="flex gap-1 flex-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1 flex-1">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`h-4 rounded-sm ${day.count === -1 ? 'bg-transparent' : getIntensity(day.count)}`}
                  title={day.date ? `${format(new Date(day.date), 'MMM d, yyyy')}: ${day.count} tool calls` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-800" />
          <div className="w-3 h-3 rounded-sm bg-emerald-900/50" />
          <div className="w-3 h-3 rounded-sm bg-emerald-700/60" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500/70" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
