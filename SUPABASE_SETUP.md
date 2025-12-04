# Supabase + Prisma Setup Guide

이 가이드는 Supabase PostgreSQL 데이터베이스를 Prisma와 연결하는 방법을 설명합니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입/로그인
2. 새 프로젝트 생성
3. 데이터베이스 비밀번호 설정 (안전하게 보관!)
4. 리전 선택 (Seoul 추천)
5. 프로젝트 생성 완료 대기 (약 2분)

## 2. 데이터베이스 연결 정보 가져오기

1. Supabase 대시보드에서 **Settings** → **Database** 이동
2. **Connection string** 섹션에서 **URI** 복사
3. `[YOUR-PASSWORD]`를 실제 데이터베이스 비밀번호로 교체

예시:
```
postgresql://postgres.xxx:yourpassword@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

## 3. 환경 변수 설정

`.env.local` 파일에 DATABASE_URL 추가:

```bash
# Supabase Database Connection
DATABASE_URL="postgresql://postgres.xxx:yourpassword@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:yourpassword@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

**중요:**
- `DATABASE_URL`: Connection pooling용 (pgbouncer=true)
- `DIRECT_URL`: Migration용 (direct connection)

## 4. Prisma 스키마 업데이트

`prisma/schema.prisma` 파일이 다음과 같이 설정되어 있는지 확인:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

// User model for authentication
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?   // For email/password auth

  // Birth information
  birthDate     String?
  birthTime     String?
  birthCity     String?
  tzId          String?
  gender        String?

  // Relations
  accounts      Account[]
  sessions      Session[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

// NextAuth.js models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

## 5. 데이터베이스 마이그레이션 실행

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 스키마 푸시 (개발용)
npx prisma db push

# 또는 마이그레이션 생성 (프로덕션용)
npx prisma migrate dev --name init
```

## 6. Supabase 대시보드에서 확인

1. Supabase 대시보드 → **Table Editor**
2. 생성된 테이블 확인:
   - `User`
   - `Account`
   - `Session`
   - `VerificationToken`

## 7. 테스트

애플리케이션을 실행하고 회원가입/로그인 테스트:

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/myjourney` 접속하여:
1. 이메일 회원가입
2. Google 로그인
3. Kakao 로그인
4. WeChat 로그인
5. WhatsApp 로그인

## 8. OAuth Provider 설정

### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. OAuth 2.0 Client ID 생성
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`

### Kakao OAuth (카카오 로그인)
1. [Kakao Developers](https://developers.kakao.com/) → 내 애플리케이션 → 애플리케이션 추가
2. 앱 설정 → 플랫폼 → Web 플랫폼 등록
   - 사이트 도메인: `http://localhost:3000`
3. 제품 설정 → 카카오 로그인 → 활성화 설정
4. Redirect URI 등록:
   - `http://localhost:3000/api/auth/callback/kakao`
   - `https://yourdomain.com/api/auth/callback/kakao`
5. 앱 키 복사:
   - REST API 키 → `KAKAO_CLIENT_ID`
   - Client Secret 발급 → `KAKAO_CLIENT_SECRET`

### WeChat OAuth (微信登录)
1. [WeChat Open Platform](https://open.weixin.qq.com/) → 管理中心 → 网站应用
2. 创建网站应用 (Create Web Application)
3. 填写应用信息:
   - 应用名称 (App Name)
   - 应用简介 (App Description)
   - 应用官网 (Website): `https://yourdomain.com`
   - 授权回调域 (Callback Domain): `yourdomain.com`
4. 等待审核通过 (Wait for approval)
5. 获取应用凭证:
   - AppID → `WECHAT_APP_ID`
   - AppSecret → `WECHAT_APP_SECRET`

**주의사항:**
- WeChat OAuth는 웹사이트가 HTTPS로 배포되어야 사용 가능
- 로컬 테스트는 제한적 (중국 본토 서버 권장)
- 개발자 인증 및 기업 인증 필요

### WhatsApp OAuth (via Meta/Facebook)
1. [Meta for Developers](https://developers.facebook.com/) → My Apps → Create App
2. App Type 선택: **Consumer** 또는 **Business**
3. App 정보 입력:
   - App Name
   - Contact Email
4. Dashboard → Settings → Basic:
   - App ID → `WHATSAPP_APP_ID`
   - App Secret → `WHATSAPP_APP_SECRET`
5. Add Product → **WhatsApp** → Set Up
6. Facebook Login 추가:
   - Settings → Valid OAuth Redirect URIs:
     - `http://localhost:3000/api/auth/callback/whatsapp`
     - `https://yourdomain.com/api/auth/callback/whatsapp`

**주의사항:**
- WhatsApp Business API 계정 필요
- 전화번호 인증 및 비즈니스 인증 필요
- 무료 티어는 1,000 conversations/month 제한

## 9. 환경 변수 최종 설정

`.env.local`:

```bash
# Database
DATABASE_URL="your-supabase-connection-string?pgbouncer=true"
DIRECT_URL="your-supabase-direct-connection-string"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-string

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret

WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

WHATSAPP_APP_ID=your-facebook-app-id
WHATSAPP_APP_SECRET=your-facebook-app-secret
```

## 트러블슈팅

### 문제: "Connection refused" 또는 "ECONNREFUSED"
**해결:**
- Supabase 프로젝트가 활성화되어 있는지 확인
- DATABASE_URL이 올바른지 확인
- 방화벽이 PostgreSQL 포트(5432)를 차단하지 않는지 확인

### 문제: "Password authentication failed"
**해결:**
- 데이터베이스 비밀번호 재확인
- 특수문자는 URL 인코딩 필요 (예: `@` → `%40`)

### 문제: "Migration failed"
**해결:**
- `DIRECT_URL` 환경 변수 설정 확인
- `?pgbouncer=true` 제거한 직접 연결 URL 사용

### 문제: "Prisma Client could not be found"
**해결:**
```bash
npm install @prisma/client
npx prisma generate
```

## 추가 기능

### 데이터베이스 스튜디오 실행
```bash
npx prisma studio
```

브라우저에서 `http://localhost:5555`로 데이터베이스 GUI 접속

### 데이터베이스 리셋 (주의!)
```bash
npx prisma migrate reset
```

## 참고 자료

- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)
- [Kakao Developers Guide](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
