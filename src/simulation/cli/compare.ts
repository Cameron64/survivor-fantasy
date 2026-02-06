import { loadSeason } from '../engine/data-loader'
import { runMonteCarlo } from '../engine/monte-carlo'
import type { DraftConfig, MonteCarloResult, PointSchemeComparison } from '../engine/types'
import { SIM_DEFAULTS } from '../config/defaults'
import {
  parseArgs,
  getNumArg,
  parseOverrides,
  formatTable,
  outputResult,
} from './helpers'

function main() {
  const args = parseArgs(process.argv.slice(2))
  const seasonNum = getNumArg(args, 'season', 46)
  const numSims = getNumArg(args, 'sims', 500)
  const numPlayers = getNumArg(args, 'players', SIM_DEFAULTS.numPlayers)
  const picksPerPlayer = getNumArg(args, 'picks-per-player', SIM_DEFAULTS.picksPerPlayer)
  const maxOwners = getNumArg(args, 'max-owners', SIM_DEFAULTS.maxOwnersPerContestant)

  const labelA = args.a || 'default'
  const labelB = args.b || ''
  if (!labelB) {
    console.error('Usage: pnpm sim:compare --season N --a "default" --b "WINNER:30,FINALIST:15"')
    process.exit(1)
  }

  const overridesA = labelA === 'default' ? {} : parseOverrides(labelA)
  const overridesB = parseOverrides(labelB)

  const season = loadSeason(seasonNum)
  const draftConfig: DraftConfig = {
    numPlayers,
    picksPerPlayer,
    maxOwnersPerContestant: maxOwners,
    mode: 'random',
  }

  console.log(`\nComparing scoring schemes for Season ${seasonNum} (${season.name})`)
  console.log(`Simulations: ${numSims}`)
  console.log(`Scheme A: "${labelA}"`)
  console.log(`Scheme B: "${labelB}"`)

  process.stdout.write('\nRunning scheme A...')
  const resultA = runMonteCarlo(season, {
    numSimulations: numSims,
    draftConfig,
    overrides: overridesA,
  })
  console.log(' done')

  process.stdout.write('Running scheme B...')
  const resultB = runMonteCarlo(season, {
    numSimulations: numSims,
    draftConfig,
    overrides: overridesB,
  })
  console.log(' done')

  const comparison: PointSchemeComparison = {
    schemeA: { label: labelA, overrides: overridesA },
    schemeB: { label: labelB, overrides: overridesB },
    resultA,
    resultB,
  }

  outputResult(args, comparison, () => {
    console.log('\n=== COMPARISON ===')

    const cols = [
      { header: 'Metric', width: 22 },
      { header: `A: ${labelA}`, width: 14, align: 'right' as const },
      { header: `B: ${labelB}`, width: 14, align: 'right' as const },
      { header: 'Delta', width: 10, align: 'right' as const },
    ]

    const metrics: Array<[string, number, number]> = [
      ['Gini', resultA.balance.gini, resultB.balance.gini],
      ['Spread', resultA.balance.spread, resultB.balance.spread],
      ['Winner Advantage', resultA.balance.winnerAdvantage, resultB.balance.winnerAdvantage],
      ['Longevity Corr.', resultA.balance.longevityCorrelation, resultB.balance.longevityCorrelation],
      ['Score Mean', resultA.scoreDistribution.mean, resultB.scoreDistribution.mean],
      ['Score StdDev', resultA.scoreDistribution.stdDev, resultB.scoreDistribution.stdDev],
      ['Score Min', resultA.scoreDistribution.min, resultB.scoreDistribution.min],
      ['Score Max', resultA.scoreDistribution.max, resultB.scoreDistribution.max],
    ]

    const rows = metrics.map(([name, a, b]) => {
      const delta = b - a
      const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)
      return [name, String(a), String(b), deltaStr]
    })

    console.log(formatTable(cols, rows))

    // Event contribution comparison
    console.log('\n--- Event Contribution Comparison ---')
    const allTypes = new Set([
      ...Object.keys(resultA.balance.eventContribution),
      ...Object.keys(resultB.balance.eventContribution),
    ])

    const eventCols = [
      { header: 'Event Type', width: 25 },
      { header: `A`, width: 8, align: 'right' as const },
      { header: `B`, width: 8, align: 'right' as const },
      { header: 'Delta', width: 8, align: 'right' as const },
    ]

    const eventRows = Array.from(allTypes)
      .sort()
      .map((type) => {
        const a = resultA.balance.eventContribution[type] || 0
        const b = resultB.balance.eventContribution[type] || 0
        const delta = b - a
        return [
          type,
          `${(a * 100).toFixed(1)}%`,
          `${(b * 100).toFixed(1)}%`,
          `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`,
        ]
      })

    console.log(formatTable(eventCols, eventRows))
  })
}

main()
