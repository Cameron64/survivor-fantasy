import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import type Stripe from 'stripe'

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (webhookSecret) {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }
    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
    }
  } else {
    // Local dev: skip signature verification
    event = JSON.parse(body) as Stripe.Event
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { leagueId, tier } = session.metadata ?? {}

    if (leagueId && tier) {
      await db.league.update({
        where: { id: leagueId },
        data: {
          tier: tier as 'FREE' | 'COMMISSIONER' | 'COMMUNITY',
          paidUntil: addMonths(new Date(), 6),
          stripeCustomerId: session.customer as string | null,
        },
      })
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id

    if (customerId) {
      await db.league.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          tier: 'FREE',
          paidUntil: null,
        },
      })
    }
  }

  return NextResponse.json({ received: true })
}
