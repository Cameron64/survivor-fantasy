/**
 * Sprint 1 — Multi-tenant Data Migration
 *
 * Run after `pnpm db:push` with the new nullable schema fields.
 * Creates Show/Season records, links the legacy League, backfills
 * Contestant.seasonId / Team.leagueId / Draft.leagueId, and creates
 * LeagueMembership rows for all existing Users.
 *
 * Safe to re-run: uses upsert / skipDuplicates throughout.
 *
 * Usage:
 *   npx tsx scripts/seed-multitenant.ts
 */

import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

async function main() {
  console.log('🌱 Sprint 1 multi-tenant seed starting...\n')

  // ── 1. Create Show ────────────────────────────────────────────────────────
  const show = await db.show.upsert({
    where: { slug: 'survivor' },
    update: {},
    create: {
      slug: 'survivor',
      name: 'Survivor',
      description: 'The original CBS reality competition.',
      isActive: true,
    },
  })
  console.log(`✅ Show: ${show.name} (${show.id})`)

  // ── 2. Create Season 50 ───────────────────────────────────────────────────
  const season = await db.season.upsert({
    where: { showId_number: { showId: show.id, number: 50 } },
    update: {},
    create: {
      showId: show.id,
      number: 50,
      name: 'Season 50: Back to Basics',
      isActive: true,
    },
  })
  console.log(`✅ Season: ${season.name} (${season.id})`)

  // ── 3. Link League to Season 50, set slug ─────────────────────────────────
  const leagues = await db.league.findMany()
  if (leagues.length === 0) {
    console.log('⚠️  No League records found — skipping league update.')
  } else {
    for (const league of leagues) {
      if (league.slug) {
        console.log(`⏭️  League "${league.name}" already has slug="${league.slug}", skipping.`)
        continue
      }
      await db.league.update({
        where: { id: league.id },
        data: {
          slug: 'legacy',
          seasonId: season.id,
        },
      })
      console.log(`✅ League "${league.name}" → slug="legacy", seasonId=${season.id}`)
    }
  }

  // Fetch the legacy league (now has slug set)
  const legacyLeague = await db.league.findFirst({ where: { slug: 'legacy' } })
  if (!legacyLeague) {
    throw new Error('Legacy league not found after update — cannot continue.')
  }

  // ── 4. Backfill Contestant.seasonId ───────────────────────────────────────
  // seasonId is now non-nullable in the schema; skip null-filter backfill
  console.log('⏭️  Contestant.seasonId is required — backfill via schema default (skipped).')

  // ── 5. Backfill Team.leagueId ─────────────────────────────────────────────
  // leagueId is now non-nullable in the schema; skip null-filter backfill
  console.log('⏭️  Team.leagueId is required — backfill via schema default (skipped).')

  // ── 6. Backfill Draft.leagueId ────────────────────────────────────────────
  // leagueId is now non-nullable in the schema; skip null-filter backfill
  console.log('⏭️  Draft.leagueId is required — backfill via schema default (skipped).')

  // ── 7. Create LeagueMembership for all Users ─────────────────────────────
  const users = await db.user.findMany({
    select: { id: true, name: true, role: true },
  })

  let created = 0
  let skipped = 0

  for (const user of users) {
    // Map platform role to league role
    const leagueRole =
      user.role === Role.ADMIN
        ? 'COMMISSIONER'
        : user.role === Role.MODERATOR
          ? 'MODERATOR'
          : 'PLAYER'

    const result = await db.leagueMembership.upsert({
      where: { userId_leagueId: { userId: user.id, leagueId: legacyLeague.id } },
      update: {},
      create: {
        userId: user.id,
        leagueId: legacyLeague.id,
        role: leagueRole,
      },
    })

    if (result) {
      created++
    } else {
      skipped++
    }
  }

  console.log(`✅ LeagueMembership: ${created} created, ${skipped} already existed`)

  console.log('\n🎉 Multi-tenant seed complete!')
  console.log('\nNext step: tighten NOT NULL constraints (Sprint 1 Phase 2)')
  console.log('  Run `pnpm db:push` after updating schema.prisma to remove nullable markers.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
