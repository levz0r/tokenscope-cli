import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/org/invite - Create a new invite
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, email, role = 'member' } = await request.json()

    if (!orgId || !email) {
      return NextResponse.json({ error: 'Organization ID and email are required' }, { status: 400 })
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is owner or admin of this org
    const { data: membership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only org owners and admins can invite members' }, { status: 403 })
    }

    // Check if user is already a member
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (profile) {
      const { data: existingMember } = await db
        .from('organization_members')
        .select('id')
        .eq('org_id', orgId)
        .eq('user_id', profile.id)
        .single()

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 })
      }
    }

    // Check for existing pending invite
    const { data: existingInvite } = await db
      .from('organization_invites')
      .select('id, expires_at')
      .eq('org_id', orgId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .single()

    if (existingInvite) {
      // If expired, delete it and create new one
      if (new Date(existingInvite.expires_at) < new Date()) {
        await db.from('organization_invites').delete().eq('id', existingInvite.id)
      } else {
        return NextResponse.json({ error: 'An invite has already been sent to this email' }, { status: 400 })
      }
    }

    // Generate token
    const token = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

    // Create the invite
    const { data: invite, error } = await db
      .from('organization_invites')
      .insert({
        org_id: orgId,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        token,
      })
      .select('id, token, email, role, expires_at')
      .single()

    if (error) {
      console.error('Error creating invite:', error)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Get org name for the response
    const { data: org } = await db
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    return NextResponse.json({
      invite: {
        ...invite,
        orgName: org?.name,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/org/invite/${invite.token}`,
      },
    })
  } catch (error) {
    console.error('Error in invite endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/org/invite - List pending invites for an org
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = request.nextUrl.searchParams.get('orgId')
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is owner or admin of this org
    const { data: membership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get pending invites
    const { data: invites } = await db
      .from('organization_invites')
      .select('id, email, role, created_at, expires_at, invited_by, profiles:invited_by(email, name)')
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    return NextResponse.json({ invites: invites || [] })
  } catch (error) {
    console.error('Error listing invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
