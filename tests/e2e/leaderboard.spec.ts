import { test, expect } from '@playwright/test'

test.describe('Leaderboard', () => {
  test('should display the leaderboard page', async ({ page }) => {
    await page.goto('/')

    // The page should either show sign-in or redirect to leaderboard
    // When not authenticated, should redirect to sign-in
    await page.waitForURL(/sign-in|leaderboard/, { timeout: 10000 })

    const url = page.url()
    if (url.includes('sign-in')) {
      // Use heading role for stricter matching (Clerk sign-in has multiple "sign in" texts)
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    } else {
      await expect(page.getByText(/leaderboard/i)).toBeVisible()
    }
  })

  test('should have correct page title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/survivor/i)
  })
})

test.describe('Public pages', () => {
  test('sign-in page should be accessible', async ({ page }) => {
    await page.goto('/sign-in')
    // Clerk sign-in page should be visible
    await expect(page).toHaveURL(/sign-in/)
  })

  test('sign-up page should be accessible', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page).toHaveURL(/sign-up/)
  })
})

test.describe('Mobile responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should display mobile navigation', async ({ page }) => {
    await page.goto('/')

    // Should either redirect to sign-in or show mobile layout
    await page.waitForURL(/sign-in|leaderboard/, { timeout: 10000 })

    const url = page.url()
    if (url.includes('sign-in')) {
      // On mobile, the sign-in should be centered
      // Use heading role for stricter matching (Clerk sign-in has multiple "sign in" texts)
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    } else {
      // If authenticated, should see mobile bottom nav
      const bottomNav = page.locator('nav').last()
      await expect(bottomNav).toBeVisible()
    }
  })
})
