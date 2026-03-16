'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { getDisplayName } from '@/components/shared/contestant-label'
import { ContestantSelectTile } from '@/components/shared/contestant-select-tile'
import { useSubmitContext } from './submit-context'
import type { VoteRound, IdolPlay } from '@/lib/event-derivation'

const BASE = '/events/submit/tribal-council'

// ---- Helpers ----

/**
 * Compute vote tallies from a votes record + optional extra votes.
 * If immuneIds is provided, votes against those players are counted but tracked separately
 * so we can show the raw tallies while excluding immune players from elimination prediction.
 */
function computeTallies(
  attendees: Set<string>,
  votes: Record<string, string>,
  extraVotes?: Array<{ voterId: string; votedForId: string }>,
  immuneIds?: Set<string>
) {
  const tallies: Record<string, number> = {}
  attendees.forEach((id) => { tallies[id] = 0 })
  for (const votedFor of Object.values(votes)) {
    if (tallies[votedFor] !== undefined) tallies[votedFor]++
  }
  if (extraVotes) {
    for (const ev of extraVotes) {
      if (tallies[ev.votedForId] !== undefined) tallies[ev.votedForId]++
    }
  }
  // Zero out immune players — their votes don't count for elimination
  if (immuneIds) {
    Array.from(immuneIds).forEach(id => {
      if (tallies[id] !== undefined) tallies[id] = 0
    })
  }
  return tallies
}

/** Detect if there's a tie at the top of vote tallies */
function detectTie(tallies: Record<string, number>): { isTied: boolean; tiedIds: string[]; maxVotes: number } {
  const entries = Object.entries(tallies).filter(([, count]) => count > 0)
  if (entries.length === 0) return { isTied: false, tiedIds: [], maxVotes: 0 }
  const maxVotes = Math.max(...entries.map(([, c]) => c))
  const tiedIds = entries.filter(([, c]) => c === maxVotes).map(([id]) => id)
  return { isTied: tiedIds.length > 1, tiedIds, maxVotes }
}

// ============================================================================
// Attendees Step
// ============================================================================

