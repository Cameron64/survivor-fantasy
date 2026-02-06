import { redirect } from 'next/navigation'
import { auth, clerkClient } from '@clerk/nextjs/server'
import Link from 'next/link'
import { FlaskConical, Eye, Play, BarChart3, GitCompare, LayoutDashboard, ArrowLeft, DatabaseZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'

async function checkIsAdmin(userId: string): Promise<boolean> {
  // Fast path: Clerk publicMetadata
  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(userId)
  if (clerkUser.publicMetadata?.role === 'ADMIN') return true

  // Slow path: check database
  try {
    const dbUser = await db.user.findUnique({ where: { clerkId: userId } })
    return dbUser?.role === 'ADMIN'
  } catch {
    // DB unreachable, Clerk didn't have ADMIN either
    return false
  }
}

export default async function SimulationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const isAdmin = await checkIsAdmin(userId)
  if (!isAdmin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-teal-50/30 dark:bg-teal-950/10">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-teal-300/50 dark:border-teal-700/50 bg-teal-100/90 dark:bg-teal-950/80 backdrop-blur supports-[backdrop-filter]:bg-teal-100/70 dark:supports-[backdrop-filter]:bg-teal-950/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/leaderboard">
            <Button variant="ghost" size="sm" className="hover:bg-teal-200/50 dark:hover:bg-teal-900/50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              <FlaskConical className="h-4 w-4" />
              Simulation Lab
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-14 border-r border-teal-300/50 dark:border-teal-700/50 bg-teal-50/50 dark:bg-teal-950/20">
          <nav className="flex-1 px-2 py-4 space-y-1">
            <SimNavLink href="/simulation" icon={LayoutDashboard}>
              Overview
            </SimNavLink>
            <SimNavLink href="/simulation/preview" icon={Eye}>
              Preview
            </SimNavLink>
            <SimNavLink href="/simulation/run" icon={Play}>
              Single Run
            </SimNavLink>
            <SimNavLink href="/simulation/batch" icon={BarChart3}>
              Batch
            </SimNavLink>
            <SimNavLink href="/simulation/compare" icon={GitCompare}>
              Compare
            </SimNavLink>
            <SimNavLink href="/simulation/explore" icon={DatabaseZap}>
              Explorer
            </SimNavLink>
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-teal-300/50 dark:border-teal-700/50 bg-teal-100/90 dark:bg-teal-950/80 z-50">
          <div className="flex items-center justify-around h-14 px-2">
            <MobileSimNavLink href="/simulation" icon={LayoutDashboard} label="Overview" />
            <MobileSimNavLink href="/simulation/preview" icon={Eye} label="Preview" />
            <MobileSimNavLink href="/simulation/run" icon={Play} label="Run" />
            <MobileSimNavLink href="/simulation/batch" icon={BarChart3} label="Batch" />
            <MobileSimNavLink href="/simulation/compare" icon={GitCompare} label="Compare" />
            <MobileSimNavLink href="/simulation/explore" icon={DatabaseZap} label="Explore" />
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

function SimNavLink({
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
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-teal-200/50 dark:hover:bg-teal-900/30 hover:text-teal-900 dark:hover:text-teal-100"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  )
}

function MobileSimNavLink({
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
      className="flex flex-col items-center gap-1 text-muted-foreground hover:text-teal-900 dark:hover:text-teal-100 transition-colors px-2"
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Link>
  )
}
