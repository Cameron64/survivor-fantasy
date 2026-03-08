#!/usr/bin/env tsx
/**
 * Database snapshot management for local development.
 *
 * Commands:
 *   pull       - Dump prod data to data/snapshots/prod-<timestamp>.sql
 *   restore    - Load the latest (or specified) snapshot into local DB
 *   list       - Show available snapshots
 *   prep-merge - Restore latest + configure pre-merge state for rehearsal
 *
 * Usage:
 *   pnpm snap pull           # pull prod -> local snapshot
 *   pnpm snap restore        # restore latest snapshot into local DB
 *   pnpm snap restore <file> # restore specific snapshot
 *   pnpm snap list           # list snapshots
 *   pnpm snap prep-merge     # restore latest + set up merge rehearsal
 */

import { execSync } from 'child_process'
import { readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join, basename } from 'path'

const ROOT = join(__dirname, '..')
const SNAP_DIR = join(ROOT, 'data', 'snapshots')
const PG_BIN = 'C:/Program Files/PostgreSQL/17/bin'
const LOCAL_DB = 'postgresql://survivor:survivor@localhost:5432/survivor_fantasy'
const TMP_SQL = join(ROOT, 'data', 'snapshots', '_tmp.sql')

function ensureDir() {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true })
}

function run(cmd: string) {
  console.log(`  > ${cmd.slice(0, 120)}${cmd.length > 120 ? '...' : ''}`)
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit' })
}

