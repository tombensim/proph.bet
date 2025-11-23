# Testing Quick Reference

A quick cheat sheet for writing tests in the proph.bet codebase.

## Quick Start

```bash
# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- __tests__/lib/utils.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="Button"

# Get coverage report
npm run test:coverage
```

## Test Template Snippets

### Unit Test Template

```typescript
import { myFunction } from '@/lib/utils'

describe('myFunction', () => {
  it('should return expected output', () => {
    expect(myFunction('input')).toBe('output')
  })

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('')
    expect(myFunction(null)).toBeNull()
  })
})
```

### Component Test Template

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle click', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()
    
    render(<MyComponent onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    
    expect(onClick).toHaveBeenCalled()
  })
})
```

### Server Action Test Template

```typescript
import { myAction } from '@/app/actions/my-action'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

jest.mock('@/lib/auth')
jest.mock('@/lib/prisma')

describe('myAction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should require auth', async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)
    
    const result = await myAction()
    
    expect(result).toEqual({ error: 'Unauthorized' })
  })
})
```

## Common Queries

### Finding Elements

```typescript
// By role (preferred)
screen.getByRole('button', { name: /submit/i })
screen.getByRole('textbox', { name: /email/i })
screen.getByRole('heading', { level: 1 })

// By label
screen.getByLabelText(/email address/i)

// By placeholder
screen.getByPlaceholderText(/enter email/i)

// By text
screen.getByText(/hello world/i)

// By test ID (last resort)
screen.getByTestId('custom-element')
```

### Async Queries

```typescript
// Wait for element to appear
const element = await screen.findByRole('button')

// Wait for element to disappear
await waitFor(() => {
  expect(screen.queryByText('Loading')).not.toBeInTheDocument()
})

// Wait with custom timeout
await screen.findByRole('button', {}, { timeout: 3000 })
```

## Common Assertions

```typescript
// Existence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// Visibility
expect(element).toBeVisible()
expect(element).not.toBeVisible()

// Attributes
expect(element).toHaveAttribute('href', '/path')
expect(element).toHaveClass('active')

// Text content
expect(element).toHaveTextContent('Hello')
expect(element).toHaveValue('input value')

// Disabled/Enabled
expect(element).toBeDisabled()
expect(element).toBeEnabled()

// Focus
expect(element).toHaveFocus()

// Checked (for checkboxes/radios)
expect(element).toBeChecked()
```

## User Interactions

```typescript
const user = userEvent.setup()

// Click
await user.click(element)
await user.dblClick(element)

// Type
await user.type(input, 'Hello World')
await user.clear(input)

// Keyboard
await user.keyboard('{Enter}')
await user.keyboard('{Escape}')

// Select
await user.selectOptions(select, 'option1')

// Hover
await user.hover(element)
await user.unhover(element)

// Upload file
const file = new File(['content'], 'test.png', { type: 'image/png' })
await user.upload(input, file)
```

## Mocking

### Mock Functions

```typescript
const mockFn = jest.fn()
mockFn.mockReturnValue('value')
mockFn.mockResolvedValue('async value')
mockFn.mockRejectedValue(new Error('error'))

expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledTimes(2)
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
```

### Mock Modules

```typescript
// Mock entire module
jest.mock('@/lib/prisma')

// Mock with return value
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => ({ user: { id: '123' } }))
}))

// Mock specific function
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  specificFunction: jest.fn()
}))
```

### Reset Mocks

```typescript
beforeEach(() => {
  jest.clearAllMocks() // Clear call history
  jest.resetAllMocks() // Clear call history + reset implementation
  jest.restoreAllMocks() // Restore original implementation
})
```

## Test Organization

```typescript
describe('Feature', () => {
  // Runs before all tests in this describe block
  beforeAll(() => {
    // Setup that runs once
  })

  // Runs after all tests in this describe block
  afterAll(() => {
    // Cleanup that runs once
  })

  // Runs before each test
  beforeEach(() => {
    // Setup for each test
  })

  // Runs after each test
  afterEach(() => {
    // Cleanup after each test
  })

  describe('Sub-feature', () => {
    it('should do something', () => {
      // Test
    })

    it.skip('should be skipped', () => {
      // Temporarily disabled test
    })

    it.only('should run only this test', () => {
      // Run only this test (for debugging)
    })
  })
})
```

## Debug Tips

```typescript
// Print DOM
screen.debug()

// Print specific element
screen.debug(element)

// Get prettier output with limited depth
screen.debug(element, 10000)

// See all available queries
screen.logTestingPlaygroundURL()

// Check what's rendered
console.log(container.innerHTML)
```

## Coverage Commands

```bash
# Open coverage report in browser
open coverage/lcov-report/index.html

# Check coverage for specific file
npm test -- --coverage --collectCoverageFrom="lib/utils.ts"

# See uncovered lines
npm run test:coverage -- --verbose
```

## Common Issues

### Issue: Element not found

**Solution:** Use async queries

```typescript
// ❌ Don't
expect(screen.getByText('Loading')).toBeInTheDocument()

// ✅ Do
expect(await screen.findByText('Loading')).toBeInTheDocument()
```

### Issue: Act warnings

**Solution:** Use `await` and `userEvent`

```typescript
// ❌ Don't
fireEvent.click(button)

// ✅ Do
const user = userEvent.setup()
await user.click(button)
```

### Issue: State updates not wrapped in act()

**Solution:** Use `waitFor`

```typescript
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument()
})
```

## Best Practices Checklist

- [ ] Test user behavior, not implementation
- [ ] Use semantic queries (`getByRole`, `getByLabelText`)
- [ ] Mock at module boundaries
- [ ] Clean up mocks between tests
- [ ] Use async utilities for async operations
- [ ] Write descriptive test names
- [ ] Keep tests focused and simple
- [ ] Test error cases and edge cases
- [ ] Maintain at least 50% code coverage

## Resources

- [Testing Library Docs](https://testing-library.com/)
- [Jest Docs](https://jestjs.io/)
- [User Event Docs](https://testing-library.com/docs/user-event/intro)
- [Full Test Plan](./TEST_PLAN.md)

