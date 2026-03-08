# Merge Implementation Plan (v4)

This plan integrates merge, tribe swap, and phase tracking into the Survivor Fantasy League app. It was developed against `docs/HOW_MERGING_WORKS.md` and `docs/MERGE_ADJACENT_CONCEPTS.md` through iterative assumption testing.

---

## Phase 1: Schema Changes

### New Enums

```prisma
enum GamePhase {
  PRE_MERGE
  MERGE_TRANSITION
  MERGED
  FINAL_PHASE
}

enum PhaseSource {
  AUTO       // set by event approval
  MANUAL     // explicitly set by admin
  INFERRED   // suggested by heuristics, not yet confirmed
}
```

### Episode Model — Add

```prisma
gamePhase        GamePhase   @default(PRE_MERGE)
phaseSource      PhaseSource @default(INFERRED)
```

`AUTO` phases are set by event approval (merge approval sets `MERGED`). `MANUAL` phases are explicitly locked by an admin. Event approval only overwrites `INFERRED` or `AUTO` phases, never `MANUAL`. Precedence: MANUAL > AUTO > INFERRED.

### GameEvent Model — Add

```prisma
sequenceInEpisode Int @default(0)
```

Explicit intra-episode ordering. Ignored by v1 derivation logic. Auto-increments on submission within the same week.

### League Model — Add

```prisma
mergeWeek     Int?
juryStartWeek Int?
```

Independent values. Jury can start before, at, or after merge.

### Tribe Model — Add

```prisma
dissolvedAtWeek      Int?
dissolvedByEvent     GameEvent? @relation(fields: [dissolvedByEventId], references: [id])
dissolvedByEventId   String?
```

`dissolvedAtWeek = null` means not formally dissolved. Original pre-merge tribes at merge are NOT dissolved — they have no active memberships but were not formally ended. UI must distinguish "formally dissolved," "inactive because merged," and "active tribe."

### TribeMembership Model — Add

```prisma
gameEvent   GameEvent? @relation(fields: [gameEventId], references: [id])
gameEventId String?
```

Tags which GameEvent created/closed this membership, enabling safe unapproval reversal.

### New GameEventTypes

```prisma
TRIBE_MERGE
TRIBE_SWAP
```

### New EventType

```prisma
MADE_MERGE  // 0 points default, configurable via League.scoringConfig
```

### Milestone Idempotency

Unique index on Event:

```prisma
@@unique([contestantId, type, gameEventId])
```

Prevents duplicate milestones from approval/unapproval/re-approval. Milestone creation uses upsert semantics.

---

## Phase 2: Data Interfaces

```typescript
interface ChallengeGroup {
  id: string          // "A", "B"
  label: string       // "Orange Team", "Purple Team"
  memberIds: string[]
}

interface ImmunityChallengeData {
  // legacy path (pre-merge team challenges)
  winner?: string
  winners?: string[]
  isTeamChallenge?: boolean
  tribeNames?: string[]
  // grouped path (merge transition temporary teams)
  challengeGroups?: ChallengeGroup[]
  winningGroupIds?: string[]
}

interface TribeMergeData {
  mergeTribeId: string
  remainingContestants: string[]
  mergeWeek: number
  juryStartsThisWeek: boolean
}

interface TribeSwapData {
  mode: 'SWAP' | 'DISSOLUTION' | 'ABSORPTION' | 'EXPANSION'
  moves: Array<{
    contestantId: string
    fromTribeId: string
    toTribeId: string
  }>
  swapWeek: number
  dissolvedTribeId?: string
}
```

**Validation rule for ImmunityChallengeData:** If `challengeGroups` is present, `winners[]` and `tribeNames[]` must be empty. `challengeGroups` is authoritative when present. Mixed payloads are rejected at the API level.

---

## Phase 3: Derivation

### Generic Milestone Function

```typescript
function awardMilestone(
  contestantId: string,
  type: EventType,
  description: string,
  pv?: Record<EventType, number>
): DerivedEvent {
  return {
    type,
    contestantId,
    points: resolvePoints(type, pv),
    description,
  }
}
```

