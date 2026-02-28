# Survivor Fantasy League - Refactoring Plan

**Date:** 2026-02-28
**Codebase Size:** ~20,000 lines across 148 TypeScript files
**Current State:** Production-ready Next.js 14 PWA with solid architecture

---

## Executive Summary

This refactoring plan prioritizes high-value, low-risk improvements that will enhance maintainability, performance, and developer experience. Each item is rated on **Effort** (1-5) and **Benefit** (1-5), with a calculated **Value Score** (Benefit/Effort).

**Key Metrics:**
- 34 API routes
- 52 components
- 11 test files (low coverage)
- Clean codebase (no TODO/FIXME comments found)
- Two scoring engines (app + simulation) that must stay in sync

---

## Refactoring Categories

### 🔥 Critical Value (High Benefit, Low-Medium Effort)

#### 1. Consolidate Scoring Logic ⭐⭐⭐⭐⭐
**Value Score: 5.0** (Benefit: 5 / Effort: 1)

**Problem:**
- `EVENT_POINTS` lives in `src/lib/scoring.ts`
- `BASE_EVENT_POINTS` lives in `src/simulation/engine/data-mapper.ts`
- **Manual sync required** when adding/changing event types
- High risk of scoring drift between app and simulation

**Solution:**
- Create shared constants file: `src/lib/constants/scoring-constants.ts`
- Export single source of truth for point values
- Both systems import from this file
- Remove duplication entirely

**Files to Change:**
- Create: `src/lib/constants/scoring-constants.ts`
- Modify: `src/lib/scoring.ts`, `src/simulation/engine/data-mapper.ts`
- Update: `.claude/CLAUDE.md` to reflect single source of truth

**Impact:**
- ✅ Eliminates manual sync requirement
- ✅ Reduces bug surface area
- ✅ Easier to add new event types
- ✅ Clear single source of truth

---

#### 2. Add Comprehensive Unit Tests ⭐⭐⭐⭐⭐
**Value Score: 5.0** (Benefit: 5 / Effort: 1)

**Problem:**
- Only 11 test files (mostly simulation engine)
- Core business logic lacks test coverage:
  - `src/lib/event-derivation.ts` (GameEvent → Event mapping)
  - `src/lib/scoring.ts` (score calculations)
  - API route handlers (validation, auth, error handling)

**Solution:**
- Add unit tests for critical business logic:
  - `tests/unit/event-derivation.test.ts` - test all GameEventType derivations
  - `tests/unit/scoring.test.ts` - verify point calculations (already exists, expand)
  - `tests/unit/api/*.test.ts` - test API route logic

**Target Files (Priority Order):**
1. `src/lib/event-derivation.ts` - 346 lines, zero coverage
2. `src/lib/auth.ts` - auth helpers
3. `src/app/api/scores/route.ts` - leaderboard calculation
4. `src/app/api/events/route.ts` - event submission
5. `src/app/api/game-events/route.ts` - game event submission

**Impact:**
- ✅ Catch regressions early
- ✅ Safer refactoring
- ✅ Documentation through tests
- ✅ Confidence in event derivation logic

---

#### 3. Extract Reusable API Response Helpers ⭐⭐⭐⭐
**Value Score: 4.0** (Benefit: 4 / Effort: 1)

**Problem:**
- Error handling duplicated across 34 API routes
- Inconsistent response formats
- Auth error handling copy-pasted everywhere

**Current Pattern (repeated 34x):**
```typescript
try {
  await requireUser()
  // ... logic
} catch (error) {
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.error('Error:', error)
  return NextResponse.json({ error: 'Failed to...' }, { status: 500 })
}
```

**Solution:**
- Create `src/lib/api/response-helpers.ts`:
  ```typescript
  export function successResponse<T>(data: T, status = 200)
  export function errorResponse(message: string, status: number)
  export function handleAuthError(error: unknown)
  export function withAuth(handler: (user: User) => Promise<Response>)
  ```

**Files to Change:**
- Create: `src/lib/api/response-helpers.ts`
- Modify: All 34 API route files

**Impact:**
- ✅ DRY principle
- ✅ Consistent error responses
- ✅ Easier to add logging/monitoring later
- ✅ Less boilerplate per route

---

#### 4. Type-Safe Environment Variables ⭐⭐⭐⭐
**Value Score: 4.0** (Benefit: 4 / Effort: 1)

