'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import type { ImmunityChallengeData, RewardChallengeData } from '@/lib/event-derivation'
import { ContestantLabel } from '@/components/shared/contestant-label'
import type { FormContestant } from '@/components/shared/contestant-label'

type Contestant = FormContestant

interface TribeGroup {
  id: string
  name: string
  color: string
  buffImage?: string | null
  contestantIds: string[]
  contestantNames: string[]
}

interface ImmunityChallengeFormProps {
  contestants: Contestant[]
  tribes?: TribeGroup[]
  onSubmit: (data: ImmunityChallengeData) => void
  onBack: () => void
}

export function ImmunityChallengeForm({
  contestants,
  tribes = [],
  onSubmit,
  onBack,
}: ImmunityChallengeFormProps) {
  const [winner, setWinner] = useState('')
  const [isTeamChallenge, setIsTeamChallenge] = useState(false)
  const [selectedTribes, setSelectedTribes] = useState<Set<string>>(new Set())
  const [expandedTribes, setExpandedTribes] = useState<Set<string>>(new Set())

  const active = useMemo(() => contestants.filter((c) => !c.isEliminated), [contestants])

  const toggleTribe = (tribe: TribeGroup) => {
    setSelectedTribes((prev) => {
      const next = new Set(prev)
      if (next.has(tribe.id)) next.delete(tribe.id)
      else next.add(tribe.id)
      return next
    })
  }

  const toggleTribeExpanded = (tribeId: string) => {
    setExpandedTribes((prev) => {
      const next = new Set(prev)
      if (next.has(tribeId)) next.delete(tribeId)
      else next.add(tribeId)
      return next
    })
  }

  const handleTeamToggle = (checked: boolean) => {
    setIsTeamChallenge(checked)
    setWinner('')
    setSelectedTribes(new Set())
  }

  const tribeWinnerIds = useMemo(() => {
    const ids = new Set<string>()
    for (const tribe of tribes) {
      if (selectedTribes.has(tribe.id)) {
        for (const cId of tribe.contestantIds) ids.add(cId)
      }
    }
    return ids
  }, [selectedTribes, tribes])

  const canSubmit = isTeamChallenge ? selectedTribes.size > 0 : !!winner

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          {isTeamChallenge ? 'Which tribe won immunity?' : 'Who won individual immunity?'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isTeamChallenge ? 'Select the winning tribe(s).' : 'Select the challenge winner.'}
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border">
        <Label htmlFor="immunity-team-challenge" className="text-sm font-medium">
          Team challenge?
        </Label>
        <Switch
          id="immunity-team-challenge"
          data-testid="switch-immunity-team-challenge"
          checked={isTeamChallenge}
          onCheckedChange={handleTeamToggle}
        />
      </div>

      {isTeamChallenge ? (
        <div className="space-y-2">
          {tribes.map((tribe) => {
            const isSelected = selectedTribes.has(tribe.id)
            const isExpanded = expandedTribes.has(tribe.id)
            return (
              <div key={tribe.id} className="rounded-lg border overflow-hidden">
                <div className="flex items-center">
                  <button
                    data-testid={`immunity-tribe-${tribe.id}`}
                    aria-selected={isSelected}
                    onClick={() => toggleTribe(tribe)}
                    className={`relative flex-1 flex items-center gap-3 p-4 text-left transition-colors overflow-hidden ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
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
                  <button
                    onClick={() => toggleTribeExpanded(tribe.id)}
                    className="p-4 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`${isExpanded ? 'Hide' : 'Show'} ${tribe.name} members`}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t bg-muted/30">
                    <div className="flex flex-wrap gap-1.5">
                      {tribe.contestantNames.map((name) => (
                        <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-background border">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {active.map((c) => {
            const isSelected = winner === c.id
            return (
              <button
                key={c.id}
                data-testid={`winner-${c.id}`}
                aria-selected={isSelected}
                onClick={() => setWinner(c.id)}
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
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            if (isTeamChallenge) {
              const data: ImmunityChallengeData = {
                winners: Array.from(tribeWinnerIds),
                isTeamChallenge: true,
                tribeNames: tribes
                  .filter((t) => selectedTribes.has(t.id))
                  .map((t) => t.name),
              }
              onSubmit(data)
            } else {
              onSubmit({ winner })
            }
          }}
          disabled={!canSubmit}
        >
          Review Events
        </Button>
      </div>
    </div>
  )
}

interface RewardChallengeFormProps {
  contestants: Contestant[]
  tribes?: TribeGroup[]
  onSubmit: (data: RewardChallengeData) => void
  onBack: () => void
}

export function RewardChallengeForm({ contestants, tribes = [], onSubmit, onBack }: RewardChallengeFormProps) {
  const [winners, setWinners] = useState<Set<string>>(new Set())
  const [isTeamChallenge, setIsTeamChallenge] = useState(false)
  const [selectedTribes, setSelectedTribes] = useState<Set<string>>(new Set())
  const [expandedTribes, setExpandedTribes] = useState<Set<string>>(new Set())

  const active = useMemo(() => contestants.filter((c) => !c.isEliminated), [contestants])

  const toggleWinner = (id: string) => {
    setWinners((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleTribe = (tribe: TribeGroup) => {
    setSelectedTribes((prev) => {
      const next = new Set(prev)
      if (next.has(tribe.id)) {
        next.delete(tribe.id)
      } else {
        next.add(tribe.id)
      }
      return next
    })
  }

  const toggleTribeExpanded = (tribeId: string) => {
    setExpandedTribes((prev) => {
      const next = new Set(prev)
      if (next.has(tribeId)) {
        next.delete(tribeId)
      } else {
        next.add(tribeId)
      }
      return next
    })
  }

  // When switching modes, clear selections
  const handleTeamToggle = (checked: boolean) => {
    setIsTeamChallenge(checked)
    setWinners(new Set())
    setSelectedTribes(new Set())
  }

  // Build the winners list from selected tribes
  const tribeWinnerIds = useMemo(() => {
    const ids = new Set<string>()
    for (const tribe of tribes) {
      if (selectedTribes.has(tribe.id)) {
        for (const cId of tribe.contestantIds) ids.add(cId)
      }
    }
    return ids
  }, [selectedTribes, tribes])

  const canSubmit = isTeamChallenge ? selectedTribes.size > 0 : winners.size > 0

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Who won the reward challenge?</h3>
        <p className="text-sm text-muted-foreground">
          {isTeamChallenge ? 'Select the winning tribe.' : 'Select all winners.'}
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border">
        <Label htmlFor="team-challenge" className="text-sm font-medium">
          Team challenge?
        </Label>
        <Switch
          id="team-challenge"
          data-testid="switch-team-challenge"
          checked={isTeamChallenge}
          onCheckedChange={handleTeamToggle}
        />
      </div>

      {isTeamChallenge ? (
        <div className="space-y-2">
          {tribes.map((tribe) => {
            const isSelected = selectedTribes.has(tribe.id)
            const isExpanded = expandedTribes.has(tribe.id)
            return (
              <div key={tribe.id} className="rounded-lg border overflow-hidden">
                <div className="flex items-center">
                  <button
                    data-testid={`tribe-${tribe.id}`}
                    aria-selected={isSelected}
                    onClick={() => toggleTribe(tribe)}
                    className={`relative flex-1 flex items-center gap-3 p-4 text-left transition-colors overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
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
                  <button
                    onClick={() => toggleTribeExpanded(tribe.id)}
                    className="p-4 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`${isExpanded ? 'Hide' : 'Show'} ${tribe.name} members`}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 border-t bg-muted/30">
                    <div className="flex flex-wrap gap-1.5">
                      {tribe.contestantNames.map((name) => (
                        <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-background border">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {active.map((c) => {
            const isSelected = winners.has(c.id)
            return (
              <button
                key={c.id}
                data-testid={`reward-winner-${c.id}`}
                aria-selected={isSelected}
                onClick={() => toggleWinner(c.id)}
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
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            const winnersList = isTeamChallenge ? Array.from(tribeWinnerIds) : Array.from(winners)
            console.log('[RewardChallenge] Submitting winners:', winnersList)
            const data: RewardChallengeData = {
              winners: winnersList,
              isTeamChallenge,
            }
            if (isTeamChallenge) {
              data.tribeNames = tribes
                .filter((t) => selectedTribes.has(t.id))
                .map((t) => t.name)
            }
            console.log('[RewardChallenge] Full data:', data)
            onSubmit(data)
          }}
          disabled={!canSubmit}
        >
          Review Events
        </Button>
      </div>
    </div>
  )
}
