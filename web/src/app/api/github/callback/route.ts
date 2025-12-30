import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstallationOctokit, getAppOctokit, syncRepoCommits } from '@/lib/github'

// Vercel timeout config - initial sync may take time
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const installationId = searchParams.get('installation_id')
  const setupAction = searchParams.get('setup_action')
  const state = searchParams.get('state') // May contain "org:[org_id]"

  // After GitHub App installation, user is redirected here
  if (!installationId) {
    return NextResponse.redirect(new URL('/dashboard?error=missing_installation', request.url))
  }

  // Check if this is an org-level connection
  const isOrgConnection = state?.startsWith('org:') ?? false
  const orgId = isOrgConnection && state ? state.replace('org:', '') : null

  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      // Store installation_id in session and redirect to login
      const redirectUrl = state
        ? `/login?redirect=/api/github/callback?installation_id=${installationId}%26state=${state}`
        : `/login?redirect=/api/github/callback?installation_id=${installationId}`
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    // If org connection, verify user is owner/admin
    if (isOrgConnection && orgId) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', user.id)
        .single()

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return NextResponse.redirect(new URL(`/org/${orgId}?error=unauthorized`, request.url))
      }
    }

    // Get installation details from GitHub using app-level auth
    const appOctokit = getAppOctokit()

    // Get the authenticated user/org for this installation
    const { data: installation } = await appOctokit.rest.apps.getInstallation({
      installation_id: parseInt(installationId),
    })

    const githubAccountId = installation.account?.id || 0
    const githubAccountName = installation.account && 'login' in installation.account
      ? installation.account.login
      : 'unknown'
    // Check if this is a GitHub organization (organizations have 'slug' property)
    const isGitHubOrg = installation.account && 'slug' in installation.account

    if (!githubAccountId) {
      const errorRedirect = isOrgConnection ? `/org/${orgId}?error=no_account` : '/dashboard?error=no_account'
      return NextResponse.redirect(new URL(errorRedirect, request.url))
    }

    // Handle org-level GitHub installation
    if (isOrgConnection && orgId) {
      // Verify this is a GitHub organization account
      if (!isGitHubOrg) {
        return NextResponse.redirect(new URL(`/org/${orgId}?error=not_github_org`, request.url))
      }

      // Check if this GitHub org is already connected to another TokenScope org
      const { data: existingOrgInstall } = await supabase
        .from('org_github_installations')
        .select('id, org_id')
        .eq('github_org_id', githubAccountId)
        .single()

      if (existingOrgInstall && existingOrgInstall.org_id !== orgId) {
        return NextResponse.redirect(new URL(`/org/${orgId}?error=github_org_taken`, request.url))
      }

      // Check if this TokenScope org already has a different GitHub org
      const { data: existingForOrg } = await supabase
        .from('org_github_installations')
        .select('id, github_org_id')
        .eq('org_id', orgId)
        .single()

      if (existingForOrg && existingForOrg.github_org_id !== githubAccountId) {
        // Delete old installation and create new one
        await supabase
          .from('org_github_installations')
          .delete()
          .eq('id', existingForOrg.id)
      }

      // Upsert org GitHub installation
      const { data: orgInstallRecord, error: orgInstallError } = await supabase
        .from('org_github_installations')
        .upsert({
          org_id: orgId,
          installation_id: parseInt(installationId),
          github_org_name: githubAccountName,
          github_org_id: githubAccountId,
          connected_by: user.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'org_id',
        })
        .select('id')
        .single()

      if (orgInstallError || !orgInstallRecord) {
        console.error('Failed to save org installation:', orgInstallError)
        return NextResponse.redirect(new URL(`/org/${orgId}?error=save_failed`, request.url))
      }

      // Fetch and store repos for org installation
      await syncOrgRepos(supabase, orgInstallRecord.id, parseInt(installationId))

      return NextResponse.redirect(new URL(`/org/${orgId}?github=connected`, request.url))
    }

    // Handle personal GitHub installation (existing flow)
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
          github_user_id: githubAccountId,
          github_username: githubAccountName,
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
          github_user_id: githubAccountId,
          github_username: githubAccountName,
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
                ai_tool: commit.aiTool,
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
    const errorRedirect = isOrgConnection ? `/org/${orgId}?error=github_error` : '/dashboard?error=github_error'
    return NextResponse.redirect(new URL(errorRedirect, request.url))
  }
}

// Helper function to sync repos for an org installation
async function syncOrgRepos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgInstallationId: string,
  githubInstallationId: number
) {
  const installOctokit = await getInstallationOctokit(githubInstallationId)
  const { data: repos } = await installOctokit.rest.apps.listReposAccessibleToInstallation({
    per_page: 100,
  })

  for (const repo of repos.repositories) {
    // Check if repo already exists with a different installation type
    const { data: existingRepo } = await supabase
      .from('tracked_repos')
      .select('id, installation_id, org_installation_id')
      .eq('repo_id', repo.id)
      .single()

    let trackedRepoId: string

    if (existingRepo) {
      // Update existing repo to use org installation
      const { data: updated } = await supabase
        .from('tracked_repos')
        .update({
          installation_id: null,
          org_installation_id: orgInstallationId,
          repo_full_name: repo.full_name,
          repo_name: repo.name,
          default_branch: repo.default_branch || 'main',
          is_active: true,
        })
        .eq('id', existingRepo.id)
        .select('id')
        .single()

      trackedRepoId = updated?.id || existingRepo.id
    } else {
      // Insert new repo
      const { data: newRepo } = await supabase
        .from('tracked_repos')
        .insert({
          org_installation_id: orgInstallationId,
          repo_id: repo.id,
          repo_full_name: repo.full_name,
          repo_name: repo.name,
          default_branch: repo.default_branch || 'main',
          is_active: true,
        })
        .select('id')
        .single()

      if (!newRepo) continue
      trackedRepoId = newRepo.id
    }

    // Sync commits for this repo
    const [owner, repoName] = repo.full_name.split('/')
    const syncResult = await syncRepoCommits(
      installOctokit,
      owner,
      repoName,
      repo.default_branch || 'main',
      30 // Fetch last 30 commits for initial sync
    )

    // Calculate AI percentage
    const aiPercentage = syncResult.totalCommits > 0
      ? Math.round((syncResult.aiCommits / syncResult.totalCommits) * 100)
      : 0

    // Update or create repo_analysis
    await supabase
      .from('repo_analysis')
      .upsert({
        repo_id: trackedRepoId,
        total_commits: syncResult.totalCommits,
        ai_commits: syncResult.aiCommits,
        ai_lines_added: syncResult.aiLinesAdded,
        ai_lines_removed: syncResult.aiLinesRemoved,
        ai_percentage: aiPercentage,
        last_analyzed_at: new Date().toISOString(),
      }, {
        onConflict: 'repo_id',
      })

    // Store individual commits
    for (const commit of syncResult.commits) {
      await supabase
        .from('repo_commits')
        .upsert({
          repo_id: trackedRepoId,
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

    // Update tracked_repos with the percentage
    await supabase
      .from('tracked_repos')
      .update({
        ai_percentage: aiPercentage,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', trackedRepoId)
  }
}
