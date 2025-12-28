'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, GitCommit, Code, TrendingUp } from 'lucide-react'

interface RepoAnalysisProps {
  repoId: string
}

interface AnalysisData {
  repo: {
    id: string
    full_name: string
    name: string
    default_branch: string
    last_push_at: string | null
  }
  analysis: {
    total_commits: number
    ai_commits: number
    total_lines: number | null
    ai_lines_added: number
    ai_lines_removed: number
    ai_percentage: number
  } | null
  commits: Array<{
    commit_sha: string
    commit_message: string
    author_name: string
    is_ai_generated: boolean
    committed_at: string
  }>
  history: Array<{
    snapshot_date: string
    ai_percentage: number
  }>
}

export function RepoAnalysis({ repoId }: RepoAnalysisProps) {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/github/repos/${repoId}`)
        if (!response.ok) throw new Error('Failed to fetch')
        const json = await response.json()
        setData(json)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [repoId])

  if (loading) {
    return <div className="animate-pulse h-40 bg-slate-100 dark:bg-slate-800 rounded" />
  }

  if (!data) {
    return <p className="text-muted-foreground">Failed to load analysis</p>
  }

  const { analysis, commits } = data
  const percentage = analysis?.ai_percentage || 0

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="AI Contribution"
          value={`${percentage}%`}
          icon={<Bot className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          title="AI Commits"
          value={analysis?.ai_commits?.toLocaleString() || '0'}
          subtitle={`of ${analysis?.total_commits?.toLocaleString() || 0}`}
          icon={<GitCommit className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          title="Lines Added"
          value={`+${analysis?.ai_lines_added?.toLocaleString() || '0'}`}
          icon={<Code className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          title="Lines Removed"
          value={`-${analysis?.ai_lines_removed?.toLocaleString() || '0'}`}
          icon={<Code className="h-4 w-4" />}
          color="red"
        />
      </div>

      {/* AI Percentage Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Code Authorship</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-8 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-700"
              style={{ width: `${percentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-4 text-sm font-medium">
              <span className={percentage > 50 ? 'text-white' : 'text-slate-700 dark:text-slate-300'}>
                AI: {percentage}%
              </span>
              <span className={percentage < 50 ? 'text-slate-700 dark:text-slate-300' : 'text-white'}>
                Human: {100 - percentage}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent AI Commits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Recent AI-Generated Commits
          </CardTitle>
          <CardDescription>
            Commits with Claude Code co-authorship
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commits.filter(c => c.is_ai_generated).length === 0 ? (
            <p className="text-muted-foreground text-sm">No AI commits found yet</p>
          ) : (
            <div className="space-y-2">
              {commits
                .filter(c => c.is_ai_generated)
                .slice(0, 10)
                .map(commit => (
                  <div
                    key={commit.commit_sha}
                    className="p-2 border rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <p className="font-medium truncate">{commit.commit_message.split('\n')[0]}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {commit.commit_sha.substring(0, 7)} · {new Date(commit.committed_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend (placeholder - would use a chart library) */}
      {data.history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              AI Contribution Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {data.history.map((point, i) => (
                <div
                  key={point.snapshot_date}
                  className="flex-1 bg-emerald-500 rounded-t transition-all"
                  style={{ height: `${point.ai_percentage}%` }}
                  title={`${point.snapshot_date}: ${point.ai_percentage}%`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{data.history[0]?.snapshot_date}</span>
              <span>{data.history[data.history.length - 1]?.snapshot_date}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: 'emerald' | 'blue' | 'green' | 'red'
}) {
  const colorClasses = {
    emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/20',
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded ${colorClasses[color]}`}>
            {icon}
          </div>
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
