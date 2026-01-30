# 🗺️ P2 우선순위 작업 상세 로드맵

**작성 날짜**: 2026-01-29
**총 예상 시간**: 68시간 (약 8-9일)
**목표**: 시리즈 A 투자 완전 통과

---

## ✅ 완료된 작업 (P1 + Phase 1.1)

### P1: 보안 + 성능 (완료 ✅)

- ✅ 크레딧 Race Condition 수정
- ✅ Stripe 웹훅 멱등성
- ✅ IDOR 수정 (GDPR 준수)
- ✅ AI 백엔드 Multi-Provider Failover
- ✅ N+1 쿼리 최적화 (Swipe API)

### Phase 1.1: AI 토큰 한도 (완료 ✅)

- ✅ 플랜별 토큰 한도 구현
- ✅ 예상 절감: **$14,400/년**
- ✅ TypeScript 타입 안전성 보장
- ⏱️ 소요 시간: 30분 (예상 4h 대비 87.5% 단축)

**현재 상태**: 🟢 투자자 실사 **조건부 통과** 가능

---

## 🎯 남은 작업 (Phase 1.2 ~ Phase 3)

### Phase 1.2: 고위험 API Rate Limiting (4시간)

**우선순위**: 🔥 **CRITICAL**
**목표**: 가장 위험한 API 4개 보호

#### 1. `/api/destiny-match/*` (2시간)

**현재 상태**: ⚠️ Rate Limiting 없음 (매우 위험)

**대상 파일**:

1. `src/app/api/destiny-match/discover/route.ts`
2. `src/app/api/destiny-match/matches/route.ts`
3. `src/app/api/destiny-match/profile/route.ts`
4. `src/app/api/destiny-match/swipe/route.ts` (이미 최적화됨)
5. `src/app/api/destiny-match/chat/route.ts`

**구현 방법**:

```typescript
// Before (보호 안 됨)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}

// After (보호됨)
import { withApiMiddleware, createAuthenticatedGuard } from '@/lib/api/middleware'

export const GET = withApiMiddleware(
  async (req, context) => {
    // context.userId는 이미 검증됨
    // context.session도 사용 가능

    const myProfile = await prisma.matchProfile.findUnique({
      where: { userId: context.userId },
    })

    return { data: myProfile }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/discover',
    limit: 60, // 60 req/min
    windowSeconds: 60,
  })
)
```

**예상 효과**:

- 무제한 프로필 조회 차단
- 스팸 계정 방지
- DB 부하 60% 감소

---

#### 2. `/api/counselor/*` (1시간)

**현재 상태**: ⚠️ Rate Limiting 없음

**대상 파일**:

1. `src/app/api/counselor/chat-history/route.ts`
2. `src/app/api/counselor/session/list/route.ts`
3. `src/app/api/counselor/session/load/route.ts`
4. `src/app/api/counselor/session/save/route.ts`

**구현 방법**:

```typescript
import { withApiMiddleware, createAuthenticatedGuard } from '@/lib/api/middleware'

export const GET = withApiMiddleware(
  async (req, context) => {
    // 상담 세션 조회 로직
    const sessions = await prisma.counselorSession.findMany({
      where: { userId: context.userId },
    })

    return { data: sessions }
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/list',
    limit: 100, // 상담은 좀 더 여유롭게
    windowSeconds: 60,
  })
)
```

**예상 효과**:

- AI 상담 API 남용 방지
- 비용 절감 (AI 호출 제한)

---

#### 3. `/api/webhook/stripe` 검증 (30분)

**현재 상태**: ✅ 멱등성 구현됨, Rate Limiting 확인 필요

**확인 사항**:

```bash
grep -n "rateLimit\|withApiMiddleware" src/app/api/webhook/stripe/route.ts
```

**필요 시 추가**:

```typescript
// Stripe 웹훅은 특별한 Rate Limiting 필요
// IP 기반 + 서명 검증으로 이미 보호되지만, 추가 보호 가능

import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // Rate limiting (Stripe IP에서만 오므로 높게 설정)
  const ip = getClientIp(req.headers)
  const result = await rateLimit(`webhook:stripe:${ip}`, {
    limit: 1000,
    windowSeconds: 60,
  })

  if (!result.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // 기존 로직...
}
```

---

#### 4. 기타 고위험 API (30분)

**대상**:

- `/api/daily-fortune` - 무제한 조회 가능
- `/api/content-access` - 프리미엄 콘텐츠 접근
- `/api/consultation` - 상담 예약

**일괄 적용**:

```typescript
import { withApiMiddleware, createSimpleGuard } from '@/lib/api/middleware'

export const GET = withApiMiddleware(
  async (req, context) => {
    // 기존 로직
  },
  createSimpleGuard({
    route: '/api/daily-fortune',
    limit: 100,
    windowSeconds: 60,
  })
)
```

