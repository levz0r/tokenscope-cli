'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, FileCode, GitBranch, Plus, Minus, Folder, Plug, CheckCircle } from 'lucide-react'

interface SummaryCardsProps {
  sessions: number
  toolUses: number
  linesAdded: number
  linesRemoved: number
  gitOps: number
  uniqueFiles: number
  mcpCalls?: number
  successRate?: number
}

export function SummaryCards({
  sessions,
  toolUses,
  linesAdded,
  linesRemoved,
  gitOps,
  uniqueFiles,
  mcpCalls = 0,
  successRate = 100,
}: SummaryCardsProps) {
  const cards = [
    {
      title: 'Sessions',
      value: sessions,
      icon: Activity,
      description: 'Last 30 days',
      color: 'text-blue-400',
    },
    {
      title: 'Tool Calls',
      value: toolUses.toLocaleString(),
      icon: FileCode,
      description: 'Total invocations',
      color: 'text-green-400',
    },
    {
      title: 'Lines Added',
      value: `+${linesAdded.toLocaleString()}`,
      icon: Plus,
      description: 'Code written',
      color: 'text-emerald-400',
    },
    {
      title: 'Lines Removed',
      value: `-${linesRemoved.toLocaleString()}`,
      icon: Minus,
      description: 'Code deleted',
      color: 'text-red-400',
    },
    {
      title: 'Files Modified',
      value: uniqueFiles,
      icon: Folder,
      description: 'Unique files',
      color: 'text-purple-400',
    },
    {
      title: 'Git Operations',
      value: gitOps,
      icon: GitBranch,
      description: 'Commits, pushes, etc.',
      color: 'text-orange-400',
    },
    {
      title: 'MCP Calls',
      value: mcpCalls,
      icon: Plug,
      description: 'External integrations',
      color: 'text-cyan-400',
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      icon: CheckCircle,
      description: 'Tool call success',
      color: successRate >= 95 ? 'text-green-400' : successRate >= 80 ? 'text-yellow-400' : 'text-red-400',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-slate-700 bg-slate-800/50">
          <CardHeader className="flex flex-row items-start justify-between pb-2 h-14">
            <CardTitle className="text-sm font-medium text-slate-400">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color} shrink-0`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <p className="text-xs text-slate-500 truncate">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
