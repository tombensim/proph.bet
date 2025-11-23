import { PrismaClient } from '@prisma/client'

/**
 * Base Factory class for creating test data
 * All specific factories extend this class
 */
export class Factory {
  constructor(protected prisma: PrismaClient) {}

  /**
   * Generic create method for any Prisma model
   */
  protected async create<T>(model: string, data: any): Promise<T> {
    return (this.prisma as any)[model].create({ data })
  }

  /**
   * Generic find method for any Prisma model
   */
  protected async find<T>(model: string, where: any): Promise<T | null> {
    return (this.prisma as any)[model].findUnique({ where })
  }

  /**
   * Generate a unique email for testing
   */
  protected generateEmail(prefix: string = 'test'): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return `${prefix}-${timestamp}-${random}@test.proph.bet`
  }

  /**
   * Generate a unique slug
   */
  protected generateSlug(prefix: string = 'test'): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return `${prefix}-${timestamp}-${random}`
  }
}

