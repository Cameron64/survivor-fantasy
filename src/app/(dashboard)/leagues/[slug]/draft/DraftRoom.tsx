'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DraftBoard } from './DraftBoard'
import { ContestantPicker } from './ContestantPicker'
import { WaitingRoom } from './WaitingRoom'
import type { DraftStatePayload } from '@/lib/draft-types'

interface DraftRoomProps {
  leagueId: string
  leagueName: string
  leagueSlug: string
  currentUserId: string
  isAdmin: boolean
  initialState: DraftStatePayload | null
}

export function DraftRoom({
  leagueId,
  leagueName,
  leagueSlug,
  currentUserId,
  isAdmin,
  initialState,
}: DraftRoomProps) {
  const router = useRouter()
  const [draftState, setDraftState] = useState<DraftStatePayload | null>(initialState)
  const [showComplete, setShowComplete] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // SSE subscription with polling fallback
  useEffect(() => {
    const sseUrl = `/api/draft/stream?leagueId=${encodeURIComponent(leagueId)}`
    const source = new EventSource(sseUrl)

    source.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as DraftStatePayload
        setDraftState(payload)
      } catch {
        // Malformed payload — ignore
      }
    }

    source.onerror = () => {
      // SSE failed — fall back to polling every 3 seconds
      source.close()
      const poll = async () => {
        try {
          const res = await fetch(`/api/draft?leagueId=${encodeURIComponent(leagueId)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.status !== 'not_started') {
              setDraftState(data as DraftStatePayload)
            }
          }
        } catch {
          // Network error — will retry on next interval
        }
      }
      poll()
      pollRef.current = setInterval(poll, 3000)
    }

    return () => {
      source.close()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [leagueId])

  // Handle draft completion redirect
  useEffect(() => {
    if (draftState?.status === 'COMPLETE' && !showComplete) {
      setShowComplete(true)
      setTimeout(() => {
        router.push(`/leagues/${leagueSlug}/leaderboard`)
      }, 4000)
    }
  }, [draftState?.status, showComplete, router, leagueSlug])

  // No draft initialized yet
  if (!draftState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 py-12">
        <h2 className="text-xl font-semibold">Draft Not Set Up</h2>
        <p className="text-muted-foreground text-sm">
          {isAdmin
            ? 'Go to Admin → Draft to initialize the draft order.'
            : 'Waiting for the commissioner to set up the draft.'}
        </p>
      </div>
    )
  }

  // Draft complete celebration
  if (showComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 py-12 text-center">
        <div className="text-6xl">🏆</div>
        <h2 className="text-3xl font-bold">Draft Complete!</h2>
        <p className="text-muted-foreground">
          All picks are in. Redirecting to the leaderboard…
        </p>
        <div className="w-full max-w-lg">
          <DraftBoard state={draftState} currentUserId={currentUserId} />
        </div>
      </div>
    )
  }

  // Waiting room (draft initialized but not yet started)
  if (draftState.status === 'WAITING') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{leagueName} — Draft Room</h1>
        </div>
        <WaitingRoom state={draftState} isAdmin={isAdmin} leagueId={leagueId} />
      </div>
    )
  }

  // Active draft — two-column layout
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{leagueName} — Draft Room</h1>
        <p className="text-sm text-muted-foreground">
          Round {draftState.currentRound} · Pick {draftState.currentPick} of {draftState.totalPicks}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Draft board */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Draft Board
          </h2>
          <DraftBoard state={draftState} currentUserId={currentUserId} />
        </div>

        {/* Right: Contestant picker */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Available Contestants ({draftState.availableContestants.length})
          </h2>
          <ContestantPicker
            state={draftState}
            currentUserId={currentUserId}
            leagueId={leagueId}
            onPickMade={() => {
              // SSE will push the updated state; no manual refetch needed
            }}
          />
        </div>
      </div>
    </div>
  )
}
