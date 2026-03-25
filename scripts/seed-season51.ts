/**
 * Seed script for Survivor Season 51.
 *
 * Upserts the Survivor show and creates the Season 51 record.
 * Safe to re-run.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/seed-season51.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

async function main() {
  console.log('Seeding Season 51...')

  const show = await db.show.upsert({
    where: { slug: 'survivor' },
    create: {
      slug: 'survivor',
      name: 'Survivor',
      description: 'The original CBS reality competition.',
      isActive: true,
    },
    update: {},
  })
  console.log(`Show: "${show.name}" (id: ${show.id})`)

  const season = await db.season.upsert({
    where: { showId_number: { showId: show.id, number: 51 } },
    create: {
      showId: show.id,
      number: 51,
      name: 'Season 51',
      isActive: false,
    },
    update: {},
  })
  console.log(`Season: "${season.name}" (id: ${season.id}, isActive: ${season.isActive})`)

  console.log('Done.')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
