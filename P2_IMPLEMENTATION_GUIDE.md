# 🔧 P2 구현 가이드 - 단계별 실행 매뉴얼

**작성 날짜**: 2026-01-29
**대상**: 개발자 또는 AI 어시스턴트
**목표**: P2 작업 완전 자동화

---

## 📋 목차

1. [Phase 1.2: 고위험 API 보호 (4h)](#phase-12)
2. [Phase 2: Cache Stampede 방지 (12h)](#phase-2)
3. [Phase 3: 전체 Rate Limiting (48h)](#phase-3)
4. [검증 및 테스트](#verification)

---

<a name="phase-12"></a>

## Phase 1.2: 고위험 API 보호 (4시간)

### 대상 파일 목록

```bash
# Destiny Match APIs (가장 위험!)
src/app/api/destiny-match/discover/route.ts
src/app/api/destiny-match/matches/route.ts
src/app/api/destiny-match/profile/route.ts
src/app/api/destiny-match/chat/route.ts

# Counselor APIs
src/app/api/counselor/chat-history/route.ts
src/app/api/counselor/session/list/route.ts
src/app/api/counselor/session/load/route.ts
src/app/api/counselor/session/save/route.ts

# Other high-risk
src/app/api/daily-fortune/route.ts
src/app/api/content-access/route.ts
src/app/api/consultation/route.ts
```

### 템플릿 1: GET 핸들러 (인증 필요)

**Before**:

```typescript
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // ... 비즈니스 로직 ...

    return NextResponse.json({ data: result })
  } catch (error) {
    logger.error('[API Error]:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**After**:

```typescript
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    // userId는 이미 검증됨
    const userId = context.userId!

    // ... 비즈니스 로직 (동일) ...

    return { data: result }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/discover',
    limit: 60, // 60 req/min
    windowSeconds: 60,
  })
)
```

### 템플릿 2: POST 핸들러 (인증 필요)

**Before**:

```typescript
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const userId = session.user.id

    // ... 비즈니스 로직 ...

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    logger.error('[API Error]:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**After**:

```typescript
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  parseJsonBody,
  type ApiContext,
} from '@/lib/api/middleware'

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!
    const body = await parseJsonBody(req)

    // ... 비즈니스 로직 (동일) ...

    return { data: result }
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/save',
    limit: 30, // 작성은 더 제한적으로
    windowSeconds: 60,
  })
)
```

### 템플릿 3: 공개 API (인증 불필요)

**Before**:

```typescript
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const date = searchParams.get('date')

    // ... 비즈니스 로직 ...

    return NextResponse.json({ data: result })
  } catch (error) {
    logger.error('[API Error]:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**After**:

```typescript
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const searchParams = req.nextUrl.searchParams
    const date = searchParams.get('date')

    // ... 비즈니스 로직 (동일) ...

    return { data: result }
  },
  createSimpleGuard({
    route: '/api/daily-fortune',
    limit: 100, // 공개 API는 좀 더 여유롭게
    windowSeconds: 60,
  })
)
```

### 수동 적용 절차

각 파일마다:

1. **Import 추가**

   ```typescript
   import {
     withApiMiddleware,
     createAuthenticatedGuard,
     type ApiContext,
   } from '@/lib/api/middleware'
   ```

2. **불필요한 Import 제거**

   ```typescript
   // ❌ 제거
   import { getServerSession } from 'next-auth'
   import { authOptions } from '@/lib/auth/authOptions'
   ```

3. **함수 시그니처 변경**

   ```typescript
   // Before
   export async function GET(req: NextRequest) {

   // After
   export const GET = withApiMiddleware(
     async (req: NextRequest, context: ApiContext) => {
   ```

4. **인증 코드 제거**

   ```typescript
   // ❌ 제거 (middleware가 처리)
   const session = await getServerSession(authOptions)
   if (!session?.user?.id) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   const userId = session.user.id

   // ✅ 변경
   const userId = context.userId!
   ```

5. **응답 형식 변경**

   ```typescript
   // Before
   return NextResponse.json({ data: result })

   // After
   return { data: result }
   ```

6. **에러 핸들링 제거** (middleware가 처리)

   ```typescript
   // ❌ try-catch 제거 (middleware가 처리)
   ```

7. **Guard 설정 추가** (함수 끝)
   ```typescript
   },
   createAuthenticatedGuard({
     route: '/api/...',
     limit: 60,
     windowSeconds: 60,
   })
   );
   ```

### Rate Limit 값 권장사항

| API 유형           | Limit   | 이유           |
| ------------------ | ------- | -------------- |
| **매칭 발견**      | 60/min  | 잦은 탐색 허용 |
| **프로필 조회**    | 100/min | 가벼운 조회    |
| **프로필 수정**    | 20/min  | 남용 방지      |
| **채팅 메시지**    | 100/min | 실시간 채팅    |
| **상담 세션 저장** | 30/min  | AI 비용 절감   |
| **상담 기록 조회** | 100/min | 가벼운 조회    |

---

<a name="phase-2"></a>

## Phase 2: Cache Stampede 방지 (12시간)

### 1. Redlock 설치 (30분)

```bash
npm install redlock
npm install --save-dev @types/redlock
```

### 2. Cache Manager 생성 (2시간)

**`src/lib/cache/cache-manager.ts`** (새 파일 생성):

```typescript
/**
 * Cache Manager with Stampede Prevention
 * Redlock 분산 락을 사용하여 캐시 스탬피드 방지
 */

import Redlock from 'redlock'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { recordCounter } from '@/lib/metrics'

// Redlock 인스턴스 (싱글톤)
const redlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 200,
})

