'use client'

import { Badge } from '@/components/ui/badge'
import type { DraftStatePayload } from '@/lib/draft-types'

interface DraftBoardProps {
  state: DraftStatePayload
  currentUserId: string
}

export function DraftBoard({ state, currentUserId }: DraftBoardProps) {
  const { draftOrder, currentUserId: onTheClockId, status } = state

  return (
    <div className="space-y-2">
      {draftOrder.map((entry, index) => {
        const isOnClock = entry.userId === onTheClockId && status === 'ACTIVE'
        const isMe = entry.userId === currentUserId

        return (
          <div
            key={entry.userId}
            className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
              isOnClock
                ? 'bg-primary/10 border-2 border-primary animate-pulse'
                : 'bg-muted/40 border border-transparent'
            }`}
          >
            {/* Slot number */}
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-bold shrink-0 mt-0.5">
              {index + 1}
            </div>

            {/* Name + picks */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-medium ${isMe ? 'text-primary' : ''}`}>
                  {entry.name}
                  {isMe && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                </p>
                {isOnClock && (
                  <Badge variant="default" className="text-xs shrink-0">
                    On the clock
                  </Badge>
                )}
              </div>

              {entry.picks.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-1">No picks yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {entry.picks.map((pick, pickIdx) => (
                    <div
                      key={pick.id}
                      className="flex items-center gap-1.5 bg-background rounded px-2 py-1 border text-xs"
                    >
                      {pick.imageUrl && (
                        <img
                          src={pick.imageUrl}
                          alt={pick.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium">{pick.name}</span>
                      {pick.tribe && (
                        <span className="text-muted-foreground">· {pick.tribe}</span>
                      )}
                      <span className="text-muted-foreground text-[10px]">
                        #{pick.globalPickNumber ?? pickIdx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
