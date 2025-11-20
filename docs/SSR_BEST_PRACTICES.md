# SSR Best Practices

## Overview

This document outlines best practices for avoiding Server-Side Rendering (SSR) errors in the production environment. The most common error is:

```
An error occurred in the Server Components render
```

This typically happens when client-side code tries to access browser APIs or measure DOM elements during SSR.

## Common Causes

### 1. Recharts and Chart Libraries

Recharts' `ResponsiveContainer` attempts to measure parent element dimensions, which is impossible on the server.

**Problem:**
```tsx
// ❌ This will cause SSR errors
export function MyChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>...</LineChart>
    </ResponsiveContainer>
  )
}
```

**Solution:**
```tsx
// ✅ Use ClientOnly wrapper
import { ClientOnly } from '@/components/ui/client-only'

export function MyChart() {
  return (
    <ClientOnly fallback={<div>Loading chart...</div>}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>...</LineChart>
      </ResponsiveContainer>
    </ClientOnly>
  )
}
```

### 2. Browser API Access

Direct access to `window`, `document`, or `navigator` during render.

**Problem:**
```tsx
// ❌ This will fail during SSR
export function MyComponent() {
  const url = window.location.href // Error: window is not defined
  return <div>{url}</div>
}
```

**Solutions:**

#### Option A: Use useEffect
```tsx
// ✅ Access browser APIs in useEffect
"use client"

export function MyComponent() {
  const [url, setUrl] = useState('')
  
  useEffect(() => {
    setUrl(window.location.href)
  }, [])
  
  return <div>{url || 'Loading...'}</div>
}
```

#### Option B: Use in Event Handlers
```tsx
// ✅ Access in event handlers (they only run on client)
"use client"

export function ShareButton() {
  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
  }
  
  return <button onClick={handleShare}>Share</button>
}
```

#### Option C: Use useIsMounted Hook
```tsx
// ✅ Conditionally render based on mount state
"use client"

import { useIsMounted } from '@/lib/hooks/use-is-mounted'

export function MyComponent() {
  const isMounted = useIsMounted()
  
  if (!isMounted) {
    return <div>Loading...</div>
  }
  
  const url = window.location.href
  return <div>{url}</div>
}
```

### 3. Third-Party Libraries

Some libraries aren't SSR-compatible and need client-only rendering.

**Solution:**
```tsx
import { ClientOnly } from '@/components/ui/client-only'
import SomeClientOnlyLibrary from 'some-library'

export function MyComponent() {
  return (
    <ClientOnly>
      <SomeClientOnlyLibrary />
    </ClientOnly>
  )
}
```

## Utilities

### `useIsMounted()` Hook

Located at: `lib/hooks/use-is-mounted.ts`

Returns `true` after the component has mounted on the client.

**When to use:**
- You need fine-grained control over rendering
- You want to conditionally access browser APIs
- You're working with libraries that measure DOM elements

**Example:**
```tsx
"use client"

import { useIsMounted } from '@/lib/hooks/use-is-mounted'

export function MyComponent() {
  const isMounted = useIsMounted()
  
  return (
    <div>
      {isMounted ? (
        <ResponsiveContainer>...</ResponsiveContainer>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  )
}
```

### `<ClientOnly>` Component

Located at: `components/ui/client-only.tsx`

Wrapper component that only renders children on the client.

**When to use:**
- You have a complete component/section that should only render client-side
- You want a clean, declarative API
- You don't need conditional logic based on mount state

**Example:**
```tsx
import { ClientOnly } from '@/components/ui/client-only'

export function MyComponent() {
  return (
    <ClientOnly fallback={<LoadingSpinner />}>
      <SomeClientOnlyComponent />
    </ClientOnly>
  )
}
```

## Checklist for New Components

When creating or modifying components, ask:

1. **Does it use Recharts or similar charting libraries?**
   - ✅ Wrap in `<ClientOnly>` or use `useIsMounted()`

2. **Does it access `window`, `document`, or `navigator`?**
   - ✅ Move to `useEffect` or event handlers, OR use `useIsMounted()`

3. **Does it measure or manipulate DOM elements?**
   - ✅ Ensure it runs only on the client (useEffect, ClientOnly, or useIsMounted)

4. **Is it marked `"use client"` at the top?**
   - ✅ Required for all components using hooks or browser APIs

5. **Does it import third-party libraries you're unsure about?**
   - ✅ Test in production or wrap in `<ClientOnly>` to be safe

## Testing for SSR Issues

### Local Testing

SSR issues often don't appear in development. To test:

1. **Build and run production mode:**
   ```bash
   npm run build
   npm run start
   ```

2. **Check browser console** for hydration errors

3. **Test the specific pages** where you made changes

### In Production

Monitor for:
- "Server Components render" errors
- Hydration mismatches
- Components not rendering

## Current Usage in Codebase

### Fixed Components

1. **`components/market/BetForm.tsx`**
   - Uses `useIsMounted()` for numeric range histogram (Recharts BarChart)
   - Lines 74-78, 277-308

2. **`components/market/PriceChart.tsx`**
   - Uses `useIsMounted()` for price history chart (Recharts LineChart)
   - Lines 17-21, 43-99

### Safe Patterns (No Changes Needed)

1. **`components/market/ShareMarketButton.tsx`**
   - Uses `window`/`navigator` only in event handlers ✅

2. **`components/arenas/members/invite-link-generator.tsx`**
   - Uses `window.location.origin` in `useEffect` ✅
   - Uses `navigator.clipboard` in event handlers ✅

3. **`components/layout/CommandPalette.tsx`**
   - Uses `document.addEventListener` in `useEffect` ✅

4. **`app/[locale]/arenas/[arenaId]/settings/arena-details-form.tsx`**
   - Uses `document.getElementById` in event handler ✅

## When in Doubt

If you're unsure whether something will cause SSR issues:

1. **Wrap it in `<ClientOnly>`** - this is the safest option
2. **Test in production build** - many SSR issues only appear there
3. **Check the error logs** - Vercel/production logs will show SSR errors
4. **Ask the team** - share your concerns before deploying

## Additional Resources

- [Next.js: Rendering](https://nextjs.org/docs/app/building-your-application/rendering)
- [React: useEffect Hook](https://react.dev/reference/react/useEffect)
- [Recharts SSR Issues](https://github.com/recharts/recharts/issues/2629)

