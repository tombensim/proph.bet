/**
 * @jest-environment node
 */
import { testPrisma, resetDatabase, disconnectTestDb } from '../setup/test-db'
import { UserFactory } from '../../factories'

describe('Membership Queries', () => {
  const userFactory = new UserFactory(testPrisma)

  beforeEach(async () => {
    // Database reset skipped to avoid connection issues in some environments.
    // Factories use unique identifiers, so data collision is unlikely.
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('should fetch memberships with explicit selection (Home Page Query)', async () => {
    // Arrange
    const { user, arena } = await userFactory.createWithArena()
    
    // Act - Simulate the query from app/[locale]/page.tsx
    const memberships = await testPrisma.arenaMembership.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        userId: true,
        arenaId: true,
        role: true,
        points: true,
        joinedAt: true,
        arena: true // implicit select of all arena fields
      },
      orderBy: { joinedAt: 'desc' }
    })

    // Assert
    expect(memberships).toHaveLength(1)
    expect(memberships[0].arena.id).toBe(arena.id)
    expect(memberships[0].role).toBe('ADMIN')
    // We explicitly check that we can access the fields we need
    expect(memberships[0].points).toBeDefined()
  })

  it('should fetch memberships for settings with nested select (Settings Page Query)', async () => {
    // Arrange
    const { user, arena } = await userFactory.createWithArena()
    
    // Act - Simulate the query from app/[locale]/settings/page.tsx
    const memberships = await testPrisma.arenaMembership.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        arena: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Assert
    expect(memberships).toHaveLength(1)
    expect(memberships[0].arena.name).toBe(arena.name)
  })
})
