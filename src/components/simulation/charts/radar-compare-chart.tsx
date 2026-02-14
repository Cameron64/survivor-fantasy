'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { RadarDataPoint, CompareMetrics } from '../compare-metrics'
import { PLAYER_COMPARE_COLORS } from '../compare-metrics'

interface RadarCompareChartProps {
  data: RadarDataPoint[]
  metrics: CompareMetrics[]
}

export function RadarCompareChart({ data, metrics }: RadarCompareChartProps) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid strokeDasharray="3 3" />
        <PolarAngleAxis dataKey="axisLabel" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 1]}
          tickCount={5}
          tick={{ fontSize: 10 }}
        />
        <Tooltip
          content={({ payload, label }) => {
            if (!payload || payload.length === 0) return null
            // Find the data point for this axis
            const point = data.find((d) => d.axisLabel === label)
            if (!point) return null
            return (
              <div className="rounded-lg border bg-background p-2 shadow-md text-xs space-y-1">
                <p className="font-medium">{label}</p>
                {metrics.map((m, i) => {
                  const raw = point[`${m.name}_raw`]
                  const norm = point[`${m.name}_norm`]
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: PLAYER_COMPARE_COLORS[i] }}
                      />
                      <span>{m.name}:</span>
                      <span className="font-medium">
                        {typeof raw === 'number' ? raw.toFixed(2) : raw}
                      </span>
                      <span className="text-muted-foreground">
                        ({typeof norm === 'number' ? (norm * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          }}
        />
        <Legend />
        {metrics.map((m, i) => (
          <Radar
            key={m.id}
            name={m.name}
            dataKey={`${m.name}_norm`}
            stroke={PLAYER_COMPARE_COLORS[i]}
            fill={PLAYER_COMPARE_COLORS[i]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  )
}
