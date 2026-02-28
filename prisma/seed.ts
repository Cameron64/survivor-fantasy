import { PrismaClient, Role, EventType } from '@prisma/client'

const prisma = new PrismaClient()

// Survivor 50: In the Hands of the Fans — all 24 returning players
const contestants = [
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
]

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data (in reverse order of dependencies)
  await prisma.event.deleteMany()
  await prisma.tribeMembership.deleteMany()
  await prisma.tribe.deleteMany()
  await prisma.episode.deleteMany()
  await prisma.teamContestant.deleteMany()
  await prisma.team.deleteMany()
  await prisma.draft.deleteMany()
  await prisma.league.deleteMany()
  await prisma.contestant.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Cleared existing data')

  // Create league
  const league = await prisma.league.create({
    data: {
      name: 'Survivor 50 Fantasy League',
      season: 50,
      isActive: true,
    },
  })
  console.log(`✅ Created league: ${league.name}`)

  // Create contestants
  const createdContestants = await Promise.all(
    contestants.map((contestant) =>
      prisma.contestant.create({
        data: {
          name: contestant.name,
          nickname: 'nickname' in contestant ? (contestant as { nickname?: string }).nickname : undefined,
          imageUrl: contestant.imageUrl,
          originalSeasons: contestant.originalSeasons,
        },
      })
    )
  )
  console.log(`✅ Created ${createdContestants.length} contestants`)

  // No tribes seeded — tribes are formed during episode 1

  // Create 13 episodes starting Feb 25, 2026 (weekly on Wednesdays)
  const episodeStart = new Date('2026-02-25T20:00:00Z')
  const episodeData = Array.from({ length: 13 }, (_, i) => {
    const airDate = new Date(episodeStart)
    airDate.setDate(airDate.getDate() + i * 7)
    return {
      number: i + 1,
      airDate,
      leagueId: league.id,
    }
  })

  await prisma.episode.createMany({ data: episodeData })
  console.log(`✅ Created ${episodeData.length} episodes`)

  // Create admin user (for testing - will be synced from Clerk in production)
  const adminUser = await prisma.user.create({
    data: {
      clerkId: 'user_test_admin',
      email: 'admin@test.com',
      name: 'Test Admin',
      role: Role.ADMIN,
      isPaid: true,
      inviteCode: 'SURVIVOR50',
    },
  })
  console.log(`✅ Created admin user: ${adminUser.email}`)

  // Create moderator user
  const modUser = await prisma.user.create({
    data: {
      clerkId: 'user_test_mod',
      email: 'mod@test.com',
      name: 'Sarah Moderator',
      role: Role.MODERATOR,
      isPaid: true,
      invitedById: adminUser.id,
    },
  })
  console.log(`✅ Created moderator user: ${modUser.email}`)

  // Create 18 regular users (20 total with admin + mod)
  const userNames = [
    { name: 'Jake Morrison', email: 'jake@test.com' },
    { name: 'Tanya Chen', email: 'tanya@test.com' },
    { name: 'Marcus Johnson', email: 'marcus@test.com' },
    { name: 'Lily Patel', email: 'lily@test.com' },
    { name: 'Derek Washington', email: 'derek@test.com' },
    { name: 'Megan O\'Brien', email: 'megan@test.com' },
    { name: 'Ryan Kowalski', email: 'ryan@test.com' },
    { name: 'Priya Sharma', email: 'priya@test.com' },
    { name: 'Carlos Reyes', email: 'carlos@test.com' },
    { name: 'Emma Fitzgerald', email: 'emma@test.com' },
    { name: 'Noah Kim', email: 'noah@test.com' },
    { name: 'Aisha Williams', email: 'aisha@test.com' },
    { name: 'Tyler Nguyen', email: 'tyler@test.com' },
    { name: 'Grace Hendricks', email: 'grace@test.com' },
    { name: 'Brandon Lee', email: 'brandon@test.com' },
    { name: 'Olivia Santos', email: 'olivia@test.com' },
    { name: 'Ethan Brooks', email: 'ethan@test.com' },
    { name: 'Zoe Abrams', email: 'zoe@test.com' },
  ]

  const regularUsers = await Promise.all(
    userNames.map((u, i) =>
      prisma.user.create({
        data: {
          clerkId: `user_test_${i + 1}`,
          email: u.email,
          name: u.name,
          role: Role.USER,
          isPaid: true,
          invitedById: adminUser.id,
        },
      })
    )
  )
  console.log(`✅ Created ${regularUsers.length} regular users (${regularUsers.length + 2} total)`)

  const testUser = regularUsers[0] // Jake Morrison used as the primary test user

  // Create a team for the test user
  const team = await prisma.team.create({
    data: {
      userId: testUser.id,
      contestants: {
        create: [
          { contestantId: createdContestants[0].id, draftOrder: 1 },
          { contestantId: createdContestants[7].id, draftOrder: 2 },
        ],
      },
    },
  })
  console.log(`✅ Created team for test user with 2 contestants`)

  // Create some sample events
  const sampleEvents = await Promise.all([
    prisma.event.create({
      data: {
        type: EventType.INDIVIDUAL_IMMUNITY_WIN,
        contestantId: createdContestants[0].id,
        week: 1,
        points: 5,
        isApproved: true,
        submittedById: adminUser.id,
        approvedById: adminUser.id,
        description: 'Won the first individual immunity challenge',
      },
    }),
    prisma.event.create({
      data: {
        type: EventType.CORRECT_VOTE,
        contestantId: createdContestants[0].id,
        week: 1,
        points: 2,
        isApproved: true,
        submittedById: adminUser.id,
        approvedById: adminUser.id,
      },
    }),
    prisma.event.create({
      data: {
        type: EventType.ZERO_VOTES_RECEIVED,
        contestantId: createdContestants[7].id,
        week: 1,
        points: 1,
        isApproved: true,
        submittedById: adminUser.id,
        approvedById: adminUser.id,
      },
    }),
    // Pending event for testing approval flow
    prisma.event.create({
      data: {
        type: EventType.IDOL_FIND,
        contestantId: createdContestants[2].id,
        week: 2,
        points: 3,
        isApproved: false,
        submittedById: testUser.id,
        description: 'Found hidden immunity idol at camp',
      },
    }),
  ])
  console.log(`✅ Created ${sampleEvents.length} sample events`)

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
