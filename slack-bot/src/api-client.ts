import { config } from './config'
import type { Contestant, ScoringEvent, GameEvent, LeaderboardEntry } from './types'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(
  path: string,
  actingUserId: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.api.baseUrl}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api.botApiKey}`,
      'X-Acting-User': actingUserId,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, `API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// --- Read operations ---

export async function getScores(
  actingUserId: string,
  week?: number,
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams()
  if (week) params.set('week', String(week))
  const qs = params.toString()
  return apiFetch(`/api/scores${qs ? `?${qs}` : ''}`, actingUserId)
}

export async function getContestants(
  actingUserId: string,
  opts?: { activeOnly?: boolean; includeEvents?: boolean },
): Promise<Contestant[]> {
  const params = new URLSearchParams()
  if (opts?.activeOnly) params.set('activeOnly', 'true')
  if (opts?.includeEvents) params.set('includeEvents', 'true')
  const qs = params.toString()
  return apiFetch(`/api/contestants${qs ? `?${qs}` : ''}`, actingUserId)
}

export async function getEvents(
  actingUserId: string,
  opts?: { week?: number; contestantId?: string; approved?: boolean; pending?: boolean },
): Promise<ScoringEvent[]> {
  const params = new URLSearchParams()
  if (opts?.week) params.set('week', String(opts.week))
  if (opts?.contestantId) params.set('contestantId', opts.contestantId)
  if (opts?.approved) params.set('approved', 'true')
  if (opts?.pending) params.set('pending', 'true')
  const qs = params.toString()
  return apiFetch(`/api/events${qs ? `?${qs}` : ''}`, actingUserId)
}

export async function getGameEvents(
  actingUserId: string,
  opts?: { week?: number; pending?: boolean; approved?: boolean },
): Promise<GameEvent[]> {
  const params = new URLSearchParams()
  if (opts?.week) params.set('week', String(opts.week))
  if (opts?.pending) params.set('pending', 'true')
  if (opts?.approved) params.set('approved', 'true')
  const qs = params.toString()
  return apiFetch(`/api/game-events${qs ? `?${qs}` : ''}`, actingUserId)
}

// --- Write operations ---

export async function submitGameEvent(
  actingUserId: string,
  body: { type: string; week: number; data: Record<string, unknown> },
): Promise<GameEvent> {
  return apiFetch('/api/game-events', actingUserId, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function approveGameEvent(
  actingUserId: string,
  id: string,
): Promise<GameEvent> {
  return apiFetch(`/api/game-events/${id}`, actingUserId, {
    method: 'PATCH',
    body: JSON.stringify({ isApproved: true }),
  })
}

export async function rejectGameEvent(
  actingUserId: string,
  id: string,
): Promise<GameEvent> {
  return apiFetch(`/api/game-events/${id}`, actingUserId, {
    method: 'PATCH',
    body: JSON.stringify({ isApproved: false }),
  })
}
