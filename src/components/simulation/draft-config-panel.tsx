'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DraftConfigPanelProps {
  players: number
  picksPerPlayer: number
  maxOwners: number
  onPlayersChange: (v: number) => void
  onPicksChange: (v: number) => void
  onMaxOwnersChange: (v: number) => void
  showSimCount?: boolean
  simCount?: number
  onSimCountChange?: (v: number) => void
}

export function DraftConfigPanel({
  players,
  picksPerPlayer,
  maxOwners,
  onPlayersChange,
  onPicksChange,
  onMaxOwnersChange,
  showSimCount,
  simCount,
  onSimCountChange,
}: DraftConfigPanelProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="space-y-1">
        <Label className="text-xs">Players</Label>
        <Input
          type="number"
          className="w-20 h-8 text-sm"
          min={2}
          max={50}
          value={players}
          onChange={(e) => onPlayersChange(Math.max(2, parseInt(e.target.value, 10) || 2))}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Picks/Player</Label>
        <Input
          type="number"
          className="w-20 h-8 text-sm"
          min={1}
          max={10}
          value={picksPerPlayer}
          onChange={(e) => onPicksChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Max Owners</Label>
        <Input
          type="number"
          className="w-20 h-8 text-sm"
          min={1}
          max={10}
          value={maxOwners}
          onChange={(e) => onMaxOwnersChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
        />
      </div>
      {showSimCount && onSimCountChange && (
        <div className="space-y-1">
          <Label className="text-xs">Simulations</Label>
          <Input
            type="number"
            className="w-24 h-8 text-sm"
            min={100}
            max={10000}
            step={100}
            value={simCount}
            onChange={(e) => onSimCountChange(Math.max(100, parseInt(e.target.value, 10) || 100))}
          />
        </div>
      )}
    </div>
  )
}
