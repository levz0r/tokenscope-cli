'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface DeleteTeamButtonProps {
  teamId: string
  teamName: string
}

export function DeleteTeamButton({ teamId, teamName }: DeleteTeamButtonProps) {
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDelete = async () => {
    if (confirmName !== teamName) {
      setError('Team name does not match')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/team/${teamId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        throw new Error(errorMsg || 'Failed to delete team')
      }

      setOpen(false)
      router.push('/team')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        setConfirmName('')
        setError('')
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Team
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Team
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            This action cannot be undone. This will permanently delete the team
            <span className="font-semibold text-white"> {teamName}</span> and remove all
            associated data including sessions, analytics, and member associations.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="confirmName" className="text-slate-300">
            Type <span className="font-mono text-red-400">{teamName}</span> to confirm
          </Label>
          <Input
            id="confirmName"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Enter team name"
            className="mt-2 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
            disabled={loading}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
            disabled={loading || confirmName !== teamName}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Team'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
