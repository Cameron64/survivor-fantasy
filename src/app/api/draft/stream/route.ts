/**
 * SSE endpoint for real-time draft state updates.
 * GET /api/draft/stream?leagueId=<id>
 *
 * IMPORTANT: This uses an in-memory subscriber registry — only correct with a
 * single server process. Railway's default single-instance deployment satisfies
 * this. If the app ever scales to >1 replica, replace with Redis pub/sub or Pusher.
 */

import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { fetchDraftState } from '../_lib'
import type { DraftStatePayload } from '@/lib/draft-types'

// Module-level subscriber registry (lives for the process lifetime)
const subscribers = new Map<string, ReadableStreamDefaultController<Uint8Array>>()
const encoder = new TextEncoder()

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

export async function GET(req: NextRequest) {
  try {
    await requireUser()
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const leagueId = req.nextUrl.searchParams.get('leagueId') ?? undefined
  const id = crypto.randomUUID()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      subscribers.set(id, controller)

      // Send current state immediately on connect so client doesn't wait for the next event
      fetchDraftState(leagueId).then((state) => {
        if (state) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`))
          } catch {
            // Already cancelled before initial state could be sent
          }
        }
      })
    },
    cancel() {
      subscribers.delete(id)
    },
  })

  req.signal.addEventListener('abort', () => {
    subscribers.delete(id)
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // Disable nginx/Railway buffering
      Connection: 'keep-alive',
    },
  })
}
