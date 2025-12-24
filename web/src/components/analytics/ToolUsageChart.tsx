'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ToolUsageChartProps {
  data: { name: string; count: number }[]
}

const COLORS = [
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#6ee7b7', // emerald-300
  '#a7f3d0', // emerald-200
  '#059669', // emerald-600
  '#047857', // emerald-700
  '#065f46', // emerald-800
  '#064e3b', // emerald-900
]

export function ToolUsageChart({ data }: ToolUsageChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No tool usage data yet. Sync your analytics to see data here.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis type="number" stroke="#6b7280" fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#6b7280"
          fontSize={12}
          width={100}
          tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#10b981' }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
