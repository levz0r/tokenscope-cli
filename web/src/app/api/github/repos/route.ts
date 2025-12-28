import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get user's tracked repos with analysis data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's GitHub installations
    const { data: installations } = await supabase
      .from('github_installations')
      .select('id, github_username, created_at')
      .eq('user_id', user.id)

    if (!installations || installations.length === 0) {
      return NextResponse.json({
        connected: false,
        installations: [],
        repos: []
      })
    }

    // Get tracked repos with analysis data
    const installationIds = installations.map(i => i.id)

    const { data: repos } = await supabase
      .from('tracked_repos')
      .select(`
        id,
        repo_full_name,
        repo_name,
        default_branch,
        is_active,
        last_push_at,
        last_analyzed_at,
        repo_analysis (
          total_commits,
          ai_commits,
          total_lines,
          ai_lines_added,
          ai_lines_removed,
          analyzed_at
        )
      `)
      .in('installation_id', installationIds)
      .eq('is_active', true)
      .order('last_push_at', { ascending: false, nullsFirst: false })

    // Calculate AI percentage for each repo
    const reposWithPercentage = (repos || []).map(repo => {
      const analysis = Array.isArray(repo.repo_analysis)
        ? repo.repo_analysis[0]
        : repo.repo_analysis

      const aiPercentage = analysis?.total_commits
        ? Math.round((analysis.ai_commits / analysis.total_commits) * 100)
        : 0

      return {
        ...repo,
        ai_percentage: aiPercentage,
        analysis: analysis || null,
      }
    })

    return NextResponse.json({
      connected: true,
      installations: installations.map(i => ({
        id: i.id,
        github_username: i.github_username,
        connected_at: i.created_at,
      })),
      repos: reposWithPercentage,
    })

  } catch (error) {
    console.error('Error fetching repos:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
