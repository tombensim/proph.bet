#!/bin/bash

# Handle branch-specific environment variables for Vercel builds
if [ "$VERCEL_GIT_COMMIT_REF" = "test" ]; then
  echo "Detected test branch. Configuring environment..."
  
  # Prefer the Prisma/Pooler URL if available, otherwise the standard Postgres URL
  if [ -n "$TEST_PRISMA_DATABASE_URL" ]; then
    export DATABASE_URL="$TEST_PRISMA_DATABASE_URL"
    echo "Using TEST_PRISMA_DATABASE_URL"
  elif [ -n "$TEST_DATABASE_URL" ]; then
    export DATABASE_URL="$TEST_DATABASE_URL"
    echo "Using TEST_DATABASE_URL"
  else
    echo "WARNING: Test branch detected but no TEST_DATABASE_URL or TEST_PRISMA_DATABASE_URL found."
  fi
fi

# Run the standard build commands
echo "Running prisma generate..."
npx prisma generate

echo "Running prisma db push..."
npx prisma db push --accept-data-loss

echo "Running next build..."
npx next build

