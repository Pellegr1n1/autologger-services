#!/bin/sh

if [ "$NODE_ENV" = "production" ]; then
  echo "Running migrations in production mode..."
  node dist/database/run-migrations.js
else
  echo "Running migrations in development mode..."
  node -r ts-node/register -r tsconfig-paths/register src/database/run-migrations.ts
fi

