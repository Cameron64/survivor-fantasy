'use client'

import { useState, useMemo } from 'react'
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
import type { TribalCouncilData } from '@/lib/event-derivation'

interface Contestant {
  id: string
  name: string
  tribe: string | null
  isEliminated: boolean
}

interface TribalCouncilFormProps {
  contestants: Contestant[]
  onSubmit: (data: TribalCouncilData) => void
  onBack: () => void
}

type Step = 'attendees' | 'votes' | 'elimination' | 'extras'

export function TribalCouncilForm({ contestants, onSubmit, onBack }: TribalCouncilFormProps) {
  const [step, setStep] = useState<Step>('attendees')
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set())
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [eliminated, setEliminated] = useState('')
  const [isBlindside, setIsBlindside] = useState(false)
  const [blindsideLeader, setBlindsideLeader] = useState('')
  const [idolPlayed, setIdolPlayed] = useState(false)
  const [idolPlayedBy, setIdolPlayedBy] = useState('')
  const [idolSuccessful, setIdolSuccessful] = useState(true)
  const [sentToJury, setSentToJury] = useState(false)

  // Group contestants by tribe
  const contestantsByTribe = useMemo(() => {
    const active = contestants.filter((c) => !c.isEliminated)
    const grouped: Record<string, Contestant[]> = {}
    for (const c of active) {
      const tribe = c.tribe || 'No Tribe'
      if (!grouped[tribe]) grouped[tribe] = []
      grouped[tribe].push(c)
    }
    return grouped
  }, [contestants])

  const attendeeList = useMemo(
    () => contestants.filter((c) => selectedAttendees.has(c.id)),
    [contestants, selectedAttendees]
  )

  const toggleAttendee = (id: string) => {
    setSelectedAttendees((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // Clean up votes for removed attendee
        const newVotes = { ...votes }
        delete newVotes[id]
        setVotes(newVotes)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectTribe = (tribe: string) => {
    const tribeMembers = contestantsByTribe[tribe] || []
    const allSelected = tribeMembers.every((c) => selectedAttendees.has(c.id))

    setSelectedAttendees((prev) => {
      const next = new Set(prev)
      for (const c of tribeMembers) {
        if (allSelected) {
          next.delete(c.id)
        } else {
          next.add(c.id)
        }
      }
      return next
    })
  }

  // Auto-detect elimination from vote tallies
  const voteTallies = useMemo(() => {
    const tallies: Record<string, number> = {}
    selectedAttendees.forEach((id) => {
      tallies[id] = 0
    })
    for (const votedFor of Object.values(votes)) {
      if (tallies[votedFor] !== undefined) {
        tallies[votedFor]++
      }
    }
    return tallies
  }, [votes, selectedAttendees])

  const mostVoted = useMemo(() => {
    let maxVotes = 0
    let maxId = ''
    for (const [id, count] of Object.entries(voteTallies)) {
      if (count > maxVotes) {
        maxVotes = count
        maxId = id
      }
    }
    return maxVotes > 0 ? maxId : ''
  }, [voteTallies])

  const handleSubmit = () => {
    onSubmit({
      attendees: Array.from(selectedAttendees),
      votes,
      eliminated,
      isBlindside,
      blindsideLeader: isBlindside ? blindsideLeader : undefined,
      idolPlayed: idolPlayed ? { by: idolPlayedBy, successful: idolSuccessful } : null,
      sentToJury,
    })
  }

  const allVotesCast = attendeeList.every((c) => votes[c.id])
  const getName = (id: string) => contestants.find((c) => c.id === id)?.name || 'Unknown'

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2" data-testid="step-indicator">
        {(['attendees', 'votes', 'elimination', 'extras'] as Step[]).map((s, i) => (
          <div
            key={s}
            data-testid={`step-${s}`}
            data-active={(['attendees', 'votes', 'elimination', 'extras'] as Step[]).indexOf(step) >= i}
            className={`flex-1 h-1.5 rounded-full ${
              (['attendees', 'votes', 'elimination', 'extras'] as Step[]).indexOf(step) >= i
                ? 'bg-primary'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step: Attendees */}
      {step === 'attendees' && (
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
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-sm font-medium">{c.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => setStep('votes')}
              disabled={selectedAttendees.size < 2}
            >
              Next: Record Votes ({selectedAttendees.size} attendees)
            </Button>
          </div>
        </div>
      )}

      {/* Step: Votes */}
      {step === 'votes' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">How did everyone vote?</h3>
            <p className="text-sm text-muted-foreground">
              Select who each person voted for.
            </p>
          </div>

          <div className="space-y-3">
            {attendeeList.map((voter) => (
              <Card key={voter.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{voter.name}</p>
                    {voter.tribe && (
                      <p className="text-xs text-muted-foreground">{voter.tribe}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mr-1">voted for</div>
                  <Select
                    value={votes[voter.id] || ''}
                    onValueChange={(value) =>
                      setVotes((prev) => ({ ...prev, [voter.id]: value }))
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
                            {target.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Vote tally summary */}
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
                        {c.name}: {voteTallies[c.id]}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep('attendees')}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                // Auto-set eliminated to most voted
                if (mostVoted && !eliminated) {
                  setEliminated(mostVoted)
                }
                setStep('elimination')
              }}
              disabled={!allVotesCast}
            >
              Next: Confirm Elimination
            </Button>
          </div>
        </div>
      )}

      {/* Step: Elimination */}
      {step === 'elimination' && (
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
                  onClick={() => setEliminated(c.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : 'border-muted hover:border-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-red-500 text-white' : 'bg-muted'
                    }`}
                  >
                    {isSelected && <X className="h-3 w-3" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({voteTallies[c.id] || 0} votes)
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep('votes')}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => setStep('extras')}
              disabled={!eliminated}
            >
              Next: Additional Details
            </Button>
          </div>
        </div>
      )}

      {/* Step: Extras (blindside, idol, jury) */}
      {step === 'extras' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Additional Details</h3>
            <p className="text-sm text-muted-foreground">
              {getName(eliminated)} was voted out. Any extras?
            </p>
          </div>

          {/* Blindside */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="blindside" className="text-sm font-medium">
                  Was this a blindside?
                </Label>
                <Switch
                  id="blindside"
                  data-testid="switch-blindside"
                  checked={isBlindside}
                  onCheckedChange={setIsBlindside}
                />
              </div>
              {isBlindside && (
                <div>
                  <Label className="text-sm text-muted-foreground">Who led it?</Label>
                  <Select value={blindsideLeader} onValueChange={setBlindsideLeader}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select blindside leader..." />
                    </SelectTrigger>
                    <SelectContent>
                      {attendeeList
                        .filter((c) => c.id !== eliminated)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Idol play */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="idol" className="text-sm font-medium">
                  Was an idol played?
                </Label>
                <Switch id="idol" data-testid="switch-idol" checked={idolPlayed} onCheckedChange={setIdolPlayed} />
              </div>
              {idolPlayed && (
                <>
                  <div>
                    <Label className="text-sm text-muted-foreground">Who played it?</Label>
                    <Select value={idolPlayedBy} onValueChange={setIdolPlayedBy}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select contestant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {attendeeList.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
                      onCheckedChange={setIdolSuccessful}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Jury */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="jury" className="text-sm font-medium">
                  Sent to the jury?
                </Label>
                <Switch id="jury" data-testid="switch-jury" checked={sentToJury} onCheckedChange={setSentToJury} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep('elimination')}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isBlindside && !blindsideLeader}
            >
              Review Events
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
