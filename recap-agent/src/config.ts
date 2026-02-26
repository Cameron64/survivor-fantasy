import 'dotenv/config'

function required(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

export const config = {
  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
  },
  api: {
    baseUrl: required('API_BASE_URL').replace(/\/$/, ''),
    botApiKey: required('BOT_API_KEY'),
    actingUserId: required('ACTING_USER_ID'),
  },
  slack: {
    botToken: required('SLACK_BOT_TOKEN'),
    dmUserId: required('SLACK_DM_USER_ID'),
  },
  /** Max agent retry attempts (recaps may not be published yet) */
  maxAttempts: 3,
  /** Sleep between retry attempts in ms (5 hours) */
  retrySleepMs: 5 * 60 * 60 * 1000,
} as const
