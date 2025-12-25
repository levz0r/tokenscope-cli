import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role } = await request.json()

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get the membership being updated
    const { data: targetMembership } = await db
      .from('organization_members')
      .select('org_id, user_id, role')
      .eq('id', memberId)
      .single()

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if current user is owner
    const { data: currentUserMembership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', targetMembership.org_id)
      .eq('user_id', user.id)
      .single()

    if (!currentUserMembership || currentUserMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can change roles' }, { status: 403 })
    }

    // Cannot change owner's role
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 400 })
    }

    // Update role
    const { error } = await db
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)

    if (error) {
      console.error('Error updating role:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const url = new URL(request.url)
    const orgId = url.searchParams.get('orgId')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get the membership being deleted
    const { data: targetMembership } = await db
      .from('organization_members')
      .select('org_id, user_id, role')
      .eq('id', memberId)
      .single()

    if (!targetMembership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Verify orgId matches if provided
    if (orgId && targetMembership.org_id !== orgId) {
      return NextResponse.json({ error: 'Member not in this organization' }, { status: 400 })
    }

    // Check if current user has permission
    const { data: currentUserMembership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', targetMembership.org_id)
      .eq('user_id', user.id)
      .single()

    if (!currentUserMembership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    const isOwner = currentUserMembership.role === 'owner'
    const isAdmin = currentUserMembership.role === 'admin'

    // Cannot remove the owner
    if (targetMembership.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 })
    }

    // Admins can only remove members, not other admins
    if (isAdmin && targetMembership.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot remove other admins' }, { status: 403 })
    }

    // Only owner or admin can remove members
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 })
    }

    // Delete membership
    const { error } = await db
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Error removing member:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
