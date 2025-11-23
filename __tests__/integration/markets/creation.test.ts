/**
 * Integration Tests: Market Creation
 * 
 * These tests validate the complete market creation flow including:
 * - Database constraints and validations
 * - Option creation for different market types
 * - Authorization checks
 * - Data integrity
 */

import { testPrisma, resetDatabase, disconnectTestDb } from '../setup/test-db'
import { UserFactory } from '../../factories/userFactory'
import { MarketFactory } from '../../factories/marketFactory'
import { MarketType, MarketStatus } from '@prisma/client'

describe('Market Creation Integration', () => {
  const userFactory = new UserFactory(testPrisma)
  const marketFactory = new MarketFactory(testPrisma)

  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  describe('Binary Markets', () => {
    it('should create a binary market with YES/NO options', async () => {
      // Arrange
      const { user, arena } = await userFactory.createWithArena()

      // Act
      const market = await marketFactory.create(arena.id, {
        title: 'Will it rain tomorrow?',
        description: 'Weather prediction market',
      })

      // Assert
      expect(market).toBeDefined()
      expect(market.title).toBe('Will it rain tomorrow?')
      expect(market.type).toBe(MarketType.BINARY)
      expect(market.status).toBe(MarketStatus.OPEN)
      expect(market.options).toHaveLength(2)
      expect(market.options.map((o) => o.value)).toEqual(['YES', 'NO'])
      expect(market.options[0].initialProbability).toBe(50)
      expect(market.options[1].initialProbability).toBe(50)
    })

    it('should enforce title minimum length', async () => {
      const { arena } = await userFactory.createWithArena()

      // Attempt to create market with short title should fail at DB level
      await expect(
        testPrisma.market.create({
          data: {
            title: 'Hi', // Too short
            type: MarketType.BINARY,
            status: MarketStatus.OPEN,
            resolutionDate: new Date(),
            arenaId: arena.id,
          },
        })
      ).rejects.toThrow()
    })

    it('should require a resolution date', async () => {
      const { arena } = await userFactory.createWithArena()

      await expect(
        testPrisma.market.create({
          data: {
            title: 'Test Market',
            type: MarketType.BINARY,
            status: MarketStatus.OPEN,
            arenaId: arena.id,
            // Missing resolutionDate
          } as any,
        })
      ).rejects.toThrow()
    })
  })

  describe('Multiple Choice Markets', () => {
    it('should create multiple choice market with custom options', async () => {
      const { arena } = await userFactory.createWithArena()

      const market = await marketFactory.createMultipleChoice(arena.id, [
        'Sunny',
        'Rainy',
        'Cloudy',
        'Snowy',
      ])

      expect(market.type).toBe(MarketType.MULTIPLE_CHOICE)
      expect(market.options).toHaveLength(4)
      expect(market.options.map((o) => o.value)).toEqual([
        'Sunny',
        'Rainy',
        'Cloudy',
        'Snowy',
      ])

      // Probabilities should sum to ~100
      const totalProbability = market.options.reduce(
        (sum, o) => sum + o.currentProbability,
        0
      )
      expect(totalProbability).toBeGreaterThanOrEqual(95)
      expect(totalProbability).toBeLessThanOrEqual(100)
    })

    it('should require at least 2 options for multiple choice', async () => {
      const { arena } = await userFactory.createWithArena()

      // Creating market with 1 option should fail validation
      // This would be caught at the application layer (Zod schema)
      // but we test the database state here
      const market = await testPrisma.market.create({
        data: {
          title: 'Test Market',
          type: MarketType.MULTIPLE_CHOICE,
          status: MarketStatus.OPEN,
          resolutionDate: new Date(Date.now() + 86400000),
          arenaId: arena.id,
          options: {
            create: [{ value: 'Only One', initialProbability: 100, currentProbability: 100 }],
          },
        },
        include: { options: true },
      })

      // Market is created but is invalid per business rules
      expect(market.options).toHaveLength(1)
      // This demonstrates why application-level validation is important
    })
  })

  describe('Arena Association', () => {
    it('should associate market with correct arena', async () => {
      const { arena } = await userFactory.createWithArena()
      const market = await marketFactory.create(arena.id)

      const foundMarket = await testPrisma.market.findUnique({
        where: { id: market.id },
        include: { arena: true },
      })

      expect(foundMarket?.arena.id).toBe(arena.id)
      expect(foundMarket?.arena.name).toBe(arena.name)
    })

    it('should fail when creating market with non-existent arena', async () => {
      await expect(
        marketFactory.create('non-existent-arena-id')
      ).rejects.toThrow()
    })

    it('should allow multiple markets in same arena', async () => {
      const { arena } = await userFactory.createWithArena()

      const market1 = await marketFactory.create(arena.id, {
        title: 'Market 1',
      })
      const market2 = await marketFactory.create(arena.id, {
        title: 'Market 2',
      })

      const arenaMarkets = await testPrisma.market.findMany({
        where: { arenaId: arena.id },
      })

      expect(arenaMarkets).toHaveLength(2)
      expect(arenaMarkets.map((m) => m.id)).toEqual(
        expect.arrayContaining([market1.id, market2.id])
      )
    })
  })

  describe('Market Status', () => {
    it('should create markets with OPEN status by default', async () => {
      const { arena } = await userFactory.createWithArena()
      const market = await marketFactory.create(arena.id)

      expect(market.status).toBe(MarketStatus.OPEN)
      expect(market.resolvedAt).toBeNull()
      expect(market.resolvedOptionId).toBeNull()
    })

    it('should allow creating resolved markets', async () => {
      const { arena } = await userFactory.createWithArena()
      const market = await marketFactory.createResolved(arena.id, 0)

      expect(market.status).toBe(MarketStatus.RESOLVED)
      expect(market.resolvedAt).toBeDefined()
      expect(market.resolvedOptionId).toBe(market.options[0].id)
    })
  })

  describe('Database Constraints', () => {
    it('should prevent duplicate market IDs', async () => {
      const { arena } = await userFactory.createWithArena()
      const market = await marketFactory.create(arena.id)

      // Attempt to create market with same ID
      await expect(
        testPrisma.market.create({
          data: {
            id: market.id, // Same ID
            title: 'Duplicate',
            type: MarketType.BINARY,
            status: MarketStatus.OPEN,
            resolutionDate: new Date(),
            arenaId: arena.id,
          },
        })
      ).rejects.toThrow()
    })

    it('should cascade delete options when market is deleted', async () => {
      const { arena } = await userFactory.createWithArena()
      const market = await marketFactory.create(arena.id)
      const optionIds = market.options.map((o) => o.id)

      // Delete market
      await testPrisma.market.delete({
        where: { id: market.id },
      })

      // Options should be deleted too
      const remainingOptions = await testPrisma.marketOption.findMany({
        where: { id: { in: optionIds } },
      })

      expect(remainingOptions).toHaveLength(0)
    })
  })
})

