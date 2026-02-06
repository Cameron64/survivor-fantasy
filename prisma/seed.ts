import { PrismaClient, Role, EventType } from '@prisma/client'

const prisma = new PrismaClient()

// Survivor 50: In the Hands of the Fans — all 24 returning players
const contestants = [
  { name: 'Jenna Lewis-Dougherty', originalSeasons: '1,8', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/07/c1830276-7793-4369-a3ae-51c3411f7062/260107-jennalewisdougherty.png' },
  { name: 'Colby Donaldson', originalSeasons: '2,8,20', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/07/7a585bd9-de69-4336-a4ed-9e05376af7f1/260107-colbydonaldson.png' },
  { name: 'Stephenie LaGrossa Kendrick', originalSeasons: '10,11,20', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/07/e42dbec7-1cd1-4cba-a095-9540440d0e5c/98300-d1374b.jpg' },
  { name: 'Cirie Fields', originalSeasons: '12,16,20,34', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/07/d35c9e1c-c775-41fb-9389-33a7392a178d/96609-d1622.jpg' },
  { name: 'Ozzy Lusth', originalSeasons: '13,16,23,34', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/d28912ca-aaef-455e-9c8a-923f585da24b/108338-d0357abc.jpg' },
  { name: 'Benjamin Wade', nickname: 'Coach', originalSeasons: '18,20,23', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/3fe563c8-68fd-4c6c-9ad7-e7459f0a2434/100563-d207bm.jpg' },
  { name: 'Aubry Bracco', originalSeasons: '32,34,38', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/7af289a9-6e91-496f-9a9a-e6a2f9ed7c60/112776-0178b.jpg' },
  { name: 'Chrissy Hofbeck', originalSeasons: '35', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/95fae1ee-9331-4856-9865-dc49b0ae7838/110129-0578b2c.jpg' },
  { name: 'Christian Hubicki', originalSeasons: '37', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/7fbe814f-055b-4931-8dbc-4110388e0a65/112406-0229bc.jpg' },
  { name: 'Angelina Keeley', originalSeasons: '37', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/98f11aa7-2503-4b34-ad5d-65c4d7db5299/112406-0922bc.jpg' },
  { name: 'Mike White', originalSeasons: '37', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/2bb30b31-f5e2-41c1-85fc-44e881b6fd2e/112406-0683b.jpg' },
  { name: 'Rick Devens', originalSeasons: '38', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/64fc57db-9b7d-433d-b435-61199e2ef47f/112748-0253b.jpg' },
  { name: 'Jonathan Young', originalSeasons: '42', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/42ae2cf9-73d8-4c57-93d9-d4d7f0dd7a80/117530-1678bc.jpg' },
  { name: 'Dee Valladares', originalSeasons: '45', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/428718b4-54d6-4d52-8308-94cd22dd3b80/1781028-0288bc2.jpg' },
  { name: 'Emily Flippen', originalSeasons: '45', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/568f841b-f194-4298-b959-a206454e881d/1781028-1147bc2.jpg' },
  { name: 'Q Burdette', originalSeasons: '46', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/c6270e7a-30b3-4141-9ffc-5396ada4f84f/1986595-0360bc.jpg' },
  { name: 'Tiffany Ervin', originalSeasons: '46', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/0bb3d4bd-5a04-4353-97cc-e246117ae7fd/1986595-1281bc.jpg' },
  { name: 'Charlie Davis', originalSeasons: '46', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/83742213-e61e-408f-a458-72579ee8382d/1986595-0494bc.jpg' },
  { name: 'Genevieve Mushaluk', originalSeasons: '47', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/efba6173-e6f0-401c-8e89-0ee756d3a1e5/3003745-0762bc.jpg' },
  { name: 'Kamilla Karthigesu', originalSeasons: '48', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/de4b55ab-4fb3-4635-b86e-8276a5bd08f9/3017294-0825b.jpg' },
  { name: 'Kyle Fraser', originalSeasons: '48', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/7ed20b8c-9768-4e4e-b374-191ad7cdf675/3017294-0227b.jpg' },
  { name: 'Joseph Hunter', nickname: 'Joe', originalSeasons: '48', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/7cfbf7c4-51e6-475f-b25b-345569337a59/3017294-1748b2.jpg' },
  { name: 'Rizo Velovic', originalSeasons: '49', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/cd471628-0337-4f7c-afc5-8d054c065d96/3080970-0323bc2.jpg' },
  { name: 'Savannah Louie', originalSeasons: '49', imageUrl: 'https://www.tvguide.com/a/img/hub/2026/01/08/08e89c59-442c-4370-b7b6-2f059ea1edd9/3080970-0667bc2.jpg' },
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
