import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { Shield, Users, Calendar, Settings, Trophy, ArrowLeft, Palette, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    redirect('/')
  }

  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-amber-50/30 dark:bg-amber-950/10">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-amber-300/50 dark:border-amber-700/50 bg-amber-100/90 dark:bg-amber-950/80 backdrop-blur supports-[backdrop-filter]:bg-amber-100/70 dark:supports-[backdrop-filter]:bg-amber-950/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/leaderboard">
            <Button variant="ghost" size="sm" className="hover:bg-amber-200/50 dark:hover:bg-amber-900/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              <Shield className="h-4 w-4" />
              Admin Panel
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-14 border-r border-amber-300/50 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/20">
          <nav className="flex-1 px-2 py-4 space-y-1">
            <AdminNavLink href="/admin" icon={Shield}>
              Overview
            </AdminNavLink>
            <AdminNavLink href="/admin/events" icon={Calendar}>
              Events
            </AdminNavLink>
            {isAdmin && (
              <>
                <AdminNavLink href="/admin/users" icon={Users}>
                  Users
                </AdminNavLink>
                <AdminNavLink href="/admin/contestants" icon={Users}>
                  Contestants
                </AdminNavLink>
                <AdminNavLink href="/admin/tribes" icon={Palette}>
                  Tribes
                </AdminNavLink>
                <AdminNavLink href="/admin/episodes" icon={CalendarDays}>
                  Episodes
                </AdminNavLink>
                <AdminNavLink href="/admin/draft" icon={Trophy}>
                  Draft
                </AdminNavLink>
                <AdminNavLink href="/admin/league" icon={Settings}>
                  League
                </AdminNavLink>
              </>
            )}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-amber-300/50 dark:border-amber-700/50 bg-amber-100/90 dark:bg-amber-950/80 z-50">
          <div className="flex items-center justify-around h-14 px-2">
            <MobileAdminNavLink href="/admin" icon={Shield} label="Overview" />
            <MobileAdminNavLink href="/admin/events" icon={Calendar} label="Events" />
            {isAdmin && (
              <>
                <MobileAdminNavLink href="/admin/users" icon={Users} label="Users" />
                <MobileAdminNavLink href="/admin/contestants" icon={Users} label="Players" />
                <MobileAdminNavLink href="/admin/tribes" icon={Palette} label="Tribes" />
                <MobileAdminNavLink href="/admin/episodes" icon={CalendarDays} label="Episodes" />
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 md:pl-56">
          <div className="py-6 px-4 sm:px-6 lg:px-8 pb-20 md:pb-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

function AdminNavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-amber-200/50 dark:hover:bg-amber-900/30 hover:text-amber-900 dark:hover:text-amber-100"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  )
}

function MobileAdminNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 text-muted-foreground hover:text-amber-900 dark:hover:text-amber-100 transition-colors px-2"
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Link>
  )
}
