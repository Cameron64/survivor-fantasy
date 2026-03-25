/**
 * Staging seed — idempotent, safe to re-run.
 *
 * Usage:
 *   DATABASE_URL=<staging-url> pnpm db:seed:staging
 *
 * Prerequisites (run once after schema changes):
 *   pnpm prisma generate
 *
 * What it sets up:
 *   - Show: Survivor (show_survivor)
 *   - Season: S50 Back to Basics (season_survivor_50)
 *   - League: Survivor 50 Fantasy League (slug=legacy)
 *   - 24 S50 contestants linked to the season
 *   - 3 tribes: Cila, Vatu, Kalo
 *   - 13 weekly episodes starting Feb 25, 2026
 *   - Cam's user with clerkId user_39GSIvoMnjUWta9k0Vj8frUdCtg, role=ADMIN
 *
 * Safe to re-run: uses upserts throughout, never deletes approved events.
 * Does NOT touch production.
 */

import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

// ── Known IDs (match existing staging data) ───────────────────────────────────
const SHOW_ID = 'show_survivor'
const SEASON_ID = 'season_survivor_50'
const LEAGUE_ID = 'cmlcabvxu00001ec0xfvp4r61'

// Cam's real Clerk user ID (from prod query 2026-03-24)
const CAM_CLERK_ID = 'user_39GSIvoMnjUWta9k0Vj8frUdCtg'

// ── Survivor S50: In the Hands of the Fans — all 24 returning players ─────────
const CONTESTANTS = [
  { name: 'Jenna Lewis-Dougherty', originalSeasons: '1,8', imageUrl: '/contestants/jenna-lewis-dougherty.jpg' },
  { name: 'Colby Donaldson', originalSeasons: '2,8,20', imageUrl: '/contestants/colby-donaldson.jpg' },
  { name: 'Stephenie LaGrossa Kendrick', originalSeasons: '10,11,20', imageUrl: '/contestants/stephenie-lagrossa-kendrick.jpg' },
  { name: 'Cirie Fields', originalSeasons: '12,16,20,34', imageUrl: '/contestants/cirie-fields.jpg' },
  { name: 'Ozzy Lusth', originalSeasons: '13,16,23,34', imageUrl: '/contestants/ozzy-lusth.jpg' },
  { name: 'Benjamin Wade', nickname: 'Coach', originalSeasons: '18,20,23', imageUrl: '/contestants/benjamin-wade.jpg' },
  { name: 'Aubry Bracco', originalSeasons: '32,34,38', imageUrl: '/contestants/aubry-bracco.jpg' },
  { name: 'Chrissy Hofbeck', originalSeasons: '35', imageUrl: '/contestants/chrissy-hofbeck.jpg' },
  { name: 'Christian Hubicki', originalSeasons: '37', imageUrl: '/contestants/christian-hubicki.jpg' },
  { name: 'Angelina Keeley', originalSeasons: '37', imageUrl: '/contestants/angelina-keeley.jpg' },
  { name: 'Mike White', originalSeasons: '37', imageUrl: '/contestants/mike-white.jpg' },
  { name: 'Rick Devens', originalSeasons: '38', imageUrl: '/contestants/rick-devens.jpg' },
  { name: 'Jonathan Young', originalSeasons: '42', imageUrl: '/contestants/jonathan-young.jpg' },
  { name: 'Dee Valladares', originalSeasons: '45', imageUrl: '/contestants/dee-valladares.jpg' },
  { name: 'Emily Flippen', originalSeasons: '45', imageUrl: '/contestants/emily-flippen.jpg' },
  { name: 'Q Burdette', originalSeasons: '46', imageUrl: '/contestants/q-burdette.jpg' },
  { name: 'Tiffany Ervin', originalSeasons: '46', imageUrl: '/contestants/tiffany-ervin.jpg' },
  { name: 'Charlie Davis', originalSeasons: '46', imageUrl: '/contestants/charlie-davis.jpg' },
  { name: 'Genevieve Mushaluk', originalSeasons: '47', imageUrl: '/contestants/genevieve-mushaluk.jpg' },
  { name: 'Kamilla Karthigesu', originalSeasons: '48', imageUrl: '/contestants/kamilla-karthigesu.jpg' },
  { name: 'Kyle Fraser', originalSeasons: '48', imageUrl: '/contestants/kyle-fraser.jpg' },
  { name: 'Joseph Hunter', nickname: 'Joe', originalSeasons: '48', imageUrl: '/contestants/joseph-hunter.jpg' },
  { name: 'Rizo Velovic', originalSeasons: '49', imageUrl: '/contestants/rizo-velovic.jpg' },
  { name: 'Savannah Louie', originalSeasons: '49', imageUrl: '/contestants/savannah-louie.jpg' },
] as const

