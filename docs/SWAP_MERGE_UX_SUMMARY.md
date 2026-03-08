# Swap/Merge UX Improvements - Quick Reference

## The Problem
Users can't tell which mode to use (SWAP vs DISSOLUTION vs EXPANSION vs MERGE) without deep Survivor knowledge.

## The Solution
**Hybrid Context-Aware Wizard** with 4 components:

### 1. 📊 Tribe Status Display
Shows before/after tribe counts with visual bars:
```
Current: 3 tribes (Gata: 6, Lavo: 6, Tuku: 6)
After:   2 tribes (Lavo: 9, Tuku: 9)
⚠ Gata will be empty → Looks like DISSOLUTION
```

### 2. 🧠 Smart Mode Detection
Auto-suggests mode based on moves:
- Empty tribe detected → suggest DISSOLUTION
- New tribe detected → suggest EXPANSION
- Balanced shuffle → suggest SWAP
- All to one tribe → suggest MERGE

### 3. ⚠️ Real-Time Validation
Warns as user builds moves:
- **Error:** "Gata will be empty but not marked as dissolved"
- **Warning:** "Uneven sizes: smallest 4, largest 8"
- **Info:** "Only 6 of 18 players moved. Swap complete?"

### 4. 📖 Plain-Language Descriptions
Replace technical terms with Survivor language:
```
○ The Merge
  All tribes combine into ONE. This is THE merge.
  Example: Gata, Lavo, Tuku → Dakuwaqa

○ Tribe Swap
  Players shuffle between existing tribes.
  Example: 3 Gata swap with 3 Lavo
```

---

## Implementation Priority

### Must-Have (Blocks Episode 3)
- ✅ Tribe status display (show before/after counts)
- ✅ Empty tribe warning
- ✅ Plain-language mode descriptions

### Should-Have (Nice for Episode 3)
- Smart mode detection + suggestions
- Real-time validation with action buttons
- Expansion checklist helper

### Nice-to-Have (Later)
- Merge vs Swap decision screen
- Drag-and-drop rosters
- Inline tribe creation

---

## Quick Win for Episode 3

**If short on time, implement just this:**

Add to `tribe-swap-form.tsx` after the mode selector:

```tsx
{mode === 'SWAP' && (
  <p className="text-sm text-muted-foreground">
    Players shuffle between existing tribes. Same number of tribes before and after.
  </p>
)}

{mode === 'DISSOLUTION' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
    <p className="text-sm font-medium">One tribe will dissolve</p>
    <p className="text-sm text-muted-foreground mt-1">
      Select which tribe to mark as dissolved below.
    </p>
  </div>
)}

{mode === 'EXPANSION' && (
  <div className="bg-orange-50 border border-orange-200 rounded p-3">
    <p className="text-sm font-medium">⚠ Create the new tribe first</p>
    <p className="text-sm text-muted-foreground mt-1">
      Go to Admin → Tribes and create the new tribe before submitting this swap.
    </p>
  </div>
)}
```

That alone prevents most confusion.

---

## Full Details
See `SWAP_MERGE_UX_IMPROVEMENT.md` for complete implementation plan with code samples and all edge cases.
