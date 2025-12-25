import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is owner or admin of this team
    const { data: teamMembership } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    // Also check if user is org admin (they can manage all teams)
    const { data: team } = await db
      .from('teams')
      .select('org_id')
      .eq('id', teamId)
      .single()

    let canEdit = teamMembership?.role === 'owner' || teamMembership?.role === 'admin'

    if (!canEdit && team?.org_id) {
      const { data: orgMembership } = await db
        .from('organization_members')
        .select('role')
        .eq('org_id', team.org_id)
        .eq('user_id', user.id)
        .single()

      canEdit = orgMembership?.role === 'owner' || orgMembership?.role === 'admin'
    }

    if (!canEdit) {
      return NextResponse.json({
        error: 'Only team or organization admins can rename teams'
      }, { status: 403 })
    }

    // Update team name
    const { data: updatedTeam, error } = await db
      .from('teams')
      .update({ name: name.trim() })
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      console.error('Error updating team:', error)
      return NextResponse.json({
        error: 'Failed to update team',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ team: updatedTeam })
  } catch (error) {
    console.error('Error in team update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is the owner of this team
    const { data: memberships } = await db
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .limit(1)

    if (!memberships || memberships.length === 0 || memberships[0].role !== 'owner') {
      return NextResponse.json({
        error: 'Only team owners can delete teams'
      }, { status: 403 })
    }

    // Delete team members first (foreign key constraint)
    const { error: membersError } = await db
      .from('team_members')
      .delete()
      .eq('team_id', teamId)

    if (membersError) {
      console.error('Error deleting team members:', membersError)
      return NextResponse.json({
        error: 'Failed to delete team',
        details: membersError.message
      }, { status: 500 })
    }

    // Unlink sessions from team (don't delete them)
    await db
      .from('sessions')
      .update({ team_id: null })
      .eq('team_id', teamId)

    // Delete the team
    const { error: teamError } = await db
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (teamError) {
      console.error('Error deleting team:', teamError)
      return NextResponse.json({
        error: 'Failed to delete team',
        details: teamError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in team deletion:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
