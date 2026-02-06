import { loadSeason } from '../engine/data-loader'
import { calculateCastawayScores } from '../engine/score-calculator'
import {
  parseArgs,
  getNumArg,
  parseOverrides,
  formatTable,
  colorPoints,
  outputResult,
} from './helpers'

function main() {
  const args = parseArgs(process.argv.slice(2))
  const seasonNum = getNumArg(args, 'season', 46)
  const overrides = parseOverrides(args.override || '')

  console.log(`\nLoading season ${seasonNum}...`)
  const season = loadSeason(seasonNum)
  console.log(`Season: ${season.name} (${season.numCastaways} castaways, ${season.numEpisodes} episodes)`)

  const scores = calculateCastawayScores(season, overrides)
  const sorted = scores.slice().sort((a, b) => b.totalPoints - a.totalPoints)

  outputResult(args, sorted, () => {
    console.log(`\n=== CONTESTANT PREVIEW: Season ${seasonNum} ===\n`)

    // Summary table
    const cols = [
      { header: '#', width: 3, align: 'right' as const },
      { header: 'Contestant', width: 22 },
      { header: 'Place', width: 5, align: 'right' as const },
      { header: 'Points', width: 7, align: 'right' as const },
      { header: 'Chal', width: 5, align: 'right' as const },
      { header: 'Vote', width: 5, align: 'right' as const },
      { header: 'Idol', width: 5, align: 'right' as const },
      { header: 'End', width: 5, align: 'right' as const },
    ]

    const rows = sorted.map((c, i) => {
      const chal =
        (c.breakdown.INDIVIDUAL_IMMUNITY_WIN || 0) +
        (c.breakdown.REWARD_CHALLENGE_WIN || 0) +
        (c.breakdown.TEAM_CHALLENGE_WIN || 0)
      const vote =
        (c.breakdown.CORRECT_VOTE || 0) +
        (c.breakdown.ZERO_VOTES_RECEIVED || 0) +
        (c.breakdown.SURVIVED_WITH_VOTES || 0)
      const idol =
        (c.breakdown.IDOL_FIND || 0) +
        (c.breakdown.IDOL_PLAY_SUCCESS || 0) +
        (c.breakdown.VOTED_OUT_WITH_IDOL || 0)
      const endgame =
        (c.breakdown.MADE_JURY || 0) +
        (c.breakdown.FINALIST || 0) +
        (c.breakdown.WINNER || 0)

      return [
        String(i + 1),
        c.name,
        String(c.placement),
        colorPoints(c.totalPoints),
        colorPoints(chal),
        colorPoints(vote),
        colorPoints(idol),
        colorPoints(endgame),
      ]
    })

    console.log(formatTable(cols, rows))

    console.log('\nColumns: Chal=Challenge pts, Vote=Tribal pts, Idol=Idol pts, End=Endgame pts')

    // Detailed breakdown for top 5
    console.log('\n--- Detailed Breakdown (Top 5) ---')
    for (const c of sorted.slice(0, 5)) {
      console.log(`\n  ${c.name} (Placement: ${c.placement}, Total: ${colorPoints(c.totalPoints)})`)
      for (const [type, pts] of Object.entries(c.breakdown)) {
        if (pts !== 0) {
          console.log(`    ${type.padEnd(25)} ${colorPoints(pts as number)}`)
        }
      }
    }
  })
}

main()
