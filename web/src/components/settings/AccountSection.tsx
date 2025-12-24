'use client'

import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'

interface AccountSectionProps {
  user: User
}

export function AccountSection({ user }: AccountSectionProps) {
  const initials = user.email
    ?.split('@')[0]
    .slice(0, 2)
    .toUpperCase() || 'U'

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-white">Account</CardTitle>
        <CardDescription className="text-slate-400">
          Your account information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-slate-600 text-white text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-medium text-white">{user.email}</p>
            <p className="text-sm text-slate-400">
              Member since {format(new Date(user.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
