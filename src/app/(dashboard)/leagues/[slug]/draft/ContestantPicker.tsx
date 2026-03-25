'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AvailableContestant, DraftStatePayload } from '@/lib/draft-types'

interface ContestantPickerProps {
  state: DraftStatePayload
  currentUserId: string
  leagueId: string
  onPickMade: () => void
}

export function ContestantPicker({ state, currentUserId, leagueId, onPickMade }: ContestantPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPicking, setIsPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMyTurn = state.currentUserId === currentUserId && state.status === 'ACTIVE'
  const { availableContestants } = state

  const handleSelect = (contestant: AvailableContestant) => {
    if (!isMyTurn || contestant.isEliminated) return
    setSelectedId((prev) => (prev === contestant.id ? null : contestant.id))
    setError(null)
  }

  const handlePick = async () => {
    if (!selectedId || !isMyTurn || isPicking) return

    setIsPicking(true)
    setError(null)
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pick', contestantId: selectedId, leagueId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to make pick')
      } else {
        setSelectedId(null)
        onPickMade()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsPicking(false)
    }
  }

  const selectedContestant = availableContestants.find((c) => c.id === selectedId)

  // Group by tribe for display
  const grouped = availableContestants.reduce<Record<string, AvailableContestant[]>>(
    (acc, c) => {
      const key = c.tribe ?? 'Unknown'
      acc[key] = acc[key] ?? []
      acc[key].push(c)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-4">
      {/* Status banner */}
      {isMyTurn ? (
        <div className="rounded-lg bg-primary/10 border border-primary px-4 py-3">
          <p className="text-sm font-semibold text-primary">
            Your pick! — Round {state.currentRound}, Pick {state.currentPick} of {state.totalPicks}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click a contestant to select, then confirm your pick.
          </p>
        </div>
      ) : state.status === 'ACTIVE' ? (
        <div className="rounded-lg bg-muted px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Waiting for{' '}
            <span className="font-medium text-foreground">
              {state.draftOrder.find((u) => u.userId === state.currentUserId)?.name ?? 'someone'}
            </span>{' '}
            to pick…
          </p>
        </div>
      ) : null}

      {/* Confirm bar */}
      {selectedContestant && isMyTurn && (
        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
          {selectedContestant.imageUrl && (
            <img
              src={selectedContestant.imageUrl}
              alt={selectedContestant.name}
              className="w-10 h-10 rounded-full object-cover border"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{selectedContestant.name}</p>
            {selectedContestant.tribe && (
              <p className="text-xs text-muted-foreground">{selectedContestant.tribe}</p>
            )}
          </div>
          <Button onClick={handlePick} disabled={isPicking} size="sm">
            {isPicking ? 'Drafting…' : `Draft ${selectedContestant.name.split(' ')[0]}`}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Contestant grid */}
      {Object.entries(grouped).map(([tribe, contestants]) => (
        <div key={tribe}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {tribe}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {contestants.map((c) => {
              const isSelected = c.id === selectedId
              const isElim = c.isEliminated
              const clickable = isMyTurn && !isElim

              return (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  disabled={!clickable}
                  className={`
                    flex items-center gap-2 rounded-lg border p-2 text-left transition-colors text-sm
                    ${isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-background'}
                    ${isElim ? 'opacity-40 cursor-not-allowed' : ''}
                    ${clickable && !isSelected ? 'hover:bg-accent hover:text-accent-foreground cursor-pointer' : ''}
                    ${!clickable && !isElim ? 'cursor-not-allowed opacity-60' : ''}
                  `}
                >
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">
                        {c.name[0]}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate leading-tight">{c.name}</p>
                    {isElim && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">
                        Eliminated
                      </Badge>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {availableContestants.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          All contestants have been drafted.
        </p>
      )}
    </div>
  )
}
