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
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
]

export function ToolUsageChart({ data }: ToolUsageChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-500">
        No tool usage data yet. Sync your analytics to see data here.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
        <XAxis type="number" stroke="#64748b" fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#64748b"
          fontSize={12}
          width={100}
          tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#f1f5f9' }}
          itemStyle={{ color: '#94a3b8' }}
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
