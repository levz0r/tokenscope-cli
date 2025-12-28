import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstallationOctokit, getAppOctokit, syncRepoCommits } from '@/lib/github'

// Vercel timeout config - initial sync may take time
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const installationId = searchParams.get('installation_id')
  const setupAction = searchParams.get('setup_action')

  // After GitHub App installation, user is redirected here
  if (!installationId) {
    return NextResponse.redirect(new URL('/dashboard?error=missing_installation', request.url))
  }

  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      // Store installation_id in session and redirect to login
      return NextResponse.redirect(
        new URL(`/login?redirect=/api/github/callback?installation_id=${installationId}`, request.url)
      )
    }

    // Get installation details from GitHub using app-level auth
    const appOctokit = getAppOctokit()

    // Get the authenticated user/org for this installation
    const { data: installation } = await appOctokit.rest.apps.getInstallation({
      installation_id: parseInt(installationId),
    })

    const githubUserId = installation.account?.id || 0
    const githubUsername = installation.account && 'login' in installation.account
      ? installation.account.login
      : 'unknown'

    if (!githubUserId) {
      return NextResponse.redirect(new URL('/dashboard?error=no_account', request.url))
    }

    // Store the installation in our database
    const { data: existingInstallation } = await supabase
      .from('github_installations')
      .select('id')
      .eq('installation_id', parseInt(installationId))
      .single()

    if (existingInstallation) {
      // Update existing installation
      await supabase
        .from('github_installations')
        .update({
          user_id: user.id,
          github_user_id: githubUserId,
          github_username: githubUsername,
          updated_at: new Date().toISOString(),
        })
        .eq('installation_id', parseInt(installationId))
    } else {
      // Create new installation
      const { error: insertError } = await supabase
        .from('github_installations')
        .insert({
          user_id: user.id,
          installation_id: parseInt(installationId),
          github_user_id: githubUserId,
          github_username: githubUsername,
        })

      if (insertError) {
        console.error('Failed to save installation:', insertError)
        return NextResponse.redirect(new URL('/dashboard?error=save_failed', request.url))
      }
    }

    // Get the installation record
    const { data: installRecord } = await supabase
      .from('github_installations')
      .select('id')
      .eq('installation_id', parseInt(installationId))
      .single()

    if (installRecord) {
      // Fetch and store accessible repositories using installation token
      const installOctokit = await getInstallationOctokit(parseInt(installationId))
      const { data: repos } = await installOctokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
      })

      for (const repo of repos.repositories) {
        // Upsert the repo
        const { data: trackedRepo } = await supabase
          .from('tracked_repos')
          .upsert({
            installation_id: installRecord.id,
            repo_id: repo.id,
            repo_full_name: repo.full_name,
            repo_name: repo.name,
            default_branch: repo.default_branch || 'main',
            is_active: true,
          }, {
            onConflict: 'installation_id,repo_id',
          })
          .select('id')
          .single()

        if (trackedRepo) {
          // Sync commits for this repo
          const [owner, repoName] = repo.full_name.split('/')
          const syncResult = await syncRepoCommits(
            installOctokit,
            owner,
            repoName,
            repo.default_branch || 'main',
            30 // Fetch last 30 commits for initial sync (full sync available manually)
          )

          // Calculate AI percentage
          const aiPercentage = syncResult.totalCommits > 0
            ? Math.round((syncResult.aiCommits / syncResult.totalCommits) * 100)
            : 0

          // Update or create repo_analysis
          await supabase
            .from('repo_analysis')
            .upsert({
              repo_id: trackedRepo.id,
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
                repo_id: trackedRepo.id,
                commit_sha: commit.sha,
                commit_message: commit.message.substring(0, 500),
                author_name: commit.authorName,
                author_email: commit.authorEmail,
                is_ai_generated: commit.isAIGenerated,
                lines_added: commit.additions,
                lines_removed: commit.deletions,
                committed_at: commit.committedAt.toISOString(),
              }, {
                onConflict: 'repo_id,commit_sha',
              })
          }

          // Update tracked_repos with the percentage
          await supabase
            .from('tracked_repos')
            .update({
              ai_percentage: aiPercentage,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', trackedRepo.id)
        }
      }
    }

    // Redirect to dashboard with success
    return NextResponse.redirect(new URL('/dashboard?github=connected', request.url))

  } catch (error) {
    console.error('GitHub callback error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=github_error', request.url))
  }
}
