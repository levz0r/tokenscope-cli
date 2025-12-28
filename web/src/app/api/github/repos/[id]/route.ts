import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get detailed analysis for a specific repo
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

    // Verify user has access to this repo
    const { data: repo } = await supabase
      .from('tracked_repos')
      .select(`
        *,
        github_installations!inner (
          user_id,
          github_username
        ),
        repo_analysis (
          total_commits,
          ai_commits,
          total_lines,
          ai_lines_added,
          ai_lines_removed,
          analyzed_at
        )
      `)
      .eq('id', id)
      .single()

    if (!repo || repo.github_installations.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Get recent commits
    const { data: commits } = await supabase
      .from('repo_commits')
      .select('*')
      .eq('repo_id', id)
      .order('committed_at', { ascending: false })
      .limit(50)

    // Get history for trend chart
    const { data: history } = await supabase
      .from('repo_analysis_history')
      .select('*')
      .eq('repo_id', id)
      .order('snapshot_date', { ascending: true })
      .limit(30)

    const analysis = Array.isArray(repo.repo_analysis)
      ? repo.repo_analysis[0]
      : repo.repo_analysis

    const aiPercentage = analysis?.total_commits
      ? Math.round((analysis.ai_commits / analysis.total_commits) * 100)
      : 0

    return NextResponse.json({
      repo: {
        id: repo.id,
        full_name: repo.repo_full_name,
        name: repo.repo_name,
        default_branch: repo.default_branch,
        last_push_at: repo.last_push_at,
      },
      analysis: {
        ...analysis,
        ai_percentage: aiPercentage,
      },
      commits: commits || [],
      history: history || [],
    })

  } catch (error) {
    console.error('Error fetching repo:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Toggle repo tracking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { is_active } = await request.json()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access
    const { data: repo } = await supabase
      .from('tracked_repos')
      .select(`
        id,
        github_installations!inner (user_id)
      `)
      .eq('id', id)
      .single()

    if (!repo || repo.github_installations.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Update tracking status
    await supabase
      .from('tracked_repos')
      .update({ is_active })
      .eq('id', id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating repo:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
