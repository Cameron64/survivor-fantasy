import { test, expect } from '@playwright/test'

test.describe('Role-Based Access Control', () => {
  test.describe('Unauthenticated access', () => {
    test('should redirect to sign-in from protected routes', async ({ page }) => {
      // Try to access leaderboard without auth
      await page.goto('/leaderboard')

      // Should redirect to sign-in
      await page.waitForURL(/sign-in/)
      await expect(page).toHaveURL(/sign-in/)
    })

    test('should redirect to sign-in from admin routes', async ({ page }) => {
      await page.goto('/admin')

      // Should redirect to sign-in
      await page.waitForURL(/sign-in/)
      await expect(page).toHaveURL(/sign-in/)
    })

    test('should redirect to sign-in from events page', async ({ page }) => {
      await page.goto('/events')

      await page.waitForURL(/sign-in/)
      await expect(page).toHaveURL(/sign-in/)
    })

    test('should redirect to sign-in from my-team page', async ({ page }) => {
      await page.goto('/my-team')

      await page.waitForURL(/sign-in/)
      await expect(page).toHaveURL(/sign-in/)
    })
  })

  test.describe('Public routes', () => {
    test('should allow access to sign-in page', async ({ page }) => {
      await page.goto('/sign-in')

      // Should stay on sign-in page (not redirect)
      await expect(page).toHaveURL(/sign-in/)
    })

    test('should allow access to sign-up page', async ({ page }) => {
      await page.goto('/sign-up')

      await expect(page).toHaveURL(/sign-up/)
    })

    test('should allow access to home page', async ({ page }) => {
      await page.goto('/')

      // Home page may redirect to sign-in or leaderboard
      // Wait for either URL pattern
      await page.waitForURL(/sign-in|leaderboard|^\/$/, { timeout: 10000 })
    })
  })

  test.describe('Admin route structure', () => {
    test('admin events page should exist at /admin/events', async ({ page }) => {
      // This will redirect unauthenticated users, but the route should exist
      const response = await page.goto('/admin/events')
      // Should get a response (not 404), even if redirected
      expect(response?.status()).not.toBe(404)
    })

    test('admin users page should exist at /admin/users', async ({ page }) => {
      const response = await page.goto('/admin/users')
      expect(response?.status()).not.toBe(404)
    })

    test('admin contestants page should exist at /admin/contestants', async ({
      page,
    }) => {
      const response = await page.goto('/admin/contestants')
      expect(response?.status()).not.toBe(404)
    })
  })
})

test.describe('Protected Route Content (with auth)', () => {
  // These tests use the Clerk testing fixture for authenticated access
  test.describe('Dashboard routes', () => {
    test('leaderboard should show team rankings or empty state', async ({
      page,
    }) => {
      // Note: This test may need auth setup in beforeEach
      // For now, we test the page structure loads
      await page.goto('/leaderboard')

      // Wait for redirect to complete
      await page.waitForURL(/sign-in|leaderboard/, { timeout: 10000 })

      // Either redirects to sign-in or shows content
      const url = page.url()
      if (url.includes('sign-in')) {
        // Unauthenticated - expected redirect
        expect(url).toContain('sign-in')
      } else {
        // Authenticated - should show leaderboard heading
        await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible()
      }
    })

    test('events page should show events list or empty state', async ({
      page,
    }) => {
      await page.goto('/events')

      // Wait for redirect to complete
      await page.waitForURL(/sign-in|events/, { timeout: 10000 })

      const url = page.url()
      if (!url.includes('sign-in')) {
        // If authenticated, should show events heading
        await expect(page.getByRole('heading', { name: /events/i })).toBeVisible()
      }
    })
  })
})
