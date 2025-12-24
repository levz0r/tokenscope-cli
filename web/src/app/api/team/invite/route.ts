import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/team/invite - Create a new invite
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId, email, role = 'member' } = await request.json()

    if (!teamId || !email) {
      return NextResponse.json({ error: 'Team ID and email are required' }, { status: 400 })
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is owner or admin of this team
    const { data: membership } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only team owners and admins can invite members' }, { status: 403 })
    }

    // Check if user is already a member
    const { data: existingMember } = await db
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', (
        await db.from('profiles').select('id').eq('email', email).single()
      ).data?.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 })
    }

    // Check for existing pending invite
    const { data: existingInvite } = await db
      .from('team_invites')
      .select('id, expires_at')
      .eq('team_id', teamId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .single()

    if (existingInvite) {
      // If expired, delete it and create new one
      if (new Date(existingInvite.expires_at) < new Date()) {
        await db.from('team_invites').delete().eq('id', existingInvite.id)
      } else {
        return NextResponse.json({ error: 'An invite has already been sent to this email' }, { status: 400 })
      }
    }

    // Create the invite
    const { data: invite, error } = await db
      .from('team_invites')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      })
      .select('id, token, email, role, expires_at')
      .single()

    if (error) {
      console.error('Error creating invite:', error)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Get team name for the response
    const { data: team } = await db
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single()

    return NextResponse.json({
      invite: {
        ...invite,
        teamName: team?.name,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invite.token}`,
      },
    })
  } catch (error) {
    console.error('Error in invite endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/team/invite - List pending invites for user's teams
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamId = request.nextUrl.searchParams.get('teamId')
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is owner or admin of this team
    const { data: membership } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get pending invites
    const { data: invites } = await db
      .from('team_invites')
      .select('id, email, role, created_at, expires_at, invited_by, profiles(email, name)')
      .eq('team_id', teamId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    return NextResponse.json({ invites: invites || [] })
  } catch (error) {
    console.error('Error listing invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
