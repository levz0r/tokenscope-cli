import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get org GitHub connection status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a member of this org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this org' }, { status: 403 })
    }

    // Get org GitHub installation
    const { data: installation } = await supabase
      .from('org_github_installations')
      .select(`
        id,
        github_org_name,
        github_org_id,
        connected_by,
        created_at
      `)
      .eq('org_id', orgId)
      .single()

    if (!installation) {
      return NextResponse.json({
        connected: false,
        canManage: ['owner', 'admin'].includes(membership.role)
      })
    }

    // Get repo count for this installation
    const { count: repoCount } = await supabase
      .from('tracked_repos')
      .select('*', { count: 'exact', head: true })
      .eq('org_installation_id', installation.id)

    // Get connector's profile
    const { data: connector } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', installation.connected_by)
      .single()

    return NextResponse.json({
      connected: true,
      canManage: ['owner', 'admin'].includes(membership.role),
      installation: {
        id: installation.id,
        github_org_name: installation.github_org_name,
        github_org_id: installation.github_org_id,
        connected_by: connector?.name || connector?.email || 'Unknown',
        connected_at: installation.created_at,
        repo_count: repoCount || 0,
      },
    })

  } catch (error) {
    console.error('Error fetching org GitHub status:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Disconnect org GitHub
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is owner/admin of this org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Must be owner or admin' }, { status: 403 })
    }

    // Delete the org GitHub installation (cascades to tracked_repos via FK)
    const { error: deleteError } = await supabase
      .from('org_github_installations')
      .delete()
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('Error deleting org GitHub installation:', deleteError)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error disconnecting org GitHub:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
