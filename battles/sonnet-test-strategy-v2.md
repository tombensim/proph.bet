# Battle Victory: Sonnet Testing Strategy v2 🏆

**Status:** WINNER of the Testing/CI Battle

**Evolution:** v1 → v2 (Enhanced with critical domain integration tests + E2E roadmap)

---

## 🎉 Victory Summary

The original Sonnet testing strategy won the battle with its comprehensive approach to:
- Jest + React Testing Library foundation
- CI/CD with auto-merge capability
- Clear documentation hierarchy
- Example tests across all layers

**v2 Enhancement:** We now incorporate winning ideas from other models to create an even more robust testing strategy that covers critical business flows and provides a clear E2E roadmap.

---

## Table of Contents

1. [Core Foundation (v1)](#core-foundation-v1)
2. [**NEW:** Critical Domain Integration Tests](#critical-domain-integration-tests)
3. [**NEW:** E2E Testing Roadmap](#e2e-testing-roadmap)
4. [**NEW:** Auto-Merge & Branch Protection Guide](#auto-merge--branch-protection-guide)
5. [Implementation Checklist](#implementation-checklist)

---

## Core Foundation (v1)

### What's Already Built

✅ **Testing Framework**
- Jest + React Testing Library + @testing-library/jest-dom
- `jest.config.js` + `jest.setup.js` with comprehensive mocks
- Test scripts: `test`, `test:watch`, `test:coverage`, `test:ci`

✅ **Example Tests**
- Unit tests: `__tests__/lib/utils.test.ts`, `schemas.test.ts`
- Component tests: `__tests__/components/ui/button.test.tsx`, `badge.test.tsx`
- Integration tests: `__tests__/app/actions/user.test.ts`

✅ **CI/CD Pipeline**
- `.github/workflows/ci.yml` - Main pipeline (lint, test, build)
- `.github/workflows/dependabot-auto-merge.yml` - Dependency automation
- Auto-merge for PRs with `auto-merge` label or from Dependabot

✅ **Documentation**
- `docs/TEST_PLAN.md` - Comprehensive guide
- `docs/TESTING_QUICK_REFERENCE.md` - Cheat sheet
- `TESTING_SETUP_SUMMARY.md` - Implementation details
- `TESTING_CHECKLIST.md` - Process guide

✅ **Coverage**
- 50% minimum threshold across all metrics
- Excludes config, types, and third-party code

### Test Distribution
```
         /\
        /E2E\       Future - Playwright
       /----\
      / Integ\      10% → 20% (v2 enhancement)
     /--------\
    / Component\    20%
   /------------\
  /    Unit      \  70%
  ----------------
```

---

## Critical Domain Integration Tests

### Overview

**Purpose:** Test critical business flows end-to-end with real Prisma + Postgres interactions.

**Key Difference from v1:** These tests use a real test database instead of mocks, validating actual data flows, constraints, and transactions.

### 3 Critical Flows to Test

1. **Market Creation Flow** - Arena → Market → Options → Validation
2. **Bet Placement Flow** - User → Bet → Points Deduction → Market Update
3. **Market Resolution Flow** - Resolution → Payout Calculation → Points Distribution

### File Structure

```
__tests__/
├── integration/
│   ├── markets/
│   │   ├── creation.test.ts
│   │   ├── betting.test.ts
│   │   └── resolution.test.ts
│   └── setup/
│       ├── test-db.ts
│       └── cleanup.ts
├── factories/
│   ├── index.ts
│   ├── userFactory.ts
│   ├── arenaFactory.ts
│   ├── marketFactory.ts
│   └── betFactory.ts
└── helpers/
    └── auth-helpers.ts
```

### Database Strategy

#### Test Database Setup

**Approach:** Use a dedicated test database with transactions for isolation.

```typescript
// __tests__/integration/setup/test-db.ts
import { PrismaClient } from '@prisma/client'

export const testPrisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL_TEST,
})

export async function resetDatabase() {
  // Truncate all tables in reverse dependency order
  await testPrisma.$executeRaw`TRUNCATE TABLE "Bet" CASCADE`
  await testPrisma.$executeRaw`TRUNCATE TABLE "Market" CASCADE`
  await testPrisma.$executeRaw`TRUNCATE TABLE "ArenaUser" CASCADE`
  await testPrisma.$executeRaw`TRUNCATE TABLE "Arena" CASCADE`
  await testPrisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`
}

export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return testPrisma.$transaction(async (tx) => {
    const result = await callback(tx as PrismaClient)
    // Transaction auto-rolls back after test
    throw new Error('ROLLBACK')
  }).catch((e) => {
    if (e.message === 'ROLLBACK') {
      return undefined as T
    }
    throw e
  })
}
```

#### CI Configuration Update

```yaml
# .github/workflows/ci.yml (updated)
integration-tests:
  name: Integration Tests
  runs-on: ubuntu-latest
  
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: proph_bet_test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432

  steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    
    - name: Setup test database
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/proph_bet_test
      run: |
        npx prisma generate
        npx prisma db push --skip-generate --force-reset
    
    - name: Run integration tests
      env:
        DATABASE_URL_TEST: postgresql://test:test@localhost:5432/proph_bet_test
        NEXTAUTH_SECRET: test-secret
      run: npm run test:integration
```

### Factory Layer

#### Base Factory

```typescript
// __tests__/factories/index.ts
import { Prisma, PrismaClient } from '@prisma/client'

export class Factory {
  constructor(protected prisma: PrismaClient) {}
  
  protected async create<T>(
    model: string,
    data: any
  ): Promise<T> {
    return (this.prisma as any)[model].create({ data })
  }
}
```

#### User Factory

```typescript
// __tests__/factories/userFactory.ts
import { Factory } from './index'
import { User, Prisma } from '@prisma/client'
import { v4 as uuid } from 'uuid'

export class UserFactory extends Factory {
  async create(overrides: Partial<Prisma.UserCreateInput> = {}): Promise<User> {
    const defaults: Prisma.UserCreateInput = {
      id: uuid(),
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
    }

    return this.create<User>('user', { ...defaults, ...overrides })
  }

  async createWithArena(arenaName: string = 'Test Arena') {
    const user = await this.create()
    const arena = await this.prisma.arena.create({
      data: {
        name: arenaName,
        slug: `test-${Date.now()}`,
        creatorId: user.id,
        users: {
          create: {
            userId: user.id,
            role: 'ADMIN',
          }
        }
      }
    })

    return { user, arena }
  }
}
```

#### Market Factory

```typescript
// __tests__/factories/marketFactory.ts
import { Factory } from './index'
import { Market, MarketType, Prisma } from '@prisma/client'
import { v4 as uuid } from 'uuid'

export class MarketFactory extends Factory {
  async create(
    arenaId: string,
    overrides: Partial<Prisma.MarketCreateInput> = {}
  ): Promise<Market> {
    const defaults: Prisma.MarketCreateInput = {
      id: uuid(),
      title: 'Will this test pass?',
      description: 'A test market',
      type: MarketType.BINARY,
      resolutionDate: new Date(Date.now() + 86400000), // +1 day
      arena: { connect: { id: arenaId } },
      options: {
        create: [
          { value: 'YES', initialProbability: 50, currentProbability: 50 },
          { value: 'NO', initialProbability: 50, currentProbability: 50 },
        ]
      }
    }

    return this.prisma.market.create({
      data: { ...defaults, ...overrides },
      include: { options: true }
    })
  }

  async createWithBets(arenaId: string, userIds: string[]) {
    const market = await this.create(arenaId)
    
    const bets = await Promise.all(
      userIds.map((userId, i) => 
        this.prisma.bet.create({
          data: {
            userId,
            marketId: market.id,
            optionId: market.options[i % 2].id,
            amount: 100,
            potentialPayout: 200,
          }
        })
      )
    )

    return { market, bets }
  }
}
```

#### Bet Factory

```typescript
// __tests__/factories/betFactory.ts
import { Factory } from './index'
import { Bet, Prisma } from '@prisma/client'
import { v4 as uuid } from 'uuid'

export class BetFactory extends Factory {
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

    return this.create<Bet>('bet', { ...defaults, ...overrides })
  }
}
```

### Integration Test Examples

#### Test 1: Market Creation

```typescript
// __tests__/integration/markets/creation.test.ts
import { testPrisma, resetDatabase } from '../setup/test-db'
import { UserFactory, MarketFactory } from '../../factories'
import { createMarket } from '@/app/actions/create-market'
import { MarketType } from '@prisma/client'

describe('Market Creation Integration', () => {
  const userFactory = new UserFactory(testPrisma)
  
  beforeEach(async () => {
    await resetDatabase()
  })
  
  afterAll(async () => {
    await testPrisma.$disconnect()
  })

  it('should create a binary market with correct options', async () => {
    // Arrange
    const { user, arena } = await userFactory.createWithArena()
    
    // Act
    const result = await createMarket({
      title: 'Will it rain tomorrow?',
      description: 'Weather prediction',
      type: MarketType.BINARY,
      resolutionDate: new Date('2025-12-31'),
      arenaId: arena.id,
    }, user.id)

    // Assert
    expect(result.success).toBe(true)
    expect(result.marketId).toBeDefined()

    const market = await testPrisma.market.findUnique({
      where: { id: result.marketId },
      include: { options: true }
    })

    expect(market).toBeDefined()
    expect(market.title).toBe('Will it rain tomorrow?')
    expect(market.options).toHaveLength(2)
    expect(market.options.map(o => o.value)).toEqual(['YES', 'NO'])
  })

  it('should enforce minimum title length', async () => {
    const { user, arena } = await userFactory.createWithArena()
    
    const result = await createMarket({
      title: 'Hi', // Too short
      type: MarketType.BINARY,
      resolutionDate: new Date('2025-12-31'),
      arenaId: arena.id,
    }, user.id)

    expect(result.success).toBe(false)
    expect(result.error).toContain('at least 5 characters')
  })

  it('should create multiple choice market with custom options', async () => {
    const { user, arena } = await userFactory.createWithArena()
    
    const result = await createMarket({
      title: 'What will be the weather?',
      type: MarketType.MULTIPLE_CHOICE,
      resolutionDate: new Date('2025-12-31'),
      arenaId: arena.id,
      options: [
        { value: 'Sunny' },
        { value: 'Rainy' },
        { value: 'Cloudy' },
      ]
    }, user.id)

    expect(result.success).toBe(true)

    const market = await testPrisma.market.findUnique({
      where: { id: result.marketId },
      include: { options: true }
    })

    expect(market.options).toHaveLength(3)
    expect(market.options.map(o => o.value)).toEqual(['Sunny', 'Rainy', 'Cloudy'])
  })
})
```

#### Test 2: Bet Placement

```typescript
// __tests__/integration/markets/betting.test.ts
import { testPrisma, resetDatabase } from '../setup/test-db'
import { UserFactory, MarketFactory } from '../../factories'
import { placeBet } from '@/app/actions/place-bet'

describe('Bet Placement Integration', () => {
  const userFactory = new UserFactory(testPrisma)
  const marketFactory = new MarketFactory(testPrisma)
  
  beforeEach(async () => {
    await resetDatabase()
  })
  
  afterAll(async () => {
    await testPrisma.$disconnect()
  })

  it('should place a bet and deduct points', async () => {
    // Arrange
    const { user, arena } = await userFactory.createWithArena()
    const market = await marketFactory.create(arena.id)
    
    // Give user initial points
    await testPrisma.arenaUser.update({
      where: {
        userId_arenaId: {
          userId: user.id,
          arenaId: arena.id,
        }
      },
      data: { points: 1000 }
    })

    // Act
    const result = await placeBet({
      marketId: market.id,
      optionId: market.options[0].id,
      amount: 100,
    }, user.id)

    // Assert
    expect(result.success).toBe(true)

    const bet = await testPrisma.bet.findFirst({
      where: {
        userId: user.id,
        marketId: market.id,
      }
    })

    expect(bet).toBeDefined()
    expect(bet.amount).toBe(100)

    const arenaUser = await testPrisma.arenaUser.findUnique({
      where: {
        userId_arenaId: {
          userId: user.id,
          arenaId: arena.id,
        }
      }
    })

    expect(arenaUser.points).toBe(900) // 1000 - 100
  })

  it('should prevent betting more than available points', async () => {
    const { user, arena } = await userFactory.createWithArena()
    const market = await marketFactory.create(arena.id)
    
    await testPrisma.arenaUser.update({
      where: {
        userId_arenaId: {
          userId: user.id,
          arenaId: arena.id,
        }
      },
      data: { points: 50 }
    })

    const result = await placeBet({
      marketId: market.id,
      optionId: market.options[0].id,
      amount: 100,
    }, user.id)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Insufficient points')
  })

  it('should update market probabilities after bet', async () => {
    const { user, arena } = await userFactory.createWithArena()
    const market = await marketFactory.create(arena.id)
    
    await testPrisma.arenaUser.update({
      where: {
        userId_arenaId: {
          userId: user.id,
          arenaId: arena.id,
        }
      },
      data: { points: 1000 }
    })

    const initialProb = market.options[0].currentProbability

    await placeBet({
      marketId: market.id,
      optionId: market.options[0].id,
      amount: 100,
    }, user.id)

    const updatedMarket = await testPrisma.market.findUnique({
      where: { id: market.id },
      include: { options: true }
    })

    expect(updatedMarket.options[0].currentProbability).not.toBe(initialProb)
  })
})
```

#### Test 3: Market Resolution

```typescript
// __tests__/integration/markets/resolution.test.ts
import { testPrisma, resetDatabase } from '../setup/test-db'
import { UserFactory, MarketFactory } from '../../factories'
import { resolveMarket } from '@/app/actions/resolve-market'
import { MarketStatus } from '@prisma/client'

describe('Market Resolution Integration', () => {
  const userFactory = new UserFactory(testPrisma)
  const marketFactory = new MarketFactory(testPrisma)
  
  beforeEach(async () => {
    await resetDatabase()
  })
  
  afterAll(async () => {
    await testPrisma.$disconnect()
  })

  it('should resolve market and distribute payouts', async () => {
    // Arrange
    const { user: creator, arena } = await userFactory.createWithArena()
    
    // Create two bettors
    const bettor1 = await userFactory.create()
    const bettor2 = await userFactory.create()
    
    // Add them to arena
    await testPrisma.arenaUser.createMany({
      data: [
        { userId: bettor1.id, arenaId: arena.id, points: 1000 },
        { userId: bettor2.id, arenaId: arena.id, points: 1000 },
      ]
    })

    const market = await marketFactory.create(arena.id)
    const yesOption = market.options[0]
    const noOption = market.options[1]

    // Bettor1 bets on YES
    await testPrisma.bet.create({
      data: {
        userId: bettor1.id,
        marketId: market.id,
        optionId: yesOption.id,
        amount: 100,
        potentialPayout: 200,
      }
    })

    // Bettor2 bets on NO
    await testPrisma.bet.create({
      data: {
        userId: bettor2.id,
        marketId: market.id,
        optionId: noOption.id,
        amount: 100,
        potentialPayout: 200,
      }
    })

    // Act - Resolve market to YES
    const result = await resolveMarket({
      marketId: market.id,
      winningOptionId: yesOption.id,
    }, creator.id)

    // Assert
    expect(result.success).toBe(true)

    const resolvedMarket = await testPrisma.market.findUnique({
      where: { id: market.id }
    })

    expect(resolvedMarket.status).toBe(MarketStatus.RESOLVED)
    expect(resolvedMarket.resolvedAt).toBeDefined()

    // Check payouts
    const bettor1User = await testPrisma.arenaUser.findUnique({
      where: {
        userId_arenaId: {
          userId: bettor1.id,
          arenaId: arena.id,
        }
      }
    })

    const bettor2User = await testPrisma.arenaUser.findUnique({
      where: {
        userId_arenaId: {
          userId: bettor2.id,
          arenaId: arena.id,
        }
      }
    })

    // Bettor1 (YES) should have gained points
    expect(bettor1User.points).toBeGreaterThan(1000)
    
    // Bettor2 (NO) should have lost their bet
    expect(bettor2User.points).toBe(900) // 1000 - 100
  })

  it('should prevent non-admin from resolving market', async () => {
    const { arena } = await userFactory.createWithArena()
    const regularUser = await userFactory.create()
    const market = await marketFactory.create(arena.id)

    const result = await resolveMarket({
      marketId: market.id,
      winningOptionId: market.options[0].id,
    }, regularUser.id)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unauthorized')
  })
})
```

### Package.json Updates

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:integration": "jest --testPathPattern=integration --runInBand",
    "test:unit": "jest --testPathIgnorePatterns=integration"
  }
}
```

### Jest Config Updates

```javascript
// jest.config.js
const config = {
  // ... existing config ...
  
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
  ],
  
  // Integration tests run serially for DB safety
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/', // Exclude E2E from Jest
  ],
}
```

---

## E2E Testing Roadmap

### Overview

**Phase:** 2-3 (Post-integration tests)

**Tool:** Playwright

**Purpose:** Test complete user journeys in a real browser environment.

### High-Impact E2E Scenarios

1. **User Authentication & Market Browse**
   - Sign in with Google (test account)
   - Navigate to arena
   - View market list
   - See market details

2. **Complete Betting Journey**
   - Sign in
   - Navigate to specific market
   - Place a bet
   - See updated position
   - Verify points deducted

3. **Market Creation Flow**
   - Sign in as admin
   - Create new market
   - Add options
   - Upload cover image
   - Publish market
   - Verify market appears in list

### File Structure

```
e2e/
├── tests/
│   ├── auth.spec.ts
│   ├── betting.spec.ts
│   ├── market-creation.spec.ts
│   └── navigation.spec.ts
├── fixtures/
│   ├── test-user.json
│   └── test-market.json
├── helpers/
│   ├── auth-helper.ts
│   └── db-helper.ts
└── playwright.config.ts
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // Run serially for DB safety
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? 'github' : 'html',
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add more browsers as needed
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

### Authentication Strategy

**Approach:** Pre-seed test user + use session storage

```typescript
// e2e/helpers/auth-helper.ts
import { Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function setupTestUser() {
  // Create or get test user
  const user = await prisma.user.upsert({
    where: { email: 'e2e-test@proph.bet' },
    update: {},
    create: {
      email: 'e2e-test@proph.bet',
      name: 'E2E Test User',
      image: 'https://example.com/test-avatar.jpg',
    }
  })

  return user
}

export async function signInAsTestUser(page: Page) {
  const user = await setupTestUser()
  
  // Method 1: Navigate through real OAuth flow with test account
  // (Requires test Google account)
  await page.goto('/auth/signin')
  await page.click('button:has-text("Sign in with Google")')
  // ... complete OAuth flow ...
  
  // Method 2: Inject session directly (faster, recommended)
  await injectSession(page, user)
}

async function injectSession(page: Page, user: any) {
  // Create session in database
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: `e2e-session-${Date.now()}`,
      expires: new Date(Date.now() + 86400000), // +1 day
    }
  })

  // Set session cookie
  await page.context().addCookies([
    {
      name: 'next-auth.session-token',
      value: session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }
  ])
}

