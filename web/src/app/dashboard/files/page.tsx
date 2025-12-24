import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FilesTable } from '@/components/analytics/FilesTable'
import { FileCode, FilePlus, FileMinus, FolderTree } from 'lucide-react'

async function getFileStats(userId: string) {
  const supabase = await createClient()

  // Get all file changes
  const { data: fileChanges } = await supabase
    .from('file_changes')
    .select('*, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
    .order('timestamp', { ascending: false })

  if (!fileChanges) return { files: [], stats: { total: 0, added: 0, removed: 0, uniqueFiles: 0 } }

  // Aggregate by file path
  const fileMap = new Map<string, {
    file_path: string
    operations: number
    lines_added: number
    lines_removed: number
    last_modified: string
  }>()

  for (const change of fileChanges) {
    const existing = fileMap.get(change.file_path)
    if (existing) {
      existing.operations++
      existing.lines_added += change.lines_added || 0
      existing.lines_removed += change.lines_removed || 0
      if (new Date(change.timestamp) > new Date(existing.last_modified)) {
        existing.last_modified = change.timestamp
      }
    } else {
      fileMap.set(change.file_path, {
        file_path: change.file_path,
        operations: 1,
        lines_added: change.lines_added || 0,
        lines_removed: change.lines_removed || 0,
        last_modified: change.timestamp,
      })
    }
  }

  const files = Array.from(fileMap.values())
    .sort((a, b) => b.operations - a.operations)
    .slice(0, 100)

  const stats = {
    total: fileChanges.length,
    added: fileChanges.reduce((sum, f) => sum + (f.lines_added || 0), 0),
    removed: fileChanges.reduce((sum, f) => sum + (f.lines_removed || 0), 0),
    uniqueFiles: fileMap.size,
  }

  return { files, stats }
}

export default async function FilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { files, stats } = await getFileStats(user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Files</h1>
        <p className="text-slate-400">File modification analytics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Unique Files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.uniqueFiles}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Total Operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <FilePlus className="h-4 w-4" />
              Lines Added
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">+{stats.added.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <FileMinus className="h-4 w-4" />
              Lines Removed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">-{stats.removed.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Most Modified Files</CardTitle>
          <CardDescription className="text-slate-400">
            Files ranked by number of modifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FilesTable files={files} />
        </CardContent>
      </Card>
    </div>
  )
}
