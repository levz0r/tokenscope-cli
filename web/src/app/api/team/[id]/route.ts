import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
