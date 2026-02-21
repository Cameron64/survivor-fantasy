import type { App } from '@slack/bolt'
import type { KnownBlock } from '@slack/types'
import { getAppUserId } from '../config'
import { chat } from '../claude'
import { wasToolUsed } from '../tools'
import type { GameEvent } from '../types'
import * as api from '../api-client'

export function registerMessageHandlers(app: App, _botUserId: string): void {
  // Handle @mentions in channels
  app.event('app_mention', async ({ event, say }) => {
    const slackUserId = event.user!
    const appUserId = getAppUserId(slackUserId)

    if (!appUserId) {
      await say({
        text: "I don't have you mapped to a fantasy league account yet. Ask an admin to add your Slack ID to the user map!",
        thread_ts: event.thread_ts || event.ts,
      })
      return
    }

    // Strip the bot mention from the message
    const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim()
    if (!text) {
      await say({
        text: 'Come on in! What can I help you with, survivor?',
        thread_ts: event.thread_ts || event.ts,
      })
      return
    }

    const threadId = event.thread_ts || event.ts

    try {
      // Look up user's display name
      const userInfo = await app.client.users.info({ user: slackUserId })
      const userName: string =
        userInfo.user?.profile?.display_name ||
        userInfo.user?.real_name ||
        'Survivor'

      const response = await chat(threadId, text, appUserId, userName)

      // Check if pending game events were fetched — add approval buttons
      const usedPendingTool = wasToolUsed('get_pending_game_events', response.allContent)

      if (usedPendingTool) {
        const pending = await api.getGameEvents(appUserId, { pending: true })
        if (pending.length > 0) {
          await say({
            text: response.text,
            thread_ts: threadId,
          })
          // Send buttons for each pending event
          for (const ge of pending) {
            await say({
              thread_ts: threadId,
              blocks: buildApprovalBlocks(ge),
              text: `Pending: ${ge.type} (Week ${ge.week})`,
            })
          }
          return
        }
      }

      await say({
        text: response.text,
        thread_ts: threadId,
      })
    } catch (err) {
      console.error('[Message Handler Error]', err)
      await say({
        text: "The tribe has spoken... and something went wrong on my end. Try again in a moment.",
        thread_ts: threadId,
      })
    }
  })

  // Handle DMs
  app.event('message', async ({ event, say }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = event as any
    // Only handle DMs (channel type 'im'), ignore bot messages and subtypes
    if (msg.channel_type !== 'im' || msg.bot_id || msg.subtype) return

    const slackUserId = msg.user as string | undefined
    if (!slackUserId) return

    const appUserId = getAppUserId(slackUserId)
    if (!appUserId) {
      await say({
        text: "I don't have you mapped to a fantasy league account. Ask an admin to set up the Slack-to-app user mapping!",
        thread_ts: msg.thread_ts || msg.ts,
      })
      return
    }

    const text = (msg.text as string | undefined)?.trim()
    if (!text) return

    const threadId = (msg.thread_ts || msg.ts) as string

    try {
      const userInfo = await app.client.users.info({ user: slackUserId })
      const userName =
        userInfo.user?.profile?.display_name ||
        userInfo.user?.real_name ||
        'Survivor'

      const response = await chat(threadId, text, appUserId, userName)

      const usedPendingTool = wasToolUsed('get_pending_game_events', response.allContent)

      if (usedPendingTool) {
        const pending = await api.getGameEvents(appUserId, { pending: true })
        if (pending.length > 0) {
          await say({
            text: response.text,
            thread_ts: threadId,
          })
          for (const ge of pending) {
            await say({
              thread_ts: threadId,
              blocks: buildApprovalBlocks(ge),
              text: `Pending: ${ge.type} (Week ${ge.week})`,
            })
          }
          return
        }
      }

      await say({
        text: response.text,
        thread_ts: threadId,
      })
    } catch (err) {
      console.error('[DM Handler Error]', err)
      await say({
        text: "Something went wrong behind the scenes. Try again shortly!",
        thread_ts: threadId,
      })
    }
  })
}

function buildApprovalBlocks(ge: GameEvent): KnownBlock[] {
  const eventLabel = ge.type.replace(/_/g, ' ').toLowerCase()
  const summary = `*${eventLabel}* | Week ${ge.week} | Submitted by ${ge.submittedBy?.name || 'unknown'}`

  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: summary },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Approve', emoji: true },
          style: 'primary',
          action_id: 'approve_game_event',
          value: ge.id,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Reject', emoji: true },
          style: 'danger',
          action_id: 'reject_game_event',
          value: ge.id,
        },
      ],
    },
  ]
}
