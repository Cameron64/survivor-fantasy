import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { DEFAULT_FLAGS } from '@/lib/feature-flags'
import type { FeatureFlags } from '@/lib/feature-flags'
import { ensureFeatureFlagColumns } from '@/lib/ensure-feature-flag-columns'
import { getLeagueBySlug, getLegacyLeague } from '@/lib/league-context'

/**
 * PATCH /api/admin/feature-flags
 * Update feature flags in the active league (admin only).
 * Accepts optional `leagueSlug` in request body; falls back to legacy league.
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await ensureFeatureFlagColumns()

    const body = await req.json()

    const league = body.leagueSlug
      ? await getLeagueBySlug(body.leagueSlug)
      : await getLegacyLeague()
    if (!league) {
      return NextResponse.json(
        { error: 'No active league found' },
        { status: 404 }
      )
    }

    // Build SET clause from provided boolean flags
    const flagNames = [
      'enableTribeSwap',
      'enableSwapMode',
      'enableDissolutionMode',
      'enableExpansionMode',
      'enableTribeMerge',
    ] as const

    const setClauses: string[] = []
    const values: unknown[] = []

    for (const flag of flagNames) {
      if (typeof body[flag] === 'boolean') {
        setClauses.push(`"${flag}" = $${values.length + 1}`)
        values.push(body[flag])
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No valid flags provided' },
        { status: 400 }
      )
    }

    // Add league id as last param
    values.push(league.id)

    await db.$executeRawUnsafe(
      `UPDATE "League" SET ${setClauses.join(', ')} WHERE "id" = $${values.length}`,
      ...values
    )

    // Read back current values
    const rows = await db.$queryRawUnsafe<FeatureFlags[]>(
      `SELECT "enableTribeSwap", "enableSwapMode", "enableDissolutionMode", "enableExpansionMode", "enableTribeMerge" FROM "League" WHERE "id" = $1`,
      league.id
    )

    const row = rows[0] ?? DEFAULT_FLAGS
    return NextResponse.json(row)
  } catch (error) {
    console.error('Failed to update feature flags:', error)
    return NextResponse.json(
      { error: 'Failed to update feature flags' },
      { status: 500 }
    )
  }
}
