import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// List organization members
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

    // Get members with profile info
    const { data: members, error } = await db
      .from('organization_members')
      .select(`
        id,
        role,
        created_at,
        user_id,
        profiles:user_id (
          id,
          email,
          name
        )
      `)
      .eq('org_id', orgId)
      .order('created_at')

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Flatten the response
    const formattedMembers = members?.map((m: {
      id: string
      role: string
      created_at: string
      user_id: string
      profiles: { id: string; email: string; name: string | null }
    }) => ({
      id: m.id,
      userId: m.user_id,
      role: m.role,
      createdAt: m.created_at,
      email: m.profiles?.email,
      name: m.profiles?.name
    })) || []

    return NextResponse.json({ members: formattedMembers })
  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