/** Execute SQL against local DB using a temp file (avoids shell quoting issues). */
function psql(sql: string): string {
  ensureDir()
  writeFileSync(TMP_SQL, sql, 'utf-8')
  try {
    return execSync(`"${PG_BIN}/psql.exe" "${LOCAL_DB}" -t -A -f "${TMP_SQL}"`, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } finally {
    try { unlinkSync(TMP_SQL) } catch {}
  }
}

function getProdPublicUrl(): string {
  const raw = execSync('railway variables -s Postgres --json', {
    cwd: ROOT,
    encoding: 'utf-8',
  })
  const vars = JSON.parse(raw)
  const url = vars.DATABASE_PUBLIC_URL
  if (!url) throw new Error('DATABASE_PUBLIC_URL not found in Railway Postgres vars')
  return url
}

function listSnapshots(): string[] {
  ensureDir()
  return readdirSync(SNAP_DIR)
    .filter((f) => f.endsWith('.sql') && !f.startsWith('_'))
    .sort()
    .reverse()
}

function latestSnapshot(): string {
  const snaps = listSnapshots()
  if (snaps.length === 0) throw new Error('No snapshots found. Run: pnpm snap pull')
  return join(SNAP_DIR, snaps[0])
}

// ---- Commands ----

function cmdPull() {
  ensureDir()
  console.log('Fetching prod DATABASE_PUBLIC_URL from Railway...')
  const prodUrl = getProdPublicUrl()
  const ts = new Date().toISOString().replace(/[T:]/g, '-').slice(0, 19)
  const outFile = join(SNAP_DIR, `prod-${ts}.sql`)

  console.log(`Dumping prod data to ${basename(outFile)}...`)
  run(`"${PG_BIN}/pg_dump.exe" --no-owner --no-acl --data-only --format=plain "${prodUrl}" -f "${outFile}"`)

  console.log(`Done! Snapshot: ${basename(outFile)}`)
}

function cmdList() {
  const snaps = listSnapshots()
  if (snaps.length === 0) {
    console.log('No snapshots. Run: pnpm snap pull')
    return
  }
  console.log('Available snapshots (newest first):')
  for (const s of snaps) console.log(`  ${s}`)
}

function cmdRestore(file?: string) {
  const snapFile = file || latestSnapshot()
  const snapName = basename(typeof file === 'string' ? file : snapFile)
  const fullPath = file && !file.includes('/') && !file.includes('\\')
    ? join(SNAP_DIR, file)
    : snapFile

  if (!existsSync(fullPath)) throw new Error(`Snapshot not found: ${fullPath}`)

  console.log(`Restoring ${snapName} into local DB...`)

  // Truncate all tables (CASCADE handles FK deps)
  console.log('Truncating local tables...')
  psql(`
    TRUNCATE
      "Event","GameEvent","TeamContestant","Team","Draft",
      "TribeMembership","Tribe","Episode","Contestant","User","League"
    CASCADE;
  `)

  // Restore data (ON_ERROR_STOP=off tolerates column mismatches from newer local schema)
  console.log('Loading data...')
  run(`"${PG_BIN}/psql.exe" "${LOCAL_DB}" --set ON_ERROR_STOP=off -f "${fullPath}"`)

  // Ensure local schema has all new columns (idempotent)
  console.log('Syncing Prisma schema...')
  run('npx prisma db push --skip-generate --accept-data-loss')

  console.log('Restore complete!')
}

function cmdPrepMerge() {
  cmdRestore()

  console.log('\n--- Setting up merge rehearsal environment ---\n')

  // Find an admin user for DEV_USER_ID
  const adminId = psql(`SELECT id FROM "User" WHERE role='ADMIN' LIMIT 1`)
  if (adminId) {
    console.log(`Admin user: ${adminId}`)

    // Auto-update .env if DEV_USER_ID differs
    const envPath = join(ROOT, '.env')
    if (existsSync(envPath)) {
      const env = require('fs').readFileSync(envPath, 'utf-8') as string
      const match = env.match(/^DEV_USER_ID=(.+)$/m)
      if (!match || match[1] !== adminId) {
        const updated = match
          ? env.replace(/^DEV_USER_ID=.+$/m, `DEV_USER_ID=${adminId}`)
          : env + `\nDEV_USER_ID=${adminId}\n`
        require('fs').writeFileSync(envPath, updated)
        console.log(`Updated DEV_USER_ID=${adminId} in .env`)
      } else {
        console.log('DEV_USER_ID already correct in .env')
      }
    }
  }

  // Reset merge-related state to pre-merge
  console.log('Setting episodes to PRE_MERGE phase...')
  psql(`UPDATE "Episode" SET "gamePhase"='PRE_MERGE', "phaseSource"='INFERRED'`)

  console.log('Clearing mergeWeek/juryStartWeek...')
  psql(`UPDATE "League" SET "mergeWeek"=NULL, "juryStartWeek"=NULL`)

  console.log('Clearing dissolved tribe state...')
  psql(`UPDATE "Tribe" SET "dissolvedAtWeek"=NULL, "dissolvedByEventId"=NULL`)

  console.log('Clearing gameEventId from tribe memberships...')
  psql(`UPDATE "TribeMembership" SET "gameEventId"=NULL`)

  // Ensure a merge tribe exists (prod may not have one yet)
  const mergeTribeExists = psql(`SELECT COUNT(*) FROM "Tribe" WHERE "isMerge"=true`)
  if (mergeTribeExists === '0') {
    const leagueId = psql(`SELECT id FROM "League" WHERE "isActive"=true LIMIT 1`)
    if (leagueId) {
      console.log('Creating merge tribe "Nuinui"...')
      psql(`INSERT INTO "Tribe" (id, name, color, "isMerge", "leagueId", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, 'Nuinui', '#9B59B6', true, '${leagueId}', NOW(), NOW())`)
    }
  }

  // Delete any existing merge/swap game events so we start clean
  console.log('Removing existing TRIBE_MERGE/TRIBE_SWAP game events...')
  psql(`
    DELETE FROM "Event" WHERE "gameEventId" IN (
      SELECT id FROM "GameEvent" WHERE type IN ('TRIBE_MERGE','TRIBE_SWAP')
    );
    DELETE FROM "GameEvent" WHERE type IN ('TRIBE_MERGE','TRIBE_SWAP');
  `)

  // Summary
  const activeCount = psql(`SELECT COUNT(*) FROM "Contestant" WHERE "isEliminated"=false`)
  const eliminatedCount = psql(`SELECT COUNT(*) FROM "Contestant" WHERE "isEliminated"=true`)
  const tribes = psql(`SELECT name || ' (' || CASE WHEN "isMerge" THEN 'merge' ELSE color END || ')' FROM "Tribe" ORDER BY "isMerge", name`)
  const episodes = psql(`SELECT COUNT(*) FROM "Episode"`)

  console.log('\n--- Merge Rehearsal Ready ---')
  console.log(`Contestants: ${activeCount} active, ${eliminatedCount} eliminated`)
  console.log(`Tribes:\n  ${tribes.split('\n').join('\n  ')}`)
  console.log(`Episodes: ${episodes}`)
  console.log('')
  console.log('Next steps:')
  console.log('  1. Restart dev server: pnpm dev')
  console.log('  2. Navigate to /events/submit -> Tribe Merge')
  console.log('  3. Select merge tribe, toggle jury, pick remaining contestants')
  console.log('  4. Submit, then approve in /admin/events')
  console.log('  5. Check /admin/tribes for updated memberships')
  console.log('')
  console.log('To reset and try again: pnpm snap prep-merge')
}

// ---- CLI ----
const [cmd, ...args] = process.argv.slice(2)

switch (cmd) {
  case 'pull':
    cmdPull()
    break
  case 'restore':
    cmdRestore(args[0])
    break
  case 'list':
    cmdList()
    break
  case 'prep-merge':
    cmdPrepMerge()
    break
  default:
    console.log('Usage: pnpm snap <pull|restore|list|prep-merge> [file]')
    console.log('')
    console.log('  pull         Pull prod data into a local snapshot file')
    console.log('  restore      Restore latest (or named) snapshot to local DB')
    console.log('  list         List available snapshots')
    console.log('  prep-merge   Restore + configure pre-merge state for rehearsal')
    process.exit(1)
}
