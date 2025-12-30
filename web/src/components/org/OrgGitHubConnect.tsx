'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buttonStyles } from '@/lib/styles'
import { Github, ExternalLink, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface OrgGitHubConnectProps {
  orgId: string
  orgName: string
  userRole: 'owner' | 'admin' | 'member'
}

interface GitHubStatus {
  connected: boolean
  canManage: boolean
  installation?: {
    id: string
    github_org_name: string
    github_org_id: number
    connected_by: string
    connected_at: string
    repo_count: number
  }
}

export function OrgGitHubConnect({ orgId, orgName, userRole }: OrgGitHubConnectProps) {
  const [status, setStatus] = useState<GitHubStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const searchParams = useSearchParams()

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/org/${orgId}/github`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (e) {
      console.error('Failed to fetch GitHub status:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Check for connection status in URL params
    const github = searchParams.get('github')
    const errorParam = searchParams.get('error')

    if (github === 'connected') {
      setNotification({ type: 'success', message: 'GitHub organization connected successfully!' })
      // Clean up URL
      window.history.replaceState({}, '', `/org/${orgId}`)
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        github_error: 'Failed to connect GitHub. Please try again.',
        not_github_org: 'Please select a GitHub organization, not a personal account.',
        github_org_taken: 'This GitHub organization is already connected to another TokenScope org.',
        unauthorized: 'You must be an owner or admin to manage GitHub connections.',
        no_account: 'Could not retrieve GitHub account information.',
        save_failed: 'Failed to save installation. Please try again.',
      }
      setNotification({ type: 'error', message: errorMessages[errorParam] || 'An error occurred.' })
      window.history.replaceState({}, '', `/org/${orgId}`)
    }
  }, [orgId, searchParams])

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleConnect = () => {
    // Redirect to GitHub App installation with org state
    window.location.href = `https://github.com/apps/tokenscope/installations/new?state=org:${orgId}`
  }

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true)
      const response = await fetch(`/api/org/${orgId}/github`, { method: 'DELETE' })
      if (response.ok) {
        setNotification({ type: 'success', message: 'GitHub disconnected successfully.' })
        await fetchStatus()
        setDialogOpen(false)
      } else {
        const data = await response.json()
        setNotification({ type: 'error', message: data.error || 'Failed to disconnect.' })
      }
    } catch (e) {
      console.error('Failed to disconnect:', e)
      setNotification({ type: 'error', message: 'Failed to disconnect GitHub.' })
    } finally {
      setDisconnecting(false)
    }
  }

  const canManage = userRole === 'owner' || userRole === 'admin'

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
          <div className="animate-pulse h-16 bg-white/5 rounded" />
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
        <CardTitle className="flex items-center gap-2 text-white">
          <Github className="h-5 w-5" />
          GitHub Integration
        </CardTitle>
        <CardDescription className="text-gray-500">
          {status?.connected
            ? `Connected to GitHub organization: ${status.installation?.github_org_name}`
            : 'Connect a GitHub organization to track AI-generated code across your repos'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status?.connected && status.installation ? (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    {status.installation.github_org_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {status.installation.repo_count} repositories tracked
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Connected by {status.installation.connected_by} on{' '}
                    {new Date(status.installation.connected_at).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={`https://github.com/${status.installation.github_org_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {canManage && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0a0a0a] border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-white">Disconnect GitHub</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      This will disconnect the GitHub organization from {orgName}.
                      Repository data will be deleted, but can be re-synced by reconnecting.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                      disabled={disconnecting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDisconnect}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={disconnecting}
                    >
                      {disconnecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : canManage ? (
          <Button onClick={handleConnect} className={buttonStyles.primary}>
            <Github className="h-4 w-4 mr-2" />
            Connect GitHub Organization
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <p className="text-sm text-gray-500">
            Only organization owners and admins can connect GitHub.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
