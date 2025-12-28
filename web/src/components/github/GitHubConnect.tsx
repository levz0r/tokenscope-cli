'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Github, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import { buttonStyles } from '@/lib/styles'

interface Installation {
  id: string
  github_username: string
  connected_at: string
}

interface Repo {
  id: string
  repo_full_name: string
  repo_name: string
  is_active: boolean
  last_push_at: string | null
  ai_percentage: number
  analysis: {
    total_commits: number
    ai_commits: number
    ai_lines_added: number
    ai_lines_removed: number
  } | null
}

interface GitHubData {
  connected: boolean
  installations: Installation[]
  repos: Repo[]
}

export function GitHubConnect() {
  const [data, setData] = useState<GitHubData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/github/repos')
      if (!response.ok) throw new Error('Failed to fetch')
      const json = await response.json()
      setData(json)
    } catch (e) {
      setError('Failed to load GitHub data')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/github/sync', { method: 'POST' })
      if (!response.ok) throw new Error('Sync failed')
      // Refresh data after sync
      await fetchData()
    } catch (e) {
      console.error('Sync failed:', e)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleConnect = () => {
    // Redirect to GitHub App installation
    window.location.href = 'https://github.com/apps/tokenscope/installations/new'
  }

  if (loading) {
    return (
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Github className="h-5 w-5" />
            GitHub Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-white/5 rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Github className="h-5 w-5" />
            GitHub Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data?.connected) {
    return (
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Github className="h-5 w-5" />
            GitHub Integration
          </CardTitle>
          <CardDescription className="text-gray-500">
            Connect your GitHub account to track AI-generated code across your repositories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect} className={buttonStyles.primary}>
            <Github className="h-4 w-4 mr-2" />
            Connect GitHub
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/5 bg-white/[0.02]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Github className="h-5 w-5" />
              GitHub Repositories
            </CardTitle>
            <CardDescription className="text-gray-500">
              Connected as @{data.installations[0]?.github_username}
            </CardDescription>
          </div>
          <Button
            onClick={handleSync}
            variant="outline"
            size="sm"
            disabled={syncing}
            className={buttonStyles.primary}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.repos.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No repositories found. Push some code to see AI contribution metrics.
          </p>
        ) : (
          <div className="space-y-3">
            {data.repos.map(repo => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RepoCard({ repo }: { repo: Repo }) {
  const percentage = repo.ai_percentage

  return (
    <div className="flex items-center justify-between p-3 border border-white/5 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex-1 min-w-0">
        <a
          href={`https://github.com/${repo.repo_full_name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-white hover:underline truncate block"
        >
          {repo.repo_full_name}
        </a>
        {repo.analysis && (
          <p className="text-sm text-gray-500">
            {repo.analysis.ai_commits} / {repo.analysis.total_commits} commits by AI
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 ml-4">
        {/* AI Percentage Bar */}
        <div className="w-24">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-emerald-400">{percentage}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
