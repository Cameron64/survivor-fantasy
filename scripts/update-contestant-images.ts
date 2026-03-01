/**
 * Script to bulk update contestant images
 *
 * Usage:
 * 1. Update the IMAGE_UPDATES object below with contestant names and image URLs
 * 2. Run: npx tsx scripts/update-contestant-images.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Update these with the actual image URLs
const IMAGE_UPDATES: Record<string, string> = {
  // Format: 'Contestant Name': 'https://direct-image-url.jpg'

  // 'Coach': 'PASTE_COACH_IMAGE_URL_HERE',
  // 'Chrissy Hofbeck': 'PASTE_CHRISSY_IMAGE_URL_HERE',
  // 'Christian': 'PASTE_CHRISTIAN_IMAGE_URL_HERE',
  // 'Cirie Fields': 'PASTE_CIRIE_IMAGE_URL_HERE',
  // 'Colby': 'PASTE_COLBY_IMAGE_URL_HERE',
  'Genevieve Mushaluk': 'https://s.yimg.com/ny/api/res/1.2/fzfPhCbuQO3om86FbhwpLQ--/YXBwaWQ9aGlnaGxhbmRlcjt3PTI0MDA7aD0zMzYwO2NmPXdlYnA-/https://media.zenfs.com/en/in_touch_weekly_336/430f99816ac3932f0ab903dfa1edc021',
  // 'Rick': 'PASTE_RICK_IMAGE_URL_HERE',
}

async function updateContestantImages() {
  console.log('🚀 Starting contestant image updates...\n')

  let updated = 0
  let notFound = 0
  let errors = 0

  for (const [name, imageUrl] of Object.entries(IMAGE_UPDATES)) {
    try {
      // Try exact match first
      let contestant = await prisma.contestant.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true, name: true, originalImageUrl: true }
      })

      // If not found, try partial match
      if (!contestant) {
        contestant = await prisma.contestant.findFirst({
          where: { name: { contains: name, mode: 'insensitive' } },
          select: { id: true, name: true, originalImageUrl: true }
        })
      }

      if (!contestant) {
        console.log(`❌ Not found: ${name}`)
        notFound++
        continue
      }

      // Update the image URL and preserve original
      await prisma.contestant.update({
        where: { id: contestant.id },
        data: {
          imageUrl,
          // Only set originalImageUrl if it's not already set
          ...(contestant.originalImageUrl ? {} : { originalImageUrl: imageUrl })
        },
      })

      console.log(`✅ Updated: ${contestant.name}`)
      console.log(`   URL: ${imageUrl.substring(0, 60)}...`)
      updated++
    } catch (error) {
      console.error(`❌ Error updating ${name}:`, error)
      errors++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ❌ Not found: ${notFound}`)
  console.log(`   🔥 Errors: ${errors}`)
  console.log('\n✨ Done!')
}

updateContestantImages()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
