'use client'

import { useState } from 'react'
import type { SimEventType, MonteCarloResult } from '@/simulation/engine/types'
import { SeasonSelector } from '@/components/simulation/season-selector'
import { PointOverrideEditor } from '@/components/simulation/point-override-editor'
import { DraftConfigPanel } from '@/components/simulation/draft-config-panel'
import { LoadingOverlay } from '@/components/simulation/loading-overlay'
import { ScoreDistributionChart } from '@/components/simulation/charts/score-distribution-chart'
import { EventContributionChart } from '@/components/simulation/charts/event-contribution-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SIM_DEFAULTS,
  getThresholdColor,
  getThresholdBg,
} from '@/components/simulation/sim-constants'
import { BarChart3 } from 'lucide-react'

interface HistogramBin {
  binStart: number
  binEnd: number
  count: number
}

interface BatchResult {
  results: MonteCarloResult[]
  scoreHistogram: HistogramBin[]
  crossSeason?: {
    avgGini: number
    avgSpread: number
    avgLongevity: number
  }
}

export default function BatchPage() {
  const [season, setSeason] = useState('')
  const [players, setPlayers] = useState(SIM_DEFAULTS.numPlayers)
  const [picksPerPlayer, setPicksPerPlayer] = useState(SIM_DEFAULTS.picksPerPlayer)
  const [maxOwners, setMaxOwners] = useState(SIM_DEFAULTS.maxOwners)
  const [simCount, setSimCount] = useState(SIM_DEFAULTS.numSimulations)
  const [overrides, setOverrides] = useState<Partial<Record<SimEventType, number>>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BatchResult | null>(null)
  const [error, setError] = useState('')
  const [activeSeasonIdx, setActiveSeasonIdx] = useState(0)

  async function runBatch() {
    if (!season) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/simulation/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: season === 'all' ? 'all' : parseInt(season, 10),
          sims: simCount,
          players,
          picksPerPlayer,
          maxOwners,
          overrides,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to run batch analysis')
      }
      setResult(await res.json())
      setActiveSeasonIdx(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const isMultiSeason = result && result.results.length > 1
  const currentResult = result?.results[activeSeasonIdx]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Batch Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Run Monte Carlo simulations and analyze scoring balance metrics.
        </p>
      </div>

      {/* Config */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <SeasonSelector value={season} onChange={setSeason} allowAll />
          <Button onClick={runBatch} disabled={!season || loading} className="bg-teal-600 hover:bg-teal-700">
            <BarChart3 className="h-4 w-4 mr-2" />
            Run Analysis
          </Button>
        </div>
        <DraftConfigPanel
          players={players}
          picksPerPlayer={picksPerPlayer}
          maxOwners={maxOwners}
          onPlayersChange={setPlayers}
          onPicksChange={setPicksPerPlayer}
          onMaxOwnersChange={setMaxOwners}
          showSimCount
          simCount={simCount}
          onSimCountChange={setSimCount}
        />
        <PointOverrideEditor overrides={overrides} onChange={setOverrides} />
      </div>

      <LoadingOverlay
        isLoading={loading}
        message={`Running ${simCount.toLocaleString()} simulations${season === 'all' ? ' across all seasons' : ''}...`}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Cross-season summary */}
          {isMultiSeason && result.crossSeason && (
            <Card className="border-teal-200 bg-teal-50/30">
              <CardHeader>
                <CardTitle className="text-base">Cross-Season Summary ({result.results.length} seasons)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Gini</div>
                    <div className={`text-lg font-bold ${getThresholdColor('gini', result.crossSeason.avgGini)}`}>
                      {result.crossSeason.avgGini}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Spread</div>
                    <div className={`text-lg font-bold ${getThresholdColor('spread', result.crossSeason.avgSpread)}`}>
                      {result.crossSeason.avgSpread}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Longevity</div>
                    <div className={`text-lg font-bold ${getThresholdColor('longevityCorrelation', result.crossSeason.avgLongevity)}`}>
                      {result.crossSeason.avgLongevity}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Season selector for multi-season */}
          {isMultiSeason && (
            <div className="flex flex-wrap gap-2">
              {result.results.map((r, i) => (
                <Button
                  key={i}
                  variant={activeSeasonIdx === i ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveSeasonIdx(i)}
                  className={activeSeasonIdx === i ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  S{r.season}
                </Button>
              ))}
            </div>
          )}

          {currentResult && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Mean" value={currentResult.scoreDistribution.mean} />
                <StatCard label="Median" value={currentResult.scoreDistribution.median} />
                <StatCard label="Std Dev" value={currentResult.scoreDistribution.stdDev} />
                <StatCard
                  label="Range"
                  value={`${currentResult.scoreDistribution.min} - ${currentResult.scoreDistribution.max}`}
                />
              </div>

              {/* Balance metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <BalanceCard
                  label="Gini Coefficient"
                  value={currentResult.balance.gini}
                  metric="gini"
                  description="0 = equal, 1 = unequal"
                />
                <BalanceCard
                  label="Score Spread"
                  value={currentResult.balance.spread}
                  metric="spread"
                  description="Max - min team score"
                />
                <BalanceCard
                  label="Winner Advantage"
                  value={currentResult.balance.winnerAdvantage}
                  metric="winnerAdvantage"
                  description="Winner pts above mean"
                />
                <BalanceCard
                  label="Longevity Corr."
                  value={currentResult.balance.longevityCorrelation}
                  metric="longevityCorrelation"
                  description="Placement vs points"
                />
              </div>

              {/* Score Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScoreDistributionChart
                    histogram={result.scoreHistogram}
                    scoreDistribution={currentResult.scoreDistribution}
                  />
                </CardContent>
              </Card>

              {/* Event Contribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Event Type Contribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <EventContributionChart eventContribution={currentResult.balance.eventContribution} />
                </CardContent>
              </Card>

              {/* Top Castaways */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Castaways</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">#</th>
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-right py-2 px-2">Points</th>
                        <th className="text-right py-2 px-2">Avg Rank</th>
                        <th className="text-right py-2 px-2">Draft Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentResult.castawayStats.slice(0, 20).map((c, i) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                          <td className="py-1.5 px-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-1.5 px-2 font-medium">{c.name}</td>
                          <td className="py-1.5 px-2 text-right">{c.totalPoints}</td>
                          <td className="py-1.5 px-2 text-right">{c.avgTeamRank}</td>
                          <td className="py-1.5 px-2 text-right">{(c.draftRate * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 text-center">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  )
}

function BalanceCard({
  label,
  value,
  metric,
  description,
}: {
  label: string
  value: number
  metric: 'gini' | 'spread' | 'winnerAdvantage' | 'longevityCorrelation'
  description: string
}) {
  return (
    <Card className={`border ${getThresholdBg(metric, value)}`}>
      <CardContent className="pt-4 pb-4 text-center">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl font-bold mt-1 ${getThresholdColor(metric, value)}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      </CardContent>
    </Card>
  )
}