Refactor existing `MADE_JURY` in `deriveTribalCouncil()` to use `awardMilestone()`. New `MADE_MERGE` uses the same path. Adding future milestones (e.g. `MADE_FINALE`) is: add enum value, add one `awardMilestone()` call. No new pattern needed.

### Derivation Rules

- **TRIBE_MERGE** derives: `MADE_MERGE` for each contestant in `remainingContestants`
- **TRIBE_SWAP** derives: nothing (pure structural)
- **Immunity challenge with `challengeGroups`:** winners = members of groups in `winningGroupIds`, losers inferable as remaining groups

---

## Phase 4: Approval Constraints

### Chronological Approval Order

A GameEvent cannot be approved if unapproved GameEvents exist in earlier weeks:

```sql
SELECT id, type, week FROM GameEvent
WHERE week < :thisWeek AND isApproved = false
```

If results exist, return 400 with the blocking event list. Admin UI shows these as a clickable list with one-tap navigation to approve them.

**v1:** All event types block equally. Design note for v2: separate into state-affecting (TRIBAL_COUNCIL, TRIBE_MERGE, TRIBE_SWAP, IMMUNITY_CHALLENGE) and non-state-affecting (IDOL_FOUND, REWARD_CHALLENGE). Only state-affecting would block.

**Same-week events:** Can be approved in any order in v1. `sequenceInEpisode` is recorded but not enforced.

### Rollout Plan

Deploy with grace mode first — show warnings about out-of-order approval but don't block. Surface existing unapproved events from earlier weeks via admin dashboard alert. After cleanup, enable enforcement via config flag.

---

## Phase 5: Approval Side Effects

### TRIBE_MERGE Approval

1. Validate: all `remainingContestants` have active tribe memberships
2. Validate: `mergeTribeId` exists with `isMerge = true`
3. Transaction:
   - Close all active TribeMemberships (`toWeek = mergeWeek - 1`), tag with `gameEventId`
   - Create new memberships for all contestants to `mergeTribeId`, `fromWeek = mergeWeek`, tagged
   - Set `League.mergeWeek`
   - If `juryStartsThisWeek`, set `League.juryStartWeek`
   - Set `gamePhase = MERGED` on merge episode and future episodes where `phaseSource != MANUAL`
   - Upsert `MADE_MERGE` events for each contestant

### TRIBE_SWAP Approval

1. Validate:
   - Each contestant has active membership on `fromTribeId`
   - No contestant appears twice in `moves`
   - All referenced tribes exist and are not dissolved
   - No duplicate active memberships would result
2. Warn (non-blocking): uneven resulting tribe sizes
3. Transaction:
   - Close old memberships, create new ones, all tagged with `gameEventId`
   - If `dissolvedTribeId`: set `dissolvedAtWeek`, `dissolvedByEventId`

### Unapproval — Block When Downstream Exists

Before unapproving a merge or swap, check for later approved GameEvents referencing affected contestants. If found, return error with the list. Admin must unapprove in reverse chronological order.

---

## Phase 6: Phase Validation

### validatePhaseTransition(episodeNumber, proposedPhase)

**Hard-blocked:**
- Phase must be >= the nearest existing prior episode's phase
- Phase must be <= the nearest existing next episode's phase (if one exists)
- Can't set `PRE_MERGE` at or after `League.mergeWeek`
- Can't set `MERGED` before `League.mergeWeek` (if set)

Phase ordering: `PRE_MERGE < MERGE_TRANSITION < MERGED < FINAL_PHASE`

Validation uses nearest known timeline neighbors, not assumed sequential completeness. Gaps are treated as unknown.

**Soft-warned:**
- `MERGE_TRANSITION` with no merge-related events this episode
- `MERGED` but merge tribe has no active memberships
- Gaps exist between this episode and its neighbors

### Phase Inference (Suggestions Only)

