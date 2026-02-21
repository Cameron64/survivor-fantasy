import Anthropic from '@anthropic-ai/sdk'
import * as api from '../api-client'

export const readToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'get_standings',
    description:
      'Get the current league standings/leaderboard. Returns all teams ranked by total score with contestant breakdowns. Optionally filter by week to see scores for just that week.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: {
          type: 'number',
          description: 'Optional week number to filter scores for a specific week',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_contestants',
    description:
      'Get the list of Survivor contestants. Can filter to active-only (not eliminated) and optionally include their scoring events.',
    input_schema: {
      type: 'object' as const,
      properties: {
        active_only: {
          type: 'boolean',
          description: 'If true, only return contestants still in the game',
        },
        include_events: {
          type: 'boolean',
          description: 'If true, include approved scoring events for each contestant',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_events',
    description:
      'Get scoring events with optional filters. Can filter by week, contestant, or approval status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Filter by week number' },
        contestant_id: { type: 'string', description: 'Filter by contestant ID' },
        approved_only: { type: 'boolean', description: 'Only show approved events' },
        pending_only: { type: 'boolean', description: 'Only show pending (unapproved) events' },
      },
      required: [],
    },
  },
  {
    name: 'search_contestant',
    description:
      'Search for a contestant by name (partial match, case-insensitive). Returns matching contestants with their IDs — use this when you need a contestant ID for other tools.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Name or partial name to search for',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_pending_game_events',
    description:
      'Get game events that are awaiting approval. Returns structured game events (tribal councils, challenges, etc.) that have been submitted but not yet approved.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Optional week filter' },
      },
      required: [],
    },
  },
]

export async function executeReadTool(
  name: string,
  input: Record<string, unknown>,
  actingUserId: string,
): Promise<string> {
  switch (name) {
    case 'get_standings': {
      const standings = await api.getScores(actingUserId, input.week as number | undefined)
      return JSON.stringify(standings, null, 2)
    }

    case 'get_contestants': {
      const contestants = await api.getContestants(actingUserId, {
        activeOnly: input.active_only as boolean | undefined,
        includeEvents: input.include_events as boolean | undefined,
      })
      return JSON.stringify(contestants, null, 2)
    }

    case 'get_events': {
      const events = await api.getEvents(actingUserId, {
        week: input.week as number | undefined,
        contestantId: input.contestant_id as string | undefined,
        approved: input.approved_only as boolean | undefined,
        pending: input.pending_only as boolean | undefined,
      })
      return JSON.stringify(events, null, 2)
    }

    case 'search_contestant': {
      const query = (input.name as string).toLowerCase()
      const all = await api.getContestants(actingUserId)
      const matches = all.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.nickname && c.nickname.toLowerCase().includes(query)),
      )
      if (matches.length === 0) {
        return JSON.stringify({ message: 'No contestants found matching that name' })
      }
      return JSON.stringify(
        matches.map((c) => ({
          id: c.id,
          name: c.name,
          nickname: c.nickname,
          tribe: c.tribe,
          isEliminated: c.isEliminated,
          eliminatedWeek: c.eliminatedWeek,
          draftedBy: c.teams?.map((t) => t.team.user.name) || [],
        })),
        null,
        2,
      )
    }

    case 'get_pending_game_events': {
      const pending = await api.getGameEvents(actingUserId, {
        pending: true,
        week: input.week as number | undefined,
      })
      return JSON.stringify(pending, null, 2)
    }

    default:
      return JSON.stringify({ error: `Unknown read tool: ${name}` })
  }
}
