#!/bin/sh
set -e

echo "🚀 Starting container..."

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "📦 Running database migrations..."
  cd /app
  npm run typeorm:migration:run || {
    echo "⚠️  Migration failed or already applied, continuing..."
  }
  echo "✅ Migrations check completed"
fi

echo "🚀 Starting application..."
exec "$@"

