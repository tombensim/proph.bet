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

