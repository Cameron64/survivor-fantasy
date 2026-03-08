import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Only allow in development
const isDev = process.env.NODE_ENV === 'development'

/**
 * POST /api/dev/import-prod-data
 *
 * Pulls fresh production data into the local database using the existing snapshot scripts.
 * WARNING: This will overwrite ALL local data!
 *
 * Requires:
 * - Railway CLI installed and authenticated
 * - Admin role
 * - Development environment
 */
export async function POST(_req: NextRequest) {
  if (!isDev) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    await requireAdmin()
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Step 1: Pull latest snapshot from production
    console.log('[Import Prod Data] Step 1: Pulling production snapshot...')
    const pullResult = await execAsync(
      'PATH="$PATH:/c/Users/Cam Dowdle/AppData/Roaming/npm" npm run snap pull',
      {
        cwd: process.cwd(),
        timeout: 120000 // 2 minute timeout
      }
    )
    console.log(pullResult.stdout)
    if (pullResult.stderr) console.error(pullResult.stderr)

    // Step 2: Restore the snapshot into local database
    console.log('[Import Prod Data] Step 2: Restoring snapshot to local database...')
    const restoreResult = await execAsync(
      'PATH="$PATH:/c/Users/Cam Dowdle/AppData/Roaming/npm" npm run snap restore',
      {
        cwd: process.cwd(),
        timeout: 120000 // 2 minute timeout
      }
    )
    console.log(restoreResult.stdout)
    if (restoreResult.stderr) console.error(restoreResult.stderr)

    console.log('[Import Prod Data] ✅ Successfully imported production data!')

    return NextResponse.json({
      success: true,
      message: 'Successfully imported production data into local database'
    })
  } catch (error) {
    console.error('[Import Prod Data] ❌ Error:', error)

    // Extract useful error info
    const errorMessage = error instanceof Error ? error.message : String(error)
    const stderr = (error as { stderr?: string }).stderr || ''

    return NextResponse.json(
      {
        error: 'Failed to import production data',
        details: stderr || errorMessage
      },
      { status: 500 }
    )
  }
}
