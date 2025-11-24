import { Factory } from './base'
import { Market, MarketType, MarketStatus, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

export class MarketFactory extends Factory {
  /**
   * Create a binary market with YES/NO options
   */
  async create(
    arenaId: string,
    overrides: Partial<Prisma.MarketCreateInput> = {},
    userId?: string
  ): Promise<Market> {
    const resolutionDate = new Date(Date.now() + 86400000) // +1 day

    const defaults: Prisma.MarketCreateInput = {
      id: randomUUID(),
      title: `Will this test pass? ${Date.now()}`,
      description: 'A test market for integration tests',
      type: MarketType.BINARY,
      status: MarketStatus.OPEN,
      resolutionDate,
      arena: { connect: { id: arenaId } },
      creator: userId ? { connect: { id: userId } } : undefined,
      options: {
        create: [
          {
            id: randomUUID(),
            text: 'YES',
          },
          {
            id: randomUUID(),
            text: 'NO',
          },
        ],
      },
    }
    
    return this.prisma.market.create({
      data: { ...defaults, ...overrides },
      include: { options: true },
    }) as any
  }

  /**
   * Create a multiple choice market
   */
  async createMultipleChoice(
    arenaId: string,
    options: string[] = ['Option A', 'Option B', 'Option C'],
    userId?: string
  ): Promise<Market> {
    return this.prisma.market.create({
      data: {
        id: randomUUID(),
        title: `Multiple choice test ${Date.now()}`,
        description: 'A multiple choice test market',
        type: MarketType.MULTIPLE_CHOICE,
        status: MarketStatus.OPEN,
        resolutionDate: new Date(Date.now() + 86400000),
        arena: { connect: { id: arenaId } },
        creator: userId ? { connect: { id: userId } } : undefined,
        options: {
          create: options.map((text) => ({
            id: randomUUID(),
            text,
          })),
        },
      },
      include: { options: true },
    }) as any
  }

  /**
   * Create a market with existing bets
   */
  async createWithBets(
    arenaId: string,
    userIds: string[],
    betAmount: number = 100,
    creatorId?: string
  ) {
    const market = await this.create(arenaId, {}, creatorId || userIds[0])

    const bets = await Promise.all(
      userIds.map((userId, i) =>
        this.prisma.bet.create({
          data: {
            id: randomUUID(),
            userId,
            marketId: market.id,
            optionId: market.options[i % market.options.length].id,
            amount: betAmount,
            shares: betAmount,
          },
        })
      )
    )

    return { market, bets }
  }

  /**
   * Create a resolved market
   */
  async createResolved(
    arenaId: string,
    winningOptionIndex: number = 0,
    userId?: string
  ): Promise<Market> {
    const market = await this.create(arenaId, {}, userId)

    return this.prisma.market.update({
      where: { id: market.id },
      data: {
        status: MarketStatus.RESOLVED,
        // resolvedAt: new Date(), // Check if resolvedAt exists in schema
        winningOptionId: market.options[winningOptionIndex].id,
      },
      include: { options: true },
    }) as any
  }
}

