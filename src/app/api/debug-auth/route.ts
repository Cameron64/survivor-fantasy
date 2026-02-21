import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const hdrs = await headers()
  const authHeader = hdrs.get('authorization')
  const actingUserId = hdrs.get('x-acting-user')
  const apiKey = process.env.BOT_API_KEY

  let dbUser = null
  let dbError = null
  if (actingUserId) {
    try {
      dbUser = await db.user.findUnique({
        where: { id: actingUserId },
        select: { id: true, name: true, role: true },
      })
    } catch (e) {
      dbError = String(e)
    }
  }

  let currentUser = null
  let currentUserError = null
  try {
    currentUser = await getCurrentUser()
  } catch (e) {
    currentUserError = String(e)
  }

  let allUsers = null
  try {
    allUsers = await db.user.findMany({
      select: { id: true, name: true, role: true },
    })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 20),
    hasActingUser: !!actingUserId,
    actingUserId,
    hasApiKey: !!apiKey,
    headersMatch: authHeader === `Bearer ${apiKey}`,
    dbUser,
    dbError,
    currentUser: currentUser ? { id: currentUser.id, name: currentUser.name } : null,
    currentUserError,
    allUsers,
  })
}
