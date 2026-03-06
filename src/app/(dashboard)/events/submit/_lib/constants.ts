import {
  Flame,
  Shield,
  Gift,
  Search,
  Swords,
  LogOut,
  Trophy,
} from 'lucide-react'
import { GameEventType } from '@prisma/client'

export interface EventTypeTheme {
  iconBg: string
  iconText: string
  borderColor: string
  hoverBorder: string
}

export const EVENT_TYPE_THEMES: Record<GameEventType, EventTypeTheme> = {
  TRIBAL_COUNCIL: {
    iconBg: 'bg-orange-500/10',
    iconText: 'text-orange-500',
    borderColor: 'border-l-orange-500',
    hoverBorder: 'hover:border-orange-400',
  },
  IMMUNITY_CHALLENGE: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-500',
    borderColor: 'border-l-blue-500',
    hoverBorder: 'hover:border-blue-400',
  },
  REWARD_CHALLENGE: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-500',
    borderColor: 'border-l-emerald-500',
    hoverBorder: 'hover:border-emerald-400',
  },
  IDOL_FOUND: {
    iconBg: 'bg-yellow-500/10',
    iconText: 'text-yellow-500',
    borderColor: 'border-l-yellow-500',
    hoverBorder: 'hover:border-yellow-400',
  },
  FIRE_MAKING: {
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-500',
    borderColor: 'border-l-red-500',
    hoverBorder: 'hover:border-red-400',
  },
  QUIT_MEDEVAC: {
    iconBg: 'bg-slate-500/10',
    iconText: 'text-slate-500',
    borderColor: 'border-l-slate-500',
    hoverBorder: 'hover:border-slate-400',
  },
  ENDGAME: {
    iconBg: 'bg-yellow-400/10',
    iconText: 'text-yellow-400',
    borderColor: 'border-l-yellow-400',
    hoverBorder: 'hover:border-yellow-300',
  },
}

export const EVENT_TYPE_OPTIONS: {
  type: GameEventType
  label: string
  description: string
  icon: typeof Flame
}[] = [
  {
    type: 'TRIBAL_COUNCIL',
    label: 'Tribal Council',
    description: 'Votes, elimination, idols, jury',
    icon: Flame,
  },
  {
    type: 'IMMUNITY_CHALLENGE',
    label: 'Immunity Challenge',
    description: 'Individual immunity win',
    icon: Shield,
  },
  {
    type: 'REWARD_CHALLENGE',
    label: 'Reward Challenge',
    description: 'Reward or team challenge win',
    icon: Gift,
  },
  {
    type: 'IDOL_FOUND',
    label: 'Idol Found',
    description: 'Hidden immunity idol discovery',
    icon: Search,
  },
  {
    type: 'FIRE_MAKING',
    label: 'Fire Making',
    description: 'Fire making challenge',
    icon: Swords,
  },
  {
    type: 'QUIT_MEDEVAC',
    label: 'Quit / Medevac',
    description: 'Player quit or medical evacuation',
    icon: LogOut,
  },
  {
    type: 'ENDGAME',
    label: 'Endgame',
    description: 'Finalists and winner',
    icon: Trophy,
  },
]

export const VALID_EVENT_TYPES = new Set(EVENT_TYPE_OPTIONS.map((o) => o.type))

// URL slug <-> GameEventType mapping
const SLUG_TO_TYPE: Record<string, GameEventType> = {
  'tribal-council': 'TRIBAL_COUNCIL',
  'immunity-challenge': 'IMMUNITY_CHALLENGE',
  'reward-challenge': 'REWARD_CHALLENGE',
  'idol-found': 'IDOL_FOUND',
  'fire-making': 'FIRE_MAKING',
  'quit-medevac': 'QUIT_MEDEVAC',
  'endgame': 'ENDGAME',
}

const TYPE_TO_SLUG: Record<GameEventType, string> = Object.fromEntries(
  Object.entries(SLUG_TO_TYPE).map(([slug, type]) => [type, slug])
) as Record<GameEventType, string>

export function slugToType(slug: string): GameEventType | null {
  return SLUG_TO_TYPE[slug] ?? null
}

export function typeToSlug(type: GameEventType): string {
  return TYPE_TO_SLUG[type]
}
