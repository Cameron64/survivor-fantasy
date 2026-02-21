import type { App } from '@slack/bolt'
import { getAppUserId } from '../config'
import * as api from '../api-client'

export function registerActionHandlers(app: App): void {
  app.action('approve_game_event', async ({ action, ack, respond, body }) => {
    await ack()

    if (action.type !== 'button') return

    const slackUserId = body.user.id
    const appUserId = getAppUserId(slackUserId)

    if (!appUserId) {
      await respond({
        text: "You're not mapped to a league account. Can't process this action.",
        replace_original: false,
        response_type: 'ephemeral',
      })
      return
    }

    const gameEventId = action.value!
    try {
      const result = await api.approveGameEvent(appUserId, gameEventId)
      await respond({
        text: `*Approved!* ${result.type.replace(/_/g, ' ').toLowerCase()} (Week ${result.week}) — the tribe has spoken, and those points are *live*!`,
        replace_original: true,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('403') || message.includes('Forbidden')) {
        await respond({
          text: "Only moderators and admins can approve events. You don't have the immunity idol for this one!",
          replace_original: false,
          response_type: 'ephemeral',
        })
      } else {
        await respond({
          text: `Failed to approve: ${message}`,
          replace_original: false,
          response_type: 'ephemeral',
        })
      }
    }
  })

  app.action('reject_game_event', async ({ action, ack, respond, body }) => {
    await ack()

    if (action.type !== 'button') return

    const slackUserId = body.user.id
    const appUserId = getAppUserId(slackUserId)

    if (!appUserId) {
      await respond({
        text: "You're not mapped to a league account. Can't process this action.",
        replace_original: false,
        response_type: 'ephemeral',
      })
      return
    }

    const gameEventId = action.value!
    try {
      const result = await api.rejectGameEvent(appUserId, gameEventId)
      await respond({
        text: `*Rejected.* ${result.type.replace(/_/g, ' ').toLowerCase()} (Week ${result.week}) — got nothing for you, head back to camp.`,
        replace_original: true,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('403') || message.includes('Forbidden')) {
        await respond({
          text: "Only moderators and admins can reject events. Nice try, though!",
          replace_original: false,
          response_type: 'ephemeral',
        })
      } else {
        await respond({
          text: `Failed to reject: ${message}`,
          replace_original: false,
          response_type: 'ephemeral',
        })
      }
    }
  })
}
