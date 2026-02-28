/**
 * Shared Zod validation schemas for type-safe validation across client and server.
 *
 * These schemas provide:
 * - Runtime validation for API inputs
 * - Type inference for TypeScript
 * - Consistent validation rules between forms and API routes
 * - Clear error messages for users
 */

import { z } from 'zod'
import { EventType, GameEventType, Role } from '@prisma/client'

// ============================================================================
// PRIMITIVES & REUSABLE
// ============================================================================

const idSchema = z.string().uuid({ message: 'Invalid ID format' })
const weekSchema = z.number().int().min(1).max(20)
const optionalStringSchema = z.string().optional()

// ============================================================================
// EVENT SCHEMAS
// ============================================================================

/**
 * Schema for creating a standalone scoring event (direct submission).
 */
export const createEventSchema = z.object({
  type: z.nativeEnum(EventType),
  contestantId: idSchema,
  week: weekSchema,
  description: optionalStringSchema,
})

export type CreateEventInput = z.infer<typeof createEventSchema>

/**
 * Schema for updating an existing event (approval/rejection).
 */
export const updateEventSchema = z.object({
  isApproved: z.boolean().optional(),
  description: optionalStringSchema,
})

export type UpdateEventInput = z.infer<typeof updateEventSchema>

/**
 * Query parameters for GET /api/events
 */
export const eventQuerySchema = z.object({
  week: z.coerce.number().int().min(1).max(20).optional(),
  contestantId: idSchema.optional(),
  approved: z.enum(['true', 'false']).optional(),
  pending: z.enum(['true', 'false']).optional(),
})

export type EventQueryInput = z.infer<typeof eventQuerySchema>

// ============================================================================
// GAME EVENT SCHEMAS
// ============================================================================

/**
 * Tribal Council data structure
 */
const tribalCouncilDataSchema = z.object({
  attendees: z.array(idSchema).min(1, 'At least one attendee required'),
  votes: z.record(z.string(), idSchema),
  eliminated: idSchema,
  isBlindside: z.boolean(),
  blindsideLeader: idSchema.optional(),
  idolPlayed: z
    .object({
      by: idSchema,
      successful: z.boolean(),
    })
    .nullable()
    .optional(),
  sentToJury: z.boolean(),
})

/**
 * Immunity Challenge data structure
 */
const immunityChallengeDataSchema = z.object({
  winner: idSchema.optional(),
  winners: z.array(idSchema).optional(),
  isTeamChallenge: z.boolean().optional(),
  tribeNames: z.array(z.string()).optional(),
}).refine(
  (data) => data.winner || (data.winners && data.winners.length > 0),
  {
    message: 'Either winner or winners must be provided',
  }
)

/**
 * Reward Challenge data structure
 */
const rewardChallengeDataSchema = z.object({
  winners: z.array(idSchema).min(1, 'At least one winner required'),
  isTeamChallenge: z.boolean(),
  tribeNames: z.array(z.string()).optional(),
})

/**
 * Idol Found data structure
 */
const idolFoundDataSchema = z.object({
  finder: idSchema,
})

/**
 * Fire Making data structure
 */
const fireMakingDataSchema = z.object({
  winner: idSchema,
  loser: idSchema,
})

/**
 * Quit/Medevac data structure
 */
const quitMedevacDataSchema = z.object({
  contestant: idSchema,
  reason: z.enum(['quit', 'medevac']),
})

/**
 * Endgame data structure
 */
const endgameDataSchema = z.object({
  finalists: z.array(idSchema).min(2, 'At least 2 finalists required').max(3, 'Maximum 3 finalists'),
  winner: idSchema,
})

/**
 * Schema for creating a game event with derived scoring events.
 * Uses discriminated union to enforce correct data shape per type.
 */
export const createGameEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(GameEventType.TRIBAL_COUNCIL),
    week: weekSchema,
    data: tribalCouncilDataSchema,
  }),
  z.object({
    type: z.literal(GameEventType.IMMUNITY_CHALLENGE),
    week: weekSchema,
    data: immunityChallengeDataSchema,
  }),
  z.object({
    type: z.literal(GameEventType.REWARD_CHALLENGE),
    week: weekSchema,
    data: rewardChallengeDataSchema,
  }),
  z.object({
    type: z.literal(GameEventType.IDOL_FOUND),
    week: weekSchema,
    data: idolFoundDataSchema,
  }),
  z.object({
    type: z.literal(GameEventType.FIRE_MAKING),
    week: weekSchema,
    data: fireMakingDataSchema,
  }),
  z.object({
    type: z.literal(GameEventType.QUIT_MEDEVAC),
    week: weekSchema,
    data: quitMedevacDataSchema,
  }),
  z.object({
    type: z.literal(GameEventType.ENDGAME),
    week: weekSchema,
    data: endgameDataSchema,
  }),
])

export type CreateGameEventInput = z.infer<typeof createGameEventSchema>

/**
 * Schema for updating a game event (approval/rejection).
 */
export const updateGameEventSchema = z.object({
  isApproved: z.boolean().optional(),
})

export type UpdateGameEventInput = z.infer<typeof updateGameEventSchema>

// ============================================================================
// CONTESTANT SCHEMAS
// ============================================================================

/**
 * Schema for creating a new contestant (admin only).
 */
