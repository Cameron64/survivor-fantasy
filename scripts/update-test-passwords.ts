/**
 * Update test user passwords in Clerk
 * Run with: pnpm tsx scripts/update-test-passwords.ts
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY not set')
  process.exit(1)
}

const BASE_URL = 'https://api.clerk.com/v1'

// New unique passwords that won't be in breach databases
const NEW_PASSWORD = 'SurvivorFantasy2025_E2E!'

const testUserIds = [
  'user_39H6pR74TsSowJTwawzWAoeRUVD', // admin
  'user_39H6pRBmYHqimOuVr2bYfM92cjJ', // mod
  'user_39H6pUDPStU61z9EyisZBWqXW9m', // user
]

async function updatePassword(userId: string) {
  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password: NEW_PASSWORD,
      skip_password_checks: true,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to update ${userId}: ${error}`)
  }

  return res.json()
}

async function main() {
  console.log(`Updating passwords to: ${NEW_PASSWORD}\n`)

  for (const userId of testUserIds) {
    try {
      await updatePassword(userId)
      console.log(`✓ Updated password for ${userId}`)
    } catch (error) {
      console.error(`✗ Failed to update ${userId}:`, error)
    }
  }

  console.log('\n--- Update auth.fixture.ts with new password ---')
  console.log(`password: '${NEW_PASSWORD}'`)
}

main().catch(console.error)
