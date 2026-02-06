import { loadSeason, loadAllSeasons } from '../engine/data-loader'
import { runMonteCarlo } from '../engine/monte-carlo'
import type { DraftConfig, MonteCarloResult } from '../engine/types'
import { SIM_DEFAULTS } from '../config/defaults'
import {
  parseArgs,
  getArg,
  getNumArg,
  parseOverrides,
  formatTable,
  padRight,
  outputResult,
} from './helpers'

function printResult(result: MonteCarloResult) {
  console.log(`\n=== MONTE CARLO RESULTS (Season ${result.season}) ===`)
  console.log(`Simulations: ${result.numSimulations} | Players: ${result.numPlayers} | Picks: ${result.picksPerPlayer}`)

  // Score distribution
  console.log('\n--- Score Distribution ---')
  const { scoreDistribution: sd } = result
  console.log(`  Mean:   ${sd.mean}`)
  console.log(`  Median: ${sd.median}`)
  console.log(`  StdDev: ${sd.stdDev}`)
  console.log(`  Range:  ${sd.min} - ${sd.max}`)
  console.log(`  IQR:    ${sd.p25} - ${sd.p75}`)

  // Balance metrics
  console.log('\n--- Balance Metrics ---')
  console.log(`  Gini coefficient:      ${result.balance.gini}`)
  console.log(`  Spread (max-min):      ${result.balance.spread}`)
  console.log(`  Winner advantage:      ${result.balance.winnerAdvantage}`)
  console.log(`  Longevity correlation: ${result.balance.longevityCorrelation}`)

  // Event contribution
  console.log('\n--- Event Type Contribution ---')
  const contributions = Object.entries(result.balance.eventContribution)
    .sort(([, a], [, b]) => b - a)
  const contribCols = [
    { header: 'Event Type', width: 25 },
    { header: '%', width: 7, align: 'right' as const },
  ]
  const contribRows = contributions.map(([type, pct]) => [
    type,
    `${(pct * 100).toFixed(1)}%`,
  ])
  console.log(formatTable(contribCols, contribRows))

  // Top castaways
  console.log('\n--- Top Castaways (by fantasy value) ---')
  const topCols = [
    { header: 'Castaway', width: 25 },
    { header: 'Points', width: 7, align: 'right' as const },
    { header: 'Avg Rank', width: 8, align: 'right' as const },
    { header: 'Draft %', width: 7, align: 'right' as const },
  ]
  const topRows = result.castawayStats.slice(0, 15).map((c) => [
    c.name,
    String(c.totalPoints),
    String(c.avgTeamRank),
    `${(c.draftRate * 100).toFixed(1)}%`,
  ])
  console.log(formatTable(topCols, topRows))
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const seasonArg = getArg(args, 'season', '46')
  const numSims = getNumArg(args, 'sims', SIM_DEFAULTS.numSimulations)
  const numPlayers = getNumArg(args, 'players', SIM_DEFAULTS.numPlayers)
  const picksPerPlayer = getNumArg(args, 'picks-per-player', SIM_DEFAULTS.picksPerPlayer)
  const maxOwners = getNumArg(args, 'max-owners', SIM_DEFAULTS.maxOwnersPerContestant)
  const overrides = parseOverrides(args.override || '')

  const draftConfig: DraftConfig = {
    numPlayers,
    picksPerPlayer,
    maxOwnersPerContestant: maxOwners,
    mode: 'random',
  }

  if (seasonArg === 'all') {
    console.log(`Running ${numSims} simulations across all seasons...`)
    const seasons = loadAllSeasons()
    const results: MonteCarloResult[] = []

    for (const season of seasons) {
      process.stdout.write(`  Season ${season.season}...`)
      const result = runMonteCarlo(season, {
        numSimulations: numSims,
        draftConfig,
        overrides,
      })
      results.push(result)
      console.log(` done (Gini: ${result.balance.gini})`)
    }

    outputResult(args, results, () => {
      for (const r of results) printResult(r)

      // Summary across all seasons
      console.log('\n=== CROSS-SEASON SUMMARY ===')
      const avgGini = results.reduce((s, r) => s + r.balance.gini, 0) / results.length
      const avgSpread = results.reduce((s, r) => s + r.balance.spread, 0) / results.length
      const avgCorr = results.reduce((s, r) => s + r.balance.longevityCorrelation, 0) / results.length
      console.log(`  Avg Gini:       ${(avgGini).toFixed(4)}`)
      console.log(`  Avg Spread:     ${(avgSpread).toFixed(1)}`)
      console.log(`  Avg Longevity:  ${(avgCorr).toFixed(4)}`)
    })
  } else {
    const seasonNum = parseInt(seasonArg, 10)
    console.log(`Running ${numSims} simulations for season ${seasonNum}...`)
    const season = loadSeason(seasonNum)
    const result = runMonteCarlo(season, {
      numSimulations: numSims,
      draftConfig,
      overrides,
    })

    outputResult(args, result, () => printResult(result))
  }
}

main()