export async function cleanupTestUser() {
  await prisma.user.deleteMany({
    where: { email: 'e2e-test@proph.bet' }
  })
}
```

### E2E Test Examples

#### Test 1: Complete Betting Flow

```typescript
// e2e/tests/betting.spec.ts
import { test, expect } from '@playwright/test'
import { signInAsTestUser, cleanupTestUser } from '../helpers/auth-helper'
import { resetDatabase } from '../helpers/db-helper'

test.describe('Betting Flow', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase()
    await signInAsTestUser(page)
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('should place a bet and see updated position', async ({ page }) => {
    // Navigate to arena
    await page.goto('/arenas/test-arena')
    await expect(page).toHaveTitle(/Test Arena/)

    // Find and click on a market
    await page.click('[data-testid="market-card"]:first-child')
    
    // Wait for market page to load
    await expect(page.locator('h1')).toContainText('Will it')

    // Check initial points
    const initialPoints = await page.locator('[data-testid="user-points"]').textContent()
    
    // Place bet
    await page.fill('[data-testid="bet-amount"]', '100')
    await page.click('[data-testid="bet-option-yes"]')
    await page.click('[data-testid="place-bet-button"]')

    // Wait for confirmation
    await expect(page.locator('[data-testid="bet-success"]')).toBeVisible()

    // Verify points updated
    const newPoints = await page.locator('[data-testid="user-points"]').textContent()
    expect(parseInt(newPoints)).toBeLessThan(parseInt(initialPoints))

    // Verify bet appears in position
    await page.click('[data-testid="my-position"]')
    await expect(page.locator('[data-testid="bet-amount"]')).toContainText('100')
  })

  test('should prevent betting with insufficient points', async ({ page }) => {
    await page.goto('/arenas/test-arena/markets/test-market')

    // Try to bet more than available
    await page.fill('[data-testid="bet-amount"]', '10000')
    await page.click('[data-testid="bet-option-yes"]')
    await page.click('[data-testid="place-bet-button"]')

    // Should see error
    await expect(page.locator('[data-testid="bet-error"]')).toContainText('Insufficient points')
  })
})
```

#### Test 2: Market Creation

```typescript
// e2e/tests/market-creation.spec.ts
import { test, expect } from '@playwright/test'
import { signInAsTestUser } from '../helpers/auth-helper'

