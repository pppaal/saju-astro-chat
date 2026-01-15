# 🧪 Testing Guide

사주 점성 챗봇 프로젝트의 전체 테스트 구조와 실행 방법입니다.

## 📊 테스트 구조 개요

| 테스트 타입 | 명령어 | 실행 환경 | 테스트 수 | 소요 시간 |
|------------|--------|-----------|-----------|-----------|
| **Unit** | `npm test` | 로컬 | 7,700+ | ~2분 |
| **Integration** | `npm run test:integration` | DB 필요 | 100+ | ~30초 |
| **E2E (API)** | `npm run test:e2e:api` | 서버 필요 | 20+ | ~1분 |
| **E2E (Browser)** | `npm run test:e2e:browser` | 서버 필요 | 10+ | ~2분 |
| **Performance** | `npm run test:performance` | 서버 필요 | 15+ | ~5분 |

---

## 🎯 1. Unit Tests (단위 테스트)

### 목적
개별 함수와 모듈의 로직을 격리하여 테스트

### 실행 방법
```bash
# 전체 실행
npm test

# Watch 모드 (개발 중)
npm run test:watch

# 커버리지 포함
npm run test:coverage

# 특정 파일만
npm test -- saju-calculation.test.ts

# 특정 테스트만
npm test -- -t "should calculate pillars"
```

### 주요 테스트 파일
```
tests/
├── saju-calculation.test.ts         # 사주 계산 로직
├── compatibilityEngine.test.ts      # 궁합 엔진
├── creditService.test.ts            # 크레딧 시스템
├── report-helpers.test.ts           # 리포트 헬퍼
├── lib/
│   ├── Saju/                        # 사주 관련
│   ├── Tarot/                       # 타로 관련
│   ├── destiny-map/                 # 운명 지도
│   └── astrology/                   # 점성학
└── ...
```

### 특징
- ✅ DB 연결 불필요 (모킹 사용)
- ✅ 빠른 실행 속도
- ✅ 병렬 실행
- ✅ 개발 중 즉시 피드백

---

## 🔗 2. Integration Tests (통합 테스트)

### 목적
실제 데이터베이스와 연동하여 시스템 전체 흐름 검증

### 필수 요구사항
- PostgreSQL 데이터베이스 (Supabase 권장)
- `TEST_DATABASE_URL` 환경 변수 설정

### 설정 방법
**자세한 가이드**: [INTEGRATION_TEST_SETUP.md](./INTEGRATION_TEST_SETUP.md)

간단 요약:
```bash
# 1. Supabase 테스트 프로젝트 생성
# 2. .env.local에 추가
TEST_DATABASE_URL=postgresql://...

# 3. 스키마 마이그레이션
.\scripts\setup-test-db.ps1  # Windows
bash scripts/setup-test-db.sh  # Linux/Mac

# 4. 테스트 실행
npm run test:integration
```

### 테스트 파일
```
tests/integration/
├── user-crud.test.ts                # 유저 CRUD
├── credits.test.ts                  # 크레딧 시스템
├── subscription-premium.test.ts     # 구독/프리미엄
├── compatibility-analysis.test.ts   # 궁합 분석
├── fortune-reading.test.ts          # 운세 읽기
├── saju-analysis.test.ts            # 사주 분석
├── security.test.ts                 # 보안 검증
└── circuitBreaker.test.ts           # Circuit breaker
```

### 특징
- ⚠️ 실제 DB 연결 필요
- ✅ 전체 플로우 검증
- ✅ 자동 데이터 생성/정리
- ⚠️ 프로덕션 DB 사용 금지!

---

## 🌐 3. E2E Tests (End-to-End 테스트)

### 3-1. E2E API Tests

실제 서버 API 엔드포인트 테스트

```bash
# 1. 서버 실행
npm run dev

# 2. 별도 터미널에서 테스트
npm run test:e2e:api
```

**테스트 파일**:
```
tests/e2e/
├── api-smoke.test.ts      # API 기본 동작
├── auth-flow.test.ts      # 인증 플로우
└── auth-session.test.ts   # 세션 관리
```

### 3-2. E2E Browser Tests (Playwright)

실제 브라우저에서 UI 테스트

```bash
# Headless 모드
npm run test:e2e:browser

# UI 모드 (디버깅)
npm run test:e2e:browser:ui

# 브라우저 보기
npm run test:e2e:browser:headed

# 특정 테스트만
npm run test:e2e:browser -- auth.spec.ts
```

**테스트 파일**:
```
e2e/
├── auth.spec.ts           # 인증 플로우
├── reading.spec.ts        # 운세 읽기
├── compatibility.spec.ts  # 궁합 분석
└── ...
```

### 특징
- ⚠️ 서버 실행 필요
- ✅ 실제 사용자 시나리오 검증
- ✅ 크로스 브라우저 테스트
- ✅ 스크린샷/비디오 기록

---

## ⚡ 4. Performance Tests (성능 테스트)

### 목적
API 응답 시간, 처리량, 병목 현상 측정

### 실행 방법

**기본 성능 테스트**:
```bash
# 1. 서버 실행
npm run dev

# 2. 성능 테스트
npm run test:performance
```

