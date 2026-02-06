'use client'

import { useState, useMemo } from 'react'
import type { SimEventType } from '@/simulation/engine/types'
import { MultiSeasonSelector } from '@/components/simulation/multi-season-selector'
import { PointOverrideEditor } from '@/components/simulation/point-override-editor'
import { LoadingOverlay } from '@/components/simulation/loading-overlay'
import { EventTrendChart } from '@/components/simulation/charts/event-trend-chart'
import { EventContributionChart } from '@/components/simulation/charts/event-contribution-chart'
import { CastawayValueChart } from '@/components/simulation/charts/castaway-value-chart'
import { CastawayTrendChart } from '@/components/simulation/charts/castaway-trend-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  EVENT_CATEGORIES,
  CATEGORY_COLORS,
  DEFAULT_BASE_POINTS,
} from '@/components/simulation/sim-constants'
import { PlayerSearch } from '@/components/simulation/player-search'
import { PlayerDetail } from '@/components/simulation/player-detail'
import { CategoryCell } from '@/components/simulation/category-cell'
import type { PlayerProfile } from '@/components/simulation/player-types'
import { DatabaseZap, TrendingUp, Trophy, Layers, User, ChevronDown, ChevronRight } from 'lucide-react'

interface SeasonResult {
  season: number
  name: string
  numCastaways: number
  numEpisodes: number
  stats: {
    avgPoints: number
    medianPoints: number
    topPoints: number
    bottomPoints: number
    eventTypeBreakdown: Array<{
      type: SimEventType
      count: number
      totalPoints: number
      percentage: number
    }>
  }
  castaways: Array<{
    id: string
    name: string
    placement: number
    totalPoints: number
    breakdown: Partial<Record<SimEventType, number>>
  }>
  castawayTrends: Array<{ episode: number; [castawayName: string]: number }>
}

interface LeaderboardEntry {
  name: string
  season: number
  seasonName: string
  placement: number
  totalPoints: number
  breakdown: Partial<Record<SimEventType, number>>
}

interface EventTrendEntry {
  season: number
  [category: string]: number
}

interface ExploreResult {
  seasons: SeasonResult[]
  leaderboard: LeaderboardEntry[]
  eventTrends: EventTrendEntry[]
  playerIndex: PlayerProfile[]
}

const CATEGORIES = Object.keys(EVENT_CATEGORIES)

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

