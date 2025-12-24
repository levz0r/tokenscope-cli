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
import { ArrowUpDown, GitBranch, GitCommit, GitMerge, GitPullRequest, Folder, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface GitOperation {
  id: string
  command: string | null
  operation_type: string
  exit_code: number
  timestamp: string
  project_name: string | null
}

function getOperationIcon(type: string) {
  const t = type?.toLowerCase() || ''
  if (t.includes('commit')) return <GitCommit className="h-4 w-4 text-green-400" />
  if (t.includes('push')) return <GitPullRequest className="h-4 w-4 text-blue-400" />
  if (t.includes('branch') || t.includes('checkout')) return <GitBranch className="h-4 w-4 text-purple-400" />
  if (t.includes('merge')) return <GitMerge className="h-4 w-4 text-orange-400" />
  return <GitBranch className="h-4 w-4 text-slate-400" />
}

function getOperationLabel(type: string) {
  const t = type?.toLowerCase() || ''
  if (t.includes('commit')) return 'Commit'
  if (t.includes('push')) return 'Push'
  if (t.includes('pull')) return 'Pull'
  if (t.includes('checkout')) return 'Checkout'
  if (t.includes('branch')) return 'Branch'
  if (t.includes('merge')) return 'Merge'
  if (t.includes('pr')) return 'PR'
  return type || 'Unknown'
}

const columns: ColumnDef<GitOperation>[] = [
  {
    accessorKey: 'operation_type',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        Operation
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const type = row.getValue('operation_type') as string
      return (
        <div className="flex items-center gap-2">
          {getOperationIcon(type)}
          <span className="text-white font-medium">{getOperationLabel(type)}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'command',
    header: 'Command',
    cell: ({ row }) => {
      const command = row.getValue('command') as string | null
      if (!command) return <span className="text-slate-500">-</span>

      // Truncate long commands
      const truncated = command.length > 60 ? command.slice(0, 60) + '...' : command
      return (
        <code className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded" title={command}>
          {truncated}
        </code>
      )
    },
  },
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
      <span className="text-slate-300">{row.getValue('project_name') || 'Unknown'}</span>
    ),
  },
  {
    accessorKey: 'exit_code',
    header: 'Status',
    cell: ({ row }) => {
      const exitCode = row.getValue('exit_code') as number
      const success = exitCode === 0
      return (
        <div className="flex items-center gap-1">
          {success ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400" />
          )}
          <span className={success ? 'text-green-400' : 'text-red-400'}>
            {success ? 'Success' : `Exit ${exitCode}`}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'timestamp',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <Clock className="mr-2 h-4 w-4" />
        Time
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.getValue('timestamp') as string
      return (
        <div className="text-slate-300">
          <div>{format(new Date(timestamp), 'MMM d, HH:mm')}</div>
          <div className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
          </div>
        </div>
      )
    },
  },
]

interface GitTableProps {
  operations: GitOperation[]
}

export function GitTable({ operations }: GitTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true },
  ])

  const table = useReactTable({
    data: operations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  if (operations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <GitBranch className="h-12 w-12 text-slate-600 mb-4" />
        <p className="text-slate-400">No git operations yet</p>
        <p className="text-sm text-slate-500">
          Sync your analytics to see git activity
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
