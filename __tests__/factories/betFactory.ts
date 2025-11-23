import { Factory } from './index'
import { Bet, Prisma } from '@prisma/client'
import { v4 as uuid } from 'uuid'

export class BetFactory extends Factory {
  /**
   * Create a bet on a market option
   */
  async create(
    userId: string,
    marketId: string,
    optionId: string,
    overrides: Partial<Prisma.BetCreateInput> = {}
  ): Promise<Bet> {
    const defaults: Prisma.BetCreateInput = {
      id: uuid(),
      user: { connect: { id: userId } },
      market: { connect: { id: marketId } },
      option: { connect: { id: optionId } },
      amount: 100,
      potentialPayout: 200,
      probability: 50,
    }

    return this.prisma.bet.create({
      data: { ...defaults, ...overrides },
    })
  }

  /**
   * Create multiple bets at once
   */
  async createMany(
    bets: Array<{
      userId: string
      marketId: string
      optionId: string
      amount?: number
    }>
  ): Promise<Bet[]> {
    const created: Bet[] = []
    for (const bet of bets) {
      created.push(
        await this.create(bet.userId, bet.marketId, bet.optionId, {
          amount: bet.amount || 100,
          potentialPayout: (bet.amount || 100) * 2,
        })
      )
    }
    return created
  }

  /**
   * Create bets for all options in a market
   */
  async createForAllOptions(
    userId: string,
    marketId: string,
    amount: number = 100
  ) {
    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
      include: { options: true },
    })

    if (!market) {
      throw new Error(`Market ${marketId} not found`)
    }

    return Promise.all(
      market.options.map((option) =>
        this.create(userId, marketId, option.id, {
          amount,
          potentialPayout: amount * 2,
        })
      )
    )
  }
}

