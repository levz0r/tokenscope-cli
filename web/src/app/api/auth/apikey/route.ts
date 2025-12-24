import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET: Retrieve current API key
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('api_key, email')
      .eq('id', user.id)
      .limit(1) as { data: { api_key: string; email: string }[] | null }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      api_key: profiles[0].api_key,
      email: profiles[0].email,
    })
  } catch (error) {
    console.error('API key fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Regenerate API key
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate new key directly instead of using RPC
    const newKey = [...Array(48)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')

    const adminClient = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminClient as any)
      .from('profiles')
      .update({
        api_key: newKey,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('API key regeneration error:', updateError)
      return NextResponse.json(
        { error: 'Failed to regenerate API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      api_key: newKey,
      message: 'API key regenerated successfully. Update your CLI configuration.',
    })
  } catch (error) {
    console.error('API key regeneration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
