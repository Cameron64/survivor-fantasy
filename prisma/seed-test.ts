/**
 * Test database seed script.
 * Creates isolated test data that doesn't affect production/development data.
 *
 * Usage: DATABASE_URL=<test-db-url> pnpm db:seed:test
 */
import { PrismaClient, Role, EventType } from '@prisma/client'

const prisma = new PrismaClient()

// Minimal test contestants (subset for faster tests)
const testContestants = [
  { name: 'Test Player A', originalSeasons: '1' },
  { name: 'Test Player B', originalSeasons: '2' },
  { name: 'Test Player C', originalSeasons: '3' },
  { name: 'Test Player D', originalSeasons: '4' },
  { name: 'Test Player E', originalSeasons: '5' },
  { name: 'Test Player F', originalSeasons: '6' },
]

async function seedTestDatabase() {
  console.log('🧪 Seeding test database...')

  // Clear all existing test data
  await prisma.event.deleteMany()
  await prisma.gameEvent.deleteMany()
  await prisma.tribeMembership.deleteMany()
  await prisma.tribe.deleteMany()
  await prisma.episode.deleteMany()
  await prisma.teamContestant.deleteMany()
  await prisma.team.deleteMany()
  await prisma.draft.deleteMany()
  await prisma.league.deleteMany()
  await prisma.contestant.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Cleared existing test data')

  // Create test league
  const league = await prisma.league.create({
    data: {
      name: 'E2E Test League',
      season: 99, // Clearly a test league
      isActive: true,
    },
  })
  console.log(`✅ Created test league: ${league.name}`)

  // Create test contestants
  const contestants = await Promise.all(
    testContestants.map((c) =>
      prisma.contestant.create({
        data: {
          name: c.name,
          originalSeasons: c.originalSeasons,
        },
      })
    )
  )
  console.log(`✅ Created ${contestants.length} test contestants`)

  // Create two tribes
  const tribeA = await prisma.tribe.create({
    data: {
      name: 'Alpha',
      color: '#FF5733',
      isMerge: false,
      leagueId: league.id,
    },
  })
  const tribeB = await prisma.tribe.create({
    data: {
      name: 'Beta',
      color: '#3498DB',
      isMerge: false,
      leagueId: league.id,
    },
  })

  // Assign contestants to tribes
  await prisma.tribeMembership.createMany({
    data: [
      { contestantId: contestants[0].id, tribeId: tribeA.id, fromWeek: 1 },
      { contestantId: contestants[1].id, tribeId: tribeA.id, fromWeek: 1 },
      { contestantId: contestants[2].id, tribeId: tribeA.id, fromWeek: 1 },
      { contestantId: contestants[3].id, tribeId: tribeB.id, fromWeek: 1 },
      { contestantId: contestants[4].id, tribeId: tribeB.id, fromWeek: 1 },
      { contestantId: contestants[5].id, tribeId: tribeB.id, fromWeek: 1 },
    ],
  })
  console.log(`✅ Created 2 tribes with tribe memberships`)

  // Create test episodes
  const episodeStart = new Date('2099-01-01T20:00:00Z')
  await prisma.episode.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({
      number: i + 1,
      airDate: new Date(episodeStart.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      leagueId: league.id,
    })),
  })
  console.log(`✅ Created 5 test episodes`)

  // Create test users with real Clerk IDs (created via scripts/create-test-users.ts)
  const adminUser = await prisma.user.create({
    data: {
      clerkId: 'user_39H6pR74TsSowJTwawzWAoeRUVD',
      email: 'e2e-admin@example.com',
      name: 'E2E Admin',
      role: Role.ADMIN,
      isPaid: true,
      inviteCode: 'TESTLEAGUE',
    },
  })

  const modUser = await prisma.user.create({
    data: {
      clerkId: 'user_39H6pRBmYHqimOuVr2bYfM92cjJ',
      email: 'e2e-mod@example.com',
      name: 'E2E Moderator',
      role: Role.MODERATOR,
      isPaid: true,
      invitedById: adminUser.id,
    },
  })

  const regularUser = await prisma.user.create({
    data: {
      clerkId: 'user_39H6pUDPStU61z9EyisZBWqXW9m',
      email: 'e2e-user@example.com',
      name: 'E2E User',
      role: Role.USER,
      isPaid: true,
      invitedById: adminUser.id,
    },
  })
  console.log(`✅ Created 3 test users (admin, mod, user)`)

  // Create a team for the regular user
  await prisma.team.create({
    data: {
      userId: regularUser.id,
      contestants: {
        create: [
          { contestantId: contestants[0].id, draftOrder: 1 },
          { contestantId: contestants[3].id, draftOrder: 2 },
        ],
      },
    },
  })
  console.log(`✅ Created team for test user`)

  // Create sample approved events
  await prisma.event.createMany({
    data: [
      {
        type: EventType.INDIVIDUAL_IMMUNITY_WIN,
        contestantId: contestants[0].id,
        week: 1,
        points: 5,
        isApproved: true,
        submittedById: adminUser.id,
        approvedById: adminUser.id,
      },
      {
        type: EventType.CORRECT_VOTE,
        contestantId: contestants[0].id,
        week: 1,
        points: 2,
        isApproved: true,
        submittedById: adminUser.id,
        approvedById: adminUser.id,
      },
    ],
  })
  console.log(`✅ Created 2 approved sample events`)

  // Create a pending event for approval testing
  await prisma.event.create({
    data: {
      type: EventType.IDOL_FIND,
      contestantId: contestants[1].id,
      week: 2,
      points: 3,
      isApproved: false,
      submittedById: regularUser.id,
    },
  })
  console.log(`✅ Created 1 pending event`)

  console.log('🎉 Test database seeded successfully!')

  return {
    league,
    contestants,
    tribes: [tribeA, tribeB],
    users: { admin: adminUser, mod: modUser, user: regularUser },
  }
}

// Export for programmatic use
export { seedTestDatabase }

// Run directly
if (require.main === module) {
  seedTestDatabase()
    .catch((e) => {
      console.error('❌ Test seed failed:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
