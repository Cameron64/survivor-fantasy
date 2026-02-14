import type {
  SimEvent,
  SimEventType,
  RawVoteHistory,
  RawChallengeResult,
  RawAdvantageMovement,
  RawCastaway,
  RawBootMapping,
} from './types'

/**
 * Default point values matching EVENT_POINTS in src/lib/scoring.ts.
 * Duplicated here so the simulation engine has zero Next.js/Prisma deps.
 */
export const BASE_EVENT_POINTS: Record<SimEventType, number> = {
  INDIVIDUAL_IMMUNITY_WIN: 5,
  REWARD_CHALLENGE_WIN: 3,
  TEAM_CHALLENGE_WIN: 1,
  CORRECT_VOTE: 2,
  IDOL_PLAY_SUCCESS: 5,
  IDOL_FIND: 3,
  FIRE_MAKING_WIN: 5,
  ZERO_VOTES_RECEIVED: 1,
  SURVIVED_WITH_VOTES: 2,
  CAUSED_BLINDSIDE: 2,
  MADE_JURY: 5,
  FINALIST: 10,
  WINNER: 20,
  VOTED_OUT_WITH_IDOL: -3,
  QUIT: -10,
}

interface MapperInput {
  season: number
  voteHistory: RawVoteHistory[]
  challengeResults: RawChallengeResult[]
  advantageMovement: RawAdvantageMovement[]
  castaways: RawCastaway[]
  bootMapping: RawBootMapping[]
}

interface MapperOutput {
  events: SimEvent[]
  warnings: string[]
}

