/**
 * Reusable API response helpers.
 *
 * These utilities provide consistent response formats and error handling
 * across all API routes in the application.
 *
 * Benefits:
 * - DRY principle (no more duplicated error handling)
 * - Consistent response structure
 * - Type-safe responses
 * - Easier to add logging/monitoring later
 */

import { NextResponse } from 'next/server'
import { requireUser, requireAdmin, requireModerator } from '@/lib/auth'
import type { User } from '@prisma/client'

/**
 * Create a success response with data.
 *
 * @example
 * return successResponse({ contestants: [...] })
 * return successResponse({ message: 'Created successfully' }, 201)
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

/**
 * Create an error response with a message.
 *
 * @example
 * return errorResponse('Not found', 404)
 * return errorResponse('Invalid input', 400)
 */
export function errorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Handle authentication errors with appropriate status codes.
 *
 * Maps error messages to HTTP status codes:
 * - 'Unauthorized' -> 401
 * - 'Forbidden' -> 403
 * - Other -> 500
 *
 * @example
 * try {
 *   await requireAdmin()
 * } catch (error) {
 *   return handleAuthError(error)
 * }
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401)
    }
    if (error.message === 'Forbidden') {
      return errorResponse('Forbidden', 403)
    }
  }
  console.error('Auth error:', error)
  return errorResponse('Authentication failed', 500)
}

/**
 * Handle general API errors with logging.
 *
 * @example
 * try {
 *   // ... API logic
 * } catch (error) {
 *   return handleApiError(error, 'Failed to fetch contestants')
 * }
 */
export function handleApiError(error: unknown, message: string = 'Internal server error'): NextResponse {
  console.error(message, error)
  return errorResponse(message, 500)
}

/**
 * Wrapper for API routes that require authentication.
 * Handles auth errors automatically and provides the authenticated user.
 *
 * @example
 * // Without request
 * export const GET = withAuth(async (user) => {
 *   const data = await db.team.findUnique({ where: { userId: user.id } })
 *   return successResponse(data)
 * })
 *
 * // With request
 * export const PATCH = withAuth(async (user, req) => {
 *   const body = await req.json()
 *   return successResponse(body)
 * })
 */
export function withAuth(
  handler: (user: User, req?: Request) => Promise<NextResponse>
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
      const user = await requireUser()
      return await handler(user, req)
    } catch (error) {
      return handleAuthError(error)
    }
  }
}

/**
 * Wrapper for API routes that require admin privileges.
 *
 * @example
 * export const DELETE = withAdmin(async (user) => {
 *   await db.contestant.delete({ where: { id: params.id } })
 *   return successResponse({ message: 'Deleted' })
 * })
 */
export function withAdmin(
  handler: (user: User, req?: Request) => Promise<NextResponse>
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
      const user = await requireAdmin()
      return await handler(user, req)
    } catch (error) {
      return handleAuthError(error)
    }
  }
}

/**
 * Wrapper for API routes that require moderator or admin privileges.
 *
 * @example
 * export const PATCH = withModerator(async (user) => {
 *   await db.event.update({ where: { id }, data: { isApproved: true } })
 *   return successResponse({ message: 'Approved' })
 * })
 */
export function withModerator(
  handler: (user: User, req?: Request) => Promise<NextResponse>
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
      const user = await requireModerator()
      return await handler(user, req)
    } catch (error) {
      return handleAuthError(error)
    }
  }
}

/**
 * Wrapper for public API routes (no auth required).
 * Still provides consistent error handling and logging.
 *
 * @example
 * export const GET = withPublicRoute(async () => {
 *   const contestants = await db.contestant.findMany()
 *   return successResponse(contestants)
 * })
 */
export function withPublicRoute(
  handler: () => Promise<NextResponse>
): () => Promise<NextResponse> {
  return async () => {
    try {
      return await handler()
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Validate request body with Zod schema.
 * Returns parsed data on success, or throws with error details.
 *
 * @example
 * const data = await validateRequestBody(req, createContestantSchema)
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  try {
    const body = await req.json()
    return schema.parse(body)
  } catch {
    throw new Error('Invalid request body')
  }
}
