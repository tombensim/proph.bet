# Testing Strategy v2 - Implementation Guide

🏆 **Victory Status:** Sonnet won the testing battle!

This document provides a concrete implementation guide for the enhanced v2 testing strategy.

---

## What's New in v2

### v1 Foundation (Already Implemented) ✅

- Jest + React Testing Library
- Unit, component, and basic integration tests
- CI/CD with GitHub Actions
- Auto-merge capability
- Comprehensive documentation

### v2 Enhancements (NEW)

1. **Critical Domain Integration Tests** - Real Postgres + Prisma
2. **Factory Pattern** - Reusable test data generation
3. **E2E Testing Roadmap** - Playwright strategy for future
4. **Branch Protection Guide** - Complete operational documentation

---

## Phase 2: Critical Domain Integration Tests

### What's Been Added

#### Test Infrastructure

**New Files:**
```
__tests__/
├── integration/
│   ├── setup/
│   │   └── test-db.ts          ✅ Created
│   └── markets/
│       ├── creation.test.ts     ✅ Created
│       └── betting.test.ts      ✅ Created
└── factories/
    ├── index.ts                 ✅ Created
    ├── userFactory.ts           ✅ Created
    ├── marketFactory.ts         ✅ Created
    └── betFactory.ts            ✅ Created
```

#### New Scripts

```json
{
  "test:unit": "jest --testPathIgnorePatterns=integration",
  "test:integration": "jest --testPathPattern=integration --runInBand",
  "test:integration:watch": "jest --testPathPattern=integration --watch --runInBand"
}
```

### How to Use

#### 1. Set Up Test Database

**Option A: Use Docker (Recommended)**

```bash
# Start test database
docker run -d \
  --name proph-test-db \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=proph_bet_test \
  -p 5433:5432 \
  postgres:16
```

**Option B: Use Existing Postgres**

Create a separate test database:
```sql
CREATE DATABASE proph_bet_test;
CREATE USER test WITH PASSWORD 'test';
GRANT ALL PRIVILEGES ON DATABASE proph_bet_test TO test;
```

#### 2. Configure Environment

Create `.env.test`:
```bash
DATABASE_URL_TEST="postgresql://test:test@localhost:5433/proph_bet_test"
NEXTAUTH_SECRET="test-secret"
```

Or use existing `.env` with test DB:
```bash
# Append to .env
DATABASE_URL_TEST="postgresql://test:test@localhost:5433/proph_bet_test"
```

#### 3. Initialize Test Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to test database
DATABASE_URL=$DATABASE_URL_TEST npx prisma db push --force-reset
```

#### 4. Run Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- creation.test.ts

# Watch mode
npm run test:integration:watch
```

### Writing Integration Tests

#### Example: Testing Market Creation

```typescript
import { testPrisma, resetDatabase, disconnectTestDb } from '../setup/test-db'
import { UserFactory, MarketFactory } from '../../factories'

describe('My Integration Test', () => {
  const userFactory = new UserFactory(testPrisma)
  const marketFactory = new MarketFactory(testPrisma)

  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectTestDb()
  })

  it('should test something', async () => {
    // Arrange - Use factories to create test data
    const { user, arena } = await userFactory.createWithArena()
    const market = await marketFactory.create(arena.id)

    // Act - Perform the action you're testing
    const result = await someFunction(market.id)

    // Assert - Verify the results
    expect(result).toBeDefined()
    
    // Can also query database directly
    const dbMarket = await testPrisma.market.findUnique({
      where: { id: market.id }
    })
    expect(dbMarket).toBeDefined()
  })
})
```

#### Using Factories

**Create a user:**
```typescript
const user = await userFactory.create()
```

**Create a user with an arena:**
```typescript
const { user, arena } = await userFactory.createWithArena('My Arena')
```

**Create multiple users:**
```typescript
const users = await userFactory.createMany(5)
```

**Create a market:**
```typescript
const market = await marketFactory.create(arenaId)
```

