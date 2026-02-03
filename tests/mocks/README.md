# Test Mocks Library

Centralized mock utilities to eliminate code duplication across test files.

## Problem

Before this library, each test file had to duplicate 20-30 lines of `vi.mock()` calls:

```typescript
// ❌ BEFORE: Duplicated in every test file (130+ lines)
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('stripe', () => ({ default: vi.fn().mockImplementation(...) }))
vi.mock('@/lib/Saju/saju', () => ({ calculateSajuData: vi.fn() }))
vi.mock('@/lib/Saju/unse', () => ({ getDaeunCycles: vi.fn() }))
// ... 20+ more mocks
```

## Solution

Import centralized mocks instead:

```typescript
// ✅ AFTER: Import once (4 lines)
import { mockNextAuth, mockStripe, mockPrisma, mockSajuLibraries } from '@/tests/mocks'

describe('My Test', () => {
  beforeEach(() => {
    mockNextAuth()
    mockStripe()
    mockPrisma()
    mockSajuLibraries()
  })

  // tests...
})
```

**Result:** 130 lines → 8 lines (94% reduction)

## Available Mocks

### Authentication (`auth.ts`)

```typescript
import { mockNextAuth, mockUnauthenticated, mockPremiumUser } from '@/tests/mocks'

// Default: authenticated free tier user
mockNextAuth()

// Custom session data
mockNextAuth({
  user: { name: 'Custom User', email: 'custom@example.com', id: 'custom-id' },
})

// Unauthenticated
mockUnauthenticated()

// Premium user
mockPremiumUser()
```

### Payment (`stripe.ts`)

```typescript
import { mockStripe, mockStripeFreeTier, mockStripePremium } from '@/tests/mocks'

// Default: no subscriptions (free tier)
mockStripe()

// Explicitly free tier
mockStripeFreeTier()

// Active premium subscription
mockStripePremium('user@example.com')

// Custom subscriptions
mockStripe({
  customers: [{ id: 'cus_123', email: 'test@example.com' }],
  subscriptions: [{ id: 'sub_123', customer: 'cus_123', status: 'active', items: {...} }]
})
```

### Database (`database.ts`)

```typescript
import { mockPrisma, mockPrismaWithData } from '@/tests/mocks'

// Default: empty responses
mockPrisma()

// Custom data
mockPrismaWithData('reading', { id: '123', userId: 'user-123', data: {...} })

// Multiple records
mockPrismaWithData('reading', [
  { id: '1', userId: 'user-1' },
  { id: '2', userId: 'user-2' }
])
```

### Saju Libraries (`saju.ts`)

```typescript
import { mockSajuLibraries, mockSajuCore } from '@/tests/mocks'

// Mock all Saju modules (11+ modules)
mockSajuLibraries()

// Mock only core calculation
mockSajuCore()
```

## Migration Guide

### Step 1: Identify Mock Blocks

Find all `vi.mock()` calls at the top of your test file:

```typescript
// Lines 18-150 in route.mega.test.ts
vi.mock('next-auth', () => ({...}))
vi.mock('stripe', () => ({...}))
vi.mock('@/lib/db/prisma', () => ({...}))
// ... 20+ more
```

### Step 2: Replace with Centralized Mocks

```typescript
import { mockNextAuth, mockStripe, mockPrisma, mockSajuLibraries } from '@/tests/mocks'

describe('My Test Suite', () => {
  beforeEach(() => {
    mockNextAuth()
    mockStripe()
    mockPrisma()
    mockSajuLibraries()
  })

  // Your tests
})
```

### Step 3: Keep Specific Mocks

If your test needs specific mocks not yet centralized, keep them:

```typescript
import { mockNextAuth, mockStripe } from '@/tests/mocks'

// Centralized mocks
// ...

// Test-specific mocks (not yet centralized)
vi.mock('@/lib/mySpecificModule', () => ({
  myFunction: vi.fn(),
}))
```

## Examples

See complete refactoring example:

- **Before:** `tests/app/api/saju/route.mega.test.ts` (1,290 lines, 130 lines of mocks)
- **After:** `tests/app/api/saju/route.mega.REFACTORED_EXAMPLE.test.ts` (~20 lines of mocks)

## Benefits

| Metric               | Before                    | After            | Improvement       |
| -------------------- | ------------------------- | ---------------- | ----------------- |
| **Mock setup lines** | 130                       | 8                | 94% reduction     |
| **Code duplication** | 25 files × 130 lines      | 1 library        | 3,250 → 500 lines |
| **Maintainability**  | Update 25 files           | Update 1 file    | 25× easier        |
| **Test readability** | Hard to find actual tests | Clear test logic | Much better       |

## Contributing

To add new centralized mocks:

1. Create a new file in `tests/mocks/` (e.g., `astrology.ts`)
2. Export mock functions with clear names
3. Add to `tests/mocks/index.ts`
4. Update this README with usage examples

## See Also

- [Vitest Mocking Documentation](https://vitest.dev/guide/mocking.html)
- Example refactored test: `route.mega.REFACTORED_EXAMPLE.test.ts`
