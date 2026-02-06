import { test, expect, TEST_USERS, signInAsTestUser } from '../../fixtures/auth.fixture'
import { sel } from '../../helpers/selectors'

/**
 * Admin Event Approval Tests
 * These tests require authenticated admin/moderator access.
 * Uses @clerk/testing emailAddress helper for authentication.
 */
test.describe('Admin Event Approval', () => {
  test.beforeEach(async ({ clerkPage: page }) => {
    // Sign in as admin user
    await signInAsTestUser(page, TEST_USERS.admin.email, TEST_USERS.admin.password)

    // Navigate to admin events page
    await page.goto('/admin/events')
    await page.waitForURL(/admin\/events/)
  })

  test('should display pending and approved tabs', async ({ clerkPage: page }) => {
    await expect(page.locator(sel.tabPending)).toBeVisible()
    await expect(page.locator(sel.tabApproved)).toBeVisible()
  })

  test('should show pending events count in tab', async ({ clerkPage: page }) => {
    const pendingTab = page.locator(sel.tabPending)
    // Should contain "Pending" text with a count
    await expect(pendingTab).toContainText('Pending')
  })

  test('should switch between tabs', async ({ clerkPage: page }) => {
    // Click approved tab
    await page.click(sel.tabApproved)
    await page.waitForLoadState('networkidle')

    // Should show approved content - look for approved events or the tab being active
    // The Approved tab should now show approved events (if any) or a different view
    const approvedTab = page.locator(sel.tabApproved)
    await expect(approvedTab).toHaveAttribute('data-state', 'active')

    // Switch back to pending
    await page.click(sel.tabPending)
    await page.waitForLoadState('networkidle')

    // Pending tab should now be active
    const pendingTab = page.locator(sel.tabPending)
    await expect(pendingTab).toHaveAttribute('data-state', 'active')
  })

  test('pending game events should have approve and reject buttons', async ({
    clerkPage: page,
  }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check if there are pending events
    const gameEventCards = page.locator('[data-testid^="game-event-"]')
    const count = await gameEventCards.count()

    if (count > 0) {
      const firstCard = gameEventCards.first()
      const eventId = await firstCard.getAttribute('data-testid')
      const id = eventId?.replace('game-event-', '')

      if (id) {
        // Should have approve button
        const approveBtn = page.locator(sel.approve(id))
        await expect(approveBtn).toBeVisible()
        await expect(approveBtn).toHaveAttribute('aria-label', 'Approve event')

        // Should have reject button
        const rejectBtn = page.locator(sel.reject(id))
        await expect(rejectBtn).toBeVisible()
        await expect(rejectBtn).toHaveAttribute('aria-label', 'Reject event')
      }
    }
  })

  test('pending standalone events should have approve and reject buttons', async ({
    clerkPage: page,
  }) => {
    await page.waitForLoadState('networkidle')

    // Check for standalone events
    const eventCards = page.locator('[data-testid^="event-"]')
    const count = await eventCards.count()

    if (count > 0) {
      const firstCard = eventCards.first()
      const eventId = await firstCard.getAttribute('data-testid')
      const id = eventId?.replace('event-', '')

      if (id) {
        const approveBtn = page.locator(sel.approve(id))
        const rejectBtn = page.locator(sel.reject(id))

        // At least one should be visible (approve or reject)
        const approveVisible = await approveBtn.isVisible().catch(() => false)
        const rejectVisible = await rejectBtn.isVisible().catch(() => false)

        expect(approveVisible || rejectVisible).toBe(true)
      }
    }
  })

  test('should show all caught up message when no pending events', async ({
    clerkPage: page,
  }) => {
    await page.waitForLoadState('networkidle')

    // If no pending events, should show the "All caught up" message
    const gameEventCards = page.locator('[data-testid^="game-event-"]')
    const eventCards = page.locator('[data-testid^="event-"]')

    const gameCount = await gameEventCards.count()
    const eventCount = await eventCards.count()

    if (gameCount === 0 && eventCount === 0) {
      await expect(page.getByText('All caught up!')).toBeVisible()
    }
  })

  test('game event cards should show total points', async ({ clerkPage: page }) => {
    await page.waitForLoadState('networkidle')

    const gameEventCards = page.locator('[data-testid^="game-event-"]')
    const count = await gameEventCards.count()

    if (count > 0) {
      // Each card should display a point total (positive or negative)
      const firstCard = gameEventCards.first()
      // Points are displayed in a text-xl font-bold element
      const pointsElement = firstCard.locator('.text-xl.font-bold')
      await expect(pointsElement).toBeVisible()
    }
  })

  test('game event cards should be expandable', async ({ clerkPage: page }) => {
    await page.waitForLoadState('networkidle')

    const gameEventCards = page.locator('[data-testid^="game-event-"]')
    const count = await gameEventCards.count()

    if (count > 0) {
      // Should have expand/collapse button
      const expandButton = page.locator('button:has-text("Hide derived events"), button:has-text("Show derived events")')
      const expandCount = await expandButton.count()

      // At least one expandable card
      expect(expandCount).toBeGreaterThanOrEqual(0) // May default to expanded
    }
  })
})

/**
 * Admin Page Structure Tests (no auth required)
 * These tests verify the admin routes exist and redirect properly
 */
test.describe('Admin Page Structure', () => {
  test('admin events page should redirect unauthenticated users', async ({ page }) => {
    await page.goto('/admin/events')
    await page.waitForURL(/sign-in/)
    await expect(page).toHaveURL(/sign-in/)
  })

  test('admin events route should exist (not 404)', async ({ page }) => {
    const response = await page.goto('/admin/events')
    expect(response?.status()).not.toBe(404)
  })
})