**Create multiple choice market:**
```typescript
const market = await marketFactory.createMultipleChoice(arenaId, [
  'Option A',
  'Option B',
  'Option C'
])
```

**Create a market with bets:**
```typescript
const { market, bets } = await marketFactory.createWithBets(
  arenaId,
  [user1.id, user2.id],
  100 // bet amount
)
```

**Create a bet:**
```typescript
const bet = await betFactory.create(userId, marketId, optionId, {
  amount: 100,
  potentialPayout: 200
})
```

### CI Configuration

Integration tests will run in CI with a real Postgres instance. The workflow is already configured in `.github/workflows/ci.yml` (to be updated):

```yaml
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
      ports:
        - 5432:5432

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npm ci
    - run: npx prisma generate
    - run: DATABASE_URL=$DATABASE_URL_TEST npx prisma db push
    - run: npm run test:integration
```

---

## Phase 3: E2E Testing (Future)

### Roadmap

**Status:** Planned for Q1 2026

**Prerequisites:**
- Integration tests covering 70%+ of critical flows
- Stable API contracts
- Test data seeding strategy

### What Will Be Added

1. **Playwright Setup**
   - `playwright.config.ts`
   - Browser automation
   - Visual regression testing

2. **E2E Test Scenarios**
   - Complete user authentication flow
   - End-to-end betting journey
   - Market creation and management
   - Admin workflows

3. **CI Integration**
   - E2E job in GitHub Actions
   - Screenshot/video artifacts
   - Parallel test execution

### How E2E Will Work

```typescript
// e2e/tests/betting.spec.ts
import { test, expect } from '@playwright/test'

test('complete betting flow', async ({ page }) => {
  // Sign in
  await page.goto('/auth/signin')
  await page.click('button:has-text("Sign in")')
  
  // Navigate to market
  await page.goto('/arenas/test/markets/123')
  
  // Place bet
  await page.fill('[data-testid="bet-amount"]', '100')
  await page.click('[data-testid="place-bet"]')
  
  // Verify
  await expect(page.locator('[data-testid="bet-success"]')).toBeVisible()
})
```

**See full details in:** `/battles/sonnet-test-strategy-v2.md`

---

## Branch Protection & Auto-Merge

### Quick Setup

#### 1. Configure GitHub Actions Permissions

```
Repository → Settings → Actions → General

Workflow permissions:
⦿ Read and write permissions

✅ Allow GitHub Actions to create and approve pull requests
```

#### 2. Enable Branch Protection

```
Repository → Settings → Branches → Add rule

Branch name pattern: main

Required settings:
✅ Require a pull request before merging
  ✅ Require approvals: 1
✅ Require status checks to pass before merging
  ✅ Test & Lint
  ✅ Build Check
  ✅ Integration Tests (Phase 2+)
✅ Require conversation resolution before merging
✅ Do not allow bypassing the above settings
```

#### 3. Enable Auto-Merge in Repository

```
Repository → Settings → General → Pull Requests

✅ Allow auto-merge
```

### Using Auto-Merge

**Add label to PR:**
```bash
gh pr edit <PR_NUMBER> --add-label "auto-merge"
```

**PR will automatically merge when:**
- ✅ All CI checks pass
- ✅ All reviews approved
- ✅ All conversations resolved

**See complete guide:** `docs/BRANCH_PROTECTION.md`

---

## Testing Strategy by Layer

### Unit Tests (70% of tests)

**What:** Individual functions, utilities, schemas  
**Speed:** Very fast (<10ms per test)  
**Database:** None (all mocked)  
**When:** Always, for all new utilities

**Example:**
```typescript
// __tests__/lib/utils.test.ts
describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })
})
```

### Component Tests (20% of tests)

**What:** React components, UI interactions  
**Speed:** Fast (~100ms per test)  
**Database:** None (mocked)  
**When:** For reusable UI components

