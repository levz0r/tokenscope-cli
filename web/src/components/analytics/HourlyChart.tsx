'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface HourlyData {
  hour: number
  count: number
  label: string
}

interface HourlyChartProps {
  data: HourlyData[]
}

export function HourlyChart({ data }: HourlyChartProps) {
  const maxCount = Math.max(...data.map(d => d.count))

  const getBarColor = (hour: number) => {
    if (hour >= 6 && hour < 12) return '#f59e0b' // Morning - amber
    if (hour >= 12 && hour < 18) return '#10b981' // Afternoon - emerald
    if (hour >= 18 && hour < 22) return '#6366f1' // Evening - indigo
    return '#64748b' // Night - slate
  }

  if (data.every(d => d.count === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-slate-400">No activity data yet</p>
        <p className="text-sm text-slate-500">
          Sync your analytics to see hourly patterns
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          stroke="#64748b"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          interval={2}
        />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => value.toLocaleString()}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f1f5f9',
          }}
          labelFormatter={(label) => `Time: ${label}`}
          formatter={(value) => [(value as number).toLocaleString(), 'Tool calls']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.hour)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