export default function ExplorePage() {
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([])
  const [overrides, setOverrides] = useState<Partial<Record<SimEventType, number>>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExploreResult | null>(null)
  const [error, setError] = useState('')
  const [sortColumn, setSortColumn] = useState<string>('totalPoints')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [bestSeasonOnly, setBestSeasonOnly] = useState(false)
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set())
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('trends')
  const effectivePoints = useMemo(
    () => ({ ...DEFAULT_BASE_POINTS, ...overrides }) as Record<SimEventType, number>,
    [overrides]
  )

  async function runExplore() {
    if (selectedSeasons.length === 0) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/simulation/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasons: selectedSeasons.map(Number),
          overrides,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to run exploration')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function toggleSort(column: string) {
    if (sortColumn === column) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortColumn(column)
      setSortDir('desc')
    }
  }

  function sortedLeaderboard(): LeaderboardEntry[] {
    if (!result) return []
    let entries = result.leaderboard
    if (bestSeasonOnly) {
      const bestByName = new Map<string, LeaderboardEntry>()
      for (const entry of entries) {
        const existing = bestByName.get(entry.name)
        if (!existing || entry.totalPoints > existing.totalPoints) {
          bestByName.set(entry.name, entry)
        }
      }
      entries = Array.from(bestByName.values())
    }
    return [...entries].sort((a, b) => {
      let aVal: number, bVal: number
      if (sortColumn === 'totalPoints') {
        aVal = a.totalPoints
        bVal = b.totalPoints
      } else if (sortColumn === 'season') {
        aVal = a.season
        bVal = b.season
      } else {
        // Category sort
        const aCat = aggregateByCategory(a.breakdown)
        const bCat = aggregateByCategory(b.breakdown)
        aVal = aCat[sortColumn] ?? 0
        bVal = bCat[sortColumn] ?? 0
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }

  function toggleSeasonExpand(season: number) {
    setExpandedSeasons((prev) => {
      const next = new Set(prev)
      if (next.has(season)) {
        next.delete(season)
      } else {
        next.add(season)
      }
      return next
    })
  }

  function navigateToPlayer(name: string, season: number) {
    if (!result) return
    // Find by matching castaway_id from the season data, or fall back to name match
    const seasonData = result.seasons.find((s) => s.season === season)
    if (seasonData) {
      const castaway = seasonData.castaways.find((c) => c.name === name)
      if (castaway) {
        const player = result.playerIndex.find((p) => p.id === castaway.id)
        if (player) {
          setSelectedPlayerId(player.id)
          setActiveTab('players')
          return
        }
      }
    }
    // Fallback: match by name
    const player = result.playerIndex.find((p) => p.name === name)
    if (player) {
      setSelectedPlayerId(player.id)
      setActiveTab('players')
    }
  }

  function SortHeader({ column, label }: { column: string; label: string }) {
    const active = sortColumn === column
    return (
      <th
        className="text-right py-2 px-2 cursor-pointer hover:text-teal-600 select-none"
        onClick={() => toggleSort(column)}
      >
        {label}
        {active && <span className="ml-1">{sortDir === 'desc' ? '\u2193' : '\u2191'}</span>}
      </th>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scoring Explorer</h1>
        <p className="text-muted-foreground mt-1">
          Analyze historical scoring data across seasons. See how event types contribute to scores over time.
        </p>
      </div>

      {/* Config area */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
        <MultiSeasonSelector
          value={selectedSeasons}
          onChange={setSelectedSeasons}
          disabled={loading}
        />
        <div className="space-y-4">
          <PointOverrideEditor overrides={overrides} onChange={setOverrides} />
          <Button
            onClick={runExplore}
            disabled={selectedSeasons.length === 0 || loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <DatabaseZap className="h-4 w-4 mr-2" />
            Explore
          </Button>
        </div>
      </div>

      <LoadingOverlay
        isLoading={loading}
        message={`Analyzing ${selectedSeasons.length} season${selectedSeasons.length !== 1 ? 's' : ''}...`}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && !loading && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="trends" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="seasons" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Seasons
            </TabsTrigger>
            <TabsTrigger value="players" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Players
            </TabsTrigger>
          </TabsList>

          {/* TRENDS TAB */}
          <TabsContent value="trends" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Event Category Contribution Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <EventTrendChart data={result.eventTrends} />
              </CardContent>
            </Card>

            {/* Reference table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exact Percentages by Season</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Season</th>
                      {CATEGORIES.map((cat) => (
                        <th key={cat} className="text-right py-2 px-2" style={{ color: CATEGORY_COLORS[cat] }}>
                          {cat}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.eventTrends.map((row) => (
                      <tr key={row.season} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                        <td className="py-1.5 px-2 font-medium">S{row.season}</td>
                        {CATEGORIES.map((cat) => (
                          <td key={cat} className="py-1.5 px-2 text-right">
                            {row[cat]}%
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEADERBOARD TAB */}
          <TabsContent value="leaderboard" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Cross-Season Top Scorers</CardTitle>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bestSeasonOnly}
                      onChange={(e) => setBestSeasonOnly(e.target.checked)}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-muted-foreground">Best season only</span>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 w-10">#</th>
                      <th className="text-left py-2 px-2">Name</th>
                      <SortHeader column="season" label="Season" />
                      <SortHeader column="totalPoints" label="Total" />
                      {CATEGORIES.map((cat) => (
                        <SortHeader key={cat} column={cat} label={cat} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLeaderboard().map((entry, idx) => (
                        <tr key={`${entry.name}-${entry.season}`} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                          <td className="py-1.5 px-2 text-muted-foreground">{idx + 1}</td>
                          <td className="py-1.5 px-2 font-medium">
                            <button
                              className="inline-flex items-center gap-1.5 hover:text-teal-600 hover:underline transition-colors text-left"
                              onClick={() => navigateToPlayer(entry.name, entry.season)}
                            >
                              {entry.name}
                              <PlacementBadge placement={entry.placement} />
                            </button>
                          </td>
                          <td className="py-1.5 px-2 text-right">S{entry.season}</td>
                          <td className="py-1.5 px-2 text-right font-semibold">{entry.totalPoints}</td>
                          {CATEGORIES.map((cat) => (
                            <CategoryCell key={cat} category={cat} breakdown={entry.breakdown} pointValues={effectivePoints} />
                          ))}
                        </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEASONS TAB */}
          <TabsContent value="seasons" className="space-y-4 mt-4">
            {result.seasons.map((s) => {
              const isExpanded = expandedSeasons.has(s.season)
              const topScorer = s.castaways[0]
              return (
                <Card key={s.season}>
                  <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => toggleSeasonExpand(s.season)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <CardTitle className="text-base">
                          Season {s.season}: {s.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{s.numCastaways} castaways</span>
                        <span>Avg: {s.stats.avgPoints} pts</span>
                        {topScorer && (
                          <span className="font-medium text-teal-600">
                            Top: {topScorer.name} ({topScorer.totalPoints})
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="space-y-6">
                      {/* Stats summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
                          <div className="text-lg font-bold text-teal-600">{s.stats.avgPoints}</div>
                          <div className="text-xs text-muted-foreground">Avg Points</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
                          <div className="text-lg font-bold text-teal-600">{s.stats.medianPoints}</div>
                          <div className="text-xs text-muted-foreground">Median Points</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
                          <div className="text-lg font-bold text-teal-600">{s.stats.topPoints}</div>
                          <div className="text-xs text-muted-foreground">Top Points</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
                          <div className="text-lg font-bold text-teal-600">{s.stats.bottomPoints}</div>
                          <div className="text-xs text-muted-foreground">Bottom Points</div>
                        </div>
                      </div>

                      {/* Castaway scoring progression */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Scoring Progression</h4>
                        <CastawayTrendChart
                          data={s.castawayTrends}
                          castaways={s.castaways.map((c) => ({
                            name: c.name,
                            placement: c.placement,
                            totalPoints: c.totalPoints,
                          }))}
                        />
                      </div>

                      {/* Castaway table with placement badges */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Castaways</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1.5 px-2">Name</th>
                                <th className="text-right py-1.5 px-2">Placement</th>
                                <th className="text-right py-1.5 px-2">Points</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.castaways.map((c) => (
                                <tr key={c.id} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                                  <td className="py-1 px-2 font-medium">
                                    <button
                                      className="inline-flex items-center gap-1.5 hover:text-teal-600 hover:underline transition-colors text-left"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigateToPlayer(c.name, s.season)
                                      }}
                                    >
                                      {c.name}
                                      <PlacementBadge placement={c.placement} />
                                    </button>
                                  </td>
                                  <td className="py-1 px-2 text-right text-muted-foreground">{c.placement}</td>
                                  <td className="py-1 px-2 text-right font-semibold">{c.totalPoints}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Event contribution chart */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Event Type Contribution</h4>
                        <EventContributionChart
                          eventContribution={Object.fromEntries(
                            s.stats.eventTypeBreakdown.map((e) => [e.type, e.percentage])
                          )}
                        />
                      </div>

                      {/* Castaway value chart */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Castaway Scores</h4>
                        <CastawayValueChart castaways={s.castaways} />
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </TabsContent>

          {/* PLAYERS TAB */}
          <TabsContent value="players" className="space-y-4 mt-4">
            {selectedPlayerId && result.playerIndex.find((p) => p.id === selectedPlayerId) ? (
              <PlayerDetail
                player={result.playerIndex.find((p) => p.id === selectedPlayerId)!}
                onBack={() => setSelectedPlayerId(null)}
                pointValues={effectivePoints}
              />
            ) : (
              <PlayerSearch
                players={result.playerIndex}
                onSelect={(id) => setSelectedPlayerId(id)}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
