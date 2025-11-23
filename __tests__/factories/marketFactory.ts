import { Factory } from './index'
import { Market, MarketType, MarketStatus, Prisma } from '@prisma/client'
import { v4 as uuid } from 'uuid'

export class MarketFactory extends Factory {
  /**
   * Create a binary market with YES/NO options
   */
  async create(
    arenaId: string,
    overrides: Partial<Prisma.MarketCreateInput> = {}
  ): Promise<Market> {
    const resolutionDate = new Date(Date.now() + 86400000) // +1 day

    const defaults: Prisma.MarketCreateInput = {
      id: uuid(),
      title: `Will this test pass? ${Date.now()}`,
      description: 'A test market for integration tests',
      type: MarketType.BINARY,
      status: MarketStatus.OPEN,
      resolutionDate,
      arena: { connect: { id: arenaId } },
      options: {
        create: [
          {
            id: uuid(),
            value: 'YES',
            initialProbability: 50,
            currentProbability: 50,
          },
          {
            id: uuid(),
            value: 'NO',
            initialProbability: 50,
            currentProbability: 50,
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
    options: string[] = ['Option A', 'Option B', 'Option C']
  ): Promise<Market> {
    const probabilityPerOption = Math.floor(100 / options.length)

    return this.prisma.market.create({
      data: {
        id: uuid(),
        title: `Multiple choice test ${Date.now()}`,
        type: MarketType.MULTIPLE_CHOICE,
        status: MarketStatus.OPEN,
        resolutionDate: new Date(Date.now() + 86400000),
        arena: { connect: { id: arenaId } },
        options: {
          create: options.map((value) => ({
            id: uuid(),
            value,
            initialProbability: probabilityPerOption,
            currentProbability: probabilityPerOption,
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
    betAmount: number = 100
  ) {
    const market = await this.create(arenaId)

    const bets = await Promise.all(
      userIds.map((userId, i) =>
        this.prisma.bet.create({
          data: {
            id: uuid(),
            userId,
            marketId: market.id,
            optionId: market.options[i % market.options.length].id,
            amount: betAmount,
            potentialPayout: betAmount * 2,
            probability: 50,
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
    winningOptionIndex: number = 0
  ): Promise<Market> {
    const market = await this.create(arenaId)

    return this.prisma.market.update({
      where: { id: market.id },
      data: {
        status: MarketStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedOptionId: market.options[winningOptionIndex].id,
      },
      include: { options: true },
    }) as any
  }
}

