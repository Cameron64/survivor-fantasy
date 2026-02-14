import { NextResponse } from 'next/server'
import { requireSimUser } from '../auth'
import { getAvailableSeasons } from '@/simulation/engine'

export async function GET() {
  try {
    await requireSimUser()
    const seasons = getAvailableSeasons()
    return NextResponse.json({ seasons })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    return NextResponse.json({ error: 'Failed to load seasons' }, { status: 500 })
  }
}
