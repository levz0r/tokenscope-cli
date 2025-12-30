import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get user's tracked repos with analysis data (personal + org repos)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's personal GitHub installations
    const { data: installations } = await supabase
      .from('github_installations')
      .select('id, github_username, created_at')
      .eq('user_id', user.id)

    // Get org GitHub installations for orgs the user belongs to
    const { data: orgInstallations } = await supabase
      .from('org_github_installations')
      .select(`
        id,
        org_id,
        github_org_name,
        created_at,
        organizations!inner (
          id,
          name
        )
      `)
      .in('org_id', (
        await supabase
          .from('organization_members')
          .select('org_id')
          .eq('user_id', user.id)
      ).data?.map(m => m.org_id) || []
      )

    const hasPersonalConnection = installations && installations.length > 0
    const hasOrgConnection = orgInstallations && orgInstallations.length > 0

    if (!hasPersonalConnection && !hasOrgConnection) {
      return NextResponse.json({
        connected: false,
        installations: [],
        orgInstallations: [],
        repos: []
      })
    }

    // Define repo type for query results
    type RepoQueryResult = {
      id: string
      repo_full_name: string
      repo_name: string
      default_branch: string
      is_active: boolean
      last_push_at: string | null
      last_analyzed_at: string | null
      org_installation_id?: string | null
      repo_analysis: {
        total_commits: number
        ai_commits: number
        total_lines: number | null
        ai_lines_added: number
        ai_lines_removed: number
        analyzed_at: string | null
      }[] | null
    }

    // Get personal repos
    const personalInstallationIds = installations?.map(i => i.id) || []
    let personalRepos: RepoQueryResult[] = []

    if (personalInstallationIds.length > 0) {
      const { data: personalData } = await supabase
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
        .in('installation_id', personalInstallationIds)
        .eq('is_active', true)
        .order('last_push_at', { ascending: false, nullsFirst: false })

      personalRepos = (personalData || []) as RepoQueryResult[]
    }

    // Get org repos
    const orgInstallationIds = orgInstallations?.map(i => i.id) || []
    let orgRepos: RepoQueryResult[] = []

    if (orgInstallationIds.length > 0) {
      const { data: orgData } = await supabase
        .from('tracked_repos')
        .select(`
          id,
          repo_full_name,
          repo_name,
          default_branch,
          is_active,
          last_push_at,
          last_analyzed_at,
          org_installation_id,
          repo_analysis (
            total_commits,
            ai_commits,
            total_lines,
            ai_lines_added,
            ai_lines_removed,
            analyzed_at
          )
        `)
        .in('org_installation_id', orgInstallationIds)
        .eq('is_active', true)
        .order('last_push_at', { ascending: false, nullsFirst: false })

      orgRepos = (orgData || []) as RepoQueryResult[]
    }

    // Build org installation lookup for repo enrichment
    const orgInstallLookup = new Map(
      orgInstallations?.map(i => [
        i.id,
        {
          org_id: i.org_id,
          org_name: (i.organizations as { id: string; name: string })?.name || 'Unknown',
          github_org_name: i.github_org_name,
        }
      ]) || []
    )

    // Process personal repos
    const processedPersonalRepos = personalRepos.map(repo => {
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
        source: 'personal' as const,
      }
    })

    // Process org repos
    const processedOrgRepos = orgRepos.map(repo => {
      const analysis = Array.isArray(repo.repo_analysis)
        ? repo.repo_analysis[0]
        : repo.repo_analysis

      const aiPercentage = analysis?.total_commits
        ? Math.round((analysis.ai_commits / analysis.total_commits) * 100)
        : 0

      const orgInfo = repo.org_installation_id ? orgInstallLookup.get(repo.org_installation_id) : undefined

      return {
        ...repo,
        ai_percentage: aiPercentage,
        analysis: analysis || null,
        source: 'org' as const,
        org_id: orgInfo?.org_id,
        org_name: orgInfo?.org_name,
      }
    })

    // Combine and sort all repos by last push
    const allRepos = [...processedPersonalRepos, ...processedOrgRepos].sort((a, b) => {
      if (!a.last_push_at) return 1
      if (!b.last_push_at) return -1
      return new Date(b.last_push_at).getTime() - new Date(a.last_push_at).getTime()
    })

    return NextResponse.json({
      connected: true,
      installations: installations?.map(i => ({
        id: i.id,
        github_username: i.github_username,
        connected_at: i.created_at,
      })) || [],
      orgInstallations: orgInstallations?.map(i => ({
        id: i.id,
        org_id: i.org_id,
        github_org_name: i.github_org_name,
        org_name: (i.organizations as { id: string; name: string })?.name || 'Unknown',
        connected_at: i.created_at,
      })) || [],
      repos: allRepos,
    })

  } catch (error) {
    console.error('Error fetching repos:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
