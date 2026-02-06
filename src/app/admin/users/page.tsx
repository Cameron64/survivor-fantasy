'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, DollarSign } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MODERATOR' | 'USER'
  isPaid: boolean
  inviteCode: string | null
  createdAt: string
  team: {
    contestants: Array<{
      contestant: { id: string; name: string }
    }>
  } | null
  invitedBy: { id: string; name: string } | null
  _count: {
    invitees: number
    eventSubmissions: number
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePaid = async (userId: string, isPaid: boolean) => {
    setProcessingId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid }),
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleChangeRole = async (userId: string, role: string) => {
    setProcessingId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const paidCount = users.filter((u) => u.isPaid).length
  const unpaidCount = users.filter((u) => !u.isPaid).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          {users.length} users • {paidCount} paid • {unpaidCount} unpaid
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading users...
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No users yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{user.name}</p>
                    <Badge
                      variant={
                        user.role === 'ADMIN'
                          ? 'default'
                          : user.role === 'MODERATOR'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {user.role}
                    </Badge>
                    <Badge variant={user.isPaid ? 'success' : 'outline'}>
                      {user.isPaid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {formatDate(user.createdAt)}
                    {user.invitedBy && ` • Invited by ${user.invitedBy.name}`}
                    {user._count.invitees > 0 && ` • ${user._count.invitees} invites`}
                  </p>
                  {user.team && user.team.contestants.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Team: {user.team.contestants.map((tc) => tc.contestant.name).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleChangeRole(user.id, value)}
                    disabled={processingId === user.id}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="MODERATOR">Moderator</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant={user.isPaid ? 'outline' : 'default'}
                    onClick={() => handleTogglePaid(user.id, !user.isPaid)}
                    disabled={processingId === user.id}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    {user.isPaid ? 'Mark Unpaid' : 'Mark Paid'}
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
