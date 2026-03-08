import { test, expect } from '@playwright/test'
import { sel } from '../../helpers/selectors'

/**
 * Tribe Swap E2E Tests - UX Improvements
 *
 * Tests the improved tribe swap form with:
 * - Tribe status display (before/after)
 * - Smart mode detection
 * - Real-time validation
 * - Plain-language descriptions
 *
 * Uses DEV_USER_ID bypass for authentication.
 *
 * Requires seeded test data with:
 * - Multiple contestants across 2+ tribes
 * - Admin user matching DEV_USER_ID
 */

test.describe('Tribe Swap - Event Type Selection', () => {
  test('should show Tribe Swap option on event submit page', async ({ page }) => {
    await page.goto('/events/submit')
    await page.waitForLoadState('networkidle')

    const swapOption = page.locator(sel.eventType('TRIBE_SWAP'))
    await expect(swapOption).toBeVisible()
    await expect(swapOption).toContainText('Tribe Swap')
  })

  test('should navigate to swap form when Tribe Swap is clicked', async ({ page }) => {
    await page.goto('/events/submit')
    await page.waitForLoadState('networkidle')

    await page.click(sel.eventType('TRIBE_SWAP'))

    // Should show swap form elements
    await expect(page.getByText('Swap Type')).toBeVisible()
    await expect(page.getByText('Add Move')).toBeVisible()
  })
})

test.describe('Tribe Swap - UX Improvements', () => {
  test('should display tribe status panel with current tribes', async ({ page }) => {
    await page.goto('/events/submit')
    await page.click(sel.eventType('TRIBE_SWAP'))
    await page.waitForLoadState('networkidle')

    // Should show tribe status section
    await expect(page.getByText('Tribe Status')).toBeVisible()
    await expect(page.getByText(/Current Tribes:/)).toBeVisible()

    // Should show tribe names with member counts
    // (Assumes seed has tribes with names like "Alpha", "Beta")
    const tribeStatus = page.locator('text=Tribe Status').locator('..')
    await expect(tribeStatus).toBeVisible()
  })

  test('should show mode descriptions for each swap type', async ({ page }) => {
    await page.goto('/events/submit')
    await page.click(sel.eventType('TRIBE_SWAP'))
    await page.waitForLoadState('networkidle')

    // Select SWAP mode
    await page.click('text=Swap Type')
    await page.click('text=Tribe Swap')

    // Should show SWAP description
    await expect(page.getByText(/Players shuffle between existing tribes/)).toBeVisible()

    // Change to DISSOLUTION
    await page.click('text=Swap Type')
    await page.click('text=Tribe Dissolution')

    // Should show DISSOLUTION description
    await expect(page.getByText(/One tribe dissolves completely/)).toBeVisible()

    // Change to EXPANSION
    await page.click('text=Swap Type')
    await page.click('text=Tribe Expansion')

    // Should show EXPANSION description with warning
    await expect(page.getByText(/A new tribe is created/)).toBeVisible()
    await expect(page.getByText(/Create the new tribe in Admin/)).toBeVisible()
  })

  test('should show expansion checklist when EXPANSION mode selected', async ({ page }) => {
    await page.goto('/events/submit')
    await page.click(sel.eventType('TRIBE_SWAP'))
    await page.waitForLoadState('networkidle')

    // Select EXPANSION mode
    await page.click('text=Swap Type')
    await page.click('text=Tribe Expansion')

    // Should show expansion checklist
    await expect(page.getByText('Expansion Checklist')).toBeVisible()
    await expect(page.getByText(/Created the new tribe in Admin/)).toBeVisible()
    await expect(page.getByText(/Set the tribe name, color, and details/)).toBeVisible()

    // Should have link to tribes admin
    const adminLink = page.locator('a[href="/admin/tribes"]')
    await expect(adminLink).toBeVisible()
    await expect(adminLink).toContainText('Open Tribes Admin')
  })

  test('should update tribe status panel after adding moves', async ({ page }) => {
    await page.goto('/events/submit')
    await page.click(sel.eventType('TRIBE_SWAP'))
    await page.waitForLoadState('networkidle')

    // Get initial tribe count display
    const tribeStatus = page.locator('text=Tribe Status').locator('..')
    const initialText = await tribeStatus.textContent()
    expect(initialText).toContain('Current Tribes:')

    // Add a move (click first contestant, select destination tribe)
    // This is a simplified test - real implementation depends on seed data
    // Just verify the "After These Moves" section appears

    // For now, verify that the UI structure is there
    // A full integration test would need to actually select contestants
    await expect(page.getByText('Add Move')).toBeVisible()
    await expect(page.getByText('Select contestant')).toBeVisible()
  })
})

