'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ExternalLink } from 'lucide-react'
import type { TribeSwapData } from '@/lib/event-derivation'
import { ContestantSelectTile } from '@/components/shared/contestant-select-tile'
import type { FormContestant } from '@/components/shared/contestant-label'
import type { TribeGroup } from '@/app/(dashboard)/events/submit/_lib/submit-context'
import { cn } from '@/lib/utils'
import { getAvailableSwapModes, isSwapModeEnabled, isDissolutionModeEnabled, isExpansionModeEnabled } from '@/lib/feature-flags'
import { useFeatureFlags } from '@/lib/feature-flags-context'

type SwapMode = 'SWAP' | 'DISSOLUTION' | 'EXPANSION'

interface TribeSwapFormProps {
  contestants: FormContestant[]
  tribes: TribeGroup[]
  week: string
  onSubmit: (data: TribeSwapData) => void
  onBack: () => void
}

export function TribeSwapForm({ contestants, tribes, week, onSubmit, onBack }: TribeSwapFormProps) {
  const flags = useFeatureFlags()
  const availableModes = getAvailableSwapModes(flags)
  const [mode, setMode] = useState<SwapMode>(availableModes[0] || 'SWAP')
  const [dissolvedTribeId, setDissolvedTribeId] = useState<string>('')
  const [showSummary, setShowSummary] = useState(false)

  // Track which contestants are assigned to which tribe (new assignments)
  // Key: tribeId, Value: Set of contestantIds
  const [newTribeAssignments, setNewTribeAssignments] = useState<Map<string, Set<string>>>(
    new Map(tribes.map(t => [t.id, new Set<string>()]))
  )

  const active = useMemo(
    () => contestants.filter((c) => !c.isEliminated),
    [contestants]
  )

  // Build tribe lookup
  const tribeMap = useMemo(() => {
    const m = new Map<string, TribeGroup>()
    for (const t of tribes) {
      m.set(t.id, t)
    }
    return m
  }, [tribes])

  // Get contestant's CURRENT tribe (before swap)
  const getOriginalTribe = (contestantId: string): TribeGroup | undefined => {
    return tribes.find((t) => t.contestantIds.includes(contestantId))
  }

  // Get contestant's NEW tribe (after assignments)
  const getNewTribe = (contestantId: string): string | null => {
    for (const [tribeId, contestantIds] of Array.from(newTribeAssignments.entries())) {
      if (contestantIds.has(contestantId)) {
        return tribeId
      }
    }
    return null
  }

  // Toggle contestant assignment to a tribe
  const toggleContestant = (tribeId: string, contestantId: string) => {
    const newAssignments = new Map(newTribeAssignments)
    const tribeSet = new Set(newAssignments.get(tribeId) || [])

    // Remove from all other tribes first
    for (const [otherId, otherSet] of Array.from(newAssignments.entries())) {
      if (otherId !== tribeId) {
        otherSet.delete(contestantId)
      }
    }

    // Toggle in current tribe
    if (tribeSet.has(contestantId)) {
      tribeSet.delete(contestantId)
    } else {
      tribeSet.add(contestantId)
    }

    newAssignments.set(tribeId, tribeSet)
    setNewTribeAssignments(newAssignments)
  }

  // Calculate moves based on new assignments
  const moves = useMemo(() => {
    const movesList: Array<{
      contestantId: string
      fromTribeId: string
      toTribeId: string
    }> = []

    for (const contestant of active) {
      const originalTribe = getOriginalTribe(contestant.id)
      const newTribeId = getNewTribe(contestant.id)

      if (originalTribe && newTribeId && originalTribe.id !== newTribeId) {
        movesList.push({
          contestantId: contestant.id,
          fromTribeId: originalTribe.id,
          toTribeId: newTribeId,
        })
      }
    }

    return movesList
  }, [active, newTribeAssignments, tribes])

  // Find contestants not yet assigned
  const unassignedContestants = useMemo(() => {
    return active.filter(c => !getNewTribe(c.id))
  }, [active, newTribeAssignments])

  // Validation
  const validationIssues = useMemo(() => {
    const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string }> = []

    if (unassignedContestants.length > 0) {
      issues.push({
        type: 'error',
        message: `${unassignedContestants.length} contestant${unassignedContestants.length !== 1 ? 's' : ''} not assigned: ${unassignedContestants.map(c => c.name).join(', ')}`
      })
    }

    if (moves.length === 0 && unassignedContestants.length === 0) {
      issues.push({
        type: 'warning',
        message: 'No changes detected - everyone stayed on their original tribe'
      })
    }

    // Check for dissolved tribe in DISSOLUTION mode
    if (mode === 'DISSOLUTION') {
      if (!dissolvedTribeId) {
        issues.push({
          type: 'error',
          message: 'Please select which tribe was dissolved'
        })
      } else {
        const dissolvedTribeMembers = newTribeAssignments.get(dissolvedTribeId)?.size || 0
        if (dissolvedTribeMembers > 0) {
          issues.push({
            type: 'error',
            message: `The dissolved tribe (${tribeMap.get(dissolvedTribeId)?.name}) still has members assigned. Reassign them to other tribes.`
          })
        }
      }
    }

    return issues
  }, [unassignedContestants, moves, mode, dissolvedTribeId, newTribeAssignments, tribeMap])

  const hasErrors = validationIssues.some(i => i.type === 'error')
  const canSubmit = moves.length > 0 && !hasErrors

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      mode,
      moves,
      swapWeek: parseInt(week),
      ...(dissolvedTribeId && { dissolvedTribeId }),
    })
  }

  if (showSummary) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Review Swap</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowSummary(false)}>
            ← Edit
          </Button>
        </div>

        {/* Summary by tribe */}
        <div className="space-y-4">
          {tribes.map(tribe => {
            const members = active.filter(c => getNewTribe(c.id) === tribe.id)
            if (members.length === 0 && mode !== 'DISSOLUTION') return null

            return (
              <div key={tribe.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: tribe.color }}
                  />
                  <h4 className="font-semibold">{tribe.name}</h4>
                  <span className="text-sm text-muted-foreground">({members.length})</span>
                  {mode === 'DISSOLUTION' && dissolvedTribeId === tribe.id && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Dissolved</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {members.map(contestant => {
                    const originalTribe = getOriginalTribe(contestant.id)
                    const moved = originalTribe?.id !== tribe.id

                    return (
                      <div key={contestant.id} className="flex items-center gap-2 text-sm">
                        <span className={cn(moved && "font-medium")}>
                          {contestant.name}
                        </span>
                        {moved && (
                          <span className="text-xs text-green-600">← from {originalTribe?.name}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Validation messages */}
        {validationIssues.length > 0 && (
          <div className="space-y-2">
            {validationIssues.map((issue, i) => (
              <div
                key={i}
                className={cn(
                  "border rounded p-3 flex items-start gap-2 text-sm",
                  issue.type === 'error' && "bg-red-50 border-red-200",
                  issue.type === 'warning' && "bg-yellow-50 border-yellow-200",
                  issue.type === 'info' && "bg-blue-50 border-blue-200"
                )}
              >
                {issue.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />}
                {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />}
                {issue.type === 'info' && <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />}
                <p>{issue.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1"
          >
            Submit Swap ({moves.length} move{moves.length !== 1 ? 's' : ''})
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Swap Mode */}
      <div className="space-y-2">
        <Label>Swap Type</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as SwapMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {isSwapModeEnabled(flags) && <SelectItem value="SWAP">Tribe Swap</SelectItem>}
            {isDissolutionModeEnabled(flags) && <SelectItem value="DISSOLUTION">Tribe Dissolution</SelectItem>}
            {isExpansionModeEnabled(flags) && <SelectItem value="EXPANSION">Tribe Expansion</SelectItem>}
          </SelectContent>
        </Select>

        {/* Mode descriptions */}
        <div className="text-sm text-muted-foreground rounded bg-muted p-3">
          {mode === 'SWAP' && (
            <p>Players shuffle between existing tribes. Same number of tribes before and after.</p>
          )}
          {mode === 'DISSOLUTION' && (
            <p>One tribe dissolves completely, members redistribute to remaining tribes. Fewer tribes remain.</p>
          )}
          {mode === 'EXPANSION' && (
            <p>A new tribe is created and players redistribute. More tribes total. <strong>Create the new tribe in Admin → Tribes first.</strong></p>
          )}
        </div>
      </div>

      {/* Expansion helper */}
      {mode === 'EXPANSION' && (
        <div className="bg-orange-50 border border-orange-200 rounded p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-orange-900">Expansion Checklist</p>
              <p className="text-sm text-orange-700 mt-1">
                Before submitting an expansion, make sure you&apos;ve:
              </p>
              <ul className="text-sm text-orange-700 mt-2 space-y-1 list-disc list-inside">
                <li>Created the new tribe in Admin → Tribes</li>
                <li>Set the tribe name, color, and details</li>
                <li>Set isMerge = false (it&apos;s a regular tribe)</li>
              </ul>
              <a
                href="/admin/tribes"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-orange-800 underline mt-2"
              >
                Open Tribes Admin in new tab
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Dissolved Tribe Selection (for DISSOLUTION mode) */}
      {mode === 'DISSOLUTION' && (
        <div className="space-y-2">
          <Label>Dissolved Tribe (required)</Label>
          <Select value={dissolvedTribeId} onValueChange={setDissolvedTribeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select tribe to dissolve" />
            </SelectTrigger>
            <SelectContent>
              {tribes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tab-based tribe assignment */}
      <div className="space-y-2">
        <Label>Assign Contestants to Tribes</Label>
        <p className="text-sm text-muted-foreground">
          Go tribe-by-tribe and select everyone on that tribe after the swap
        </p>

        <Tabs defaultValue={tribes[0]?.id} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tribes.length}, 1fr)` }}>
            {tribes.map(tribe => {
              const memberCount = newTribeAssignments.get(tribe.id)?.size || 0
              return (
                <TabsTrigger
                  key={tribe.id}
                  value={tribe.id}
                  className="relative"
                >
                  <span
                    className="h-2 w-2 rounded-full mr-2"
                    style={{ backgroundColor: tribe.color }}
                  />
                  {tribe.name}
                  {memberCount > 0 && (
                    <CheckCircle2 className="h-3 w-3 ml-1 text-green-600" />
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {tribes.map(tribe => {
            const assignedHere = newTribeAssignments.get(tribe.id) || new Set()
            const memberCount = assignedHere.size

            return (
              <TabsContent key={tribe.id} value={tribe.id} className="space-y-3 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">
                    Select everyone on <span className="font-medium">{tribe.name}</span>
                  </p>
                  <p className="font-medium">
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {active.map((contestant) => {
                    const isSelected = assignedHere.has(contestant.id)
                    const assignedToOtherTribe = !isSelected && getNewTribe(contestant.id) !== null

                    return (
                      <ContestantSelectTile
                        key={contestant.id}
                        contestant={contestant}
                        isSelected={isSelected}
                        onClick={() => toggleContestant(tribe.id, contestant.id)}
                        variant="primary"
                        disabled={assignedToOtherTribe}
                      />
                    )
                  })}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>

      {/* Status summary */}
      <div className="bg-muted rounded p-3 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total contestants:</span>
          <span className="font-medium">{active.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Assigned:</span>
          <span className={cn(
            "font-medium",
            active.length - unassignedContestants.length === active.length ? "text-green-600" : "text-yellow-600"
          )}>
            {active.length - unassignedContestants.length}
          </span>
        </div>
        {unassignedContestants.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Not assigned:</span>
            <span className="font-medium text-red-600">{unassignedContestants.length}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-muted-foreground">Moves detected:</span>
          <span className="font-medium">{moves.length}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => setShowSummary(true)}
          disabled={unassignedContestants.length > 0}
          className="flex-1"
        >
          Review Swap
        </Button>
      </div>
    </div>
  )
}
