'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MoreVertical, Shield, User, UserMinus, Loader2 } from 'lucide-react'

interface MemberActionsProps {
  memberId: string
  memberRole: 'admin' | 'member'
  teamId: string
  currentUserRole: 'owner' | 'admin'
}

export function MemberActions({ memberId, memberRole, teamId, currentUserRole }: MemberActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRoleChange(newRole: 'admin' | 'member') {
    setLoading(true)
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  async function handleRemove() {
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/team/members/${memberId}?teamId=${teamId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  // Admins can only remove members, not other admins
  const canRemove = currentUserRole === 'owner' || (currentUserRole === 'admin' && memberRole === 'member')
  const canChangeRole = currentUserRole === 'owner'

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-400 hover:text-white"
        onClick={() => setOpen(!open)}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MoreVertical className="h-4 w-4" />
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20 py-1">
            {canChangeRole && (
              <>
                {memberRole === 'member' ? (
                  <button
                    onClick={() => handleRoleChange('admin')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-slate-300 hover:bg-slate-700"
                  >
                    <Shield className="h-4 w-4 text-blue-400" />
                    Make Admin
                  </button>
                ) : (
                  <button
                    onClick={() => handleRoleChange('member')}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-slate-300 hover:bg-slate-700"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    Make Member
                  </button>
                )}
              </>
            )}
            {canRemove && (
              <button
                onClick={handleRemove}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-slate-700"
              >
                <UserMinus className="h-4 w-4" />
                Remove from Team
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
