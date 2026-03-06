'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  IdolFoundData,
  FireMakingData,
  QuitMedevacData,
  EndgameData,
} from '@/lib/event-derivation'
import { ContestantSelectTile } from '@/components/shared/contestant-select-tile'
import type { FormContestant } from '@/components/shared/contestant-label'

type Contestant = FormContestant

// --- Idol Found ---
interface IdolFoundFormProps {
  contestants: Contestant[]
  onSubmit: (data: IdolFoundData) => void
  onBack: () => void
}

export function IdolFoundForm({ contestants, onSubmit, onBack }: IdolFoundFormProps) {
  const [finder, setFinder] = useState('')
  const active = useMemo(() => contestants.filter((c) => !c.isEliminated), [contestants])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Who found a hidden immunity idol?</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {active.map((c) => (
          <ContestantSelectTile
            key={c.id}
            data-testid={`idol-finder-${c.id}`}
            contestant={c}
            isSelected={finder === c.id}
            onClick={() => setFinder(c.id)}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={() => onSubmit({ finder })} disabled={!finder}>
          Review Events
        </Button>
      </div>
    </div>
  )
}

// --- Fire Making ---
interface FireMakingFormProps {
  contestants: Contestant[]
  onSubmit: (data: FireMakingData) => void
  onBack: () => void
}

export function FireMakingForm({ contestants, onSubmit, onBack }: FireMakingFormProps) {
  const [winner, setWinner] = useState('')
  const [loser, setLoser] = useState('')
  const active = useMemo(() => contestants.filter((c) => !c.isEliminated), [contestants])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Fire Making Challenge</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Winner</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {active.map((c) => (
              <ContestantSelectTile
                key={c.id}
                data-testid={`fire-winner-${c.id}`}
                contestant={c}
                isSelected={winner === c.id}
                onClick={() => {
                  setWinner(c.id)
                  if (loser === c.id) setLoser('')
                }}
                variant="success"
                disabled={c.id === loser}
              />
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Loser</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {active.map((c) => (
              <ContestantSelectTile
                key={c.id}
                data-testid={`fire-loser-${c.id}`}
                contestant={c}
                isSelected={loser === c.id}
                onClick={() => {
                  setLoser(c.id)
                  if (winner === c.id) setWinner('')
                }}
                variant="destructive"
                disabled={c.id === winner}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => onSubmit({ winner, loser })}
          disabled={!winner || !loser}
        >
          Review Events
        </Button>
      </div>
    </div>
  )
}

// --- Quit / Medevac ---
interface QuitMedevacFormProps {
  contestants: Contestant[]
  onSubmit: (data: QuitMedevacData) => void
  onBack: () => void
}

export function QuitMedevacForm({ contestants, onSubmit, onBack }: QuitMedevacFormProps) {
  const [contestant, setContestant] = useState('')
  const [reason, setReason] = useState<'quit' | 'medevac'>('quit')
  const active = useMemo(() => contestants.filter((c) => !c.isEliminated), [contestants])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Quit or Medevac</h3>
      </div>

      <div>
        <Label className="text-sm font-medium">Reason</Label>
        <Select value={reason} onValueChange={(v) => setReason(v as 'quit' | 'medevac')}>
          <SelectTrigger data-testid="quit-reason" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quit">Quit</SelectItem>
            <SelectItem value="medevac">Medical Evacuation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium">Who?</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {active.map((c) => (
            <ContestantSelectTile
              key={c.id}
              data-testid={`quit-contestant-${c.id}`}
              contestant={c}
              isSelected={contestant === c.id}
              onClick={() => setContestant(c.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => onSubmit({ contestant, reason })}
          disabled={!contestant}
        >
          Review Events
        </Button>
      </div>
    </div>
  )
}

// --- Endgame ---
interface EndgameFormProps {
  contestants: Contestant[]
  onSubmit: (data: EndgameData) => void
  onBack: () => void
}

export function EndgameForm({ contestants, onSubmit, onBack }: EndgameFormProps) {
  const [finalists, setFinalists] = useState<Set<string>>(new Set())
  const [winner, setWinner] = useState('')
  const active = useMemo(() => contestants.filter((c) => !c.isEliminated), [contestants])

  const toggleFinalist = (id: string) => {
    setFinalists((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        if (winner === id) setWinner('')
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Final Tribal Council</h3>
        <p className="text-sm text-muted-foreground">
          Select the finalists, then pick the winner.
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">Finalists</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {active.map((c) => (
            <ContestantSelectTile
              key={c.id}
              data-testid={`finalist-${c.id}`}
              contestant={c}
              isSelected={finalists.has(c.id)}
              onClick={() => toggleFinalist(c.id)}
            />
          ))}
        </div>
      </div>

      {finalists.size >= 2 && (
        <div>
          <Label className="text-sm font-medium">Winner</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {active
              .filter((c) => finalists.has(c.id))
              .map((c) => (
                <ContestantSelectTile
                  key={c.id}
                  data-testid={`endgame-winner-${c.id}`}
                  contestant={c}
                  isSelected={winner === c.id}
                  onClick={() => setWinner(c.id)}
                  variant="warning"
                />
              ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => onSubmit({ finalists: Array.from(finalists), winner })}
          disabled={finalists.size < 2 || !winner}
        >
          Review Events
        </Button>
      </div>
    </div>
  )
}
