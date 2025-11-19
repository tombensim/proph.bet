import { PrismaClient, ArenaRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration...')

  // 1. Create or get Default Arena
  let defaultArena = await prisma.arena.findFirst({
    where: { name: 'Global Arena' }
  })

  if (!defaultArena) {
    console.log('Creating Global Arena...')
    defaultArena = await prisma.arena.create({
      data: {
        name: 'Global Arena',
        description: 'The default betting arena for all users.',
        slug: 'global'
      }
    })
  } else {
    console.log('Global Arena already exists.')
  }

  // 2. Migrate Users to ArenaMemberships
  const users = await prisma.user.findMany({
    include: {
      memberships: true
    }
  })

  console.log(`Found ${users.length} users. Checking for memberships...`)

  for (const user of users) {
    const hasMembership = user.memberships.some(m => m.arenaId === defaultArena!.id)
    
    if (!hasMembership) {
      console.log(`Migrating user ${user.email} (${user.id})...`)
      
      // Determine role based on User role
      const arenaRole = user.role === 'ADMIN' ? ArenaRole.ADMIN : ArenaRole.MEMBER
      
      await prisma.arenaMembership.create({
        data: {
          userId: user.id,
          arenaId: defaultArena!.id,
          role: arenaRole,
          points: user.points // Migrate existing points
        }
      })
    }
  }

  // 3. Link Markets to Default Arena
  const unlinkedMarkets = await prisma.market.findMany({
    where: { arenaId: null }
  })

  console.log(`Found ${unlinkedMarkets.length} unlinked markets.`)

  if (unlinkedMarkets.length > 0) {
    await prisma.market.updateMany({
      where: { arenaId: null },
      data: { arenaId: defaultArena!.id }
    })
    console.log('Linked markets to Global Arena.')
  }

  // 4. Link Transactions to Default Arena
  // We can link all transactions that don't have an arenaId to the default arena
  const unlinkedTransactions = await prisma.transaction.count({
    where: { arenaId: null }
  })
  
  if (unlinkedTransactions > 0) {
    console.log(`Linking ${unlinkedTransactions} transactions to Global Arena...`)
    await prisma.transaction.updateMany({
      where: { arenaId: null },
      data: { arenaId: defaultArena!.id }
    })
  }

  console.log('Migration completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

