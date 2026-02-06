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

interface MetricData {
  name: string
  valueA: number
  valueB: number
}

interface ComparisonChartProps {
  metrics: MetricData[]
  labelA: string
  labelB: string
}

export function ComparisonChart({ metrics, labelA, labelB }: ComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={metrics} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend />
        <Bar dataKey="valueA" name={labelA} fill="#0d9488" />
        <Bar dataKey="valueB" name={labelB} fill="#7c3aed" />
      </BarChart>
    </ResponsiveContainer>
  )
}
