'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Users, FolderKanban } from 'lucide-react'

interface OrgCardActionsProps {
  orgId: string
  canManageMembers: boolean
}

export function OrgCardActions({ orgId, canManageMembers }: OrgCardActionsProps) {
  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Link href={`/org/${orgId}`} className="flex-1">
          <Button variant="outline" className="w-full border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
            View Dashboard
          </Button>
        </Link>
        {canManageMembers && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/org/${orgId}/members`}>
                <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                  <Users className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Manage Members</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={`/org/${orgId}/teams`}>
              <Button variant="outline" className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
                <FolderKanban className="h-4 w-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Teams</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
