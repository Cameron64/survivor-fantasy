'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PlayerScoreData {
  playerIndex: number
  scoreByEpisode: Record<number, number>
  totalScore: number
}

interface EpisodeScoreChartProps {
  scores: PlayerScoreData[]
  numEpisodes: number
}

const PLAYER_COLORS = [
  '#0d9488', '#0891b2', '#7c3aed', '#059669', '#dc2626',
  '#ea580c', '#d97706', '#65a30d', '#2563eb', '#db2777',
  '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#10b981', '#f97316', '#3b82f6', '#ec4899',
]

export function EpisodeScoreChart({ scores, numEpisodes }: EpisodeScoreChartProps) {
  // Build cumulative scores per episode per player
  const episodes = Array.from({ length: numEpisodes }, (_, i) => i + 1)
  const data = episodes.map((ep) => {
    const point: Record<string, number> = { episode: ep }
    for (const player of scores) {
      let cumulative = 0
      for (let e = 1; e <= ep; e++) {
        cumulative += player.scoreByEpisode[e] ?? 0
      }
      point[`P${player.playerIndex + 1}`] = cumulative
    }
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
        <XAxis dataKey="episode" label={{ value: 'Episode', position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: 'Cumulative Score', angle: -90, position: 'insideLeft' }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend />
        {scores.map((player, i) => (
          <Line
            key={player.playerIndex}
            type="monotone"
            dataKey={`P${player.playerIndex + 1}`}
            stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
            strokeWidth={2}
            dot={false}
            name={`Player ${player.playerIndex + 1}`}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
