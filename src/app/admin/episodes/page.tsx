'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { CalendarDays, Plus, Edit2, Trash2, Zap } from 'lucide-react'

interface Episode {
  id: string
  number: number
  title: string | null
  airDate: string
}

export default function AdminEpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null)

  // Single episode form
  const [number, setNumber] = useState('')
  const [title, setTitle] = useState('')
  const [airDate, setAirDate] = useState('')

  // Bulk form
  const [bulkStartDate, setBulkStartDate] = useState('')
  const [bulkCount, setBulkCount] = useState('13')

  useEffect(() => {
    fetchEpisodes()
  }, [])

  const fetchEpisodes = async () => {
    try {
      const res = await fetch('/api/episodes')
      const data = await res.json()
      setEpisodes(data)
    } catch (error) {
      console.error('Failed to fetch episodes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNumber('')
    setTitle('')
    setAirDate('')
    setEditingEpisode(null)
  }

  const openEditDialog = (episode: Episode) => {
    setEditingEpisode(episode)
    setNumber(String(episode.number))
    setTitle(episode.title || '')
    setAirDate(episode.airDate.split('T')[0])
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!number || !airDate) return

    setIsSubmitting(true)
    try {
      if (editingEpisode) {
        const res = await fetch(`/api/episodes/${editingEpisode.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: parseInt(number),
            title: title || null,
            airDate,
          }),
        })
        if (res.ok) {
          setIsDialogOpen(false)
          resetForm()
          fetchEpisodes()
        }
      } else {
        const res = await fetch('/api/episodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: parseInt(number),
            title: title || null,
            airDate,
          }),
        })
        if (res.ok) {
          setIsDialogOpen(false)
          resetForm()
          fetchEpisodes()
        }
      }
    } catch (error) {
      console.error('Failed to save episode:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkGenerate = async () => {
    if (!bulkStartDate || !bulkCount) return

    if (episodes.length > 0 && !confirm('This will replace all existing episodes. Continue?')) {
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/episodes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: bulkStartDate,
          count: parseInt(bulkCount),
        }),
      })
      if (res.ok) {
        setIsBulkDialogOpen(false)
        setBulkStartDate('')
        setBulkCount('13')
        fetchEpisodes()
      }
    } catch (error) {
      console.error('Failed to bulk generate episodes:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (episodeId: string) => {
    if (!confirm('Delete this episode?')) return

    try {
      const res = await fetch(`/api/episodes/${episodeId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchEpisodes()
      }
    } catch (error) {
      console.error('Failed to delete episode:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Episodes</h1>
          <p className="text-muted-foreground">
            {episodes.length} episode{episodes.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
        <div className="flex gap-2">
          {/* Bulk generate dialog */}
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Zap className="h-4 w-4 mr-2" />
                Bulk Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Bulk Generate Episodes</DialogTitle>
                <DialogDescription>
                  Generate weekly episodes starting from a date. This replaces any existing episodes.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="bulk-start">Start Date *</Label>
                  <Input
                    id="bulk-start"
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bulk-count">Number of Episodes *</Label>
                  <Input
                    id="bulk-count"
                    type="number"
                    min="1"
                    max="20"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleBulkGenerate}
                  disabled={!bulkStartDate || !bulkCount || isSubmitting}
                >
                  {isSubmitting ? 'Generating...' : 'Generate Episodes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Single episode dialog */}
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
                Add Episode
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingEpisode ? 'Edit Episode' : 'Add Episode'}
                </DialogTitle>
                <DialogDescription>
                  {editingEpisode ? 'Update episode details' : 'Add a single episode'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="ep-number">Episode Number *</Label>
                  <Input
                    id="ep-number"
                    type="number"
                    min="1"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ep-title">Title</Label>
                  <Input
                    id="ep-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Episode title (optional)"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ep-date">Air Date *</Label>
                  <Input
                    id="ep-date"
                    type="date"
                    value={airDate}
                    onChange={(e) => setAirDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSubmit} disabled={!number || !airDate || isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingEpisode ? 'Save Changes' : 'Add Episode'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading episodes...
          </CardContent>
        </Card>
      ) : episodes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No episodes scheduled</p>
            <p className="text-sm text-muted-foreground">
              Add episodes individually or use bulk generate
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {episodes.map((episode) => (
            <Card key={episode.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {episode.number}
                  </div>
                  <div>
                    <p className="font-medium">
                      Episode {episode.number}
                      {episode.title && `: ${episode.title}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(episode.airDate)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(episode)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(episode.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
