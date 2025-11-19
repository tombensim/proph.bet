
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Connecting to database...')
    await prisma.$connect()
    console.log('Connected successfully.')
    
    console.log('Checking User table...')
    const userCount = await prisma.user.count()
    console.log(`User count: ${userCount}`)

    console.log('Checking Account table...')
    const accountCount = await prisma.account.count()
    console.log(`Account count: ${accountCount}`)
    
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()

