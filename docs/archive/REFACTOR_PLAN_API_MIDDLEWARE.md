# API 라우트 미들웨어 통일 리팩토링 계획

## 목표

128개 API 라우트의 미들웨어 패턴을 통일하여:

- 코드 중복 50% 감소
- 보안 정책 일관성 확보
- 에러 핸들링 표준화
- 유지보수성 향상

## 현황

### 통계

- **미들웨어 사용**: 24개 (19%)
- **수동 검증**: 66개 (52%) ← 마이그레이션 대상
- **미확인**: ~38개 (29%)

### 현재 문제점

#### 1. 패턴 불일치

```typescript
// 패턴 A: 미들웨어 사용 (Good ✅)
const guardOptions = createPublicStreamGuard({ route: "compatibility", ... });
const { context, error } = await initializeApiContext(req, guardOptions);
if (error) return error;

// 패턴 B: 수동 검증 (Bad ❌)
const session = await getServerSession(authOptions);
const ip = getClientIp(req.headers);
if (!body) return NextResponse.json({ message: '...' }, { status: 400 });

// 패턴 C: 부분 수동 (Bad ❌)
const tokenResult = requirePublicToken(req);
const result = await rateLimit(key, { limit, windowSeconds });
```

#### 2. 에러 응답 형식 3가지 혼재

- `{ error: string }` vs `{ message: string }` vs `createErrorResponse`

#### 3. 보안 정책 불일치

- CSRF: 일부만 적용
- Rate limit: 30/60s vs 60/60s
- 크레딧: 각자 다른 로직

## 개선 방안

### Step 1: 미들웨어 개선 (1-2일)

#### 1.1 `withApiMiddleware` 강화

현재 `withApiMiddleware`는 좋지만, 더 간결하게 사용할 수 있도록 개선:

```typescript
// BEFORE (현재 - 좋지만 여전히 보일러플레이트 있음)
export async function POST(req: NextRequest) {
  const guardOptions = createPublicStreamGuard({
    route: 'compatibility',
    limit: 30,
    windowSeconds: 60,
  })
  const { context, error } = await initializeApiContext(req, guardOptions)
  if (error) return error

  // 실제 로직...
}

// AFTER (목표 - 더 간결함)
export const POST = withApiMiddleware(
  async (req, context) => {
    // 실제 로직만...
    return apiSuccess({ data: '...' })
  },
  {
    route: 'compatibility',
    requireToken: true,
    rateLimit: { limit: 30, windowSeconds: 60 },
  }
)
```

**현재 `withApiMiddleware`는 이미 이 패턴을 지원함!** 단지 아직 사용하지 않는 라우트가 많을 뿐.

#### 1.2 Preset 확장

현재 3개 preset:

- `createPublicStreamGuard` ✅
- `createAuthenticatedGuard` ✅
- `createSimpleGuard` ✅

추가 필요:

```typescript
// 새로운 preset
export function createSajuGuard(): MiddlewareOptions {
  return {
    route: 'saju',
    requireToken: true,
    rateLimit: { limit: 60, windowSeconds: 60 },
    credits: { type: 'reading', amount: 0 }, // 초기 분석 무료
  }
}

export function createAstrologyGuard(): MiddlewareOptions {
  return {
    route: 'astrology',
    requireToken: true,
    rateLimit: { limit: 60, windowSeconds: 60 },
  }
}

export function createAdminGuard(): MiddlewareOptions {
  return {
    route: 'admin',
    requireAuth: true,
    requireAdmin: true, // 새로운 옵션
    rateLimit: { limit: 100, windowSeconds: 60 },
  }
}
```

#### 1.3 에러 응답 완전 통일

모든 에러는 `createErrorResponse`를 통해서만 생성:

```typescript
// BAD ❌
return NextResponse.json({ error: '...' }, { status: 400 })
return NextResponse.json({ message: '...' }, { status: 400 })

// GOOD ✅
return createErrorResponse({
  code: ErrorCodes.VALIDATION_ERROR,
  message: '...',
  locale: context.locale,
  route: context.route,
})

// 또는 apiError 헬퍼 사용
return apiError(ErrorCodes.VALIDATION_ERROR, '...')
```

### Step 2: 마이그레이션 우선순위 (2-3주)

#### Phase 1: 고빈도 API (3-5일)

1. **saju/route.ts** (450줄) - 가장 중요한 API
2. **astrology/route.ts** - 두 번째로 중요
3. **tarot/interpret/route.ts** (454줄)
4. **life-prediction/route.ts**
5. **destiny-matrix/route.ts**

**예상 효과**:

- 5개 파일 × 평균 50줄 절감 = **250줄 제거**
- 보안 일관성 확보
- 에러 핸들링 표준화

#### Phase 2: CRUD API (5-7일)

- readings/_, consultation/_, calendar/_, referral/_
- 총 ~20개 파일
- 대부분 간단한 패턴

#### Phase 3: 나머지 (3-5일)

- 나머지 ~40개 파일
- 패턴 확립 후 빠르게 진행

### Step 3: 검증 및 테스트 (2-3일)

#### 3.1 자동화된 패턴 체크

```typescript
// scripts/check-api-patterns.ts
// 모든 API 라우트를 검사하여:
// 1. withApiMiddleware 사용 여부
// 2. 에러 응답 형식 일관성
// 3. 보안 정책 적용 여부
```

