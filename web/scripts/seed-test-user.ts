import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedTestUser() {
  const testEmail = 'test@claude-analytics.local'
  const testApiKey = 'sk_test_claude_analytics_12345'

  console.log('Creating test user...')

  // Create a test user in auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'test-password-123',
    email_confirm: true
  })

  if (authError) {
    if (authError.message.includes('already exists')) {
      console.log('Test user already exists, fetching...')
      const { data: users } = await supabase.auth.admin.listUsers()
      const existingUser = users?.users.find(u => u.email === testEmail)
      if (existingUser) {
        // Update the profile with our test API key
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: existingUser.id,
            email: testEmail,
            api_key: testApiKey
          })

        if (updateError) {
          console.error('Failed to update profile:', updateError)
          return
        }

        console.log('\nTest user configured!')
        console.log('API Key:', testApiKey)
        console.log('User ID:', existingUser.id)
        return
      }
    }
    console.error('Auth error:', authError)
    return
  }

  console.log('Created auth user:', authUser.user.id)

  // Create profile with API key
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authUser.user.id,
      email: testEmail,
      api_key: testApiKey
    })

  if (profileError) {
    console.error('Profile error:', profileError)
    return
  }

  console.log('\nTest user created!')
  console.log('API Key:', testApiKey)
  console.log('User ID:', authUser.user.id)
  console.log('\nUse this API key with: cc-analytics login', testApiKey)
}

seedTestUser().catch(console.error)
