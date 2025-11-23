# Test Plan for proph.bet

## Overview

This document outlines the comprehensive testing strategy for the proph.bet application. Our testing approach ensures code quality, prevents regressions, and enables confident deployment through automated CI/CD pipelines.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [CI/CD Integration](#cicd-integration)
5. [Coverage Requirements](#coverage-requirements)
6. [Writing Tests](#writing-tests)
7. [Best Practices](#best-practices)

## Testing Strategy

Our testing strategy follows the testing pyramid approach:

```
    /\
   /  \    E2E Tests (Future)
  /----\   
 /      \  Integration Tests
/--------\ 
/          \ Unit Tests
------------
```

### Test Layers

1. **Unit Tests** (70% of tests)
   - Test individual functions, utilities, and schemas
   - Fast, isolated, and focused
   - No external dependencies

2. **Component Tests** (20% of tests)
   - Test React components in isolation
   - User interaction testing
   - Accessibility testing

3. **Integration Tests** (10% of tests)
   - Test server actions and API routes
   - Database interactions (mocked)
   - Authentication flows

4. **E2E Tests** (Future implementation)
   - Full user journeys
   - Cross-browser testing
   - Performance testing

## Test Types

### Unit Tests

Unit tests focus on individual functions and utilities without external dependencies.

**What to test:**
- Utility functions (`lib/utils.ts`)
- Schema validations (`lib/schemas.ts`)
- Pure helper functions
- Data transformations
- Business logic calculations

**Example locations:**
- `__tests__/lib/utils.test.ts`
- `__tests__/lib/schemas.test.ts`

### Component Tests

Component tests verify React components render correctly and handle user interactions.

**What to test:**
- UI components render correctly
- User interactions (clicks, inputs, form submissions)
- Props are handled correctly
- Conditional rendering
- Accessibility attributes

**Example locations:**
- `__tests__/components/ui/button.test.tsx`
- `__tests__/components/ui/badge.test.tsx`

### Integration Tests

Integration tests verify server actions, API routes, and multi-layer interactions.

**What to test:**
- Server actions return correct results
- Authentication and authorization
- Database operations (mocked)
- Error handling
- Data validation flows

**Example locations:**
- `__tests__/app/actions/user.test.ts`
- `__tests__/app/api/auth.test.ts` (future)

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- __tests__/lib/utils.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="Button Component"
```

### Test Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ci` | Run tests in CI mode (no watch, with coverage) |

### Coverage Reports

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in your browser to see a detailed coverage report.

## CI/CD Integration

### GitHub Actions Workflows

We have two main CI workflows:

#### 1. Main CI Workflow (`.github/workflows/ci.yml`)

Runs on every pull request and push to `main`/`develop`:

- **Linting**: Ensures code style consistency
- **Translation Validation**: Checks translation files are valid
- **Tests**: Runs full test suite with coverage
- **Build Check**: Ensures the application builds successfully
- **Auto-merge**: Automatically merges PRs with `auto-merge` label when all checks pass

#### 2. Dependabot Auto-Merge (`.github/workflows/dependabot-auto-merge.yml`)

Automatically approves and merges Dependabot PRs for:
- Patch version updates
- Minor version updates

### Auto-Merge Configuration

PRs will automatically merge when:

1. All CI checks pass
2. One of the following is true:
   - PR is from Dependabot (patch/minor updates)
   - PR has the `auto-merge` label

To enable auto-merge for your PR:
```bash
gh pr edit <PR_NUMBER> --add-label "auto-merge"
```

## Coverage Requirements

We maintain minimum coverage thresholds to ensure code quality:

| Metric | Threshold |
|--------|-----------|
| Branches | 50% |
| Functions | 50% |
| Lines | 50% |
| Statements | 50% |

These thresholds will increase as the test suite matures.

### Coverage Exceptions

The following are excluded from coverage:
- Type definitions (`*.d.ts`)
- Configuration files
- Node modules
- Build artifacts (`.next/`)
- Test files themselves

## Writing Tests

### Test File Structure

```typescript
import { functionToTest } from '@/lib/utils'

describe('Feature or Component Name', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset state before each test
  })

  afterEach(() => {
    // Clean up after each test
  })

  describe('specific function or behavior', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = functionToTest(input)
      
      // Assert
      expect(result).toBe('expected output')
    })

    it('should handle edge cases', () => {
      // Test edge cases
    })

    it('should handle errors gracefully', () => {
      // Test error handling
    })
  })
})
```

### Component Test Template

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<MyComponent onClick={handleClick} />)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Server Action Test Template

```typescript
import { myServerAction } from '@/app/actions/my-action'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

jest.mock('@/lib/auth')
jest.mock('@/lib/prisma')

const mockAuth = auth as jest.MockedFunction<typeof auth>

describe('myServerAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should require authentication', async () => {
    mockAuth.mockResolvedValue(null)
    
    const result = await myServerAction()
    
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('should perform action successfully', async () => {
    mockAuth.mockResolvedValue({ user: { id: '123' } } as any)
    
    const result = await myServerAction()
    
    expect(result.success).toBe(true)
  })
})
```

## Best Practices

### General Testing Principles

1. **AAA Pattern**: Follow Arrange-Act-Assert pattern
2. **One Assertion Focus**: Each test should focus on one behavior
3. **Descriptive Names**: Test names should describe what they test
4. **Independent Tests**: Tests should not depend on each other
5. **Fast Tests**: Keep tests fast by mocking external dependencies

### Do's

✅ **Do** test user-facing behavior, not implementation details  
✅ **Do** mock external dependencies (APIs, databases)  
✅ **Do** test error cases and edge cases  
✅ **Do** use semantic queries (`getByRole`, `getByLabelText`)  
✅ **Do** test accessibility features  
✅ **Do** keep tests focused and simple  
✅ **Do** write tests for bug fixes to prevent regressions  

### Don'ts

❌ **Don't** test third-party libraries  
❌ **Don't** test implementation details (internal state)  
❌ **Don't** write tests that depend on other tests  
❌ **Don't** use `setTimeout` or delays (use `waitFor` instead)  
❌ **Don't** test CSS styles (use visual regression tools instead)  
❌ **Don't** commit tests that are flaky or intermittently fail  

### Test Organization

```
__tests__/
├── app/
│   ├── actions/
│   │   ├── user.test.ts
│   │   └── market.test.ts
│   └── api/
│       └── auth.test.ts
├── components/
│   ├── ui/
│   │   ├── button.test.tsx
│   │   └── badge.test.tsx
│   └── market/
│       └── BetForm.test.tsx
└── lib/
    ├── utils.test.ts
    └── schemas.test.ts
```

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test suites: Use `describe('ComponentName', () => {})`
- Test cases: Use `it('should do something', () => {})`
- Setup: Use `beforeEach`, `afterEach`, `beforeAll`, `afterAll`

### Mocking Strategy

1. **Mock at the module boundary**
   ```typescript
   jest.mock('@/lib/prisma')
   ```

2. **Mock API responses**
   ```typescript
   jest.mock('next-auth/react')
   ```

3. **Mock environment variables**
   ```typescript
   process.env.VARIABLE_NAME = 'test-value'
   ```

4. **Reset mocks between tests**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks()
   })
   ```

### Accessibility Testing

Always test for accessibility:

```typescript
it('should be accessible', () => {
  render(<Button>Click me</Button>)
  
  const button = screen.getByRole('button', { name: /click me/i })
  expect(button).toBeInTheDocument()
  expect(button).toHaveAttribute('aria-label')
})
```

## Test Coverage Goals

### Phase 1 (Current) - Foundation
- ✅ Testing infrastructure set up
- ✅ Example tests for utils, components, and actions
- ✅ CI/CD pipeline with auto-merge
- Target: 50% coverage

### Phase 2 - Expansion
- Add tests for all server actions
- Add tests for all reusable components
- Add API route tests
- Target: 70% coverage

### Phase 3 - Comprehensive
- Add E2E tests with Playwright
- Add visual regression testing
- Add performance testing
- Target: 80% coverage

## Continuous Improvement

Testing is an ongoing process. We continuously:

1. **Review Coverage**: Check coverage reports in PRs
2. **Add Tests**: Write tests for new features
3. **Fix Flaky Tests**: Eliminate unreliable tests
4. **Update Documentation**: Keep this document current
5. **Share Knowledge**: Conduct testing workshops

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Tools
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom Jest matchers

### Getting Help

- Check existing tests for examples
- Review this documentation
- Ask in team discussions
- Pair program on complex tests

## Conclusion

This test plan establishes a solid foundation for maintaining code quality in the proph.bet application. By following these guidelines and continuously improving our test coverage, we ensure a reliable, maintainable codebase that can evolve with confidence.

Remember: **Good tests are an investment in the future of the codebase.**

