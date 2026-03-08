# Tribe Swap/Merge UX Improvement Plan

## Problem Statement

The current tribe swap and merge forms don't provide enough context for users to confidently choose the right event type. Users need to understand:
- What's the difference between SWAP, DISSOLUTION, ABSORPTION, EXPANSION, and MERGE?
- Which mode should I use for this specific situation?
- Will my moves result in a valid tribe configuration?

Without this context, users may:
- Choose the wrong mode (e.g., SWAP when they mean DISSOLUTION)
- Create invalid tribe configurations (e.g., empty tribes without marking as dissolved)
- Not realize they need to create a new tribe first (EXPANSION)
- Confuse swap with merge

---

## Solution: Hybrid Context-Aware Wizard

Combine multiple UX patterns to make the flow foolproof:
1. **Tribe Status Display** - Show current state and predicted outcome
2. **Smart Mode Detection** - Auto-suggest mode based on moves
3. **Real-time Validation** - Warn about issues as they happen
4. **Plain-Language Descriptions** - Explain each mode in Survivor terms

---

## Implementation Plan

### Phase 1: Add Tribe Status Panel (Both Forms)

**Where:** `tribe-swap-form.tsx` and `merge-form.tsx`

**What to add:**

```typescript
interface TribeStatusSummary {
  currentTribes: Array<{
    id: string
    name: string
    color: string
    memberCount: number
  }>
  predictedTribes: Array<{
    id: string
    name: string
    color: string
    memberCount: number
    isEmpty: boolean
    isNew: boolean
  }>
  warnings: string[]
  suggestedMode?: SwapMode
}
```

**UI Component:**
```tsx
<TribeStatusPanel
  current={currentTribes}
  predicted={predictedTribes}
  warnings={warnings}
/>
```

**Display:**
```
┌────────────────────────────────────────┐
│ Tribe Status                           │
├────────────────────────────────────────┤
│ Current Tribes: 3                      │
│ ┌─────────────────────────┐            │
│ │ Gata (6) ████████       │            │
│ │ Lavo (6) ████████       │            │
│ │ Tuku (6) ████████       │            │
│ └─────────────────────────┘            │
│                                        │
│ After These Moves: 3 tribes           │
│ ┌─────────────────────────┐            │
│ │ Gata (4) ██████         │            │
│ │ Lavo (7) █████████      │            │
│ │ Tuku (7) █████████      │            │
│ └─────────────────────────┘            │
│                                        │
│ ℹ Looks like a balanced swap          │
└────────────────────────────────────────┘
```

---

### Phase 2: Add Mode Explanations

**Where:** `tribe-swap-form.tsx` - Replace bare mode dropdown

**Current UI:**
```tsx
<SelectItem value="SWAP">Tribe Swap</SelectItem>
<SelectItem value="DISSOLUTION">Tribe Dissolution</SelectItem>
```

**New UI:** Add descriptions with examples

```tsx
<SelectItem value="SWAP">
  <div className="flex flex-col">
    <span className="font-medium">Tribe Swap</span>
    <span className="text-xs text-muted-foreground">
      Players shuffle between existing tribes (same # of tribes)
    </span>
  </div>
</SelectItem>

<SelectItem value="DISSOLUTION">
  <div className="flex flex-col">
    <span className="font-medium">Tribe Dissolution</span>
    <span className="text-xs text-muted-foreground">
      One tribe dissolves, players redistribute (fewer tribes remain)
    </span>
  </div>
</SelectItem>

<SelectItem value="EXPANSION">
  <div className="flex flex-col">
    <span className="font-medium">Tribe Expansion</span>
    <span className="text-xs text-muted-foreground">
      A new tribe is formed, players redistribute (more tribes total)
    </span>
  </div>
</SelectItem>
```

**Alternative:** Show as radio buttons with full descriptions instead of dropdown

