import { PrismaClient, Role, ArenaRole, MarketType, MarketStatus, TransactionType, NotificationType, InvitationStatus, DisputeStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('🚫 Seed script cannot run in production!')
  process.exit(1)
}

// Core user emails
const CORE_USERS = [
  { email: 'tombensim@gmail.com', name: 'Tom Bensim', role: Role.ADMIN },
  { email: 'dev@genoox.com', name: 'Dev User', role: Role.ADMIN },
  { email: 'test@proph.bet', name: 'Test User', role: Role.USER },
]

// Additional test users
const TEST_USERS = [
  { email: 'alice@example.com', name: 'Alice Johnson' },
  { email: 'bob@example.com', name: 'Bob Smith' },
  { email: 'charlie@example.com', name: 'Charlie Davis' },
  { email: 'diana@example.com', name: 'Diana Martinez' },
  { email: 'eve@example.com', name: 'Eve Wilson' },
  { email: 'frank@example.com', name: 'Frank Brown' },
  { email: 'grace@example.com', name: 'Grace Lee' },
]

async function main() {
  console.log('🌱 Starting database seed...')

  // 1. Create Users
  console.log('👥 Creating users...')
  const users = []
  
  for (const userData of CORE_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { name: userData.name, role: userData.role },
      create: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        emailVerified: new Date(),
      },
    })
    users.push(user)
    console.log(`  ✓ ${user.email}`)
  }

  for (const userData of TEST_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { name: userData.name },
      create: {
        email: userData.email,
        name: userData.name,
        role: Role.USER,
        emailVerified: new Date(),
      },
    })
    users.push(user)
  }

  console.log(`  Created ${users.length} users`)

  // 2. Create Arenas
  console.log('🏟️  Creating arenas...')
  
  const techArena = await prisma.arena.upsert({
    where: { slug: 'tech-predictions' },
    update: {},
    create: {
      name: 'Tech Predictions',
      slug: 'tech-predictions',
      description: 'Predict the future of technology, AI, and innovation',
      logo: '/chami-thinking.png',
      coverImage: '/chami-scribble.png',
      about: `# Welcome to Tech Predictions 🚀

This arena is dedicated to predicting the future of technology, artificial intelligence, software development, and digital innovation.

## What We Predict

- **AI & Machine Learning**: Will GPT-5 be released this year? Will AGI be achieved?
- **Tech Companies**: Product launches, acquisitions, stock performance
- **Open Source**: Framework adoption, major releases, community trends
- **Hardware**: New device releases, chip breakthroughs, gaming consoles

## Guidelines

- Markets should be based on verifiable facts
- Use credible sources for resolution
- Keep discussions technical but accessible
- Have fun predicting the future of tech!`,
    },
  })

  const sportsArena = await prisma.arena.upsert({
    where: { slug: 'sports-betting' },
    update: {},
    create: {
      name: 'Sports Betting Arena',
      slug: 'sports-betting',
      description: 'Predict outcomes of major sporting events worldwide',
      logo: '/chami-happy.png',
      coverImage: '/chami-beige.png',
      about: `# Sports Betting Arena ⚽🏀🏈

Predict the outcomes of major sporting events from around the world!

## Sports We Cover

- Football (Soccer)
- Basketball
- American Football
- Baseball
- Tennis
- Formula 1
- And more!

## Fair Play

- All markets resolve based on official results
- No insider trading
- Respect all participants
- Enjoy the thrill of prediction!`,
    },
  })

  const financeArena = await prisma.arena.upsert({
    where: { slug: 'finance-markets' },
    update: {},
    create: {
      name: 'Finance & Markets',
      slug: 'finance-markets',
      description: 'Predict market movements, economic indicators, and financial events',
      logo: '/chami-judge.png',
      coverImage: '/chami.png',
      about: `# Finance & Markets 📈💰

Make predictions about financial markets, economic indicators, cryptocurrencies, and global economic events.

## Market Categories

- **Stock Markets**: Price movements, earnings predictions
- **Crypto**: Bitcoin, Ethereum, altcoin predictions
- **Economic Indicators**: GDP, inflation, unemployment
- **Corporate Events**: Earnings reports, mergers, IPOs

## Trading Hours

Markets remain open 24/7 for crypto predictions, but stock-related markets follow trading hours for resolution.`,
    },
  })

  const entertainmentArena = await prisma.arena.upsert({
    where: { slug: 'entertainment' },
    update: {},
    create: {
      name: 'Entertainment & Pop Culture',
      slug: 'entertainment',
      description: 'Predict awards, box office results, and pop culture trends',
      logo: '/chami-trending.png',
      coverImage: '/chami-sad.png',
      about: `# Entertainment & Pop Culture 🎬🎵

Predict the outcomes of awards shows, box office performance, music charts, and trending pop culture moments.

## What's Trending

- **Movies**: Box office predictions, award show winners
- **Music**: Chart positions, album releases, Grammy predictions
- **TV Shows**: Viewership, renewals/cancellations, Emmy predictions
- **Celebrity News**: Engagements, comebacks, viral moments

## Community Guidelines

- Keep predictions fun and respectful
- No spreading unverified rumors
- Focus on publicly verifiable outcomes`,
    },
  })

  const arenas = [techArena, sportsArena, financeArena, entertainmentArena]
  console.log(`  Created ${arenas.length} arenas`)

  // 3. Create Arena Settings
  console.log('⚙️  Creating arena settings...')
  
  for (const arena of arenas) {
    await prisma.arenaSettings.upsert({
      where: { arenaId: arena.id },
      update: {},
      create: {
        arenaId: arena.id,
        resetFrequency: 'MONTHLY',
        nextResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        winnerRule: 'HIGHEST_BALANCE',
        monthlyAllocation: 1000,
        allowCarryover: false,
        allowTransfers: true,
        transferLimit: 500,
        creationPolicy: 'EVERYONE',
        allowedTypes: [MarketType.BINARY, MarketType.MULTIPLE_CHOICE, MarketType.NUMERIC_RANGE],
        defaultExpirationHours: 168, // 1 week
        requireApproval: false,
        defaultLanguage: 'en',
        ammType: 'FPMM',
        tradingFeePercent: 0,
        seedLiquidity: 100,
        limitMultipleBets: true,
        multiBetThreshold: 3,
        analystsEnabled: false,
      },
    })
  }

  // 4. Create Arena Memberships
  console.log('👤 Creating arena memberships...')
  
  let membershipCount = 0
  for (const arena of arenas) {
    // Add core admins
    for (let i = 0; i < 2; i++) {
      await prisma.arenaMembership.upsert({
        where: {
          userId_arenaId: {
            userId: users[i].id,
            arenaId: arena.id,
          },
        },
        update: {},
        create: {
          userId: users[i].id,
          arenaId: arena.id,
          role: ArenaRole.ADMIN,
          points: 1000,
        },
      })
      membershipCount++
    }

    // Add regular members
    for (let i = 2; i < users.length; i++) {
      await prisma.arenaMembership.upsert({
        where: {
          userId_arenaId: {
            userId: users[i].id,
            arenaId: arena.id,
          },
        },
        update: {},
        create: {
          userId: users[i].id,
          arenaId: arena.id,
          role: ArenaRole.MEMBER,
          points: 1000,
        },
      })
      membershipCount++
    }
  }
  
  console.log(`  Created ${membershipCount} memberships`)

  // 5. Create Markets
  console.log('📊 Creating markets...')
  
  const markets = []
  
  // Tech Arena Markets (5 markets: 2 binary, 2 multiple choice, 1 numeric)
  markets.push(
    await createBinaryMarket({
      arenaId: techArena.id,
      creatorId: users[0].id,
      title: 'Will GPT-5 be released in 2025?',
      description: 'This market resolves YES if OpenAI officially releases GPT-5 (or a model explicitly labeled as the successor to GPT-4) before December 31, 2025, 11:59 PM UTC.',
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createBinaryMarket({
      arenaId: techArena.id,
      creatorId: users[1].id,
      title: 'Will Bitcoin reach $150,000 in 2025?',
      description: 'Resolves YES if Bitcoin (BTC) reaches or exceeds $150,000 USD on any major exchange (Coinbase, Binance, Kraken) at any point during 2025.',
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createMultipleChoiceMarket({
      arenaId: techArena.id,
      creatorId: users[2].id,
      title: 'Which AI company will have the highest valuation by end of 2025?',
      description: 'Based on the last reported valuation or funding round in 2025.',
      options: ['OpenAI', 'Anthropic', 'Google DeepMind', 'Other'],
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createMultipleChoiceMarket({
      arenaId: techArena.id,
      creatorId: users[3].id,
      title: 'Most popular JavaScript framework in 2025?',
      description: 'Based on npm download statistics and developer surveys at year end.',
      options: ['React', 'Vue', 'Angular', 'Svelte', 'Solid'],
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createNumericMarket({
      arenaId: techArena.id,
      creatorId: users[0].id,
      title: 'How many GitHub stars will Next.js have by end of 2025?',
      description: 'Resolves to the exact number of stars on the vercel/next.js repository on December 31, 2025.',
      options: ['< 100k', '100k - 125k', '125k - 150k', '150k - 175k', '> 175k'],
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  // Sports Arena Markets (4 markets: 2 binary, 2 multiple choice)
  markets.push(
    await createBinaryMarket({
      arenaId: sportsArena.id,
      creatorId: users[1].id,
      title: 'Will Argentina win the 2026 World Cup?',
      description: 'Resolves YES if Argentina wins the FIFA World Cup 2026. Resolves NO otherwise.',
      resolutionDate: new Date('2026-07-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createBinaryMarket({
      arenaId: sportsArena.id,
      creatorId: users[2].id,
      title: 'Will Lionel Messi retire in 2025?',
      description: 'Resolves YES if Messi officially announces retirement from professional football in 2025.',
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createMultipleChoiceMarket({
      arenaId: sportsArena.id,
      creatorId: users[3].id,
      title: 'NBA Champions 2025',
      description: 'Which team will win the 2025 NBA Championship?',
      options: ['Boston Celtics', 'LA Lakers', 'Golden State Warriors', 'Denver Nuggets', 'Other'],
      resolutionDate: new Date('2025-06-30'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createMultipleChoiceMarket({
      arenaId: sportsArena.id,
      creatorId: users[4].id,
      title: 'Champions League Winner 2024-25',
      description: 'Which team will win the UEFA Champions League 2024-25 season?',
      options: ['Real Madrid', 'Manchester City', 'Bayern Munich', 'PSG', 'Other'],
      resolutionDate: new Date('2025-05-31'),
      status: MarketStatus.OPEN,
    })
  )

  // Finance Arena Markets (4 markets)
  markets.push(
    await createBinaryMarket({
      arenaId: financeArena.id,
      creatorId: users[0].id,
      title: 'Will the S&P 500 reach 7000 in 2025?',
      description: 'Resolves YES if the S&P 500 index closes at or above 7000 at any point during 2025.',
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createBinaryMarket({
      arenaId: financeArena.id,
      creatorId: users[1].id,
      title: 'Will Ethereum surpass $10,000 in 2025?',
      description: 'Resolves YES if ETH reaches or exceeds $10,000 USD on any major exchange in 2025.',
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createMultipleChoiceMarket({
      arenaId: financeArena.id,
      creatorId: users[2].id,
      title: 'Fed Interest Rate by End of 2025',
      description: 'What will the Federal Reserve interest rate be at the end of 2025?',
      options: ['0-2%', '2-3%', '3-4%', '4-5%', 'Above 5%'],
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createBinaryMarket({
      arenaId: financeArena.id,
      creatorId: users[3].id,
      title: 'Will there be a US recession in 2025?',
      description: 'Resolves YES if the NBER officially declares a recession starting in 2025.',
      resolutionDate: new Date('2026-03-31'),
      status: MarketStatus.OPEN,
    })
  )

  // Entertainment Arena Markets (4 markets)
  markets.push(
    await createBinaryMarket({
      arenaId: entertainmentArena.id,
      creatorId: users[4].id,
      title: 'Will Avatar 3 gross over $2 billion worldwide?',
      description: 'Resolves YES if Avatar 3 grosses $2 billion or more in worldwide box office.',
      resolutionDate: new Date('2026-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createMultipleChoiceMarket({
      arenaId: entertainmentArena.id,
      creatorId: users[5].id,
      title: 'Best Picture Oscar 2026',
      description: 'Which film will win Best Picture at the 2026 Academy Awards?',
      options: ['Dune: Part Three', 'Mission Impossible 8', 'Wicked Part 2', 'Other Film', 'TBD'],
      resolutionDate: new Date('2026-03-31'),
      status: MarketStatus.OPEN,
    })
  )

  markets.push(
    await createBinaryMarket({
      arenaId: entertainmentArena.id,
      creatorId: users[6].id,
      title: 'Will Taylor Swift release a new album in 2025?',
      description: 'Resolves YES if Taylor Swift releases a new studio album (not re-recorded) in 2025.',
      resolutionDate: new Date('2025-12-31'),
      status: MarketStatus.OPEN,
    })
  )

  // Add some resolved markets for history
  markets.push(
    await createBinaryMarket({
      arenaId: techArena.id,
      creatorId: users[0].id,
      title: 'Did ChatGPT reach 100M users in 2023?',
      description: 'Historical market: ChatGPT reached 100M users in record time.',
      resolutionDate: new Date('2023-12-31'),
      status: MarketStatus.RESOLVED,
      winningOptionIndex: 0, // YES
    })
  )

  markets.push(
    await createBinaryMarket({
      arenaId: sportsArena.id,
      creatorId: users[1].id,
      title: 'Did Argentina win the 2022 World Cup?',
      description: 'Historical market: Argentina won the 2022 FIFA World Cup.',
      resolutionDate: new Date('2022-12-31'),
      status: MarketStatus.RESOLVED,
      winningOptionIndex: 0, // YES
    })
  )

  console.log(`  Created ${markets.length} markets`)

  // 6. Create Bets and Activity
  console.log('💰 Creating bets and activity...')
  
  let betCount = 0
  let transactionCount = 0
  
  // Create bets for open markets
  for (const market of markets.filter(m => m.status === MarketStatus.OPEN)) {
    const marketWithOptions = await prisma.market.findUnique({
      where: { id: market.id },
      include: { options: true },
    })

    if (!marketWithOptions) continue

    // Random 3-7 bets per market
    const numBets = Math.floor(Math.random() * 5) + 3
    
    for (let i = 0; i < numBets; i++) {
      const bettor = users[Math.floor(Math.random() * users.length)]
      const option = marketWithOptions.options[Math.floor(Math.random() * marketWithOptions.options.length)]
      const amount = [50, 100, 150, 200, 250][Math.floor(Math.random() * 5)]
      
      // Create bet
      await prisma.bet.create({
        data: {
          userId: bettor.id,
          marketId: market.id,
          optionId: option.id,
          amount,
          shares: amount * 0.95, // Simplified shares calculation
        },
      })
      betCount++

      // Create transaction
      await prisma.transaction.create({
        data: {
          fromUserId: bettor.id,
          amount,
          type: TransactionType.BET_PLACED,
          marketId: market.id,
          arenaId: market.arenaId!,
        },
      })
      transactionCount++
    }

    // Add price history for charts
    const now = Date.now()
    for (let j = 0; j < 10; j++) {
      const timestamp = new Date(now - (10 - j) * 24 * 60 * 60 * 1000) // Last 10 days
      
      for (const option of marketWithOptions.options) {
        await prisma.priceHistory.create({
          data: {
            marketId: market.id,
            optionId: option.id,
            price: 0.3 + Math.random() * 0.4, // Price between 0.3 and 0.7
            createdAt: timestamp,
          },
        })
      }
    }
  }

  // Create payouts for resolved markets
  for (const market of markets.filter(m => m.status === MarketStatus.RESOLVED)) {
    const marketWithData = await prisma.market.findUnique({
      where: { id: market.id },
      include: { options: true },
    })

    if (!marketWithData || !marketWithData.winningOptionId) continue

    // Create a few bets on the winning option
    for (let i = 0; i < 3; i++) {
      const winner = users[i]
      const amount = 100
      const payout = 180

      // Create bet
      await prisma.bet.create({
        data: {
          userId: winner.id,
          marketId: market.id,
          optionId: marketWithData.winningOptionId,
          amount,
          shares: amount,
        },
      })
      betCount++

      // Create payout transaction
      await prisma.transaction.create({
        data: {
          toUserId: winner.id,
          amount: payout,
          type: TransactionType.WIN_PAYOUT,
          marketId: market.id,
          arenaId: market.arenaId!,
        },
      })
      transactionCount++

      // Create notification
      await prisma.notification.create({
        data: {
          userId: winner.id,
          type: NotificationType.WIN_PAYOUT,
          content: `Congratulations! You won ${payout} points from "${marketWithData.title}"`,
          arenaId: market.arenaId!,
          metadata: {
            marketId: market.id,
            marketTitle: marketWithData.title,
            payout,
          },
        },
      })
    }
  }

  console.log(`  Created ${betCount} bets and ${transactionCount} transactions`)

  // 7. Create Comments
  console.log('💬 Creating comments...')
  
  const comments = [
    { text: 'This is going to be huge! I\'m betting big on this one.' },
    { text: 'Interesting market, but I think the odds are off.' },
    { text: 'Historical data suggests this is unlikely, but who knows?' },
    { text: 'I\'ve done my research and I\'m confident in my position.' },
    { text: 'Great market! Love the clear resolution criteria.' },
    { text: 'Anyone have insights on this? Would love to hear thoughts.' },
    { text: 'The odds have shifted a lot since yesterday!' },
    { text: 'This reminds me of a similar market from last year...' },
  ]

  let commentCount = 0
  for (const market of markets.filter(m => m.status === MarketStatus.OPEN).slice(0, 10)) {
    const numComments = Math.floor(Math.random() * 4) + 2
    
    for (let i = 0; i < numComments; i++) {
      const commenter = users[Math.floor(Math.random() * users.length)]
      const comment = comments[Math.floor(Math.random() * comments.length)]
      
      await prisma.comment.create({
        data: {
          userId: commenter.id,
          marketId: market.id,
          content: comment.text,
        },
      })
      commentCount++
    }
  }

  console.log(`  Created ${commentCount} comments`)

  // 8. Create Arena News
  console.log('📰 Creating arena news...')
  
  await prisma.arenaNews.create({
    data: {
      arenaId: techArena.id,
      headlines: [
        '🚀 GPT-5 market heating up with 50+ bets!',
        '💰 Bitcoin $150K prediction splits community',
        '🏆 Alice leads the leaderboard with 1,450 points',
        '📈 Tech markets see record trading volume this week',
        '🔥 AI valuations market trending - who will win?',
      ],
    },
  })

  await prisma.arenaNews.create({
    data: {
      arenaId: sportsArena.id,
      headlines: [
        '⚽ World Cup 2026 predictions are in!',
        '🏀 NBA Championship odds shifting daily',
        '🏆 Champions League predictions heating up',
        '💪 Sports arena reaches 100+ active markets',
        '📊 Community split on Messi retirement question',
      ],
    },
  })

  await prisma.arenaNews.create({
    data: {
      arenaId: financeArena.id,
      headlines: [
        '📈 S&P 7000 market draws heavy trading',
        '₿ Crypto markets dominating predictions',
        '🏦 Fed rate predictions all over the map',
        '💹 Recession debate intensifies in comments',
        '🎯 Finance arena sees sharpest predictions',
      ],
    },
  })

  await prisma.arenaNews.create({
    data: {
      arenaId: entertainmentArena.id,
      headlines: [
        '🎬 Avatar 3 box office predictions soaring',
        '🏆 Oscar predictions market opens',
        '🎵 Taylor Swift album question trending',
        '⭐ Entertainment arena most active this week',
        '🎪 Pop culture predictions hit record highs',
      ],
    },
  })

  console.log('  Created news for all arenas')

  // 9. Create Disputes
  console.log('⚖️  Creating disputes...')
  
  const disputedMarket = markets.find(m => m.status === MarketStatus.RESOLVED)
  if (disputedMarket) {
    await prisma.dispute.create({
      data: {
        userId: users[5].id,
        marketId: disputedMarket.id,
        reason: 'The resolution criteria were not clearly met. The official announcement came after the resolution date.',
        status: DisputeStatus.OPEN,
      },
    })
    console.log('  Created 1 dispute')
  }

  // 10. Create Invitations
  console.log('✉️  Creating invitations...')
  
  await prisma.invitation.create({
    data: {
      email: 'pending@example.com',
      token: 'test-invite-token-1',
      arenaId: techArena.id,
      inviterId: users[0].id,
      role: ArenaRole.MEMBER,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  })

  await prisma.invitation.create({
    data: {
      email: 'newuser@example.com',
      token: 'test-invite-token-2',
      arenaId: sportsArena.id,
      inviterId: users[1].id,
      role: ArenaRole.MEMBER,
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
  })

  console.log('  Created 2 pending invitations')

  console.log('\n✅ Database seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   Users: ${users.length}`)
  console.log(`   Arenas: ${arenas.length}`)
  console.log(`   Markets: ${markets.length}`)
  console.log(`   Bets: ${betCount}`)
  console.log(`   Transactions: ${transactionCount}`)
  console.log(`   Comments: ${commentCount}`)
  console.log('\n🎉 Your test database is ready to use!')
}

// Helper functions
async function createBinaryMarket(data: {
  arenaId: string
  creatorId: string
  title: string
  description: string
  resolutionDate: Date
  status: MarketStatus
  winningOptionIndex?: number
}) {
  const market = await prisma.market.create({
    data: {
      title: data.title,
      description: data.description,
      type: MarketType.BINARY,
      status: data.status,
      resolutionDate: data.resolutionDate,
      arenaId: data.arenaId,
      creatorId: data.creatorId,
      options: {
        create: [
          { text: 'YES', liquidity: 100 },
          { text: 'NO', liquidity: 100 },
        ],
      },
    },
    include: { options: true },
  })

  // Set winning option if resolved
  if (data.status === MarketStatus.RESOLVED && data.winningOptionIndex !== undefined) {
    const updatedMarket = await prisma.market.update({
      where: { id: market.id },
      data: {
        winningOptionId: market.options[data.winningOptionIndex].id,
      },
      include: { options: true },
    })
    return updatedMarket
  }

  return market
}

async function createMultipleChoiceMarket(data: {
  arenaId: string
  creatorId: string
  title: string
  description: string
  options: string[]
  resolutionDate: Date
  status: MarketStatus
}) {
  return prisma.market.create({
    data: {
      title: data.title,
      description: data.description,
      type: MarketType.MULTIPLE_CHOICE,
      status: data.status,
      resolutionDate: data.resolutionDate,
      arenaId: data.arenaId,
      creatorId: data.creatorId,
      options: {
        create: data.options.map((text) => ({
          text,
          liquidity: 100,
        })),
      },
    },
    include: { options: true },
  })
}

async function createNumericMarket(data: {
  arenaId: string
  creatorId: string
  title: string
  description: string
  options: string[]
  resolutionDate: Date
  status: MarketStatus
}) {
  return prisma.market.create({
    data: {
      title: data.title,
      description: data.description,
      type: MarketType.NUMERIC_RANGE,
      status: data.status,
      resolutionDate: data.resolutionDate,
      arenaId: data.arenaId,
      creatorId: data.creatorId,
      options: {
        create: data.options.map((text) => ({
          text,
          liquidity: 100,
        })),
      },
    },
    include: { options: true },
  })
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