export interface CacheOptions {
  /** TTL in seconds */
  ttl?: number
  /** Lock timeout in ms (default: 5000) */
  lockTimeout?: number
  /** Retry delay when lock acquisition fails (default: 100ms) */
  retryDelay?: number
}

/**
 * Get cached value or compute with stampede prevention
 *
 * @example
 * const stats = await getCachedOrCompute(
 *   'stats:global',
 *   async () => await calculateStats(),
 *   { ttl: 3600 }
 * );
 */
export async function getCachedOrCompute<T>(
  key: string,
  computeFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 3600, lockTimeout = 5000, retryDelay = 100 } = options

  // 1. 캐시 확인
  try {
    const cached = await redis.get(key)
    if (cached) {
      recordCounter('cache.hit', 1, { key })
      try {
        return JSON.parse(cached) as T
      } catch {
        logger.warn(`[Cache] Failed to parse cached value for key: ${key}`)
        // 파싱 실패 시 재계산
      }
    }
  } catch (error) {
    logger.warn(`[Cache] Redis get failed for key: ${key}`, { error })
    // Redis 실패 시 직접 계산
  }

  recordCounter('cache.miss', 1, { key })

  // 2. 락 획득 시도
  const lockKey = `lock:${key}`
  let lock

  try {
    lock = await redlock.acquire([lockKey], lockTimeout)
    recordCounter('cache.lock.acquired', 1, { key })
  } catch (error) {
    // 락 획득 실패 (다른 프로세스가 이미 처리 중)
    recordCounter('cache.lock.failed', 1, { key })
    logger.debug(`[Cache] Lock acquisition failed for ${key}, waiting...`)

    // 짧은 대기 후 캐시 재확인
    await new Promise((resolve) => setTimeout(resolve, retryDelay))

    try {
      const recheck = await redis.get(key)
      if (recheck) {
        try {
          return JSON.parse(recheck) as T
        } catch {
          // 파싱 실패
        }
      }
    } catch {
      // Redis 실패
    }

    // 락 획득 실패했지만 캐시도 없으면 직접 계산 (fallback)
    logger.warn(`[Cache] Lock failed and cache empty for ${key}, computing anyway`)
    recordCounter('cache.stampede', 1, { key })
    const result = await computeFn()
    return result
  }

  try {
    // 재확인 (다른 프로세스가 이미 계산했을 수 있음)
    try {
      const recheck = await redis.get(key)
      if (recheck) {
        try {
          const parsed = JSON.parse(recheck) as T
          recordCounter('cache.double_check_hit', 1, { key })
          return parsed
        } catch {
          // 파싱 실패 시 재계산
        }
      }
    } catch {
      // Redis 실패 시 재계산
    }

    // 3. 계산 및 저장
    logger.info(`[Cache] Computing value for key: ${key}`)
    recordCounter('cache.compute', 1, { key })

    const startTime = Date.now()
    const result = await computeFn()
    const computeTime = Date.now() - startTime

    logger.info(`[Cache] Computed value for key: ${key}`, { computeTime })

    // Redis 저장 시도
    try {
      await redis.setex(key, ttl, JSON.stringify(result))
      recordCounter('cache.set', 1, { key })
    } catch (error) {
      logger.error(`[Cache] Failed to set cache for key: ${key}`, { error })
      recordCounter('cache.set_failed', 1, { key })
      // 저장 실패해도 결과는 반환
    }

    return result
  } finally {
    // 락 해제
    try {
      await lock.release()
      recordCounter('cache.lock.released', 1, { key })
    } catch (error) {
      logger.error(`[Cache] Failed to release lock for key: ${key}`, { error })
      recordCounter('cache.lock.release_failed', 1, { key })
    }
  }
}

