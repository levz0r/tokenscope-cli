import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Get organization details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check membership
    const { data: membership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Get organization
    const { data: org, error } = await db
      .from('organizations')
      .select('id, name, slug, created_at')
      .eq('id', orgId)
      .single()

    if (error || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get member count
    const { count: memberCount } = await db
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)

    // Get team count
    const { count: teamCount } = await db
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)

    return NextResponse.json({
      organization: {
        ...org,
        role: membership.role,
        memberCount: memberCount || 0,
        teamCount: teamCount || 0
      }
    })
  } catch (error) {
    console.error('Error fetching organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is owner
    const { data: membership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can delete the organization' }, { status: 403 })
    }

    // Unlink sessions from teams in this org (don't delete sessions)
    const { data: teams } = await db
      .from('teams')
      .select('id')
      .eq('org_id', orgId)

    if (teams?.length) {
      const teamIds = teams.map((t: { id: string }) => t.id)
      await db
        .from('sessions')
        .update({ team_id: null })
        .in('team_id', teamIds)
    }

    // Delete organization (cascades to org_members, org_invites, teams, team_members)
    const { error } = await db
      .from('organizations')
      .delete()
      .eq('id', orgId)

    if (error) {
      console.error('Error deleting organization:', error)
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is owner
    const { data: membership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can update the organization' }, { status: 403 })
    }

    const updates: { name?: string } = {}
    if (name && typeof name === 'string' && name.trim().length > 0) {
      updates.name = name.trim()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    const { data: org, error } = await db
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }

    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
