'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { getCurrentWeek } from '@/lib/season'
import { getDisplayName } from '@/components/shared/contestant-label'
import type { FormContestant } from '@/components/shared/contestant-label'
import type { GameEventData, IdolPlay, EliminationMethod } from '@/lib/event-derivation'
import type { EventType, GamePhase } from '@prisma/client'

interface TribeMembership {
  tribe: { id: string; name: string; color: string; buffImage?: string | null; isMerge?: boolean }
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
  isMerge: boolean
  contestantIds: string[]
  contestantNames: string[]
}

export interface SplitTribalState {
  groupA: string[]
  groupB: string[]
  groupAComplete: boolean
  groupBComplete: boolean
}

export interface TribalState {
  selectedAttendees: Set<string>
  votes: Record<string, string>
  noVote: string[]
  extraVotes: Array<{ voterId: string; votedForId: string }>
  shotInTheDark: { playedBy: string; successful: boolean } | null
  /** Tracks the player ID that SITD auto-added to noVote (null if SITD didn't add anyone) */
  sitdAddedToNoVote: string | null
  hasRevote: boolean
  revoteVotes: Record<string, string>
  revoteExtraVotes: Array<{ voterId: string; votedForId: string }>
  revoteEligibleVoters: string[]
  revoteEligibleTargets: string[]
  eliminated: string
  eliminationMethod: EliminationMethod
  idolPlays: IdolPlay[]
  sentToJury: boolean
}

const INITIAL_TRIBAL_STATE: TribalState = {
  selectedAttendees: new Set(),
  votes: {},
  noVote: [],
  extraVotes: [],
  shotInTheDark: null,
  sitdAddedToNoVote: null,
  hasRevote: false,
  revoteVotes: {},
  revoteExtraVotes: [],
  revoteEligibleVoters: [],
  revoteEligibleTargets: [],
  eliminated: '',
  eliminationMethod: 'vote',
  idolPlays: [],
  sentToJury: false,
}

/**
 * Discriminated union for tribal state updates.
 * Enforces cascade rules — e.g., changing votes automatically clears revote state.
 */
export type TribalStateAction =
  | { kind: 'setAttendees'; attendees: Set<string>; resetVotes?: boolean }
  | { kind: 'setVotes'; votes: Record<string, string> }
  | { kind: 'setNoVote'; noVote: string[] }
  | { kind: 'setExtraVotes'; extraVotes: Array<{ voterId: string; votedForId: string }> }
  | { kind: 'setShotInTheDark'; shotInTheDark: { playedBy: string; successful: boolean } | null }
  | { kind: 'setRevote'; hasRevote: boolean; revoteVotes?: Record<string, string>; revoteExtraVotes?: Array<{ voterId: string; votedForId: string }>; revoteEligibleVoters?: string[]; revoteEligibleTargets?: string[] }
  | { kind: 'setEliminated'; eliminated: string; eliminationMethod?: EliminationMethod }
  | { kind: 'setIdolPlays'; idolPlays: IdolPlay[] }
  | { kind: 'setExtras'; sentToJury?: boolean }
  | { kind: 'patch'; updates: Partial<Omit<TribalState, 'selectedAttendees' | 'votes'>> }

function reduceTribalState(prev: TribalState, action: TribalStateAction): TribalState {
  switch (action.kind) {
    case 'setAttendees': {
      const attendees = action.attendees
      // Filter downstream state to only include IDs in the new attendee set
      const filteredVotes = action.resetVotes ? {} : Object.fromEntries(
        Object.entries(prev.votes).filter(([k, v]) => attendees.has(k) && attendees.has(v))
      )
      return {
        ...prev,
        selectedAttendees: attendees,
        votes: filteredVotes,
        noVote: prev.noVote.filter(id => attendees.has(id)),
        extraVotes: prev.extraVotes.filter(ev => attendees.has(ev.voterId) && attendees.has(ev.votedForId)),
        eliminated: attendees.has(prev.eliminated) ? prev.eliminated : '',
        idolPlays: prev.idolPlays.filter(ip => attendees.has(ip.playedBy) && attendees.has(ip.playedFor)),
        // Clear SITD tracking if that player was removed
        sitdAddedToNoVote: prev.sitdAddedToNoVote && attendees.has(prev.sitdAddedToNoVote) ? prev.sitdAddedToNoVote : null,
        // Clear revote state on attendee change
        hasRevote: false,
        revoteVotes: {},
        revoteExtraVotes: [],
        revoteEligibleVoters: [],
        revoteEligibleTargets: [],
        eliminationMethod: 'vote',
      }
    }
    case 'setVotes':
      // Changing votes clears ALL revote state
      return {
        ...prev,
        votes: action.votes,
        hasRevote: false,
        revoteVotes: {},
        revoteExtraVotes: [],
        revoteEligibleVoters: [],
        revoteEligibleTargets: [],
        eliminationMethod: 'vote',
      }
    case 'setNoVote':
      return { ...prev, noVote: action.noVote }
    case 'setExtraVotes':
      return { ...prev, extraVotes: action.extraVotes }
    case 'setShotInTheDark': {
      const sitd = action.shotInTheDark
      let nextNoVote = prev.noVote
      let nextVotes = prev.votes
      let nextSitdAdded = prev.sitdAddedToNoVote

      // Remove previous SITD player from noVote only if SITD was the one that added them
      if (prev.shotInTheDark?.playedBy && prev.sitdAddedToNoVote === prev.shotInTheDark.playedBy) {
        nextNoVote = nextNoVote.filter(id => id !== prev.shotInTheDark!.playedBy)
        nextSitdAdded = null
      }

      // Auto-add new SITD player to noVote (playing SITD = lose your vote)
      if (sitd?.playedBy && !nextNoVote.includes(sitd.playedBy)) {
        nextNoVote = [...nextNoVote, sitd.playedBy]
        nextSitdAdded = sitd.playedBy
        // Clear their vote entry if they had one
        if (nextVotes[sitd.playedBy]) {
          const { [sitd.playedBy]: _, ...rest } = nextVotes
          nextVotes = rest
        }
      } else if (sitd?.playedBy && nextNoVote.includes(sitd.playedBy)) {
        // Player was already in noVote manually — SITD didn't add them
        nextSitdAdded = null
      }

      return { ...prev, shotInTheDark: sitd, noVote: nextNoVote, votes: nextVotes, sitdAddedToNoVote: nextSitdAdded }
    }
    case 'setRevote':
      return {
        ...prev,
        hasRevote: action.hasRevote,
        revoteVotes: action.revoteVotes ?? (action.hasRevote ? prev.revoteVotes : {}),
        revoteExtraVotes: action.revoteExtraVotes ?? (action.hasRevote ? prev.revoteExtraVotes : []),
        revoteEligibleVoters: action.revoteEligibleVoters ?? (action.hasRevote ? prev.revoteEligibleVoters : []),
        revoteEligibleTargets: action.revoteEligibleTargets ?? (action.hasRevote ? prev.revoteEligibleTargets : []),
        eliminationMethod: action.hasRevote ? 'revote' : 'vote',
      }
    case 'setEliminated':
      return {
        ...prev,
        eliminated: action.eliminated,
        eliminationMethod: action.eliminationMethod ?? prev.eliminationMethod,
      }
    case 'setIdolPlays':
      return { ...prev, idolPlays: action.idolPlays }
    case 'setExtras':
      return {
        ...prev,
        ...(action.sentToJury !== undefined && { sentToJury: action.sentToJury }),
      }
    case 'patch':
      return { ...prev, ...action.updates }
    default:
      return prev
  }
}

