'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/dashboard')
        router.refresh()
      }
    })

    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Claude Code Analytics
          </CardTitle>
          <CardDescription className="text-slate-400">
            Sign in to view your analytics dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                    inputBackground: 'rgb(30, 41, 59)',
                    inputText: 'white',
                    inputPlaceholder: 'rgb(148, 163, 184)',
                    inputBorder: 'rgb(51, 65, 85)',
                    inputBorderFocus: '#3b82f6',
                    inputBorderHover: 'rgb(71, 85, 105)',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button',
                input: 'auth-input',
              },
            }}
            theme="dark"
            providers={['github']}
            redirectTo={`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