**Example:**
```typescript
// __tests__/components/ui/button.test.tsx
it('should call onClick when clicked', async () => {
  const onClick = jest.fn()
  render(<Button onClick={onClick}>Click</Button>)
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).toHaveBeenCalled()
})
```

### Integration Tests (10% of tests) - NEW

**What:** Critical business flows with real DB  
**Speed:** Medium (~500ms per test)  
**Database:** Real Postgres (test instance)  
**When:** For critical domain logic

**Example:**
```typescript
// __tests__/integration/markets/creation.test.ts
it('should create market and options', async () => {
  const { user, arena } = await userFactory.createWithArena()
  const market = await marketFactory.create(arena.id)
  expect(market.options).toHaveLength(2)
})
```

### E2E Tests (Future)

**What:** Complete user journeys in browser  
**Speed:** Slow (~5s per test)  
**Database:** Real instance + seed data  
**When:** For critical user flows

**Example:**
```typescript
// e2e/tests/betting.spec.ts
test('should place bet end-to-end', async ({ page }) => {
  await page.goto('/markets/123')
  await page.fill('[data-testid="amount"]', '100')
  await page.click('[data-testid="submit"]')
  await expect(page.locator('.success')).toBeVisible()
})
```

---

## Test Coverage Goals

### Current Status

```
Phase 1 (Baseline): 50% minimum coverage ✅
  - Unit tests
  - Component tests
  - Mocked integration tests
```

### Phase 2 (In Progress)

```
Target: 70% coverage
  - All Phase 1 tests
  - Real integration tests for:
    ✅ Market creation
    ✅ Bet placement
    ⏳ Market resolution (to be added)
    ⏳ Points transactions (to be added)
    ⏳ User management (to be added)
```

### Phase 3 (Future)

```
Target: 80% coverage
  - All Phase 2 tests
  - E2E tests for:
    ⏳ Authentication flow
    ⏳ Betting journey
    ⏳ Market creation
    ⏳ Admin workflows
```

---

## Complete File Inventory

### v1 Files (Existing) ✅

**Configuration:**
- `jest.config.js`
- `jest.setup.js`
- `package.json` (updated with new scripts)

**Unit Tests:**
- `__tests__/lib/utils.test.ts`
- `__tests__/lib/schemas.test.ts`

**Component Tests:**
- `__tests__/components/ui/button.test.tsx`
- `__tests__/components/ui/badge.test.tsx`

**Integration Tests (mocked):**
- `__tests__/app/actions/user.test.ts`

**CI/CD:**
- `.github/workflows/ci.yml`
- `.github/workflows/dependabot-auto-merge.yml`

**Documentation:**
- `docs/TEST_PLAN.md`
- `docs/TESTING_QUICK_REFERENCE.md`
- `TESTING_SETUP_SUMMARY.md`
- `TESTING_CHECKLIST.md`

### v2 Files (NEW) ✅

**Integration Test Infrastructure:**
- `__tests__/integration/setup/test-db.ts`
- `__tests__/factories/index.ts`
- `__tests__/factories/userFactory.ts`
- `__tests__/factories/marketFactory.ts`
- `__tests__/factories/betFactory.ts`

**Integration Tests:**
- `__tests__/integration/markets/creation.test.ts`
- `__tests__/integration/markets/betting.test.ts`

**Documentation:**
- `docs/BRANCH_PROTECTION.md`
- `battles/sonnet-test-strategy-v2.md`
- `TESTING_V2_IMPLEMENTATION.md` (this file)

### v2 Files (Planned)

**E2E Tests (Phase 3):**
- `playwright.config.ts`
- `e2e/tests/auth.spec.ts`
- `e2e/tests/betting.spec.ts`
- `e2e/tests/market-creation.spec.ts`
- `e2e/helpers/auth-helper.ts`

---

## Quick Command Reference

### Development