**Problem:**
- Environment variables accessed directly via `process.env.*`
- No type safety
- No validation at startup
- Easy to miss required env vars

**Solution:**
- Create `src/lib/env.ts` with Zod validation:
  ```typescript
  import { z } from 'zod'

  const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    CLERK_SECRET_KEY: z.string(),
    CLERK_WEBHOOK_SECRET: z.string(),
    SLACK_WEBHOOK_URL: z.string().url().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  })

  export const env = envSchema.parse(process.env)
  ```

**Dependencies to Add:**
- `zod` (already widely used in ecosystem)

**Impact:**
- ✅ Catch missing env vars at build time
- ✅ Type-safe environment access
- ✅ Self-documenting required config
- ✅ Prevents runtime errors

---

### 💎 High Value (High Benefit, Medium Effort)

#### 5. API Route Handler Abstraction ⭐⭐⭐⭐
**Value Score: 2.0** (Benefit: 4 / Effort: 2)

**Problem:**
- Repetitive CRUD patterns across 34 routes
- Each route reimplements same patterns:
  - Auth checking
  - Request parsing
  - Database queries
  - Error handling

**Solution:**
- Create generic CRUD factory: `src/lib/api/crud-factory.ts`
- Generate standard CRUD routes with config:
  ```typescript
  export const createCRUDHandlers = <T>({
    model: string,
    requireAuth?: 'user' | 'moderator' | 'admin',
    include?: object,
    validation?: ZodSchema,
  })
  ```

**Files to Change:**
- Create: `src/lib/api/crud-factory.ts`
- Simplify: Simple CRUD routes (contestants, episodes, tribes, etc.)

**Impact:**
- ✅ Less code to maintain
- ✅ Consistent behavior across routes
- ✅ Easier to add new resources
- ⚠️ May need custom logic for complex routes

---

#### 6. Contestant Data Hooks ⭐⭐⭐⭐
**Value Score: 2.0** (Benefit: 4 / Effort: 2)

**Problem:**
- Components fetch contestant data independently
- No caching/deduplication
- Inconsistent loading states
- Network waterfalls

**Solution:**
- Create React Query hooks (or SWR):
  ```typescript
  // src/hooks/use-contestants.ts
  export function useContestants()
  export function useContestant(id: string)
  export function useTeamContestants(teamId: string)
  ```

**Dependencies to Add:**
- `@tanstack/react-query` (modern, well-maintained)

**Files to Change:**
- Create: `src/hooks/use-contestants.ts`, `src/hooks/use-events.ts`, etc.
- Modify: Components fetching data client-side

**Impact:**
- ✅ Automatic caching
- ✅ Deduplication
- ✅ Better UX (optimistic updates)
- ✅ Less prop drilling

---

#### 7. Database Query Optimization ⭐⭐⭐⭐
**Value Score: 2.0** (Benefit: 4 / Effort: 2)

**Problem:**
- `/api/scores` loads all teams with all contestants with all events (N+1 potential)
- No pagination on event lists
- Heavy queries on every leaderboard load

**Solution:**
- Add database indexes (already has some):
  - Verify indexes on `Event.week + isApproved`
  - Consider materialized view for leaderboard
- Add pagination to event endpoints
- Use Prisma's `select` to limit fields
- Consider Redis cache for leaderboard (optional)

**Files to Change:**
- `prisma/schema.prisma` - add indexes if missing
- `src/app/api/scores/route.ts` - optimize query
- `src/app/api/events/route.ts` - add pagination

**Impact:**
- ✅ Faster API responses
- ✅ Lower database load
- ✅ Better scalability
- ⚠️ Requires careful testing

---

#### 8. Component Library Consolidation ⭐⭐⭐
**Value Score: 1.5** (Benefit: 3 / Effort: 2)

**Problem:**
- 52 component files, some with similar patterns
- UI components in `src/components/ui/` (shadcn)
- Simulation charts duplicate axis/formatting logic
- Event forms share similar structure

**Solution:**
- Extract shared form patterns:
  - `src/components/forms/base-event-form.tsx`
  - `src/components/forms/contestant-multi-select.tsx`
- Consolidate chart components:
  - `src/components/charts/base-chart.tsx` with Recharts config
  - Shared axis formatters, colors, tooltips
- Create component documentation

**Files to Change:**
- Create: Base form/chart components
- Refactor: `src/components/events/*-form.tsx`
- Refactor: `src/components/simulation/charts/*.tsx`

