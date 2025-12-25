'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface InviteDetails {
  email: string
  role: string
  orgName: string
  expiresAt: string
}

export default function OrgInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ token }) => setToken(token))
  }, [params])

  useEffect(() => {
    if (!token) return

    async function fetchInvite() {
      try {
        const response = await fetch(`/api/org/invite/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invite')
          return
        }

        setInvite(data.invite)
      } catch {
        setError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  const handleAccept = async () => {
    if (!token) return

    setAccepting(true)
    try {
      const response = await fetch(`/api/org/invite/${token}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite')
        return
      }

      setAccepted(true)
      setOrgId(data.orgId)

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/org/${data.orgId}`)
      }, 2000)
    } catch {
      setError('Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Card className="w-full max-w-md border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading invite...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/20 bg-red-500/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <X className="h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Invalid Invite</h3>
            <p className="text-gray-400 text-center mb-6">{error}</p>
            <Link href="/login">
              <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Check className="h-12 w-12 text-emerald-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Welcome to {invite?.orgName}!</h3>
            <p className="text-gray-400 text-center mb-6">
              You&apos;ve joined as {invite?.role}. Redirecting to the organization dashboard...
            </p>
            <Link href={`/org/${orgId}`}>
              <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/5 bg-white/[0.02]">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-purple-400" />
          </div>
          <CardTitle className="text-white">Organization Invite</CardTitle>
          <CardDescription className="text-gray-400">
            You&apos;ve been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-[#0a0a0a] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Organization</p>
              <p className="text-lg font-medium text-white">{invite?.orgName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#0a0a0a] rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Your Role</p>
                <p className="text-lg font-medium text-white capitalize">{invite?.role}</p>
              </div>
              <div className="p-4 bg-[#0a0a0a] rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Expires</p>
                <p className="text-lg font-medium text-white">
                  {invite?.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
            <div className="p-4 bg-[#0a0a0a] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Invited Email</p>
              <p className="text-lg font-medium text-white">{invite?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invite'
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Make sure you&apos;re logged in with {invite?.email} to accept this invite.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
