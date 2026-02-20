'use client'

import { useState, useMemo, useCallback } from 'react'
import type { SimEventType } from '@/simulation/engine/types'
import { MultiSeasonSelector } from '@/components/simulation/multi-season-selector'
import { LoadingOverlay } from '@/components/simulation/loading-overlay'
import { DraftComparePlayerPicker } from '@/components/simulation/draft-compare-player-picker'
import { RadarCompareChart } from '@/components/simulation/charts/radar-compare-chart'
import { ProgressionCompareChart } from '@/components/simulation/charts/progression-compare-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  EVENT_CATEGORIES,
  CATEGORY_COLORS,
  DEFAULT_BASE_POINTS,
} from '@/components/simulation/sim-constants'
import {
  computeCompareMetrics,
  normalizeRadarData,
  PLAYER_COMPARE_COLORS,
} from '@/components/simulation/compare-metrics'
import type { CompareMetrics } from '@/components/simulation/compare-metrics'
import type { PlayerProfile } from '@/components/simulation/player-types'
import { DatabaseZap, BarChart3, TrendingUp, Layers, TableProperties } from 'lucide-react'

interface ExploreResult {
  playerIndex: PlayerProfile[]
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function fmtRate(val: number | null): string {
  if (val === null) return 'N/A'
  return (val * 100).toFixed(0) + '%'
}

function fmtNum(val: number | null, decimals = 1): string {
  if (val === null) return 'N/A'
  return val.toFixed(decimals)
}

export default function DraftComparePage() {
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExploreResult | null>(null)
  const [error, setError] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])

  const pointValues = DEFAULT_BASE_POINTS as Record<SimEventType, number>

  async function loadData() {
    if (selectedSeasons.length === 0) return
    setLoading(true)
    setError('')
    setSelectedPlayerIds([])
    try {
      const res = await fetch('/api/simulation/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasons: selectedSeasons.map(Number), overrides: {} }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load data')
      }
      const data = await res.json()
      setResult({ playerIndex: data.playerIndex })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const togglePlayer = useCallback((id: string) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }, [])

  const selectedPlayers = useMemo(
    () =>
      selectedPlayerIds
        .map((id) => result?.playerIndex.find((p) => p.id === id))
        .filter(Boolean) as PlayerProfile[],
    [result, selectedPlayerIds]
  )

  const allMetrics = useMemo(
    () => selectedPlayers.map((p) => computeCompareMetrics(p, pointValues)),
    [selectedPlayers, pointValues]
  )

  const radarData = useMemo(() => normalizeRadarData(allMetrics), [allMetrics])

  const hasComparison = selectedPlayerIds.length >= 2

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Draft Compare</h1>
        <p className="text-muted-foreground mt-1">
          Compare 2-4 castaways side-by-side to evaluate draft value using historical simulation data.
        </p>
      </div>

      {/* Season selector + load */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <MultiSeasonSelector
          value={selectedSeasons}
          onChange={setSelectedSeasons}
          disabled={loading}
        />
        <Button
          onClick={loadData}
          disabled={selectedSeasons.length === 0 || loading}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <DatabaseZap className="h-4 w-4 mr-2" />
          Load Data
        </Button>
      </div>

      <LoadingOverlay
        isLoading={loading}
        message={`Loading ${selectedSeasons.length} season${selectedSeasons.length !== 1 ? 's' : ''}...`}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Player picker */}
      {result && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Players</CardTitle>
          </CardHeader>
          <CardContent>
            <DraftComparePlayerPicker
              players={result.playerIndex}
              selectedIds={selectedPlayerIds}
              onToggle={togglePlayer}
            />
          </CardContent>
        </Card>
      )}

      {/* Comparison tabs */}
      {hasComparison && (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="progression" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Progression
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="head-to-head" className="gap-1.5">
              <TableProperties className="h-3.5 w-3.5" />
              Head-to-Head
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {allMetrics.map((m, i) => (
                <Card key={m.id}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: PLAYER_COMPARE_COLORS[i] }}
                      />
                      <span className="font-semibold text-sm truncate">{m.name}</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <StatRow label="Career Pts" value={`${m.careerPoints}`} />
                      <StatRow label="Avg Placement" value={fmtNum(m.avgPlacement)} />
                      <StatRow label="PPE" value={fmtNum(m.pointsPerEpisode)} />
                      <StatRow label="Challenge Win %" value={fmtRate(m.challengeWinRate)} />
                      <StatRow label="Voting Accuracy" value={fmtRate(m.votingAccuracy)} />
                      <StatRow label="Jury Rate" value={fmtRate(m.juryMakeRate)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Radar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Player Profile Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <RadarCompareChart data={radarData} metrics={allMetrics} />
              </CardContent>
            </Card>

            {/* Key metrics table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <MetricsTable metrics={allMetrics} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROGRESSION TAB */}
          <TabsContent value="progression" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scoring Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressionCompareChart
                  players={result!.playerIndex}
                  selectedIds={selectedPlayerIds}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* BREAKDOWN TAB */}
          <TabsContent value="breakdown" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allMetrics.map((m, i) => {
                  const total = m.careerPoints || 1
                  return (
                    <div key={m.id} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PLAYER_COMPARE_COLORS[i] }}
                        />
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted-foreground ml-auto">{m.careerPoints} pts</span>
                      </div>
                      <div className="flex h-5 rounded-full overflow-hidden bg-muted/30">
                        {Object.keys(EVENT_CATEGORIES).map((cat) => {
                          const pct = (m.categoryBreakdown[cat] / total) * 100
                          if (pct <= 0) return null
                          return (
                            <div
                              key={cat}
                              className="h-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: CATEGORY_COLORS[cat],
                              }}
                              title={`${cat}: ${m.categoryBreakdown[cat]} pts (${Math.round(pct)}%)`}
                            />
                          )
                        })}
                      </div>
                      {/* Percentage labels */}
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        {Object.keys(EVENT_CATEGORIES).map((cat) => {
                          const pct = m.categoryPercentages[cat]
                          if (!pct) return null
                          return (
                            <span key={cat} className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-2 h-2 rounded-sm"
                                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                              />
                              {cat} {pct}%
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {/* Shared legend */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t">
                  {Object.keys(EVENT_CATEGORIES).map((cat) => (
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
          </TabsContent>

          {/* HEAD-TO-HEAD TAB */}
          <TabsContent value="head-to-head" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Full Comparison</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <HeadToHeadTable
                  metrics={allMetrics}
                  players={selectedPlayers}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function MetricsTable({ metrics }: { metrics: CompareMetrics[] }) {
  const rows: { label: string; getValue: (m: CompareMetrics) => string; highlight?: 'high' | 'low' }[] = [
    { label: 'Career Points', getValue: (m) => `${m.careerPoints}`, highlight: 'high' },
    { label: 'Avg Placement', getValue: (m) => fmtNum(m.avgPlacement), highlight: 'low' },
    { label: 'Points Per Episode', getValue: (m) => fmtNum(m.pointsPerEpisode), highlight: 'high' },
    { label: 'Challenge Win Rate', getValue: (m) => fmtRate(m.challengeWinRate), highlight: 'high' },
    { label: 'Immunity Wins', getValue: (m) => `${m.immunityWins}`, highlight: 'high' },
    { label: 'Idol Find Rate', getValue: (m) => fmtRate(m.idolFindRate), highlight: 'high' },
    { label: 'Voting Accuracy', getValue: (m) => fmtRate(m.votingAccuracy), highlight: 'high' },
    { label: 'Survival Stealth', getValue: (m) => fmtRate(m.survivalStealth), highlight: 'high' },
    { label: 'Threat Level', getValue: (m) => fmtRate(m.threatLevel), highlight: 'low' },
    { label: 'Jury Make Rate', getValue: (m) => fmtRate(m.juryMakeRate), highlight: 'high' },
    { label: 'Finalist Rate', getValue: (m) => fmtRate(m.finalistRate), highlight: 'high' },
  ]

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2 px-2">Metric</th>
          {metrics.map((m, i) => (
            <th key={m.id} className="text-right py-2 px-2">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: PLAYER_COMPARE_COLORS[i] }}
                />
                {m.name}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          // Find best value for highlighting
          const values = metrics.map((m) => {
            const raw = row.getValue(m)
            return raw === 'N/A' ? null : parseFloat(raw.replace('%', ''))
          })
          const validValues = values.filter((v): v is number => v !== null)
          const bestVal =
            validValues.length > 0
              ? row.highlight === 'low'
                ? Math.min(...validValues)
                : Math.max(...validValues)
              : null

          return (
            <tr key={row.label} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
              <td className="py-1.5 px-2 text-muted-foreground">{row.label}</td>
              {metrics.map((m, _i) => {
                const display = row.getValue(m)
                const numVal = display === 'N/A' ? null : parseFloat(display.replace('%', ''))
                const isBest = numVal !== null && numVal === bestVal && validValues.length > 1
                return (
                  <td
                    key={m.id}
                    className={`py-1.5 px-2 text-right ${isBest ? 'font-bold text-teal-600' : ''}`}
                  >
                    {display}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function HeadToHeadTable({
  metrics,
  players,
}: {
  metrics: CompareMetrics[]
  players: PlayerProfile[]
}) {
  const sections: {
    title: string
    rows: { label: string; getValue: (m: CompareMetrics) => string }[]
  }[] = [
    {
      title: 'Core',
      rows: [
        { label: 'Career Points', getValue: (m) => `${m.careerPoints}` },
        { label: 'Seasons Played', getValue: (m) => `${m.seasonsPlayed}` },
        { label: 'Avg Placement', getValue: (m) => fmtNum(m.avgPlacement) },
        { label: 'Total Episodes', getValue: (m) => `${m.totalEpisodes}` },
        { label: 'Points Per Episode', getValue: (m) => fmtNum(m.pointsPerEpisode) },
      ],
    },
    {
      title: 'Challenges',
      rows: [
        { label: 'Individual Immunity Wins', getValue: (m) => `${m.immunityWins}` },
        { label: 'All Challenge Wins', getValue: (m) => `${m.allChallengeWins}` },
        { label: 'Immunity Win Rate', getValue: (m) => fmtRate(m.immunityWinRate) },
        { label: 'Challenge Win Rate', getValue: (m) => fmtRate(m.challengeWinRate) },
      ],
    },
    {
      title: 'Idols & Advantages',
      rows: [
        { label: 'Idol Finds', getValue: (m) => `${m.idolFinds}` },
        { label: 'Idol Find Rate', getValue: (m) => fmtRate(m.idolFindRate) },
        { label: 'Successful Idol Plays', getValue: (m) => `${m.idolPlaysSuccess}` },
      ],
    },
    {
      title: 'Tribal Council',
      rows: [
        { label: 'Correct Votes', getValue: (m) => `${m.correctVotes}` },
        { label: 'Tribals Survived', getValue: (m) => `${m.tribalsSurvived}` },
        { label: 'Voting Accuracy', getValue: (m) => fmtRate(m.votingAccuracy) },
        { label: 'Zero Votes Received', getValue: (m) => `${m.zeroVotesReceived}` },
        { label: 'Survival Stealth', getValue: (m) => fmtRate(m.survivalStealth) },
        { label: 'Survived With Votes', getValue: (m) => `${m.survivedWithVotes}` },
        { label: 'Threat Level', getValue: (m) => fmtRate(m.threatLevel) },
      ],
    },
    {
      title: 'Endgame',
      rows: [
        { label: 'Made Jury', getValue: (m) => `${m.seasonsMadeJury}/${m.seasonsPlayed}` },
        { label: 'Jury Make Rate', getValue: (m) => fmtRate(m.juryMakeRate) },
        { label: 'Finalist', getValue: (m) => `${m.finalistSeasons}/${m.seasonsPlayed}` },
        { label: 'Finalist Rate', getValue: (m) => fmtRate(m.finalistRate) },
        { label: 'Wins', getValue: (m) => `${m.winnerSeasons}` },
      ],
    },
  ]

  // Per-season rows
  const maxSeasons = Math.max(...players.map((p) => p.seasons.length))

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2 px-2 w-40">Metric</th>
          {metrics.map((m, i) => (
            <th key={m.id} className="text-right py-2 px-2">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: PLAYER_COMPARE_COLORS[i] }}
                />
                {m.name}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sections.map((section) => (
          <SectionGroup key={section.title}>
            <tr>
              <td
                colSpan={metrics.length + 1}
                className="py-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30"
              >
                {section.title}
              </td>
            </tr>
            {section.rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                <td className="py-1.5 px-2">{row.label}</td>
                {metrics.map((m) => (
                  <td key={m.id} className="py-1.5 px-2 text-right font-medium">
                    {row.getValue(m)}
                  </td>
                ))}
              </tr>
            ))}
          </SectionGroup>
        ))}

        {/* Per-season appearances */}
        <tr>
          <td
            colSpan={metrics.length + 1}
            className="py-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30"
          >
            Season Appearances
          </td>
        </tr>
        {Array.from({ length: maxSeasons }, (_, si) => (
          <tr key={si} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
            <td className="py-1.5 px-2 text-muted-foreground">Season {si + 1}</td>
            {players.map((p, _pi) => {
              const s = p.seasons[si]
              if (!s) return <td key={p.id} className="py-1.5 px-2 text-right text-muted-foreground">-</td>
              return (
                <td key={p.id} className="py-1.5 px-2 text-right">
                  <span className="text-xs">
                    S{s.season} {ordinal(s.placement)} &middot; {s.totalPoints}pts
                  </span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SectionGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
