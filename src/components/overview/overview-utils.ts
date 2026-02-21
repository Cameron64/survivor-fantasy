import { EventType } from '@prisma/client'
import type { ApprovedEvent, CategoryBreakdown } from './overview-types'

export const EVENT_CATEGORIES: Record<
  string,
  { label: string; color: string; types: EventType[] }
> = {
  challenges: {
    label: 'Challenges',
    color: '#2563eb',
    types: ['INDIVIDUAL_IMMUNITY_WIN', 'REWARD_CHALLENGE_WIN', 'TEAM_CHALLENGE_WIN'],
  },
  tribal: {
    label: 'Tribal',
    color: '#d97706',
    types: ['CORRECT_VOTE', 'ZERO_VOTES_RECEIVED', 'SURVIVED_WITH_VOTES', 'CAUSED_BLINDSIDE'],
  },
  idols: {
    label: 'Idols',
    color: '#7c3aed',
    types: ['IDOL_PLAY_SUCCESS', 'IDOL_FIND'],
  },
  endgame: {
    label: 'Endgame',
    color: '#059669',
    types: ['MADE_JURY', 'FINALIST', 'WINNER', 'FIRE_MAKING_WIN'],
  },
  penalties: {
    label: 'Penalties',
    color: '#dc2626',
    types: ['VOTED_OUT_WITH_IDOL', 'QUIT'],
  },
}

const eventTypeToCategory = new Map<EventType, string>()
for (const [key, cat] of Object.entries(EVENT_CATEGORIES)) {
  for (const t of cat.types) {
    eventTypeToCategory.set(t, key)
  }
}

export function getCategoryForEvent(type: EventType): string {
  return eventTypeToCategory.get(type) ?? 'challenges'
}

export function getCategoryColor(type: EventType): string {
  const key = getCategoryForEvent(type)
  return EVENT_CATEGORIES[key].color
}

export function categorizeEvents(events: ApprovedEvent[]): CategoryBreakdown[] {
  const totals: Record<string, number> = {}

  for (const event of events) {
    const key = getCategoryForEvent(event.type)
    totals[key] = (totals[key] || 0) + event.points
  }

  return Object.entries(EVENT_CATEGORIES).map(([key, cat]) => ({
    category: key,
    label: cat.label,
    color: cat.color,
    points: totals[key] || 0,
  }))
}