export interface AllTribe {
  id: string
  name: string
  color: string
  isMerge: boolean
  buffImage?: string | null
}

interface SubmitContextValue {
  contestants: FormContestant[]
  tribes: TribeGroup[]
  allTribes: AllTribe[]
  contestantNames: Record<string, string>
  pointValues: Record<EventType, number> | undefined
  week: string
  setWeek: (w: string) => void
  episodePhase: GamePhase | null
  formData: GameEventData | null
  setFormData: (d: GameEventData | null) => void
  tribalState: TribalState
  dispatchTribalState: (action: TribalStateAction) => void
  /** @deprecated Use dispatchTribalState instead. Kept for non-tribal callers. */
  updateTribalState: (updates: Partial<TribalState>) => void
  resetTribalState: () => void
  splitTribal: SplitTribalState | null
  setSplitTribal: (s: SplitTribalState | null) => void
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
  const [allTribes, setAllTribes] = useState<AllTribe[]>([])
  const [pointValues, setPointValues] = useState<Record<EventType, number> | undefined>(undefined)
  const [week, setWeek] = useState(() => getCurrentWeek().toString())
  const [formData, setFormData] = useState<GameEventData | null>(null)
  const [tribalState, setTribalState] = useState<TribalState>(INITIAL_TRIBAL_STATE)
  const [episodePhase, setEpisodePhase] = useState<GamePhase | null>(null)
  const [splitTribal, setSplitTribal] = useState<SplitTribalState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const dispatchTribalState = useCallback((action: TribalStateAction) => {
    setTribalState((prev) => reduceTribalState(prev, action))
  }, [])

  // Backward compat: simple partial updates (no cascades)
  const updateTribalState = useCallback((updates: Partial<TribalState>) => {
    setTribalState((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetTribalState = useCallback(() => {
    setTribalState(INITIAL_TRIBAL_STATE)
  }, [])

  useEffect(() => {
    fetch('/api/legacy/league/scoring')
      .then((res) => res.json())
      .then((data) => {
        if (data.effective) setPointValues(data.effective)
      })
      .catch(console.error)
  }, [])

  // Fetch episode phase for the current week
  useEffect(() => {
    const weekNum = parseInt(week)
    if (isNaN(weekNum)) return
    fetch('/api/legacy/episodes')
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const episode = data.find((ep: { number: number }) => ep.number === weekNum)
          setEpisodePhase(episode?.gamePhase ?? null)
        }
      })
      .catch(() => {})
  }, [week])

  useEffect(() => {
    fetch('/api/legacy/tribes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllTribes(data.map((t: { id: string; name: string; color: string; isMerge: boolean; buffImage?: string | null }) => ({
            id: t.id, name: t.name, color: t.color, isMerge: t.isMerge, buffImage: t.buffImage,
          })))
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetch('/api/legacy/contestants?includeMemberships=true')
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
              tribeMap.set(t.id, { id: t.id, name: t.name, color: t.color, buffImage: t.buffImage, isMerge: !!t.isMerge, contestantIds: [], contestantNames: [] })
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
    () => ({ contestants, tribes, allTribes, contestantNames, pointValues, week, setWeek, episodePhase, formData, setFormData, tribalState, dispatchTribalState, updateTribalState, resetTribalState, splitTribal, setSplitTribal, isLoading }),
    [contestants, tribes, allTribes, contestantNames, pointValues, week, episodePhase, formData, tribalState, dispatchTribalState, updateTribalState, resetTribalState, splitTribal, isLoading]
  )

  return <SubmitContext.Provider value={value}>{children}</SubmitContext.Provider>
}
