'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, ArrowRight } from 'lucide-react'

interface DraftStatus {
  status: 'not_started' | 'in_progress' | 'complete'
  currentPick?: number
  currentRound?: number
  currentUserId?: string
  draftOrder?: Array<{
    userId: string
    name: string
    picks: Array<{ id: string; name: string; tribe: string | null }>
  }>
  isComplete?: boolean
  message?: string
}

interface User {
  id: string
  name: string
}

export default function AdminDraftPage() {
  const [draftStatus, setDraftStatus] = useState<DraftStatus | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<string[]>([])

  useEffect(() => {
    fetchDraftStatus()
    fetchUsers()
  }, [])

  const fetchDraftStatus = async () => {
    try {
      const res = await fetch('/api/draft')
      const data = await res.json()
      setDraftStatus(data)
    } catch (error) {
      console.error('Failed to fetch draft status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.filter((u: User) => u))
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const addToOrder = (userId: string) => {
    if (!selectedOrder.includes(userId)) {
      setSelectedOrder([...selectedOrder, userId])
    }
  }

  const removeFromOrder = (userId: string) => {
    setSelectedOrder(selectedOrder.filter((id) => id !== userId))
  }

  const initializeDraft = async () => {
    if (selectedOrder.length < 2) {
      alert('Need at least 2 users to start a draft')
      return
    }

    setIsInitializing(true)
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          draftOrder: selectedOrder,
        }),
      })
      if (res.ok) {
        fetchDraftStatus()
      }
    } catch (error) {
      console.error('Failed to initialize draft:', error)
    } finally {
      setIsInitializing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Draft Management</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Draft Management</h1>
        <p className="text-muted-foreground">
          {draftStatus?.status === 'not_started'
            ? 'Initialize the draft order'
            : draftStatus?.status === 'in_progress'
              ? `Draft in progress - Round ${draftStatus.currentRound}, Pick ${draftStatus.currentPick}`
              : 'Draft is complete'}
        </p>
      </div>

      {draftStatus?.status === 'not_started' && (
        <Card>
          <CardHeader>
            <CardTitle>Set Draft Order</CardTitle>
            <CardDescription>
              Select users in the order they should draft. This will use snake draft format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Available Users</h3>
              <div className="flex flex-wrap gap-2">
                {users
                  .filter((u) => !selectedOrder.includes(u.id))
                  .map((user) => (
                    <Button
                      key={user.id}
                      variant="outline"
                      size="sm"
                      onClick={() => addToOrder(user.id)}
                    >
                      {user.name}
                    </Button>
                  ))}
              </div>
              {users.filter((u) => !selectedOrder.includes(u.id)).length === 0 && (
                <p className="text-sm text-muted-foreground">All users added to order</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Draft Order</h3>
              {selectedOrder.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Click users above to add them to the draft order
                </p>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedOrder.map((userId, index) => {
                    const user = users.find((u) => u.id === userId)
                    return (
                      <div key={userId} className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeFromOrder(userId)}
                        >
                          {index + 1}. {user?.name || 'Unknown'}
                        </Badge>
                        {index < selectedOrder.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={initializeDraft}
              disabled={selectedOrder.length < 2 || isInitializing}
            >
              {isInitializing ? 'Initializing...' : 'Start Draft'}
            </Button>
          </CardContent>
        </Card>
      )}

      {(draftStatus?.status === 'in_progress' || draftStatus?.status === 'complete') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Draft Board
            </CardTitle>
            <CardDescription>
              {draftStatus.isComplete
                ? 'Draft is complete!'
                : `Current pick: ${draftStatus.draftOrder?.find((u) => u.userId === draftStatus.currentUserId)?.name || 'Unknown'}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {draftStatus.draftOrder?.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    entry.userId === draftStatus.currentUserId && !draftStatus.isComplete
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    <span className="text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{entry.name}</p>
                    <div className="flex gap-2 mt-1">
                      {entry.picks.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No picks yet</span>
                      ) : (
                        entry.picks.map((pick, pickIndex) => (
                          <Badge key={pick.id} variant="secondary">
                            #{pickIndex + 1}: {pick.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  {entry.userId === draftStatus.currentUserId && !draftStatus.isComplete && (
                    <Badge variant="default">On the clock</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
