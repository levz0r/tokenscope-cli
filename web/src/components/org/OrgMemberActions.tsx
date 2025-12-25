'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Shield, UserMinus, Loader2 } from 'lucide-react'

interface OrgMemberActionsProps {
  memberId: string
  orgId: string
  currentRole: string
  isOwner: boolean
}

export function OrgMemberActions({ memberId, orgId, currentRole, isOwner }: OrgMemberActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRoleChange = async (newRole: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/org/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update role')
      }

      router.refresh()
    } catch (err) {
      console.error('Error updating role:', err)
      alert(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this member from the organization?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/org/members/${memberId}?orgId=${orgId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      router.refresh()
    } catch (err) {
      console.error('Error removing member:', err)
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
          <MoreHorizontal className="h-4 w-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10">
        {isOwner && (
          <>
            {currentRole === 'member' && (
              <DropdownMenuItem
                onClick={() => handleRoleChange('admin')}
                className="text-white hover:bg-white/10 cursor-pointer"
              >
                <Shield className="mr-2 h-4 w-4 text-blue-400" />
                Make Admin
              </DropdownMenuItem>
            )}
            {currentRole === 'admin' && (
              <DropdownMenuItem
                onClick={() => handleRoleChange('member')}
                className="text-white hover:bg-white/10 cursor-pointer"
              >
                <Shield className="mr-2 h-4 w-4 text-gray-400" />
                Remove Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
          </>
        )}
        <DropdownMenuItem
          onClick={handleRemove}
          className="text-red-400 hover:bg-red-500/10 cursor-pointer"
        >
          <UserMinus className="mr-2 h-4 w-4" />
          Remove from Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