**Impact:**
- ✅ Less code duplication
- ✅ Consistent UI/UX
- ✅ Easier to change styles globally
- ⚠️ Risk of over-abstraction

---

### 🛠️ Medium Value (Medium Benefit, Low-Medium Effort)

#### 9. Error Boundary Components ⭐⭐⭐
**Value Score: 3.0** (Benefit: 3 / Effort: 1)

**Problem:**
- No error boundaries
- Client-side errors crash the entire app
- Poor error UX

**Solution:**
- Create error boundary components:
  ```typescript
  // src/components/shared/error-boundary.tsx
  export function ErrorBoundary({ children, fallback })
  ```
- Add to layout files
- Integrate with error reporting (optional: Sentry)

**Files to Change:**
- Create: `src/components/shared/error-boundary.tsx`
- Modify: `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`, etc.

**Impact:**
- ✅ Better error recovery
- ✅ Improved UX on errors
- ✅ Error tracking/monitoring

---

#### 10. Loading States & Skeletons ⭐⭐⭐
**Value Score: 3.0** (Benefit: 3 / Effort: 1)

**Problem:**
- Inconsistent loading states
- No skeleton screens
- Flash of unstyled content

**Solution:**
- Create skeleton components:
  - `src/components/shared/skeletons.tsx`
- Add Suspense boundaries with skeletons
- Use Next.js 14 loading.tsx convention

**Files to Change:**
- Create: `src/components/shared/skeletons.tsx`
- Add: `loading.tsx` files in app router

**Impact:**
- ✅ Better perceived performance
- ✅ Consistent loading UX
- ✅ Modern app feel

---

#### 11. Zod Validation Schemas ⭐⭐⭐
**Value Score: 1.5** (Benefit: 3 / Effort: 2)

**Problem:**
- Manual validation in API routes
- Type/runtime mismatch possible
- No shared validation between client/server

**Solution:**
- Create shared Zod schemas:
  ```typescript
  // src/lib/validation/schemas.ts
  export const createEventSchema = z.object({...})
  export const createGameEventSchema = z.object({...})
  ```
- Use in API routes and forms

**Dependencies:**
- `zod` (add to dependencies)

**Files to Change:**
- Create: `src/lib/validation/schemas.ts`
- Modify: API routes, form components

**Impact:**
- ✅ Type-safe validation
- ✅ Better error messages
- ✅ Shared client/server validation
- ⚠️ Learning curve for Zod

---

### 📦 Lower Priority (Various Value)

#### 12. Database Transaction Wrappers ⭐⭐
**Value Score: 2.0** (Benefit: 2 / Effort: 1)

**Current Risk:**
- GameEvent approval creates multiple Events
- No transaction wrapping
- Partial failure possible

**Solution:**
- Wrap multi-step operations in Prisma transactions
- Particularly: `src/app/api/game-events/[id]/route.ts`

**Impact:**
- ✅ Data consistency
- ✅ Atomic operations
- ⚠️ Complexity in error handling

---

#### 13. Upgrade to Next.js 15 ⭐⭐
**Value Score: 0.67** (Benefit: 2 / Effort: 3)

**Current:** Next.js 14.2.35
**Latest:** Next.js 15.x

**Benefits:**
- Performance improvements
- Better caching
- Turbopack (faster builds)

**Risks:**
- Breaking changes
- next-pwa compatibility
- Clerk compatibility

**Recommendation:** Wait until next major feature work, not urgent

---

#### 14. Playwright E2E Test Suite Expansion ⭐⭐
**Value Score: 0.67** (Benefit: 2 / Effort: 3)

**Current State:**
- E2E test infrastructure exists
- Minimal coverage

**Solution:**
- Add E2E tests for critical flows:
  - Draft process
  - Event submission → approval
  - Leaderboard calculation

**Impact:**
- ✅ Catch integration bugs
- ⚠️ Maintenance overhead
- ⚠️ Slow test suite

---

#### 15. Accessibility Audit ⭐⭐
**Value Score: 1.0** (Benefit: 2 / Effort: 2)

**Areas to Check:**
- Keyboard navigation
- Screen reader support
- ARIA labels
- Color contrast

**Tools:**
- axe DevTools
- Lighthouse

**Impact:**
- ✅ Inclusive app
- ✅ Legal compliance
- ⚠️ Time-consuming fixes

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2) ✅ COMPLETE
**Low effort, high impact - build momentum**

