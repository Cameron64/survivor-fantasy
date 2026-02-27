import type Anthropic from '@anthropic-ai/sdk'
import { fetchArticle } from './tool-impl/scraper'
import { getGameEvents, submitGameEvent } from './tool-impl/api'
import { dmAdmin } from './tool-impl/notify'
import type { Contestant } from './types'

/**
 * Anthropic built-in web search tool (server-side, no API key needed).
 */
export const webSearchTool = {
  type: 'web_search_20260209' as const,
  name: 'web_search' as const,
  max_uses: 10,
}

/**
 * Custom tool definitions for the Claude API.
 * Contestants are pre-loaded into the system prompt — no tool needed.
 */
export const customTools: Anthropic.Tool[] = [
  {
    name: 'fetch_article',
    description:
      'Fetch and extract readable text from a URL. Returns article title and content (truncated to ~8K chars).',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the article to fetch',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_existing_events',
    description:
      'Check what game events already exist for a specific week. Use to avoid duplicates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: {
          type: 'number',
          description: 'The episode/week number to check',
        },
      },
      required: ['week'],
    },
  },
  {
    name: 'submit_game_event',
    description:
      'Submit a structured game event for admin approval. Created as pending.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: [
            'TRIBAL_COUNCIL',
            'IMMUNITY_CHALLENGE',
            'REWARD_CHALLENGE',
            'IDOL_FOUND',
            'FIRE_MAKING',
            'QUIT_MEDEVAC',
            'ENDGAME',
          ],
          description: 'The type of game event',
        },
        week: {
          type: 'number',
          description: 'The episode/week number',
        },
        data: {
          type: 'object',
          description: 'Structured event data. All IDs must be contestant IDs from the roster in the system prompt.',
        },
        contestantNames: {
          type: 'object',
          description:
            'Name verification map: { "contestantId": "Full Name" } for EVERY contestant ID referenced in data. Used to validate correct ID-to-name mapping.',
        },
      },
      required: ['type', 'week', 'data', 'contestantNames'],
    },
  },
  {
    name: 'dm_admin',
    description:
      'Send a DM to the league admin via Slack. Use to report submissions or missing data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string',
          description: 'The message to send',
        },
      },
      required: ['message'],
    },
  },
]

/**
 * Validate that every contestant ID referenced in contestantNames matches
 * the expected name in the roster. Returns an array of mismatch descriptions.
 */
function validateContestantNames(
  contestantNames: Record<string, string>,
  roster: Map<string, string>,
): string[] {
  const mismatches: string[] = []

  for (const [id, providedName] of Object.entries(contestantNames)) {
    const rosterName = roster.get(id)
    if (!rosterName) {
      mismatches.push(`ID "${id}" (claimed: "${providedName}") does not exist in the roster`)
      continue
    }
    if (rosterName.toLowerCase() !== providedName.toLowerCase()) {
      mismatches.push(
        `ID "${id}" is "${rosterName}" in the roster, but you provided "${providedName}"`,
      )
    }
  }

  return mismatches
}

const MAX_FETCH_ARTICLE_CALLS = 5
let fetchArticleCount = 0

/** Reset the per-run fetch_article counter. Call at the start of each agent run. */
export function resetFetchCount(): void {
  fetchArticleCount = 0
}

/**
 * Execute a custom tool. web_search is server-side and never reaches here.
 * @param contestants - the full contestant roster, used for name validation on submit_game_event
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  contestants: Contestant[],
): Promise<string> {
  try {
    switch (name) {
      case 'fetch_article': {
        if (fetchArticleCount >= MAX_FETCH_ARTICLE_CALLS) {
          return `Error: fetch_article limit reached (${MAX_FETCH_ARTICLE_CALLS}). Use the articles you already have to submit events, or dm_admin if data is insufficient.`
        }
        fetchArticleCount++
        const article = await fetchArticle(input.url as string)
        return JSON.stringify(article, null, 2)
      }

      case 'get_existing_events': {
        const events = await getGameEvents(input.week as number)
        return JSON.stringify(events, null, 2)
      }

      case 'submit_game_event': {
        const contestantNames = input.contestantNames as Record<string, string> | undefined
        if (!contestantNames || Object.keys(contestantNames).length === 0) {
          return 'Error: contestantNames is required. Provide { "id": "Full Name" } for every contestant ID in data so the system can verify correct mapping.'
        }

        // Validate names against roster
        const roster = new Map(contestants.map((c) => [c.id, c.name]))
        const mismatches = validateContestantNames(contestantNames, roster)
        if (mismatches.length > 0) {
          return `Error: Name verification failed. Fix these and resubmit:\n${mismatches.map((m) => `  - ${m}`).join('\n')}`
        }

        // Validation passed — submit without the contestantNames field
        const result = await submitGameEvent({
          type: input.type as string,
          week: input.week as number,
          data: input.data as Record<string, unknown>,
        })
        return JSON.stringify(result, null, 2)
      }

      case 'dm_admin': {
        await dmAdmin(input.message as string)
        return 'Message sent successfully.'
      }

      default:
        return `Unknown tool: ${name}`
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Error: ${message}`
  }
}
