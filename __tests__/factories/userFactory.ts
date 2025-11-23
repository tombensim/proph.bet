import { Factory } from './base'
import { User, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

export class UserFactory extends Factory {
  /**
   * Create a user with sensible defaults
   */
  async create(overrides: Partial<Prisma.UserCreateInput> = {}): Promise<User> {
    const defaults: Prisma.UserCreateInput = {
      id: randomUUID(),
      email: this.generateEmail('user'),
      name: `Test User ${Date.now()}`,
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
    }

    return this.prisma.user.create({
      data: { ...defaults, ...overrides },
    })
  }

  /**
   * Create a user with an arena they admin
   */
  async createWithArena(arenaName?: string) {
    const user = await this.create()
    const arena = await this.prisma.arena.create({
      data: {
        name: arenaName || `Test Arena ${Date.now()}`,
        slug: this.generateSlug('arena'),
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN',
            points: 1000,
          },
        },
      },
      include: {
        members: true,
      },
    })

    return { user, arena }
  }

  /**
   * Create multiple users at once
   */
  async createMany(count: number): Promise<User[]> {
    const users: User[] = []
    for (let i = 0; i < count; i++) {
      users.push(await this.create())
    }
    return users
  }

  /**
   * Add user to an existing arena
   */
  async addToArena(userId: string, arenaId: string, points: number = 1000) {
    return this.prisma.arenaMembership.create({
      data: {
        userId,
        arenaId,
        role: 'MEMBER',
        points,
      },
    })
  }
}