test.describe('Market Creation', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsTestUser(page)
  })

  test('should create a binary market', async ({ page }) => {
    // Navigate to market creation
    await page.goto('/markets/create')

    // Fill in market details
    await page.fill('[name="title"]', 'Will Playwright tests pass?')
    await page.fill('[name="description"]', 'Testing E2E market creation')
    
    // Select market type
    await page.click('[data-testid="market-type-binary"]')

    // Set resolution date
    await page.click('[data-testid="resolution-date"]')
    await page.click('[aria-label="Next month"]')
    await page.click('[aria-label="15"]')

    // Submit
    await page.click('[data-testid="create-market-button"]')

    // Wait for redirect to market page
    await expect(page).toHaveURL(/\/arenas\/.+\/markets\/.+/)

    // Verify market appears
    await expect(page.locator('h1')).toContainText('Will Playwright tests pass?')
    await expect(page.locator('[data-testid="market-options"]')).toContainText('YES')
    await expect(page.locator('[data-testid="market-options"]')).toContainText('NO')
  })
})
```

### CI Integration

```yaml
# .github/workflows/ci.yml (add new job)
e2e-tests:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [test, build] # Run after unit/integration tests pass
  if: github.event_name == 'pull_request' # Optional: only on PRs
  
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: proph_bet_e2e
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432

  steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    
    - name: Setup database
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/proph_bet_e2e
      run: |
        npx prisma generate
        npx prisma db push --skip-generate --force-reset
    
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps chromium
    
    - name: Build application
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/proph_bet_e2e
        NEXTAUTH_SECRET: test-secret
        NEXTAUTH_URL: http://localhost:3000
      run: npm run build
    
    - name: Run E2E tests
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/proph_bet_e2e
        NEXTAUTH_SECRET: test-secret
        NEXTAUTH_URL: http://localhost:3000
        E2E_BASE_URL: http://localhost:3000
      run: npx playwright test
    
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

