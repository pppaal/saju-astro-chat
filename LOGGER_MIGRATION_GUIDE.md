# Logger Migration Guide

Winston 로거로 마이그레이션 가이드입니다.

## ✅ 완료된 작업

1. **Winston 설치 완료**
   ```bash
   npm install winston
   ```

2. **로거 설정 파일 생성** ([src/lib/logger.ts](src/lib/logger.ts))
   - 개발 환경: 콘솔 출력
   - 프로덕션: 파일 로깅 (`logs/error.log`, `logs/combined.log`)
   - 자동 로그 로테이션 (5MB, 최대 5개 파일)

3. **logs 디렉토리 생성 및 .gitignore 추가**

4. **중요 파일 마이그레이션 완료**
   - ✅ [src/app/api/webhook/stripe/route.ts](src/app/api/webhook/stripe/route.ts) (33개 교체)
   - ✅ [src/app/api/checkout/route.ts](src/app/api/checkout/route.ts) (6개 교체)

## 📊 현황

- **총 console.log 개수**: 759개 (186개 파일)
- **교체 완료**: 39개
- **남은 작업**: 720개

## 🔧 사용법

### 기본 사용

```typescript
import { logger } from '@/lib/logger'

// ❌ 기존 방식
console.log('사용자 로그인:', userId)
console.error('에러 발생:', error)
console.warn('경고:', message)

// ✅ 새로운 방식
logger.info('사용자 로그인', { userId })
logger.error('에러 발생', { error: error.message, stack: error.stack })
logger.warn('경고', { message })
```

### 편의 함수 사용

```typescript
import { logInfo, logError, logWarn, logDebug } from '@/lib/logger'

logInfo('작업 완료', { taskId, duration })
logError('처리 실패', error, { userId, action })
logWarn('리소스 부족', { available, required })
logDebug('디버그 정보', { state, context })
```

## 🚀 나머지 파일 마이그레이션 방법

### 방법 1: 자동 스크립트 사용 (권장)

```bash
# 미리보기 (실제로 변경하지 않음)
node scripts/replace-console-logs.mjs --dry-run

# 실제 적용
node scripts/replace-console-logs.mjs
```

**⚠️ 주의사항:**
- 스크립트 실행 후 반드시 변경사항을 검토하세요
- 복잡한 console 문은 수동으로 조정이 필요할 수 있습니다
- Git에 커밋하기 전에 테스트하세요

### 방법 2: 수동 마이그레이션

가장 많은 console.log가 있는 파일부터 우선순위를 두고 처리:

1. **API Routes** (가장 중요)
   - `src/app/api/destiny-map/chat-stream/route.ts` (49개) ⚠️ 최우선
   - `src/app/api/webhook/stripe/route.ts` (33개) ✅ 완료
   - `src/app/api/destiny-map/route.ts` (15개)
   - `src/app/api/saju/route.ts` (15개)
   - `src/app/api/compatibility/route.ts` (9개)

2. **Lib Files** (두 번째 중요)
   - `src/lib/backend-health.ts` (7개)
   - `src/lib/destiny-map/reportService.ts` (8개)
   - `src/lib/destiny-map/astrologyengine.ts` (50개) ⚠️
   - `src/lib/pushNotifications.ts` (19개)

3. **Components** (세 번째)
   - `src/components/destiny-map/Chat.tsx` (24개)
   - `src/components/calendar/DestinyCalendar.tsx` (20개)

### 파일별 처리 순서 추천

```bash
# 1단계: 가장 critical한 API routes
src/app/api/destiny-map/chat-stream/route.ts
src/app/api/saju/route.ts
src/app/api/destiny-map/route.ts

# 2단계: 주요 lib 파일들
src/lib/destiny-map/astrologyengine.ts
src/lib/pushNotifications.ts
src/lib/backend-health.ts

# 3단계: 나머지는 스크립트로 일괄 처리
node scripts/replace-console-logs.mjs
```

## 📝 변환 패턴

### 패턴 1: 간단한 메시지

