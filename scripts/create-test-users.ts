/**
 * Create test users in Clerk for E2E testing
 * Run with: pnpm tsx scripts/create-test-users.ts
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY not set. Run with:')
  console.error('  CLERK_SECRET_KEY=sk_test_xxx pnpm tsx scripts/create-test-users.ts')
  process.exit(1)
}

const BASE_URL = 'https://api.clerk.com/v1'

interface ClerkUser {
  id: string
  email_addresses: { email_address: string }[]
  first_name: string | null
  last_name: string | null
}

async function clerkApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Clerk API error: ${res.status} ${error}`)
  }

  return res.json()
}

async function findUserByEmail(email: string): Promise<ClerkUser | null> {
  const encoded = encodeURIComponent(email)
  const users = await clerkApi(`/users?email_address=${encoded}`)
  return users.length > 0 ? users[0] : null
}

async function createUser(email: string, firstName: string, lastName: string, password: string): Promise<ClerkUser> {
  return clerkApi('/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [email],
      first_name: firstName,
      last_name: lastName,
      password,
      skip_password_checks: true,
      skip_password_requirement: false,
    }),
  })
}

async function main() {
  // Use +suffix pattern for test emails (e.g., yourreal+e2eadmin@gmail.com works if you have it)
  // Or use example.com which Clerk accepts for test instances
  const testUsers = [
    { email: 'e2e-admin@example.com', firstName: 'E2E', lastName: 'Admin', password: 'TestPassword123!' },
    { email: 'e2e-mod@example.com', firstName: 'E2E', lastName: 'Moderator', password: 'TestPassword123!' },
    { email: 'e2e-user@example.com', firstName: 'E2E', lastName: 'User', password: 'TestPassword123!' },
  ]

  console.log('Creating test users in Clerk...\n')

  const createdUsers: { email: string; clerkId: string }[] = []

  for (const user of testUsers) {
    try {
      // Check if user already exists
      let clerkUser = await findUserByEmail(user.email)

      if (clerkUser) {
        console.log(`✓ User ${user.email} already exists: ${clerkUser.id}`)
      } else {
        clerkUser = await createUser(user.email, user.firstName, user.lastName, user.password)
        console.log(`✓ Created user ${user.email}: ${clerkUser.id}`)
      }

      createdUsers.push({ email: user.email, clerkId: clerkUser.id })
    } catch (error) {
      console.error(`✗ Failed to create ${user.email}:`, error)
    }
  }

  console.log('\n--- Update prisma/seed-test.ts with these IDs ---\n')
  console.log('const testUsers = [')
  for (const u of createdUsers) {
    const role = u.email.includes('admin') ? 'ADMIN' : u.email.includes('mod') ? 'MODERATOR' : 'USER'
    console.log(`  { clerkId: '${u.clerkId}', email: '${u.email}', role: '${role}' },`)
  }
  console.log(']\n')
}

main().catch(console.error)