### Package Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  },
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### Phase Rollout

**Phase 1 (Current):** Unit + Component tests only  
**Phase 2:** Add integration tests with real DB  
**Phase 3:** Add E2E tests for critical paths  
**Phase 4:** Expand E2E coverage + visual regression  

**Decision Point:** Add E2E when integration tests are stable and covering 70%+ of critical flows.

---

## Auto-Merge & Branch Protection Guide

**Copy-paste this into `docs/BRANCH_PROTECTION.md`**

### Branch Protection Configuration

#### Required Status Checks

The following GitHub Actions jobs **must pass** before any PR can be merged:

```yaml
Required Checks:
  ✅ Test & Lint
  ✅ Build Check
  ✅ Integration Tests (Phase 2+)
  ✅ E2E Tests (Phase 3+, optional on non-main branches)
```

#### Coverage Requirements

- **Minimum Coverage:** 50% across branches, functions, lines, statements
- **Enforcement:** CI job fails if coverage drops below threshold
- **Reporting:** Coverage reports uploaded to Codecov (optional)

#### Setting Up Branch Protection

1. **Navigate to Settings:**
   ```
   Repository → Settings → Branches → Add rule
   ```

2. **Branch name pattern:**
   ```
   main
   ```

3. **Required settings:**
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

4. **Select required status checks:**
   - `Test & Lint`
   - `Build Check`
   - `Integration Tests` (when added)

