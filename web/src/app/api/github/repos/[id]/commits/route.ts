import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get recent commits for a repo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this repo
    const { data: repo } = await supabase
      .from('tracked_repos')
      .select(`
        id,
        repo_full_name,
        default_branch,
        installation_id,
        github_installations!inner (user_id)
      `)
      .eq('id', id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: 'Repo not found' }, { status: 404 })
    }

    // Get last 10 commits
    const { data: commits } = await supabase
      .from('repo_commits')
      .select('commit_sha, commit_message, author_name, is_ai_generated, ai_tool, committed_at')
      .eq('repo_id', id)
      .order('committed_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      commits: commits || [],
      default_branch: repo.default_branch
    })

  } catch (error) {
    console.error('Error fetching commits:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
