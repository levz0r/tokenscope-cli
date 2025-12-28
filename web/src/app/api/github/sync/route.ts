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

    // Get optional repo_id from request body
    const body = await request.json().catch(() => ({}))
    const repoId = body.repo_id

    // Get user's installations
    const { data: installations } = await supabase
      .from('github_installations')
      .select('id, installation_id')
      .eq('user_id', user.id)

    if (!installations || installations.length === 0) {
      return NextResponse.json({ error: 'No GitHub installations found' }, { status: 404 })
    }

    const results: Array<{
      repo: string
      totalCommits: number
      aiCommits: number
      aiPercentage: number
    }> = []

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
        const [owner, repoName] = repo.repo_full_name.split('/')

        // Sync commits
        const syncResult = await syncRepoCommits(
          installOctokit,
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
              commit_message: commit.message.substring(0, 500), // Truncate long messages
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

        results.push({
          repo: repo.repo_full_name,
          totalCommits: syncResult.totalCommits,
          aiCommits: syncResult.aiCommits,
          aiPercentage,
        })
      }
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
