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
import { Check } from 'lucide-react'
import { getDisplayName } from '@/components/shared/contestant-label'
import { ContestantSelectTile } from '@/components/shared/contestant-select-tile'
import { useSubmitContext } from './submit-context'

const BASE = '/events/submit/tribal-council'

// --- Attendees Step ---

export function AttendeesStep() {
  const router = useRouter()
  const { contestants, tribes, tribalState, updateTribalState } = useSubmitContext()
  const { selectedAttendees } = tribalState

  // Which tribe is currently selected (derive from selectedAttendees)
  const selectedTribeId = useMemo(() => {
    if (tribes.length === 0) return null
    for (const tribe of tribes) {
      // If most of this tribe's members are selected, consider it the active tribe
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
    // Select all members of this tribe, clear any previous selection
    const next = new Set(tribe.contestantIds)
    updateTribalState({ selectedAttendees: next, votes: {} })
  }

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

      {/* Tribe members — toggle individuals off/on */}
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
          <div key={voter.id} className="flex rounded-lg border bg-card overflow-hidden">
            {/* Photo slice */}
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
            </div>
          </div>
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
        {attendeeList.map((c) => (
          <ContestantSelectTile
            key={c.id}
            data-testid={`eliminated-${c.id}`}
            contestant={c}
            isSelected={eliminated === c.id}
            onClick={() => updateTribalState({ eliminated: c.id })}
            variant="destructive"
            detail={`${voteTallies[c.id] || 0} votes`}
          />
        ))}
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
