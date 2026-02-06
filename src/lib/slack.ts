import { EventType, GameEventType } from '@prisma/client'
import { getEventTypeLabel, getEventPoints } from './scoring'
import { getGameEventTypeLabel, getGameEventSummary, GameEventData } from './event-derivation'

interface SlackMessage {
  text: string
  blocks?: Array<{
    type: string
    text?: {
      type: string
      text: string
      emoji?: boolean
    }
    fields?: Array<{
      type: string
      text: string
    }>
  }>
}

/**
 * Send a message to the configured Slack webhook
 */
export async function sendSlackNotification(message: SlackMessage): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.log('Slack webhook not configured, skipping notification')
    return false
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error('Failed to send Slack notification:', response.statusText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Slack notification:', error)
    return false
  }
}

/**
 * Notify when a new event is submitted for approval
 */
export async function notifyEventSubmitted(data: {
  contestantName: string
  eventType: EventType
  week: number
  submittedBy: string
}): Promise<boolean> {
  const points = getEventPoints(data.eventType)
  const label = getEventTypeLabel(data.eventType)

  return sendSlackNotification({
    text: `New event submitted: ${data.contestantName} - ${label}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📋 New Event Submitted',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Contestant:*\n${data.contestantName}` },
          { type: 'mrkdwn', text: `*Event:*\n${label}` },
          { type: 'mrkdwn', text: `*Week:*\n${data.week}` },
          { type: 'mrkdwn', text: `*Points:*\n${points > 0 ? '+' : ''}${points}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Submitted by: ${data.submittedBy}`,
        },
      },
    ],
  })
}

/**
 * Notify when an event is approved
 */
export async function notifyEventApproved(data: {
  contestantName: string
  eventType: EventType
  week: number
  approvedBy: string
}): Promise<boolean> {
  const points = getEventPoints(data.eventType)
  const label = getEventTypeLabel(data.eventType)

  return sendSlackNotification({
    text: `Event approved: ${data.contestantName} - ${label}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ Event Approved',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Contestant:*\n${data.contestantName}` },
          { type: 'mrkdwn', text: `*Event:*\n${label}` },
          { type: 'mrkdwn', text: `*Week:*\n${data.week}` },
          { type: 'mrkdwn', text: `*Points:*\n${points > 0 ? '+' : ''}${points}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Approved by: ${data.approvedBy}`,
        },
      },
    ],
  })
}

/**
 * Notify when a game event is submitted for approval
 */
export async function notifyGameEventSubmitted(data: {
  type: GameEventType
  week: number
  data: GameEventData
  contestantNames: Record<string, string>
  submittedBy: string
  eventCount: number
}): Promise<boolean> {
  const label = getGameEventTypeLabel(data.type)
  const summary = getGameEventSummary(data.type, data.data, data.contestantNames)

  return sendSlackNotification({
    text: `New game event submitted: ${label} - Week ${data.week}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `New ${label} Submitted`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Event:*\n${label}` },
          { type: 'mrkdwn', text: `*Week:*\n${data.week}` },
          { type: 'mrkdwn', text: `*Scoring Events:*\n${data.eventCount}` },
          { type: 'mrkdwn', text: `*Submitted by:*\n${data.submittedBy}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: summary,
        },
      },
    ],
  })
}

/**
 * Notify when a game event is approved
 */
export async function notifyGameEventApproved(data: {
  type: GameEventType
  week: number
  data: GameEventData
  contestantNames: Record<string, string>
  approvedBy: string
  eventCount: number
}): Promise<boolean> {
  const label = getGameEventTypeLabel(data.type)
  const summary = getGameEventSummary(data.type, data.data, data.contestantNames)

  return sendSlackNotification({
    text: `Game event approved: ${label} - Week ${data.week}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${label} Approved`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Event:*\n${label}` },
          { type: 'mrkdwn', text: `*Week:*\n${data.week}` },
          { type: 'mrkdwn', text: `*Scoring Events:*\n${data.eventCount}` },
          { type: 'mrkdwn', text: `*Approved by:*\n${data.approvedBy}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: summary,
        },
      },
    ],
  })
}

/**
 * Notify weekly score update
 */
export async function notifyWeeklyScores(data: {
  week: number
  leaderboard: Array<{ userName: string; teamName: string; score: number }>
}): Promise<boolean> {
  const topPlayers = data.leaderboard.slice(0, 5)
  const leaderboardText = topPlayers
    .map((p, i) => `${i + 1}. ${p.userName} - ${p.score} pts`)
    .join('\n')

  return sendSlackNotification({
    text: `Week ${data.week} Standings`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🏆 Week ${data.week} Standings`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '```\n' + leaderboardText + '\n```',
        },
      },
    ],
  })
}
