import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get commit history for a repo grouped by week
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
        installation_id,
        github_installations!inner (user_id)
      `)
      .eq('id', id)
      .single()

    if (!repo) {
      return NextResponse.json({ error: 'Repo not found' }, { status: 404 })
    }

    // Get commits for the last 12 weeks
    const twelveWeeksAgo = new Date()
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84) // 12 weeks

    const { data: commits } = await supabase
      .from('repo_commits')
      .select('committed_at, is_ai_generated')
      .eq('repo_id', id)
      .gte('committed_at', twelveWeeksAgo.toISOString())
      .order('committed_at', { ascending: true })

    if (!commits || commits.length === 0) {
      return NextResponse.json({ history: [] })
    }

    // Group commits by week
    const weeklyData: Record<string, { ai: number; human: number }> = {}

    for (const commit of commits) {
      const date = new Date(commit.committed_at)
      // Get start of week (Sunday)
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay())
      const weekKey = startOfWeek.toISOString().split('T')[0]

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { ai: 0, human: 0 }
      }

      if (commit.is_ai_generated) {
        weeklyData[weekKey].ai++
      } else {
        weeklyData[weekKey].human++
      }
    }

    // Convert to array sorted by date
    const history = Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, counts]) => ({
        week,
        ai: counts.ai,
        human: counts.human,
        total: counts.ai + counts.human,
      }))

    return NextResponse.json({ history })

  } catch (error) {
    console.error('Error fetching commit history:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
