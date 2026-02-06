'use client'

import { useMemo } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trophy } from 'lucide-react'
import {
  EVENT_CATEGORIES,
  CATEGORY_COLORS,
} from '@/components/simulation/sim-constants'
import type { SimEventType } from '@/simulation/engine/types'
import type { PlayerProfile } from './player-types'
import { CategoryCell } from './category-cell'

const LINE_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#6366f1',
  '#0d9488', '#be123c', '#4f46e5', '#ca8a04', '#9333ea',
  '#16a34a', '#e11d48', '#0284c7', '#c026d3', '#78716c',
]

const PLACEMENT_BADGES: Record<number, { label: string; className: string }> = {
  1: { label: '1st', className: 'bg-yellow-400/90 text-yellow-950' },
  2: { label: '2nd', className: 'bg-gray-300/90 text-gray-800' },
  3: { label: '3rd', className: 'bg-amber-600/80 text-amber-50' },
}

function PlacementBadge({ placement }: { placement: number }) {
  const badge = PLACEMENT_BADGES[placement]
  if (!badge) return null
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${badge.className}`}>
      {badge.label}
    </span>
  )
}

function aggregateByCategory(breakdown: Partial<Record<SimEventType, number>>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [category, eventTypes] of Object.entries(EVENT_CATEGORIES)) {
    let sum = 0
    for (const et of eventTypes) {
      sum += breakdown[et] ?? 0
    }
    result[category] = sum
  }
  return result
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

interface PlayerDetailProps {
  player: PlayerProfile
  onBack: () => void
  pointValues: Record<SimEventType, number>
}

export function PlayerDetail({ player, onBack, pointValues }: PlayerDetailProps) {
  const categories = Object.keys(EVENT_CATEGORIES)

  // Build chart data: overlay episode trends from each season appearance
  const chartData = useMemo(() => {
    // Find the max episode count across all appearances
    const maxEp = Math.max(...player.seasons.map((s) =>
      s.episodeTrends.length > 0 ? s.episodeTrends[s.episodeTrends.length - 1].episode : 0
    ))
    if (maxEp === 0) return []

    // Build one data point per episode number
    const data: Array<Record<string, number>> = []
    for (let ep = 1; ep <= maxEp; ep++) {
      const entry: Record<string, number> = { episode: ep }
      for (const s of player.seasons) {
        const key = `S${s.season}`
        const trend = s.episodeTrends.find((t) => t.episode === ep)
        if (trend) {
          entry[key] = trend.points
        } else {
          // Carry forward last known value or skip
          const lastBefore = s.episodeTrends.filter((t) => t.episode < ep)
          if (lastBefore.length > 0) {
            entry[key] = lastBefore[lastBefore.length - 1].points
          }
        }
      }
      data.push(entry)
    }
    return data
  }, [player.seasons])

  const seasonKeys = player.seasons.map((s) => `S${s.season}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            {player.name}
            {player.bestPlacement <= 3 && (
              <PlacementBadge placement={player.bestPlacement} />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
              <div className="text-lg font-bold text-teal-600">{player.careerPoints}</div>
              <div className="text-xs text-muted-foreground">Career Points</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
              <div className="text-lg font-bold text-teal-600">{player.seasonsPlayed}</div>
              <div className="text-xs text-muted-foreground">Seasons Played</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
              <div className="text-lg font-bold text-teal-600">{ordinal(player.bestPlacement)}</div>
              <div className="text-xs text-muted-foreground">Best Placement</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
              <div className="text-lg font-bold text-teal-600">
                {player.seasons.filter((s) => s.isWinner).length}
              </div>
              <div className="text-xs text-muted-foreground">
                <Trophy className="h-3 w-3 inline mr-0.5" />
                Wins
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season overview table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Season Appearances</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Season</th>
                <th className="text-left py-2 px-2">Name</th>
                <th className="text-right py-2 px-2">Placement</th>
                <th className="text-right py-2 px-2">Points</th>
                {categories.map((cat) => (
                  <th key={cat} className="text-right py-2 px-2" style={{ color: CATEGORY_COLORS[cat] }}>
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {player.seasons.map((s) => (
                  <tr key={s.season} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                    <td className="py-1.5 px-2 font-medium">S{s.season}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{s.seasonName}</td>
                    <td className="py-1.5 px-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        {ordinal(s.placement)}
                        <PlacementBadge placement={s.placement} />
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-semibold">{s.totalPoints}</td>
                    {categories.map((cat) => (
                      <CategoryCell key={cat} category={cat} breakdown={s.breakdown} pointValues={pointValues} />
                    ))}
                  </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Season trend chart: one line per season */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scoring Progression Across Seasons</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(label) => `Episode ${label}`}
                />
                <Legend />
                {seasonKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                    name={key}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-season category breakdown bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Points by Category per Season</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {player.seasons.map((s) => {
            const cats = aggregateByCategory(s.breakdown)
            const total = s.totalPoints || 1
            return (
              <div key={s.season} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">S{s.season}</span>
                  <span className="text-muted-foreground">{s.totalPoints} pts</span>
                </div>
                <div className="flex h-4 rounded-full overflow-hidden bg-muted/30">
                  {categories.map((cat) => {
                    const pct = (cats[cat] / total) * 100
                    if (pct <= 0) return null
                    return (
                      <div
                        key={cat}
                        className="h-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[cat],
                        }}
                        title={`${cat}: ${cats[cat]} pts (${Math.round(pct)}%)`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
            {categories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                />
                {cat}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
