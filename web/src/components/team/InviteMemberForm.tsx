'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, CheckCircle, Copy } from 'lucide-react'

interface InviteMemberFormProps {
  teamId: string
}

export function InviteMemberForm({ teamId }: InviteMemberFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    setInviteUrl(null)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, email, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send invite')
      } else {
        setSuccess(true)
        setInviteUrl(data.invite.inviteUrl)
        setEmail('')
      }
    } catch {
      setError('Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  async function copyInviteUrl() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          required
          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send Invite
            </>
          )}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {success && inviteUrl && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-400 font-medium">Invite created!</span>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            Share this link with the invitee:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={copyInviteUrl}
              className="border-slate-600"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
