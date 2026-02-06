import { test, expect, TEST_USERS, signInAsTestUser } from '../../fixtures/auth.fixture'
import { sel } from '../../helpers/selectors'

/**
 * Event Submission Tests
 * These tests require authenticated user access.
 * Uses @clerk/testing emailAddress helper for authentication.
 */
test.describe('Tribal Council Event Submission', () => {
  test.beforeEach(async ({ clerkPage: page }) => {
    // Sign in as regular user
    await signInAsTestUser(page, TEST_USERS.user.email, TEST_USERS.user.password)

    // Navigate to event submission
    await page.goto('/events/submit')
    await page.waitForLoadState('networkidle')
  })

  test('should display all event type options', async ({ clerkPage: page }) => {
    // Verify all 7 event types are visible
    await expect(page.locator(sel.eventType('TRIBAL_COUNCIL'))).toBeVisible()
    await expect(page.locator(sel.eventType('IMMUNITY_CHALLENGE'))).toBeVisible()
    await expect(page.locator(sel.eventType('REWARD_CHALLENGE'))).toBeVisible()
    await expect(page.locator(sel.eventType('IDOL_FOUND'))).toBeVisible()
    await expect(page.locator(sel.eventType('FIRE_MAKING'))).toBeVisible()
    await expect(page.locator(sel.eventType('QUIT_MEDEVAC'))).toBeVisible()
    await expect(page.locator(sel.eventType('ENDGAME'))).toBeVisible()
  })

  test('should navigate to tribal council form on type selection', async ({
    clerkPage: page,
  }) => {
    await page.click(sel.eventType('TRIBAL_COUNCIL'))
    await page.waitForLoadState('networkidle')

    // Should show week indicator
    await expect(page.locator(sel.weekEditButton)).toBeVisible()

    // Should show step indicator
    await expect(page.locator(sel.stepIndicator)).toBeVisible()

    // Should be on attendees step
    await expect(page.getByText('Who went to Tribal Council?')).toBeVisible()
  })

  test('should allow editing week number', async ({ clerkPage: page }) => {
    await page.click(sel.eventType('TRIBAL_COUNCIL'))
    await page.waitForLoadState('networkidle')

    // Click week edit button
    await page.click(sel.weekEditButton)

    // Should show week input
    await expect(page.locator(sel.weekInput)).toBeVisible()

    // Change week to 5
    await page.fill(sel.weekInput, '5')
    await page.press(sel.weekInput, 'Enter')

    // Should show updated week
    await expect(page.locator(sel.weekEditButton)).toContainText('Week 5')
  })

  test('should select attendees by tribe', async ({ clerkPage: page }) => {
    await page.click(sel.eventType('TRIBAL_COUNCIL'))
    await page.waitForLoadState('networkidle')

    // Get the first tribe button and click it
    const tribeButtons = page.locator('[data-testid^="tribe-"]')
    const firstTribe = tribeButtons.first()
    await firstTribe.click()

    // At least some contestants should now be selected
    const selectedContestants = page.locator('[data-testid^="contestant-"][aria-selected="true"]')
    await expect(selectedContestants.first()).toBeVisible()
  })

  test('should navigate through wizard steps', async ({ clerkPage: page }) => {
    await page.click(sel.eventType('TRIBAL_COUNCIL'))
    await page.waitForLoadState('networkidle')

    // Step 1: Select attendees (click first tribe)
    const tribeButtons = page.locator('[data-testid^="tribe-"]')
    await tribeButtons.first().click()

    // Click Next button
    await page.click('button:has-text("Next: Record Votes")')

    // Step 2: Should be on votes step
    await expect(page.getByText('How did everyone vote?')).toBeVisible()

    // Verify vote dropdowns are present
    const voteDropdowns = page.locator('[data-testid^="vote-"]')
    await expect(voteDropdowns.first()).toBeVisible()
  })

  test('should show back button and allow navigation backwards', async ({
    clerkPage: page,
  }) => {
    await page.click(sel.eventType('TRIBAL_COUNCIL'))
    await page.waitForLoadState('networkidle')

    // Select a tribe and go to votes step
    const tribeButtons = page.locator('[data-testid^="tribe-"]')
    await tribeButtons.first().click()
    await page.click('button:has-text("Next: Record Votes")')

    // Should be on votes step
    await expect(page.getByText('How did everyone vote?')).toBeVisible()

    // Click back
    await page.click(sel.button.back)

    // Should be back on attendees step
    await expect(page.getByText('Who went to Tribal Council?')).toBeVisible()
  })

  test('should validate required selections before proceeding', async ({
    clerkPage: page,
  }) => {
    await page.click(sel.eventType('TRIBAL_COUNCIL'))
    await page.waitForLoadState('networkidle')

    // Next button should be disabled when no attendees selected
    const nextButton = page.locator('button:has-text("Next: Record Votes")')
    await expect(nextButton).toBeDisabled()

    // Select one contestant (need at least 2)
    const contestantButtons = page.locator('[data-testid^="contestant-"]')
    await contestantButtons.first().click()

    // Still disabled (need 2+ attendees)
    await expect(nextButton).toBeDisabled()

    // Select another
    await contestantButtons.nth(1).click()

    // Now should be enabled
    await expect(nextButton).toBeEnabled()
  })
})

/**
 * Event Submission Page Structure Tests (no auth required)
 */
test.describe('Event Submission Page Structure', () => {
  test('should redirect unauthenticated users from /events/submit', async ({
    page,
  }) => {
    await page.goto('/events/submit')
    await page.waitForURL(/sign-in/)
    await expect(page).toHaveURL(/sign-in/)
  })

  test('events submit route should exist (not 404)', async ({ page }) => {
    const response = await page.goto('/events/submit')
    expect(response?.status()).not.toBe(404)
  })
})