/**
 * 캐시 무효화
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key)
    recordCounter('cache.invalidate', 1, { key })
    logger.info(`[Cache] Invalidated cache for key: ${key}`)
  } catch (error) {
    logger.error(`[Cache] Failed to invalidate cache for key: ${key}`, { error })
    throw error
  }
}

/**
 * 패턴으로 캐시 무효화
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) {
      return 0
    }

    await redis.del(...keys)
    recordCounter('cache.invalidate_pattern', keys.length, { pattern })
    logger.info(`[Cache] Invalidated ${keys.length} keys for pattern: ${pattern}`)
    return keys.length
  } catch (error) {
    logger.error(`[Cache] Failed to invalidate cache pattern: ${pattern}`, { error })
    throw error
  }
}
```

### 3. 주요 함수에 적용 (8시간)

#### 3.1 통계 API (`/api/stats`)

**Before**:

```typescript
async function getGlobalStats() {
  const cached = await redis.get('stats:global')
  if (cached) return JSON.parse(cached)

  // 😱 100개 요청이 동시에 여기 도달
  const stats = await calculateStats()
  await redis.setex('stats:global', 3600, JSON.stringify(stats))
  return stats
}
```

**After**:

```typescript
import { getCachedOrCompute } from '@/lib/cache/cache-manager'

async function getGlobalStats() {
  return getCachedOrCompute('stats:global', calculateStats, { ttl: 3600 })
}
```

#### 3.2 추천 콘텐츠 (`/api/community/recommendations`)

**Before**:

```typescript
export async function GET() {
  const cached = await redis.get('recommendations:global')
  if (cached) return NextResponse.json(JSON.parse(cached))

  const recommendations = await getRecommendations()
  await redis.setex('recommendations:global', 1800, JSON.stringify(recommendations))
  return NextResponse.json(recommendations)
}
```

**After**:

```typescript
import { getCachedOrCompute } from '@/lib/cache/cache-manager'

export async function GET() {
  const recommendations = await getCachedOrCompute('recommendations:global', getRecommendations, {
    ttl: 1800,
  })
  return NextResponse.json(recommendations)
}
```

#### 3.3 점성술 계산 (`/api/astrology`)

**Before**:

```typescript
async function calculateChart(birthDate: string, birthTime: string) {
  const cacheKey = `chart:${birthDate}:${birthTime}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const chart = await expensiveEphemerisCalculation(birthDate, birthTime)
  await redis.setex(cacheKey, 86400, JSON.stringify(chart))
  return chart
}
```

**After**:

```typescript
import { getCachedOrCompute } from '@/lib/cache/cache-manager'

async function calculateChart(birthDate: string, birthTime: string) {
  const cacheKey = `chart:${birthDate}:${birthTime}`

  return getCachedOrCompute(
    cacheKey,
    () => expensiveEphemerisCalculation(birthDate, birthTime),
    { ttl: 86400 } // 24시간
  )
}
```

#### 3.4 사주 계산 (`/api/saju`)

**Before**:

```typescript
async function calculateSaju(birthInfo: BirthInfo) {
  const cacheKey = `saju:${birthInfo.birthDate}:${birthInfo.birthTime}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const saju = await calculateFourPillars(birthInfo)
  await redis.setex(cacheKey, 86400, JSON.stringify(saju))
  return saju
}
```

**After**:

```typescript
import { getCachedOrCompute } from '@/lib/cache/cache-manager'

async function calculateSaju(birthInfo: BirthInfo) {
  const cacheKey = `saju:${birthInfo.birthDate}:${birthInfo.birthTime}`

  return getCachedOrCompute(cacheKey, () => calculateFourPillars(birthInfo), { ttl: 86400 })
}
```

### 4. 모니터링 대시보드 (1.5시간)

**`src/lib/metrics/cache-metrics.ts`** (새 파일 생성):

```typescript
/**
 * Cache Metrics for Monitoring
 */

import { recordCounter, recordHistogram } from '@/lib/metrics'

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  stampedes: number
  lockAcquisitions: number
  lockFailures: number
  computeTime: number
}

export async function getCacheMetrics(timeRange: '1h' | '24h' | '7d'): Promise<CacheMetrics> {
  // Sentry/Datadog에서 메트릭 가져오기
  // 실제 구현은 사용 중인 모니터링 도구에 따라 다름

  return {
    hits: 0,
    misses: 0,
    hitRate: 0,
    stampedes: 0,
    lockAcquisitions: 0,
    lockFailures: 0,
    computeTime: 0,
  }
}

