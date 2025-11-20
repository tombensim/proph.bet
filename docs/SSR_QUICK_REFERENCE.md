# SSR Quick Reference Guide

## TL;DR

**Getting "Server Components render" errors?** → Use one of these patterns:

## Pattern 1: useIsMounted Hook (Recommended for Charts)

```tsx
"use client"

import { useIsMounted } from '@/lib/hooks/use-is-mounted'
import { ResponsiveContainer, LineChart } from 'recharts'

export function MyChart() {
  const isMounted = useIsMounted()
  
  return (
    <div className="h-[300px]">
      {isMounted ? (
        <ResponsiveContainer>
          <LineChart data={data}>...</LineChart>
        </ResponsiveContainer>
      ) : (
        <div>Loading chart...</div>
      )}
    </div>
  )
}
```

## Pattern 2: ClientOnly Wrapper (Recommended for Sections)

```tsx
"use client"

import { ClientOnly } from '@/components/ui/client-only'
import { ResponsiveContainer, LineChart } from 'recharts'

export function MyChart() {
  return (
    <ClientOnly fallback={<div>Loading chart...</div>}>
      <ResponsiveContainer>
        <LineChart data={data}>...</LineChart>
      </ResponsiveContainer>
    </ClientOnly>
  )
}
```

## Pattern 3: useEffect (For Browser APIs)

```tsx
"use client"

import { useEffect, useState } from 'react'

export function MyComponent() {
  const [url, setUrl] = useState('')
  
  useEffect(() => {
    // Safe: Browser APIs in useEffect
    setUrl(window.location.href)
  }, [])
  
  return <div>{url}</div>
}
```

## Pattern 4: Event Handlers (Already Safe!)

```tsx
"use client"

export function ShareButton() {
  const handleClick = () => {
    // Safe: Browser APIs in event handlers
    navigator.clipboard.writeText(window.location.href)
  }
  
  return <button onClick={handleClick}>Share</button>
}
```

## Common Issues

| Issue | Solution |
|-------|----------|
| `window is not defined` | Use Pattern 3 or 4 |
| `document is not defined` | Use Pattern 3 or 4 |
| `navigator is not defined` | Use Pattern 3 or 4 |
| Recharts not rendering | Use Pattern 1 or 2 |
| Chart measures wrong size | Use Pattern 1 or 2 |
| Hydration mismatch | Use Pattern 1, 2, or 3 |

## Quick Decision Tree

```
Is it Recharts/charts?
├─ Yes → Use Pattern 1 or 2
└─ No → Does it access window/document/navigator?
    ├─ Yes → Is it in event handler?
    │   ├─ Yes → Already safe! ✅
    │   └─ No → Use Pattern 3
    └─ No → Probably safe ✅
```

## Testing

```bash
# Always test in production mode before deploying!
npm run build
npm run start
```

## Need More Info?

- Detailed guide: [`docs/SSR_BEST_PRACTICES.md`](./SSR_BEST_PRACTICES.md)
- Full analysis: [`docs/SSR_ANALYSIS_AND_FIX.md`](./SSR_ANALYSIS_AND_FIX.md)

