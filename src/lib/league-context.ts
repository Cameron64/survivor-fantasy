import { db } from './db'

/**
 * The slug for the original single-tenant league.
 * All current findFirst() call sites resolve to this league during Sprint 1.
 * In Sprint 2 this becomes dynamic, derived from the [leagueSlug] URL segment.
 */
export const LEGACY_LEAGUE_SLUG = 'legacy'

/**
 * Fetch a league by its URL-safe slug.
 * Replaces all bare `db.league.findFirst()` calls — ensures every data access
 * is explicitly scoped to a specific league, not an arbitrary first result.
 *
 * Returns null if no league with that slug exists.
 */
export async function getLeagueBySlug(slug: string) {
  return db.league.findUnique({ where: { slug } })
}

/**
 * Fetch the active league by slug, or throw if not found.
 * Use this in API routes and server components that require an existing league.
 */
export async function requireLeagueBySlug(slug: string) {
  const league = await db.league.findUnique({ where: { slug } })
  if (!league) throw new Error(`League not found: ${slug}`)
  return league
}

/**
 * Fetch the legacy league (the original single-tenant league).
 * Convenience wrapper used by all Sprint-1 call sites until Sprint 2
 * introduces URL-scoped routing.
 */
export async function getLegacyLeague() {
  return getLeagueBySlug(LEGACY_LEAGUE_SLUG)
}
