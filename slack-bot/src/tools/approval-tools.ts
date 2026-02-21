import Anthropic from '@anthropic-ai/sdk'
import * as api from '../api-client'

export const approvalToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'approve_game_event',
    description:
      'Approve a pending game event by ID. Only moderators and admins can approve. This makes all derived scoring events count toward the leaderboard.',
    input_schema: {
      type: 'object' as const,
      properties: {
        game_event_id: {
          type: 'string',
          description: 'The ID of the game event to approve',
        },
      },
      required: ['game_event_id'],
    },
  },
  {
    name: 'reject_game_event',
    description:
      'Reject a pending game event by ID. Only moderators and admins can reject. The event stays unapproved and its derived events do not count.',
    input_schema: {
      type: 'object' as const,
      properties: {
        game_event_id: {
          type: 'string',
          description: 'The ID of the game event to reject',
        },
      },
      required: ['game_event_id'],
    },
  },
]

export async function executeApprovalTool(
  name: string,
  input: Record<string, unknown>,
  actingUserId: string,
): Promise<string> {
  try {
    const id = input.game_event_id as string

    switch (name) {
      case 'approve_game_event': {
        const result = await api.approveGameEvent(actingUserId, id)
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          type: result.type,
          week: result.week,
          message: 'Game event approved! Scoring events are now live.',
        })
      }

      case 'reject_game_event': {
        const result = await api.rejectGameEvent(actingUserId, id)
        return JSON.stringify({
          success: true,
          gameEventId: result.id,
          type: result.type,
          week: result.week,
          message: 'Game event rejected.',
        })
      }

      default:
        return JSON.stringify({ error: `Unknown approval tool: ${name}` })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return JSON.stringify({ error: message })
  }
}