// Sentry 대시보드 쿼리 예시
export const CACHE_QUERIES = {
  hitRate: `
    sum(cache.hit) / (sum(cache.hit) + sum(cache.miss)) * 100
  `,
  stampedeRate: `
    sum(cache.stampede) / sum(cache.compute) * 100
  `,
  avgComputeTime: `
    avg(cache.compute.duration)
  `,
}
```

---

<a name="phase-3"></a>

## Phase 3: 전체 Rate Limiting (48시간)

### 자동화 스크립트

**`scripts/apply-rate-limiting.ts`** (새 파일 생성):

```typescript
#!/usr/bin/env ts-node
/**
 * Automatically apply rate limiting to all unprotected API routes
 *
 * Usage:
 *   npx ts-node scripts/apply-rate-limiting.ts
 *   npx ts-node scripts/apply-rate-limiting.ts --dry-run
 *   npx ts-node scripts/apply-rate-limiting.ts --file src/app/api/some/route.ts
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

interface Options {
  dryRun: boolean
  file?: string
}

const args = process.argv.slice(2)
const options: Options = {
  dryRun: args.includes('--dry-run'),
  file: args.find((arg) => arg.startsWith('--file='))?.split('=')[1],
}

// Find unprotected routes
async function findUnprotectedRoutes(): Promise<string[]> {
  const files = options.file ? [options.file] : await glob('src/app/api/**/route.ts')

  const unprotected: string[] = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')

    // Check if already protected
    if (
      content.includes('withApiMiddleware') ||
      content.includes('rateLimit') ||
      content.includes('createSimpleGuard') ||
      content.includes('createAuthenticatedGuard')
    ) {
      continue
    }

    // Skip auth routes (NextAuth handles these)
    if (file.includes('/auth/[...nextauth]/')) {
      continue
    }

    // Skip cron routes (internal only)
    if (file.includes('/cron/')) {
      continue
    }

    unprotected.push(file)
  }

  return unprotected
}

