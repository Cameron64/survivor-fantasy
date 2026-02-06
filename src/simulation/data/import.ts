import * as fs from 'fs'
import * as path from 'path'
import { mapSeasonEvents } from '../engine/data-mapper'
import { BASE_EVENT_POINTS } from '../engine/data-mapper'
import { SIM_DEFAULTS } from '../config/defaults'
import type {
  SimSeason,
  SimCastaway,
  RawVoteHistory,
  RawChallengeResult,
  RawAdvantageMovement,
  RawCastaway,
  RawBootMapping,
  RawSeasonSummary,
} from '../engine/types'

function loadJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}. Run "pnpm sim:export" first.`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function main() {
  const rawDir = path.resolve(process.cwd(), SIM_DEFAULTS.rawDataDir)
  const outDir = path.resolve(process.cwd(), SIM_DEFAULTS.dataDir)

  console.log(`Reading raw data from: ${rawDir}`)
  console.log(`Writing processed seasons to: ${outDir}`)

  // Load all raw datasets
  const voteHistory = loadJson<RawVoteHistory[]>(path.join(rawDir, 'vote_history.json'))
  const challengeResults = loadJson<RawChallengeResult[]>(
    path.join(rawDir, 'challenge_results.json')
  )
  const advantageMovement = loadJson<RawAdvantageMovement[]>(
    path.join(rawDir, 'advantage_movement.json')
  )
  const castaways = loadJson<RawCastaway[]>(path.join(rawDir, 'castaways.json'))
  const bootMapping = loadJson<RawBootMapping[]>(path.join(rawDir, 'boot_mapping.json'))
  const seasonSummary = loadJson<RawSeasonSummary[]>(path.join(rawDir, 'season_summary.json'))

  fs.mkdirSync(outDir, { recursive: true })

  // Get unique seasons
  const seasons = Array.from(new Set(seasonSummary.map((s) => s.season))).sort((a, b) => a - b)

  let totalEvents = 0
  let totalSeasons = 0

  for (const seasonNum of seasons) {
    const summary = seasonSummary.find((s) => s.season === seasonNum)
    if (!summary) continue

    const seasonCastaways = castaways.filter((c) => c.season === seasonNum)
    if (seasonCastaways.length === 0) {
      console.warn(`  Season ${seasonNum}: No castaways found, skipping`)
      continue
    }

    const { events, warnings } = mapSeasonEvents({
      season: seasonNum,
      voteHistory,
      challengeResults,
      advantageMovement,
      castaways,
      bootMapping,
    })

    // Assign points based on BASE_EVENT_POINTS
    const eventsWithPoints = events.map((e) => ({
      ...e,
      points: BASE_EVENT_POINTS[e.type],
    }))

    const simCastaways: SimCastaway[] = seasonCastaways.map((c) => ({
      id: c.castaway_id,
      name: c.castaway,
      tribe: c.tribe || 'Unknown',
      placement: c.placement,
      isJury: c.jury,
      isFinalist: c.finalist,
      isWinner: c.result === 'Sole Survivor',
    }))

    const simSeason: SimSeason = {
      season: seasonNum,
      name: summary.season_name,
      numCastaways: summary.num_castaways,
      numEpisodes: summary.num_episodes,
      castaways: simCastaways,
      events: eventsWithPoints,
    }

    const outPath = path.join(outDir, `season-${seasonNum}.json`)
    fs.writeFileSync(outPath, JSON.stringify(simSeason, null, 2))

    console.log(
      `  Season ${seasonNum} (${summary.season_name}): ${simCastaways.length} castaways, ${eventsWithPoints.length} events`
    )
    if (warnings.length > 0) {
      for (const w of warnings) console.log(`    Note: ${w}`)
    }

    totalEvents += eventsWithPoints.length
    totalSeasons++
  }

  console.log(`\nDone: ${totalSeasons} seasons processed, ${totalEvents} total events mapped.`)
}

main()
