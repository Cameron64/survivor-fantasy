# Validation Schemas

This directory contains Zod validation schemas for type-safe, runtime validation across the Survivor Fantasy League app.

## Overview

Validation schemas provide:
- ✅ Runtime validation for API inputs
- ✅ Type inference for TypeScript
- ✅ Consistent validation rules between client (forms) and server (API routes)
- ✅ Clear, user-friendly error messages
- ✅ Protection against invalid data entering the database

## Usage

### In API Routes

```typescript
import { createEventSchema, formatZodError } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Validate with Zod
  const validationResult = createEventSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { error: formatZodError(validationResult.error) },
      { status: 400 }
    )
  }

  // TypeScript now knows the exact shape of validationResult.data
  const { type, contestantId, week, description } = validationResult.data

  // ... proceed with validated data
}
```

### In React Forms (with react-hook-form)

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { createEventSchema, CreateEventInput } from '@/lib/validation'

export function EventForm() {
  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      type: EventType.INDIVIDUAL_IMMUNITY_WIN,
      week: 1,
    },
  })

  const onSubmit = async (data: CreateEventInput) => {
    // data is already validated by Zod
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    // ...
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

### Manual Validation

```typescript
import { safeValidate } from '@/lib/validation'

const result = safeValidate(createEventSchema, unknownData)

if (!result.success) {
  console.error('Validation failed:', result.error)
} else {
  console.log('Valid data:', result.data)
}
```

## Available Schemas

### Events

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `createEventSchema` | Create standalone event | type, contestantId, week, description? |
| `updateEventSchema` | Update event (approve/reject) | isApproved?, description? |
| `eventQuerySchema` | Query params for GET /api/events | week?, contestantId?, approved?, pending? |

### Game Events

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `createGameEventSchema` | Create game event (discriminated union) | type, week, data (varies by type) |
| `updateGameEventSchema` | Update game event | isApproved? |

**Game Event Data Types:**
- `TRIBAL_COUNCIL`: attendees, votes, eliminated, isBlindside, blindsideLeader?, idolPlayed?, sentToJury
- `IMMUNITY_CHALLENGE`: winner OR winners, isTeamChallenge?, tribeNames?
- `REWARD_CHALLENGE`: winners, isTeamChallenge, tribeNames?
- `IDOL_FOUND`: finder
- `FIRE_MAKING`: winner, loser
- `QUIT_MEDEVAC`: contestant, reason ('quit' | 'medevac')
- `ENDGAME`: finalists (2-3), winner

### Contestants

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `createContestantSchema` | Create contestant (admin) | name, nickname?, tribe?, imageUrl?, originalSeasons? |
| `updateContestantSchema` | Update contestant | All fields optional |
| `contestantQuerySchema` | Query params for GET /api/contestants | includeEvents?, includeMemberships?, activeOnly? |

### Draft

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `draftActionSchema` | Draft actions (discriminated union) | action: 'initialize' OR 'pick' |
| `initializeDraftSchema` | Initialize draft | draftOrder (min 2 users) |
| `makeDraftPickSchema` | Make draft pick | contestantId |

### Users

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `updateUserSchema` | Update user (admin) | role?, isPaid? |

### Tribes

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `createTribeSchema` | Create tribe | name, color (hex), isMerge, buffImage? |
| `updateTribeSchema` | Update tribe | All fields optional |

### Tribe Memberships

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `createTribeMembershipSchema` | Create membership | contestantId, tribeId, fromWeek, toWeek? |
| `updateTribeMembershipSchema` | Update membership | fromWeek?, toWeek? |
| `bulkCreateTribeMembershipsSchema` | Bulk create | memberships[] |

### Episodes

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `createEpisodeSchema` | Create episode | number, title, airDate (ISO 8601) |
| `updateEpisodeSchema` | Update episode | All fields optional |
| `bulkCreateEpisodesSchema` | Bulk create | episodes[] |

### League

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `updateLeagueSchema` | Update league settings | season?, draftStartDate?, slackWebhook?, customPointValues? |

## Helper Functions

### `formatZodError(error: z.ZodError): string`

Converts Zod validation errors into a user-friendly error message string.

**Example:**
```typescript
// Input: validation error on { week: "invalid", contestantId: "not-a-uuid" }
// Output: "week: Expected number, received string, contestantId: Invalid ID format"
```

### `safeValidate<T>(schema: z.ZodSchema<T>, data: unknown)`

Wrapper around `schema.safeParse()` for consistent validation patterns.

## Best Practices

### ✅ Do

- Use Zod schemas for ALL user input validation (API routes, forms)
- Use discriminated unions for type-specific data (GameEvent, DraftAction)
- Leverage TypeScript inference: `type X = z.infer<typeof schema>`
- Provide clear error messages in schemas
- Use `.safeParse()` to handle validation errors gracefully

### ❌ Don't

- Skip validation for "trusted" inputs (validate everything from outside the system)
- Use `.parse()` which throws exceptions (use `.safeParse()` instead)
- Duplicate validation logic (DRY - import from this module)
- Over-validate (if DB constraints handle it, don't duplicate in Zod)

## Type Inference

All schemas export corresponding TypeScript types via `z.infer`:

```typescript
import { CreateEventInput, CreateGameEventInput } from '@/lib/validation'

// These types are automatically derived from the Zod schemas
function submitEvent(data: CreateEventInput) { ... }
function submitGameEvent(data: CreateGameEventInput) { ... }
```

## Validation Constraints

### IDs
- All IDs must be valid UUIDs (via `z.string().uuid()`)

### Weeks
- Week numbers: 1-20 (integer)

### Strings
- Names: 1-100 characters
- Nicknames: max 50 characters
- Descriptions: optional, no max length
- URLs: must be valid URL format

### Colors
- Hex color format: `#[0-9A-Fa-f]{6}` (e.g., `#FF5733`)

### Arrays
- Most arrays require at least 1 item
- Finalists: 2-3 items (Survivor rules)
- Draft order: min 2 users

### Dates
- ISO 8601 datetime format (e.g., `2026-02-15T20:00:00Z`)

## Examples

### Example: Tribal Council Submission

```typescript
const tribalCouncilData = {
  type: 'TRIBAL_COUNCIL',
  week: 3,
  data: {
    attendees: ['uuid-1', 'uuid-2', 'uuid-3'],
    votes: {
      'uuid-1': 'uuid-3',
      'uuid-2': 'uuid-3',
      'uuid-3': 'uuid-1',
    },
    eliminated: 'uuid-3',
    isBlindside: true,
    blindsideLeader: 'uuid-1',
    idolPlayed: null,
    sentToJury: false,
  }
}

// Validates the entire structure including nested data
const result = createGameEventSchema.safeParse(tribalCouncilData)
```

### Example: Query String Validation

```typescript
// GET /api/contestants?activeOnly=true&includeEvents=true
const queryResult = contestantQuerySchema.safeParse({
  activeOnly: 'true',
  includeEvents: 'true',
  includeMemberships: undefined,
})

if (queryResult.success) {
  const { activeOnly, includeEvents, includeMemberships } = queryResult.data
  // Each field is typed as 'true' | 'false' | undefined
}
```

## Migration Guide

### Before (Manual Validation)

```typescript
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, contestantId, week } = body

  if (!type || !contestantId || !week) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!Object.values(EventType).includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // ... 20 more lines of validation
}
```

### After (Zod Schema)

```typescript
import { createEventSchema, formatZodError } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const validationResult = createEventSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { error: formatZodError(validationResult.error) },
      { status: 400 }
    )
  }

  const { type, contestantId, week, description } = validationResult.data
  // ... proceed with type-safe, validated data
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { createEventSchema } from '@/lib/validation'
import { EventType } from '@prisma/client'

describe('createEventSchema', () => {
  it('accepts valid event data', () => {
    const valid = {
      type: EventType.INDIVIDUAL_IMMUNITY_WIN,
      contestantId: '550e8400-e29b-41d4-a716-446655440000',
      week: 5,
    }

    const result = createEventSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects invalid week', () => {
    const invalid = {
      type: EventType.INDIVIDUAL_IMMUNITY_WIN,
      contestantId: '550e8400-e29b-41d4-a716-446655440000',
      week: 0, // Invalid: must be 1-20
    }

    const result = createEventSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })
})
```

## Related Files

- `src/lib/validation/schemas.ts` - All schema definitions
- `src/lib/validation/index.ts` - Central export
- `src/lib/event-derivation.ts` - GameEvent data type definitions (mirrors Zod schemas)
- `prisma/schema.prisma` - Database schema (source of truth for enums)

## Future Enhancements

- [ ] Add custom error messages for all fields
- [ ] Add refinements for cross-field validation (e.g., eliminated must be in attendees)
- [ ] Create form-specific schemas with better UX messages
- [ ] Add integration tests for all schemas
- [ ] Generate OpenAPI/Swagger docs from Zod schemas
