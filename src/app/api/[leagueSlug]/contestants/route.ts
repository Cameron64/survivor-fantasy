import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { getValidImageUrl } from '@/lib/utils'
import { createContestantSchema, contestantQuerySchema, formatZodError } from '@/lib/validation'
import { getLeagueBySlug } from '@/lib/league-context'

interface RouteParams {
  params: Promise<{ leagueSlug: string }>
}

// GET /api/[leagueSlug]/contestants - List all contestants
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { leagueSlug } = await params
    const league = await getLeagueBySlug(leagueSlug)
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const user = await getCurrentUser()
    if (!user && !league.isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams

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
        seasonId: league.seasonId ?? undefined,
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
                select: { id: true, name: true, color: true, buffImage: true, isMerge: true },
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

    const sanitized = contestants.map((c) => ({
      ...c,
      imageUrl: getValidImageUrl(c.imageUrl, c.originalImageUrl),
    }))

    return NextResponse.json(sanitized)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching contestants:', error)
    return NextResponse.json({ error: 'Failed to fetch contestants' }, { status: 500 })
  }
}

// POST /api/[leagueSlug]/contestants - Create a new contestant (admin only)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { leagueSlug } = await params
    const body = await req.json()

    const validationResult = createContestantSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: formatZodError(validationResult.error) },
        { status: 400 }
      )
    }

    const { name, nickname, tribe, imageUrl, originalImageUrl, originalSeasons } = validationResult.data

    const league = await getLeagueBySlug(leagueSlug)
    if (!league?.seasonId) {
      return NextResponse.json({ error: 'No active season found — cannot create contestant' }, { status: 400 })
    }

    const contestant = await db.contestant.create({
      data: {
        name,
        nickname,
        tribe,
        imageUrl,
        originalImageUrl,
        originalSeasons,
        seasonId: league.seasonId,
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
