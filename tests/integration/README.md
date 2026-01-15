# Integration Tests

Integration 테스트는 **실제 데이터베이스**를 사용하여 전체 시스템의 동작을 검증합니다.

## 📋 테스트 파일 목록

| 파일 | 테스트 내용 |
|------|------------|
| `user-crud.test.ts` | 유저 생성/읽기/수정/삭제 |
| `credits.test.ts` | 크레딧 시스템 (초기화, 사용, 리셋) |
| `subscription-premium.test.ts` | 구독 및 프리미엄 기능 |
| `compatibility-analysis.test.ts` | 궁합 분석 전체 플로우 |
| `fortune-reading.test.ts` | 운세 읽기 |
| `saju-analysis.test.ts` | 사주 분석 |
| `security.test.ts` | 보안 검증 |
| `circuitBreaker.test.ts` | Circuit breaker 패턴 |

## 🚀 빠른 시작

### 1. Supabase 테스트 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 이름: `saju-astro-test` (권장)
4. 비밀번호 설정 및 리전 선택 (Seoul/Tokyo 권장)

### 2. 연결 문자열 가져오기

1. Supabase 프로젝트에서 **Settings** → **Database**
2. **Connection string** 섹션
3. **Connection pooling** 탭 선택
4. **Mode**: Transaction 선택
5. 연결 문자열 복사

### 3. 환경 변수 설정

`.env.local` 파일에 추가:

```bash
# Integration Test Database
TEST_DATABASE_URL=postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 4. 테스트 DB 스키마 생성

**Windows (PowerShell):**
```powershell
.\scripts\setup-test-db.ps1
```

**Linux/Mac:**
```bash
bash scripts/setup-test-db.sh
```

또는 수동으로:
```bash
# .env.local에서 TEST_DATABASE_URL 로드
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
```

### 5. 테스트 실행

```bash
npm run test:integration
```

## 🔍 테스트 작동 방식

### 자동 테스트 데이터 관리

Integration 테스트는 자동으로 테스트 데이터를 생성하고 정리합니다:

```typescript
import { createTestUserInDb, cleanupTestUser } from './setup';

test('should create user', async () => {
  // 1. 테스트 유저 생성
  const user = await createTestUserInDb({
    name: 'Test User',
    email: 'test@example.com'
  });

  // 2. 테스트 실행
  expect(user.id).toBeDefined();

  // 3. 자동 정리 (afterEach에서)
  await cleanupTestUser(user.id);
});
```

### 사용 가능한 헬퍼 함수

```typescript
// 유저 생성
const user = await createTestUserInDb({ name: 'Test' });

// 구독 생성
const sub = await createTestSubscription(user.id, 'premium', 'active');

// 크레딧 생성
const credits = await createTestUserCredits(user.id, 'pro');

// 테스트 유저 추적 (자동 정리용)
trackTestUser(user.id);

// 수동 정리
await cleanupTestUser(user.id);
await cleanupAllTestUsers();
```

## ⚠️ 주의사항

### 1. 프로덕션 DB 사용 금지
**절대로** 프로덕션 데이터베이스로 Integration 테스트를 실행하지 마세요!
- ❌ `DATABASE_URL=프로덕션_URL npm run test:integration`
- ✅ `TEST_DATABASE_URL=테스트_URL npm run test:integration`

### 2. 테스트 격리
각 테스트는 독립적으로 실행됩니다:
- `beforeEach`: 테스트 데이터 생성
- `afterEach`: 테스트 데이터 삭제
- 병렬 실행 시 충돌 방지를 위해 고유 ID 사용

### 3. DB 연결 한도
Supabase Free Tier는 동시 연결 수가 제한되어 있습니다:
- Connection pooling 사용 권장 (이미 설정됨)
- 테스트 후 연결 정리 자동 수행

## 🐛 트러블슈팅

### "TEST_DATABASE_URL must be set" 에러
```bash
# .env.local 파일 확인
cat .env.local | grep TEST_DATABASE_URL

# 환경 변수 수동 설정 (임시)
export TEST_DATABASE_URL=postgresql://...
npm run test:integration
```

### "Connection timeout" 에러
1. Supabase 프로젝트가 활성화되어 있는지 확인
2. 방화벽/VPN 설정 확인
3. Connection string이 올바른지 확인 (pooler 포트: 6543)

### "Table doesn't exist" 에러
스키마 마이그레이션이 필요합니다:
```bash
.\scripts\setup-test-db.ps1  # Windows
bash scripts/setup-test-db.sh  # Linux/Mac
```

### 테스트 실패 후 데이터 남아있음
수동으로 모든 테스트 데이터 삭제:
```sql
-- Supabase SQL Editor에서 실행
DELETE FROM "User" WHERE id LIKE 'test_%';
```

## 📊 CI/CD에서 실행

GitHub Actions에서 Integration 테스트를 실행하려면:

```yaml
# .github/workflows/test-integration.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        env:
          TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
        run: npm run test:integration
```

**GitHub Secrets 설정**:
1. Repository Settings → Secrets → Actions
2. `TEST_DATABASE_URL` 추가

## 📈 성능 최적화

Integration 테스트는 실제 DB를 사용하므로 상대적으로 느립니다:

| 전략 | 설명 |
|------|------|
| **선택적 실행** | 필요한 테스트만 실행: `npm run test:integration -- user-crud.test.ts` |
| **병렬 실행** | Vitest는 기본적으로 병렬 실행 (격리 보장) |
| **테스트 분류** | Critical/Non-critical로 나누어 CI에서 단계별 실행 |

## 🔗 관련 문서

- [Unit Tests](../README.md)
- [E2E Tests](../e2e/README.md)
- [Performance Tests](../performance/README.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
