import { test as base, Page } from '@playwright/test'
import { setupClerkTestingToken, clerk } from '@clerk/testing/playwright'

/**
 * Extended Playwright test fixture with Clerk authentication support.
 *
 * Uses @clerk/testing helpers to bypass UI-based sign-in flows.
 * See: https://clerk.com/docs/guides/development/testing/playwright/test-helpers
 */

export type AuthFixtures = {
  /** Page with Clerk testing token applied (no specific role) */
  clerkPage: Page
  /** Clerk testing helper for sign in/out */
  clerkHelper: typeof clerk
}

export const test = base.extend<AuthFixtures>({
  clerkPage: async ({ page }, use) => {
    // Setup Clerk testing token for this page
    await setupClerkTestingToken({ page })
    await use(page)
  },
  clerkHelper: async ({}, use) => {
    await use(clerk)
  },
})

export { expect } from '@playwright/test'

/**
 * Helper to sign in as a test user using Clerk's testing helper.
 * This bypasses UI and MFA verification.
 *
 * Note: Must navigate to a page that loads Clerk first before calling clerk.signIn()
 */
export async function signInAsTestUser(
  page: Page,
  email: string,
  _password: string
) {
  // Navigate to homepage first (required by Clerk's testing helper)
  await page.goto('/')

  // Wait for Clerk to be fully loaded
  await clerk.loaded({ page })

  // Use Clerk's programmatic sign-in helper with emailAddress (requires CLERK_SECRET_KEY)
  // This is simpler than signInParams and works better for testing
  await clerk.signIn({
    page,
    emailAddress: email,
  })

  // Wait for session to be established
  await page.waitForTimeout(1000)
}

/**
 * Helper to sign out
 */
export async function signOut(page: Page) {
  await clerk.signOut({ page })
}

/**
 * Test user credentials from prisma/seed-test.ts
 * These users exist in both Clerk and the database.
 * Password for all: SurvivorFantasy2025_E2E!
 */
export const TEST_USERS = {
  admin: {
    clerkId: 'user_39H6pR74TsSowJTwawzWAoeRUVD',
    email: 'e2e-admin@example.com',
    password: 'SurvivorFantasy2025_E2E!',
    name: 'E2E Admin',
    role: 'ADMIN',
  },
  moderator: {
    clerkId: 'user_39H6pRBmYHqimOuVr2bYfM92cjJ',
    email: 'e2e-mod@example.com',
    password: 'SurvivorFantasy2025_E2E!',
    name: 'E2E Moderator',
    role: 'MODERATOR',
  },
  user: {
    clerkId: 'user_39H6pUDPStU61z9EyisZBWqXW9m',
    email: 'e2e-user@example.com',
    password: 'SurvivorFantasy2025_E2E!',
    name: 'E2E User',
    role: 'USER',
  },
} as const

/**
 * Test league and data info from prisma/seed-test.ts
 */
export const TEST_DATA = {
  league: {
    name: 'E2E Test League',
    season: 99,
  },
  contestants: [
    'Test Player A',
    'Test Player B',
    'Test Player C',
    'Test Player D',
    'Test Player E',
    'Test Player F',
  ],
  tribes: {
    alpha: { name: 'Alpha', color: '#FF5733' },
    beta: { name: 'Beta', color: '#3498DB' },
  },
  // Password for all test users
  defaultPassword: 'SurvivorFantasy2025_E2E!',
} as const
