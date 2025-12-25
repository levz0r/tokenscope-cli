'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { buttonStyles, inputStyles } from '@/lib/styles'

interface Organization {
  id: string
  name: string
  role: string
}

interface CreateTeamButtonProps {
  variant?: 'default' | 'large'
}

export function CreateTeamButton({ variant = 'default' }: CreateTeamButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [orgId, setOrgId] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (open) {
      fetchOrganizations()
    }
  }, [open])

  const fetchOrganizations = async () => {
    setLoadingOrgs(true)
    try {
      const response = await fetch('/api/org')
      const data = await response.json()
      if (response.ok) {
        // Only show orgs where user is owner or admin (can create teams)
        const canCreateTeamsIn = data.organizations?.filter(
          (org: Organization) => org.role === 'owner' || org.role === 'admin'
        ) || []
        setOrganizations(canCreateTeamsIn)
        if (canCreateTeamsIn.length === 1) {
          setOrgId(canCreateTeamsIn[0].id)
        }
      }
    } catch (err) {
      console.error('Error fetching organizations:', err)
    } finally {
      setLoadingOrgs(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, orgId }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        throw new Error(errorMsg || 'Failed to create team')
      }

      setOpen(false)
      setName('')
      setOrgId('')
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
            Create Your First Team
          </Button>
        ) : (
          <Button variant="outline" className={buttonStyles.primary}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#0a0a0a] border-white/5">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Create a new team</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a team within an organization. You&apos;ll be the team owner.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {loadingOrgs ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading organizations...
              </div>
            ) : organizations.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-400">
                  You need to create an organization first, or be an admin of an existing organization to create teams.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="org" className="text-gray-300">
                    Organization
                  </Label>
                  <Select value={orgId} onValueChange={setOrgId} disabled={loading}>
                    <SelectTrigger className={`mt-2 ${inputStyles.default}`}>
                      <SelectValue placeholder="Select an organization" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-white/10">
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id} className="text-white hover:bg-white/10">
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name" className="text-gray-300">
                    Team name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Team"
                    className={`mt-2 ${inputStyles.default}`}
                    disabled={loading}
                  />
                </div>
              </>
            )}
            {error && (
              <p className="text-sm text-red-400">{error}</p>
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
              disabled={loading || !name.trim() || !orgId || organizations.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
