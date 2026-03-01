'use client'

import { useUser } from '@clerk/nextjs'
import { DebugConsole } from './debug-console'

export function AdminDebugWrapper() {
  const { user } = useUser()

  // Only show debug console for admins
  const isAdmin = user?.publicMetadata?.role === 'ADMIN'

  if (!isAdmin) return null

  return <DebugConsole />
}
