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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-950/30 rounded-full blur-[150px]" />
      <Card className="w-full max-w-md border-white/5 bg-white/[0.02] relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            TokenScope
          </CardTitle>
          <CardDescription className="text-gray-400">
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
                    brand: '#10b981',
                    brandAccent: '#059669',
                    inputBackground: 'rgba(255, 255, 255, 0.02)',
                    inputText: 'white',
                    inputPlaceholder: 'rgb(156, 163, 175)',
                    inputBorder: 'rgba(255, 255, 255, 0.1)',
                    inputBorderFocus: '#10b981',
                    inputBorderHover: 'rgba(255, 255, 255, 0.15)',
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
