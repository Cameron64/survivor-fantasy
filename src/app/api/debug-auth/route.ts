import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  const hdrs = await headers()
  const authHeader = hdrs.get('authorization')
  const actingUser = hdrs.get('x-acting-user')
  const apiKey = process.env.BOT_API_KEY

  return NextResponse.json({
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 20),
    hasActingUser: !!actingUser,
    actingUser,
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey?.substring(0, 10),
    headersMatch: authHeader === `Bearer ${apiKey}`,
  })
}
