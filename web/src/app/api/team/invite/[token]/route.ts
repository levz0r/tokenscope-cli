import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface InviteData {
  id: string
  team_id: string
  email: string
  role: string
  expires_at: string
  accepted_at: string | null
  teams: { name: string } | null
}

// GET /api/team/invite/[token] - Get invite details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    const { data: inviteData } = await db
      .from('team_invites')
      .select('id, team_id, email, role, expires_at, accepted_at, teams(name)')
      .eq('token', token)
      .single()

    const invite = inviteData as InviteData | null

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Invite has already been accepted' }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        teamName: invite.teams?.name,
        expiresAt: invite.expires_at,
      },
    })
  } catch (error) {
    console.error('Error getting invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/team/invite/[token] - Accept invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be logged in to accept an invite' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get the invite
    const { data: inviteData } = await db
      .from('team_invites')
      .select('id, team_id, email, role, expires_at, accepted_at')
      .eq('token', token)
      .single()

    const invite = inviteData as {
      id: string
      team_id: string
      email: string
      role: string
      expires_at: string
      accepted_at: string | null
    } | null

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Invite has already been accepted' }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Check if the logged-in user's email matches the invite
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({
        error: `This invite was sent to ${invite.email}. Please log in with that email address.`,
      }, { status: 403 })
    }

    // Check if user is already a member
    const { data: existingMember } = await db
      .from('team_members')
      .select('id')
      .eq('team_id', invite.team_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      // Mark invite as accepted anyway
      await db
        .from('team_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 })
    }

    // Add user to team
    const { error: memberError } = await db
      .from('team_members')
      .insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role,
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      return NextResponse.json({ error: 'Failed to join team' }, { status: 500 })
    }

    // Mark invite as accepted
    await db
      .from('team_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    // Get team name for response
    const { data: team } = await db
      .from('teams')
      .select('id, name')
      .eq('id', invite.team_id)
      .single()

    return NextResponse.json({
      success: true,
      team: {
        id: team?.id,
        name: team?.name,
      },
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/team/invite/[token] - Cancel/revoke invite (by admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get the invite
    const { data: invite } = await db
      .from('team_invites')
      .select('id, team_id')
      .eq('token', token)
      .single()

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if user is owner or admin of the team
    const { data: membership } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', invite.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the invite
    await db.from('team_invites').delete().eq('id', invite.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
