#!/bin/sh
# Run this as a Railway deploy hook to apply DB migrations before starting
set -e
echo "Running database migrations..."
for f in $(ls /app/drizzle/*.sql | sort); do
  echo "  Applying $f"
  node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(fs.readFileSync('$f', 'utf8')).then(() => pool.end()).catch(e => { console.error(e); process.exit(1); });
" || true
done
echo "Migrations complete"