```tsx
<RadioGroup value={mode} onValueChange={setMode}>
  <div className="space-y-2">
    <div className="border rounded p-3 cursor-pointer hover:bg-accent">
      <RadioGroupItem value="SWAP" id="swap" />
      <Label htmlFor="swap" className="ml-2">
        <div className="font-medium">Tribe Swap</div>
        <div className="text-sm text-muted-foreground">
          Players shuffle between existing tribes. Same number of tribes before and after.
          Example: 3 tribes → 3 tribes with different members.
        </div>
      </Label>
    </div>

    <div className="border rounded p-3 cursor-pointer hover:bg-accent">
      <RadioGroupItem value="DISSOLUTION" id="dissolution" />
      <Label htmlFor="dissolution" className="ml-2">
        <div className="font-medium">Tribe Dissolution</div>
        <div className="text-sm text-muted-foreground">
          One tribe dissolves completely, members redistribute to remaining tribes.
          Example: 3 tribes → 2 tribes (Gata dissolves, everyone goes to Lavo/Tuku).
        </div>
      </Label>
    </div>

    <div className="border rounded p-3 cursor-pointer hover:bg-accent">
      <RadioGroupItem value="EXPANSION" id="expansion" />
      <Label htmlFor="expansion" className="ml-2">
        <div className="font-medium">Tribe Expansion</div>
        <div className="text-sm text-muted-foreground">
          A new tribe is created. Create the tribe in Admin → Tribes first, then assign players here.
          Example: 2 tribes → 3 tribes (new "Phoenix" tribe formed).
        </div>
      </Label>
    </div>
  </div>
</RadioGroup>
```

---

### Phase 3: Smart Mode Detection

**Where:** `tribe-swap-form.tsx`

**Logic:**

```typescript
const { suggestedMode, confidence, reasoning } = useMemo(() => {
  if (moves.length === 0) {
    return { suggestedMode: mode, confidence: 'none', reasoning: '' }
  }

  // Calculate resulting tribe distribution
  const tribeDistribution = new Map<string, number>()

  // Start with current counts
  for (const tribe of tribes) {
    tribeDistribution.set(tribe.id, tribe.contestantIds.length)
  }

  // Apply moves
  for (const move of moves) {
    tribeDistribution.set(
      move.fromTribeId,
      (tribeDistribution.get(move.fromTribeId) || 0) - 1
    )
    tribeDistribution.set(
      move.toTribeId,
      (tribeDistribution.get(move.toTribeId) || 0) + 1
    )
  }

  // Find empty tribes
  const emptyTribes = Array.from(tribeDistribution.entries())
    .filter(([_, count]) => count === 0)
    .map(([id]) => tribeMap.get(id))

  // Find tribes that didn't exist before
  const newTribes = Array.from(tribeDistribution.keys())
    .filter(id => !tribes.some(t => t.id === id))

  // Detect mode
  if (emptyTribes.length > 0) {
    return {
      suggestedMode: 'DISSOLUTION',
      confidence: 'high',
      reasoning: `${emptyTribes.map(t => t?.name).join(', ')} will have no members. This looks like a dissolution.`
    }
  }

  if (newTribes.length > 0) {
    return {
      suggestedMode: 'EXPANSION',
      confidence: 'high',
      reasoning: `Players moving to a tribe that didn't exist before. This looks like an expansion.`
    }
  }

  // Check if it's balanced (standard swap)
  const allTribesAffected = tribes.every(t =>
    moves.some(m => m.fromTribeId === t.id || m.toTribeId === t.id)
  )

  if (allTribesAffected) {
    return {
      suggestedMode: 'SWAP',
      confidence: 'medium',
      reasoning: 'Players shuffling between all existing tribes. This looks like a standard swap.'
    }
  }

  return {
    suggestedMode: mode,
    confidence: 'low',
    reasoning: ''
  }
}, [moves, tribes, tribeMap, mode])

// Show suggestion if it differs from selected mode
const showModeSuggestion = suggestedMode !== mode && confidence !== 'none'
```

**UI:**

```tsx
{showModeSuggestion && (
  <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-start gap-2">
    <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-medium text-blue-900">
        Suggested Mode: {suggestedMode}
      </p>
      <p className="text-xs text-blue-700 mt-1">{reasoning}</p>
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() => setMode(suggestedMode)}
      >
        Switch to {suggestedMode}
      </Button>
    </div>
  </div>
)}
```

---

### Phase 4: Real-Time Validation & Warnings

**Where:** `tribe-swap-form.tsx`

**Validations to add:**

```typescript
interface ValidationIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

