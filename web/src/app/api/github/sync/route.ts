import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstallationOctokit, syncRepoCommits } from '@/lib/github'

// Vercel timeout config - max 60s on Pro, 300s on Enterprise
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional repo_id and org_id from request body
    const body = await request.json().catch(() => ({}))
    const repoId = body.repo_id
    const orgId = body.org_id // Optional: sync specific org's repos

    const results: Array<{
      repo: string
      totalCommits: number
      aiCommits: number
      aiPercentage: number
      source: 'personal' | 'org'
    }> = []

    // Sync personal repos
    const { data: installations } = await supabase
      .from('github_installations')
      .select('id, installation_id')
      .eq('user_id', user.id)

    if (installations && installations.length > 0 && !orgId) {
      for (const installation of installations) {
        const installOctokit = await getInstallationOctokit(installation.installation_id)

        // Get repos for this installation
        let repoQuery = supabase
          .from('tracked_repos')
          .select('id, repo_full_name, default_branch')
          .eq('installation_id', installation.id)
          .eq('is_active', true)

        if (repoId) {
          repoQuery = repoQuery.eq('id', repoId)
        }

        const { data: repos } = await repoQuery

        if (!repos) continue

        for (const repo of repos) {
          const result = await syncSingleRepo(supabase, installOctokit, repo)
          if (result) {
            results.push({ ...result, source: 'personal' })
          }
        }
      }
    }

    // Sync org repos
    // Get org installations the user has access to (must be owner/admin to sync)
    const { data: orgMemberships } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])

    const adminOrgIds = orgMemberships?.map(m => m.org_id) || []

    if (adminOrgIds.length > 0) {
      let orgInstallQuery = supabase
        .from('org_github_installations')
        .select('id, installation_id, org_id')
        .in('org_id', adminOrgIds)

      if (orgId) {
        // Filter to specific org if requested
        if (!adminOrgIds.includes(orgId)) {
          return NextResponse.json({ error: 'Not authorized to sync this org' }, { status: 403 })
        }
        orgInstallQuery = orgInstallQuery.eq('org_id', orgId)
      }

      const { data: orgInstallations } = await orgInstallQuery

      if (orgInstallations) {
        for (const orgInstall of orgInstallations) {
          const installOctokit = await getInstallationOctokit(orgInstall.installation_id)

          // Get repos for this org installation
          let repoQuery = supabase
            .from('tracked_repos')
            .select('id, repo_full_name, default_branch')
            .eq('org_installation_id', orgInstall.id)
            .eq('is_active', true)

          if (repoId) {
            repoQuery = repoQuery.eq('id', repoId)
          }

          const { data: repos } = await repoQuery

          if (!repos) continue

          for (const repo of repos) {
            const result = await syncSingleRepo(supabase, installOctokit, repo)
            if (result) {
              results.push({ ...result, source: 'org' })
            }
          }
        }
      }
    }

    if (results.length === 0 && !installations?.length && adminOrgIds.length === 0) {
      return NextResponse.json({ error: 'No GitHub installations found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      synced: results.length,
      results,
    })

  } catch (error) {
    console.error('GitHub sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

// Helper to sync a single repo
async function syncSingleRepo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  octokit: Awaited<ReturnType<typeof getInstallationOctokit>>,
  repo: { id: string; repo_full_name: string; default_branch: string | null }
): Promise<{
  repo: string
  totalCommits: number
  aiCommits: number
  aiPercentage: number
} | null> {
  try {
    const [owner, repoName] = repo.repo_full_name.split('/')

    // Sync commits
    const syncResult = await syncRepoCommits(
      octokit,
      owner,
      repoName,
      repo.default_branch || 'main',
      100
    )

    // Calculate AI percentage
    const aiPercentage = syncResult.totalCommits > 0
      ? Math.round((syncResult.aiCommits / syncResult.totalCommits) * 100)
      : 0

    // Update repo_analysis
    await supabase
      .from('repo_analysis')
      .upsert({
        repo_id: repo.id,
        total_commits: syncResult.totalCommits,
        ai_commits: syncResult.aiCommits,
        ai_lines_added: syncResult.aiLinesAdded,
        ai_lines_removed: syncResult.aiLinesRemoved,
        ai_percentage: aiPercentage,
        last_analyzed_at: new Date().toISOString(),
      }, {
        onConflict: 'repo_id',
      })

    // Store individual commits for history tracking
    for (const commit of syncResult.commits) {
      await supabase
        .from('repo_commits')
        .upsert({
          repo_id: repo.id,
          commit_sha: commit.sha,
          commit_message: commit.message.substring(0, 500),
          author_name: commit.authorName,
          author_email: commit.authorEmail,
          is_ai_generated: commit.isAIGenerated,
          ai_tool: commit.aiTool,
          lines_added: commit.additions,
          lines_removed: commit.deletions,
          committed_at: commit.committedAt.toISOString(),
        }, {
          onConflict: 'repo_id,commit_sha',
        })
    }

    // Update tracked_repos
    await supabase
      .from('tracked_repos')
      .update({
        ai_percentage: aiPercentage,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', repo.id)

    return {
      repo: repo.repo_full_name,
      totalCommits: syncResult.totalCommits,
      aiCommits: syncResult.aiCommits,
      aiPercentage,
    }
  } catch (error) {
    console.error(`Failed to sync repo ${repo.repo_full_name}:`, error)
    return null
  }
}
