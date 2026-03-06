'use client'

import { useState } from 'react'
import { Trophy, Medal, Award, Skull, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlayerStanding } from './overview-types'

interface StandingsOverviewProps {
  standings: PlayerStanding[]
  currentUserId: string | null
  maxScore: number
  showLastPlace?: boolean
}

function RankIcon({ rank, large }: { rank: number; large?: boolean }) {
  const size = large ? 'h-5 w-5' : 'h-4 w-4'
  if (rank === 1) return <Trophy className={cn(size, 'text-yellow-500')} />
  if (rank === 2) return <Medal className={cn(size, 'text-gray-400')} />
  if (rank === 3) return <Award className={cn(size, 'text-amber-600')} />
  return <span className="text-xs font-bold text-muted-foreground">{rank}</span>
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function Ellipsis() {
  return (
    <div className="flex items-center gap-2 px-2.5 py-0.5">
      <span className="text-[10px] text-muted-foreground mx-auto">...</span>
    </div>
  )
}

function StandingRow({
  player,
  currentUserId,
  maxScore,
  isLastPlace,
  animationDelay,
}: {
  player: PlayerStanding
  currentUserId: string | null
  maxScore: number
  isLastPlace: boolean
  animationDelay: number
}) {
  const barWidth = maxScore > 0 ? (player.totalScore / maxScore) * 100 : 0
  const isCurrentUser = player.userId === currentUserId
  const isTopThree = player.rank <= 3
  const isHighlighted = isTopThree || isLastPlace

  return (
    <div
      key={player.teamId}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 transition-colors animate-row-enter',
        isHighlighted ? 'py-2.5' : 'py-1.5',
        isCurrentUser
          ? 'bg-primary/10 ring-1 ring-primary/30'
          : player.rank === 1
            ? 'bg-yellow-500/10'
            : player.rank === 2
              ? 'bg-gray-400/10'
              : player.rank === 3
                ? 'bg-amber-600/10'
                : isLastPlace
                  ? 'bg-rose-500/10'
                  : 'hover:bg-muted/50',
        player.allEliminated && !isLastPlace && 'opacity-50'
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center justify-center w-7 shrink-0">
        {isLastPlace ? (
          <Skull className="h-5 w-5 text-rose-400" />
        ) : (
          <RankIcon rank={player.rank} large={isTopThree} />
        )}
      </div>

      <span className={cn(
        'truncate shrink-0 w-24 sm:w-32',
        isHighlighted ? 'text-base' : 'text-sm',
        isCurrentUser || isHighlighted ? 'font-semibold' : 'font-medium'
      )}>
        {getFirstName(player.userName)}
      </span>

      {isLastPlace && (
        <span className="text-[10px] font-semibold text-rose-100 bg-rose-500/80 rounded-full px-1.5 py-0.5 shrink-0 whitespace-nowrap">
          Dead Last
        </span>
      )}

      {player.allEliminated && !isLastPlace && (
        <Skull className="h-3 w-3 text-muted-foreground shrink-0" />
      )}

      <div className={cn(
        'flex-1 rounded-full bg-muted overflow-hidden',
        isHighlighted ? 'h-3.5' : 'h-3'
      )}>
        <div
          className={cn(
            'h-full rounded-full animate-bar-fill',
            player.rank === 1
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
              : player.rank === 2
                ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                : player.rank === 3
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                  : isLastPlace
                    ? 'bg-gradient-to-r from-rose-300 to-rose-400'
                    : 'bg-primary/70'
          )}
          style={{
            width: `${barWidth}%`,
            animationDelay: `${animationDelay + 200}ms`,
          }}
        />
      </div>

      <span className={cn(
        'font-bold tabular-nums text-right w-9 shrink-0',
        isHighlighted ? 'text-base' : 'text-sm'
      )}>
        {player.totalScore}
      </span>
    </div>
  )
}

export function StandingsOverview({ standings, currentUserId, maxScore, showLastPlace = false }: StandingsOverviewProps) {
  const [expanded, setExpanded] = useState(false)

  const collapsedCount = 5
  const needsToggle = standings.length > collapsedCount
  const lastPlaceRank = standings.length > 0 ? standings[standings.length - 1].rank : 0
  // Last place only meaningful if it's beyond the top 5 and not a podium rank
  const hasLastPlace = showLastPlace && lastPlaceRank > 3 && standings.length > collapsedCount
  // Find where last-place players start in the array
  const lastPlaceStartIdx = hasLastPlace
    ? standings.findIndex((p) => p.rank === lastPlaceRank)
    : -1
  const lastPlacePlayers = hasLastPlace ? standings.slice(lastPlaceStartIdx) : []

  const currentUserIdx = standings.findIndex((p) => p.userId === currentUserId)
  const currentUserIsInGap = currentUserIdx >= collapsedCount
    && (!hasLastPlace || currentUserIdx < lastPlaceStartIdx)

  const visible = expanded ? standings : standings.slice(0, collapsedCount)

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">Standings</h2>
      <div className="space-y-1">
        {/* Main list: top 5 when collapsed, all when expanded */}
        {visible.map((player, idx) => (
          <StandingRow
            key={player.teamId}
            player={player}
            currentUserId={currentUserId}
            maxScore={maxScore}
            isLastPlace={hasLastPlace && player.rank === lastPlaceRank}
            animationDelay={idx * 80}
          />
        ))}

        {/* Collapsed extras: current user in the gap, then last place */}
        {!expanded && (
          <>
            {/* Current user if they're between top 5 and last place */}
            {currentUserIsInGap && currentUserIdx !== -1 && (
              <>
                <Ellipsis />
                <StandingRow
                  key={standings[currentUserIdx].teamId}
                  player={standings[currentUserIdx]}
                  currentUserId={currentUserId}
                  maxScore={maxScore}
                  isLastPlace={false}
                  animationDelay={(collapsedCount + 1) * 80}
                />
              </>
            )}

            {/* Last place player(s) pinned at the bottom */}
            {hasLastPlace && (
              <>
                <Ellipsis />
                {lastPlacePlayers.map((player, i) => (
                  <StandingRow
                    key={player.teamId}
                    player={player}
                    currentUserId={currentUserId}
                    maxScore={maxScore}
                    isLastPlace
                    animationDelay={(collapsedCount + (currentUserIsInGap ? 2 : 0) + 1 + i) * 80}
                  />
                ))}
              </>
            )}

            {/* Current user outside top 5 when last place is NOT shown (original behavior) */}
            {!hasLastPlace && currentUserIdx >= collapsedCount && currentUserIdx !== -1 && (
              <>
                <Ellipsis />
                <StandingRow
                  key={standings[currentUserIdx].teamId}
                  player={standings[currentUserIdx]}
                  currentUserId={currentUserId}
                  maxScore={maxScore}
                  isLastPlace={false}
                  animationDelay={(collapsedCount + 1) * 80}
                />
              </>
            )}
          </>
        )}
      </div>

      {needsToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1 w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
          {expanded ? 'Show top 5' : `Show all ${standings.length} players`}
        </button>
      )}
    </section>
  )
}
