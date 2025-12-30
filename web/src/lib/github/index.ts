import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { readFileSync, existsSync } from 'fs'

// GitHub App credentials from environment
const APP_ID = process.env.GITHUB_APP_ID!
const CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

// Parse private key - handle various formats
function parsePrivateKey(): string {
  const rawKey = process.env.GITHUB_PRIVATE_KEY || ''

  // Try reading from file if path is provided
  if (rawKey.endsWith('.pem') && existsSync(rawKey)) {
    return readFileSync(rawKey, 'utf-8')
  }

  // Check if key already has real newlines
  if (rawKey.includes('-----BEGIN') && rawKey.includes('\n')) {
    return rawKey
  }

  // Replace literal \n with actual newlines
  return rawKey.replace(/\\n/g, '\n')
}

const PRIVATE_KEY = parsePrivateKey()
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!

export { WEBHOOK_SECRET }

// Create an authenticated Octokit instance for an installation
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
    installationId,
  })

  const { token } = await auth({ type: 'installation' })
  return new Octokit({ auth: token })
}

// Get the GitHub App's Octokit instance (for app-level operations)
export function getAppOctokit(): Octokit {
  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
  })

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: APP_ID,
      privateKey: PRIVATE_KEY,
    },
  })
}

// Generate the GitHub App installation URL
export function getInstallationUrl(): string {
  // This URL will prompt users to install the GitHub App
  return `https://github.com/apps/tokenscope/installations/new`
}

// Exchange OAuth code for user access token
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  token_type: string
  scope: string
}> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}

// AI tool types
export type AITool = 'claude-code' | null

// Check if a commit message indicates AI generation and return which tool
export function detectAITool(commitMessage: string): AITool {
  const claudeIndicators = [
    'Co-Authored-By: Claude',
    'co-authored-by: claude',
    '🤖 Generated with Claude Code',
    'Generated with [Claude Code]',
    'Co-Authored-By: Claude Opus',
    'Co-Authored-By: Claude Sonnet',
  ]

  const lowerMessage = commitMessage.toLowerCase()

  if (claudeIndicators.some(indicator => lowerMessage.includes(indicator.toLowerCase()))) {
    return 'claude-code'
  }

  return null
}

// Legacy function for backwards compatibility
export function isAIGeneratedCommit(commitMessage: string): boolean {
  return detectAITool(commitMessage) !== null
}

// Parse commit stats from GitHub API response
export interface CommitStats {
  sha: string
  message: string
  authorName: string
  authorEmail: string
  isAIGenerated: boolean
  aiTool: AITool
  additions: number
  deletions: number
  committedAt: Date
}

export function parseCommit(commit: {
  sha: string
  commit: {
    message: string
    author: { name?: string; email?: string; date?: string } | null
  }
  stats?: { additions?: number; deletions?: number }
}): CommitStats {
  const aiTool = detectAITool(commit.commit.message)
  return {
    sha: commit.sha,
    message: commit.commit.message,
    authorName: commit.commit.author?.name || 'Unknown',
    authorEmail: commit.commit.author?.email || '',
    isAIGenerated: aiTool !== null,
    aiTool,
    additions: commit.stats?.additions || 0,
    deletions: commit.stats?.deletions || 0,
    committedAt: new Date(commit.commit.author?.date || Date.now()),
  }
}

// Sync commits for a repository
export async function syncRepoCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string = 'main',
  perPage: number = 100
): Promise<{
  totalCommits: number
  aiCommits: number
  aiLinesAdded: number
  aiLinesRemoved: number
  commits: CommitStats[]
}> {
  let totalCommits = 0
  let aiCommits = 0
  let aiLinesAdded = 0
  let aiLinesRemoved = 0
  const commits: CommitStats[] = []

  try {
    // Fetch commits from the default branch
    const { data: commitList } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: defaultBranch,
      per_page: perPage,
    })

    totalCommits = commitList.length

    // Process each commit
    for (const commit of commitList) {
      // Get detailed commit info with stats
      try {
        const { data: detailedCommit } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commit.sha,
        })

        const parsed = parseCommit({
          sha: detailedCommit.sha,
          commit: {
            message: detailedCommit.commit.message,
            author: detailedCommit.commit.author,
          },
          stats: detailedCommit.stats,
        })

        commits.push(parsed)

        if (parsed.isAIGenerated) {
          aiCommits++
          aiLinesAdded += parsed.additions
          aiLinesRemoved += parsed.deletions
        }
      } catch {
        // Skip commits we can't fetch details for
        continue
      }
    }
  } catch (error) {
    console.error(`Failed to sync commits for ${owner}/${repo}:`, error)
  }

  return {
    totalCommits,
    aiCommits,
    aiLinesAdded,
    aiLinesRemoved,
    commits,
  }
}
