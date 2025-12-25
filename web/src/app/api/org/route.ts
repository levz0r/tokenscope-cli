import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Create organization
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Create organization
    const { data: org, error: orgError } = await db
      .from('organizations')
      .insert({ name: name.trim() })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json({
        error: 'Failed to create organization',
        details: orgError.message
      }, { status: 500 })
    }

    // Add user as owner
    const { error: memberError } = await db
      .from('organization_members')
      .insert({
        org_id: org.id,
        user_id: user.id,
        role: 'owner'
      })

    if (memberError) {
      // Rollback org creation
      await db.from('organizations').delete().eq('id', org.id)
      console.error('Error adding owner:', memberError)
      return NextResponse.json({
        error: 'Failed to create organization',
        details: memberError.message
      }, { status: 500 })
    }

    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error('Error in organization creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// List user's organizations
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get user's org memberships
    const { data: memberships, error } = await db
      .from('organization_members')
      .select('role, org_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching memberships:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    if (!memberships?.length) {
      return NextResponse.json({ organizations: [] })
    }

    // Get organizations
    const orgIds = memberships.map((m: { org_id: string }) => m.org_id)
    const { data: orgs } = await db
      .from('organizations')
      .select('id, name, slug, created_at')
      .in('id', orgIds)

    const orgsWithRoles = orgs?.map((org: { id: string; name: string; slug: string | null; created_at: string }) => ({
      ...org,
      role: memberships.find((m: { org_id: string; role: string }) => m.org_id === org.id)?.role || 'member'
    })) || []

    return NextResponse.json({ organizations: orgsWithRoles })
  } catch (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
