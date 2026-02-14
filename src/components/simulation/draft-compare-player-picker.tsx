'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, X } from 'lucide-react'
import type { PlayerProfile } from './player-types'
import { PLAYER_COMPARE_COLORS } from './compare-metrics'

const MAX_PLAYERS = 4

interface DraftComparePlayerPickerProps {
  players: PlayerProfile[]
  selectedIds: string[]
  onToggle: (playerId: string) => void
}

export function DraftComparePlayerPicker({
  players,
  selectedIds,
  onToggle,
}: DraftComparePlayerPickerProps) {
  const [query, setQuery] = useState('')

  const selectedPlayers = useMemo(
    () => selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as PlayerProfile[],
    [players, selectedIds]
  )

  const filtered = useMemo(() => {
    const unselected = players.filter((p) => !selectedIds.includes(p.id))
    if (!query.trim()) return unselected
    const q = query.toLowerCase()
    return unselected.filter((p) => p.name.toLowerCase().includes(q))
  }, [players, selectedIds, query])

  return (
    <div className="space-y-3">
      {/* Selected player chips */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedPlayers.map((player, i) => (
          <button
            key={player.id}
            onClick={() => onToggle(player.id)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white transition-colors hover:opacity-80"
            style={{ backgroundColor: PLAYER_COMPARE_COLORS[i] }}
          >
            {player.name}
            <X className="h-3.5 w-3.5" />
          </button>
        ))}
        {selectedIds.length < 2 && (
          <span className="text-sm text-muted-foreground self-center">
            Select {2 - selectedIds.length} more player{selectedIds.length === 0 ? 's' : ''} to compare
          </span>
        )}
      </div>

      {/* Search */}
      {selectedIds.length < MAX_PLAYERS && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players to add..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {filtered.length === 0 && query.trim() && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No players found matching &ldquo;{query}&rdquo;
              </p>
            )}
            {filtered.slice(0, 20).map((player) => (
              <Card
                key={player.id}
                className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-colors"
                onClick={() => onToggle(player.id)}
              >
                <CardContent className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{player.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {player.seasonsPlayed} season{player.seasonsPlayed !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">{player.careerPoints} pts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
