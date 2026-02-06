/**
 * Centralized test selectors for Playwright E2E tests.
 * All selectors use data-testid pattern for stability.
 */

export const sel = {
  // Event submission wizard
  eventType: (type: string) => `[data-testid="event-type-${type}"]`,
  weekEditButton: '[data-testid="week-edit-button"]',
  weekInput: '[data-testid="week-input"]',

  // Tribal council form
  contestant: (id: string) => `[data-testid="contestant-${id}"]`,
  tribe: (name: string) => `[data-testid="tribe-${name.toLowerCase().replace(/\s+/g, '-')}"]`,
  vote: (contestantId: string) => `[data-testid="vote-${contestantId}"]`,
  eliminated: (id: string) => `[data-testid="eliminated-${id}"]`,
  stepIndicator: '[data-testid="step-indicator"]',
  step: (name: string) => `[data-testid="step-${name}"]`,
  switchBlindside: '[data-testid="switch-blindside"]',
  switchIdol: '[data-testid="switch-idol"]',
  switchIdolSuccess: '[data-testid="switch-idol-success"]',
  switchJury: '[data-testid="switch-jury"]',

  // Challenge forms
  winner: (id: string) => `[data-testid="winner-${id}"]`,
  rewardWinner: (id: string) => `[data-testid="reward-winner-${id}"]`,
  switchTeamChallenge: '[data-testid="switch-team-challenge"]',

  // Simple event forms
  idolFinder: (id: string) => `[data-testid="idol-finder-${id}"]`,
  fireWinner: (id: string) => `[data-testid="fire-winner-${id}"]`,
  fireLoser: (id: string) => `[data-testid="fire-loser-${id}"]`,
  quitReason: '[data-testid="quit-reason"]',
  quitContestant: (id: string) => `[data-testid="quit-contestant-${id}"]`,
  finalist: (id: string) => `[data-testid="finalist-${id}"]`,
  endgameWinner: (id: string) => `[data-testid="endgame-winner-${id}"]`,

  // Admin events page
  tabPending: '[data-testid="tab-pending"]',
  tabApproved: '[data-testid="tab-approved"]',
  gameEvent: (id: string) => `[data-testid="game-event-${id}"]`,
  event: (id: string) => `[data-testid="event-${id}"]`,
  approve: (id: string) => `[data-testid="approve-${id}"]`,
  reject: (id: string) => `[data-testid="reject-${id}"]`,

  // Events list page
  logEventButton: '[data-testid="log-event-button"]',

  // Button text matchers (for generic buttons without testid)
  button: {
    back: 'button:has-text("Back")',
    next: 'button:has-text("Next")',
    reviewEvents: 'button:has-text("Review Events")',
    submit: 'button:has-text("Submit")',
  },
}
