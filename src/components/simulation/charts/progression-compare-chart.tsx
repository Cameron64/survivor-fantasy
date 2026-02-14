'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Button } from '@/components/ui/button'
import type { PlayerProfile } from '../player-types'
import { PLAYER_COMPARE_COLORS } from '../compare-metrics'

type Mode = 'best' | 'average' | 'all'

interface ProgressionCompareChartProps {
  players: PlayerProfile[]
  selectedIds: string[]
}

export function ProgressionCompareChart({ players, selectedIds }: ProgressionCompareChartProps) {
  const [mode, setMode] = useState<Mode>('best')

  const selected = useMemo(
    () => selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as PlayerProfile[],
    [players, selectedIds]
  )

  const { chartData, lineKeys } = useMemo(() => {
    const lines: { key: string; color: string; data: Map<number, number> }[] = []

    selected.forEach((player, playerIdx) => {
      const color = PLAYER_COMPARE_COLORS[playerIdx]

      if (mode === 'best') {
        // Highest totalPoints season
        const best = [...player.seasons].sort((a, b) => b.totalPoints - a.totalPoints)[0]
        if (!best) return
        const m = new Map<number, number>()
        let cumulative = 0
        for (const t of best.episodeTrends) {
          cumulative = t.points
          m.set(t.episode, cumulative)
        }
        lines.push({ key: `${player.name}`, color, data: m })
      } else if (mode === 'average') {
        // Mean cumulative at each episode across all seasons
        const maxEp = Math.max(
          ...player.seasons.flatMap((s) => s.episodeTrends.map((t) => t.episode)),
          0
        )
        const m = new Map<number, number>()
        for (let ep = 1; ep <= maxEp; ep++) {
          let sum = 0
          let count = 0
          for (const s of player.seasons) {
            // Find the value at this episode (carry forward)
            const exact = s.episodeTrends.find((t) => t.episode === ep)
            if (exact) {
              sum += exact.points
              count++
            } else {
              const before = s.episodeTrends.filter((t) => t.episode < ep)
              if (before.length > 0) {
                sum += before[before.length - 1].points
                count++
              }
            }
          }
          if (count > 0) m.set(ep, Math.round((sum / count) * 100) / 100)
        }
        lines.push({ key: `${player.name}`, color, data: m })
      } else {
        // All seasons as separate lines
        player.seasons.forEach((s) => {
          const m = new Map<number, number>()
          for (const t of s.episodeTrends) {
            m.set(t.episode, t.points)
          }
          lines.push({
            key: `${player.name} S${s.season}`,
            color,
            data: m,
          })
        })
      }
    })

    // Build chart data: one entry per episode
    const allEpisodes = new Set<number>()
    for (const l of lines) {
      l.data.forEach((_, ep) => allEpisodes.add(ep))
    }
    const sortedEps = Array.from(allEpisodes).sort((a, b) => a - b)

    const chartData = sortedEps.map((ep) => {
      const entry: Record<string, number> = { episode: ep }
      for (const l of lines) {
        const val = l.data.get(ep)
        if (val !== undefined) entry[l.key] = val
      }
      return entry
    })

    return {
      chartData,
      lineKeys: lines.map((l) => ({ key: l.key, color: l.color })),
    }
  }, [selected, mode])

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(['best', 'average', 'all'] as const).map((m) => (
          <Button
            key={m}
            variant={mode === m ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode(m)}
            className={mode === m ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            {m === 'best' ? 'Best Season' : m === 'average' ? 'Average' : 'All Seasons'}
          </Button>
        ))}
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="episode"
              tick={{ fontSize: 11 }}
              label={{ value: 'Episode', position: 'insideBottomRight', offset: -5, fontSize: 12 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{ value: 'Cumulative Points', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip contentStyle={{ fontSize: 12 }} labelFormatter={(label) => `Episode ${label}`} />
            <Legend />
            {lineKeys.map((l) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                stroke={l.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls
                name={l.key}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No episode data available.</p>
      )}
    </div>
  )
}
