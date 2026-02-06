'use client'

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
import { CATEGORY_COLORS } from '@/components/simulation/sim-constants'

interface EventTrendEntry {
  season: number
  [category: string]: number
}

interface EventTrendChartProps {
  data: EventTrendEntry[]
}

const CATEGORIES = ['Challenges', 'Tribal', 'Idols', 'Endgame', 'Penalties']

export function EventTrendChart({ data }: EventTrendChartProps) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="season"
          tick={{ fontSize: 11 }}
          label={{ value: 'Season', position: 'insideBottomRight', offset: -5, fontSize: 12 }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${v}%`}
          label={{ value: '% of Total Points', angle: -90, position: 'insideLeft', fontSize: 12 }}
        />
        <Tooltip
          formatter={(value, name) => [`${value}%`, String(name)]}
          contentStyle={{ fontSize: 12 }}
          labelFormatter={(label) => `Season ${label}`}
        />
        <Legend />
        {CATEGORIES.map((cat) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={CATEGORY_COLORS[cat]}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
            name={cat}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
