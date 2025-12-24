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
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('api_key, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      api_key: profile.api_key,
      email: profile.email,
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
    const { error: updateError } = await adminClient
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
