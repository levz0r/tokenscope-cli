'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface InviteDetails {
  email: string
  role: string
  teamName: string
  expiresAt: string
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [acceptedTeam, setAcceptedTeam] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return

    async function fetchInvite() {
      try {
        const res = await fetch(`/api/team/invite/${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to load invite')
        } else {
          setInvite(data.invite)
        }
      } catch {
        setError('Failed to load invite')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  async function handleAccept() {
    if (!token) return

    setAccepting(true)
    try {
      const res = await fetch(`/api/team/invite/${token}`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to accept invite')
      } else {
        setAccepted(true)
        setAcceptedTeam(data.team)
      }
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
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
            <p className="mt-4 text-gray-400">Loading invite...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Invalid Invite</h2>
            <p className="text-gray-400 text-center mb-6">{error}</p>
            <Link href="/login">
              <Button variant="outline" className="border-white/10 text-gray-300">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepted && acceptedTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/5 bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-emerald-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Welcome to {acceptedTeam.name}!</h2>
            <p className="text-gray-400 text-center mb-6">
              You've successfully joined the team.
            </p>
            <Link href={`/team/${acceptedTeam.id}`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Go to Team Dashboard
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
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-white">Team Invitation</CardTitle>
          <CardDescription className="text-gray-400">
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-[#0a0a0a] rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Team</p>
              <p className="text-lg font-medium text-white">{invite?.teamName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
              <p className="text-white capitalize">{invite?.role}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Invited Email</p>
              <p className="text-white">{invite?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Make sure you're logged in with {invite?.email} to accept this invite.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
