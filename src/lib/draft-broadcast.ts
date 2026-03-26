/**
 * In-memory SSE subscriber registry for real-time draft updates.
 * Shared between the stream endpoint (GET /api/draft/stream) and
 * the pick handler (POST /api/draft) via this module.
 *
 * IMPORTANT: Only correct with a single server process. Railway's default
 * single-instance deployment satisfies this. If the app ever scales to >1
 * replica, replace with Redis pub/sub or Pusher.
 */

import type { DraftStatePayload } from '@/lib/draft-types'

export const subscribers = new Map<string, ReadableStreamDefaultController<Uint8Array>>()
export const encoder = new TextEncoder()

// Heartbeat every 30s — prevents Railway/nginx from closing idle SSE connections
setInterval(() => {
  const heartbeat = encoder.encode(': heartbeat\n\n')
  for (const controller of subscribers.values()) {
    try {
      controller.enqueue(heartbeat)
    } catch {
      // Client already disconnected; will be cleaned up on cancel/abort
    }
  }
}, 30_000)

/**
 * Broadcast a draft state update to all connected SSE clients.
 * Called from POST /api/draft after every successful pick or status change.
 */
export function broadcastDraftUpdate(payload: DraftStatePayload) {
  const data = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
  for (const controller of subscribers.values()) {
    try {
      controller.enqueue(data)
    } catch {
      // Client disconnected
    }
  }
}