export function mapSeasonEvents(input: MapperInput): MapperOutput {
  const events: SimEvent[] = []
  const warnings: string[] = []
  const pts = BASE_EVENT_POINTS

  // Build lookup: which castaway was eliminated in which episode
  const eliminatedInEpisode = new Map<string, number>()
  for (const bm of input.bootMapping) {
    if (bm.season === input.season) {
      eliminatedInEpisode.set(bm.castaway_id, bm.episode)
    }
  }

  // Build lookup: castaways holding idols at elimination
  const idolHolders = new Set<string>()
  const idolRelinquished = new Set<string>()
  for (const am of input.advantageMovement) {
    if (am.season !== input.season) continue
    const isIdol =
      am.advantage_type?.toLowerCase().includes('idol') ||
      am.advantage_type?.toLowerCase().includes('hidden immunity')
    if (!isIdol) continue
    if (am.event === 'Found') idolHolders.add(am.castaway_id)
    if (am.event === 'Played' || am.event === 'Transferred') idolRelinquished.add(am.castaway_id)
  }

  // --- Vote History events ---
  const votesBySeason = input.voteHistory.filter((v) => v.season === input.season)

  // Group votes by episode + vote_event to process tribal councils
  const tribalCouncils = new Map<string, RawVoteHistory[]>()
  for (const v of votesBySeason) {
    const key = `${v.episode}-${v.vote_event}`
    if (!tribalCouncils.has(key)) tribalCouncils.set(key, [])
    tribalCouncils.get(key)!.push(v)
  }

  for (const [, votes] of Array.from(tribalCouncils.entries())) {
    if (votes.length === 0) continue
    const episode = votes[0].episode
    const voteEvent = votes[0].vote_event || ''

    // Find who was voted out in this tribal
    const votedOutId = votes[0].voted_out_id

    // Fire making detection
    const isFireMaking =
      voteEvent.toLowerCase().includes('fire') || voteEvent.toLowerCase().includes('firemaking')
    if (isFireMaking) {
      // Find the winner (the one not eliminated)
      const participants = new Set(votes.map((v: RawVoteHistory) => v.castaway_id))
      for (const pid of Array.from(participants)) {
        if (pid !== votedOutId) {
          events.push({
            type: 'FIRE_MAKING_WIN',
            castawayId: pid,
            episode,
            points: pts.FIRE_MAKING_WIN,
            description: `Won fire-making challenge`,
          })
        }
      }
      continue // Fire-making is not a normal vote
    }

    // Track who received votes and how many
    const votesReceived = new Map<string, number>()
    const attendees = new Set<string>()

    for (const v of votes) {
      attendees.add(v.castaway_id)
      if (v.vote_id && !v.nullified) {
        votesReceived.set(v.vote_id, (votesReceived.get(v.vote_id) || 0) + 1)
      }
    }

    // CORRECT_VOTE: voter's target matches the person voted out
    for (const v of votes) {
      if (v.vote_id && v.vote_id === votedOutId && !v.nullified) {
        events.push({
          type: 'CORRECT_VOTE',
          castawayId: v.castaway_id,
          episode,
          points: pts.CORRECT_VOTE,
          description: `Voted correctly for ${v.voted_out}`,
        })
      }
    }

    // ZERO_VOTES_RECEIVED: attendee got 0 votes and wasn't eliminated
    for (const attendeeId of Array.from(attendees)) {
      if (attendeeId === votedOutId) continue
      const received = votesReceived.get(attendeeId) || 0
      if (received === 0) {
        events.push({
          type: 'ZERO_VOTES_RECEIVED',
          castawayId: attendeeId,
          episode,
          points: pts.ZERO_VOTES_RECEIVED,
          description: `Received zero votes at tribal council`,
        })
      }
    }

    // SURVIVED_WITH_VOTES: received votes but not eliminated
    for (const [targetId, count] of Array.from(votesReceived.entries())) {
      if (targetId !== votedOutId && count > 0) {
        events.push({
          type: 'SURVIVED_WITH_VOTES',
          castawayId: targetId,
          episode,
          points: pts.SURVIVED_WITH_VOTES,
          description: `Survived tribal despite receiving ${count} vote(s)`,
        })
      }
    }
  }

  // --- Challenge Results events ---
  const challenges = input.challengeResults.filter((c) => c.season === input.season)
  for (const c of challenges) {
    if (c.result !== 'Won') continue

    // Use the explicit boolean flags from survivoR data when available,
    // falling back to string parsing for older data formats
    if (c.won_individual_immunity) {
      events.push({
        type: 'INDIVIDUAL_IMMUNITY_WIN',
        castawayId: c.castaway_id,
        episode: c.episode,
        points: pts.INDIVIDUAL_IMMUNITY_WIN,
        description: `Won individual immunity`,
      })
    }
    if (c.won_individual_reward) {
      events.push({
        type: 'REWARD_CHALLENGE_WIN',
        castawayId: c.castaway_id,
        episode: c.episode,
        points: pts.REWARD_CHALLENGE_WIN,
        description: `Won individual reward challenge`,
      })
    }
    // Team/tribal challenge: won but not an individual win
    if (!c.won_individual_immunity && !c.won_individual_reward) {
      events.push({
        type: 'TEAM_CHALLENGE_WIN',
        castawayId: c.castaway_id,
        episode: c.episode,
        points: pts.TEAM_CHALLENGE_WIN,
        description: `Won team/tribal challenge`,
      })
    }
  }

  // --- Advantage Movement events ---
  // The raw survivoR data has one row per affected player at tribal, so we
  // must deduplicate by (castaway_id, episode, event) to avoid counting a
  // single idol find/play dozens of times.
  const advantages = input.advantageMovement.filter((a) => a.season === input.season)
  const seenAdvantage = new Set<string>()
  for (const a of advantages) {
    const isIdol =
      a.advantage_type?.toLowerCase().includes('idol') ||
      a.advantage_type?.toLowerCase().includes('hidden immunity')
    if (!isIdol) continue

    const dedupKey = `${a.castaway_id}-${a.episode}-${a.event}`
    if (seenAdvantage.has(dedupKey)) continue
    seenAdvantage.add(dedupKey)

    if (a.event === 'Found') {
      events.push({
        type: 'IDOL_FIND',
        castawayId: a.castaway_id,
        episode: a.episode,
        points: pts.IDOL_FIND,
        description: `Found a hidden immunity idol`,
      })
    } else if (a.event === 'Played') {
      const nullified = a.votes_nullified ?? 0
      if (nullified > 0) {
        events.push({
          type: 'IDOL_PLAY_SUCCESS',
          castawayId: a.castaway_id,
          episode: a.episode,
          points: pts.IDOL_PLAY_SUCCESS,
          description: `Successfully played idol, nullified ${nullified} vote(s)`,
        })
      }
    }
  }

  // --- Castaway-level events (placement, jury, etc.) ---
  const seasonCastaways = input.castaways.filter((c) => c.season === input.season)
  for (const c of seasonCastaways) {
    const lastEpisode = eliminatedInEpisode.get(c.castaway_id)

    // WINNER
    if (c.result === 'Sole Survivor') {
      events.push({
        type: 'WINNER',
        castawayId: c.castaway_id,
        episode: lastEpisode ?? 0,
        points: pts.WINNER,
        description: `Won the game`,
      })
    }

    // FINALIST
    if (c.finalist) {
      events.push({
        type: 'FINALIST',
        castawayId: c.castaway_id,
        episode: lastEpisode ?? 0,
        points: pts.FINALIST,
        description: `Made it to Final Tribal Council`,
      })
    }

    // MADE_JURY
    if (c.jury) {
      events.push({
        type: 'MADE_JURY',
        castawayId: c.castaway_id,
        episode: lastEpisode ?? 0,
        points: pts.MADE_JURY,
        description: `Made the jury`,
      })
    }

    // QUIT
    if (c.result?.toLowerCase().includes('quit')) {
      events.push({
        type: 'QUIT',
        castawayId: c.castaway_id,
        episode: lastEpisode ?? 0,
        points: pts.QUIT,
        description: `Quit the game`,
      })
    }

    // VOTED_OUT_WITH_IDOL: eliminated while holding an idol
    if (
      idolHolders.has(c.castaway_id) &&
      !idolRelinquished.has(c.castaway_id) &&
      c.result !== 'Sole Survivor' &&
      !c.finalist
    ) {
      events.push({
        type: 'VOTED_OUT_WITH_IDOL',
        castawayId: c.castaway_id,
        episode: lastEpisode ?? 0,
        points: pts.VOTED_OUT_WITH_IDOL,
        description: `Voted out while holding an idol`,
      })
    }
  }

  // Note: CAUSED_BLINDSIDE cannot be derived from data
  warnings.push(
    'CAUSED_BLINDSIDE events are not included (requires subjective judgment). Simulated scores will slightly undercount.'
  )

  return { events, warnings }
}
