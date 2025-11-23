import { PrismaClient } from '@prisma/client'

// Use separate database URL for integration tests
const DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
  log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
})

/**
 * Reset database by truncating all tables
 * Called before each integration test suite
 */
export async function resetDatabase() {
  const tables = await testPrisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `

  for (const { tablename } of tables) {
    if (tablename !== '_prisma_migrations') {
      try {
        await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`)
      } catch (error) {
        console.error(`Failed to truncate ${tablename}:`, error)
      }
    }
  }
}

/**
 * Execute callback within a transaction that rolls back after test
 * Useful for isolated test scenarios
 */
export async function withTransaction<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T | undefined> {
  try {
    return await testPrisma.$transaction(async (tx) => {
      const result = await callback(tx as PrismaClient)
      // Force rollback by throwing
      throw new Error('ROLLBACK')
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'ROLLBACK') {
      // Expected rollback, return undefined
      return undefined
    }
    throw error
  }
}

/**
 * Disconnect from test database
 * Call this in afterAll hooks
 */
export async function disconnectTestDb() {
  await testPrisma.$disconnect()
}