- Merge event approved this episode + not yet merged -> suggest `MERGED`
- Challenge groups present + no merge yet -> suggest `MERGE_TRANSITION`
- All contestants on one tribe -> suggest `MERGED`
- Episode is past `League.mergeWeek` -> suggest `MERGED`

Suggestions pre-fill the dropdown. Never auto-applied without admin confirmation.

---

## Phase 7: Jury Handling

- `League.juryStartWeek` is independent from `mergeWeek`
- Set via merge event (`juryStartsThisWeek`) or directly in league settings
- TC form: if `sentToJury = true` and `week < juryStartWeek`, show warning with confirm dialog
- Not blocked — loud but overridable

---

## Phase 8: Split Tribal Support

When episode phase is `MERGED` or later, event wizard offers "Split Tribal Council":

1. Define two voting groups (contestant multi-select per group)
2. Scaffolds two TC GameEvent forms, pre-populated with attendees
3. Submits both in same week with sequential `sequenceInEpisode` values
4. Shows checklist: "Group A / Group B" with completion status
5. Warning if only 1 of 2 expected TCs submitted

---

## Phase 9: UI Tribe Resolution

Every UI surface must migrate from `Contestant.tribe` (legacy string) to `TribeMembership` queries.

| UI Surface | Current Source | New Source |
|---|---|---|
| Leaderboard tribe badge/color | `Contestant.tribe` string | Active `TribeMembership` -> `Tribe.color`/`name` |
| Contestant profile | `Contestant.tribe` string | Active membership + "Original: X" from first membership |
| Challenge forms (tribe grouping) | `Contestant.tribe` string | Active membership at event week |
| Elimination summaries | `Contestant.tribe` string | Membership at `eliminatedWeek` |
| Tribe page / tribe list | `Tribe` model | Combine `dissolvedAtWeek IS NULL` + active membership check |
| Event timeline | Not shown | Show merge/swap as milestone entries |

Legacy `Contestant.tribe` kept as "original tribe at season start." All runtime resolution moves to TribeMembership.

### Helper Function

```typescript
async function getContestantTribeAtWeek(
  contestantId: string,
  week: number
): Promise<Tribe | null>
```

Returns the tribe from the membership active at that week (`fromWeek <= week AND (toWeek IS NULL OR toWeek >= week)`). Must be eagerly loaded on list views to avoid N+1.

---

## Phase 10: Context-Aware Challenge Defaults

Read episode `gamePhase`:

| Phase | Immunity Default | UI Behavior |
|---|---|---|
| `PRE_MERGE` | Team (tribe-based) | Shows `tribeNames[]` picker |
| `MERGE_TRANSITION` | Team (grouped) | Shows `challengeGroups` builder |
| `MERGED` | Individual | Shows single winner picker |
| `FINAL_PHASE` | Individual | Shows single winner picker |

Admin can always override.

---

## File Change Summary

| File | Change |
|---|---|
| `prisma/schema.prisma` | `GamePhase`, `PhaseSource` enums; `Episode.gamePhase`/`phaseSource`; `GameEvent.sequenceInEpisode`; `League.mergeWeek`/`juryStartWeek`; `Tribe.dissolvedAtWeek`/`dissolvedByEventId`; `TribeMembership.gameEventId`; new enum values; unique index on Event |
| `src/lib/scoring.ts` | `MADE_MERGE` in labels, categories |
| `src/lib/constants/scoring-constants.ts` | `MADE_MERGE: 0` in `EVENT_POINTS` |
| `src/lib/event-derivation.ts` | `awardMilestone()` extraction, `ChallengeGroup`/`TribeMergeData`/`TribeSwapData` interfaces, derivation cases, mixed payload validation, labels, summaries |
| `src/lib/tribe-utils.ts` | New — `getContestantTribeAtWeek()` helper |
| `src/lib/phase-validation.ts` | New — `validatePhaseTransition()`, phase ordering |
| `src/lib/approval-guards.ts` | New — chronological approval check, downstream dependency check |
| `src/app/api/game-events/route.ts` | Chronological approval guard, approval side effects with transaction |
| `src/app/api/game-events/[id]/route.ts` | Unapproval blocking, milestone cleanup |
| `src/app/api/episodes/[id]/route.ts` | Phase validation on PATCH |
| `src/components/events/merge-form.tsx` | New |
| `src/components/events/tribe-swap-form.tsx` | New |
| `src/components/events/split-tribal-form.tsx` | New |
| `src/app/(dashboard)/events/submit/page.tsx` | Add merge, swap, split tribal to wizard |
| `src/app/admin/episodes/` | Phase dropdown with source indicator, inference, warnings |
| `src/app/admin/league/` | `juryStartWeek` field |
| All UI surfaces in inventory | Migrate from `Contestant.tribe` to `TribeMembership` resolution |
| `src/simulation/engine/data-mapper.ts` | `MADE_MERGE` in `BASE_EVENT_POINTS` |

