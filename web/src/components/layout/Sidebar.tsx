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
  Users,
  Settings,
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
]

const secondaryNavigation = [
  {
    name: 'Team',
    href: '/team',
    icon: Users,
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
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 border-r border-slate-700 bg-slate-800/50">
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
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="mt-auto space-y-1 pt-4 border-t border-slate-700">
          {secondaryNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
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
