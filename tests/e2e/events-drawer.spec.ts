import { test, expect } from '@playwright/test'

test.describe('Events Page - Week Drawer Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to events page (assumes user is already logged in via stored auth)
    await page.goto('/events')

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Events")', { timeout: 10000 })
  })

  test('should toggle week drawer open and closed', async ({ page }) => {
    // Wait for the approved tab to be visible and active
    await page.waitForSelector('[data-testid="tab-approved"]', { state: 'visible' })

    // Check if there are any week groups
    const weekButtons = page.locator('button:has-text("Week ")')
    const count = await weekButtons.count()

    if (count === 0) {
      console.log('No week groups found - test skipped')
      test.skip()
      return
    }

    console.log(`Found ${count} week group(s)`)

    // Get the first week button
    const firstWeekButton = weekButtons.first()

    // Log the button text for debugging
    const buttonText = await firstWeekButton.textContent()
    console.log('First week button text:', buttonText)

    // Check initial state - first week should be auto-expanded
    const parentContainer = firstWeekButton.locator('..')
    let expandedContent = parentContainer.locator('div.border-t')

    // Wait a bit for initial render
    await page.waitForTimeout(1000)

    let isInitiallyVisible = await expandedContent.isVisible().catch(() => false)
    console.log('Initially visible:', isInitiallyVisible)

    // Click to toggle (close if open, open if closed)
    console.log('Clicking week button...')
    await firstWeekButton.click()
    await page.waitForTimeout(500) // Wait for animation

    // Check if state changed
    let isVisibleAfterFirstClick = await expandedContent.isVisible().catch(() => false)
    console.log('Visible after first click:', isVisibleAfterFirstClick)

    expect(isVisibleAfterFirstClick).not.toBe(isInitiallyVisible)

    // Click again to toggle back
    console.log('Clicking week button again...')
    await firstWeekButton.click()
    await page.waitForTimeout(500) // Wait for animation

    let isVisibleAfterSecondClick = await expandedContent.isVisible().catch(() => false)
    console.log('Visible after second click:', isVisibleAfterSecondClick)

    expect(isVisibleAfterSecondClick).toBe(isInitiallyVisible)
  })

  test('should show chevron rotation when toggling', async ({ page }) => {
    await page.waitForSelector('[data-testid="tab-approved"]', { state: 'visible' })

    const weekButtons = page.locator('button:has-text("Week ")')
    const count = await weekButtons.count()

    if (count === 0) {
      test.skip()
      return
    }

    const firstWeekButton = weekButtons.first()
    const chevron = firstWeekButton.locator('svg').last() // ChevronDown icon

    // Get initial transform/rotation
    const initialClasses = await chevron.getAttribute('class')
    console.log('Initial chevron classes:', initialClasses)

    // Click to toggle
    await firstWeekButton.click()
    await page.waitForTimeout(300)

    // Get classes after click
    const afterClasses = await chevron.getAttribute('class')
    console.log('After click chevron classes:', afterClasses)

    // The classes should change (rotate-180 should be toggled)
    expect(initialClasses).not.toBe(afterClasses)
  })

  test('should log console messages during toggle', async ({ page }) => {
    const consoleMessages: string[] = []

    page.on('console', msg => {
      const text = msg.text()
      console.log('Browser console:', text)
      consoleMessages.push(text)
    })

    await page.waitForSelector('[data-testid="tab-approved"]', { state: 'visible' })

    const weekButtons = page.locator('button:has-text("Week ")')
    const count = await weekButtons.count()

    if (count === 0) {
      test.skip()
      return
    }

    const firstWeekButton = weekButtons.first()

    // Click and wait for console log
    await firstWeekButton.click()
    await page.waitForTimeout(1000)

    // Check if our debug log appeared
    const hasToggleLog = consoleMessages.some(msg => msg.includes('Toggling week'))
    console.log('Console messages captured:', consoleMessages.length)
    console.log('Has toggle log:', hasToggleLog)

    expect(hasToggleLog).toBe(true)
  })

  test('should handle multiple week groups independently', async ({ page }) => {
    await page.waitForSelector('[data-testid="tab-approved"]', { state: 'visible' })

    const weekButtons = page.locator('button:has-text("Week ")')
    const count = await weekButtons.count()

    if (count < 2) {
      console.log('Need at least 2 week groups for this test')
      test.skip()
      return
    }

    // Get first two week buttons
    const firstWeek = weekButtons.nth(0)
    const secondWeek = weekButtons.nth(1)

    // Get their parent containers to check content visibility
    const firstContainer = firstWeek.locator('..')
    const secondContainer = secondWeek.locator('..')

    const firstContent = firstContainer.locator('div.border-t')
    const secondContent = secondContainer.locator('div.border-t')

    await page.waitForTimeout(1000)

    // Initially, first should be expanded, second should be collapsed
    const firstInitial = await firstContent.isVisible().catch(() => false)
    const secondInitial = await secondContent.isVisible().catch(() => false)

    console.log('Week 1 initially visible:', firstInitial)
    console.log('Week 2 initially visible:', secondInitial)

    // Click second week to expand it
    await secondWeek.click()
    await page.waitForTimeout(500)

    const secondAfterClick = await secondContent.isVisible().catch(() => false)
    console.log('Week 2 after click:', secondAfterClick)

    // Second should now be opposite of initial state
    expect(secondAfterClick).not.toBe(secondInitial)

    // First should remain unchanged
    const firstAfterSecondClick = await firstContent.isVisible().catch(() => false)
    expect(firstAfterSecondClick).toBe(firstInitial)
  })

  test('should capture any JavaScript errors', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', error => {
      console.log('Page error:', error.message)
      errors.push(error.message)
    })

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text())
        errors.push(msg.text())
      }
    })

    await page.waitForSelector('[data-testid="tab-approved"]', { state: 'visible' })

    const weekButtons = page.locator('button:has-text("Week ")')
    const count = await weekButtons.count()

    if (count === 0) {
      test.skip()
      return
    }

    // Click multiple times to catch any errors
    const firstWeekButton = weekButtons.first()
    for (let i = 0; i < 5; i++) {
      await firstWeekButton.click()
      await page.waitForTimeout(200)
    }

    console.log('Total errors captured:', errors.length)
    if (errors.length > 0) {
      console.log('Errors:', errors)
    }

    // The test should not have any errors
    expect(errors.length).toBe(0)
  })
})
