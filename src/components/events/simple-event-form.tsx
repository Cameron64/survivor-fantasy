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
import { Check } from 'lucide-react'
import type {
  IdolFoundData,
  FireMakingData,
  QuitMedevacData,
  EndgameData,
} from '@/lib/event-derivation'

interface Contestant {
  id: string
  name: string
  tribe: string | null
  isEliminated: boolean
}

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
        {active.map((c) => {
          const isSelected = finder === c.id
          return (
            <button
              key={c.id}
              data-testid={`idol-finder-${c.id}`}
              aria-selected={isSelected}
              onClick={() => setFinder(c.id)}
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
            {active.map((c) => {
              const isSelected = winner === c.id
              return (
                <button
                  key={c.id}
                  data-testid={`fire-winner-${c.id}`}
                  aria-selected={isSelected}
                  onClick={() => {
                    setWinner(c.id)
                    if (loser === c.id) setLoser('')
                  }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : c.id === loser
                        ? 'opacity-40 border-muted'
                        : 'border-muted hover:border-muted-foreground'
                  }`}
                  disabled={c.id === loser}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-green-500 text-white' : 'bg-muted'
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

        <div>
          <Label className="text-sm font-medium">Loser</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {active.map((c) => {
              const isSelected = loser === c.id
              return (
                <button
                  key={c.id}
                  data-testid={`fire-loser-${c.id}`}
                  aria-selected={isSelected}
                  onClick={() => {
                    setLoser(c.id)
                    if (winner === c.id) setWinner('')
                  }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                      : c.id === winner
                        ? 'opacity-40 border-muted'
                        : 'border-muted hover:border-muted-foreground'
                  }`}
                  disabled={c.id === winner}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-red-500 text-white' : 'bg-muted'
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
          {active.map((c) => {
            const isSelected = contestant === c.id
            return (
              <button
                key={c.id}
                data-testid={`quit-contestant-${c.id}`}
                aria-selected={isSelected}
                onClick={() => setContestant(c.id)}
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
          {active.map((c) => {
            const isSelected = finalists.has(c.id)
            return (
              <button
                key={c.id}
                data-testid={`finalist-${c.id}`}
                aria-selected={isSelected}
                onClick={() => toggleFinalist(c.id)}
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

      {finalists.size >= 2 && (
        <div>
          <Label className="text-sm font-medium">Winner</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {active
              .filter((c) => finalists.has(c.id))
              .map((c) => {
                const isSelected = winner === c.id
                return (
                  <button
                    key={c.id}
                    data-testid={`endgame-winner-${c.id}`}
                    aria-selected={isSelected}
                    onClick={() => setWinner(c.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                        : 'border-muted hover:border-muted-foreground'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-yellow-500 text-white' : 'bg-muted'
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
