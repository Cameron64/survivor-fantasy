import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { checkSeasonReadiness } from '@/lib/season-readiness'

// GET /api/season-readiness
export async function GET() {
  try {
    await requireUser()
    const readiness = await checkSeasonReadiness()
    return NextResponse.json(readiness)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error checking season readiness:', error)
    return NextResponse.json({ error: 'Failed to check readiness' }, { status: 500 })
  }
}
