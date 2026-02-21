import 'dotenv/config'

function required(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

export const config = {
  slack: {
    botToken: required('SLACK_BOT_TOKEN'),
    appToken: required('SLACK_APP_TOKEN'),
    signingSecret: required('SLACK_SIGNING_SECRET'),
  },
  anthropic: {
    apiKey: required('ANTHROPIC_API_KEY'),
  },
  api: {
    baseUrl: required('API_BASE_URL').replace(/\/$/, ''),
    botApiKey: required('BOT_API_KEY'),
  },
  port: parseInt(process.env.PORT || '3001', 10),
} as const

/**
 * Parse SLACK_USER_MAP env var into a Map<slackId, appUserId>.
 * Format: "U01ABC:cuid1,U02DEF:cuid2"
 */
function parseUserMap(): Map<string, string> {
  const raw = process.env.SLACK_USER_MAP || ''
  const map = new Map<string, string>()
  if (!raw) return map

  for (const pair of raw.split(',')) {
    const [slackId, appUserId] = pair.trim().split(':')
    if (slackId && appUserId) {
      map.set(slackId, appUserId)
    }
  }
  return map
}

export const slackUserMap = parseUserMap()

export function getAppUserId(slackUserId: string): string | undefined {
  return slackUserMap.get(slackUserId)
}
