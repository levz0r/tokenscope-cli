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
import { Plus, Loader2 } from 'lucide-react'
import { buttonStyles, inputStyles } from '@/lib/styles'

interface CreateOrgButtonProps {
  variant?: 'default' | 'large'
}

export function CreateOrgButton({ variant = 'default' }: CreateOrgButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        throw new Error(errorMsg || 'Failed to create organization')
      }

      setOpen(false)
      setName('')
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
        {variant === 'large' ? (
          <Button variant="outline" className={buttonStyles.primary}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Organization
          </Button>
        ) : (
          <Button variant="outline" className={buttonStyles.primary}>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#0a0a0a] border-white/5">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Create a new organization</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create an organization to manage multiple teams. You&apos;ll be the organization owner.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name" className="text-gray-300">
              Organization name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Company"
              className={`mt-2 ${inputStyles.default}`}
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
              className={buttonStyles.primary}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              className={buttonStyles.primary}
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