export const createContestantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  nickname: z.string().max(50).optional(),
  tribe: z.string().max(50).optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  originalSeasons: z.string().optional(),
})

export type CreateContestantInput = z.infer<typeof createContestantSchema>

/**
 * Schema for updating a contestant.
 */
export const updateContestantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nickname: z.string().max(50).optional(),
  tribe: z.string().max(50).optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  originalSeasons: z.string().optional(),
  isEliminated: z.boolean().optional(),
  eliminatedWeek: z.number().int().min(1).max(20).nullable().optional(),
})

export type UpdateContestantInput = z.infer<typeof updateContestantSchema>

/**
 * Query parameters for GET /api/contestants
 */
export const contestantQuerySchema = z.object({
  includeEvents: z.enum(['true', 'false']).optional(),
  includeMemberships: z.enum(['true', 'false']).optional(),
  activeOnly: z.enum(['true', 'false']).optional(),
})

export type ContestantQueryInput = z.infer<typeof contestantQuerySchema>

// ============================================================================
// DRAFT SCHEMAS
// ============================================================================

/**
 * Schema for initializing a draft (admin only).
 */
export const initializeDraftSchema = z.object({
  action: z.literal('initialize'),
  draftOrder: z.array(idSchema).min(2, 'At least 2 users required for draft'),
})

export type InitializeDraftInput = z.infer<typeof initializeDraftSchema>

/**
 * Schema for making a draft pick.
 */
export const makeDraftPickSchema = z.object({
  action: z.literal('pick'),
  contestantId: idSchema,
})

export type MakeDraftPickInput = z.infer<typeof makeDraftPickSchema>

/**
 * Combined draft action schema.
 */
export const draftActionSchema = z.discriminatedUnion('action', [
  initializeDraftSchema,
  makeDraftPickSchema,
])

export type DraftActionInput = z.infer<typeof draftActionSchema>

// ============================================================================
// USER SCHEMAS
// ============================================================================

/**
 * Schema for updating a user (admin only).
 */
export const updateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  isPaid: z.boolean().optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

// ============================================================================
// TRIBE SCHEMAS
// ============================================================================

/**
 * Schema for creating a tribe (admin only).
 */
export const createTribeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  isMerge: z.boolean().default(false),
  buffImage: z.string().url('Invalid image URL').optional(),
})

export type CreateTribeInput = z.infer<typeof createTribeSchema>

/**
 * Schema for updating a tribe.
 */
export const updateTribeSchema = createTribeSchema.partial()

export type UpdateTribeInput = z.infer<typeof updateTribeSchema>

// ============================================================================
// TRIBE MEMBERSHIP SCHEMAS
// ============================================================================

/**
 * Schema for creating a tribe membership (admin only).
 */
export const createTribeMembershipSchema = z.object({
  contestantId: idSchema,
  tribeId: idSchema,
  fromWeek: z.number().int().min(1).max(20),
  toWeek: z.number().int().min(1).max(20).nullable().optional(),
})

export type CreateTribeMembershipInput = z.infer<typeof createTribeMembershipSchema>

/**
 * Schema for updating a tribe membership.
 */
export const updateTribeMembershipSchema = z.object({
  fromWeek: z.number().int().min(1).max(20).optional(),
  toWeek: z.number().int().min(1).max(20).nullable().optional(),
})

export type UpdateTribeMembershipInput = z.infer<typeof updateTribeMembershipSchema>

/**
 * Schema for bulk creating tribe memberships.
 */
export const bulkCreateTribeMembershipsSchema = z.object({
  memberships: z.array(createTribeMembershipSchema).min(1),
})

export type BulkCreateTribeMembershipsInput = z.infer<typeof bulkCreateTribeMembershipsSchema>

// ============================================================================
// EPISODE SCHEMAS
// ============================================================================

/**
 * Schema for creating an episode (admin only).
 */
export const createEpisodeSchema = z.object({
  number: z.number().int().min(1).max(30),
  title: z.string().min(1).max(200),
  airDate: z.string().datetime({ message: 'Invalid date format' }),
})

export type CreateEpisodeInput = z.infer<typeof createEpisodeSchema>

/**
 * Schema for updating an episode.
 */
export const updateEpisodeSchema = createEpisodeSchema.partial()

export type UpdateEpisodeInput = z.infer<typeof updateEpisodeSchema>

/**
 * Schema for bulk creating episodes.
 */
export const bulkCreateEpisodesSchema = z.object({
  episodes: z.array(createEpisodeSchema).min(1),
})

export type BulkCreateEpisodesInput = z.infer<typeof bulkCreateEpisodesSchema>

// ============================================================================
// LEAGUE SCHEMAS
// ============================================================================

/**
 * Schema for updating league settings (admin only).
 */
export const updateLeagueSchema = z.object({
  season: z.number().int().min(1).max(100).optional(),
  draftStartDate: z.string().datetime().nullable().optional(),
  slackWebhook: z.string().url('Invalid webhook URL').nullable().optional(),
  customPointValues: z.record(z.nativeEnum(EventType), z.number()).optional(),
})

export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to safely parse and validate data.
 * Returns { success: true, data } or { success: false, error }.
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data)
}

/**
 * Helper to format Zod errors into user-friendly messages.
 */
export function formatZodError(error: z.ZodError<unknown>): string {
  return error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`).join(', ')
}
