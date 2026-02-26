import { config } from '../config'

export async function dmAdmin(message: string): Promise<void> {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.slack.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: config.slack.dmUserId,
      text: message,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Slack API ${res.status}: ${body}`)
  }

  const data = (await res.json()) as { ok: boolean; error?: string }
  if (!data.ok) {
    throw new Error(`Slack error: ${data.error}`)
  }
}