**UX Improvements:** See `SWAP_MERGE_UX_IMPROVEMENT.md` for comprehensive plan to make swap/merge forms foolproof with status displays, smart mode detection, and real-time validation.

---

## Deferred

| Concept | Reason |
|---|---|
| State-affecting vs non-blocking event type tiers | v1 blocks all equally; split when friction justifies |
| Same-week approval ordering enforcement | `sequenceInEpisode` field exists, logic deferred |
| `POST_MERGE_SPLIT_TRIBAL` phase | Handled by workflow, not phase enum |
| `VotingGroup` DB model | Challenge groups + split tribal form cover it |
| Per-contestant merge status | Episode phase + memberships sufficient |
| Full event replay engine | Chronological approval sidesteps the need |

---

## Known Assumptions (v4)

These were identified through iterative review. Each is considered acceptable for v1 with noted risks.

1. **`sequenceInEpisode` defaults to 0 with no ordering guarantee.** Auto-increment on submission captures submission order, not game order. If admin submits TC before immunity challenge, sequence is wrong. No validation corrects this. Acceptable because v1 doesn't use the field for logic.

2. **Unique constraint `(contestantId, type, gameEventId)` doesn't prevent cross-GameEvent milestone duplicates.** A stricter `(contestantId, type)` would block legitimate repeatable events like `CORRECT_VOTE`. Milestones and repeatable events share the same Event model with different uniqueness needs. Acceptable because duplicate-source milestones require a bug, not normal operation.

3. **`phaseSource = MANUAL` episodes are invisible to event approval.** Merge approval skips MANUAL-locked episodes silently. No UI surfaces which episodes are manually locked. Admin must remember. Acceptable for a small admin team; would need a "locked phases" indicator for larger groups.

4. **Grace mode rollout has no automatic enforcement transition.** Needs a config flag or explicit deploy to switch from warn to enforce. Acceptable given single-admin deployment.

5. **`getContestantTribeAtWeek()` is an N+1 risk on list views.** Must be eagerly loaded. With 18 contestants this is fine. Would need denormalization or batch loading for larger datasets.

6. **Original pre-merge tribes show as "active" in simple `dissolvedAtWeek IS NULL` queries.** UI must combine dissolution check with active membership check to get the right tribe list post-merge. Three states exist (active, superseded by merge, formally dissolved) but only two are modeled explicitly.

7. **Phase validation prevents ordering violations but not duration absurdities.** Five consecutive `MERGE_TRANSITION` episodes passes validation. Acceptable because this requires deliberate admin action and is harmless to scoring logic.

8. **Split tribal TCs are two independent GameEvents with no formal link.** Querying "both halves" requires filtering by week + type. Indistinguishable from two unrelated same-week tribals in the data model.

9. **`Contestant.tribe` may not actually represent original tribe in existing data.** Redefining its semantics without auditing current values could surface wrong "original tribe" labels. Needs a one-time data audit before relying on it.

10. **Tribe swap roster validation has no "uneven" threshold defined.** Warns on uneven sizes but doesn't specify what counts as uneven. Acceptable because Survivor itself does uneven swaps — the warning is informational, not prescriptive.