const validationIssues = useMemo<ValidationIssue[]>(() => {
  const issues: ValidationIssue[] = []

  // Calculate tribe distribution after moves
  const distribution = calculateTribeDistribution(tribes, moves)

  // Check for empty tribes
  const emptyTribes = Array.from(distribution.entries())
    .filter(([_, count]) => count === 0)
    .map(([id]) => tribeMap.get(id))

  if (emptyTribes.length > 0 && mode !== 'DISSOLUTION' && mode !== 'ABSORPTION') {
    issues.push({
      type: 'warning',
      message: `${emptyTribes.map(t => t?.name).join(', ')} will have no members. Consider switching to DISSOLUTION mode and marking as dissolved.`,
      action: {
        label: 'Switch to Dissolution',
        onClick: () => setMode('DISSOLUTION')
      }
    })
  }

  if (emptyTribes.length > 0 && (mode === 'DISSOLUTION' || mode === 'ABSORPTION') && !dissolvedTribeId) {
    issues.push({
      type: 'error',
      message: `${emptyTribes.map(t => t?.name).join(', ')} will be empty but not marked as dissolved. Select a dissolved tribe below.`
    })
  }

  // Check for uneven distribution
  const counts = Array.from(distribution.values()).filter(c => c > 0)
  const min = Math.min(...counts)
  const max = Math.max(...counts)

  if (max - min >= 3) {
    issues.push({
      type: 'warning',
      message: `Uneven tribe sizes: smallest has ${min}, largest has ${max}. This may be intentional.`
    })
  }

  // Check for expansion without new tribe
  const newTribes = moves
    .map(m => m.toTribeId)
    .filter(id => !tribes.some(t => t.id === id))

  if (newTribes.length > 0) {
    issues.push({
      type: 'error',
      message: `Trying to move players to a tribe that doesn't exist. Create the new tribe in Admin → Tribes first.`
    })
  }

  // Check if mode is EXPANSION but no new tribes detected
  if (mode === 'EXPANSION' && tribes.length === new Set(moves.map(m => m.toTribeId)).size) {
    issues.push({
      type: 'info',
      message: `EXPANSION mode selected but no new tribes detected. Did you create the new tribe in Admin → Tribes?`
    })
  }

  // Check for incomplete moves (not all contestants assigned)
  const movedCount = moves.length
  const totalActive = active.length

  if (movedCount < totalActive / 2) {
    issues.push({
      type: 'info',
      message: `Only ${movedCount} of ${totalActive} players have moves. Is the swap complete?`
    })
  }

  return issues
}, [moves, tribes, mode, dissolvedTribeId, active, tribeMap])

// Block submit if any errors
const hasErrors = validationIssues.some(i => i.type === 'error')
const canSubmit = moves.length > 0 && !hasErrors
```

**UI:**

```tsx
{validationIssues.length > 0 && (
  <div className="space-y-2">
    {validationIssues.map((issue, i) => (
      <div
        key={i}
        className={cn(
          "border rounded p-3 flex items-start gap-2",
          issue.type === 'error' && "bg-red-50 border-red-200",
          issue.type === 'warning' && "bg-yellow-50 border-yellow-200",
          issue.type === 'info' && "bg-blue-50 border-blue-200"
        )}
      >
        {issue.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />}
        {issue.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />}
        {issue.type === 'info' && <Info className="h-5 w-5 text-blue-600 mt-0.5" />}

        <div className="flex-1">
          <p className="text-sm">{issue.message}</p>
          {issue.action && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={issue.action.onClick}
            >
              {issue.action.label}
            </Button>
          )}
        </div>
      </div>
    ))}
  </div>
)}
```

---

### Phase 5: Merge vs Swap Decision Helper

**Where:** Event submission wizard (before showing form selection)

**Problem:** Users might not know if they should use "Tribe Merge" or "Tribe Swap"

**Solution:** Add a pre-form decision screen

```tsx
// In submit page, before showing form
const [showMergeVsSwapHelper, setShowMergeVsSwapHelper] = useState(true)

