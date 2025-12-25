'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, MoreHorizontal, Pencil, Loader2 } from 'lucide-react'
import { buttonStyles, inputStyles } from '@/lib/styles'

interface TeamCardActionsProps {
  teamId: string
  teamName: string
  hasAccess: boolean
  canManage: boolean
}

export function TeamCardActions({ teamId, teamName, hasAccess, canManage }: TeamCardActionsProps) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [newName, setNewName] = useState(teamName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRename = async () => {
    if (!newName.trim() || newName === teamName) {
      setRenameOpen(false)
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/team/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to rename team')
      }

      setRenameOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!hasAccess) {
    return (
      <p className="text-center text-sm text-gray-500">
        Request access from a team admin
      </p>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Link href={`/team/${teamId}`} className="flex-1">
          <Button variant="outline" className="w-full border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
            View Dashboard
          </Button>
        </Link>
        {canManage && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/team/${teamId}/members`}>
                  <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                    <Users className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manage Members</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-white/10">
                <DropdownMenuItem
                  onClick={() => {
                    setNewName(teamName)
                    setError('')
                    setRenameOpen(true)
                  }}
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename Team
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  asChild
                  className="text-white hover:bg-white/10 cursor-pointer"
                >
                  <Link href={`/team/${teamId}`}>
                    View Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/5">
          <DialogHeader>
            <DialogTitle className="text-white">Rename Team</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter a new name for this team.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="teamName" className="text-gray-300">
              Team name
            </Label>
            <Input
              id="teamName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Team name"
              className={`mt-2 ${inputStyles.default}`}
              disabled={loading}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleRename()
                }
              }}
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
              className={buttonStyles.primary}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              variant="outline"
              className={buttonStyles.primary}
              disabled={loading || !newName.trim() || newName === teamName}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
