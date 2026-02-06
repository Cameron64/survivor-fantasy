'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search } from 'lucide-react'
import type { PlayerProfile } from './player-types'

const PLACEMENT_EMOJI: Record<number, string> = {
  1: '\u{1F947}',
  2: '\u{1F948}',
  3: '\u{1F949}',
}

interface PlayerSearchProps {
  players: PlayerProfile[]
  onSelect: (playerId: string) => void
}

export function PlayerSearch({ players, onSelect }: PlayerSearchProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return players
    const q = query.toLowerCase()
    return players.filter((p) => p.name.toLowerCase().includes(q))
  }, [players, query])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search players by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No players found matching &ldquo;{query}&rdquo;
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((player) => (
          <Card
            key={player.id}
            className="cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-colors"
            onClick={() => onSelect(player.id)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{player.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {player.seasonsPlayed} season{player.seasonsPlayed !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="font-semibold text-teal-600">{player.careerPoints} pts</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {player.seasons.map((s) => (
                  <span
                    key={s.season}
                    className="inline-flex items-center gap-0.5 rounded bg-muted/50 px-1.5 py-0.5"
                  >
                    S{s.season} - {ordinal(s.placement)}
                    {PLACEMENT_EMOJI[s.placement] ? ` ${PLACEMENT_EMOJI[s.placement]}` : ''}
                    {' '}{s.totalPoints}pts
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
