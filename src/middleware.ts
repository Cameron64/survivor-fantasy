import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/invite/(.*)',
  '/api/webhooks/(.*)',
  '/api/health',
])

const isApiRoute = createRouteMatcher(['/api/(.*)'])

// Dashboard/admin/simulation page routes — auth gating moved to layout
// so the layout can check league.isPublic and render a guest view
const isPageRoute = createRouteMatcher([
  '/leaderboard',
  '/my-team',
  '/contestants',
  '/events(.*)',
  '/settings',
  '/admin(.*)',
  '/simulation(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Dev bypass: skip all Clerk protection when DEV_USER_ID is set
  if (process.env.NODE_ENV === 'development' && process.env.DEV_USER_ID) return

  // API routes handle their own auth (supports both Clerk sessions and API key auth)
  if (isApiRoute(req)) return

  // Page routes: let through — layout handles auth gating based on league.isPublic
  if (isPageRoute(req)) return

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
