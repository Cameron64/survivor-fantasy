import { config } from '../config'
import type { Contestant, Episode, GameEvent } from '../types'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.api.baseUrl}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api.botApiKey}`,
      'X-Acting-User': config.api.actingUserId,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, `API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

export async function getContestants(): Promise<Contestant[]> {
  return apiFetch('/api/contestants')
}

export async function getEpisodes(): Promise<Episode[]> {
  return apiFetch('/api/episodes')
}

export async function getGameEvents(week?: number): Promise<GameEvent[]> {
  const params = new URLSearchParams()
  if (week) params.set('week', String(week))
  const qs = params.toString()
  return apiFetch(`/api/game-events${qs ? `?${qs}` : ''}`)
}

export async function getApprovedGameEvents(): Promise<GameEvent[]> {
  return apiFetch('/api/game-events?approved=true')
}

export async function submitGameEvent(body: {
  type: string
  week: number
  data: Record<string, unknown>
}): Promise<GameEvent> {
  return apiFetch('/api/game-events', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
