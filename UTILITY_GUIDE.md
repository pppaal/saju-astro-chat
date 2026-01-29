# Utility Functions Guide

프로젝트의 모든 유틸리티 함수들을 한 곳에서 찾을 수 있도록 정리한 가이드입니다.

## 📚 목차

1. [날짜 유틸리티](#1-날짜-유틸리티)
2. [Sanitization (보안)](#2-sanitization-보안)
3. [API Response 헬퍼](#3-api-response-헬퍼)
4. [Validation (입력 검증)](#4-validation-입력-검증)
5. [Localization (다국어)](#5-localization-다국어)

---

## 1. 날짜 유틸리티

### 📁 위치

- **Main**: `src/lib/utils/date.ts`
- **Legacy** (backward compatibility): `src/lib/prediction/utils/date-formatters.ts`

### 주요 함수

#### 날짜 포맷팅

```typescript
import { formatDateToISO, formatRelativeDate, formatDateByLocale } from '@/lib/utils/date'

// ISO 포맷 (YYYY-MM-DD)
const isoDate = formatDateToISO(new Date()) // "2024-01-29"

// 상대 날짜 ("Today", "Yesterday", 또는 포맷된 날짜)
const relative = formatRelativeDate('2024-01-29', {
  locale: 'ko',
  labels: { today: '오늘', yesterday: '어제' },
}) // "오늘" 또는 "1월 29일"

// 로케일별 포맷
const localized = formatDateByLocale(new Date(), 'ko') // "2024. 1. 29."
```

#### 날짜 파싱

```typescript
import { parseISODate, parseDateComponents, parseTimeComponents } from '@/lib/utils/date'

const date = parseISODate('2024-01-29') // Date object
const { year, month, day } = parseDateComponents('2024-01-29')
const { hour, minute } = parseTimeComponents('14:30')
```

#### 날짜 비교 & 연산

```typescript
import {
  isToday,
  isPast,
  isFuture,
  calculateAge,
  addDays,
  addMonths,
  addYears,
} from '@/lib/utils/date'

if (isToday(someDate)) {
  /* ... */
}
const age = calculateAge('1990-01-15') // 34
const nextWeek = addDays(new Date(), 7)
```

#### 날짜 범위

```typescript
import { getDateRange } from '@/lib/utils/date'

const range = getDateRange(new Date('2024-01-01'), new Date('2024-01-07')) // ["2024-01-01", "2024-01-02", ..., "2024-01-07"]
```

---

## 2. Sanitization (보안)

### 📁 위치

- **Error Sanitization**: `src/lib/security/errorSanitizer.ts`
- **Input Sanitization**: `src/lib/api/sanitizers.ts`
- **Locale Text**: `src/lib/destiny-map/sanitize.ts`

### Error Sanitization

```typescript
import {
  sanitizeErrorMessage,
  sanitizeError,
  getGenericError,
  createSafeErrorResponse,
} from '@/lib/security/errorSanitizer'

// 에러 메시지에서 민감 정보 제거
const safe = sanitizeErrorMessage(error.message)
// "postgres://user:password@host" → "postgres://[REDACTED]"

// 카테고리별 일반화된 에러 메시지
const generic = getGenericError('database', originalError)
// "Database operation failed"

// 클라이언트용 안전한 에러 응답
const response = createSafeErrorResponse('authentication', error, true)
// { error: "Authentication failed", hint: "[sanitized]" } (dev only)
```

### Input Sanitization

```typescript
import {
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeEnum,
  sanitizeHtml,
  sanitizeHtmlSafe,
  cleanStringArray,
  normalizeMessages,
} from '@/lib/api/sanitizers'

// 문자열 정제 (길이 제한)
const clean = sanitizeString(userInput, 100, 'default')

// 숫자 범위 제한
const safe = sanitizeNumber(value, 0, 100, 50)

// HTML 제거 (XSS 방지)
const text = sanitizeHtml(ugcContent) // 모든 HTML 제거

// 안전한 HTML 태그만 허용
const formatted = sanitizeHtmlSafe(content) // <b>, <i>, <a> 등만 허용

// Enum 검증
const role = sanitizeEnum(input, ['admin', 'user'], 'user')

// 채팅 메시지 정규화
const messages = normalizeMessages(rawMessages, {
  maxMessages: 20,
  maxLength: 2000,
})
```

---

## 3. API Response 헬퍼

### 📁 위치

- **Response Helpers**: `src/lib/api/errorHandler.ts`
- **Middleware**: `src/lib/api/middleware.ts`

### 성공/에러 응답

```typescript
import { apiSuccess, apiError, ErrorCodes } from '@/lib/api/middleware'

// 성공 응답
return apiSuccess({
  data: result,
  meta: { timestamp: Date.now() },
})

// 에러 응답
return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid input', { fields: ['email'] })
```

### 표준 에러 코드

```typescript
import { ErrorCodes } from '@/lib/api/middleware'

ErrorCodes.VALIDATION_ERROR // 400
ErrorCodes.UNAUTHORIZED // 401
ErrorCodes.FORBIDDEN // 403
ErrorCodes.NOT_FOUND // 404
ErrorCodes.RATE_LIMITED // 429
ErrorCodes.INSUFFICIENT_CREDITS // 402
ErrorCodes.INTERNAL_ERROR // 500
```

### Middleware 사용

```typescript
import { withApiMiddleware, createAstrologyGuard } from '@/lib/api/middleware'

export const POST = withApiMiddleware(
  async (req, context) => {
    // context.userId, context.isPremium, context.creditInfo 자동 주입
    // Rate limiting, CSRF, 인증 자동 처리

    return apiSuccess({ data: result })
  },
  createAstrologyGuard() // 사전 정의된 가드 사용
)
```

---

## 4. Validation (입력 검증)

### 📁 위치

- **Zod Schema**: `src/lib/api/zodValidation.ts` ⭐ **권장**
- **Manual Validation**: `src/lib/api/validation.ts`

### Zod 기반 검증 (권장)

```typescript
import {
  validateRequestBody,
  astrologyRequestSchema,
  sajuRequestSchema,
  birthInfoSchema,
  dateSchema,
  timeSchema,
  localeSchema,
} from '@/lib/api/zodValidation'

// API 요청 바디 검증
const validation = await validateRequestBody(req, astrologyRequestSchema)

if (!validation.success) {
  return apiError(
    ErrorCodes.VALIDATION_ERROR,
    validation.errors.map((e) => `${e.path}: ${e.message}`).join(', '),
    { errors: validation.errors }
  )
}

const { date, time, latitude, longitude } = validation.data
```

### 공통 스키마

```typescript
import {
  dateSchema, // YYYY-MM-DD
  timeSchema, // HH:MM or HH:MM AM/PM
  timezoneSchema, // Asia/Seoul
  latitudeSchema, // -90 ~ 90
  longitudeSchema, // -180 ~ 180
  localeSchema, // ko, en, ja, zh, ...
  genderSchema, // Male, Female, Other
} from '@/lib/api/zodValidation'

// 커스텀 스키마 구성
const mySchema = z.object({
  birthDate: dateSchema,
  birthTime: timeSchema,
  locale: localeSchema.optional(),
})
```

### 수동 검증 (레거시)

```typescript
import { validateFields, CommonValidators, Patterns } from '@/lib/api/validation'

const result = validateFields(data, {
  email: {
    required: true,
    type: 'string',
    pattern: Patterns.EMAIL,
  },
  age: {
    type: 'number',
    min: 0,
    max: 150,
  },
})

if (!result.valid) {
  return apiError(ErrorCodes.VALIDATION_ERROR, result.errors.join(', '))
}
```

---

## 5. Localization (다국어)

### 📁 위치

- **Astrology**: `src/lib/astrology/localization.ts`
- **Constants**: `src/components/astrology/constants.ts`

### 로케일 정규화

```typescript
import { normalizeLocale, pickLabels } from '@/lib/astrology/localization'

const locale = normalizeLocale('ko-KR') // "ko"
const labels = pickLabels('ko')
// { title: "기본 천궁도 요약", asc: "상승점", ... }
```

### 별자리/행성 다국어

```typescript
import {
  localizeSignLabel,
  localizePlanetLabel,
  getOriginalPlanetName,
} from '@/lib/astrology/localization'

// 별자리 번역
const sign = localizeSignLabel('Aries', 'ko') // "양자리"

// 행성 번역
const planet = localizePlanetLabel('Sun', 'ko') // "태양"

// 역번역 (한국어 → 영어)
const original = getOriginalPlanetName('태양') // "Sun"
```

### 시간 파싱

```typescript
import { parseHM } from '@/lib/astrology/localization'

const { h, m } = parseHM('3:30 PM') // { h: 15, m: 30 }
const { h, m } = parseHM('15:30') // { h: 15, m: 30 }
```

---

## 🎯 빠른 참조

### 새 API 라우트 만들 때

```typescript
import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAstrologyGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
} from '@/lib/api/middleware'
import { validateRequestBody, astrologyRequestSchema } from '@/lib/api/zodValidation'
import { sanitizeHtml } from '@/lib/api/sanitizers'

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    // 1. 입력 검증
    const validation = await validateRequestBody(req, astrologyRequestSchema)
    if (!validation.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid input', { errors: validation.errors })
    }

    // 2. Sanitization
    const cleanInput = sanitizeHtml(validation.data.userInput)

    // 3. 비즈니스 로직
    const result = await processData(cleanInput, context.userId)

    // 4. 성공 응답
    return apiSuccess({ data: result })
  },
  createAstrologyGuard() // Rate limit, auth, credits 자동 처리
)
```

### 날짜 처리할 때

```typescript
import { formatRelativeDate, calculateAge, addDays } from '@/lib/utils/date'

// UI에 표시
const display = formatRelativeDate(dateStr, { locale: 'ko' })

// 나이 계산
const age = calculateAge(birthDate)

// 날짜 연산
const deadline = addDays(new Date(), 7)
```

### 에러 처리할 때

```typescript
import { sanitizeError } from '@/lib/security/errorSanitizer'
import { apiError, ErrorCodes } from '@/lib/api/middleware'

try {
  // ...
} catch (error) {
  const safe = sanitizeError(error, 'database')
  return apiError(ErrorCodes.INTERNAL_ERROR, safe.error, { hint: safe.hint })
}
```

---

## 📝 마이그레이션 가이드

### 기존 코드를 새 유틸리티로 변경

**Before:**

```typescript
// ❌ 중복 코드
const date = new Date(dateStr)
const today = new Date()
if (dateStr === today.toISOString().split('T')[0]) {
  return 'Today'
}
return date.toLocaleDateString('ko-KR')
```

**After:**

```typescript
// ✅ 중앙화된 유틸리티 사용
import { formatRelativeDate } from '@/lib/utils/date'
return formatRelativeDate(dateStr, { locale: 'ko' })
```

---

## 🔗 관련 문서

- API Middleware 상세: `src/lib/api/README.md`
- 보안 가이드: `docs/SECURITY.md`
- 테스트 작성: `tests/README.md`

---

## 💡 팁

1. **Zod 검증을 우선 사용하세요** - 타입 안전성과 더 나은 에러 메시지 제공
2. **sanitizeHtml()을 항상 사용하세요** - 사용자 입력을 저장/표시하기 전
3. **withApiMiddleware()를 사용하세요** - Rate limiting, auth, credits가 자동 처리됨
4. **날짜는 ISO 형식으로 저장하세요** - `formatDateToISO()` 사용
5. **에러는 항상 sanitize하세요** - 민감 정보 유출 방지

---

**마지막 업데이트**: 2024-01-29
**유지보수**: 새로운 유틸리티 추가 시 이 문서도 업데이트하세요
