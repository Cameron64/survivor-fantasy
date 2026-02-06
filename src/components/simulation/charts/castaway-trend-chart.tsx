'use client'

import { useState, useMemo } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface CastawayEpisodeTrendEntry {
  episode: number
  [castawayName: string]: number
}

interface CastawayInfo {
  name: string
  placement: number
  totalPoints: number
}

interface CastawayTrendChartProps {
  data: CastawayEpisodeTrendEntry[]
  castaways: CastawayInfo[]
}

// 20 visually distinct colors for castaway lines
const LINE_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#059669', // emerald
  '#d97706', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#db2777', // pink
  '#65a30d', // lime
  '#ea580c', // orange
  '#6366f1', // indigo
  '#0d9488', // teal
  '#be123c', // rose
  '#4f46e5', // blue-indigo
  '#ca8a04', // yellow
  '#9333ea', // purple
  '#16a34a', // green
  '#e11d48', // red-rose
  '#0284c7', // sky
  '#c026d3', // fuchsia
  '#78716c', // stone
]

const DEFAULT_VISIBLE = 8

export function CastawayTrendChart({ data, castaways }: CastawayTrendChartProps) {
  // Sort castaways by total points desc (best first)
  const sorted = useMemo(
    () => [...castaways].sort((a, b) => b.totalPoints - a.totalPoints),
    [castaways]
  )

  const [visible, setVisible] = useState<Set<string>>(() =>
    new Set(sorted.slice(0, DEFAULT_VISIBLE).map((c) => c.name))
  )
  const [showAll, setShowAll] = useState(false)

  if (data.length === 0) return null

  function toggleCastaway(name: string) {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function toggleAll() {
    if (visible.size === sorted.length) {
      setVisible(new Set(sorted.slice(0, DEFAULT_VISIBLE).map((c) => c.name)))
    } else {
      setVisible(new Set(sorted.map((c) => c.name)))
    }
  }

  const colorMap = new Map<string, string>()
  sorted.forEach((c, i) => {
    colorMap.set(c.name, LINE_COLORS[i % LINE_COLORS.length])
  })

  const displayList = showAll ? sorted : sorted.slice(0, 12)
  const hasMore = sorted.length > 12

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="episode"
            tick={{ fontSize: 11 }}
            label={{ value: 'Episode', position: 'insideBottomRight', offset: -5, fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{ value: 'Cumulative Points', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            labelFormatter={(label) => `Episode ${label}`}
          />
          <Legend />
          {sorted.map((c) => (
            <Line
              key={c.name}
              type="monotone"
              dataKey={c.name}
              stroke={colorMap.get(c.name)}
              strokeWidth={visible.has(c.name) ? 2 : 0}
              dot={false}
              activeDot={visible.has(c.name) ? { r: 3 } : false}
              hide={!visible.has(c.name)}
              name={c.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Castaway toggle grid */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="toggle-all-castaways"
            checked={visible.size === sorted.length}
            onCheckedChange={toggleAll}
          />
          <Label htmlFor="toggle-all-castaways" className="text-xs font-medium cursor-pointer">
            All ({sorted.length})
          </Label>
          <span className="text-xs text-muted-foreground ml-2">
            {visible.size} shown
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
          {displayList.map((c) => (
            <div key={c.name} className="flex items-center gap-1.5">
              <Checkbox
                id={`castaway-${c.name}`}
                checked={visible.has(c.name)}
                onCheckedChange={() => toggleCastaway(c.name)}
              />
              <Label
                htmlFor={`castaway-${c.name}`}
                className="text-xs cursor-pointer truncate flex items-center gap-1"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colorMap.get(c.name) }}
                />
                {c.name}
                <span className="text-muted-foreground">({c.totalPoints})</span>
              </Label>
            </div>
          ))}
        </div>
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-teal-600 hover:underline"
          >
            Show all {sorted.length} castaways...
          </button>
        )}
        {hasMore && showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="text-xs text-teal-600 hover:underline"
          >
            Show fewer
          </button>
        )}
      </div>
    </div>
  )
}