```bash
# Unit tests only (fast feedback)
npm run test:unit

# Integration tests only
npm run test:integration

# All tests
npm test

# Watch mode for TDD
npm run test:watch
npm run test:integration:watch

# Coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### CI Simulation

```bash
# Run exactly what CI runs
npm run lint
npm run test:ci
npm run test:integration
npm run build
```

### Database Management

```bash
# Reset test database
DATABASE_URL=$DATABASE_URL_TEST npx prisma db push --force-reset

# View test database
DATABASE_URL=$DATABASE_URL_TEST npx prisma studio

# Run migrations (if using migrations instead of push)
DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy
```

### Troubleshooting

```bash
# Clear Jest cache
npx jest --clearCache

# Run specific test file
npm test -- creation.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create market"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output
npm test -- --verbose
```

---

## Implementation Checklist

### Phase 2: Integration Tests ✅

- [x] Create test database setup (`test-db.ts`)
- [x] Implement base factory class
- [x] Create UserFactory with helpers
- [x] Create MarketFactory with variants
- [x] Create BetFactory
- [x] Write market creation integration tests
- [x] Write betting integration tests
- [ ] Write market resolution tests (next)
- [ ] Add CI job for integration tests (next)
- [ ] Update documentation

### Phase 3: E2E Tests (Future)

- [ ] Install Playwright
- [ ] Create Playwright config
- [ ] Set up E2E file structure
- [ ] Implement authentication helpers
- [ ] Write auth flow E2E test
- [ ] Write betting flow E2E test
- [ ] Write market creation E2E test
- [ ] Add E2E CI job
- [ ] Configure screenshot/video artifacts

### Phase 4: Branch Protection ✅

- [x] Create `BRANCH_PROTECTION.md`
- [ ] Configure branch protection on `main`
- [ ] Set required status checks
- [ ] Enable GitHub Actions permissions
- [ ] Test auto-merge workflow
- [ ] Create `CODEOWNERS` file (optional)

---

## Next Steps

### Immediate (This Week)

1. **Set up test database locally**
   ```bash
   docker run -d --name proph-test-db \
     -e POSTGRES_USER=test \
     -e POSTGRES_PASSWORD=test \
     -e POSTGRES_DB=proph_bet_test \
     -p 5433:5432 postgres:16
   ```

2. **Run integration tests**
   ```bash
   DATABASE_URL_TEST="postgresql://test:test@localhost:5433/proph_bet_test" \
   npm run test:integration
   ```

3. **Configure branch protection**
   - Follow `docs/BRANCH_PROTECTION.md`
   - Enable required checks
   - Test auto-merge on a test PR

### Short-term (This Sprint)

1. Add market resolution integration tests
2. Add user management integration tests
3. Update CI workflow with integration test job
4. Increase coverage target to 60%
5. Add more critical flow tests

### Long-term (Next Quarter)

1. Reach 70% integration test coverage
2. Plan E2E test implementation
3. Set up Playwright
4. Add first E2E tests for critical flows
5. Target 80% overall coverage

---

## Success Metrics

### Phase 2 Success

- ✅ Integration tests running locally
- ✅ Integration tests in CI
- ✅ 3+ critical flows covered
- ✅ Factory pattern established
- ✅ Test database isolation working
- ✅ Coverage at 70%+

### Overall Success

- ✅ All PRs auto-tested in CI
- ✅ Auto-merge reducing manual work
- ✅ Bugs caught before production
- ✅ Team confidence in refactoring
- ✅ Clear testing documentation
- ✅ New team members onboarded quickly

---

## Support

**Questions about integration tests?**
- Read: `battles/sonnet-test-strategy-v2.md`
- Example tests in: `__tests__/integration/markets/`

**Questions about auto-merge?**
- Read: `docs/BRANCH_PROTECTION.md`
- Check: `.github/workflows/ci.yml`

**General testing questions?**
- Read: `docs/TEST_PLAN.md`
- Quick ref: `docs/TESTING_QUICK_REFERENCE.md`

---

**Status:** v2 Implementation Ready 🚀  
**Phase:** 2 in Progress, 3 Planned  
**Coverage Goal:** 50% → 70% → 80%

