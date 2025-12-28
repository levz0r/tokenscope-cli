'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Github, ExternalLink, RefreshCw, Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight, Bot, GitCommit } from 'lucide-react'
import { buttonStyles } from '@/lib/styles'
import { CommitSparkline } from './CommitSparkline'

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

interface Commit {
  commit_sha: string
  commit_message: string
  author_name: string
  is_ai_generated: boolean
  ai_tool: 'claude-code' | null
  committed_at: string
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const searchParams = useSearchParams()

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
      setNotification({ type: 'success', message: 'Repositories synced successfully' })
    } catch (e) {
      console.error('Sync failed:', e)
      setNotification({ type: 'error', message: 'Failed to sync repositories' })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Check for connection status in URL params
    const github = searchParams.get('github')
    const errorParam = searchParams.get('error')

    if (github === 'connected') {
      setNotification({ type: 'success', message: 'GitHub connected successfully!' })
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        github_error: 'Failed to connect GitHub. Please try again.',
        missing_installation: 'Installation ID missing. Please reinstall the app.',
        no_account: 'Could not retrieve GitHub account information.',
        save_failed: 'Failed to save installation. Please try again.',
      }
      setNotification({ type: 'error', message: errorMessages[errorParam] || 'An error occurred.' })
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

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
      {/* Notification Banner */}
      {notification && (
        <div
          className={`px-4 py-3 flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-b border-emerald-500/20'
              : 'bg-red-500/10 border-b border-red-500/20'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span
            className={`text-sm ${
              notification.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {notification.message}
          </span>
        </div>
      )}
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
  const [expanded, setExpanded] = useState(false)
  const [commits, setCommits] = useState<Commit[]>([])
  const [loadingCommits, setLoadingCommits] = useState(false)
  const [defaultBranch, setDefaultBranch] = useState('main')
  const percentage = repo.ai_percentage

  const fetchCommits = async () => {
    if (commits.length > 0) return // Already loaded
    setLoadingCommits(true)
    try {
      const response = await fetch(`/api/github/repos/${repo.id}/commits`)
      if (response.ok) {
        const data = await response.json()
        setCommits(data.commits || [])
        setDefaultBranch(data.default_branch || 'main')
      }
    } catch (e) {
      console.error('Failed to fetch commits:', e)
    } finally {
      setLoadingCommits(false)
    }
  }

  const handleToggle = () => {
    if (!expanded) {
      fetchCommits()
    }
    setExpanded(!expanded)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const truncateMessage = (msg: string, maxLen: number = 50) => {
    const firstLine = msg.split('\n')[0]
    if (firstLine.length <= maxLen) return firstLine
    return firstLine.substring(0, maxLen) + '...'
  }

  return (
    <div className="border border-white/5 rounded-lg">
      {/* Header - clickable to expand */}
      <div
        className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors cursor-pointer overflow-visible"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <a
              href={`https://github.com/${repo.repo_full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white hover:underline truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              {repo.repo_full_name}
            </a>
            {repo.analysis && (
              <p className="text-sm text-gray-500">
                {repo.analysis.ai_commits} / {repo.analysis.total_commits} commits by AI
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <CommitSparkline repoId={repo.id} />
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

      {/* Expanded commits list */}
      {expanded && (
        <div className="border-t border-white/5 bg-white/[0.01]">
          {loadingCommits ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Loading commits...
            </div>
          ) : commits.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No commits found</div>
          ) : (
            <div className="divide-y divide-white/5">
              {commits.map((commit) => (
                <div key={commit.commit_sha} className="px-4 py-2 flex items-center gap-3 hover:bg-white/5">
                  <GitCommit className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://github.com/${repo.repo_full_name}/commit/${commit.commit_sha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white hover:underline truncate"
                      >
                        {truncateMessage(commit.commit_message)}
                      </a>
                      {commit.ai_tool === 'claude-code' && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded flex-shrink-0">
                          <Bot className="h-3 w-3" />
                          Claude
                        </span>
                      )}
                      {commit.is_ai_generated && !commit.ai_tool && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded flex-shrink-0">
                          <Bot className="h-3 w-3" />
                          AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-mono text-gray-600">{commit.commit_sha.slice(0, 7)}</span>
                      <span>·</span>
                      <span>{commit.author_name}</span>
                      <span>·</span>
                      <span>{formatDate(commit.committed_at)}</span>
                      <span>·</span>
                      <span className="font-mono">{defaultBranch}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
