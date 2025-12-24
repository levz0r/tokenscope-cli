'use client'

import { useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { formatDistanceToNow, format } from 'date-fns'
import { ArrowUpDown, Clock, Folder, GitBranch, Terminal, FileCode } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface Session {
  id: string
  local_session_id: string
  project_name: string | null
  start_time: string
  end_time: string | null
  source: string | null
  reason: string | null
  tool_uses: { count: number }[]
  file_changes: { count: number }[]
  git_operations: { count: number }[]
}

const columns: ColumnDef<Session>[] = [
  {
    accessorKey: 'project_name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <Folder className="mr-2 h-4 w-4" />
        Project
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Folder className="h-4 w-4 text-slate-500" />
        <span className="text-white font-medium">
          {row.getValue('project_name') || 'Unknown'}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'start_time',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <Clock className="mr-2 h-4 w-4" />
        Started
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const startTime = row.getValue('start_time') as string
      return (
        <div className="text-slate-300">
          <div>{format(new Date(startTime), 'MMM d, yyyy')}</div>
          <div className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(startTime), { addSuffix: true })}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => {
      const startTime = new Date(row.original.start_time)
      const endTime = row.original.end_time ? new Date(row.original.end_time) : new Date()
      const durationMs = endTime.getTime() - startTime.getTime()
      const minutes = Math.floor(durationMs / 60000)
      const hours = Math.floor(minutes / 60)

      if (hours > 0) {
        return <span className="text-slate-300">{hours}h {minutes % 60}m</span>
      }
      return <span className="text-slate-300">{minutes}m</span>
    },
  },
  {
    accessorKey: 'tool_uses',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <Terminal className="mr-2 h-4 w-4" />
        Tools
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const count = row.original.tool_uses?.[0]?.count || 0
      return (
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-blue-400" />
          <span className="text-white">{count}</span>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.tool_uses?.[0]?.count || 0
      const b = rowB.original.tool_uses?.[0]?.count || 0
      return a - b
    },
  },
  {
    accessorKey: 'file_changes',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <FileCode className="mr-2 h-4 w-4" />
        Files
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const count = row.original.file_changes?.[0]?.count || 0
      return (
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-green-400" />
          <span className="text-white">{count}</span>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.file_changes?.[0]?.count || 0
      const b = rowB.original.file_changes?.[0]?.count || 0
      return a - b
    },
  },
  {
    accessorKey: 'git_operations',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <GitBranch className="mr-2 h-4 w-4" />
        Git
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const count = row.original.git_operations?.[0]?.count || 0
      return (
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-orange-400" />
          <span className="text-white">{count}</span>
        </div>
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.git_operations?.[0]?.count || 0
      const b = rowB.original.git_operations?.[0]?.count || 0
      return a - b
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = !row.original.end_time
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            isActive
              ? 'bg-green-500/10 text-green-400'
              : 'bg-slate-500/10 text-slate-400'
          }`}
        >
          {isActive ? 'Active' : 'Completed'}
        </span>
      )
    },
  },
]

interface SessionsTableProps {
  sessions: Session[]
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'start_time', desc: true },
  ])

  const table = useReactTable({
    data: sessions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-slate-600 mb-4" />
        <p className="text-slate-400">No sessions yet</p>
        <p className="text-sm text-slate-500">
          Sync your analytics to see session history
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-700">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-slate-700 hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-slate-400">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="border-slate-700 hover:bg-slate-800/50"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
