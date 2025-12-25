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

interface DeleteOrgButtonProps {
  orgId: string
  orgName: string
}

export function DeleteOrgButton({ orgId, orgName }: DeleteOrgButtonProps) {
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleDelete = async () => {
    if (confirmName !== orgName) {
      setError('Organization name does not match')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/org/${orgId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete organization')
      }

      setOpen(false)
      router.push('/org')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0a0a0a] border-red-500/20">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-white">Delete Organization</DialogTitle>
              <DialogDescription className="text-gray-400">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              This will permanently delete the organization <strong>{orgName}</strong>,
              all its teams, and remove all members. Session data will be preserved but
              unlinked from teams.
            </p>
          </div>
          <div>
            <Label htmlFor="confirm" className="text-gray-300">
              Type <span className="font-mono text-white">{orgName}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={orgName}
              className="mt-2 bg-[#0a0a0a] border-white/5 text-gray-300"
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={loading || confirmName !== orgName}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
