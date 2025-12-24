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
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpDown, FileCode, FilePlus, FileMinus, Clock } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface FileStats {
  file_path: string
  operations: number
  lines_added: number
  lines_removed: number
  last_modified: string
}

function getFileIcon(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const colors: Record<string, string> = {
    ts: 'text-blue-400',
    tsx: 'text-blue-400',
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    py: 'text-green-400',
    go: 'text-cyan-400',
    rs: 'text-orange-400',
    md: 'text-slate-400',
    json: 'text-yellow-300',
    css: 'text-pink-400',
    html: 'text-orange-300',
  }
  return colors[ext || ''] || 'text-slate-400'
}

function getFileName(filePath: string) {
  const parts = filePath.split('/')
  return parts[parts.length - 1]
}

function getFileDir(filePath: string) {
  const parts = filePath.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

const columns: ColumnDef<FileStats>[] = [
  {
    accessorKey: 'file_path',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <FileCode className="mr-2 h-4 w-4" />
        File
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const filePath = row.getValue('file_path') as string
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <FileCode className={`h-4 w-4 ${getFileIcon(filePath)}`} />
            <span className="text-white font-medium">{getFileName(filePath)}</span>
          </div>
          <span className="text-xs text-slate-500 ml-6">{getFileDir(filePath)}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'operations',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        Operations
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-white font-medium">{row.getValue('operations')}</span>
    ),
  },
  {
    accessorKey: 'lines_added',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <FilePlus className="mr-2 h-4 w-4" />
        Added
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue('lines_added') as number
      return <span className="text-green-400">+{value.toLocaleString()}</span>
    },
  },
  {
    accessorKey: 'lines_removed',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <FileMinus className="mr-2 h-4 w-4" />
        Removed
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue('lines_removed') as number
      return <span className="text-red-400">-{value.toLocaleString()}</span>
    },
  },
  {
    accessorKey: 'net_change',
    header: 'Net',
    cell: ({ row }) => {
      const added = row.original.lines_added
      const removed = row.original.lines_removed
      const net = added - removed
      return (
        <span className={net >= 0 ? 'text-green-400' : 'text-red-400'}>
          {net >= 0 ? '+' : ''}{net.toLocaleString()}
        </span>
      )
    },
  },
  {
    accessorKey: 'last_modified',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-slate-400 hover:text-white"
      >
        <Clock className="mr-2 h-4 w-4" />
        Last Modified
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.getValue('last_modified') as string
      return (
        <span className="text-slate-400">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </span>
      )
    },
  },
]

interface FilesTableProps {
  files: FileStats[]
}

export function FilesTable({ files }: FilesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'operations', desc: true },
  ])

  const table = useReactTable({
    data: files,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileCode className="h-12 w-12 text-slate-600 mb-4" />
        <p className="text-slate-400">No file changes yet</p>
        <p className="text-sm text-slate-500">
          Sync your analytics to see file modifications
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
