import { config } from './config'
import { runAgent } from './agent'
import { getEpisodes, getApprovedGameEvents, getGameEvents } from './tool-impl/api'
import { dmAdmin } from './tool-impl/notify'
import type { Episode } from './types'

function parseArgs(): { episode?: number; force: boolean } {
  const args = process.argv.slice(2)
  let episode: number | undefined
  let force = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' && args[i + 1]) {
      episode = parseInt(args[i + 1], 10)
      i++
    }
    if (args[i] === '--force') {
      force = true
    }
  }

  return { episode, force }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Find the most recently aired episode (airDate <= now).
 */
function findLatestAiredEpisode(episodes: Episode[]): Episode | null {
  const now = new Date()
  const aired = episodes
    .filter((ep) => new Date(ep.airDate) <= now)
    .sort((a, b) => b.number - a.number)
  return aired[0] || null
}

async function main() {
  const { episode: episodeOverride, force } = parseArgs()

  console.log('=== Survivor Fantasy Recap Agent ===')
  console.log(`Time: ${new Date().toISOString()}`)

  // Load episodes and check for season end
  const [episodes, approvedEvents] = await Promise.all([
    getEpisodes(),
    getApprovedGameEvents(),
  ])

  // Season over check: if any approved ENDGAME event exists, exit
  const hasEndgame = approvedEvents.some((e) => e.type === 'ENDGAME')
  if (hasEndgame) {
    console.log('Season is over (ENDGAME event approved). Exiting.')
    return
  }

  // Determine which episode to process
  let targetEpisode: Episode | null = null

  if (episodeOverride) {
    targetEpisode = episodes.find((ep) => ep.number === episodeOverride) || null
    if (!targetEpisode) {
      console.error(`Episode ${episodeOverride} not found in schedule.`)
      process.exit(1)
    }
  } else {
    targetEpisode = findLatestAiredEpisode(episodes)
    if (!targetEpisode) {
      console.log('No episodes have aired yet. Exiting.')
      return
    }
  }

  console.log(
    `Target: Episode ${targetEpisode.number}${targetEpisode.title ? ` — "${targetEpisode.title}"` : ''} (aired ${targetEpisode.airDate})`,
  )

  // Duplicate check (unless --force)
  if (!force) {
    const existingEvents = await getGameEvents(targetEpisode.number)
    if (existingEvents.length > 0) {
      console.log(
        `${existingEvents.length} game event(s) already exist for week ${targetEpisode.number}. Use --force to reprocess. Exiting.`,
      )
      return
    }
  }

  // Retry loop
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    console.log(`\nAttempt ${attempt}/${config.maxAttempts}...`)

    try {
      const result = await runAgent(targetEpisode)

      console.log(`Result: submitted=${result.submitted}, events=${result.eventCount}`)

      if (result.submitted) {
        console.log('Agent submitted events successfully. Done.')
        return
      }

      // Agent didn't submit anything — recaps may not be published yet
      if (attempt < config.maxAttempts) {
        const sleepHours = config.retrySleepMs / (60 * 60 * 1000)
        console.log(`No events submitted. Sleeping ${sleepHours} hours before retry...`)
        await sleep(config.retrySleepMs)
      } else {
        // Final attempt — agent should have already sent a DM on its own,
        // but send a fallback just in case
        console.log('All attempts exhausted. Sending final notification.')
        await dmAdmin(
          `Recap Agent: Failed to find sufficient recap data for Episode ${targetEpisode.number} after ${config.maxAttempts} attempts. ` +
            `Please submit events manually.`,
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Attempt ${attempt} failed with error: ${message}`)

      if (attempt === config.maxAttempts) {
        await dmAdmin(
          `Recap Agent: Error processing Episode ${targetEpisode.number} after ${config.maxAttempts} attempts: ${message}`,
        )
      } else {
        const sleepHours = config.retrySleepMs / (60 * 60 * 1000)
        console.log(`Sleeping ${sleepHours} hours before retry...`)
        await sleep(config.retrySleepMs)
      }
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
