/**
 * Type-safe environment variable validation.
 *
 * This file validates all required environment variables at startup/build time
 * and provides type-safe access throughout the application.
 *
 * Benefits:
 * - Fail fast if required env vars are missing
 * - Type-safe access (no more process.env.*)
 * - Self-documenting required configuration
 * - Prevents runtime errors from missing env vars
 */

import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required for user sync'),

  // Optional: Slack Integration
  SLACK_WEBHOOK_URL: z.string().url().optional().or(z.literal('')).transform(val => val || undefined),

  // Application URL
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL (e.g., https://survivor-fantasy.com)'),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

/**
 * Validated and type-safe environment variables.
 *
 * Usage:
 * ```typescript
 * import { env } from '@/lib/env'
 *
 * // Type-safe access
 * const dbUrl = env.DATABASE_URL
 * const clerkKey = env.CLERK_SECRET_KEY
 *
 * // Optional vars are typed as string | undefined
 * if (env.SLACK_WEBHOOK_URL) {
 *   await sendSlackNotification(...)
 * }
 * ```
 */
let _env: z.infer<typeof envSchema> | undefined

export const env: z.infer<typeof envSchema> = new Proxy({} as z.infer<typeof envSchema>, {
  get(_, prop: string) {
    if (!_env) {
      _env = envSchema.parse(process.env)
    }
    return _env[prop as keyof z.infer<typeof envSchema>]
  },
})

/**
 * Type of the validated environment object.
 * Useful for function parameters that need env access.
 */
export type Env = z.infer<typeof envSchema>