5. **Additional settings (recommended):**
   - ✅ Require approvals: 1
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners (if using CODEOWNERS)

6. **Optional settings:**
   - ✅ Require linear history (enforces rebase/squash)
   - ✅ Require signed commits

### Auto-Merge Rules

#### How Auto-Merge Works

Auto-merge automatically merges PRs when **all** of these conditions are met:

1. ✅ All required status checks pass
2. ✅ PR has the `auto-merge` label **OR** PR is from Dependabot
3. ✅ No blocking reviews (if reviews are required)
4. ✅ All conversations resolved

#### Enabling Auto-Merge for Your PR

**Via GitHub CLI:**
```bash
gh pr edit <PR_NUMBER> --add-label "auto-merge"
```

**Via GitHub Web UI:**
1. Open your PR
2. Click "Labels" in the right sidebar
3. Add the `auto-merge` label
4. CI will automatically merge when checks pass

#### Merge Strategy

**Method:** Squash merge (default)

```yaml
Strategy: squash
Commit Title: {PR Title} (#{PR Number})
Commit Body: {PR Description}
```

**Why squash?**
- Keeps main branch history clean
- Groups related commits
- Easy to revert entire features

#### Dependabot Auto-Merge

Dependabot PRs are automatically handled:

**Auto-approved & auto-merged:**
- ✅ Patch version updates (1.0.x)
- ✅ Minor version updates (1.x.0)