#### 3.2 통합 테스트

```typescript
// tests/api/middleware.test.ts
describe('API Middleware', () => {
  test('모든 API가 CSRF 검증 적용', async () => {
    // ...
  })

  test('모든 API가 rate limit 적용', async () => {
    // ...
  })

  test('에러 응답 형식 일관성', async () => {
    // ...
  })
})
```

## 구체적인 마이그레이션 예시

### Before: saju/route.ts (현재)

```typescript
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers as Headers);
    const body = await parseRequestBody<any>(req, { context: 'Saju' });
    if (!body) {
      return NextResponse.json(
        { message: 'Invalid JSON body.' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { birthDate, birthTime, gender, calendarType, timezone } = body;
    if (!birthDate || !birthTime || !gender || !calendarType || !timezone) {
      return NextResponse.json(
        { message: 'Missing required fields.' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const session = await getServerSession(authOptions);
    // ... 50줄 이상의 검증 로직

    // 실제 사주 계산 로직
    const sajuResult = calculateSajuData(...);

    return NextResponse.json({ success: true, data: sajuResult });
  } catch (e: unknown) {
    captureServerError(e as Error, { route: "/api/saju" });
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}
```

### After: saju/route.ts (개선)

```typescript
export const POST = withApiMiddleware(
  async (req, context) => {
    // 바디 파싱 및 검증
    const body = await parseJsonBody<SajuRequestBody>(req)
    const validation = validateRequired(body, [
      'birthDate',
      'birthTime',
      'gender',
      'calendarType',
      'timezone',
    ])

    if (!validation.valid) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Missing fields: ${validation.missing.join(', ')}`
      )
    }

    // 실제 사주 계산 로직 (검증 로직 없음 - 미들웨어가 처리)
    const sajuResult = calculateSajuData(
      body.birthDate,
      body.birthTime,
      body.gender,
      body.calendarType,
      body.timezone
    )

    // 성공 응답
    return apiSuccess({ sajuResult })
  },
  createSajuGuard() // Preset 사용
)
```

**개선점**:

- **50줄 → 30줄** (40% 감소)
- 세션, IP, rate limit 검증 제거 (미들웨어가 처리)
- 에러 핸들링 간결화
- 타입 안정성 향상 (`any` 제거)

### Before: compatibility/route.ts (현재 - 이미 미들웨어 사용)

```typescript
export async function POST(req: NextRequest) {
  try {
    const guardOptions = createPublicStreamGuard({
      route: 'compatibility',
      limit: 30,
      windowSeconds: 60,
    })
    const { error } = await initializeApiContext(req, guardOptions)
    if (error) return error

    const body = await req.json()
    // ... 검증 및 로직

    return NextResponse.json({ data: '...' })
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'Unexpected server error', 500)
  }
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}
```

### After: compatibility/route.ts (개선)

```typescript
export const POST = withApiMiddleware(
  async (req, context) => {
    const body = await parseJsonBody<CompatibilityRequestBody>(req)

    // 검증
    if (body.persons.length < 2 || body.persons.length > 4) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Provide between 2 and 4 people for compatibility.'
      )
    }

    // 로직...

    return apiSuccess({ data: '...' })
  },
  createPublicStreamGuard({
    route: 'compatibility',
    limit: 30,
    windowSeconds: 60,
  })
)
```

**개선점**:

- `bad()` 헬퍼 제거 → `apiError()` 사용
- try-catch 제거 (미들웨어가 처리)
- 에러 응답 형식 통일

## 예상 효과

### 정량적 효과

| 지표           | Before                | After     | 개선율          |
| -------------- | --------------------- | --------- | --------------- |
| 코드 중복      | 66개 파일 × 평균 30줄 | 0줄       | **-2,000줄**    |
| 에러 응답 형식 | 3가지                 | 1가지     | **일관성 100%** |
| 보안 정책 적용 | ~50%                  | 100%      | **+50%**        |
| 타입 안정성    | `any` 사용            | 타입 안정 | **안정성 향상** |

### 정성적 효과

- ✅ 새 API 추가 시 보일러플레이트 최소화
- ✅ 보안 정책 누락 방지
- ✅ 에러 처리 일관성으로 클라이언트 통합 간소화
- ✅ 코드 리뷰 시간 단축

## 다음 단계

1. **이 계획 승인** ← 여기
2. **Step 1 실행**: 미들웨어 개선 (1-2일)
3. **Step 2 Phase 1 실행**: 고빈도 API 5개 마이그레이션 (3-5일)
4. **중간 리뷰**: 패턴 검증 및 조정
5. **Step 2 Phase 2-3 실행**: 나머지 API 마이그레이션 (8-12일)
6. **Step 3 실행**: 검증 및 테스트 (2-3일)

**총 예상 기간**: 2-3주 (파트타임 기준)

## 시작하시겠습니까?

다음 중 하나를 선택해주세요:

1. **즉시 시작** - Phase 1 고빈도 API 5개부터 시작
2. **Step 1만 먼저** - 미들웨어 개선만 먼저 적용
3. **샘플 1개 먼저** - `saju/route.ts` 하나만 먼저 마이그레이션해서 효과 검증
4. **계획 수정** - 다른 우선순위나 접근 방식 제안

어떻게 진행하시겠습니까?
