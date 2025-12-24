import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ApiKeySection } from '@/components/settings/ApiKeySection'
import { AccountSection } from '@/components/settings/AccountSection'
import { CLISetupSection } from '@/components/settings/CLISetupSection'

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
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar user={user} profile={profile} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-gray-400">Manage your account and API access</p>
            </div>

            <AccountSection user={user} name={profile?.name || null} />

            <ApiKeySection apiKey={profile?.api_key || ''} lastUsedAt={profile?.api_key_last_used_at} />

            <CLISetupSection apiKey={profile?.api_key || ''} />
          </div>
        </main>
      </div>
    </div>
  )
}
