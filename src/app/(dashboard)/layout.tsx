import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { auth, clerkClient } from '@clerk/nextjs/server'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { Role } from '@prisma/client'
import { checkSeasonReadiness } from '@/lib/season-readiness'
import { SeasonSetupGate } from '@/components/shared/season-setup-gate'
import {
  Trophy,
  Users,
  Calendar,
  Settings,
  Shield,
  FlaskConical,
  DatabaseZap,
} from 'lucide-react'

function DatabaseDownPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950/20 p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <DatabaseZap className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-red-700 dark:text-red-400">
          DATABASE IS DOWN
        </h1>
        <p className="text-lg text-red-600 dark:text-red-300">
          PostgreSQL is not running on <code className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/50 font-mono text-sm">localhost:5433</code>
        </p>
        <div className="bg-gray-900 rounded-lg p-4 text-left">
          <p className="text-gray-400 text-xs mb-2 font-mono"># Start PostgreSQL in Docker:</p>
          <p className="text-green-400 font-mono text-sm">docker compose up -d postgresql</p>
        </div>
        <p className="text-sm text-muted-foreground">
          The dashboard needs PostgreSQL for users, teams, and scores.
          <br />
          Simulation tools work without a database &mdash;{' '}
          <a href="/simulation" className="text-teal-600 hover:underline font-medium">
            go to Simulation Lab
          </a>
        </p>
      </div>
    </div>
  )
}

function isDbConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes("can't reach database") || msg.includes('connection refused') || msg.includes('econnrefused')
  }
  return false
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  let user;
  let readiness;

  try {
    user = await getCurrentUser()

    // Auto-create DB user from Clerk if not synced yet (e.g. webhook hasn't fired)
    if (!user) {
      const clerk = await clerkClient()
      const clerkUser = await clerk.users.getUser(userId)
      const email = clerkUser.emailAddresses[0]?.emailAddress
      if (email) {
        const name =
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
          email.split('@')[0]
        user = await db.user.create({
          data: {
            clerkId: userId,
            email,
            name,
            role: (clerkUser.publicMetadata?.role as Role) || Role.USER,
            isPaid: (clerkUser.publicMetadata?.isPaid as boolean) || false,
          },
          include: {
            team: {
              include: {
                contestants: {
                  include: { contestant: true },
                },
              },
            },
          },
        })
      }
    }

    readiness = await checkSeasonReadiness()
  } catch (error) {
    if (isDbConnectionError(error)) {
      return <DatabaseDownPage />
    }
    throw error
  }

  const isAdmin = user?.role === 'ADMIN'
  const isModerator = user?.role === 'MODERATOR' || isAdmin

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/leaderboard" className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold">Survivor 50</span>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-background">
          <div className="flex flex-col flex-1 min-h-0 pt-5 pb-4">
            <div className="flex items-center flex-shrink-0 px-4 gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Survivor 50</span>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              <NavLink href="/leaderboard" icon={Trophy}>
                Overview
              </NavLink>
              <NavLink href="/my-team" icon={Users}>
                My Team
              </NavLink>
              <NavLink href="/events" icon={Calendar}>
                Events
              </NavLink>
              <NavLink href="/contestants" icon={Users}>
                Contestants
              </NavLink>
              <NavLink href="/settings" icon={Settings}>
                Settings
              </NavLink>
              {isModerator && (
                <NavLink href="/admin" icon={Shield}>
                  Admin
                </NavLink>
              )}
              <NavLink href="/simulation" icon={FlaskConical}>
                Simulation
              </NavLink>
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t p-4">
            <div className="flex items-center gap-3 w-full">
              <UserButton afterSignOutUrl="/" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-64">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <SeasonSetupGate readiness={readiness} isAdmin={isAdmin}>
              {children}
            </SeasonSetupGate>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background lg:hidden z-50">
        <div className="flex items-center justify-around h-16">
          <MobileNavLink href="/leaderboard" icon={Trophy} label="Overview" />
          <MobileNavLink href="/my-team" icon={Users} label="Team" />
          <MobileNavLink href="/events" icon={Calendar} label="Events" />
          <MobileNavLink href="/simulation" icon={FlaskConical} label="Sim" />
          <MobileNavLink href="/settings" icon={Settings} label="Settings" />
          {isModerator && (
            <MobileNavLink href="/admin" icon={Shield} label="Admin" />
          )}
        </div>
      </nav>
    </div>
  )
}

function NavLink({
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
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  )
}

function MobileNavLink({
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
      className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Link>
  )
}
