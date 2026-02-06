'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Check } from 'lucide-react'
import type { ImmunityChallengeData, RewardChallengeData } from '@/lib/event-derivation'

interface Contestant {
  id: string
  name: string
  tribe: string | null
  isEliminated: boolean
}

interface ImmunityChallengeFormProps {
  contestants: Contestant[]
  onSubmit: (data: ImmunityChallengeData) => void
  onBack: () => void
}

export function ImmunityChallengeForm({
  contestants,
  onSubmit,
  onBack,
}: ImmunityChallengeFormProps) {
  const [winner, setWinner] = useState('')

  const active = useMemo(() => contestants.filter((c) => !c.isEliminated), [contestants])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Who won individual immunity?</h3>
        <p className="text-sm text-muted-foreground">
          Select the challenge winner.
        </p>
      </div>

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
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <div>
                <span className="text-sm font-medium">{c.name}</span>
                {c.tribe && (
                  <span className="text-xs text-muted-foreground ml-1">({c.tribe})</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={() => onSubmit({ winner })} disabled={!winner}>
          Review Events
        </Button>
      </div>
    </div>
  )
}

interface RewardChallengeFormProps {
  contestants: Contestant[]
  onSubmit: (data: RewardChallengeData) => void
  onBack: () => void
}

export function RewardChallengeForm({ contestants, onSubmit, onBack }: RewardChallengeFormProps) {
  const [winners, setWinners] = useState<Set<string>>(new Set())
  const [isTeamChallenge, setIsTeamChallenge] = useState(false)

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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Who won the reward challenge?</h3>
        <p className="text-sm text-muted-foreground">
          Select all winners. Toggle team challenge if applicable.
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
          onCheckedChange={setIsTeamChallenge}
        />
      </div>

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
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <div>
                <span className="text-sm font-medium">{c.name}</span>
                {c.tribe && (
                  <span className="text-xs text-muted-foreground ml-1">({c.tribe})</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => onSubmit({ winners: Array.from(winners), isTeamChallenge })}
          disabled={winners.size === 0}
        >
          Review Events
        </Button>
      </div>
    </div>
  )
}
