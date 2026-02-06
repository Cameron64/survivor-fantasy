import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error: Verification failed', {
      status: 400,
    })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, unsafe_metadata, public_metadata } =
      evt.data

    const email = email_addresses[0]?.email_address
    if (!email) {
      return new Response('Error: No email address', { status: 400 })
    }

    const name = [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0]

    // Check if user was invited
    const invitedById = unsafe_metadata?.invitedById as string | undefined

    await db.user.create({
      data: {
        clerkId: id,
        email,
        name,
        role: (public_metadata?.role as Role) || Role.USER,
        isPaid: (public_metadata?.isPaid as boolean) || false,
        invitedById: invitedById || null,
      },
    })

    console.log(`User created: ${email}`)
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data

    const email = email_addresses[0]?.email_address
    if (!email) {
      return new Response('Error: No email address', { status: 400 })
    }

    const name = [first_name, last_name].filter(Boolean).join(' ') || email.split('@')[0]

    const existingUser = await db.user.findUnique({
      where: { clerkId: id },
    })

    if (existingUser) {
      await db.user.update({
        where: { clerkId: id },
        data: {
          email,
          name,
          role: (public_metadata?.role as Role) || existingUser.role,
          isPaid: (public_metadata?.isPaid as boolean) ?? existingUser.isPaid,
        },
      })
      console.log(`User updated: ${email}`)
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    if (id) {
      // Delete user's team and related data first
      const user = await db.user.findUnique({
        where: { clerkId: id },
        include: { team: true },
      })

      if (user) {
        if (user.team) {
          await db.teamContestant.deleteMany({
            where: { teamId: user.team.id },
          })
          await db.team.delete({
            where: { id: user.team.id },
          })
        }

        await db.user.delete({
          where: { clerkId: id },
        })
        console.log(`User deleted: ${id}`)
      }
    }
  }

  return new Response('Webhook processed', { status: 200 })
}
