'use client'

import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'

interface NavbarProps {
  user: User
  profile: {
    email: string
    api_key: string
    name?: string | null
  } | null
}

export function Navbar({ user, profile }: NavbarProps) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = profile?.name || user.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur">
      <div className="flex h-14 items-center px-4 justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-white hover:text-emerald-400 transition-colors">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xs">
            TS
          </div>
          TokenScope
        </Link>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-white/5">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/20">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#0a0a0a] border-white/10" align="end">
              <DropdownMenuLabel className="text-gray-400">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-white">{displayName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => router.push('/settings')}
                className="text-gray-400 focus:bg-white/5 focus:text-white cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/settings#api-key')}
                className="text-gray-400 focus:bg-white/5 focus:text-white cursor-pointer"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                API Key
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-400 focus:bg-white/5 focus:text-red-300 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
