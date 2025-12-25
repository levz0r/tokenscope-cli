'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Activity,
  FileCode,
  Clock,
  GitBranch,
  Plug,
  FolderKanban,
  Lightbulb,
  Layers,
  Settings,
  Puzzle,
  Building2,
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Sessions',
    href: '/dashboard/sessions',
    icon: Activity,
  },
  {
    name: 'Files',
    href: '/dashboard/files',
    icon: FileCode,
  },
  {
    name: 'Time',
    href: '/dashboard/time',
    icon: Clock,
  },
  {
    name: 'Git',
    href: '/dashboard/git',
    icon: GitBranch,
  },
  {
    name: 'Projects',
    href: '/dashboard/projects',
    icon: FolderKanban,
  },
  {
    name: 'Insights',
    href: '/dashboard/insights',
    icon: Lightbulb,
  },
  {
    name: 'MCP',
    href: '/dashboard/mcp',
    icon: Plug,
  },
  {
    name: 'Plugins',
    href: '/dashboard/plugins',
    icon: Puzzle,
  },
]

const secondaryNavigation = [
  {
    name: 'Organizations',
    href: '/org',
    icon: Building2,
  },
  {
    name: 'Team',
    href: '/team',
    icon: Layers,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 border-r border-white/5 bg-white/[0.02]">
      <nav className="flex flex-col h-full p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="mt-auto space-y-1 pt-4 border-t border-white/5">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