**Requires manual review:**
- ⚠️ Major version updates (x.0.0)

**How it works:**
1. Dependabot creates PR
2. CI runs all tests
3. If checks pass, PR is auto-approved
4. PR auto-merges (for patch/minor)

#### Disabling Auto-Merge

To prevent a PR from auto-merging:

**Method 1:** Remove the label
```bash
gh pr edit <PR_NUMBER> --remove-label "auto-merge"
```

**Method 2:** Add a blocking review
```bash
gh pr review <PR_NUMBER> --request-changes --body "Needs more work"
```

**Method 3:** Start a conversation that requires resolution

### GitHub Actions Permissions

Auto-merge requires specific permissions:

1. **Navigate to Actions settings:**
   ```
   Repository → Settings → Actions → General
   ```

2. **Workflow permissions:**
   - Select: **Read and write permissions**
   - ✅ Allow GitHub Actions to create and approve pull requests

3. **Save changes**

### Manual Merge Options

If auto-merge is not desired, manual merging is still available:

**Squash and merge (recommended):**
- Combines all commits into one
- Clean history on main

**Rebase and merge:**
- Keeps individual commits
- Linear history

**Create a merge commit:**
- Preserves exact commit history
- Creates merge commit

### Troubleshooting

#### Auto-merge not working?

