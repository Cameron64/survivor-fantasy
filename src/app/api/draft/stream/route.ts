/**
 * SSE endpoint for real-time draft state updates.
 * GET /api/draft/stream?leagueId=<id>
 */

import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth'
import { fetchDraftState } from '../_lib'
import { subscribers, encoder } from '@/lib/draft-broadcast'

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

      fetchDraftState(leagueId).then((state) => {
        if (state) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`))
          } catch {
            // Already cancelled
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
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}
