'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { getCurrentWeek } from '@/lib/season'
import { getDisplayName } from '@/components/shared/contestant-label'
import type { FormContestant } from '@/components/shared/contestant-label'
import type { GameEventData } from '@/lib/event-derivation'
import type { EventType } from '@prisma/client'

interface TribeMembership {
  tribe: { id: string; name: string; color: string; buffImage?: string | null }
}

interface RawContestant {
  id: string
  name: string
  nickname?: string | null
  imageUrl?: string | null
  tribe: string | null
  isEliminated: boolean
  tribeMemberships?: TribeMembership[]
}

export interface TribeGroup {
  id: string
  name: string
  color: string
  buffImage?: string | null
  contestantIds: string[]
  contestantNames: string[]
}

export interface TribalState {
  selectedAttendees: Set<string>
  votes: Record<string, string>
  eliminated: string
  idolPlayed: boolean
  idolPlayedBy: string
  idolSuccessful: boolean
  sentToJury: boolean
}

const INITIAL_TRIBAL_STATE: TribalState = {
  selectedAttendees: new Set(),
  votes: {},
  eliminated: '',
  idolPlayed: false,
  idolPlayedBy: '',
  idolSuccessful: true,
  sentToJury: false,
}

interface SubmitContextValue {
  contestants: FormContestant[]
  tribes: TribeGroup[]
  contestantNames: Record<string, string>
  pointValues: Record<EventType, number> | undefined
  week: string
  setWeek: (w: string) => void
  formData: GameEventData | null
  setFormData: (d: GameEventData | null) => void
  tribalState: TribalState
  updateTribalState: (updates: Partial<TribalState>) => void
  resetTribalState: () => void
  isLoading: boolean
}

const SubmitContext = createContext<SubmitContextValue | null>(null)

export function useSubmitContext() {
  const ctx = useContext(SubmitContext)
  if (!ctx) throw new Error('useSubmitContext must be used within SubmitProvider')
  return ctx
}

export function SubmitProvider({ children }: { children: ReactNode }) {
  const [contestants, setContestants] = useState<FormContestant[]>([])
  const [tribes, setTribes] = useState<TribeGroup[]>([])
  const [pointValues, setPointValues] = useState<Record<EventType, number> | undefined>(undefined)
  const [week, setWeek] = useState(() => getCurrentWeek().toString())
  const [formData, setFormData] = useState<GameEventData | null>(null)
  const [tribalState, setTribalState] = useState<TribalState>(INITIAL_TRIBAL_STATE)
  const [isLoading, setIsLoading] = useState(true)

  const updateTribalState = useCallback((updates: Partial<TribalState>) => {
    setTribalState((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetTribalState = useCallback(() => {
    setTribalState(INITIAL_TRIBAL_STATE)
  }, [])

  useEffect(() => {
    fetch('/api/league/scoring')
      .then((res) => res.json())
      .then((data) => {
        if (data.effective) setPointValues(data.effective)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetch('/api/contestants?includeMemberships=true')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const enriched: FormContestant[] = (data as RawContestant[]).map((c) => ({
            id: c.id,
            name: c.name,
            nickname: c.nickname,
            imageUrl: c.imageUrl,
            tribe: c.tribe,
            tribeColor: c.tribeMemberships?.[0]?.tribe.color ?? null,
            isEliminated: c.isEliminated,
          }))
          setContestants(enriched)

          const tribeMap = new Map<string, TribeGroup>()
          for (const raw of data as RawContestant[]) {
            if (raw.isEliminated) continue
            const membership = raw.tribeMemberships?.[0]
            if (!membership) continue
            const t = membership.tribe
            if (!tribeMap.has(t.id)) {
              tribeMap.set(t.id, { id: t.id, name: t.name, color: t.color, buffImage: t.buffImage, contestantIds: [], contestantNames: [] })
            }
            const group = tribeMap.get(t.id)!
            group.contestantIds.push(raw.id)
            group.contestantNames.push(raw.nickname || raw.name)
          }
          setTribes(Array.from(tribeMap.values()))
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const contestantNames = useMemo(
    () => Object.fromEntries(contestants.map((c) => [c.id, getDisplayName(c)])),
    [contestants]
  )

  const value = useMemo(
    () => ({ contestants, tribes, contestantNames, pointValues, week, setWeek, formData, setFormData, tribalState, updateTribalState, resetTribalState, isLoading }),
    [contestants, tribes, contestantNames, pointValues, week, formData, tribalState, updateTribalState, resetTribalState, isLoading]
  )

  return <SubmitContext.Provider value={value}>{children}</SubmitContext.Provider>
}
