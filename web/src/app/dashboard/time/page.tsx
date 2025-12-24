import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap'
import { HourlyChart } from '@/components/analytics/HourlyChart'
import { Clock, Calendar, Sun, Moon } from 'lucide-react'

async function getTimeStats(userId: string) {
  const supabase = await createClient()

  // Get all tool uses with timestamps
  const { data: toolUses } = await supabase
    .from('tool_uses')
    .select('timestamp, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)

  if (!toolUses) return { hourly: [], daily: [], stats: { peakHour: 0, peakDay: '', totalHours: 0 } }

  // Aggregate by hour
  const hourlyMap = new Map<number, number>()
  const dailyMap = new Map<string, number>()
  const dayOfWeekMap = new Map<number, number>()

  for (const use of toolUses) {
    const date = new Date(use.timestamp)
    const hour = date.getHours()
    const dayOfWeek = date.getDay()
    const dateStr = date.toISOString().split('T')[0]

    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1)
    dayOfWeekMap.set(dayOfWeek, (dayOfWeekMap.get(dayOfWeek) || 0) + 1)
  }

  // Create hourly array
  const hourly = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourlyMap.get(i) || 0,
    label: `${i.toString().padStart(2, '0')}:00`,
  }))

  // Create daily array for last 30 days
  const today = new Date()
  const daily = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (29 - i))
    const dateStr = date.toISOString().split('T')[0]
    return {
      date: dateStr,
      count: dailyMap.get(dateStr) || 0,
      dayOfWeek: date.getDay(),
    }
  })

  // Find peak hour
  let peakHour = 0
  let maxHourCount = 0
  hourlyMap.forEach((count, hour) => {
    if (count > maxHourCount) {
      maxHourCount = count
      peakHour = hour
    }
  })

  // Find peak day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let peakDayOfWeek = 0
  let maxDayCount = 0
  dayOfWeekMap.forEach((count, day) => {
    if (count > maxDayCount) {
      maxDayCount = count
      peakDayOfWeek = day
    }
  })

  // Calculate total active hours
  const activeDates = new Set(toolUses.map(t => new Date(t.timestamp).toISOString().split('T')[0]))

  return {
    hourly,
    daily,
    stats: {
      peakHour,
      peakDay: dayNames[peakDayOfWeek],
      totalDays: activeDates.size,
      morningActivity: Array.from(hourlyMap.entries())
        .filter(([h]) => h >= 6 && h < 12)
        .reduce((sum, [, c]) => sum + c, 0),
      afternoonActivity: Array.from(hourlyMap.entries())
        .filter(([h]) => h >= 12 && h < 18)
        .reduce((sum, [, c]) => sum + c, 0),
      eveningActivity: Array.from(hourlyMap.entries())
        .filter(([h]) => h >= 18 && h < 24)
        .reduce((sum, [, c]) => sum + c, 0),
      nightActivity: Array.from(hourlyMap.entries())
        .filter(([h]) => h >= 0 && h < 6)
        .reduce((sum, [, c]) => sum + c, 0),
    },
  }
}

export default async function TimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { hourly, daily, stats } = await getTimeStats(user.id)

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Time Analytics</h1>
        <p className="text-slate-400">Your coding activity patterns</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Peak Hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatHour(stats.peakHour)}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Peak Day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.peakDay}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Day Activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {(stats.morningActivity + stats.afternoonActivity).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500">6 AM - 6 PM</p>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Night Activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-400">
              {(stats.eveningActivity + stats.nightActivity).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500">6 PM - 6 AM</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Hourly Activity</CardTitle>
            <CardDescription className="text-slate-400">
              Tool usage by hour of day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyChart data={hourly} />
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Activity Heatmap</CardTitle>
            <CardDescription className="text-slate-400">
              Daily activity over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={daily} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
