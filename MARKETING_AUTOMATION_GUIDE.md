# 🚀 바이럴 마케팅 자동화 가이드

DestinyPal 프로젝트의 자동 마케팅 시스템 설정 및 사용 가이드입니다.

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [설치 및 설정](#설치-및-설정)
3. [Instagram API 설정](#instagram-api-설정)
4. [Replicate AI 설정](#replicate-ai-설정)
5. [자동화 실행](#자동화-실행)
6. [모니터링](#모니터링)

---

## 🎯 시스템 개요

### 주요 기능

✅ **매일 자동 운세 생성** - 12별자리 운세 자동 생성
✅ **AI 이미지 생성** - Replicate SDXL로 고품질 이미지 생성
✅ **Instagram 자동 포스팅** - 피드 + 스토리 자동 업로드
✅ **Twitter 지원** - 트위터 자동 포스팅 (선택사항)
✅ **스케줄링** - Cron Job으로 매일 정해진 시간에 자동 실행

### 작동 방식

```
[매일 오전 9시]
    ↓
1️⃣ 12별자리 운세 생성 (날짜 기반 시드)
    ↓
2️⃣ Replicate AI로 이미지 생성 (별자리별 테마)
    ↓
3️⃣ Instagram API로 포스팅 (피드 + 스토리)
    ↓
4️⃣ Twitter API로 트윗 (선택사항)
    ↓
5️⃣ 데이터베이스에 기록 저장
    ↓
✅ 완료! 12개 포스트 자동 생성됨
```

---

## 🛠️ 설치 및 설정

### 1. 환경변수 설정

`.env.marketing.example` 파일을 복사하여 `.env.local`에 추가:

```bash
# .env.local에 추가
REPLICATE_API_TOKEN=r8_xxx...
INSTAGRAM_ACCESS_TOKEN=IGQxxx...
INSTAGRAM_ACCOUNT_ID=17841xxx...
```

### 2. 필요한 패키지 확인

이미 `package.json`에 포함되어 있어야 합니다:

```json
{
  "dependencies": {
    "replicate": "^1.3.0"
  }
}
```

설치:
```bash
npm install
```

---

## 📸 Instagram API 설정

### 단계별 가이드

#### Step 1: Facebook 앱 생성

1. [Facebook Developers](https://developers.facebook.com/apps/) 접속
2. "앱 만들기" 클릭
3. 앱 유형: "비즈니스" 선택
4. 앱 이름: "DestinyPal Marketing Bot"
5. 앱 생성 완료

#### Step 2: Instagram Business 계정 준비

Instagram 계정이 **비즈니스 계정**이어야 합니다:

1. Instagram 앱에서 설정 → 계정
2. "프로페셔널 계정으로 전환"
3. 카테고리 선택: "크리에이터" 또는 "비즈니스"
4. Facebook 페이지와 연결

#### Step 3: Instagram API 추가

1. Facebook 앱 대시보드에서 "제품 추가"
2. **Instagram** 선택 → "설정" 클릭
3. 권한 요청:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_show_list`

#### Step 4: Access Token 발급

1. 대시보드 → 도구 → 그래프 API 탐색기
2. 애플리케이션 선택
3. 권한 추가 (위 4개 권한)
4. "액세스 토큰 생성" 클릭
5. **User Access Token** 복사

⚠️ **중요**: User Access Token은 60일 후 만료됩니다.
→ 장기 토큰으로 변환 필요:

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

#### Step 5: Instagram Account ID 확인

```bash
curl -X GET "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_ACCESS_TOKEN"
```

응답에서 Instagram Business Account ID 확인:
```json
{
  "instagram_business_account": {
    "id": "17841234567890"
  }
}
```

---

## 🎨 Replicate AI 설정

### 1. Replicate 계정 생성

1. [Replicate](https://replicate.com/) 접속
2. 회원가입 (GitHub 계정으로 간편 가입)
3. 무료 크레딧: 월 $5 (약 50회 이미지 생성)

### 2. API 토큰 발급

1. [Account Settings](https://replicate.com/account/api-tokens) 이동
2. "Create token" 클릭
3. 토큰 이름: "DestinyPal Auto-Post"
4. 토큰 복사 → `.env.local`에 추가

### 3. 비용 계산

- **SDXL 모델**: ~$0.04/회 (1장 생성)
- 12별자리 × 1회 = $0.48/일
- 월간 비용: **약 $14.4** (한화 약 20,000원)

💡 **비용 절감 팁**:
- 한 번 생성한 이미지를 재사용
- 주 3회만 자동 포스팅 (월~수~금)
- Flux Schnell 모델 사용 (더 저렴)

---

## ⚙️ 자동화 실행

### 방법 1: 수동 실행 (테스트용)

```bash
node scripts/auto-post-daily-fortune.mjs
```

### 방법 2: Vercel Cron (추천)

`vercel.json`에 추가:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-fortune-post",
      "schedule": "0 9 * * *"
    }
  ]
}
```

API Route 생성: `src/app/api/cron/daily-fortune-post/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  // Vercel Cron 인증 헤더 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { stdout, stderr } = await execAsync('node scripts/auto-post-daily-fortune.mjs');

    return NextResponse.json({
      success: true,
      output: stdout,
      errors: stderr || null,
    });
  } catch (error) {
    console.error('[Cron Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

`.env.local`에 추가:
```bash
CRON_SECRET=your_random_secret_here
```

### 방법 3: GitHub Actions

`.github/workflows/daily-fortune-post.yml` 생성:

```yaml
name: Daily Fortune Auto-Post

on:
  schedule:
    - cron: '0 0 * * *'  # 매일 UTC 00:00 (한국 시간 09:00)
  workflow_dispatch:  # 수동 실행 허용

jobs:
  post:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run auto-post script
        env:
          REPLICATE_API_TOKEN: ${{ secrets.REPLICATE_API_TOKEN }}
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
          INSTAGRAM_ACCOUNT_ID: ${{ secrets.INSTAGRAM_ACCOUNT_ID }}
        run: node scripts/auto-post-daily-fortune.mjs
```

GitHub Secrets에 환경변수 추가:
1. Repository → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. 위 3개 환경변수 추가

---

## 📊 모니터링

### 포스팅 로그 확인

스크립트 실행 시 콘솔에 출력:

```
🔮 Daily Fortune Auto-Post Starting...
📅 Date: 2025-12-30

🌟 Processing ♈ 양자리...
  📊 Scores: Overall 78, Love 85, Career 72
  🎨 Generating AI image for 양자리...
  ✅ Image generated: https://replicate.delivery/pbxt/...
  ✅ Instagram: https://instagram.com/p/ABC123

...

📊 SUMMARY
Total: 12
Success: 11
Failed: 1

✅ 양자리
✅ 황소자리
❌ 쌍둥이자리 (API rate limit)
...
```

### 데이터베이스 모니터링

Prisma Studio로 확인:

```bash
npx prisma studio
```

`SocialMediaPost` 테이블에서:
- 포스팅 성공/실패 기록
- 포스트 URL
- 메타데이터 (별자리, 날짜)

---

## 🎯 바이럴 효과 극대화 전략

### 1. 최적 포스팅 시간

- **오전 9시**: 출근길에 보는 시간
- **저녁 8시**: 퇴근 후 여유 시간
- **자정 12시**: 잠들기 전 내일 운세 확인

→ 하루 3회 포스팅 추천

### 2. 해시태그 전략

기본 해시태그:
```
#운세 #오늘의운세 #별자리운세 #데일리운세
#양자리 #타로 #점성술 #사주 #DestinyPal
```

트렌딩 해시태그 추가:
```
#일상 #데일리 #소통 #팔로우
#인스타그램 #데일리룩 #오늘
```

### 3. 사용자 참여 유도

캡션에 질문 추가:
```
❓ 오늘 당신의 별자리 운세는 어떤가요?
💬 댓글로 알려주세요!
🔔 알림 켜고 매일 받아보세요!
```

### 4. 스토리 활용

- **피드 포스트**: 보관용, SEO
- **스토리**: 즉시성, 높은 도달률
- **하이라이트**: "별자리별 운세" 카테고리로 정리

### 5. 공유 유도

```
친구 태그하면 함께 행운 받아가세요! 🍀
@친구1 @친구2 @친구3
```

---

## 🐛 트러블슈팅

### Instagram API 에러

**에러**: `OAuthException: Invalid OAuth 2.0 Access Token`
**해결**: Access Token 갱신 필요

**에러**: `Error validating access token: Session has expired`
**해결**: 장기 토큰으로 재발급

**에러**: `(#100) Too many calls`
**해결**: Rate limit 대기 (1시간당 200회 제한)

### Replicate API 에러

**에러**: `Insufficient credits`
**해결**: [Billing](https://replicate.com/account/billing)에서 크레딧 충전

**에러**: `Model timeout`
**해결**: `num_inference_steps` 줄이기 (30 → 20)

### Vercel Cron 실행 안됨

1. Vercel 대시보드 → Cron Jobs 확인
2. Execution Logs 확인
3. `CRON_SECRET` 환경변수 확인

---

## 📈 성장 지표

### 추적할 KPI

1. **일일 도달 수** (Reach)
2. **참여율** (Engagement Rate)
3. **팔로워 증가율**
4. **웹사이트 유입** (UTM 파라미터로 추적)
5. **회원가입 전환율**

### 분석 도구

- Instagram Insights (내장)
- Google Analytics (웹 유입)
- Prisma Studio (데이터베이스)

---

## 🎁 다음 단계

시스템이 안정화되면 추가할 기능:

- [ ] TikTok 자동 포스팅
- [ ] YouTube Shorts 생성
- [ ] 주간 운세 요약
- [ ] 사용자 맞춤 운세 (구독자 대상)
- [ ] 리마인더 알림 시스템
- [ ] A/B 테스팅 (이미지 스타일)

---

## 📞 지원

문제가 발생하면:

1. GitHub Issues에 리포트
2. Logs 확인 (`/var/log/auto-post.log`)
3. 환경변수 재확인

---

**Happy Marketing! 🚀✨**