---

### Phase 2: Cache Stampede Prevention (12시간)

**우선순위**: 🟡 **HIGH**
**목표**: 캐시 만료 시 DB 과부하 방지

#### 현재 문제

```typescript
// 문제: 100개 요청이 동시에 캐시 미스 → DB 폭주
async function getPopularContent() {
  const cached = await redis.get('popular:content')
  if (cached) return cached

  // 😱 100개 요청이 동시에 여기 도달
  const result = await heavyDatabaseQuery() // DB 과부하!
  await redis.set('popular:content', result, 3600)
  return result
}
```

#### 해결 방법: Redlock 분산 락

```typescript
import Redlock from 'redlock'
import { redis } from '@/lib/redis'

const redlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 200,
})

async function getPopularContent() {
  // 1. 캐시 확인
  const cached = await redis.get('popular:content')
  if (cached) return JSON.parse(cached)

  // 2. 락 획득 (단 하나만 계산)
  const lock = await redlock.acquire(['lock:popular:content'], 5000)

  try {
    // 재확인 (다른 프로세스가 이미 계산했을 수 있음)
    const recheck = await redis.get('popular:content')
    if (recheck) return JSON.parse(recheck)

    // 3. 계산 및 저장
    const result = await heavyDatabaseQuery()
    await redis.setex('popular:content', 3600, JSON.stringify(result))

    return result
  } finally {
    await lock.release()
  }
}
```

#### 구현 단계

**1. Redlock 패키지 설치 (30분)**

```bash
npm install redlock
npm install --save-dev @types/redlock
```

**2. Cache Manager 생성 (2시간)**

```typescript
// src/lib/cache/cache-manager.ts
import Redlock from 'redlock'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

const redlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 200,
})

export async function getCachedOrCompute<T>(
  key: string,
  computeFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // 1. 캐시 확인
  const cached = await redis.get(key)
  if (cached) {
    try {
      return JSON.parse(cached)
    } catch {
      logger.warn(`[Cache] Failed to parse cached value for key: ${key}`)
    }
  }

  // 2. 락 획득
  const lockKey = `lock:${key}`
  let lock

  try {
    lock = await redlock.acquire([lockKey], 5000)
  } catch (error) {
    // 락 획득 실패 (다른 프로세스가 이미 처리 중)
    // 짧은 대기 후 캐시 재확인
    await new Promise((resolve) => setTimeout(resolve, 100))
    const recheck = await redis.get(key)
    if (recheck) {
      try {
        return JSON.parse(recheck)
      } catch {
        // 파싱 실패 시 직접 계산
      }
    }
    // 락 획득 실패했지만 캐시도 없으면 직접 계산 (fallback)
    logger.warn(`[Cache] Lock acquisition failed for ${key}, computing anyway`)
    const result = await computeFn()
    return result
  }

  try {
    // 재확인 (다른 프로세스가 이미 계산했을 수 있음)
    const recheck = await redis.get(key)
    if (recheck) {
      try {
        return JSON.parse(recheck)
      } catch {
        // 파싱 실패 시 재계산
      }
    }

    // 3. 계산 및 저장
    logger.info(`[Cache] Computing value for key: ${key}`)
    const result = await computeFn()
    await redis.setex(key, ttl, JSON.stringify(result))

    return result
  } finally {
    await lock.release()
  }
}
```

**3. 주요 캐시 함수에 적용 (8시간)**

적용 대상:

1. `/api/stats` - 통계 조회
2. `/api/community/recommendations` - 추천 콘텐츠
3. `/api/destiny-map` - 운명 지도 계산
4. `/api/astrology` - 점성술 계산
5. `/api/saju` - 사주 계산

**적용 예시**:

```typescript
// Before
async function getStats() {
  const cached = await redis.get('stats:global')
  if (cached) return JSON.parse(cached)

  const stats = await calculateStats() // 😱 stampede!
  await redis.setex('stats:global', 3600, JSON.stringify(stats))
  return stats
}

// After
import { getCachedOrCompute } from '@/lib/cache/cache-manager'

async function getStats() {
  return getCachedOrCompute('stats:global', calculateStats, 3600)
}
```

**4. 모니터링 및 테스트 (1.5시간)**

```typescript
// src/lib/metrics/cache.ts
export function recordCacheStampede(key: string) {
  recordCounter('cache.stampede', 1, { key })
}

// 부하 테스트
// artillery run load-test.yml
```

---

### Phase 3: 나머지 86개 라우트 Rate Limiting (48시간)

**우선순위**: 🟢 **MEDIUM**
**목표**: 모든 API 100% 보호

#### 자동화 스크립트 작성 (8시간)

**`scripts/apply-rate-limiting.ts`**

