'use client'

import { useState } from 'react'
import type { SimEventType, MonteCarloResult } from '@/simulation/engine/types'
import { SeasonSelector } from '@/components/simulation/season-selector'
import { PointOverrideEditor } from '@/components/simulation/point-override-editor'
import { DraftConfigPanel } from '@/components/simulation/draft-config-panel'
import { LoadingOverlay } from '@/components/simulation/loading-overlay'
import { ComparisonChart } from '@/components/simulation/charts/comparison-chart'
import { EventContributionChart } from '@/components/simulation/charts/event-contribution-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SIM_DEFAULTS } from '@/components/simulation/sim-constants'
import { GitCompare } from 'lucide-react'

interface CompareResult {
  schemeA: { label: string; result: MonteCarloResult }
  schemeB: { label: string; result: MonteCarloResult }
}

export default function ComparePage() {
  const [season, setSeason] = useState('')
  const [players, setPlayers] = useState(SIM_DEFAULTS.numPlayers)
  const [picksPerPlayer, setPicksPerPlayer] = useState(SIM_DEFAULTS.picksPerPlayer)
  const [maxOwners, setMaxOwners] = useState(SIM_DEFAULTS.maxOwners)
  const [simCount, setSimCount] = useState(SIM_DEFAULTS.numSimulations)

  const [labelA, setLabelA] = useState('Baseline')
  const [overridesA, setOverridesA] = useState<Partial<Record<SimEventType, number>>>({})
  const [labelB, setLabelB] = useState('Modified')
  const [overridesB, setOverridesB] = useState<Partial<Record<SimEventType, number>>>({})

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState('')

  async function runComparison() {
    if (!season) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/simulation/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: parseInt(season, 10),
          sims: simCount,
          players,
          picksPerPlayer,
          maxOwners,
          schemeA: { label: labelA, overrides: overridesA },
          schemeB: { label: labelB, overrides: overridesB },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to run comparison')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const comparisonMetrics = result
    ? [
        { name: 'Gini', valueA: result.schemeA.result.balance.gini, valueB: result.schemeB.result.balance.gini },
        { name: 'Spread', valueA: result.schemeA.result.balance.spread, valueB: result.schemeB.result.balance.spread },
        { name: 'Winner Adv.', valueA: result.schemeA.result.balance.winnerAdvantage, valueB: result.schemeB.result.balance.winnerAdvantage },
        { name: 'Longevity', valueA: result.schemeA.result.balance.longevityCorrelation, valueB: result.schemeB.result.balance.longevityCorrelation },
        { name: 'Mean Score', valueA: result.schemeA.result.scoreDistribution.mean, valueB: result.schemeB.result.scoreDistribution.mean },
        { name: 'Std Dev', valueA: result.schemeA.result.scoreDistribution.stdDev, valueB: result.schemeB.result.scoreDistribution.stdDev },
      ]
    : []

  const detailMetrics = result
    ? [
        { name: 'Gini Coefficient', a: result.schemeA.result.balance.gini, b: result.schemeB.result.balance.gini },
        { name: 'Score Spread', a: result.schemeA.result.balance.spread, b: result.schemeB.result.balance.spread },
        { name: 'Winner Advantage', a: result.schemeA.result.balance.winnerAdvantage, b: result.schemeB.result.balance.winnerAdvantage },
        { name: 'Longevity Corr.', a: result.schemeA.result.balance.longevityCorrelation, b: result.schemeB.result.balance.longevityCorrelation },
        { name: 'Mean Score', a: result.schemeA.result.scoreDistribution.mean, b: result.schemeB.result.scoreDistribution.mean },
        { name: 'Median Score', a: result.schemeA.result.scoreDistribution.median, b: result.schemeB.result.scoreDistribution.median },
        { name: 'Std Deviation', a: result.schemeA.result.scoreDistribution.stdDev, b: result.schemeB.result.scoreDistribution.stdDev },
        { name: 'Score Range', a: result.schemeA.result.scoreDistribution.max - result.schemeA.result.scoreDistribution.min, b: result.schemeB.result.scoreDistribution.max - result.schemeB.result.scoreDistribution.min },
      ]
    : []

  // Generate verdict
  function getVerdict(): string {
    if (!result) return ''
    const a = result.schemeA.result.balance
    const b = result.schemeB.result.balance
    const parts: string[] = []
    if (b.gini < a.gini) parts.push(`${result.schemeB.label} has lower Gini (${b.gini} vs ${a.gini})`)
    else if (a.gini < b.gini) parts.push(`${result.schemeA.label} has lower Gini (${a.gini} vs ${b.gini})`)
    if (b.spread < a.spread) parts.push(`lower spread (${b.spread} vs ${a.spread})`)
    else if (a.spread < b.spread) parts.push(`lower spread (${a.spread} vs ${b.spread})`)
    return parts.length > 0 ? parts.join(', ') + '.' : 'Both schemes show similar balance metrics.'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compare Schemes</h1>
        <p className="text-muted-foreground mt-1">
          Compare two scoring schemes side-by-side with statistical analysis.
        </p>
      </div>

      {/* Config */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <SeasonSelector value={season} onChange={setSeason} />
          <Button onClick={runComparison} disabled={!season || loading} className="bg-teal-600 hover:bg-teal-700">
            <GitCompare className="h-4 w-4 mr-2" />
            Run Comparison
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
      </div>

      {/* Two-column scheme editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Scheme A Label</Label>
            <Input
              value={labelA}
              onChange={(e) => setLabelA(e.target.value)}
              className="h-8"
              placeholder="Scheme A"
            />
          </div>
          <PointOverrideEditor overrides={overridesA} onChange={setOverridesA} />
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Scheme B Label</Label>
            <Input
              value={labelB}
              onChange={(e) => setLabelB(e.target.value)}
              className="h-8"
              placeholder="Scheme B"
            />
          </div>
          <PointOverrideEditor overrides={overridesB} onChange={setOverridesB} />
        </div>
      </div>

      <LoadingOverlay
        isLoading={loading}
        message={`Running ${simCount.toLocaleString()} simulations for each scheme...`}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ComparisonChart
                metrics={comparisonMetrics}
                labelA={result.schemeA.label}
                labelB={result.schemeB.label}
              />
            </CardContent>
          </Card>

          {/* Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Metric</th>
                    <th className="text-right py-2 px-2">{result.schemeA.label}</th>
                    <th className="text-right py-2 px-2">{result.schemeB.label}</th>
                    <th className="text-right py-2 px-2">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {detailMetrics.map((m) => {
                    const delta = Math.round((m.b - m.a) * 10000) / 10000
                    const deltaColor = delta < 0 ? 'text-green-600' : delta > 0 ? 'text-red-600' : ''
                    return (
                      <tr key={m.name} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                        <td className="py-1.5 px-2 font-medium">{m.name}</td>
                        <td className="py-1.5 px-2 text-right">{m.a}</td>
                        <td className="py-1.5 px-2 text-right">{m.b}</td>
                        <td className={`py-1.5 px-2 text-right font-medium ${deltaColor}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Side-by-side Event Contribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{result.schemeA.label} - Events</CardTitle>
              </CardHeader>
              <CardContent>
                <EventContributionChart eventContribution={result.schemeA.result.balance.eventContribution} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{result.schemeB.label} - Events</CardTitle>
              </CardHeader>
              <CardContent>
                <EventContributionChart eventContribution={result.schemeB.result.balance.eventContribution} />
              </CardContent>
            </Card>
          </div>

          {/* Verdict */}
          <Card className="border-teal-200 bg-teal-50/30">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-medium text-teal-800 dark:text-teal-200">
                {getVerdict()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
