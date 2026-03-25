'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Users } from 'lucide-react'
import type { DraftStatePayload } from '@/lib/draft-types'

interface WaitingRoomProps {
  state: DraftStatePayload
  isAdmin: boolean
  leagueId: string
}

export function WaitingRoom({ state, isAdmin, leagueId }: WaitingRoomProps) {
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    setIsStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', leagueId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to start draft')
      }
      // SSE broadcast will update state automatically
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 py-12">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Draft Lobby</h2>
        <p className="text-muted-foreground">
          {isAdmin
            ? 'Review the draft order below, then start when everyone is ready.'
            : 'Waiting for the draft to begin…'}
        </p>
      </div>

      {/* Draft order preview */}
      <div className="w-full max-w-sm space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Draft Order ({state.draftOrder.length} participants)</p>
        </div>
        {state.draftOrder.map((entry, index) => (
          <div
            key={entry.userId}
            className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
          >
            <span className="text-sm font-mono text-muted-foreground w-5 text-right">
              {index + 1}.
            </span>
            <p className="text-sm font-medium flex-1">{entry.name}</p>
            {index === state.draftOrder.length - 1 && (
              <Badge variant="secondary" className="text-xs">Last</Badge>
            )}
            {index === 0 && (
              <Badge variant="outline" className="text-xs">First</Badge>
            )}
          </div>
        ))}
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          Snake draft · {state.picksPerUser} picks per player · {state.totalPicks} total picks
        </p>
        {state.pickTimeoutSecs && (
          <p className="text-xs text-muted-foreground">
            {state.pickTimeoutSecs}s pick timer
          </p>
        )}
      </div>

      {isAdmin && (
        <div className="space-y-2 text-center">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleStart} disabled={isStarting} size="lg">
            {isStarting ? 'Starting…' : 'Start Draft'}
          </Button>
        </div>
      )}
    </div>
  )
}