**부하 테스트 (K6)**:
```bash
# 기본 부하
npm run test:load:basic

# 스트레스 테스트
npm run test:load:stress

# 급증 테스트
npm run test:load:spike

# 장시간 테스트
npm run test:load:endurance
```

### 테스트 파일
```
tests/performance/
├── api-endpoints.test.ts      # API 응답 시간
├── k6/
│   ├── basic-load.js          # 기본 부하
│   ├── stress-test.js         # 스트레스
│   ├── spike-test.js          # 급증
│   └── endurance-test.js      # 장시간
└── README.md
```

### 특징
- ⚠️ 서버 실행 필요
- ✅ 응답 시간 측정
- ✅ 처리량 측정
- ✅ 병목 현상 식별

---

## 🛡️ 5. Security Tests (보안 테스트)

### OWASP ZAP 스캔

```bash
# 서버 실행 필요
npm run security:owasp
```

웹 애플리케이션 보안 취약점 스캔:
- SQL Injection
- XSS (Cross-Site Scripting)
- CSRF
- 기타 OWASP Top 10 취약점

---

## 📋 테스트 실행 체크리스트

### 개발 중 (로컬)
```bash
# 코드 변경 시마다 자동 실행
npm run test:watch
```

### Pull Request 전
```bash
# 1. 전체 Unit 테스트
npm test

# 2. 타입 체크
npm run typecheck

# 3. 린트
npm run lint

# 4. (선택) Integration 테스트
npm run test:integration
```

### 배포 전
```bash
# 1. 전체 테스트
npm test
npm run test:integration

# 2. E2E 테스트
npm run test:e2e:browser

# 3. 성능 테스트
npm run test:performance

# 4. 보안 스캔
npm run security:owasp
```

---

## 🎯 테스트 작성 가이드

### Unit Test 예시

```typescript
// tests/myFeature.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/myFeature';

describe('myFeature', () => {
  it('should return correct result', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Integration Test 예시

```typescript
// tests/integration/myFeature.test.ts
import { describe, it, expect } from 'vitest';
import { createTestUserInDb, cleanupTestUser } from './setup';

describe('My Feature Integration', () => {
  it('should work with real database', async () => {
    // 테스트 유저 생성
    const user = await createTestUserInDb();

    // 테스트 실행
    const result = await someDbOperation(user.id);
    expect(result).toBeDefined();

    // 정리 (자동으로도 됨)
    await cleanupTestUser(user.id);
  });
});
```

---

## 🐛 트러블슈팅

### "Cannot find module '@/lib/...'"

**원인**: TypeScript path alias 설정 문제

**해결**:
```bash
# tsconfig.json 확인
# vitest.config.ts의 resolve.alias 확인
```

### "Database connection failed"

**원인**: Integration 테스트에서 DB 연결 실패

**해결**:
1. `.env.local`에 `TEST_DATABASE_URL` 설정 확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. [INTEGRATION_TEST_SETUP.md](./INTEGRATION_TEST_SETUP.md) 참고

### "Port already in use"

**원인**: 서버가 이미 실행 중

**해결**:
```bash
# 기존 프로세스 종료 후 다시 시작
npm run dev
```

---

## 📚 관련 문서

- [Integration Test Setup](./INTEGRATION_TEST_SETUP.md)
- [Integration Tests README](./tests/integration/README.md)
- [Performance Tests README](./tests/performance/README.md)
- [E2E Tests README](./e2e/README.md)

---

## 🎓 Best Practices

### ✅ DO (해야 할 것)

1. **작은 단위로 테스트 작성**
   - 한 테스트에서 한 가지만 검증
   - 테스트 이름은 명확하게

2. **테스트 격리**
   - 각 테스트는 독립적으로 실행 가능
   - 테스트 간 의존성 없음

3. **의미 있는 Assertion**
   ```typescript
   // ❌ 나쁜 예
   expect(result).toBeTruthy();

   // ✅ 좋은 예
   expect(result.userId).toBe('test_123');
   expect(result.credits).toBeGreaterThan(0);
   ```

4. **테스트 데이터 정리**
   - Integration 테스트에서 생성한 데이터는 반드시 정리
   - `afterEach` 또는 `cleanup` 함수 사용

### ❌ DON'T (하지 말아야 할 것)

1. **프로덕션 DB로 테스트 실행 금지**
   ```bash
   # ❌ 절대 금지!
   TEST_DATABASE_URL=$PRODUCTION_DB npm run test:integration
   ```

2. **테스트에서 실제 API 키 사용 금지**
   - 모킹 사용
   - 또는 테스트 전용 API 키

3. **느린 테스트**
   - Unit 테스트는 1초 이내
   - setTimeout 사용 지양

4. **테스트 코드 중복**
   - Helper 함수 활용
   - Setup 함수 재사용

---

## 📈 커버리지 목표

| 타입 | 목표 | 현재 |
|------|------|------|
| Lines | 5% | 4.5% |
| Functions | 5% | 4.2% |
| Branches | 4% | 3.2% |
| Statements | 5% | 4.5% |

```bash
# 커버리지 확인
npm run test:coverage
```

---

**Happy Testing! 🎉**
