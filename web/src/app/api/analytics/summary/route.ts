import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30', 10)

    // Check for API key auth first (for CLI)
    const authHeader = request.headers.get('Authorization')
    let userId: string

    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7)
      const adminClient = createAdminClient()

      const { data: userData, error: userError } = await adminClient
        .rpc('get_user_by_api_key', { key: apiKey })

      if (userError || !userData || userData.length === 0) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        )
      }

      userId = userData[0].user_id
    } else {
      // Session-based auth (for web dashboard)
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      userId = user.id
    }

    // Use admin client to call the function
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .rpc('get_user_analytics_summary', {
        target_user_id: userId,
        days_back: days,
      })

    if (error) {
      console.error('Analytics error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      period: {
        days,
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