```typescript
// Before
console.log('User logged in')

// After
logger.info('User logged in')
```

### 패턴 2: 메시지 + 데이터

```typescript
// Before
console.log('Payment processed:', paymentId, amount)

// After
logger.info('Payment processed', { paymentId, amount })
```

### 패턴 3: 에러 로깅

```typescript
// Before
console.error('Payment failed:', error)

// After
logger.error('Payment failed', { error: error.message, stack: error.stack })
// 또는
logError('Payment failed', error, { userId, paymentId })
```

### 패턴 4: 객체 전체 로깅

```typescript
// Before
console.log('User data:', { userId, email, name })

// After
logger.info('User data', { userId, email, name })
```

### 패턴 5: 조건부 로깅

```typescript
// Before
if (DEBUG) {
  console.log('Debug info:', data)
}

// After
logger.debug('Debug info', { data })
// (logger가 자동으로 LOG_LEVEL 환경변수 기반으로 필터링)
```

## 🔍 로그 확인

### 개발 환경
콘솔에서 실시간으로 확인 가능

### 프로덕션 환경
```bash
# 에러 로그 확인
tail -f logs/error.log

# 전체 로그 확인
tail -f logs/combined.log

# 특정 시간대 로그 검색
grep "2024-01-05" logs/combined.log

# JSON 형식으로 파싱
cat logs/combined.log | jq '.'
```

## 🎯 우선순위

1. **High Priority** (즉시 처리 필요)
   - ✅ Stripe webhook (보안/결제 관련)
   - ✅ Checkout API (결제 처리)
   - ⚠️ destiny-map/chat-stream (49개 - 가장 많음)
   - ⚠️ destiny-map/astrologyengine (50개 - lib 중 가장 많음)

2. **Medium Priority** (점진적 처리)
   - API routes (100+ occurrences)
   - Core lib files
   - Error handling utilities

3. **Low Priority** (나중에 처리)
   - UI Components (개발 중에만 보는 로그가 많음)
   - Test files
   - Admin pages

## ⚙️ 환경 변수

`.env` 파일에 추가 (선택사항):

```bash
# 로그 레벨 설정 (error, warn, info, debug)
LOG_LEVEL=info

# 프로덕션에서는 error만
# LOG_LEVEL=error
```

## 🧪 테스트

마이그레이션 후 확인사항:

```bash
# 1. TypeScript 컴파일 확인
npm run build

# 2. 개발 서버 실행
npm run dev

# 3. 주요 기능 테스트
# - 로그인/회원가입
# - 결제 플로우
# - API 호출

# 4. 로그 파일 생성 확인
ls -la logs/
```

## 📚 참고 자료

- [Winston 공식 문서](https://github.com/winstonjs/winston)
- [Winston Best Practices](https://github.com/winstonjs/winston/blob/master/docs/transports.md)

## ❓ 문제 해결

### 문제: TypeScript 에러 - logger를 찾을 수 없음

```typescript
// 해결: import 추가
import { logger } from '@/lib/logger'
```

### 문제: 로그 파일이 생성되지 않음

```bash
# 해결: logs 디렉토리 생성
mkdir logs
```

### 문제: 프로덕션에서 로그가 너무 많음

```bash
# 해결: LOG_LEVEL을 error로 설정
LOG_LEVEL=error
```

## 📋 체크리스트

마이그레이션 완료 후 확인:

- [ ] Winston 설치됨
- [ ] logger.ts 파일 생성됨
- [ ] logs/ 디렉토리가 .gitignore에 추가됨
- [ ] 중요 API routes 마이그레이션 완료
- [ ] 빌드 성공
- [ ] 개발 서버에서 로그 정상 출력
- [ ] 프로덕션 환경에서 파일 로깅 확인
- [ ] 기존 기능 정상 동작 확인

---

**다음 단계**:
1. 스크립트로 나머지 파일 일괄 처리: `node scripts/replace-console-logs.mjs`
2. 변경사항 검토 및 테스트
3. Git 커밋 및 배포
