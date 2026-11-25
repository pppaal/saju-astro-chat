# Cache Versioning Strategy

Last synced with the code: 2026-11-25 (engine audit E15).

## Overview

Every cache key that stores an engine result carries a version. When a change alters what the
engine returns for the same input, the version goes up, the key changes, and the old entries are
never read again. They expire through their TTL.

Engine versions live in one dependency-free leaf module,
[`engineVersions.ts`](./engineVersions.ts). Bump them there, never by editing a key string by hand.

## Engine versions (`src/lib/cache/engineVersions.ts`)

| Constant                      | Key it versions                                                                       | Bump when                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `SAJU_ENGINE_VERSION`         | `saju:v{N}:…` (`CacheKeys.saju`, `/api/saju`)                                         | `calculateSajuData` output changes (pillars, 대운, strength, …). Defined in `src/lib/saju/constants.ts` |
| `CALENDAR_ENGINE_VERSION`     | calendar `birthKey` → `NatalContextCache`, `CalendarBuildCache`, `day:` focus entries | any extractor or deriver output changes (`'v11'` today; history in the file)                            |
| `NATAL_CHART_CACHE_VERSION`   | `natal:v{N}:…` (`CacheKeys.natalChart`)                                               | the natal chart for the same input changes                                                              |
| `TRANSIT_CHART_CACHE_VERSION` | `ephe:transit:v{N}:…` (`calendar-engine/ephe-cache.ts`)                               | the transit chart behind an ISO key changes (e.g. `isoToJD` instant rules)                              |
| `HELLENISTIC_CACHE_VERSION`   | `hellenistic:v{N}:…` (`destiny/astroFacts.ts`)                                        | lots, ZR, sect, almuten or other hellenistic output changes                                             |
| `ENGINE_VERSION_TAG`          | `counselor:ctx:stable` / `counselor:ctx:daily` (`destiny/counselorContextCache.ts`)   | never by hand: it is built from the five values above, e.g. `s4.cv11.n3.t3.h2`                          |

Rules:

- **One constant per cached computation.** A cache that bundles several engine results (the
  counselor context bakes saju, calendar, natal, transit and hellenistic facts) folds in
  `ENGINE_VERSION_TAG`, so a bump in any engine invalidates it too. The counselor key's own `v14`
  only versions the context _format_.
- **One bump per release.** Several unreleased engine changes can ride the same bump; the comment
  next to the constant records each one (see `CALENDAR_ENGINE_VERSION` v8).
- **Write the reason next to the bump.** Every value has a dated history comment.
- `dataRetention` deletes `NatalContextCache` rows whose `engineSignature` is not the current
  `CALENDAR_ENGINE_VERSION`.

Keys that vary by request state carry that state too: `/api/saju` adds `:tu` for time-unknown
requests, the calendar `birthKey` folds the time-unknown and city-unknown flags, and the in-process
saju LRU key includes the birthplace-local date of `now` (대운/세운 depend on it). `/api/saju`
re-selects `daeWoon.current` with `currentDaeun` on every request, because the cached value is the
one computed at cache time.

## Usage

```typescript
import { CacheKeys, cacheOrCalculate, CACHE_TTL } from '@/lib/cache/redis-cache'

// The key embeds SAJU_ENGINE_VERSION, e.g. "saju:v4:1990-01-01:10:00:M:solar:Asia/Seoul:N"
const key = CacheKeys.saju(birthDate, birthTime, gender, 'solar', timezone, false, longitude)

const result = await cacheOrCalculate(key, async () => compute(), CACHE_TTL.NATAL_CHART)
```

Non-engine keys (`tarot:v1`, `destiny:v1`, `grade:v1`, `cal:v1`, `dayCross:dd:v1`, `cal-ai:v1`, …)
keep a literal version in `CacheKeys`; bump that literal when their stored shape or meaning changes.

## When to bump

- **Algorithm changes:** a formula or rule changes the result for an existing input.
- **Data format changes:** the stored structure changes.
- **Bug fixes:** cached results contain the bug.
- **External inputs:** ephemeris files, the solar-term table or tzdata regenerate with different
  values.

Do not bump for refactors that keep the output byte-identical; the determinism digest
(`tests/lib/calendar-engine/buildCalendar.determinism.test.ts`) and the golden tests show whether
the output moved.

## TTLs

```typescript
export const CACHE_TTL = {
  TAROT_READING: 60 * 60 * 24, // 1 day (oracle)
  CALENDAR_DATA: 60 * 60 * 24, // 1 day (counselor realtime daily context, calendar route)
  NATAL_CHART: 60 * 60 * 24 * 30, // 30 days (counselor stable context, ephe-cache)
}
```

The process-local L1 layer in front of Redis caps every entry at 5 minutes, so a version bump
reaches every instance within that time even though L1 is not swept.

## Testing

`tests/lib/cache/redis-cache*.test.ts` pin the versioned key formats (for example
`saju:v${SAJU_ENGINE_VERSION}`), and `tests/lib/destiny/counselorContextCache.test.ts` checks that
the counselor keys carry `ENGINE_VERSION_TAG`.