export function AttendeesStep() {
  const router = useRouter()
  const { contestants, tribes, tribalState, dispatchTribalState } = useSubmitContext()
  const { selectedAttendees, noVote } = tribalState

  const selectedTribeId = useMemo(() => {
    if (tribes.length === 0) return null
    for (const tribe of tribes) {
      const selected = tribe.contestantIds.filter((id) => selectedAttendees.has(id))
      if (selected.length > 0) return tribe.id
    }
    return null
  }, [tribes, selectedAttendees])

  const selectedTribeMembers = useMemo(() => {
    if (!selectedTribeId) return []
    const tribe = tribes.find((t) => t.id === selectedTribeId)
    if (!tribe) return []
    return contestants.filter((c) => tribe.contestantIds.includes(c.id))
  }, [selectedTribeId, tribes, contestants])

  const selectTribe = (tribeId: string) => {
    const tribe = tribes.find((t) => t.id === tribeId)
    if (!tribe) return
    dispatchTribalState({ kind: 'setAttendees', attendees: new Set(tribe.contestantIds), resetVotes: true })
  }

  const toggleAttendee = (id: string) => {
    const next = new Set(selectedAttendees)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    dispatchTribalState({ kind: 'setAttendees', attendees: next })
  }

  const toggleNoVote = (id: string) => {
    const next = noVote.includes(id)
      ? noVote.filter(nv => nv !== id)
      : [...noVote, id]
    dispatchTribalState({ kind: 'setNoVote', noVote: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Which tribe went to Tribal Council?</h3>
        <p className="text-sm text-muted-foreground">
          Select the tribe, then deselect anyone who wasn&apos;t there.
        </p>
      </div>

      {/* Tribe selection */}
      <div className="space-y-2">
        {tribes.map((tribe) => {
          const isSelected = selectedTribeId === tribe.id
          return (
            <button
              key={tribe.id}
              data-testid={`tribe-${tribe.name.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => selectTribe(tribe.id)}
              className={`relative w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-colors overflow-hidden ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground'
              }`}
            >
              {tribe.buffImage && (
                <div
                  className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity ${
                    isSelected ? 'opacity-[0.12]' : 'opacity-[0.06]'
                  }`}
                  style={{ backgroundImage: `url(${tribe.buffImage})` }}
                />
              )}
              <div
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  isSelected ? 'border-primary' : 'border-transparent'
                }`}
                style={{ backgroundColor: tribe.color }}
              >
                {isSelected && <Check className="h-3 w-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />}
              </div>
              <div className="relative z-10">
                <span className="font-medium">{tribe.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {tribe.contestantIds.length} members
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tribe members — toggle individuals off/on + can't vote toggles */}
      {selectedTribeId && selectedTribeMembers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {selectedAttendees.size} attending — tap to remove anyone who wasn&apos;t there
          </p>
          <div className="grid grid-cols-2 gap-2">
            {selectedTribeMembers.map((c) => (
              <ContestantSelectTile
                key={c.id}
                data-testid={`contestant-${c.id}`}
                contestant={c}
                isSelected={selectedAttendees.has(c.id)}
                onClick={() => toggleAttendee(c.id)}
              />
            ))}
          </div>

          {/* Can't Vote toggles */}
          {selectedAttendees.size > 0 && (
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Can&apos;t vote (lost vote, blocked, etc.)</p>
              <div className="space-y-1">
                {contestants
                  .filter(c => selectedAttendees.has(c.id))
                  .map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={noVote.includes(c.id)}
                        onChange={() => toggleNoVote(c.id)}
                        className="rounded border-muted-foreground"
                      />
                      <span className={noVote.includes(c.id) ? 'text-muted-foreground line-through' : ''}>
                        {getDisplayName(c)}
                      </span>
                      {noVote.includes(c.id) && (
                        <Badge variant="outline" className="text-[10px] py-0">no vote</Badge>
                      )}
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push('/events/submit')}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => router.push(`${BASE}/votes`)}
          disabled={selectedAttendees.size < 2}
        >
          Next: Record Votes ({selectedAttendees.size} attendees)
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Votes Step
// ============================================================================

export function VotesStep() {
  const router = useRouter()
  const { contestants, tribalState, dispatchTribalState } = useSubmitContext()
  const { selectedAttendees, votes, noVote, extraVotes } = tribalState

  const attendeeList = useMemo(
    () => contestants.filter((c) => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  // Voters = attendees who CAN vote (not in noVote)
  const voterList = useMemo(
    () => attendeeList.filter(c => !noVote.includes(c.id)),
    [attendeeList, noVote]
  )

  // Build immune set from successful SITD + successful idol plays
  const immuneIds = useMemo(() => {
    const ids = new Set<string>()
    if (tribalState.shotInTheDark?.successful && tribalState.shotInTheDark.playedBy) {
      ids.add(tribalState.shotInTheDark.playedBy)
    }
    return ids
  }, [tribalState.shotInTheDark])

  // Raw tallies (for display — shows actual vote counts)
  const rawTallies = useMemo(
    () => computeTallies(selectedAttendees, votes, extraVotes),
    [votes, extraVotes, selectedAttendees]
  )

  // Effective tallies (for elimination prediction — immune players zeroed out)
  const voteTallies = useMemo(
    () => computeTallies(selectedAttendees, votes, extraVotes, immuneIds),
    [votes, extraVotes, selectedAttendees, immuneIds]
  )

  const allVotesCast = voterList.every((c) => votes[c.id])

  const tieInfo = useMemo(() => detectTie(voteTallies), [voteTallies])

  // Extra vote management
  const [showExtraVotes, setShowExtraVotes] = useState(extraVotes.length > 0)
  const [showSitd, setShowSitd] = useState(!!tribalState.shotInTheDark)

  const addExtraVote = () => {
    dispatchTribalState({
      kind: 'setExtraVotes',
      extraVotes: [...extraVotes, { voterId: '', votedForId: '' }],
    })
  }

  const updateExtraVote = (index: number, field: 'voterId' | 'votedForId', value: string) => {
    const next = [...extraVotes]
    next[index] = { ...next[index], [field]: value }
    dispatchTribalState({ kind: 'setExtraVotes', extraVotes: next })
  }

  const removeExtraVote = (index: number) => {
    dispatchTribalState({
      kind: 'setExtraVotes',
      extraVotes: extraVotes.filter((_, i) => i !== index),
    })
  }

  const setVote = (voterId: string, votedForId: string) => {
    dispatchTribalState({ kind: 'setVotes', votes: { ...votes, [voterId]: votedForId } })
  }

  if (selectedAttendees.size < 2) {
    router.push(`${BASE}/attendees`)
    return null
  }

  const handleNext = () => {
    if (allVotesCast && tieInfo.isTied) {
      router.push(`${BASE}/tie-resolution`)
    } else {
      // Pre-select mostVoted as eliminated if no tie
      const mostVoted = Object.entries(voteTallies).sort(([, a], [, b]) => b - a)[0]
      if (mostVoted && mostVoted[1] > 0 && !tribalState.eliminated) {
        dispatchTribalState({ kind: 'setEliminated', eliminated: mostVoted[0] })
      }
      router.push(`${BASE}/elimination`)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">How did everyone vote?</h3>
        <p className="text-sm text-muted-foreground">
          Select who each person voted for.
          {noVote.length > 0 && ` (${noVote.length} can't vote)`}
        </p>
      </div>

      <div className="space-y-3">
        {voterList.map((voter) => (
          <div key={voter.id} className="flex rounded-lg border bg-card overflow-hidden">
            <div
              className="relative w-14 shrink-0 bg-muted"
              style={voter.tribeColor ? { borderBottom: `3px solid ${voter.tribeColor}` } : undefined}
            >
              {voter.imageUrl ? (
                <img
                  src={voter.imageUrl}
                  alt={getDisplayName(voter)}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium text-xs">
                  {voter.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getDisplayName(voter)}</p>
                <p className="text-[11px] text-muted-foreground">voted for</p>
              </div>
              <Select
                value={votes[voter.id] || ''}
                onValueChange={(value) => setVote(voter.id, value)}
              >
                <SelectTrigger data-testid={`vote-${voter.id}`} className="w-[140px]">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {attendeeList
                    .filter((c) => c.id !== voter.id)
                    .map((target) => (
                      <SelectItem key={target.id} value={target.id}>
                        {getDisplayName(target)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {/* noVote players shown as info */}
      {noVote.length > 0 && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Can&apos;t vote:</span>{' '}
            {noVote.map(id => {
              const c = contestants.find(c => c.id === id)
              return c ? getDisplayName(c) : 'Unknown'
            }).join(', ')}
          </p>
        </div>
      )}

      {/* Extra Votes */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Extra votes (advantage)</Label>
            <Switch
              checked={showExtraVotes}
              onCheckedChange={(v) => {
                setShowExtraVotes(v)
                if (!v) dispatchTribalState({ kind: 'setExtraVotes', extraVotes: [] })
              }}
            />
          </div>
          {showExtraVotes && (
            <div className="space-y-2">
              {extraVotes.map((ev, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={ev.voterId} onValueChange={(v) => updateExtraVote(i, 'voterId', v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Who..." />
                    </SelectTrigger>
                    <SelectContent>
                      {attendeeList.map(c => (
                        <SelectItem key={c.id} value={c.id}>{getDisplayName(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">voted for</span>
                  <Select value={ev.votedForId} onValueChange={(v) => updateExtraVote(i, 'votedForId', v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Who..." />
                    </SelectTrigger>
                    <SelectContent>
                      {attendeeList.filter(c => c.id !== ev.voterId).map(c => (
                        <SelectItem key={c.id} value={c.id}>{getDisplayName(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeExtraVote(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addExtraVote}>
                <Plus className="h-3 w-3 mr-1" /> Add extra vote
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shot in the Dark */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Shot in the Dark</Label>
            <Switch
              checked={showSitd}
              onCheckedChange={(v) => {
                setShowSitd(v)
                if (!v) dispatchTribalState({ kind: 'setShotInTheDark', shotInTheDark: null })
              }}
            />
          </div>
          {showSitd && (
            <div className="space-y-2">
              <Select
                value={tribalState.shotInTheDark?.playedBy || ''}
                onValueChange={(v) => dispatchTribalState({
                  kind: 'setShotInTheDark',
                  shotInTheDark: { playedBy: v, successful: tribalState.shotInTheDark?.successful ?? false },
                })}
              >
                <SelectTrigger><SelectValue placeholder="Who played it?" /></SelectTrigger>
                <SelectContent>
                  {attendeeList.map(c => (
                    <SelectItem key={c.id} value={c.id}>{getDisplayName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tribalState.shotInTheDark?.playedBy && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Was it successful?</Label>
                  <Switch
                    checked={tribalState.shotInTheDark?.successful ?? false}
                    onCheckedChange={(v) => dispatchTribalState({
                      kind: 'setShotInTheDark',
                      shotInTheDark: { playedBy: tribalState.shotInTheDark!.playedBy, successful: v },
                    })}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vote Tally */}
      {Object.values(votes).length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-sm font-medium mb-2">Vote Tally</p>
            <div className="flex flex-wrap gap-2">
              {attendeeList
                .filter((c) => rawTallies[c.id] > 0)
                .sort((a, b) => (rawTallies[b.id] || 0) - (rawTallies[a.id] || 0))
                .map((c) => (
                  <Badge
                    key={c.id}
                    variant={immuneIds.has(c.id) ? 'outline' : tieInfo.tiedIds.includes(c.id) ? 'destructive' : 'secondary'}
                  >
                    {getDisplayName(c)}: {rawTallies[c.id]}
                    {immuneIds.has(c.id) && ' (immune)'}
                  </Badge>
                ))}
            </div>
            {allVotesCast && tieInfo.isTied && (
              <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Tie detected! Next step will resolve it.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push(`${BASE}/attendees`)}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={handleNext}
          disabled={!allVotesCast}
        >
          {allVotesCast && tieInfo.isTied ? 'Next: Resolve Tie' : 'Next: Confirm Elimination'}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Tie Resolution Step
// ============================================================================

export function TieResolutionStep() {
  const router = useRouter()
  const { contestants, tribalState, dispatchTribalState } = useSubmitContext()
  const { selectedAttendees, votes, extraVotes, noVote } = tribalState

  const attendeeList = useMemo(
    () => contestants.filter(c => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  const voteTallies = useMemo(
    () => computeTallies(selectedAttendees, votes, extraVotes),
    [votes, extraVotes, selectedAttendees]
  )

  const tieInfo = useMemo(() => detectTie(voteTallies), [voteTallies])

  const getName = (id: string) => {
    const c = contestants.find(c => c.id === id)
    return c ? getDisplayName(c) : 'Unknown'
  }

  const handleRevote = () => {
    // Pre-populate revote: eligible voters = attendees minus tied players, minus noVote
    const eligibleVoters = Array.from(selectedAttendees).filter(
      id => !tieInfo.tiedIds.includes(id) && !noVote.includes(id)
    )
    dispatchTribalState({
      kind: 'setRevote',
      hasRevote: true,
      revoteVotes: {},
      revoteExtraVotes: [],
      revoteEligibleVoters: eligibleVoters,
      revoteEligibleTargets: tieInfo.tiedIds,
    })
    router.push(`${BASE}/revote`)
  }

  const handleRockDraw = () => {
    dispatchTribalState({ kind: 'setEliminated', eliminated: '', eliminationMethod: 'rock_draw' })
    router.push(`${BASE}/rock-draw`)
  }

  const handleConsensus = () => {
    dispatchTribalState({ kind: 'setEliminated', eliminated: '', eliminationMethod: 'consensus' })
    router.push(`${BASE}/elimination`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Tie at Tribal Council</h3>
        <p className="text-sm text-muted-foreground">
          {tieInfo.tiedIds.map(getName).join(' and ')} are tied with {tieInfo.maxVotes} vote(s) each.
          How was this resolved?
        </p>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {attendeeList
              .filter(c => voteTallies[c.id] > 0)
              .sort((a, b) => (voteTallies[b.id] || 0) - (voteTallies[a.id] || 0))
              .map(c => (
                <Badge key={c.id} variant={tieInfo.tiedIds.includes(c.id) ? 'destructive' : 'secondary'}>
                  {getDisplayName(c)}: {voteTallies[c.id]}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button className="w-full justify-start" variant="outline" onClick={handleRevote}>
          Revote (restricted voter/target pool)
        </Button>
        <Button className="w-full justify-start" variant="outline" onClick={handleRockDraw}>
          Rock Draw (random elimination)
        </Button>
        <Button className="w-full justify-start" variant="outline" onClick={handleConsensus}>
          Consensus / Default (unanimous decision)
        </Button>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push(`${BASE}/votes`)}>
          Back
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Revote Step
// ============================================================================

export function RevoteStep() {
  const router = useRouter()
  const { contestants, tribalState, dispatchTribalState } = useSubmitContext()
  const { selectedAttendees, revoteVotes, revoteExtraVotes, revoteEligibleVoters, revoteEligibleTargets } = tribalState

  const attendeeList = useMemo(
    () => contestants.filter(c => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  const voterList = useMemo(
    () => attendeeList.filter(c => revoteEligibleVoters.includes(c.id)),
    [attendeeList, revoteEligibleVoters]
  )

  const targetList = useMemo(
    () => attendeeList.filter(c => revoteEligibleTargets.includes(c.id)),
    [attendeeList, revoteEligibleTargets]
  )

  const voteTallies = useMemo(
    () => computeTallies(new Set(revoteEligibleTargets), revoteVotes, revoteExtraVotes),
    [revoteVotes, revoteExtraVotes, revoteEligibleTargets]
  )

  const allVotesCast = voterList.every(c => revoteVotes[c.id])
  const tieInfo = useMemo(() => detectTie(voteTallies), [voteTallies])

  const getName = (id: string) => {
    const c = contestants.find(c => c.id === id)
    return c ? getDisplayName(c) : 'Unknown'
  }

  const setRevoteVote = (voterId: string, votedForId: string) => {
    dispatchTribalState({
      kind: 'setRevote',
      hasRevote: true,
      revoteVotes: { ...revoteVotes, [voterId]: votedForId },
      revoteEligibleVoters,
      revoteEligibleTargets,
    })
  }

  const handleNext = () => {
    if (allVotesCast && tieInfo.isTied) {
      // Revote also tied — go to rock draw
      dispatchTribalState({ kind: 'setEliminated', eliminated: '', eliminationMethod: 'rock_draw' })
      router.push(`${BASE}/rock-draw`)
    } else {
      // Pre-select winner from revote tallies
      const mostVoted = Object.entries(voteTallies).sort(([, a], [, b]) => b - a)[0]
      if (mostVoted && mostVoted[1] > 0) {
        dispatchTribalState({ kind: 'setEliminated', eliminated: mostVoted[0], eliminationMethod: 'revote' })
      }
      router.push(`${BASE}/elimination`)
    }
  }

  // Toggle eligible voter
  const toggleVoter = (id: string) => {
    const next = revoteEligibleVoters.includes(id)
      ? revoteEligibleVoters.filter(v => v !== id)
      : [...revoteEligibleVoters, id]
    dispatchTribalState({
      kind: 'setRevote',
      hasRevote: true,
      revoteVotes,
      revoteEligibleVoters: next,
      revoteEligibleTargets,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Revote</h3>
        <p className="text-sm text-muted-foreground">
          Only {revoteEligibleTargets.map(getName).join(' and ')} can receive votes.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Note: Remove immune contestants from eligible voters if needed.
        </p>
      </div>

      {/* Eligible voters (adjustable) */}
      <Card>
        <CardContent className="p-3">
          <p className="text-sm font-medium mb-2">Eligible voters</p>
          <div className="space-y-1">
            {attendeeList
              .filter(c => !revoteEligibleTargets.includes(c.id))
              .map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={revoteEligibleVoters.includes(c.id)}
                    onChange={() => toggleVoter(c.id)}
                    className="rounded"
                  />
                  {getDisplayName(c)}
                </label>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Revote voting */}
      <div className="space-y-3">
        {voterList.map(voter => (
          <div key={voter.id} className="flex rounded-lg border bg-card overflow-hidden">
            <div
              className="relative w-14 shrink-0 bg-muted"
              style={voter.tribeColor ? { borderBottom: `3px solid ${voter.tribeColor}` } : undefined}
            >
              {voter.imageUrl ? (
                <img src={voter.imageUrl} alt={getDisplayName(voter)} className="absolute inset-0 w-full h-full object-cover object-top" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium text-xs">
                  {voter.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getDisplayName(voter)}</p>
                <p className="text-[11px] text-muted-foreground">voted for</p>
              </div>
              <Select
                value={revoteVotes[voter.id] || ''}
                onValueChange={(value) => setRevoteVote(voter.id, value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {targetList.map(target => (
                    <SelectItem key={target.id} value={target.id}>{getDisplayName(target)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {/* Revote tally */}
      {Object.values(revoteVotes).length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-sm font-medium mb-2">Revote Tally</p>
            <div className="flex flex-wrap gap-2">
              {targetList
                .filter(c => voteTallies[c.id] > 0)
                .sort((a, b) => (voteTallies[b.id] || 0) - (voteTallies[a.id] || 0))
                .map(c => (
                  <Badge key={c.id} variant={tieInfo.tiedIds.includes(c.id) ? 'destructive' : 'secondary'}>
                    {getDisplayName(c)}: {voteTallies[c.id]}
                  </Badge>
                ))}
            </div>
            {allVotesCast && tieInfo.isTied && (
              <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Still tied! Next step: Rock Draw
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push(`${BASE}/tie-resolution`)}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleNext} disabled={!allVotesCast}>
          {allVotesCast && tieInfo.isTied ? 'Next: Rock Draw' : 'Next: Confirm Elimination'}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Rock Draw Step
// ============================================================================

export function RockDrawStep() {
  const router = useRouter()
  const { contestants, tribalState, dispatchTribalState } = useSubmitContext()
  const { selectedAttendees, eliminated } = tribalState

  const attendeeList = useMemo(
    () => contestants.filter(c => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Rock Draw</h3>
        <p className="text-sm text-muted-foreground">
          Who drew the bad rock? Select the eliminated contestant.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attendeeList.map(c => (
          <ContestantSelectTile
            key={c.id}
            contestant={c}
            isSelected={eliminated === c.id}
            onClick={() => dispatchTribalState({ kind: 'setEliminated', eliminated: c.id, eliminationMethod: 'rock_draw' })}
            variant="destructive"
          />
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => {
          dispatchTribalState({ kind: 'setEliminated', eliminated: '', eliminationMethod: 'vote' })
          router.push(`${BASE}/tie-resolution`)
        }}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => router.push(`${BASE}/extras`)}
          disabled={!eliminated}
        >
          Next: Additional Details
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Elimination Step
// ============================================================================

export function EliminationStep() {
  const router = useRouter()
  const { contestants, tribalState, dispatchTribalState } = useSubmitContext()
  const { selectedAttendees, votes, extraVotes, eliminated, eliminationMethod, hasRevote, revoteVotes, revoteExtraVotes, revoteEligibleTargets } = tribalState

  const attendeeList = useMemo(
    () => contestants.filter((c) => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  // Show tallies from the decisive round
  const voteTallies = useMemo(() => {
    if (hasRevote) {
      return computeTallies(new Set(revoteEligibleTargets), revoteVotes, revoteExtraVotes)
    }
    return computeTallies(selectedAttendees, votes, extraVotes)
  }, [hasRevote, revoteVotes, revoteExtraVotes, revoteEligibleTargets, votes, extraVotes, selectedAttendees])

  if (selectedAttendees.size < 2) {
    router.push(`${BASE}/attendees`)
    return null
  }

  const backPath = hasRevote ? `${BASE}/revote`
    : eliminationMethod === 'consensus' ? `${BASE}/tie-resolution`
    : `${BASE}/votes`

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Who was voted out?</h3>
        <p className="text-sm text-muted-foreground">
          Confirm who was eliminated.
          {eliminationMethod !== 'vote' && (
            <Badge variant="outline" className="ml-2">{eliminationMethod.replace('_', ' ')}</Badge>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attendeeList.map((c) => (
          <ContestantSelectTile
            key={c.id}
            data-testid={`eliminated-${c.id}`}
            contestant={c}
            isSelected={eliminated === c.id}
            onClick={() => dispatchTribalState({ kind: 'setEliminated', eliminated: c.id })}
            variant="destructive"
            detail={`${voteTallies[c.id] || 0} votes`}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push(backPath)}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => router.push(`${BASE}/extras`)}
          disabled={!eliminated}
        >
          Next: Additional Details
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Extras Step
// ============================================================================

export function ExtrasStep() {
  const router = useRouter()
  const { contestants, tribalState, dispatchTribalState, setFormData } = useSubmitContext()
  const { selectedAttendees, eliminated, idolPlays, sentToJury, eliminationMethod } = tribalState
  const [isSubmitting, setIsSubmitting] = useState(false)

  const attendeeList = useMemo(
    () => contestants.filter((c) => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  const getName = (id: string) => {
    const c = contestants.find((c) => c.id === id)
    return c ? getDisplayName(c) : 'Unknown'
  }

  if (!eliminated) {
    router.push(`${BASE}/elimination`)
    return null
  }

  const addIdolPlay = () => {
    dispatchTribalState({
      kind: 'setIdolPlays',
      idolPlays: [...idolPlays, { playedBy: '', playedFor: '', successful: true }],
    })
  }

  const updateIdolPlay = (index: number, updates: Partial<IdolPlay>) => {
    const next = [...idolPlays]
    next[index] = { ...next[index], ...updates }
    // Default playedFor to playedBy if not set
    if (updates.playedBy && !next[index].playedFor) {
      next[index].playedFor = updates.playedBy
    }
    dispatchTribalState({ kind: 'setIdolPlays', idolPlays: next })
  }

  const removeIdolPlay = (index: number) => {
    dispatchTribalState({
      kind: 'setIdolPlays',
      idolPlays: idolPlays.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    // Build voteRounds from form state
    const voteRounds: VoteRound[] = []

    // Round 0: initial votes (only if we have vote data)
    if (Object.keys(tribalState.votes).length > 0) {
      voteRounds.push({
        votes: tribalState.votes,
        noVote: tribalState.noVote.length > 0 ? tribalState.noVote : undefined,
        extraVotes: tribalState.extraVotes.length > 0 ? tribalState.extraVotes : undefined,
        shotInTheDark: tribalState.shotInTheDark || undefined,
      })
    }

    // Round 1: revote (if applicable)
    if (tribalState.hasRevote && Object.keys(tribalState.revoteVotes).length > 0) {
      voteRounds.push({
        votes: tribalState.revoteVotes,
        extraVotes: tribalState.revoteExtraVotes.length > 0 ? tribalState.revoteExtraVotes : undefined,
        isRevote: true,
        eligibleVoters: tribalState.revoteEligibleVoters,
        eligibleTargets: tribalState.revoteEligibleTargets,
      })
    }

    setFormData({
      attendees: Array.from(selectedAttendees),
      voteRounds,
      eliminated,
      eliminationMethod,
      idolPlays: idolPlays.filter(ip => ip.playedBy), // filter out incomplete entries
      sentToJury,
    })
    router.push(`${BASE}/review`)
  }

  const backPath = eliminationMethod === 'rock_draw' ? `${BASE}/rock-draw` : `${BASE}/elimination`

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Additional Details</h3>
        <p className="text-sm text-muted-foreground">
          {getName(eliminated)} was eliminated
          {eliminationMethod !== 'vote' && ` (${eliminationMethod.replace('_', ' ')})`}. Any extras?
        </p>
      </div>

      {/* Idol Plays */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Idol plays</Label>
            <Button variant="outline" size="sm" onClick={addIdolPlay}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {idolPlays.map((idol, i) => (
            <div key={i} className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Idol Play #{i + 1}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeIdolPlay(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Played by</Label>
                  <Select value={idol.playedBy} onValueChange={(v) => updateIdolPlay(i, { playedBy: v })}>
                    <SelectTrigger><SelectValue placeholder="Who..." /></SelectTrigger>
                    <SelectContent>
                      {attendeeList.map(c => (
                        <SelectItem key={c.id} value={c.id}>{getDisplayName(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Played for</Label>
                  <Select value={idol.playedFor} onValueChange={(v) => updateIdolPlay(i, { playedFor: v })}>
                    <SelectTrigger><SelectValue placeholder="Who..." /></SelectTrigger>
                    <SelectContent>
                      {attendeeList.map(c => (
                        <SelectItem key={c.id} value={c.id}>{getDisplayName(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Successful?</Label>
                <Switch
                  checked={idol.successful}
                  onCheckedChange={(v) => updateIdolPlay(i, { successful: v })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Jury */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="jury" className="text-sm font-medium">
              Sent to the jury?
            </Label>
            <Switch
              id="jury"
              data-testid="switch-jury"
              checked={sentToJury}
              onCheckedChange={(v) => dispatchTribalState({ kind: 'setExtras', sentToJury: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push(backPath)}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Review Events'}
        </Button>
      </div>
    </div>
  )
}
