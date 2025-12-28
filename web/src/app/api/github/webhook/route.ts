import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { WEBHOOK_SECRET, detectAITool, getInstallationOctokit } from '@/lib/github'
import crypto from 'crypto'

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !WEBHOOK_SECRET) {
    return false
  }

  const sig = Buffer.from(signature, 'utf8')
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  const digest = Buffer.from('sha256=' + hmac.update(payload).digest('hex'), 'utf8')

  return sig.length === digest.length && crypto.timingSafeEqual(digest, sig)
}

interface PushCommit {
  id: string
  message: string
  author: {
    name: string
    email: string
  }
  added: string[]
  removed: string[]
  modified: string[]
}

interface PushEvent {
  ref: string
  repository: {
    id: number
    full_name: string
    default_branch: string
  }
  installation?: {
    id: number
  }
  commits: PushCommit[]
  head_commit: PushCommit | null
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const event = request.headers.get('x-github-event')

    // Verify webhook signature
    if (!verifySignature(payload, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Only process push events
    if (event !== 'push') {
      return NextResponse.json({ message: `Ignoring ${event} event` })
    }

    const data: PushEvent = JSON.parse(payload)

    // Ignore if no installation (shouldn't happen with GitHub App)
    if (!data.installation?.id) {
      return NextResponse.json({ error: 'No installation ID' }, { status: 400 })
    }

    // Only process pushes to default branch
    const branch = data.ref.replace('refs/heads/', '')
    if (branch !== data.repository.default_branch) {
      return NextResponse.json({ message: `Ignoring push to ${branch}` })
    }

    const supabase = createAdminClient()

    // Find the tracked repo
    const { data: installation } = await supabase
      .from('github_installations')
      .select('id')
      .eq('installation_id', data.installation.id)
      .single()

    if (!installation) {
      return NextResponse.json({ error: 'Installation not found' }, { status: 404 })
    }

    const { data: trackedRepo } = await supabase
      .from('tracked_repos')
      .select('id')
      .eq('installation_id', installation.id)
      .eq('repo_id', data.repository.id)
      .single()

    if (!trackedRepo) {
      return NextResponse.json({ error: 'Repo not tracked' }, { status: 404 })
    }

    // Process each commit
    let totalCommits = 0
    let aiCommits = 0
    let aiLinesAdded = 0
    let aiLinesRemoved = 0

    // Get detailed commit info including line stats
    const octokit = await getInstallationOctokit(data.installation.id)

    for (const commit of data.commits) {
      totalCommits++
      const aiTool = detectAITool(commit.message)
      const isAI = aiTool !== null

      if (isAI) {
        aiCommits++

        // Get detailed commit stats
        try {
          const { data: commitDetails } = await octokit.rest.repos.getCommit({
            owner: data.repository.full_name.split('/')[0],
            repo: data.repository.full_name.split('/')[1],
            ref: commit.id,
          })

          aiLinesAdded += commitDetails.stats?.additions || 0
          aiLinesRemoved += commitDetails.stats?.deletions || 0
        } catch (e) {
          console.error(`Failed to get commit details for ${commit.id}:`, e)
        }
      }

      // Store individual commit
      await supabase
        .from('repo_commits')
        .upsert({
          repo_id: trackedRepo.id,
          commit_sha: commit.id,
          commit_message: commit.message.substring(0, 500), // Truncate long messages
          author_name: commit.author.name,
          author_email: commit.author.email,
          is_ai_generated: isAI,
          ai_tool: aiTool,
          lines_added: 0, // Will be updated from stats above
          lines_removed: 0,
          committed_at: new Date().toISOString(),
        }, {
          onConflict: 'repo_id,commit_sha',
        })
    }

    // Update repo analysis (upsert with increments)
    const { data: existingAnalysis } = await supabase
      .from('repo_analysis')
      .select('*')
      .eq('repo_id', trackedRepo.id)
      .single()

    if (existingAnalysis) {
      await supabase
        .from('repo_analysis')
        .update({
          total_commits: (existingAnalysis.total_commits || 0) + totalCommits,
          ai_commits: (existingAnalysis.ai_commits || 0) + aiCommits,
          ai_lines_added: (existingAnalysis.ai_lines_added || 0) + aiLinesAdded,
          ai_lines_removed: (existingAnalysis.ai_lines_removed || 0) + aiLinesRemoved,
          analyzed_at: new Date().toISOString(),
        })
        .eq('repo_id', trackedRepo.id)
    } else {
      await supabase
        .from('repo_analysis')
        .insert({
          repo_id: trackedRepo.id,
          total_commits: totalCommits,
          ai_commits: aiCommits,
          ai_lines_added: aiLinesAdded,
          ai_lines_removed: aiLinesRemoved,
        })
    }

    // Update repo last push time
    await supabase
      .from('tracked_repos')
      .update({ last_push_at: new Date().toISOString() })
      .eq('id', trackedRepo.id)

    return NextResponse.json({
      success: true,
      processed: {
        commits: totalCommits,
        ai_commits: aiCommits,
      },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GitHub sends a ping event when webhook is first set up
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'github-webhook' })
}
