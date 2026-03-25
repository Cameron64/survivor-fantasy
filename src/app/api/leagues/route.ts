import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { slugify } from '@/lib/utils'

const createLeagueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .optional(),
  seasonId: z.string().optional(),
})

// POST /api/leagues — create a new league, caller becomes COMMISSIONER
export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const result = createLeagueSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 })
  }

  const { name, seasonId } = result.data
  const slug = result.data.slug ?? slugify(name)

  if (!slug) {
    return NextResponse.json({ error: 'Could not generate a valid slug from the league name' }, { status: 400 })
  }

  // Check slug availability
  const existing = await db.league.findFirst({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: `Slug "${slug}" is already taken` }, { status: 409 })
  }

  const league = await db.league.create({
    data: {
      name,
      slug,
      seasonId: seasonId ?? null,
      isActive: true,
      tier: 'FREE',
      memberships: {
        create: {
          userId: user.id,
          role: 'COMMISSIONER',
        },
      },
    },
  })

  return NextResponse.json({ league }, { status: 201 })
}
