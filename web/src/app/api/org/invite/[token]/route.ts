import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/org/invite/[token] - Get invite details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    const { data: invite, error } = await db
      .from('organization_invites')
      .select('id, email, role, expires_at, accepted_at, org_id, organizations(name)')
      .eq('token', token)
      .single()

    if (error || !invite) {
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
        orgName: invite.organizations?.name,
        expiresAt: invite.expires_at,
      },
    })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/org/invite/[token] - Accept invite
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

    // Get invite
    const { data: invite, error: inviteError } = await db
      .from('organization_invites')
      .select('id, email, role, expires_at, accepted_at, org_id')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: 'Invite has already been accepted' }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Check email matches
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({
        error: 'This invite was sent to a different email address'
      }, { status: 403 })
    }

    // Check if already a member
    const { data: existingMember } = await db
      .from('organization_members')
      .select('id')
      .eq('org_id', invite.org_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      // Mark invite as accepted anyway
      await db
        .from('organization_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      return NextResponse.json({ error: 'You are already a member of this organization' }, { status: 400 })
    }

    // Add user as member
    const { error: memberError } = await db
      .from('organization_members')
      .insert({
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role,
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 })
    }

    // Mark invite as accepted
    await db
      .from('organization_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({
      success: true,
      orgId: invite.org_id,
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/org/invite/[token] - Revoke invite
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

    // Get invite
    const { data: invite } = await db
      .from('organization_invites')
      .select('id, org_id')
      .eq('token', token)
      .single()

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Check if user is owner or admin
    const { data: membership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', invite.org_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only org owners and admins can revoke invites' }, { status: 403 })
    }

    // Delete invite
    const { error } = await db
      .from('organization_invites')
      .delete()
      .eq('id', invite.id)

    if (error) {
      console.error('Error deleting invite:', error)
      return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
