# Cache Versioning Strategy

## Overview

Cache versioning prevents serving stale data after algorithm updates by automatically invalidating old cache entries when logic changes.

## How It Works

Each cache key includes a version number (e.g., `saju:v1:...`, `tarot:v2:...`). When you update calculation logic:

1. Increment the version in the cache key
2. Old cache entries (v1) are no longer accessible
3. New calculations use the new version (v2)
4. Old entries expire naturally via TTL

## Usage

### Option 1: Use CacheKeys (Recommended)

```typescript
import { CacheKeys, cacheOrCalculate, CACHE_TTL } from '@/lib/cache/redis-cache'

// Keys automatically include versions
const key = CacheKeys.saju(birthDate, birthTime, gender)
// Result: "saju:v1:1990-01-01:10:00:M"

const result = await cacheOrCalculate(
  key,
  async () => calculateSaju(birthDate, birthTime, gender),
  CACHE_TTL.SAJU_RESULT
)
```

### Option 2: Manual Version Management

```typescript
import { CACHE_VERSIONS, getCacheKey } from '@/lib/cache/cache-versions'

const key = getCacheKey(
  'compatibility',
  { person1Id, person2Id },
  CACHE_VERSIONS.COMPATIBILITY
)
```

## When to Increment Versions

Increment the version when:

- **Algorithm changes**: Formula or calculation logic updated
- **Data format changes**: Return structure modified
- **Bug fixes**: Cached results contain errors
- **External dependencies**: Updated API or library behavior

## Example: Updating Saju Calculation

```typescript
// Before (v1):
// CacheKeys.saju = (birthDate, birthTime, gender) =>
//   `saju:v1:${birthDate}:${birthTime}:${gender}`

// After fixing a bug in calculation:
export const CacheKeys = {
  saju: (birthDate: string, birthTime: string, gender: string) =>
    `saju:v2:${birthDate}:${birthTime}:${gender}`, // v2: Fixed 간지 계산 버그
}
```

## Version History

### src/lib/cache/redis-cache.ts

- `saju:v1` - Initial implementation
- `tarot:v1` - Initial implementation
- `destiny:v1` - Initial implementation
- `grade:v1` - Initial implementation
- `cal:v1` - Initial implementation
- `yearly:v2` - Removed date filtering
- `compat:v1` - Initial implementation

## Best Practices

1. **Document version changes**: Add comment explaining why version was incremented
2. **Coordinate deployments**: Version changes take effect immediately
3. **Monitor cache hit rates**: Version bump will temporarily reduce hit rate
4. **Use semantic versioning**: v1 → v2 for major changes
5. **Keep TTL reasonable**: Old entries expire naturally (1-7 days)

## Cache TTL Configuration

```typescript
export const CACHE_TTL = {
  SAJU_RESULT: 60 * 60 * 24 * 7, // 7 days (사주는 불변)
  TAROT_READING: 60 * 60 * 24, // 1 day (타로는 매일 변경)
  DESTINY_MAP: 60 * 60 * 24 * 3, // 3 days
  GRADING_RESULT: 60 * 60 * 24, // 1 day
  CALENDAR_DATA: 60 * 60 * 24, // 1 day
  COMPATIBILITY: 60 * 60 * 24 * 7, // 7 days
}
```

## Monitoring

Track cache performance in logs:

```typescript
logger.info('[Cache] Hit/Miss ratio', {
  key: key.split(':').slice(0, 2).join(':'), // e.g., "saju:v1"
  hit: cached !== null,
})
```

## Testing

Test cache versioning in integration tests:

```typescript
// tests/lib/cache/cache-versioning.test.ts
it('should not return v1 cache when using v2 key', async () => {
  await cacheSet('saju:v1:data', oldResult, 3600)

  const key = 'saju:v2:data' // Different version
  const result = await cacheGet(key)

  expect(result).toBeNull() // v2 key doesn't match v1 cache
})
```
