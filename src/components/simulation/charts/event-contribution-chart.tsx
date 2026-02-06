'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { SimEventType } from '@/simulation/engine/types'
import { SIM_EVENT_LABELS, getColorForEvent } from '@/components/simulation/sim-constants'

interface EventContributionChartProps {
  eventContribution: Record<string, number>
  label?: string
}

export function EventContributionChart({ eventContribution, label }: EventContributionChartProps) {
  const data = Object.entries(eventContribution)
    .map(([type, pct]) => ({
      type,
      label: SIM_EVENT_LABELS[type as SimEventType] ?? type,
      percentage: Math.round(pct * 10000) / 100,
      color: getColorForEvent(type as SimEventType),
    }))
    .sort((a, b) => b.percentage - a.percentage)

  return (
    <div>
      {label && <p className="text-sm font-medium mb-2">{label}</p>}
      <ResponsiveContainer width="100%" height={Math.max(250, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20, top: 10, bottom: 10 }}>
          <XAxis type="number" tickFormatter={(v: number) => `${v}%`} />
          <YAxis type="category" dataKey="label" width={115} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Contribution']}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="percentage">
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