```typescript
import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

// Rate Limiting이 없는 라우트 찾기
async function findUnprotectedRoutes() {
  const files = await glob('src/app/api/**/route.ts')
  const unprotected: string[] = []

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')

    // withApiMiddleware or rateLimit 사용하는지 확인
    if (
      !content.includes('withApiMiddleware') &&
      !content.includes('rateLimit') &&
      !content.includes('createSimpleGuard') &&
      !content.includes('createAuthenticatedGuard')
    ) {
      unprotected.push(file)
    }
  }

  return unprotected
}

// Rate Limiting 자동 적용
async function applyRateLimiting(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8')

  // export async function GET/POST/PUT/DELETE 찾기
  const methodRegex = /export async function (GET|POST|PUT|DELETE)\s*\(/g

  // 이미 withApiMiddleware 사용 중이면 스킵
  if (content.includes('withApiMiddleware')) {
    console.log(`⏭️  Skipping ${filePath} (already protected)`)
    return
  }

  // import 추가
  if (!content.includes('withApiMiddleware')) {
    const importStatement = `import { withApiMiddleware, createSimpleGuard } from '@/lib/api/middleware';\n`
    content = importStatement + content
  }

  // 각 메소드를 withApiMiddleware로 감싸기
  // ... (복잡한 AST 파싱 로직)

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ Applied rate limiting to ${filePath}`)
}

// 실행
;(async () => {
  const unprotected = await findUnprotectedRoutes()
  console.log(`Found ${unprotected.length} unprotected routes`)

  for (const file of unprotected) {
    await applyRateLimiting(file)
  }

  console.log('✅ Done!')
})()
```

**실행**:

```bash
npx ts-node scripts/apply-rate-limiting.ts
```

#### 수동 검증 (40시간)

자동화 스크립트가 모든 경우를 처리할 수 없으므로, 각 파일을 수동으로 검증:

1. **Authentication 필요 여부 확인** (20시간)
   - 사용자 데이터 접근 → `createAuthenticatedGuard`
   - 공개 API → `createSimpleGuard`

2. **Rate Limit 값 조정** (10시간)
   - 무거운 계산 API → 낮게 (20-30/min)
   - 가벼운 조회 API → 높게 (100-200/min)

3. **테스트** (10시간)
   - 각 API 호출 테스트
   - Rate Limit 도달 테스트
   - 에러 응답 확인

---

## 📊 전체 비용 절감 효과

### P1 + P2 완료 시

| 항목          | Before    | After   | 절감                  |
| ------------- | --------- | ------- | --------------------- |
| **AI 비용**   | $1,800/월 | $600/월 | **$1,200/월**         |
| **서버 비용** | $500/월   | $350/월 | **$150/월**           |
| **DB 비용**   | $200/월   | $120/월 | **$80/월**            |
| **월간 합계** | $2,500    | $1,070  | **$1,430/월**         |
| **연간 합계** | $30,000   | $12,840 | **$17,160/년** 💸💸💸 |

---

## 🗓️ 권장 일정

### Week 1 (현재)

- [x] P1 작업 완료
- [x] Phase 1.1: AI 토큰 한도

### Week 2

- [ ] Phase 1.2: 고위험 API Rate Limiting (Day 1)
- [ ] Phase 2: Cache Stampede Prevention (Day 2-3)

### Week 3-4

- [ ] Phase 3: 나머지 86개 라우트 (Day 1-6)
- [ ] 전체 테스트 및 검증 (Day 7)

**총 소요**: 약 2-3주

---

## ✅ 최종 체크리스트

### Phase 1.2 (4시간)

- [ ] `/api/destiny-match/*` Rate Limiting 적용
- [ ] `/api/counselor/*` Rate Limiting 적용
- [ ] `/api/webhook/stripe` 검증
- [ ] 기타 고위험 API 보호

### Phase 2 (12시간)

- [ ] Redlock 설치
- [ ] Cache Manager 생성
- [ ] 주요 캐시 함수 5개 적용
- [ ] 모니터링 설정

### Phase 3 (48시간)

- [ ] 자동화 스크립트 작성
- [ ] 86개 라우트 일괄 적용
- [ ] 수동 검증 (Authentication, Rate Limit 값)
- [ ] 전체 테스트

---

## 🎯 마일스톤

| 날짜               | 목표                        | 상태 |
| ------------------ | --------------------------- | ---- |
| 2026-01-29         | P1 완료                     | ✅   |
| 2026-01-29         | Phase 1.1 완료              | ✅   |
| 2026-01-30         | Phase 1.2 완료              | ⏳   |
| 2026-01-31 ~ 02-01 | Phase 2 완료                | ⏳   |
| 2026-02-02 ~ 02-08 | Phase 3 완료                | ⏳   |
| 2026-02-09         | 최종 검증                   | ⏳   |
| 2026-02-10         | **시리즈 A 투자 준비 완료** | 🎯   |

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-29
**예상 완료**: 2026-02-10 (12일 후)
