import { getCurrentUser } from '@/lib/auth'
import { AdminDebugWrapperClient } from './admin-debug-wrapper-client'

export async function AdminDebugWrapper() {
  const user = await getCurrentUser()

  // Only show debug console for admins (checked from database)
  const isAdmin = user?.role === 'ADMIN'

  if (!isAdmin) return null

  return <AdminDebugWrapperClient />
}