1. ✅ Consolidate Scoring Logic (#1)
2. ✅ Type-Safe Environment Variables (#4)
3. ✅ Extract API Response Helpers (#3)
4. ✅ Error Boundary Components (#9)

**Effort:** 4 days
**Value:** Eliminates duplication, improves DX
**Status:** ✅ All items completed

---

### Phase 2: Testing & Reliability (Week 3-4) ✅ COMPLETE
**Increase confidence before larger changes**

5. ✅ Add Comprehensive Unit Tests (#2)
6. ✅ Database Transaction Wrappers (#12)
7. ✅ Loading States & Skeletons (#10)

**Effort:** 1 week
**Value:** Safety net for future refactoring
**Status:** ✅ All items completed

---

### Phase 3: Performance & UX (Week 5-6) ✅ COMPLETE
**Optimize hot paths**

8. ✅ Database Query Optimization (#7)
9. ✅ Contestant Data Hooks (#6)
10. ✅ Zod Validation Schemas (#11) - **COMPLETED 2026-02-28**

**Effort:** 1.5 weeks (actual: 1 day)
**Value:** Better performance, modern patterns
**Status:** ✅ All items completed. See `PHASE_3_SUMMARY.md` for details.

---

### Phase 4: Architecture (Week 7-8)
**Optional - only if time permits**

11. ⚠️ API Route Handler Abstraction (#5)
12. ⚠️ Component Library Consolidation (#8)

**Effort:** 2 weeks
**Value:** Long-term maintainability

---

## Risk Assessment

### Low Risk ✅
- #1 Consolidate Scoring Logic - pure refactor, tests exist
- #3 API Response Helpers - incremental adoption
- #4 Type-Safe Env Vars - fails fast
- #9 Error Boundaries - additive only
- #10 Loading States - UI only

### Medium Risk ⚠️
- #2 Unit Tests - time investment, may find bugs
- #6 Data Hooks - state management change
- #7 Query Optimization - needs load testing
- #11 Zod Schemas - API contract changes

### High Risk 🔴
- #5 CRUD Factory - over-abstraction risk
- #8 Component Consolidation - breaking changes
- #13 Next.js 15 - framework upgrade

---

## Metrics to Track

**Before/After Comparison:**
- Test coverage % (currently ~5%)
- API response times (leaderboard, events list)
- Bundle size
- Lighthouse scores
- TypeScript errors (should stay at 0)

**Target Metrics:**
- Test coverage: 60%+ for business logic
- Leaderboard load: <500ms (95th percentile)
- First Contentful Paint: <1.5s
- No runtime errors from missing env vars

---

## Technical Debt Avoided

This plan explicitly **does NOT include:**

❌ **Premature optimizations:**
- Migrating to different state management (Redux, Zustand) - not needed
- Microservices architecture - overkill for this app
- GraphQL migration - REST works fine
- Server Components everywhere - current balance is good

❌ **Unnecessary complexity:**
- Monorepo setup - single app is fine
- Design system library - shadcn/ui works
- Backend framework change - Next.js API routes work well

❌ **Breaking changes:**
- Database schema redesign - current schema is solid
- Auth provider change - Clerk works great
- Deployment platform change - Railway is working

---

## Decision Framework

**Should I refactor this?**

1. **Is it causing bugs?** → High priority
2. **Is it preventing new features?** → High priority
3. **Is it duplicated 3+ times?** → Medium priority
4. **Is it confusing to maintain?** → Low priority
5. **Is it just "not perfect"?** → Skip it

**ROI Formula:**
```
Value Score = Benefit (1-5) / Effort (1-5)

High Value: >2.0 - DO THESE
Medium Value: 1.0-2.0 - Consider if time permits
Low Value: <1.0 - Skip unless critical
```

---

## Conclusion

This refactoring plan focuses on **pragmatic improvements** that will:
- ✅ Reduce maintenance burden
- ✅ Improve developer experience
- ✅ Increase code quality
- ✅ Enhance performance
- ✅ Maintain stability

**Total Estimated Effort:** 6-8 weeks (working part-time)
**Expected Impact:** 40% reduction in common pain points

The plan is designed to be **incremental** - each phase delivers value independently and can be stopped at any point without leaving the codebase in a broken state.

---

**Next Steps:**
1. Review this plan
2. Prioritize based on current pain points
3. Start with Phase 1 (4 days of work, massive value)
4. Measure impact before proceeding to Phase 2
