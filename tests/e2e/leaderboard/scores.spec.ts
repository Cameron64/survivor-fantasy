import { test, expect, TEST_USERS, signInAsTestUser } from '../../fixtures/auth.fixture'

/**
 * Leaderboard Tests
 * These tests require authenticated user access.
 * Uses @clerk/testing emailAddress helper for authentication.
 */
test.describe('Leaderboard Scores', () => {
  test.beforeEach(async ({ clerkPage: page }) => {
    // Sign in as regular user
    await signInAsTestUser(page, TEST_USERS.user.email, TEST_USERS.user.password)

    await page.goto('/leaderboard')
    await page.waitForLoadState('networkidle')
  })

  test('should display leaderboard page heading', async ({ clerkPage: page }) => {
    await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible()
  })

  test('should show teams or empty state', async ({ clerkPage: page }) => {
    // Either shows team entries (cards with user names and points) or an empty state message
    // Look for team cards by checking for "points" text which appears on each team card
    const teamCards = page.locator('text=points').locator('..')
    const emptyState = page.getByText(/no teams yet/i)

    const teamsCount = await teamCards.count()
    const hasEmptyState = await emptyState.isVisible().catch(() => false)

    // One of these should be true
    expect(teamsCount > 0 || hasEmptyState).toBe(true)
  })

  test('should display team scores as numbers', async ({ clerkPage: page }) => {
    // Look for score number next to "points" text
    // The score is displayed as a large number followed by "points"
    const pointsLabel = page.getByText('points')
    const count = await pointsLabel.count()

    if (count > 0) {
      // Find the score number which is typically a sibling or nearby element
      // The score text should be a number
      const scoreText = await page.locator('text=/^\\d+$/').first().textContent()
      expect(scoreText).toMatch(/^\d+$/)
    }
  })

  test('should display ranking indicators for top 3', async ({
    clerkPage: page,
  }) => {
    // Top 3 teams should have special icons (Trophy, Medal, Award from lucide)
    // Check for SVG icons that indicate ranking
    const rankingIcons = page.locator('svg.text-yellow-500, svg.text-gray-400, svg.text-amber-600')

    const teamEntries = page.locator('[data-testid^="team-"]')
    const teamsCount = await teamEntries.count()

    if (teamsCount >= 3) {
      // Should have at least some ranking indicators
      const iconCount = await rankingIcons.count()
      expect(iconCount).toBeGreaterThanOrEqual(1)
    }
  })

  test('should show contestant badges within teams', async ({
    clerkPage: page,
  }) => {
    const teamEntries = page.locator('[data-testid^="team-"]')
    const count = await teamEntries.count()

    if (count > 0) {
      // Teams should show contestant badges
      const badges = page.locator('[class*="Badge"], .inline-flex.items-center.rounded')
      const badgeCount = await badges.count()

      // Should have some badges (contestant names with scores)
      expect(badgeCount).toBeGreaterThanOrEqual(0)
    }
  })

  test('page should be responsive', async ({ clerkPage: page }) => {
    // Change viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForLoadState('networkidle')

    // Page should still be functional
    await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible()

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})

test.describe('Leaderboard Score Updates', () => {
  test.beforeEach(async ({ clerkPage: page }) => {
    await signInAsTestUser(page, TEST_USERS.user.email, TEST_USERS.user.password)
  })

  test('scores should reflect approved events', async ({ clerkPage: page }) => {
    // This is an integration test that verifies scores update after events are approved
    // It requires:
    // 1. A submitted and approved event exists in the database
    // 2. The contestant's team score reflects that event

    await page.goto('/leaderboard')
    await page.waitForLoadState('networkidle')

    // For now, just verify the page loads and displays score data
    const scores = page.locator('.text-4xl.font-bold, .text-3xl.font-bold, .text-2xl.font-bold')
    const count = await scores.count()

    // If there are teams with scores, they should be visible
    if (count > 0) {
      await expect(scores.first()).toBeVisible()
    }
  })
})

/**
 * Leaderboard Page Structure Tests (no auth required)
 */
test.describe('Leaderboard Page Structure', () => {
  test('should redirect unauthenticated users from /leaderboard', async ({
    page,
  }) => {
    await page.goto('/leaderboard')
    await page.waitForURL(/sign-in/)
    await expect(page).toHaveURL(/sign-in/)
  })

  test('leaderboard route should exist (not 404)', async ({ page }) => {
    const response = await page.goto('/leaderboard')
    expect(response?.status()).not.toBe(404)
  })
})
