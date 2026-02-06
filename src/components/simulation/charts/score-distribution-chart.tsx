'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

interface HistogramBin {
  binStart: number
  binEnd: number
  count: number
}

interface ScoreDistribution {
  mean: number
  median: number
  p25: number
  p75: number
}

interface ScoreDistributionChartProps {
  histogram: HistogramBin[]
  scoreDistribution: ScoreDistribution
}

export function ScoreDistributionChart({ histogram, scoreDistribution }: ScoreDistributionChartProps) {
  const data = histogram.map((bin) => ({
    range: `${bin.binStart}-${bin.binEnd}`,
    midpoint: (bin.binStart + bin.binEnd) / 2,
    count: bin.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
        <XAxis
          dataKey="midpoint"
          tickFormatter={(v: number) => String(Math.round(v))}
          label={{ value: 'Team Score', position: 'insideBottom', offset: -5 }}
        />
        <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
        <Tooltip
          formatter={(value) => [String(value), 'Teams']}
          labelFormatter={(label) => `Score: ${Math.round(Number(label))}`}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" fill="#0d9488" opacity={0.8} />
        <ReferenceLine
          x={scoreDistribution.mean}
          stroke="#dc2626"
          strokeDasharray="5 5"
          label={{ value: 'Mean', position: 'top', fontSize: 11 }}
        />
        <ReferenceLine
          x={scoreDistribution.median}
          stroke="#2563eb"
          strokeDasharray="5 5"
          label={{ value: 'Median', position: 'top', fontSize: 11 }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
