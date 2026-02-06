'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Users, Plus, Edit2, Trash2 } from 'lucide-react'

interface Tribe {
  id: string
  name: string
  color: string
}

interface Contestant {
  id: string
  name: string
  nickname: string | null
  tribe: string | null
  imageUrl: string | null
  originalSeasons: string | null
  isEliminated: boolean
  eliminatedWeek: number | null
  tribeMemberships?: Array<{
    id: string
    tribe: Tribe
    toWeek: number | null
  }>
}

export default function AdminContestantsPage() {
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [tribes, setTribes] = useState<Tribe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingContestant, setEditingContestant] = useState<Contestant | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [tribeId, setTribeId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [originalSeasons, setOriginalSeasons] = useState('')

  useEffect(() => {
    fetchContestants()
    fetchTribes()
  }, [])

  const fetchContestants = async () => {
    try {
      const res = await fetch('/api/contestants?includeMemberships=true')
      const data = await res.json()
      setContestants(data)
    } catch (error) {
      console.error('Failed to fetch contestants:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTribes = async () => {
    try {
      const res = await fetch('/api/tribes')
      const data = await res.json()
      setTribes(data)
    } catch (error) {
      console.error('Failed to fetch tribes:', error)
    }
  }

  const resetForm = () => {
    setName('')
    setNickname('')
    setTribeId('')
    setImageUrl('')
    setOriginalSeasons('')
    setEditingContestant(null)
  }

  const openEditDialog = (contestant: Contestant) => {
    setEditingContestant(contestant)
    setName(contestant.name)
    setNickname(contestant.nickname || '')
    const currentMembership = contestant.tribeMemberships?.find((m) => m.toWeek === null)
    setTribeId(currentMembership?.tribe.id || '')
    setImageUrl(contestant.imageUrl || '')
    setOriginalSeasons(contestant.originalSeasons || '')
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!name) return

    setIsSubmitting(true)
    try {
      const selectedTribe = tribes.find((t) => t.id === tribeId)

      if (editingContestant) {
        // Update contestant
        const res = await fetch(`/api/contestants/${editingContestant.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            nickname: nickname || null,
            tribe: selectedTribe?.name || null,
            imageUrl: imageUrl || null,
            originalSeasons: originalSeasons || null,
          }),
        })

        // Update tribe membership if tribe changed
        if (res.ok && tribeId) {
          const currentMembership = editingContestant.tribeMemberships?.find(
            (m) => m.toWeek === null
          )
          if (currentMembership?.tribe.id !== tribeId) {
            await fetch('/api/tribe-memberships', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contestantId: editingContestant.id,
                tribeId,
              }),
            })
          }
        }

        if (res.ok) {
          setIsDialogOpen(false)
          resetForm()
          fetchContestants()
        }
      } else {
        // Create contestant
        const res = await fetch('/api/contestants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            nickname: nickname || null,
            tribe: selectedTribe?.name || null,
            imageUrl: imageUrl || null,
            originalSeasons: originalSeasons || null,
          }),
        })
        if (res.ok) {
          const newContestant = await res.json()
          // Create tribe membership if tribe selected
          if (tribeId) {
            await fetch('/api/tribe-memberships', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contestantId: newContestant.id,
                tribeId,
              }),
            })
          }
          setIsDialogOpen(false)
          resetForm()
          fetchContestants()
        }
      }
    } catch (error) {
      console.error('Failed to save contestant:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (contestantId: string) => {
    if (!confirm('Are you sure you want to delete this contestant? This will also delete all their events.')) {
      return
    }

    try {
      const res = await fetch(`/api/contestants/${contestantId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchContestants()
      }
    } catch (error) {
      console.error('Failed to delete contestant:', error)
    }
  }

  const activeContestants = contestants.filter((c) => !c.isEliminated)
  const eliminatedContestants = contestants.filter((c) => c.isEliminated)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contestants</h1>
          <p className="text-muted-foreground">
            {activeContestants.length} active, {eliminatedContestants.length} eliminated
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contestant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingContestant ? 'Edit Contestant' : 'Add Contestant'}
              </DialogTitle>
              <DialogDescription>
                {editingContestant
                  ? 'Update contestant information'
                  : 'Add a new contestant to the season'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter contestant name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder='e.g. "Coach", "Ozzy"'
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="originalSeasons">Original Season(s)</Label>
                <Input
                  id="originalSeasons"
                  value={originalSeasons}
                  onChange={(e) => setOriginalSeasons(e.target.value)}
                  placeholder="e.g. 13,16,23,34"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tribe">Tribe</Label>
                {tribes.length > 0 ? (
                  <Select value={tribeId} onValueChange={setTribeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tribe" />
                    </SelectTrigger>
                    <SelectContent>
                      {tribes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: t.color }}
                            />
                            {t.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tribes created yet. Create tribes first in the Tribes page.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!name || isSubmitting}>
                {isSubmitting ? 'Saving...' : editingContestant ? 'Save Changes' : 'Add Contestant'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading contestants...
          </CardContent>
        </Card>
      ) : contestants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No contestants yet</p>
            <p className="text-sm text-muted-foreground">
              Add contestants to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeContestants.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Active ({activeContestants.length})</h2>
              {activeContestants.map((contestant) => (
                <ContestantCard
                  key={contestant.id}
                  contestant={contestant}
                  onEdit={() => openEditDialog(contestant)}
                  onDelete={() => handleDelete(contestant.id)}
                />
              ))}
            </div>
          )}

          {eliminatedContestants.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                Eliminated ({eliminatedContestants.length})
              </h2>
              {eliminatedContestants.map((contestant) => (
                <ContestantCard
                  key={contestant.id}
                  contestant={contestant}
                  onEdit={() => openEditDialog(contestant)}
                  onDelete={() => handleDelete(contestant.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ContestantCard({
  contestant,
  onEdit,
  onDelete,
}: {
  contestant: Contestant
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className={contestant.isEliminated ? 'opacity-60' : ''}>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12">
          {contestant.imageUrl && (
            <AvatarImage src={contestant.imageUrl} alt={contestant.name} />
          )}
          <AvatarFallback>
            {contestant.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {contestant.nickname
                ? `${contestant.name} "${contestant.nickname}"`
                : contestant.name}
            </p>
            {contestant.isEliminated && (
              <Badge variant="destructive">
                Out (Week {contestant.eliminatedWeek})
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            {contestant.originalSeasons && (
              <span>S{contestant.originalSeasons.replace(/,/g, ', S')}</span>
            )}
            {contestant.originalSeasons && ' · '}
            {(() => {
              const currentMembership = contestant.tribeMemberships?.find(
                (m) => m.toWeek === null
              )
              if (currentMembership) {
                return (
                  <>
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: currentMembership.tribe.color }}
                    />
                    {currentMembership.tribe.name}
                  </>
                )
              }
              return contestant.tribe || 'No tribe'
            })()}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
