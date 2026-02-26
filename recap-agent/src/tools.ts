import type Anthropic from '@anthropic-ai/sdk'
import { fetchArticle } from './tool-impl/scraper'
import { getContestants, getEpisodes, getGameEvents, submitGameEvent } from './tool-impl/api'
import { dmAdmin } from './tool-impl/notify'

/**
 * Anthropic built-in web search tool (server-side, no API key needed).
 * The API executes searches automatically — we don't handle these in executeTool.
 */
export const webSearchTool: Anthropic.WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 15,
}

/**
 * Custom tool definitions for the Claude API (tool_use).
 */
export const customTools: Anthropic.Tool[] = [
  {
    name: 'fetch_article',
    description:
      'Fetch and extract readable text from a URL. Use this to read full recap articles found via web search. Returns the article title, content (truncated to ~15K chars), and byline.',
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
    name: 'get_contestants',
    description:
      'Get the full contestant roster for the current season. Returns each contestant\'s ID, name, nickname, elimination status, and eliminated week. Use this to map names from recaps to contestant IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_episodes',
    description:
      'Get the full episode schedule with episode numbers, titles, and air dates.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_existing_events',
    description:
      'Check what game events already exist for a specific week. Use this to avoid submitting duplicates.',
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
      'Submit a structured game event for admin approval. The event will be created as pending (not yet approved). Each game event type has a specific data schema that must be followed exactly.',
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
          description:
            'The structured event data. Schema depends on the type:\n' +
            '- TRIBAL_COUNCIL: { attendees: string[], votes: Record<voterId, votedForId>, eliminated: string, isBlindside: boolean, blindsideLeader?: string, idolPlayed?: { by: string, successful: boolean } | null, sentToJury: boolean }\n' +
            '- IMMUNITY_CHALLENGE: { winner: string }\n' +
            '- REWARD_CHALLENGE: { winners: string[], isTeamChallenge: boolean }\n' +
            '- IDOL_FOUND: { finder: string }\n' +
            '- FIRE_MAKING: { winner: string, loser: string }\n' +
            '- QUIT_MEDEVAC: { contestant: string, reason: "quit" | "medevac" }\n' +
            '- ENDGAME: { finalists: string[], winner: string }\n' +
            'All string IDs must be contestant IDs from get_contestants.',
        },
      },
      required: ['type', 'week', 'data'],
    },
  },
  {
    name: 'dm_admin',
    description:
      'Send a direct message to the league admin via Slack. Use this to report what events you submitted, or to report that you could not find sufficient data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string',
          description: 'The message to send to the admin',
        },
      },
      required: ['message'],
    },
  },
]

/**
 * Execute a custom tool by name with the given input. Returns the result as a string.
 * Note: web_search is a server-side tool handled by the API — it never reaches here.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  try {
    switch (name) {
      case 'fetch_article': {
        const article = await fetchArticle(input.url as string)
        return JSON.stringify(article, null, 2)
      }

      case 'get_contestants': {
        const contestants = await getContestants()
        return JSON.stringify(contestants, null, 2)
      }

      case 'get_episodes': {
        const episodes = await getEpisodes()
        return JSON.stringify(episodes, null, 2)
      }

      case 'get_existing_events': {
        const events = await getGameEvents(input.week as number)
        return JSON.stringify(events, null, 2)
      }

      case 'submit_game_event': {
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
