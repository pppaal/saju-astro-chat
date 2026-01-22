# 🧪 Integration 테스트 설정 가이드

Integration 테스트는 **실제 PostgreSQL 데이터베이스**를 사용하여 시스템 전체를 테스트합니다.

## 🚀 Supabase로 테스트 DB 설정 (권장)

### 1단계: Supabase 테스트 프로젝트 생성

1. **[Supabase Dashboard](https://app.supabase.com)** 접속
2. **"New Project"** 클릭
3. 프로젝트 설정:
   - **Name**: `saju-astro-test` (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 설정
   - **Region**: Seoul (`ap-northeast-2`) 또는 Tokyo (`ap-northeast-1`) 권장
4. **Create new project** 클릭 (생성에 1-2분 소요)

### 2단계: 연결 문자열 복사

프로젝트가 생성되면:

1. 왼쪽 사이드바에서 **⚙️ Settings** 클릭
2. **Database** 메뉴 선택
3. **Connection string** 섹션으로 스크롤
4. **Connection pooling** 탭 선택 (기본은 Direct connection)
5. **Mode**: `Transaction` 선택 (중요!)
6. 연결 문자열 복사 버튼 클릭

연결 문자열 예시:
```
postgresql://postgres.abcdefghijk:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**⚠️ 주의**: `[YOUR-PASSWORD]` 부분은 자동으로 채워지지 않습니다. 프로젝트 생성 시 설정한 비밀번호로 **수동으로 교체**하세요!

### 3단계: 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들거나 수정:

```bash
# Integration Test Database (Supabase)
TEST_DATABASE_URL=postgresql://postgres.abcdefghijk:YOUR_ACTUAL_PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**교체할 부분**:
- `YOUR_ACTUAL_PASSWORD`: Supabase 프로젝트 생성 시 설정한 실제 비밀번호

**확인 방법**:
```powershell
# PowerShell에서 확인
$env:TEST_DATABASE_URL = "postgresql://..."  # .env.local의 값 복사
echo $env:TEST_DATABASE_URL
```

### 4단계: 테스트 DB 스키마 생성

데이터베이스에 Prisma 스키마를 마이그레이션:

**Windows PowerShell**:
```powershell
.\scripts\setup-test-db.ps1
```

**Linux/Mac Bash**:
```bash
bash scripts/setup-test-db.sh
```

**수동 실행** (위 스크립트가 작동하지 않을 경우):
```bash
# DATABASE_URL을 임시로 TEST_DATABASE_URL로 설정
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npx prisma migrate deploy
```

예상 출력:
```
🔧 Setting up test database schema...
📍 Database: postgresql://postgres.xxxxx:...
📦 Running Prisma migrations...
✅ Test database schema is ready!
```

### 5단계: Integration 테스트 실행

```bash
npm run test:integration
```

성공 시 출력:
```
✓ tests/integration/circuitBreaker.test.ts (8 tests)
✓ tests/integration/compatibility-analysis.test.ts (11 tests)
✓ tests/integration/credits.test.ts (20 tests)
✓ tests/integration/fortune-reading.test.ts (12 tests)
✓ tests/integration/saju-analysis.test.ts (10 tests)
✓ tests/integration/security.test.ts (8 tests)
✓ tests/integration/subscription-premium.test.ts (19 tests)
✓ tests/integration/user-crud.test.ts (15 tests)

Test Files  8 passed (8)
Tests  103 passed (103)
```

---

## 🐛 트러블슈팅

### ❌ "TEST_DATABASE_URL must be set"

**원인**: 환경 변수가 설정되지 않음

**해결**:
1. `.env.local` 파일이 존재하는지 확인
2. `TEST_DATABASE_URL`이 올바르게 설정되었는지 확인
3. PowerShell을 재시작하고 다시 시도

### ❌ "connect ECONNREFUSED"

**원인**: 데이터베이스에 연결할 수 없음

**해결**:
1. Supabase 프로젝트가 **활성 상태**인지 확인 (일시 중지되지 않음)
2. 연결 문자열에 **비밀번호**가 올바르게 입력되었는지 확인
3. **Connection pooling** URL을 사용했는지 확인 (포트 6543)
4. 방화벽/VPN 설정 확인

### ❌ "relation does not exist" 또는 "Table doesn't exist"

**원인**: 데이터베이스 스키마가 생성되지 않음

**해결**:
```powershell
.\scripts\setup-test-db.ps1
```

### ❌ "password authentication failed"

**원인**: 비밀번호가 틀림

**해결**:
1. Supabase Dashboard → Settings → Database에서 비밀번호 재설정
2. 새 비밀번호로 `.env.local` 업데이트

---

## 🔒 보안 주의사항

### ⛔ 절대 하지 말아야 할 것

1. **프로덕션 DB로 테스트 실행 금지**
   ```bash
   # ❌ 절대 이렇게 하지 마세요!
   TEST_DATABASE_URL=$DATABASE_URL npm run test:integration
   ```

2. **TEST_DATABASE_URL을 Git에 커밋 금지**
   - `.env.local`은 이미 `.gitignore`에 포함되어 있음
   - 절대로 `.env` 파일에 실제 DB URL을 넣지 마세요

3. **테스트 DB와 프로덕션 DB를 같은 프로젝트에 두지 마세요**
   - 항상 **별도의 Supabase 프로젝트** 사용

### ✅ 안전한 사용법

1. **테스트 전용 Supabase 프로젝트 생성**
2. **강력한 비밀번호 사용**
3. **테스트 DB 접근 권한 제한** (팀원만)
4. **CI/CD에서는 GitHub Secrets 사용**

---

## 📊 테스트 파일 설명

| 파일 | 테스트 내용 | 테스트 수 |
|------|------------|-----------|
| `user-crud.test.ts` | 유저 CRUD 작업 | 15개 |
| `credits.test.ts` | 크레딧 시스템 (초기화, 사용, 리셋) | 20개 |
| `subscription-premium.test.ts` | 구독 및 프리미엄 기능 | 19개 |
| `compatibility-analysis.test.ts` | 궁합 분석 플로우 | 11개 |
| `fortune-reading.test.ts` | 운세 읽기 | 12개 |
| `saju-analysis.test.ts` | 사주 분석 | 10개 |
| `security.test.ts` | 보안 검증 | 8개 |
| `circuitBreaker.test.ts` | Circuit breaker 패턴 | 8개 |
| **합계** | | **103개** |

---

## 💡 추가 정보

### 테스트 데이터 자동 정리

Integration 테스트는 자동으로 테스트 데이터를 생성하고 정리합니다:
- `beforeEach`: 테스트용 유저/데이터 생성
- `afterEach`: 생성된 데이터 자동 삭제
- 실패한 테스트의 데이터도 정리됨

### 선택적 테스트 실행

특정 파일만 테스트:
```bash
npm run test:integration -- user-crud.test.ts
```

특정 테스트만 실행:
```bash
npm run test:integration -- -t "should create user"
```

### CI/CD 설정

GitHub Actions에서 실행하려면:

1. **Repository Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭
3. Name: `TEST_DATABASE_URL`
4. Value: Supabase 테스트 DB URL
5. **Add secret** 클릭

---

## 📚 관련 문서

- [Integration Tests README](./tests/integration/README.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vitest Documentation](https://vitest.dev/)

---

## ✅ 체크리스트

설정이 완료되었는지 확인:

- [ ] Supabase 테스트 프로젝트 생성됨
- [ ] Connection string 복사됨 (Connection pooling, Transaction mode)
- [ ] `.env.local`에 `TEST_DATABASE_URL` 설정됨
- [ ] 비밀번호가 올바르게 입력됨
- [ ] `.\scripts\setup-test-db.ps1` 실행 완료
- [ ] `npm run test:integration` 성공

모든 체크박스가 완료되면 Integration 테스트를 사용할 준비가 끝났습니다! 🎉
