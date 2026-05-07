#!/bin/sh
set -e

echo "Initializing database..."
npx drizzle-kit push
npx tsx src/lib/db/seed.ts

echo "Starting server..."
exec npx tsx server.ts
