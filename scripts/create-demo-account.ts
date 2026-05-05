import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim()
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key.trim()] = value
  }
})

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function createDemoAccount() {
  const email = 'keestory@demo.com'
  const password = 'RLgus60441@'
  const displayName = 'Demo User'

  console.log('Creating demo account...')
  console.log('Email:', email)
  console.log('Password:', password)

  // Check if user exists and delete if so
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find(u => u.email === email)

  if (existingUser) {
    console.log('Existing user found, deleting...')
    await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
  }

  // Create new user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName
    }
  })

  if (error) {
    console.error('Error creating user:', error)
    process.exit(1)
  }

  console.log('User created successfully!')
  console.log('User ID:', data.user.id)

  // Create profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: data.user.id,
      email,
      display_name: displayName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (profileError) {
    console.error('Error creating profile:', profileError)
  } else {
    console.log('Profile created successfully!')
  }

  console.log('\n=== Demo Account Credentials ===')
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('================================')
}

createDemoAccount()
