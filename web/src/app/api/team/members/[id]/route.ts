import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// PATCH /api/team/members/[id] - Update member role
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

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin or member.' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get the target member's team membership
    const { data: targetMember } = await db
      .from('team_members')
      .select('team_id, user_id, role')
      .eq('user_id', memberId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot change owner's role
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change the owner\'s role' }, { status: 400 })
    }

    // Check if current user is owner of this team
    const { data: currentUserMembership } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', targetMember.team_id)
      .eq('user_id', user.id)
      .single()

    if (!currentUserMembership || currentUserMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only team owners can change member roles' }, { status: 403 })
    }

    // Update the role
    const { error } = await db
      .from('team_members')
      .update({ role })
      .eq('team_id', targetMember.team_id)
      .eq('user_id', memberId)

    if (error) {
      console.error('Error updating role:', error)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/team/members/[id] - Remove member from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const teamId = request.nextUrl.searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get the target member's team membership
    const { data: targetMember } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', memberId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot remove the owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the team owner' }, { status: 400 })
    }

    // Check if current user is owner or admin of this team
    const { data: currentUserMembership } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!currentUserMembership || !['owner', 'admin'].includes(currentUserMembership.role)) {
      return NextResponse.json({ error: 'Only team owners and admins can remove members' }, { status: 403 })
    }

    // Admins can only remove regular members, not other admins
    if (currentUserMembership.role === 'admin' && targetMember.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot remove other admins' }, { status: 403 })
    }

    // Remove the member
    const { error } = await db
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId)

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