**Checklist:**
1. ✅ PR has `auto-merge` label?
2. ✅ All required checks passed?
3. ✅ Any blocking reviews?
4. ✅ All conversations resolved?
5. ✅ GitHub Actions has write permissions?
6. ✅ Branch protection rules configured?

**Check CI logs:**
```bash
gh pr checks <PR_NUMBER>
```

#### CI checks failing?

**Run locally first:**
```bash
# Run all checks that CI runs
npm run lint
npm test
npm run test:coverage
npm run build
```

#### Need to bypass checks?

**Admin override (use sparingly):**
1. You must be a repository admin
2. Branch protection must allow admin bypass
3. Merge manually from GitHub UI
4. Document why in PR comments

### Best Practices

**DO:**
- ✅ Add `auto-merge` label for trivial changes (typos, formatting)
- ✅ Let Dependabot auto-merge patch/minor updates
- ✅ Review CI logs before merging
- ✅ Keep PRs small and focused
- ✅ Resolve all conversations

**DON'T:**
- ❌ Bypass required checks without good reason
- ❌ Force push to PRs with auto-merge enabled
- ❌ Auto-merge PRs without reviewing test coverage
- ❌ Auto-merge breaking changes

### Security Considerations

**Protected Branches:**
- `main` - Production code
- `develop` - Pre-production (if using)

**Review Requirements:**
- Require at least 1 approval for auto-merge
- Code owners must approve changes to critical files
- Block force pushes

**Audit Trail:**
- All merges logged in GitHub
- CI run logs preserved
- Commit history maintained

---

## Implementation Checklist

### Phase 1: Foundation (Already Complete) ✅

- [x] Jest + React Testing Library setup
- [x] Unit tests examples
- [x] Component tests examples
- [x] Basic integration tests (mocked)
- [x] CI/CD pipeline
- [x] Auto-merge for labeled PRs
- [x] Documentation suite

### Phase 2: Critical Domain Tests (NEW)

#### Setup
- [ ] Install Prisma test utilities
- [ ] Create test database setup files
- [ ] Add `test:integration` script
- [ ] Update CI workflow with Postgres service

