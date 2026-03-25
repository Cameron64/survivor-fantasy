#!/usr/bin/env tsx
/**
 * Seed staging database from the latest production snapshot.
 *
 * Source: data/snapshots/prod-*.sql (latest)
 * Target: STAGING_DATABASE_URL env var (or hardcoded below)
 *
 * Imports: Show, Season, League, Contestants, Tribes, TribeMemberships,
 *          Episodes, GameEvents, Events
 * Skips:   Users, Teams, TeamContestants, Draft, LeagueMembership, LeagueInvite
 *
 * Usage:
 *   npx tsx scripts/seed-staging.ts
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

const STAGING_URL =
  process.env.STAGING_DATABASE_URL ||
  'postgresql://postgres:mxGveAEDAjBdjSRrdNdzGQBZfxFCxjsF@maglev.proxy.rlwy.net:53481/railway'

const SNAP_DIR = join(__dirname, '..', 'data', 'snapshots')

const BS = String.fromCharCode(92) // actual backslash char
const NULL_MARKER = BS + 'N'       // \N = PostgreSQL null in COPY format
const TERM = BS + '.'              // \. = end of COPY block

// ── Snapshot parsing ──────────────────────────────────────────────────────────

function latestSnapshot(): string {
  const files = readdirSync(SNAP_DIR)
    .filter(f => f.endsWith('.sql') && !f.startsWith('_'))
    .sort()
    .reverse()
  if (!files.length) throw new Error('No snapshots found in ' + SNAP_DIR)
  return join(SNAP_DIR, files[0])
}

function extractTable(sql: string, tableName: string): Record<string, string | null>[] {
  const marker = `COPY public."${tableName}" (`
  const start = sql.indexOf(marker)
  if (start === -1) return []

  const colEnd = sql.indexOf(')', start)
  const colStr = sql.slice(start + marker.length, colEnd)
  const cols = colStr.split(', ').map(c => c.replace(/"/g, '').trim())

  const dataStart = sql.indexOf('FROM stdin;\n', start) + 'FROM stdin;\n'.length
  const dataEnd = sql.indexOf('\n' + TERM, dataStart)
  const dataBlock = dataEnd === -1 ? '' : sql.slice(dataStart, dataEnd)

  return dataBlock
    ? dataBlock
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const vals = line.split('\t')
          const obj: Record<string, string | null> = {}
          cols.forEach((col, i) => {
            obj[col] = vals[i] === NULL_MARKER ? null : (vals[i] ?? null)
          })
          return obj
        })
    : []
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function pg(val: string | null): string {
  if (val === null) return 'NULL'
  // Escape single quotes
  return `'${val.replace(/'/g, "''")}'`
}

function pgBool(val: string | null): string {
  if (val === null) return 'NULL'
  return val === 't' || val === 'true' || val === '1' ? 'TRUE' : 'FALSE'
}

function pgJson(val: string | null): string {
  if (val === null) return 'NULL'
  return `'${val.replace(/'/g, "''")}'::jsonb`
}

function pgTimestamp(val: string | null): string {
  if (val === null) return 'NULL'
  return `'${val}'`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const snapFile = latestSnapshot()
  console.log(`📄 Reading snapshot: ${snapFile}`)
  const sql = readFileSync(snapFile, 'utf8')

  console.log('📊 Parsing tables...')
  const users        = extractTable(sql, 'User')
  const league       = extractTable(sql, 'League')
  const contestants  = extractTable(sql, 'Contestant')
  const tribes       = extractTable(sql, 'Tribe')
  const memberships  = extractTable(sql, 'TribeMembership')
  const episodes     = extractTable(sql, 'Episode')
  const gameEvents   = extractTable(sql, 'GameEvent')
  const events       = extractTable(sql, 'Event')

  console.log(`  Contestants: ${contestants.length}`)
  console.log(`  League: ${league.length}`)
  console.log(`  Tribes: ${tribes.length}`)
  console.log(`  TribeMemberships: ${memberships.length}`)
  console.log(`  Episodes: ${episodes.length}`)
  console.log(`  GameEvents: ${gameEvents.length}`)
  console.log(`  Events: ${events.length}`)

  if (!league.length) throw new Error('No league found in snapshot')

  const leagueRow = league[0]
  const leagueId = leagueRow.id!

  // Find admin user from prod (for event ownership placeholder)
  const adminUser = users.find(u => u.role === 'ADMIN') || users[0]
  if (!adminUser) throw new Error('No users found in snapshot')
  console.log(`\n👤 Using system user: ${adminUser.name} (${adminUser.id})`)

  // Connect to staging
  console.log('\n🔌 Connecting to staging...')
  const client = new Client({ connectionString: STAGING_URL })
  await client.connect()
  console.log('✅ Connected')

  try {
    await client.query('BEGIN')

    // ── 1. Truncate all relevant tables ──────────────────────────────────────
    console.log('\n🗑️  Truncating staging tables...')
    await client.query(`
      TRUNCATE
        "Event", "TribeMembership", "GameEvent", "Episode", "Tribe",
        "TeamContestant", "Team", "Draft", "LeagueMembership", "LeagueInvite",
        "Contestant", "League", "Season", "Show", "User"
      CASCADE
    `)

    // ── 2. Show ──────────────────────────────────────────────────────────────
    console.log('📺 Creating Show (Survivor)...')
    const showId = 'show_survivor'
    await client.query(`
      INSERT INTO "Show" (id, slug, name, description, "isActive", "createdAt")
      VALUES (${pg(showId)}, 'survivor', 'Survivor', 'CBS Survivor reality competition', TRUE, NOW())
    `)

    // ── 3. Season ────────────────────────────────────────────────────────────
    console.log('🗓️  Creating Season 50...')
    const seasonId = 'season_survivor_50'
    await client.query(`
      INSERT INTO "Season" (id, "showId", number, name, "isActive", "createdAt")
      VALUES (${pg(seasonId)}, ${pg(showId)}, 50, 'Season 50: Back to Basics', TRUE, NOW())
    `)

    // ── 4. System user ───────────────────────────────────────────────────────
    console.log('👤 Creating system user...')
    await client.query(`
      INSERT INTO "User" (id, "clerkId", email, name, role, "isPaid", "createdAt", "updatedAt")
      VALUES (
        ${pg(adminUser.id)},
        'system_migration_clerk_id',
        'migration@system.internal',
        'System (Migration)',
        'ADMIN',
        FALSE,
        NOW(),
        NOW()
      )
    `)

    // ── 5. League ────────────────────────────────────────────────────────────
    console.log('🏆 Creating League...')
    await client.query(`
      INSERT INTO "League" (
        id, name, season, "draftStartDate", "draftEndDate", "isActive",
        "paymentInfo", "slackWebhook", "scoringConfig", "gameSettings",
        "allowGuestEvents", "isPublic", "allowUserEvents", "showLastPlace",
        "mergeWeek", "juryStartWeek",
        "enableTribeSwap", "enableSwapMode", "enableDissolutionMode",
        "enableExpansionMode", "enableTribeMerge",
        slug, "seasonId", tier,
        "createdAt", "updatedAt"
      ) VALUES (
        ${pg(leagueId)},
        ${pg(leagueRow.name)},
        ${leagueRow.season ?? 50},
        ${pgTimestamp(leagueRow.draftStartDate)},
        ${pgTimestamp(leagueRow.draftEndDate)},
        ${pgBool(leagueRow.isActive)},
        ${pg(leagueRow.paymentInfo)},
        ${pg(leagueRow.slackWebhook)},
        ${pgJson(leagueRow.scoringConfig)},
        NULL,
        ${pgBool(leagueRow.allowGuestEvents)},
        ${pgBool(leagueRow.isPublic)},
        ${pgBool(leagueRow.allowUserEvents)},
        ${pgBool(leagueRow.showLastPlace)},
        NULL, NULL,
        FALSE, FALSE, FALSE, FALSE, FALSE,
        'legacy',
        ${pg(seasonId)},
        'FREE',
        ${pgTimestamp(leagueRow.createdAt)},
        ${pgTimestamp(leagueRow.updatedAt)}
      )
    `)

    // ── 6. Contestants ───────────────────────────────────────────────────────
    console.log(`👥 Inserting ${contestants.length} contestants...`)
    for (const c of contestants) {
      await client.query(`
        INSERT INTO "Contestant" (
          id, name, nickname, tribe, "imageUrl", "originalImageUrl",
          "originalSeasons", "isEliminated", "eliminatedWeek",
          "seasonId", "createdAt", "updatedAt"
        ) VALUES (
          ${pg(c.id)}, ${pg(c.name)}, ${pg(c.nickname)}, ${pg(c.tribe)},
          ${pg(c.imageUrl)}, ${pg(c.originalImageUrl)},
          ${pg(c.originalSeasons)}, ${pgBool(c.isEliminated)}, ${c.eliminatedWeek ?? 'NULL'},
          ${pg(seasonId)},
          ${pgTimestamp(c.createdAt)}, ${pgTimestamp(c.updatedAt)}
        )
      `)
    }

    // ── 7. Tribes ────────────────────────────────────────────────────────────
    console.log(`🏕️  Inserting ${tribes.length} tribes...`)
    for (const t of tribes) {
      await client.query(`
        INSERT INTO "Tribe" (
          id, name, color, "buffImage", "isMerge",
          "dissolvedAtWeek", "dissolvedByEventId",
          "leagueId", "createdAt", "updatedAt"
        ) VALUES (
          ${pg(t.id)}, ${pg(t.name)}, ${pg(t.color)}, ${pg(t.buffImage)},
          ${pgBool(t.isMerge)},
          NULL, NULL,
          ${pg(t.leagueId)},
          ${pgTimestamp(t.createdAt)}, ${pgTimestamp(t.updatedAt)}
        )
      `)
    }

    // ── 8. Episodes ──────────────────────────────────────────────────────────
    console.log(`📅 Inserting ${episodes.length} episodes...`)
    for (const e of episodes) {
      await client.query(`
        INSERT INTO "Episode" (
          id, number, title, "airDate", "gamePhase", "phaseSource",
          "leagueId", "createdAt", "updatedAt"
        ) VALUES (
          ${pg(e.id)}, ${e.number}, ${pg(e.title)}, ${pgTimestamp(e.airDate)},
          'PRE_MERGE', 'INFERRED',
          ${pg(e.leagueId)},
          ${pgTimestamp(e.createdAt)}, ${pgTimestamp(e.updatedAt)}
        )
      `)
    }

    // ── 9. GameEvents ────────────────────────────────────────────────────────
    console.log(`🎮 Inserting ${gameEvents.length} game events...`)
    for (const ge of gameEvents) {
      // Map all user refs to system user (prod users not imported)
      const submittedById = adminUser.id!
      const approvedById = ge.isApproved === 't' ? adminUser.id! : null
      await client.query(`
        INSERT INTO "GameEvent" (
          id, type, week, data, "settingsSnapshot", "sequenceInEpisode",
          "isApproved", "submittedById", "approvedById",
          "createdAt", "updatedAt"
        ) VALUES (
          ${pg(ge.id)}, ${pg(ge.type)}::"GameEventType", ${ge.week},
          ${pgJson(ge.data)}, NULL, 0,
          ${pgBool(ge.isApproved)},
          ${pg(submittedById)},
          ${pg(approvedById)},
          ${pgTimestamp(ge.createdAt)}, ${pgTimestamp(ge.updatedAt)}
        )
      `)
    }

    // ── 10. Events ───────────────────────────────────────────────────────────
    console.log(`📊 Inserting ${events.length} events...`)
    for (const ev of events) {
      // Map all user refs to system user (prod users not imported)
      const submittedById = adminUser.id!
      const approvedById = ev.isApproved === 't' ? adminUser.id! : null
      await client.query(`
        INSERT INTO "Event" (
          id, type, "contestantId", week, description, points,
          "isApproved", "submittedById", "approvedById",
          "voteRound", "gameEventId",
          "createdAt", "updatedAt"
        ) VALUES (
          ${pg(ev.id)}, ${pg(ev.type)}::"EventType", ${pg(ev.contestantId)},
          ${ev.week}, ${pg(ev.description)}, ${ev.points},
          ${pgBool(ev.isApproved)},
          ${pg(submittedById)},
          ${pg(approvedById)},
          0, ${pg(ev.gameEventId)},
          ${pgTimestamp(ev.createdAt)}, ${pgTimestamp(ev.updatedAt)}
        )
      `)
    }

    // ── 11. TribeMemberships ─────────────────────────────────────────────────
    console.log(`🔗 Inserting ${memberships.length} tribe memberships...`)
    for (const m of memberships) {
      await client.query(`
        INSERT INTO "TribeMembership" (
          id, "contestantId", "tribeId", "fromWeek", "toWeek",
          "gameEventId", "createdAt", "updatedAt"
        ) VALUES (
          ${pg(m.id)}, ${pg(m.contestantId)}, ${pg(m.tribeId)},
          ${m.fromWeek ?? 1}, ${m.toWeek ?? 'NULL'},
          NULL,
          ${pgTimestamp(m.createdAt)}, ${pgTimestamp(m.updatedAt)}
        )
      `)
    }

    await client.query('COMMIT')

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n✅ Import complete! Verifying counts...')
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM "Contestant"'),
      client.query('SELECT COUNT(*) FROM "League"'),
      client.query('SELECT COUNT(*) FROM "Tribe"'),
      client.query('SELECT COUNT(*) FROM "TribeMembership"'),
      client.query('SELECT COUNT(*) FROM "Episode"'),
      client.query('SELECT COUNT(*) FROM "GameEvent"'),
      client.query('SELECT COUNT(*) FROM "Event"'),
    ])

    console.log('\n📈 Staging counts:')
    console.log(`  Contestants:     ${counts[0].rows[0].count}`)
    console.log(`  Leagues:         ${counts[1].rows[0].count}`)
    console.log(`  Tribes:          ${counts[2].rows[0].count}`)
    console.log(`  TribeMemberships:${counts[3].rows[0].count}`)
    console.log(`  Episodes:        ${counts[4].rows[0].count}`)
    console.log(`  GameEvents:      ${counts[5].rows[0].count}`)
    console.log(`  Events:          ${counts[6].rows[0].count}`)

  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('\n❌ Error:', err.message || err)
  process.exit(1)
})
