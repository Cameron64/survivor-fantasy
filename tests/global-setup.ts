import { clerkSetup } from '@clerk/testing/playwright'
import { FullConfig } from '@playwright/test'
import { execSync } from 'child_process'

/**
 * Global setup for Playwright tests.
 * Runs once before all tests.
 */
export default async function globalSetup(config: FullConfig) {
  // Initialize Clerk testing mode
  // This enables programmatic authentication without real OAuth flows
  await clerkSetup()

  // Seed the test database with isolated test data
  // This creates a separate test league (season 99) that doesn't affect
  // production/development data
  console.log('Seeding test database...')
  try {
    execSync('pnpm db:seed:test', {
      stdio: 'inherit',
      env: process.env,
    })
  } catch (error) {
    console.error('Failed to seed test database:', error)
    throw error
  }

  // Test users created by seed-test.ts:
  // - user_test_admin (ADMIN) - admin@e2etest.local
  // - user_test_mod (MODERATOR) - mod@e2etest.local
  // - user_test_1 (USER) - user@e2etest.local
}
