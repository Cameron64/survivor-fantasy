'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Palette, Plus, Edit2, Trash2 } from 'lucide-react'

interface Tribe {
  id: string
  name: string
  color: string
  isMerge: boolean
  _count: { members: number }
}

export default function AdminTribesPage() {
  const [tribes, setTribes] = useState<Tribe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingTribe, setEditingTribe] = useState<Tribe | null>(null)

  const [name, setName] = useState('')
  const [color, setColor] = useState('#FF6B35')
  const [isMerge, setIsMerge] = useState(false)

  useEffect(() => {
    fetchTribes()
  }, [])

  const fetchTribes = async () => {
    try {
      const res = await fetch('/api/tribes')
      const data = await res.json()
      setTribes(data)
    } catch (error) {
      console.error('Failed to fetch tribes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setColor('#FF6B35')
    setIsMerge(false)
    setEditingTribe(null)
  }

  const openEditDialog = (tribe: Tribe) => {
    setEditingTribe(tribe)
    setName(tribe.name)
    setColor(tribe.color)
    setIsMerge(tribe.isMerge)
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!name || !color) return

    setIsSubmitting(true)
    try {
      if (editingTribe) {
        const res = await fetch(`/api/tribes/${editingTribe.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color, isMerge }),
        })
        if (res.ok) {
          setIsDialogOpen(false)
          resetForm()
          fetchTribes()
        }
      } else {
        const res = await fetch('/api/tribes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, color, isMerge }),
        })
        if (res.ok) {
          setIsDialogOpen(false)
          resetForm()
          fetchTribes()
        }
      }
    } catch (error) {
      console.error('Failed to save tribe:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (tribeId: string) => {
    if (!confirm('Are you sure? This will remove all tribe memberships for this tribe.')) {
      return
    }

    try {
      const res = await fetch(`/api/tribes/${tribeId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchTribes()
      }
    } catch (error) {
      console.error('Failed to delete tribe:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tribes</h1>
          <p className="text-muted-foreground">
            {tribes.length} tribe{tribes.length !== 1 ? 's' : ''} configured
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
              Add Tribe
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingTribe ? 'Edit Tribe' : 'Add Tribe'}
              </DialogTitle>
              <DialogDescription>
                {editingTribe ? 'Update tribe details' : 'Create a new tribe for the season'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tribe-name">Name *</Label>
                <Input
                  id="tribe-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter tribe name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tribe-color">Color *</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    id="tribe-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#FF6B35"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tribe-merge"
                  checked={isMerge}
                  onChange={(e) => setIsMerge(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="tribe-merge">Merge tribe</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!name || !color || isSubmitting}>
                {isSubmitting ? 'Saving...' : editingTribe ? 'Save Changes' : 'Add Tribe'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading tribes...
          </CardContent>
        </Card>
      ) : tribes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Palette className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No tribes yet</p>
            <p className="text-sm text-muted-foreground">
              Create tribes to organize contestants
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tribes.map((tribe) => (
            <Card key={tribe.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full shrink-0"
                      style={{ backgroundColor: tribe.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tribe.name}</p>
                        {tribe.isMerge && (
                          <Badge variant="secondary" className="text-xs">
                            Merge
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tribe._count.members} member{tribe._count.members !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(tribe)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(tribe.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
