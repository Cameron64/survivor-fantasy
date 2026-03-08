# Development Tools

## Pull Production Data

The "Pull Production Data" feature in Settings allows you to import a fresh copy of the production database into your local environment.

### Setup

1. **Add production database URL to your environment:**
   ```bash
   # In .env.local
   PROD_DATABASE_URL="postgresql://user:password@prod-host:5432/survivor_fantasy"
   ```

2. **Ensure you have PostgreSQL tools installed:**
   - `pg_dump` - for exporting from production
   - `psql` - for importing into local

   On Mac:
   ```bash
   brew install postgresql
   ```

   On Windows:
   - Install PostgreSQL from https://www.postgresql.org/download/windows/
   - Or use the version bundled with your local Postgres installation

### Usage

1. Navigate to **Settings** page
2. Scroll to **Dev Tools** section (only visible in development mode)
3. Click **"Pull Production Data"** button
4. Confirm the warning dialog (this will **overwrite all local data**)
5. Wait for the import to complete (usually 30-60 seconds)
6. Page will automatically reload with fresh production data

### What It Does

1. **Exports** the entire production database to a temporary SQL file
2. **Resets** your local database (drops all tables and recreates schema)
3. **Imports** the production data into your local database
4. **Cleans up** the temporary SQL dump file
5. **Regenerates** the Prisma client

### Important Notes

⚠️ **WARNING**: This will completely overwrite your local database. Any local changes will be lost!

- Only available in development mode (`NODE_ENV=development`)
- Requires admin role in the app
- Requires `PROD_DATABASE_URL` environment variable
- Requires PostgreSQL command-line tools (`pg_dump`, `psql`)
- Takes 30-60 seconds depending on database size

### Troubleshooting

**"PROD_DATABASE_URL environment variable not set"**
- Add `PROD_DATABASE_URL` to your `.env.local` file

**"pg_dump: command not found"**
- Install PostgreSQL command-line tools (see Setup above)

**"permission denied"**
- Ensure your production database URL has correct credentials
- Check that the user has read permissions on all tables

**Import times out**
- The endpoint has a default timeout - for very large databases, you may need to increase Next.js API route timeout
