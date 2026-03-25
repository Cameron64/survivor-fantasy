# Production Environment

## ⛔ Access Rules for Agents

**READ ONLY.**

- No writes to the production database
- No seeds, no `db push`, no schema changes
- No deployments unless explicitly instructed by Cam
- No destructive queries of any kind

If you think you need to touch prod: stop, re-read the task, and ask Cam.

## URLs & Info

| | |
|---|---|
| **App URL** | https://survivor-fantasy.up.railway.app |
| **Railway project** | Survivor Fantasy (ID: `906b6ac6-daa3-4f13-a087-d653b009c79a`) |
| **Service** | `survivor-fantasy` |
| **Branch** | `main` |

## What's in It

- **20 real users** playing Survivor S50 fantasy
- **17 fantasy teams** (most users drafted)
- **138 scoring events** logged and approved across the season
- Live S50 season data — contestants, tribes, episodes, tribe memberships

This is real user data. Treat it with care.

## Emergency Contact

Cam Dowdle — cameronrodriguez1@gmail.com

## Backup

A full pg_dump of production was taken at the start of the multi-league sprint:

```
backups/prod_backup_20260324_185033.dump
```

To restore:
```bash
PGPASSWORD=<password> pg_restore -h <host> -U postgres -d railway --no-owner backups/prod_backup_20260324_185033.dump
```

To take a new backup:
```bash
PGPASSWORD=<password> "/c/Program Files/PostgreSQL/17/bin/pg_dump.exe" \
  -h <host> -p <port> -U postgres -d railway \
  --format=custom --no-acl --no-owner \
  -f backups/prod_backup_$(date +%Y%m%d_%H%M%S).dump
```

(PostgreSQL 17 is installed at `/c/Program Files/PostgreSQL/17/bin/` on Cam's Windows machine.)

## Deploying to Prod

Only deploy `main` branch. GitHub Actions handles this automatically on push to `main` (`.github/workflows/deploy-prod.yml`).

Do not manually deploy to prod without explicit instruction.
