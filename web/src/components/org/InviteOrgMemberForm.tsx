'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Copy, Check } from 'lucide-react'
import { buttonStyles, inputStyles } from '@/lib/styles'

interface InviteOrgMemberFormProps {
  orgId: string
}

export function InviteOrgMemberForm({ orgId }: InviteOrgMemberFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInviteUrl('')
    setLoading(true)

    try {
      const response = await fetch('/api/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, email, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setInviteUrl(data.invite.inviteUrl)
      setEmail('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label htmlFor="email" className="text-gray-300">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className={`mt-2 ${inputStyles.default}`}
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="role" className="text-gray-300">
            Role
          </Label>
          <Select value={role} onValueChange={setRole} disabled={loading}>
            <SelectTrigger className={`mt-2 ${inputStyles.default}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-white/10">
              <SelectItem value="member" className="text-white hover:bg-white/10">
                Member
              </SelectItem>
              <SelectItem value="admin" className="text-white hover:bg-white/10">
                Admin
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {inviteUrl && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-sm text-emerald-400 mb-2">Invite created! Share this link:</p>
          <div className="flex gap-2">
            <Input
              value={inviteUrl}
              readOnly
              className={inputStyles.default}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className={buttonStyles.primary}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      <Button
        type="submit"
        variant="outline"
        className={buttonStyles.primary}
        disabled={loading || !email.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Invite'
        )}
      </Button>
    </form>
  )
}
