import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// List teams in organization
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

    // Check org membership
    const { data: orgMembership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!orgMembership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    // Get teams
    const { data: teams, error } = await db
      .from('teams')
      .select('id, name, created_at')
      .eq('org_id', orgId)
      .order('name')

    if (error) {
      console.error('Error fetching teams:', error)
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    // For org admins/owners, they have implicit access to all teams
    // For regular members, check team membership
    const isOrgAdmin = orgMembership.role === 'owner' || orgMembership.role === 'admin'

    // Get user's team memberships
    const teamIds = teams.map((t: { id: string }) => t.id)
    const { data: teamMemberships } = await db
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)
      .in('team_id', teamIds)

    const teamsWithAccess = teams.map((team: { id: string; name: string; created_at: string }) => {
      const teamMembership = teamMemberships?.find((m: { team_id: string }) => m.team_id === team.id)
      return {
        ...team,
        hasAccess: isOrgAdmin || !!teamMembership,
        role: isOrgAdmin ? 'admin' : (teamMembership?.role || null)
      }
    })

    return NextResponse.json({ teams: teamsWithAccess })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create team in organization
export async function POST(
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

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if user is org owner or admin
    const { data: orgMembership } = await db
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!orgMembership || (orgMembership.role !== 'owner' && orgMembership.role !== 'admin')) {
      return NextResponse.json({ error: 'Only org owners and admins can create teams' }, { status: 403 })
    }

    // Create team with org_id
    const { data: team, error: teamError } = await db
      .from('teams')
      .insert({ name: name.trim(), org_id: orgId })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return NextResponse.json({
        error: 'Failed to create team',
        details: teamError.message
      }, { status: 500 })
    }

    // Add user as team owner
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
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
