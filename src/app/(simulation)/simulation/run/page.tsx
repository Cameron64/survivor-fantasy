'use client'

import { useState } from 'react'
import type { SimEventType, SimulationResult } from '@/simulation/engine/types'
import { SeasonSelector } from '@/components/simulation/season-selector'
import { PointOverrideEditor } from '@/components/simulation/point-override-editor'
import { DraftConfigPanel } from '@/components/simulation/draft-config-panel'
import { LoadingOverlay } from '@/components/simulation/loading-overlay'
import { EpisodeScoreChart } from '@/components/simulation/charts/episode-score-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SIM_DEFAULTS, SIM_EVENT_LABELS } from '@/components/simulation/sim-constants'
import { Play } from 'lucide-react'

interface RunResult {
  season: { season: number; name: string; numCastaways: number; numEpisodes: number }
  result: SimulationResult
  castawayNames: Record<string, string>
}

export default function RunPage() {
  const [season, setSeason] = useState('')
  const [players, setPlayers] = useState(SIM_DEFAULTS.numPlayers)
  const [picksPerPlayer, setPicksPerPlayer] = useState(SIM_DEFAULTS.picksPerPlayer)
  const [maxOwners, setMaxOwners] = useState(SIM_DEFAULTS.maxOwners)
  const [overrides, setOverrides] = useState<Partial<Record<SimEventType, number>>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState('')

  async function runSimulation() {
    if (!season) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: parseInt(season, 10),
          players,
          picksPerPlayer,
          maxOwners,
          overrides,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to run simulation')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const rankedScores = result
    ? result.result.rankings.map((idx) => result.result.scores.find((s) => s.playerIndex === idx)!)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Single Run</h1>
        <p className="text-muted-foreground mt-1">
          Run one simulated draft and examine team scores in detail.
        </p>
      </div>

      {/* Config */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <SeasonSelector value={season} onChange={setSeason} />
          <Button onClick={runSimulation} disabled={!season || loading} className="bg-teal-600 hover:bg-teal-700">
            <Play className="h-4 w-4 mr-2" />
            Run Simulation
          </Button>
        </div>
        <DraftConfigPanel
          players={players}
          picksPerPlayer={picksPerPlayer}
          maxOwners={maxOwners}
          onPlayersChange={setPlayers}
          onPicksChange={setPicksPerPlayer}
          onMaxOwnersChange={setMaxOwners}
        />
        <PointOverrideEditor overrides={overrides} onChange={setOverrides} />
      </div>

      <LoadingOverlay isLoading={loading} message="Running draft simulation..." />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {result.season.name} &mdash; {players} players, {picksPerPlayer} picks each
          </div>

          <Tabs defaultValue="scores">
            <TabsList>
              <TabsTrigger value="draft">Draft Board</TabsTrigger>
              <TabsTrigger value="scores">Team Scores</TabsTrigger>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
            </TabsList>

            <TabsContent value="draft">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Draft Picks</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Round</th>
                        <th className="text-left py-2 px-2">Pick</th>
                        <th className="text-left py-2 px-2">Player</th>
                        <th className="text-left py-2 px-2">Castaway</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.result.draft.picks.map(([round, pick, playerIdx, castawayId], i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                          <td className="py-1.5 px-2">{round}</td>
                          <td className="py-1.5 px-2">{pick}</td>
                          <td className="py-1.5 px-2 font-medium">Player {playerIdx + 1}</td>
                          <td className="py-1.5 px-2">{result.castawayNames[castawayId] ?? castawayId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scores">
              <div className="space-y-4">
                {/* Episode chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Score Progression by Episode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EpisodeScoreChart
                      scores={result.result.scores}
                      numEpisodes={result.season.numEpisodes}
                    />
                  </CardContent>
                </Card>

                {/* Player cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rankedScores.map((score, rank) => (
                    <Card key={score.playerIndex}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            #{rank + 1} Player {score.playerIndex + 1}
                          </CardTitle>
                          <span className="text-lg font-bold text-teal-600">
                            {score.totalScore} pts
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {score.castaways.map((c) => (
                            <div key={c.id} className="flex items-center justify-between text-sm">
                              <span>{c.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{c.score}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({Object.entries(c.eventBreakdown)
                                    .filter(([, v]) => v !== 0)
                                    .map(([k, v]) => `${SIM_EVENT_LABELS[k as SimEventType]?.split(' ').map(w => w[0]).join('') ?? k}: ${v}`)
                                    .join(', ')})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rankings">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Final Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Rank</th>
                        <th className="text-left py-2 px-2">Player</th>
                        <th className="text-right py-2 px-2">Score</th>
                        <th className="text-left py-2 px-2">Castaways</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankedScores.map((score, rank) => (
                        <tr key={score.playerIndex} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                          <td className="py-1.5 px-2 font-medium">{rank + 1}</td>
                          <td className="py-1.5 px-2">Player {score.playerIndex + 1}</td>
                          <td className="py-1.5 px-2 text-right font-semibold">{score.totalScore}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">
                            {score.castaways.map((c) => c.name).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