{showMergeVsSwapHelper && (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">What's happening this episode?</h2>

    <div className="grid gap-3">
      <button
        onClick={() => {
          setEventType('TRIBE_MERGE')
          setShowMergeVsSwapHelper(false)
        }}
        className="border rounded p-4 text-left hover:bg-accent transition"
      >
        <div className="font-medium text-base">The Merge</div>
        <div className="text-sm text-muted-foreground mt-1">
          All remaining tribes combine into ONE merged tribe. Everyone lives together,
          votes together. This is THE merge. Usually happens around episode 6-8.
        </div>
        <div className="text-xs text-muted-foreground mt-2 italic">
          Example: Gata, Lavo, Tuku all become "Dakuwaqa"
        </div>
      </button>

      <button
        onClick={() => {
          setEventType('TRIBE_SWAP')
          setShowMergeVsSwapHelper(false)
        }}
        className="border rounded p-4 text-left hover:bg-accent transition"
      >
        <div className="font-medium text-base">Tribe Swap or Shuffle</div>
        <div className="text-sm text-muted-foreground mt-1">
          Players drop their buffs and get NEW tribe assignments. Still multiple tribes,
          just with different members. Usually happens before the merge.
        </div>
        <div className="text-xs text-muted-foreground mt-2 italic">
          Example: 3 contestants from Gata swap with 3 from Lavo
        </div>
      </button>

      <button
        onClick={() => setShowMergeVsSwapHelper(false)}
        className="text-sm text-muted-foreground underline"
      >
        Something else (show all event types)
      </button>
    </div>
  </div>
)}
```

---

### Phase 6: Helper for Expansion Pre-Work

**Where:** `tribe-swap-form.tsx`

**When:** User selects EXPANSION mode

**UI:**

```tsx
{mode === 'EXPANSION' && (
  <div className="bg-orange-50 border border-orange-200 rounded p-4 space-y-3">
    <div className="flex items-start gap-2">
      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-orange-900">Expansion Checklist</p>
        <p className="text-sm text-orange-700 mt-1">
          Before submitting an expansion, make sure you've:
        </p>
        <ul className="text-sm text-orange-700 mt-2 space-y-1 list-disc list-inside">
          <li>Created the new tribe in Admin → Tribes</li>
          <li>Set the tribe name, color, and details</li>
          <li>Set isMerge = false (it's a regular tribe)</li>
        </ul>
        <a
          href="/admin/tribes"
          target="_blank"
          className="inline-flex items-center gap-1 text-sm text-orange-800 underline mt-2"
        >
          Open Tribes Admin in new tab
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  </div>
)}
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/events/tribe-swap-form.tsx` | Add: tribe status panel, mode detection, validation warnings, expansion helper, radio buttons for mode |
| `src/components/events/merge-form.tsx` | Add: tribe status panel showing all tribes → 1 merge tribe |
| `src/components/events/tribe-status-panel.tsx` | New shared component for showing before/after tribe states |
| `src/app/(dashboard)/events/submit/page.tsx` | Add: merge vs swap decision helper screen before form selection |
| `docs/MERGE_IMPLEMENTATION_PLAN.md` | Update: reference this UX improvement plan |

---

## Implementation Order

### Week 1: Core Status Display
1. Create `TribeStatusPanel` component
2. Add to both swap and merge forms
3. Calculate predicted tribe distributions

### Week 2: Mode Detection & Validation
1. Add smart mode detection logic
2. Add real-time validation with error/warning/info messages
3. Add action buttons to validation messages (e.g., "Switch to Dissolution")

### Week 3: UI Improvements
1. Replace mode dropdown with radio buttons + descriptions
2. Add expansion checklist helper
3. Add merge vs swap decision screen

### Week 4: Testing & Polish
1. Test all combinations (3→2, 2→3, 3→3, merge scenarios)
2. Test validation edge cases
3. Polish UI animations and transitions

---

## Success Metrics

After implementation, users should be able to:
- ✅ See at a glance which tribes exist and how many members each has
- ✅ Understand the difference between swap, dissolution, expansion, and merge
- ✅ Get warned before creating invalid configurations (empty tribes, missing tribes)
- ✅ Know when to create a new tribe vs use existing tribes
- ✅ Get auto-suggestions for the right mode based on their moves
- ✅ Submit tribe events confidently without errors

---

## Known Edge Cases

1. **User adds moves then changes mode** - Status panel should update immediately
2. **User starts in wrong mode** - Smart detection + suggestion should guide them
3. **Multiple tribes become empty** - Validation should list all empty tribes
4. **User tries to expand without creating tribe** - Hard error blocks submit + link to admin
5. **Temporary swaps (1-episode)** - Not supported in v1, requires manual reversal (see main plan)

---

## Deferred (Future Enhancements)

- **Drag-and-drop tribe rosters** - Visual tribe cards with drag to move contestants
- **Bulk move tools** - "Move all from Gata to Lavo" button
- **Tribe creation inline** - Create new tribe without leaving the form
- **Historical swap patterns** - "S50E3 usually has a 3→2 swap" based on data
- **Preview approval effects** - Show exactly what memberships will change
