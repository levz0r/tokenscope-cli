import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ApiKeySection } from '@/components/settings/ApiKeySection'
import { AccountSection } from '@/components/settings/AccountSection'

export default async function SettingsPage() {
  const supabaseAuth = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = supabaseAuth as any

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if profile exists, create if not
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist, create it with an API key
  if (!profile) {
    const newApiKey = [...Array(48)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        api_key: newApiKey,
      })
      .select()
      .single()
    profile = newProfile
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar user={user} profile={profile} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-slate-400">Manage your account and API access</p>
            </div>

            <AccountSection user={user} />

            <ApiKeySection apiKey={profile?.api_key || ''} />

            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">CLI Setup</CardTitle>
                <CardDescription className="text-slate-400">
                  Connect your local Claude Code to this dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-slate-900 p-4 font-mono text-sm">
                  <p className="text-slate-400"># Install Claude Code Analytics</p>
                  <p className="text-green-400">
                    curl -sSL https://raw.githubusercontent.com/levz0r/claude-code-analytics/main/install.sh | bash
                  </p>
                  <p className="mt-4 text-slate-400"># Login with your API key</p>
                  <p className="text-green-400">
                    cc-analytics login {profile?.api_key ? profile.api_key.slice(0, 10) + '...' : 'YOUR_API_KEY'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
