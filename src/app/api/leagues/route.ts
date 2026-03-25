import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/leagues — public, no auth required
export async function GET() {
  try {
    const leagues = await db.league.findMany({
      where: { isPublic: true, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        season: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(leagues)
  } catch (error) {
    console.error('Error fetching leagues:', error)
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 })
  }
}
