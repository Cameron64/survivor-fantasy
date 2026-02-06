'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { SimEventType } from '@/simulation/engine/types'
import {
  EVENT_CATEGORIES,
  CATEGORY_COLORS,
} from '@/components/simulation/sim-constants'

interface CastawayData {
  name: string
  totalPoints: number
  breakdown: Partial<Record<SimEventType, number>>
}

interface CastawayValueChartProps {
  castaways: CastawayData[]
}

// Aggregate event types by category for simpler bars
function aggregateByCategory(
  breakdown: Partial<Record<SimEventType, number>>
): Record<string, number> {
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

export function CastawayValueChart({ castaways }: CastawayValueChartProps) {
  const data = castaways.map((c) => ({
    name: c.name,
    ...aggregateByCategory(c.breakdown),
  }))

  const categories = Object.keys(EVENT_CATEGORIES)

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, castaways.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value, name) => [String(value), String(name)]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend />
        {categories.map((cat) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="points"
            fill={CATEGORY_COLORS[cat]}
            name={cat}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
