import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, requireAdmin } from '@/lib/auth'
import { createContestantSchema, contestantQuerySchema, formatZodError } from '@/lib/validation'

// GET /api/contestants - List all contestants
export async function GET(req: NextRequest) {
  try {
    await requireUser()

    const searchParams = req.nextUrl.searchParams

    // Validate query parameters (convert null to undefined for Zod)
    const queryResult = contestantQuerySchema.safeParse({
      includeEvents: searchParams.get('includeEvents') || undefined,
      includeMemberships: searchParams.get('includeMemberships') || undefined,
      activeOnly: searchParams.get('activeOnly') || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: formatZodError(queryResult.error) },
        { status: 400 }
      )
    }

    const { includeEvents, includeMemberships, activeOnly } = queryResult.data

    const contestants = await db.contestant.findMany({
      where: {
        ...(activeOnly === 'true' && { isEliminated: false }),
      },
      include: {
        ...(includeEvents === 'true' && {
          events: {
            where: { isApproved: true },
            orderBy: { week: 'desc' },
          },
        }),
        ...(includeMemberships === 'true' && {
          tribeMemberships: {
            where: { toWeek: null },
            include: {
              tribe: {
                select: { id: true, name: true, color: true, buffImage: true },
              },
            },
          },
        }),
        teams: {
          include: {
            team: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(contestants)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching contestants:', error)
    return NextResponse.json({ error: 'Failed to fetch contestants' }, { status: 500 })
  }
}

// POST /api/contestants - Create a new contestant (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()

    // Validate request body with Zod
    const validationResult = createContestantSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatZodError(validationResult.error) },
        { status: 400 }
      )
    }

    const { name, nickname, tribe, imageUrl, originalImageUrl, originalSeasons } = validationResult.data

    const contestant = await db.contestant.create({
      data: {
        name,
        nickname,
        tribe,
        imageUrl,
        originalImageUrl,
        originalSeasons,
      },
    })

    return NextResponse.json(contestant, { status: 201 })
  } catch (error) {
    console.error('Error creating contestant:', error)
    if (error instanceof Error && error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to create contestant' }, { status: 500 })
  }
}
