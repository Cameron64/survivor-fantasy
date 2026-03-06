'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  DollarSign,
  Mail,
  Pencil,
  Trash2,
  X,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  UserRoundPen,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { UserSyncPanel, SyncStatusBadge } from '@/components/admin/user-sync-panel'

interface User {
  id: string
  clerkId: string
  name: string
  email: string
  role: 'ADMIN' | 'MODERATOR' | 'USER'
  isPaid: boolean
  adminNotes: string | null
  tags: string[]
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

interface Invitation {
  id: string
  emailAddress: string
  status: string
  createdAt: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [paidFilter, setPaidFilter] = useState<string>('ALL')

  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Edit dialog
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    role: '' as string,
    isPaid: false,
    adminNotes: '',
    tags: [] as string[],
    newTag: '',
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete dialog
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Replace dialog
  const [replacingUser, setReplacingUser] = useState<User | null>(null)
  const [replaceForm, setReplaceForm] = useState({ name: '', email: '' })
  const [replaceLoading, setReplaceLoading] = useState(false)
  const [replaceError, setReplaceError] = useState('')

  // Sync panel
  const [syncOpenId, setSyncOpenId] = useState<string | null>(null)

  // Invitations section
  const [showInvitations, setShowInvitations] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchInvitations()
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

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/users/invitations')
      if (res.ok) {
        const data = await res.json()
        setInvitations(data)
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
      const matchesPaid =
        paidFilter === 'ALL' ||
        (paidFilter === 'PAID' && user.isPaid) ||
        (paidFilter === 'UNPAID' && !user.isPaid)
      return matchesSearch && matchesRole && matchesPaid
    })
  }, [users, searchQuery, roleFilter, paidFilter])

  // Quick actions
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

  // Invite
  const handleInvite = async () => {
    setInviteLoading(true)
    setInviteError('')
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Failed to send invitation')
        return
      }
      setShowInviteDialog(false)
      setInviteEmail('')
      fetchInvitations()
    } catch {
      setInviteError('Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/users/invitations/${invitationId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchInvitations()
      }
    } catch (error) {
      console.error('Failed to revoke invitation:', error)
    }
  }

  // Edit
  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      role: user.role,
      isPaid: user.isPaid,
      adminNotes: user.adminNotes || '',
      tags: [...user.tags],
      newTag: '',
    })
    setEditError('')
  }

  const handleAddTag = () => {
    const tag = editForm.newTag.trim()
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm({ ...editForm, tags: [...editForm.tags, tag], newTag: '' })
    }
  }

  const handleRemoveTag = (tag: string) => {
    setEditForm({ ...editForm, tags: editForm.tags.filter((t) => t !== tag) })
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setEditLoading(true)
    setEditError('')
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          role: editForm.role,
          isPaid: editForm.isPaid,
          adminNotes: editForm.adminNotes,
          tags: editForm.tags,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Failed to update user')
        return
      }
      setEditingUser(null)
      fetchUsers()
    } catch {
      setEditError('Failed to update user')
    } finally {
      setEditLoading(false)
    }
  }

  // Delete
  const openDeleteDialog = (user: User) => {
    setDeletingUser(user)
    setDeleteError('')
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.message || data.error || 'Failed to delete user')
        return
      }
      setDeletingUser(null)
      fetchUsers()
    } catch {
      setDeleteError('Failed to delete user')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Replace
  const openReplaceDialog = (user: User) => {
    setReplacingUser(user)
    setReplaceForm({ name: '', email: '' })
    setReplaceError('')
  }

  const handleReplace = async () => {
    if (!replacingUser) return
    setReplaceLoading(true)
    setReplaceError('')
    try {
      const res = await fetch(`/api/users/${replacingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: replaceForm.name,
          email: replaceForm.email,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setReplaceError(data.error || 'Failed to replace user')
        return
      }
      setReplacingUser(null)
      fetchUsers()
    } catch {
      setReplaceError('Failed to replace user')
    } finally {
      setReplaceLoading(false)
    }
  }

  const paidCount = users.filter((u) => u.isPaid).length
  const unpaidCount = users.filter((u) => !u.isPaid).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            {users.length} users &middot; {paidCount} paid &middot; {unpaidCount} unpaid
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <Mail className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <button
              className="flex items-center gap-2 w-full text-left font-medium"
              onClick={() => setShowInvitations(!showInvitations)}
            >
              <Mail className="h-4 w-4" />
              Pending Invitations ({invitations.length})
              {showInvitations ? (
                <ChevronUp className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-auto" />
              )}
            </button>
            {showInvitations && (
              <div className="mt-3 space-y-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{inv.emailAddress}</p>
                      <p className="text-xs text-muted-foreground">
                        Sent {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevokeInvitation(inv.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="MODERATOR">Moderator</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paidFilter} onValueChange={setPaidFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Paid" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading users...
          </CardContent>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {users.length === 0 ? 'No users yet' : 'No users match your filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
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
                      <SyncStatusBadge clerkId={user.clerkId} />
                      {user.adminNotes && (
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    {user.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {user.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {formatDate(user.createdAt)}
                      {user.invitedBy && ` \u00b7 Invited by ${user.invitedBy.name}`}
                      {user._count.invitees > 0 && ` \u00b7 ${user._count.invitees} invites`}
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

                    <Button size="icon" variant="ghost" onClick={() => openReplaceDialog(user)} title="Replace with real user">
                      <UserRoundPen className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Sync panel — auto-open for pending users, expandable for others */}
                {(syncOpenId === user.id || user.clerkId.startsWith('pending_')) && (
                  <UserSyncPanel
                    userId={user.id}
                    userEmail={user.email}
                    onRelinked={fetchUsers}
                  />
                )}
                {syncOpenId !== user.id && !user.clerkId.startsWith('pending_') && (
                  <div className="mt-2 pt-2 border-t">
                    <button
                      onClick={() => setSyncOpenId(syncOpenId === user.id ? null : user.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Check Clerk sync...
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an email invitation to join the league. They&apos;ll receive a link to create
              their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="player@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inviteEmail.trim()) handleInvite()
                }}
              />
            </div>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update {editingUser?.name}&apos;s profile and admin settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="MODERATOR">Moderator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment</Label>
                <Select
                  value={editForm.isPaid ? 'paid' : 'unpaid'}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, isPaid: value === 'paid' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Admin Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Private notes about this user..."
                value={editForm.adminNotes}
                onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {editForm.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={editForm.newTag}
                  onChange={(e) => setEditForm({ ...editForm, newTag: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!editForm.newTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading || !editForm.name.trim()}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace User Dialog */}
      <Dialog open={!!replacingUser} onOpenChange={(open) => !open && setReplacingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace User</DialogTitle>
            <DialogDescription>
              Hand {replacingUser?.name}&apos;s slot (and team) to a real person. The new person can
              use &quot;Forgot password&quot; at sign-in to set their credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {replacingUser?.team && replacingUser.team.contestants.length > 0 && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1">Team will be preserved:</p>
                <p className="text-muted-foreground">
                  {replacingUser.team.contestants.map((tc) => tc.contestant.name).join(', ')}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="replace-name">New person&apos;s name</Label>
              <Input
                id="replace-name"
                placeholder="Jane Smith"
                value={replaceForm.name}
                onChange={(e) => setReplaceForm({ ...replaceForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-email">New person&apos;s email</Label>
              <Input
                id="replace-email"
                type="email"
                placeholder="jane@example.com"
                value={replaceForm.email}
                onChange={(e) => setReplaceForm({ ...replaceForm, email: e.target.value })}
              />
            </div>
            {replaceError && <p className="text-sm text-destructive">{replaceError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplacingUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReplace}
              disabled={replaceLoading || !replaceForm.name.trim() || !replaceForm.email.trim()}
            >
              {replaceLoading ? 'Replacing...' : 'Replace User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete {deletingUser?.name} from both the app and Clerk. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingUser && deletingUser._count.eventSubmissions > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              This user has {deletingUser._count.eventSubmissions} event submission(s). You must
              reassign or delete their events before removing the user.
            </div>
          )}
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
