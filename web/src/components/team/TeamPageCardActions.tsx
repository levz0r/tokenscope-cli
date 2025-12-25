'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Users } from 'lucide-react'

interface TeamPageCardActionsProps {
  teamId: string
  canManage: boolean
}

export function TeamPageCardActions({ teamId, canManage }: TeamPageCardActionsProps) {
  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Link href={`/team/${teamId}`} className="flex-1">
          <Button variant="outline" className="w-full border-white/10 bg-white/10/50 hover:bg-white/15 text-white">
            View Dashboard
          </Button>
        </Link>
        {canManage && (
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
        )}
      </div>
    </TooltipProvider>
  )
}
