import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Logic to determine the correct database URL based on environment variables
// This mimics the logic in scripts/vercel-build.sh to ensure runtime matches build time
const getDatabaseUrl = () => {
  if (process.env.TEST_PRISMA_DATABASE_URL) {
    return process.env.TEST_PRISMA_DATABASE_URL
  }
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL
  }

  // Safety check: Prevent connecting to the production/default database when on the test branch
  if (process.env.VERCEL_GIT_COMMIT_REF === 'test') {
    throw new Error(
      'MISSING_TEST_DATABASE_URL: Attempting to connect to default database on test branch. ' +
      'Please configure TEST_PRISMA_DATABASE_URL or TEST_DATABASE_URL in your environment variables.'
    )
  }

  return process.env.DATABASE_URL
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

