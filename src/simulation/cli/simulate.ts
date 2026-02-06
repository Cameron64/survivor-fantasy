import { loadSeason } from '../engine/data-loader'
import { simulateDraft } from '../engine/draft-simulator'
import { calculateScores } from '../engine/score-calculator'
import type { DraftConfig } from '../engine/types'
import { SIM_DEFAULTS } from '../config/defaults'
import {
  parseArgs,
  getNumArg,
  parseOverrides,
  parseManualPicks,
  formatTable,
  colorPoints,
  padRight,
  outputResult,
} from './helpers'

function main() {
  const args = parseArgs(process.argv.slice(2))
  const seasonNum = getNumArg(args, 'season', 46)
  const numPlayers = getNumArg(args, 'players', SIM_DEFAULTS.numPlayers)
  const picksPerPlayer = getNumArg(args, 'picks-per-player', SIM_DEFAULTS.picksPerPlayer)
  const maxOwners = getNumArg(args, 'max-owners', SIM_DEFAULTS.maxOwnersPerContestant)
  const overrides = parseOverrides(args.override || '')
  const manualPicks = parseManualPicks(args.picks || '')

  const hasManual = Object.keys(manualPicks).length > 0
  const mode = hasManual ? 'hybrid' : 'random'

  console.log(`\nLoading season ${seasonNum}...`)
  const season = loadSeason(seasonNum)
  console.log(`Season: ${season.name} (${season.numCastaways} castaways, ${season.numEpisodes} episodes)`)

  const draftConfig: DraftConfig = {
    numPlayers,
    picksPerPlayer,
    maxOwnersPerContestant: maxOwners,
    mode,
    manualPicks: hasManual ? manualPicks : undefined,
  }

  console.log(`\nRunning draft: ${numPlayers} players, ${picksPerPlayer} picks each, ${mode} mode`)
  const draft = simulateDraft(season, draftConfig, overrides)
  const result = calculateScores(season, draft, overrides)

  outputResult(args, result, () => {
    // Draft board
    console.log('\n=== DRAFT BOARD ===')
    const draftCols = [
      { header: 'Round', width: 5, align: 'right' as const },
      { header: 'Pick', width: 4, align: 'right' as const },
      { header: 'Player', width: 8, align: 'right' as const },
      { header: 'Castaway', width: 25 },
    ]
    const draftRows = draft.picks.map(([round, pick, playerIdx, castawayId]) => {
      const castaway = season.castaways.find((c) => c.id === castawayId)
      return [String(round), String(pick), `P${playerIdx + 1}`, castaway?.name ?? castawayId]
    })
    console.log(formatTable(draftCols, draftRows))

    // Per-player breakdown
    console.log('\n=== TEAM SCORES ===')
    const sorted = result.scores.slice().sort((a, b) => b.totalScore - a.totalScore)
    for (const score of sorted) {
      const rank = result.rankings.indexOf(score.playerIndex) + 1
      console.log(`\n  #${rank} Player ${score.playerIndex + 1} — ${score.totalScore} pts`)
      for (const c of score.castaways) {
        console.log(`    ${padRight(c.name, 20)} ${colorPoints(c.score)} pts`)
        for (const [type, pts] of Object.entries(c.eventBreakdown)) {
          console.log(`      ${padRight(type, 25)} ${colorPoints(pts as number)}`)
        }
      }
    }

    // Rankings summary
    console.log('\n=== RANKINGS ===')
    const rankCols = [
      { header: 'Rank', width: 4, align: 'right' as const },
      { header: 'Player', width: 8 },
      { header: 'Score', width: 6, align: 'right' as const },
    ]
    const rankRows = sorted.map((s, i) => [
      String(i + 1),
      `Player ${s.playerIndex + 1}`,
      String(s.totalScore),
    ])
    console.log(formatTable(rankCols, rankRows))
  })
}

main()