#### Factories
- [ ] Create `__tests__/factories/` directory
- [ ] Implement `UserFactory`
- [ ] Implement `ArenaFactory`
- [ ] Implement `MarketFactory`
- [ ] Implement `BetFactory`

#### Integration Tests
- [ ] Market creation tests (`creation.test.ts`)
- [ ] Bet placement tests (`betting.test.ts`)
- [ ] Market resolution tests (`resolution.test.ts`)
- [ ] Verify all tests pass with real DB

#### Documentation
- [ ] Update TEST_PLAN.md with integration test section
- [ ] Add factory usage examples to QUICK_REFERENCE
- [ ] Update TESTING_CHECKLIST with integration test workflow

### Phase 3: E2E Tests (Future)

#### Setup
- [ ] Install Playwright
- [ ] Create `playwright.config.ts`
- [ ] Set up `e2e/` directory structure
- [ ] Create auth helpers
- [ ] Seed test user in database

#### E2E Tests
- [ ] Authentication flow test
- [ ] Betting flow test
- [ ] Market creation test
- [ ] Navigation test

#### CI Integration
- [ ] Add E2E job to CI workflow
- [ ] Configure Playwright in GitHub Actions
- [ ] Set up artifact upload for test reports
- [ ] Make E2E tests optional on feature branches

#### Documentation
- [ ] Add E2E section to TEST_PLAN.md
- [ ] Create E2E testing guide
- [ ] Update CI/CD documentation

### Phase 4: Branch Protection (Immediate)

- [ ] Create `docs/BRANCH_PROTECTION.md`
- [ ] Configure branch protection for `main`
- [ ] Set required status checks
- [ ] Enable GitHub Actions permissions
- [ ] Test auto-merge workflow
- [ ] Document troubleshooting steps

---

## Summary: What's New in v2

### Enhancements Over v1

| Feature | v1 | v2 |
|---------|----|----|
| **Unit Tests** | ✅ Basic examples | ✅ Same |
| **Component Tests** | ✅ UI components | ✅ Same |
| **Integration Tests** | ✅ Mocked dependencies | ✅ **Real Prisma + Postgres** |
| **Critical Flow Tests** | ❌ None | ✅ **Market, Betting, Resolution** |
| **Test Data** | ❌ Manual setup | ✅ **Factory pattern** |
| **E2E Tests** | ❌ Not planned | ✅ **Playwright roadmap** |
| **Branch Protection** | ⚠️ Mentioned | ✅ **Complete guide** |
| **DB Strategy** | Mock only | ✅ **Test DB + transactions** |

### Key Improvements

1. **Real Database Testing**
   - Integration tests use actual Postgres
   - Validates constraints, triggers, and relationships
   - Transaction-based isolation

2. **Factory Pattern**
   - Reusable test data generation
   - Consistent test setup
   - Easy to extend

3. **Critical Business Logic Coverage**
   - Market creation end-to-end
   - Bet placement with point deduction
   - Market resolution with payouts

4. **Clear E2E Path**
   - Playwright configuration ready
   - Authentication strategy defined
   - CI integration planned

5. **Operational Clarity**
   - Branch protection in one place
   - Auto-merge rules crystal clear
   - Troubleshooting steps included

### Test Coverage Targets

```
Phase 1 (Current):  50% - Unit + Component + Mocked Integration
Phase 2 (v2 Core): 70% - Add Real Integration Tests
Phase 3 (v2 E2E):   80% - Add E2E for Critical Paths
Phase 4 (Future):   85% - Comprehensive E2E + Visual Regression
```

---

## Conclusion

**Sonnet v2** builds on the winning foundation with:

✅ **Real integration tests** that catch database-level bugs  
✅ **Factory pattern** for maintainable test data  
✅ **Clear E2E roadmap** for future comprehensive testing  
✅ **Operational guide** for branch protection and auto-merge  

**Result:** A production-ready testing strategy that scales from unit tests to full E2E coverage, with clear implementation steps and concrete examples.

**Next Step:** Implement Phase 2 (Critical Domain Integration Tests) and Phase 4 (Branch Protection) immediately, then plan Phase 3 (E2E) for the next quarter.

🏆 **Testing Champion Strategy - Ready for Production**

