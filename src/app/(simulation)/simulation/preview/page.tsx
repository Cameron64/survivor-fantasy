'use client'

import { useState } from 'react'
import type { SimEventType } from '@/simulation/engine/types'
import { SeasonSelector } from '@/components/simulation/season-selector'
import { PointOverrideEditor } from '@/components/simulation/point-override-editor'
import { LoadingOverlay } from '@/components/simulation/loading-overlay'
import { CastawayValueChart } from '@/components/simulation/charts/castaway-value-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SIM_EVENT_LABELS,
} from '@/components/simulation/sim-constants'
import { Eye } from 'lucide-react'

interface CastawayScore {
  id: string
  name: string
  placement: number
  totalPoints: number
  breakdown: Partial<Record<SimEventType, number>>
}

interface PreviewResult {
  season: { season: number; name: string; numCastaways: number; numEpisodes: number }
  castaways: CastawayScore[]
}

type SortKey = 'rank' | 'name' | 'placement' | 'totalPoints'

export default function PreviewPage() {
  const [season, setSeason] = useState('')
  const [overrides, setOverrides] = useState<Partial<Record<SimEventType, number>>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PreviewResult | null>(null)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)

  async function runPreview() {
    if (!season) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/simulation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season: parseInt(season, 10), overrides }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to run preview')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(key === 'name')
    }
  }

  const sortedCastaways = result?.castaways
    ? [...result.castaways].sort((a, b) => {
        const dir = sortAsc ? 1 : -1
        switch (sortKey) {
          case 'name':
            return dir * a.name.localeCompare(b.name)
          case 'placement':
            return dir * (a.placement - b.placement)
          case 'totalPoints':
            return dir * (a.totalPoints - b.totalPoints)
          default: // rank = by totalPoints desc
            return b.totalPoints - a.totalPoints
        }
      })
    : []

  // Collect which event types actually have data
  const activeEventTypes = result
    ? (Object.keys(
        result.castaways.reduce((acc, c) => {
          for (const k of Object.keys(c.breakdown)) acc[k] = true
          return acc
        }, {} as Record<string, boolean>)
      ) as SimEventType[])
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Preview</h1>
        <p className="text-muted-foreground mt-1">
          View castaway fantasy point values for a historical season.
        </p>
      </div>

      {/* Config */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <SeasonSelector value={season} onChange={setSeason} />
          <Button onClick={runPreview} disabled={!season || loading} className="bg-teal-600 hover:bg-teal-700">
            <Eye className="h-4 w-4 mr-2" />
            Run Preview
          </Button>
        </div>
        <PointOverrideEditor overrides={overrides} onChange={setOverrides} />
      </div>

      <LoadingOverlay isLoading={loading} message="Calculating castaway scores..." />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            {result.season.name} &mdash; {result.season.numCastaways} castaways, {result.season.numEpisodes} episodes
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Castaway Point Values</CardTitle>
            </CardHeader>
            <CardContent>
              <CastawayValueChart castaways={result.castaways} />
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 cursor-pointer hover:text-teal-600" onClick={() => handleSort('rank')}>
                      #
                    </th>
                    <th className="text-left py-2 px-2 cursor-pointer hover:text-teal-600" onClick={() => handleSort('name')}>
                      Name
                    </th>
                    <th className="text-right py-2 px-2 cursor-pointer hover:text-teal-600" onClick={() => handleSort('placement')}>
                      Place
                    </th>
                    <th className="text-right py-2 px-2 cursor-pointer hover:text-teal-600 font-semibold" onClick={() => handleSort('totalPoints')}>
                      Total
                    </th>
                    {activeEventTypes.map((et) => (
                      <th key={et} className="text-right py-2 px-1 text-xs" title={SIM_EVENT_LABELS[et]}>
                        {SIM_EVENT_LABELS[et].split(' ').map(w => w[0]).join('')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedCastaways.map((c, i) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-teal-50/50 dark:hover:bg-teal-950/20">
                      <td className="py-1.5 px-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5 px-2 font-medium">{c.name}</td>
                      <td className="py-1.5 px-2 text-right text-muted-foreground">{c.placement}</td>
                      <td className="py-1.5 px-2 text-right font-semibold">{c.totalPoints}</td>
                      {activeEventTypes.map((et) => (
                        <td key={et} className="py-1.5 px-1 text-right text-xs text-muted-foreground">
                          {c.breakdown[et] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
