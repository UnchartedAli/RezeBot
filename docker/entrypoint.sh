#!/bin/sh
set -e

# Wait for database
echo "Waiting for database..."
until pg_isready -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-rezebot}" 2>/dev/null; do
  echo "PostgreSQL not ready, retrying in 2s..."
  sleep 2
done
echo "Database is ready!"

# Run migrations
echo "Running migrations..."
node dist/db/migrate.js

# Start services
if [ "$NODE_ENV" = "production" ]; then
  echo "Starting Bot and Web Panel..."
  node dist/bot/index.js &
  node dist/web/index.js &
  wait
else
  echo "Starting in development mode..."
  npm run dev &
  npm run dev:web &
  wait
fi