const TRIBES = [
  { name: 'Cila', color: '#f28c28', buffImage: '/buffs/cila.png' },
  { name: 'Vatu', color: '#ff66cc', buffImage: '/buffs/vatu.png' },
  { name: 'Kalo', color: '#7fecf2', buffImage: '/buffs/kalo.png' },
] as const

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding staging environment...\n')

  // 1. Show
  await prisma.show.upsert({
    where: { id: SHOW_ID },
    create: {
      id: SHOW_ID,
      slug: 'survivor',
      name: 'Survivor',
      description: 'CBS Survivor reality competition',
      isActive: true,
    },
    update: {},
  })
  console.log('✅ Show: Survivor')

  // 2. Season
  await prisma.season.upsert({
    where: { id: SEASON_ID },
    create: {
      id: SEASON_ID,
      showId: SHOW_ID,
      number: 50,
      name: 'Season 50: Back to Basics',
      isActive: true,
    },
    update: {},
  })
  console.log('✅ Season: S50 Back to Basics')

  // 3. League (the existing S50 legacy league)
  await prisma.league.upsert({
    where: { id: LEAGUE_ID },
    create: {
      id: LEAGUE_ID,
      name: 'Survivor 50 Fantasy League',
      season: 50,
      slug: 'legacy',
      seasonId: SEASON_ID,
      isActive: true,
      isPublic: true,
      allowGuestEvents: true,
      allowUserEvents: true,
      tier: 'FREE',
    },
    update: {
      slug: 'legacy',
      seasonId: SEASON_ID,
    },
  })
  console.log('✅ League: Survivor 50 Fantasy League (slug=legacy)')

  // 4. Contestants — check count, create missing ones by name
  const existingCount = await prisma.contestant.count({ where: { seasonId: SEASON_ID } })
  if (existingCount >= CONTESTANTS.length) {
    console.log(`⏭️  Contestants: ${existingCount} already exist, skipping`)
  } else {
    let created = 0
    for (const c of CONTESTANTS) {
      const exists = await prisma.contestant.findFirst({
        where: { name: c.name, seasonId: SEASON_ID },
        select: { id: true },
      })
      if (!exists) {
        await prisma.contestant.create({
          data: { ...c, seasonId: SEASON_ID },
        })
        created++
      }
    }
    console.log(`✅ Contestants: created ${created}, ${CONTESTANTS.length - created} already existed`)
  }

  // 5. Tribes (@@unique on [leagueId, name])
  for (const tribe of TRIBES) {
    await prisma.tribe.upsert({
      where: { leagueId_name: { leagueId: LEAGUE_ID, name: tribe.name } },
      create: { ...tribe, leagueId: LEAGUE_ID },
      update: {},
    })
  }
  console.log('✅ Tribes: Cila, Vatu, Kalo')

  // 6. Episodes — 13 weekly from Feb 25, 2026 (@@unique on [leagueId, number])
  const episodeStart = new Date('2026-02-25T20:00:00Z')
  for (let i = 0; i < 13; i++) {
    const airDate = new Date(episodeStart)
    airDate.setDate(airDate.getDate() + i * 7)
    await prisma.episode.upsert({
      where: { leagueId_number: { leagueId: LEAGUE_ID, number: i + 1 } },
      create: { number: i + 1, airDate, leagueId: LEAGUE_ID },
      update: {},
    })
  }
  console.log('✅ Episodes: 13 weekly from Feb 25, 2026')

  // 7. Cam's user — ADMIN role, matches his real Clerk account
  await prisma.user.upsert({
    where: { clerkId: CAM_CLERK_ID },
    create: {
      clerkId: CAM_CLERK_ID,
      email: 'cameronrodriguez1@gmail.com',
      name: 'Cameron Dowdle',
      role: Role.ADMIN,
      isPaid: true,
    },
    update: {
      role: Role.ADMIN,
      isPaid: true,
    },
  })
  console.log('✅ User: Cameron Dowdle (ADMIN, clerkId=user_39GSIvoMnjUWta9k0Vj8frUdCtg)')

  console.log('\n🎉 Staging seed complete!')
  console.log('   Sign in at staging with: cameronrodriguez1@gmail.com')
  console.log('   Legacy league: /leaderboard (slug=legacy)')
  console.log('   Create new league: /leagues/new')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