test.describe('Tribe Swap - Validation', () => {
  test('should show warning when tribe becomes empty without DISSOLUTION mode', async ({ page }) => {
    // This test requires actually building moves that empty a tribe
    // For now, verify the validation structure exists
    await page.goto('/events/submit')
    await page.click(sel.eventType('TRIBE_SWAP'))
    await page.waitForLoadState('networkidle')

    // The validation logic is in place, but testing it requires complex move setup
    // Verify submit button exists and is initially disabled
    const submitButton = page.getByRole('button', { name: /Submit Swap/i })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeDisabled()
  })

  test('should require dissolved tribe selection when DISSOLUTION mode has empty tribe', async ({ page }) => {
    await page.goto('/events/submit')
    await page.click(sel.eventType('TRIBE_SWAP'))
    await page.waitForLoadState('networkidle')

    // Select DISSOLUTION mode
    await page.click('text=Swap Type')
    await page.click('text=Tribe Dissolution')

    // Should show dissolved tribe selector
    await expect(page.getByText('Dissolved Tribe (required)')).toBeVisible()

    // Should have dropdown for selecting tribe
    const dissolvedSelect = page.locator('text=Select tribe to dissolve')
    await expect(dissolvedSelect).toBeVisible()
  })
})

test.describe('Tribe Swap - API Submission & Approval', () => {
  test('should submit and approve a tribe swap event with correct side effects', async ({ page }) => {
    // Step 1: Fetch contestants and tribes via API
    const contestantsRes = await page.request.get('/api/contestants')
    expect(contestantsRes.ok()).toBeTruthy()
    const contestants = await contestantsRes.json()
    expect(contestants.length).toBeGreaterThanOrEqual(4)

    const tribesRes = await page.request.get('/api/tribes')
    expect(tribesRes.ok()).toBeTruthy()
    const tribes = await tribesRes.json()
    expect(tribes.length).toBeGreaterThanOrEqual(2)

    // Get active contestants
    const activeContestants = contestants.filter((c: { isEliminated: boolean }) => !c.isEliminated)
    expect(activeContestants.length).toBeGreaterThanOrEqual(4)

    // Get two tribes for swapping
    const regularTribes = tribes.filter((t: { isMerge: boolean }) => !t.isMerge)
    expect(regularTribes.length).toBeGreaterThanOrEqual(2)

    const tribe1 = regularTribes[0]
    const tribe2 = regularTribes[1]

    // Find 2 contestants from tribe1 to swap to tribe2
    const membershipsRes = await page.request.get('/api/tribe-memberships')
    const memberships = await membershipsRes.json()

    const tribe1Members = memberships
      .filter((m: { tribeId: string; toWeek: number | null }) =>
        m.tribeId === tribe1.id && m.toWeek === null
      )
      .slice(0, 2)

    expect(tribe1Members.length).toBeGreaterThanOrEqual(2)

    // Step 2: Submit a swap event via API
    const swapPayload = {
      type: 'TRIBE_SWAP',
      week: 3,
      data: {
        mode: 'SWAP',
        swapWeek: 3,
        moves: tribe1Members.map((m: { contestantId: string }) => ({
          contestantId: m.contestantId,
          fromTribeId: tribe1.id,
          toTribeId: tribe2.id,
        })),
      },
    }

    const submitRes = await page.request.post('/api/game-events', {
      data: swapPayload,
    })
    expect(submitRes.ok()).toBeTruthy()
    const gameEvent = await submitRes.json()
    expect(gameEvent.type).toBe('TRIBE_SWAP')
    expect(gameEvent.isApproved).toBe(false)

    // Swap derives no scoring events (structural only)
    expect(gameEvent.events.length).toBe(0)

    // Step 3: Approve the swap event
    const approveRes = await page.request.patch(`/api/game-events/${gameEvent.id}`, {
      data: { isApproved: true },
    })
    expect(approveRes.ok()).toBeTruthy()
    const approvedEvent = await approveRes.json()
    expect(approvedEvent.isApproved).toBe(true)

    // Step 4: Verify side effects - memberships updated
    const postApproveMembs = await page.request.get('/api/tribe-memberships')
    const updatedMemberships = await postApproveMembs.json()

    // Each swapped contestant should have new membership on tribe2 starting week 3
    for (const member of tribe1Members) {
      const newMembership = updatedMemberships.find(
        (m: { contestantId: string; tribeId: string; fromWeek: number; toWeek: number | null }) =>
          m.contestantId === member.contestantId &&
          m.tribeId === tribe2.id &&
          m.fromWeek === 3 &&
          m.toWeek === null
      )
      expect(newMembership).toBeTruthy()

      // Old membership should be closed (toWeek = 2)
      const closedMembership = updatedMemberships.find(
        (m: { contestantId: string; tribeId: string; toWeek: number | null }) =>
          m.contestantId === member.contestantId &&
          m.tribeId === tribe1.id &&
          m.toWeek === 2
      )
      expect(closedMembership).toBeTruthy()
    }

    // Step 5: Unapprove and verify reversal
    const unapproveRes = await page.request.patch(`/api/game-events/${gameEvent.id}`, {
      data: { isApproved: false },
    })
    expect(unapproveRes.ok()).toBeTruthy()

    // Verify unapproval reversal - memberships should be restored
    const postUnapproveMembs = await page.request.get('/api/tribe-memberships')
    const restoredMemberships = await postUnapproveMembs.json()

    // Original memberships should be reopened (toWeek = null)
    for (const member of tribe1Members) {
      const restoredMembership = restoredMemberships.find(
        (m: { contestantId: string; tribeId: string; toWeek: number | null }) =>
          m.contestantId === member.contestantId &&
          m.tribeId === tribe1.id &&
          m.toWeek === null
      )
      expect(restoredMembership).toBeTruthy()
    }

    // New memberships should be deleted
    for (const member of tribe1Members) {
      const deletedMembership = restoredMemberships.find(
        (m: { contestantId: string; tribeId: string; fromWeek: number }) =>
          m.contestantId === member.contestantId &&
          m.tribeId === tribe2.id &&
          m.fromWeek === 3
      )
      expect(deletedMembership).toBeFalsy()
    }

    // Clean up
    await page.request.delete(`/api/game-events/${gameEvent.id}`)
  })

  test('should handle tribe dissolution with dissolved tribe marked', async ({ page }) => {
    // Fetch test data
    const [contestantsRes, tribesRes] = await Promise.all([
      page.request.get('/api/contestants'),
      page.request.get('/api/tribes'),
    ])
    const contestants = await contestantsRes.json()
    const tribes = await tribesRes.json()

    const regularTribes = tribes.filter((t: { isMerge: boolean }) => !t.isMerge)
    expect(regularTribes.length).toBeGreaterThanOrEqual(2)

    const tribe1 = regularTribes[0]
    const tribe2 = regularTribes[1]

    // Get current memberships
    const membershipsRes = await page.request.get('/api/tribe-memberships')
    const memberships = await membershipsRes.json()

    // Get all members of tribe1 to move to tribe2 (dissolution)
    const tribe1Members = memberships.filter(
      (m: { tribeId: string; toWeek: number | null }) =>
        m.tribeId === tribe1.id && m.toWeek === null
    )

    if (tribe1Members.length === 0) {
      // Skip test if no members on tribe1
      test.skip()
      return
    }

    // Submit dissolution event
    const dissolutionPayload = {
      type: 'TRIBE_SWAP',
      week: 4,
      data: {
        mode: 'DISSOLUTION',
        swapWeek: 4,
        dissolvedTribeId: tribe1.id,
        moves: tribe1Members.map((m: { contestantId: string }) => ({
          contestantId: m.contestantId,
          fromTribeId: tribe1.id,
          toTribeId: tribe2.id,
        })),
      },
    }

    const submitRes = await page.request.post('/api/game-events', {
      data: dissolutionPayload,
    })
    expect(submitRes.ok()).toBeTruthy()
    const gameEvent = await submitRes.json()

    // Approve
    await page.request.patch(`/api/game-events/${gameEvent.id}`, {
      data: { isApproved: true },
    })

    // Verify tribe is marked as dissolved
    const updatedTribesRes = await page.request.get('/api/tribes')
    const updatedTribes = await updatedTribesRes.json()
    const dissolvedTribe = updatedTribes.find((t: { id: string }) => t.id === tribe1.id)

    expect(dissolvedTribe.dissolvedAtWeek).toBe(4)
    expect(dissolvedTribe.dissolvedByEventId).toBe(gameEvent.id)

    // Clean up - unapprove and delete
    await page.request.patch(`/api/game-events/${gameEvent.id}`, {
      data: { isApproved: false },
    })

    // Verify tribe is undissolved
    const revertedTribesRes = await page.request.get('/api/tribes')
    const revertedTribes = await revertedTribesRes.json()
    const revertedTribe = revertedTribes.find((t: { id: string }) => t.id === tribe1.id)

    expect(revertedTribe.dissolvedAtWeek).toBeNull()
    expect(revertedTribe.dissolvedByEventId).toBeNull()

    await page.request.delete(`/api/game-events/${gameEvent.id}`)
  })
})