// Apply rate limiting to a file
function applyRateLimiting(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8')

  // Skip if already protected
  if (content.includes('withApiMiddleware')) {
    console.log(`⏭️  Skipping ${filePath} (already protected)`)
    return
  }

  // Add imports
  if (!content.includes('withApiMiddleware')) {
    const importStatement = `import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware';\n`

    // Insert after last import
    const lastImportIndex = content.lastIndexOf('import ')
    const insertIndex = content.indexOf('\n', lastImportIndex) + 1
    content = content.slice(0, insertIndex) + importStatement + content.slice(insertIndex)
  }

  // Find and wrap HTTP method handlers
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

  for (const method of methods) {
    const methodRegex = new RegExp(`export async function ${method}\\s*\\(`, 'g')

    if (methodRegex.test(content)) {
      // Extract route name from file path
      const routeName = filePath
        .replace('src/app/api/', '')
        .replace('/route.ts', '')
        .replace(/\\/g, '/')

      // Simple replacement (manual verification needed)
      content = content.replace(
        `export async function ${method}(`,
        `export const ${method} = withApiMiddleware(\n  async (`
      )

      // Add guard at the end (manual placement needed)
      const placeholder = `\n  // TODO: Add guard configuration\n  // },\n  // createSimpleGuard({ route: '/api/${routeName}', limit: 100, windowSeconds: 60 })\n  // );\n`
      content += placeholder
    }
  }

  if (options.dryRun) {
    console.log(`🔍 Would modify ${filePath}`)
  } else {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ Applied rate limiting to ${filePath}`)
    console.log(`⚠️  MANUAL REVIEW REQUIRED: Check guard configuration and function wrapping`)
  }
}

// Main
;(async () => {
  console.log('🔍 Finding unprotected routes...\n')

  const unprotected = await findUnprotectedRoutes()

  console.log(`Found ${unprotected.length} unprotected routes\n`)

  if (unprotected.length === 0) {
    console.log('✅ All routes are protected!')
    process.exit(0)
  }

  if (options.dryRun) {
    console.log('🔍 Dry run mode - no files will be modified\n')
  }

  for (const file of unprotected) {
    applyRateLimiting(file)
  }

  console.log(`\n✅ Done!`)
  console.log(`⚠️  IMPORTANT: Review all modified files manually`)
  console.log(`⚠️  Verify guard configurations and function wrapping`)
})()
```

**실행**:

```bash
# Dry run (파일 수정 안 함)
npx ts-node scripts/apply-rate-limiting.ts --dry-run

# 실제 적용
npx ts-node scripts/apply-rate-limiting.ts

# 특정 파일만
npx ts-node scripts/apply-rate-limiting.ts --file src/app/api/some/route.ts
```

### 수동 검증 체크리스트 (40시간)

각 파일마다 다음을 확인:

1. **Import 정확성**
   - [ ] `withApiMiddleware` import 추가됨
   - [ ] 불필요한 import 제거됨

2. **함수 wrapping**
   - [ ] `export async function` → `export const` 변환
   - [ ] `withApiMiddleware()` 호출 추가
   - [ ] 닫는 괄호 위치 정확

3. **Guard 설정**
   - [ ] 인증 필요 여부 확인
     - 사용자 데이터 접근 → `createAuthenticatedGuard`
     - 공개 API → `createSimpleGuard`
   - [ ] Rate limit 값 적절성
     - 무거운 계산 → 20-30/min
     - 가벼운 조회 → 100-200/min
     - AI 호출 → 10-20/min

4. **Context 사용**
   - [ ] `context.userId` 사용
   - [ ] `context.session` 사용 (필요 시)
   - [ ] 불필요한 `getServerSession` 제거

5. **응답 형식**
   - [ ] `NextResponse.json()` → `{ data }` 변환
   - [ ] Error handling 제거 (middleware가 처리)

6. **빌드 검증**
   - [ ] `npx tsc --noEmit` 통과
   - [ ] ESLint 검사 통과

---

<a name="verification"></a>

## 검증 및 테스트

### 1. TypeScript 검증

```bash
npx tsc --noEmit
# 예상: No errors
```

### 2. ESLint 검증

```bash
npm run lint
# 예상: All files passed
```

### 3. 프로덕션 빌드

```bash
npm run build
# 예상: Build succeeded
```

### 4. Rate Limiting 테스트

**`tests/api/rate-limiting.test.ts`** (새 파일 생성):

```typescript
import { describe, it, expect } from 'vitest'

describe('Rate Limiting', () => {
  it('should block requests after limit', async () => {
    const responses = []

    // 101 requests (limit: 100/min)
    for (let i = 0; i < 101; i++) {
      const res = await fetch('http://localhost:3000/api/stats')
      responses.push(res.status)
    }

    const successCount = responses.filter((s) => s === 200).length
    const rateLimitedCount = responses.filter((s) => s === 429).length

    expect(successCount).toBeLessThanOrEqual(100)
    expect(rateLimitedCount).toBeGreaterThan(0)
  })

  it('should reset after window', async () => {
    // Fill limit
    for (let i = 0; i < 100; i++) {
      await fetch('http://localhost:3000/api/stats')
    }

    // Should be rate limited
    const res1 = await fetch('http://localhost:3000/api/stats')
    expect(res1.status).toBe(429)

    // Wait 61 seconds
    await new Promise((resolve) => setTimeout(resolve, 61000))

    // Should work again
    const res2 = await fetch('http://localhost:3000/api/stats')
    expect(res2.status).toBe(200)
  })
})
```

### 5. Cache Stampede 테스트

**부하 테스트 스크립트** (`tests/load/cache-stampede.yml`):

```yaml
# artillery run tests/load/cache-stampede.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 10
      arrivalRate: 100 # 100 req/sec
      name: 'Stampede test'

scenarios:
  - name: 'Cache miss scenario'
    flow:
      - get:
          url: '/api/stats?nocache=true'
```

**실행 및 검증**:

```bash
# 캐시 무효화
redis-cli DEL stats:global

# 부하 테스트
artillery run tests/load/cache-stampede.yml

# 로그 확인
tail -f logs/app.log | grep "Computing value"
# 예상: "Computing value" 로그가 1번만 나타남 (stampede 방지 성공)
```

---

## 📊 성공 지표

### Phase 1.2 완료 기준

- [ ] 12개 고위험 API에 Rate Limiting 적용
- [ ] TypeScript 빌드 통과
- [ ] 수동 테스트 통과

### Phase 2 완료 기준

- [ ] Redlock 설치 완료
- [ ] Cache Manager 구현 완료
- [ ] 5개 주요 함수에 적용
- [ ] 부하 테스트 통과 (stampede 발생 안 함)

### Phase 3 완료 기준

- [ ] 자동화 스크립트 실행 완료
- [ ] 86개 라우트 수동 검증 완료
- [ ] 전체 빌드 통과
- [ ] Rate limiting 테스트 통과

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**예상 완료**: 2026-02-10
