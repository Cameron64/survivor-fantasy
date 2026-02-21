import Anthropic from '@anthropic-ai/sdk'
import * as api from '../api-client'

export const writeToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'submit_tribal_council',
    description:
      'Submit a tribal council game event. Includes who attended, how they voted, who was eliminated, blindside info, and idol plays. Creates unapproved event pending mod review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Episode/week number' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Contestant IDs of everyone at tribal council',
        },
        votes: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Map of voter contestant ID -> voted-for contestant ID',
        },
        eliminated: { type: 'string', description: 'Contestant ID of the person voted out' },
        is_blindside: { type: 'boolean', description: 'Whether this was a blindside' },
        blindside_leader: {
          type: 'string',
          description: 'Contestant ID of the blindside leader (if blindside)',
        },
        idol_played: {
          type: 'object',
          properties: {
            by: { type: 'string', description: 'Contestant ID of idol player' },
            successful: { type: 'boolean', description: 'Whether the idol play was successful' },
          },
          required: ['by', 'successful'],
          description: 'Idol play details (if any)',
        },
        sent_to_jury: { type: 'boolean', description: 'Whether the eliminated person goes to jury' },
      },
      required: ['week', 'attendees', 'votes', 'eliminated', 'is_blindside', 'sent_to_jury'],
    },
  },
  {
    name: 'submit_immunity_challenge',
    description: 'Submit an individual immunity challenge win. Creates unapproved event pending mod review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Episode/week number' },
        winner: { type: 'string', description: 'Contestant ID of the winner' },
      },
      required: ['week', 'winner'],
    },
  },
  {
    name: 'submit_reward_challenge',
    description: 'Submit a reward challenge result. Can be individual or team challenge. Creates unapproved event pending mod review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Episode/week number' },
        winners: {
          type: 'array',
          items: { type: 'string' },
          description: 'Contestant IDs of the winners',
        },
        is_team_challenge: {
          type: 'boolean',
          description: 'True for team challenge (1 pt each), false for individual (3 pts)',
        },
      },
      required: ['week', 'winners', 'is_team_challenge'],
    },
  },
  {
    name: 'submit_idol_found',
    description: 'Submit that a contestant found a hidden immunity idol. Creates unapproved event pending mod review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Episode/week number' },
        finder: { type: 'string', description: 'Contestant ID of who found the idol' },
      },
      required: ['week', 'finder'],
    },
  },
  {
    name: 'submit_fire_making',
    description: 'Submit a fire making challenge result. Creates unapproved event pending mod review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Episode/week number' },
        winner: { type: 'string', description: 'Contestant ID of the winner' },
        loser: { type: 'string', description: 'Contestant ID of the loser' },
      },
      required: ['week', 'winner', 'loser'],
    },
  },
  {
    name: 'submit_quit_medevac',
    description: 'Submit that a contestant quit or was medically evacuated. Creates unapproved event pending mod review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Episode/week number' },
        contestant: { type: 'string', description: 'Contestant ID' },
        reason: {
          type: 'string',
          enum: ['quit', 'medevac'],
          description: 'Whether they quit or were medevac\'d',
        },
      },
      required: ['week', 'contestant', 'reason'],
    },
  },
  {
    name: 'submit_endgame',
    description: 'Submit the endgame result: who the finalists were and who won. Creates unapproved event pending mod review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'number', description: 'Episode/week number (finale)' },
        finalists: {
          type: 'array',
          items: { type: 'string' },
          description: 'Contestant IDs of all finalists (including winner)',
        },
        winner: { type: 'string', description: 'Contestant ID of the Sole Survivor' },
      },
      required: ['week', 'finalists', 'winner'],
    },
  },
]

export async function executeWriteTool(
  name: string,
  input: Record<string, unknown>,
  actingUserId: string,
): Promise<string> {
  try {
    switch (name) {
      case 'submit_tribal_council': {
        const result = await api.submitGameEvent(actingUserId, {
          type: 'TRIBAL_COUNCIL',
          week: input.week as number,
          data: {
            attendees: input.attendees,
            votes: input.votes,
            eliminated: input.eliminated,
            isBlindside: input.is_blindside,
            blindsideLeader: input.blindside_leader || undefined,
            idolPlayed: input.idol_played || null,
            sentToJury: input.sent_to_jury,
          },
        })
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          derivedEvents: result.events?.length || 0,
          message: 'Tribal council submitted. Awaiting moderator approval.',
        })
      }

      case 'submit_immunity_challenge': {
        const result = await api.submitGameEvent(actingUserId, {
          type: 'IMMUNITY_CHALLENGE',
          week: input.week as number,
          data: { winner: input.winner },
        })
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          message: 'Immunity challenge submitted. Awaiting moderator approval.',
        })
      }

      case 'submit_reward_challenge': {
        const result = await api.submitGameEvent(actingUserId, {
          type: 'REWARD_CHALLENGE',
          week: input.week as number,
          data: {
            winners: input.winners,
            isTeamChallenge: input.is_team_challenge,
          },
        })
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          message: 'Reward challenge submitted. Awaiting moderator approval.',
        })
      }

      case 'submit_idol_found': {
        const result = await api.submitGameEvent(actingUserId, {
          type: 'IDOL_FOUND',
          week: input.week as number,
          data: { finder: input.finder },
        })
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          message: 'Idol find submitted. Awaiting moderator approval.',
        })
      }

      case 'submit_fire_making': {
        const result = await api.submitGameEvent(actingUserId, {
          type: 'FIRE_MAKING',
          week: input.week as number,
          data: {
            winner: input.winner,
            loser: input.loser,
          },
        })
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          message: 'Fire making challenge submitted. Awaiting moderator approval.',
        })
      }

      case 'submit_quit_medevac': {
        const result = await api.submitGameEvent(actingUserId, {
          type: 'QUIT_MEDEVAC',
          week: input.week as number,
          data: {
            contestant: input.contestant,
            reason: input.reason,
          },
        })
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          message: 'Quit/medevac submitted. Awaiting moderator approval.',
        })
      }

      case 'submit_endgame': {
        const result = await api.submitGameEvent(actingUserId, {
          type: 'ENDGAME',
          week: input.week as number,
          data: {
            finalists: input.finalists,
            winner: input.winner,
          },
        })
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          message: 'Endgame submitted! Awaiting moderator approval.',
        })
      }

      default:
        return JSON.stringify({ error: `Unknown write tool: ${name}` })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return JSON.stringify({ error: message })
  }
}
