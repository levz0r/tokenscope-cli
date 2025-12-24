import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
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

    // Create team
    const { data: team, error: teamError } = await db
      .from('teams')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return NextResponse.json({
        error: 'Failed to create team',
        details: teamError.message
      }, { status: 500 })
    }

    // Add user as owner
    const { error: memberError } = await db
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner'
      })

    if (memberError) {
      // Rollback team creation
      await db.from('teams').delete().eq('id', team.id)
      console.error('Error adding owner:', memberError)
      return NextResponse.json({
        error: 'Failed to create team',
        details: memberError.message
      }, { status: 500 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error in team creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get user's team memberships
    const { data: memberships, error } = await db
      .from('team_members')
      .select('role, team_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching memberships:', error)
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    if (!memberships?.length) {
      return NextResponse.json({ teams: [] })
    }

    // Get teams
    const teamIds = memberships.map((m: { team_id: string }) => m.team_id)
    const { data: teams } = await db
      .from('teams')
      .select('id, name, created_at')
      .in('id', teamIds)

    const teamsWithRoles = teams?.map((team: { id: string; name: string; created_at: string }) => ({
      ...team,
      role: memberships.find((m: { team_id: string; role: string }) => m.team_id === team.id)?.role || 'member'
    })) || []

    return NextResponse.json({ teams: teamsWithRoles })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
