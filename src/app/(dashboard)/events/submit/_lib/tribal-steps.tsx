'use client'

import { useMemo } from 'react'
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
import { Check, X } from 'lucide-react'
import { ContestantLabel, getDisplayName } from '@/components/shared/contestant-label'
import type { FormContestant } from '@/components/shared/contestant-label'
import { useSubmitContext } from './submit-context'

const BASE = '/events/submit/tribal-council'

// --- Attendees Step ---

export function AttendeesStep() {
  const router = useRouter()
  const { contestants, tribalState, updateTribalState } = useSubmitContext()
  const { selectedAttendees } = tribalState

  const contestantsByTribe = useMemo(() => {
    const active = contestants.filter((c) => !c.isEliminated)
    const grouped: Record<string, FormContestant[]> = {}
    for (const c of active) {
      const tribe = c.tribe || 'No Tribe'
      if (!grouped[tribe]) grouped[tribe] = []
      grouped[tribe].push(c)
    }
    return grouped
  }, [contestants])

  const toggleAttendee = (id: string) => {
    const next = new Set(selectedAttendees)
    if (next.has(id)) {
      next.delete(id)
      const newVotes = { ...tribalState.votes }
      delete newVotes[id]
      updateTribalState({ selectedAttendees: next, votes: newVotes })
    } else {
      next.add(id)
      updateTribalState({ selectedAttendees: next })
    }
  }

  const selectTribe = (tribe: string) => {
    const tribeMembers = contestantsByTribe[tribe] || []
    const allSelected = tribeMembers.every((c) => selectedAttendees.has(c.id))
    const next = new Set(selectedAttendees)
    for (const c of tribeMembers) {
      if (allSelected) next.delete(c.id)
      else next.add(c.id)
    }
    updateTribalState({ selectedAttendees: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Who went to Tribal Council?</h3>
        <p className="text-sm text-muted-foreground">
          Tap a tribe name to select all, or tap individual contestants.
        </p>
      </div>

      {Object.entries(contestantsByTribe).map(([tribe, members]) => {
        const allSelected = members.every((c) => selectedAttendees.has(c.id))
        return (
          <div key={tribe} className="space-y-2">
            <button
              data-testid={`tribe-${tribe.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => selectTribe(tribe)}
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <div
                className={`w-3 h-3 rounded-sm border ${allSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}
              >
                {allSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              {tribe}
            </button>
            <div className="grid grid-cols-2 gap-2">
              {members.map((c) => {
                const isSelected = selectedAttendees.has(c.id)
                return (
                  <button
                    key={c.id}
                    data-testid={`contestant-${c.id}`}
                    aria-selected={isSelected}
                    onClick={() => toggleAttendee(c.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <ContestantLabel contestant={c} />
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

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

// --- Votes Step ---

export function VotesStep() {
  const router = useRouter()
  const { contestants, tribalState, updateTribalState } = useSubmitContext()
  const { selectedAttendees, votes } = tribalState

  const attendeeList = useMemo(
    () => contestants.filter((c) => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  const voteTallies = useMemo(() => {
    const tallies: Record<string, number> = {}
    selectedAttendees.forEach((id) => { tallies[id] = 0 })
    for (const votedFor of Object.values(votes)) {
      if (tallies[votedFor] !== undefined) tallies[votedFor]++
    }
    return tallies
  }, [votes, selectedAttendees])

  const mostVoted = useMemo(() => {
    let maxVotes = 0
    let maxId = ''
    for (const [id, count] of Object.entries(voteTallies)) {
      if (count > maxVotes) { maxVotes = count; maxId = id }
    }
    return maxVotes > 0 ? maxId : ''
  }, [voteTallies])

  const allVotesCast = attendeeList.every((c) => votes[c.id])

  if (selectedAttendees.size < 2) {
    router.push(`${BASE}/attendees`)
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">How did everyone vote?</h3>
        <p className="text-sm text-muted-foreground">Select who each person voted for.</p>
      </div>

      <div className="space-y-3">
        {attendeeList.map((voter) => (
          <Card key={voter.id}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <ContestantLabel contestant={voter} />
              </div>
              <div className="text-xs text-muted-foreground mr-1">voted for</div>
              <Select
                value={votes[voter.id] || ''}
                onValueChange={(value) =>
                  updateTribalState({ votes: { ...votes, [voter.id]: value } })
                }
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
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.values(votes).length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-sm font-medium mb-2">Vote Tally</p>
            <div className="flex flex-wrap gap-2">
              {attendeeList
                .filter((c) => voteTallies[c.id] > 0)
                .sort((a, b) => (voteTallies[b.id] || 0) - (voteTallies[a.id] || 0))
                .map((c) => (
                  <Badge
                    key={c.id}
                    variant={c.id === mostVoted ? 'destructive' : 'secondary'}
                  >
                    {getDisplayName(c)}: {voteTallies[c.id]}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push(`${BASE}/attendees`)}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            if (mostVoted && !tribalState.eliminated) {
              updateTribalState({ eliminated: mostVoted })
            }
            router.push(`${BASE}/elimination`)
          }}
          disabled={!allVotesCast}
        >
          Next: Confirm Elimination
        </Button>
      </div>
    </div>
  )
}

// --- Elimination Step ---

export function EliminationStep() {
  const router = useRouter()
  const { contestants, tribalState, updateTribalState } = useSubmitContext()
  const { selectedAttendees, votes, eliminated } = tribalState

  const attendeeList = useMemo(
    () => contestants.filter((c) => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  const voteTallies = useMemo(() => {
    const tallies: Record<string, number> = {}
    selectedAttendees.forEach((id) => { tallies[id] = 0 })
    for (const votedFor of Object.values(votes)) {
      if (tallies[votedFor] !== undefined) tallies[votedFor]++
    }
    return tallies
  }, [votes, selectedAttendees])

  if (selectedAttendees.size < 2) {
    router.push(`${BASE}/attendees`)
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Who was voted out?</h3>
        <p className="text-sm text-muted-foreground">
          Confirm who was eliminated. Pre-selected based on vote tally.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attendeeList.map((c) => {
          const isSelected = eliminated === c.id
          return (
            <button
              key={c.id}
              data-testid={`eliminated-${c.id}`}
              aria-selected={isSelected}
              onClick={() => updateTribalState({ eliminated: c.id })}
              className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                isSelected
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                  : 'border-muted hover:border-muted-foreground'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-red-500 text-white' : 'bg-muted'
                }`}
              >
                {isSelected && <X className="h-3 w-3" />}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <ContestantLabel contestant={c} />
                <span className="text-xs text-muted-foreground shrink-0">
                  ({voteTallies[c.id] || 0} votes)
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push(`${BASE}/votes`)}>
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

// --- Extras Step ---

export function ExtrasStep() {
  const router = useRouter()
  const { contestants, tribalState, updateTribalState, setFormData } = useSubmitContext()
  const { selectedAttendees, eliminated, idolPlayed, idolPlayedBy, idolSuccessful, sentToJury } = tribalState

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

  const handleSubmit = () => {
    setFormData({
      attendees: Array.from(selectedAttendees),
      votes: tribalState.votes,
      eliminated,
      idolPlayed: idolPlayed ? { by: idolPlayedBy, successful: idolSuccessful } : null,
      sentToJury,
    })
    router.push(`${BASE}/review`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Additional Details</h3>
        <p className="text-sm text-muted-foreground">
          {getName(eliminated)} was voted out. Any extras?
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="idol" className="text-sm font-medium">
              Was an idol played?
            </Label>
            <Switch
              id="idol"
              data-testid="switch-idol"
              checked={idolPlayed}
              onCheckedChange={(v) => updateTribalState({ idolPlayed: v })}
            />
          </div>
          {idolPlayed && (
            <>
              <div>
                <Label className="text-sm text-muted-foreground">Who played it?</Label>
                <Select
                  value={idolPlayedBy}
                  onValueChange={(v) => updateTribalState({ idolPlayedBy: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select contestant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {attendeeList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {getDisplayName(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="idol-success" className="text-sm text-muted-foreground">
                  Was it successful?
                </Label>
                <Switch
                  id="idol-success"
                  data-testid="switch-idol-success"
                  checked={idolSuccessful}
                  onCheckedChange={(v) => updateTribalState({ idolSuccessful: v })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
              onCheckedChange={(v) => updateTribalState({ sentToJury: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => router.push(`${BASE}/elimination`)}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleSubmit}>
          Review Events
        </Button>
      </div>
    </div>
  )
}
