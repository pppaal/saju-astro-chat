# PostgreSQL 로컬 설정 가이드

## 1. PostgreSQL 설치 (선택)

### Option A: Chocolatey 사용 (관리자 PowerShell)
```powershell
choco install postgresql -y
```

### Option B: 수동 설치
https://www.postgresql.org/download/windows/ 에서 다운로드

### Option C: Docker 사용 (가장 빠름)
```bash
docker run --name saju-postgres -e POSTGRES_PASSWORD=localdev123 -e POSTGRES_DB=saju_astro_chat -p 5432:5432 -d postgres:16
```

## 2. 데이터베이스 생성 (PostgreSQL 설치 후)

```bash
# PostgreSQL 서비스 확인
psql --version

# 데이터베이스 생성
createdb -U postgres saju_astro_chat
```

## 3. 환경 변수 업데이트

.env.local 파일을 다음과 같이 수정:

```
DATABASE_URL="postgresql://postgres:localdev123@localhost:5432/saju_astro_chat"
DIRECT_DATABASE_URL="postgresql://postgres:localdev123@localhost:5432/saju_astro_chat"
```

## 4. Prisma 마이그레이션

```bash
npx prisma migrate dev
npx prisma generate
```

## 5. 개발 서버 재시작

```bash
npm run dev
```
