import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const TIER_PRICES: Record<string, number> = {
  COMMISSIONER: 4900, // $49 in cents
  COMMUNITY: 9900,    // $99 in cents
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { leagueId, tier, leagueSlug } = body as {
    leagueId: string
    tier: string
    leagueSlug: string
  }

  if (!leagueId || !tier || !leagueSlug) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!TIER_PRICES[tier]) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  // Verify caller is COMMISSIONER of this league
  const membership = await db.leagueMembership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  })

  if (!membership || membership.role !== 'COMMISSIONER') {
    return NextResponse.json({ error: 'Forbidden: Commissioner access required' }, { status: 403 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: TIER_PRICES[tier],
          product_data: {
            name: `Castaway ${tier.charAt(0) + tier.slice(1).toLowerCase()} — Season Pass`,
            description: tier === 'COMMISSIONER'
              ? 'Up to 16 players, custom scoring, Slack integration'
              : 'Up to 50 players, custom scoring, Slack integration',
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/${leagueSlug}?payment=success`,
    cancel_url: `${appUrl}/${leagueSlug}/settings?payment=cancelled`,
    metadata: { leagueId, leagueSlug, tier },
  })

  return NextResponse.json({ url: session.url })
}
