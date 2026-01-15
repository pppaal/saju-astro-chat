# 📚 사주 아스트로 챗 API 문서

> **마지막 업데이트**: 2025년 1월
>
> 이 문서는 투자자, 파트너사, 개발자를 위한 API 가이드입니다.

---

## 🚀 빠른 시작

### Base URL
```
Production: https://saju-astro-chat.vercel.app/api
Development: http://localhost:3000/api
```

### 인증 방식
대부분의 API는 **NextAuth 세션 쿠키** 기반 인증을 사용합니다.
```
Cookie: next-auth.session-token=...
```

---

## 📋 API 목차

| 카테고리 | 설명 | API 수 |
|---------|------|--------|
| [🔐 인증](#-인증-auth) | 로그인, 회원가입 | 4개 |
| [👤 사용자](#-사용자-me) | 프로필, 크레딧, 구독 | 6개 |
| [🔮 사주 분석](#-사주-분석-saju) | 핵심 사주 분석 | 3개 |
| [⭐ 점술 서비스](#-점술-서비스) | 타로, 운세, 궁합 | 15개 |
| [💳 결제](#-결제-payments) | Stripe 결제 | 3개 |
| [📱 알림](#-알림-notifications) | 푸시 알림 | 4개 |
| [🎁 추천](#-추천-referral) | 친구 추천 시스템 | 6개 |
| [⚙️ 시스템](#-시스템) | 헬스체크, 통계 | 5개 |

---

## 🔐 인증 (Auth)

### POST `/api/auth/register`
새 계정 생성

**요청:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "홍길동"
}
```

**응답:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "홍길동"
}
```

---

### GET `/api/me`
현재 로그인 사용자 정보

**응답 (성공):**
```json
{
  "name": "홍길동"
}
```

**응답 (미인증):**
```json
{
  "error": "Unauthorized"
}
```
`Status: 401`

---

## 👤 사용자 (Me)

### GET `/api/me/profile`
상세 프로필 조회

### GET `/api/me/credits`
크레딧 잔액 조회

**응답:**
```json
{
  "balance": 100,
  "plan": "premium",
  "expiresAt": "2025-12-31"
}
```

### GET `/api/me/premium`
프리미엄 구독 상태

### GET `/api/me/history`
이용 내역 조회

### GET `/api/me/circle`
내 인맥 서클

---

## 🔮 사주 분석 (Saju)

### POST `/api/saju` ⭐ 핵심 API
**사주팔자 분석** - 생년월일시로 사주 계산

**요청:**
```json
{
  "birthDate": "1990-05-15",
  "birthTime": "14:30",
  "gender": "male",
  "calendarType": "solar",
  "timezone": "Asia/Seoul"
}
```

| 필드 | 타입 | 필수 | 설명 |
|-----|------|------|------|
| birthDate | string | ✅ | 생년월일 (YYYY-MM-DD) |
| birthTime | string | ✅ | 출생시간 (HH:mm) |
| gender | string | ✅ | "male" 또는 "female" |
| calendarType | string | ✅ | "solar"(양력) 또는 "lunar"(음력) |
| timezone | string | ✅ | IANA 타임존 (예: "Asia/Seoul") |

**응답:**
```json
{
  "isPremium": false,
  "isLoggedIn": true,
  "birthDate": "1990-05-15",
  "analysisDate": "2025-01-09",

  "yearPillar": {
    "heavenlyStem": { "name": "경", "element": "금" },
    "earthlyBranch": { "name": "오", "element": "화" }
  },
  "monthPillar": { ... },
  "dayPillar": { ... },
  "timePillar": { ... },

  "fiveElements": {
    "wood": 2, "fire": 3, "earth": 1, "metal": 2, "water": 0
  },

  "dayMaster": { "name": "갑", "element": "목" },

  "daeun": { "cycles": [...] },
  "yeonun": [...],
  "wolun": [...],

  "aiInterpretation": "AI가 분석한 사주 해석...",

  "advancedAnalysis": {
    "geokguk": { ... },
    "yongsin": { ... },
    "health": { ... },
    "career": { ... }
  }
}
```

> 💡 **무료 vs 프리미엄**: `advancedAnalysis`는 프리미엄 사용자만 제공

---

### POST `/api/saju/chat-stream`
사주 기반 AI 채팅 (스트리밍)

### POST `/api/astrology`
서양 점성술 차트 분석

### POST `/api/astrology/chat-stream`
점성술 AI 채팅

---

## ⭐ 점술 서비스

### 타로 (Tarot)

#### POST `/api/tarot/save`
타로 리딩 저장

**요청:**
```json
{
  "question": "올해 연애운은?",
  "cards": ["THE_FOOL", "THE_LOVERS", "THE_STAR"],
  "interpretation": "..."
}
```

#### GET `/api/tarot/save/[id]`
저장된 타로 리딩 조회

#### POST `/api/tarot/couple-reading`
커플 타로 리딩

---

### 운세 (Fortune)

#### POST `/api/fortune`
운세 저장

**요청:**
```json
{
  "date": "2025-01-09",
  "kind": "daily",
  "title": "오늘의 운세",
  "content": "좋은 기운이..."
}
```

#### GET `/api/fortune?date=2025-01-09&kind=daily`
운세 조회

---

### 일일/주간 운세

#### GET `/api/daily-fortune`
오늘의 운세

#### GET `/api/weekly-fortune`
이번 주 운세

---

### 궁합 (Compatibility)

#### POST `/api/compatibility`
두 사람 궁합 분석

**요청:**
```json
{
  "person1": {
    "birthDate": "1990-05-15",
    "birthTime": "14:30",
    "gender": "male"
  },
  "person2": {
    "birthDate": "1992-08-20",
    "birthTime": "09:00",
    "gender": "female"
  }
}
```

#### POST `/api/compatibility/chat`
궁합 AI 채팅

---

### 꿈 해몽 (Dream)

#### POST `/api/dream/chat/save`
꿈 해석 저장

#### GET `/api/dream/history`
꿈 해석 내역

---

## 💳 결제 (Payments)

### POST `/api/checkout` ⭐
Stripe 결제 세션 생성

**요청 (구독):**
```json
{
  "plan": "premium",
  "billingCycle": "monthly"
}
```

**요청 (크레딧팩):**
```json
{
  "creditPack": "pack_100"
}
```

**응답:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

| 에러 코드 | 설명 |
|----------|------|
| `not_authenticated` | 로그인 필요 |
| `invalid_price` | 잘못된 플랜/가격 |
| `rate_limited` | 요청 한도 초과 (분당 8회) |

---

### POST `/api/webhook/stripe`
Stripe 웹훅 (내부용)

### POST `/api/admin/refund-subscription`
구독 환불 (관리자)

---

## 📱 알림 (Notifications)

### POST `/api/push/subscribe`
푸시 알림 구독

**요청:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": { ... }
  }
}
```

### POST `/api/push/send`
푸시 알림 발송

### GET `/api/notifications/stream`
실시간 알림 스트림 (SSE)

---

## 🎁 추천 (Referral)

### POST `/api/referral/create-code`
추천 코드 생성

### GET `/api/referral/me`
내 추천 정보

### POST `/api/referral/claim`
추천 보상 수령

### GET `/api/referral/stats`
추천 통계

### POST `/api/referral/validate`
추천 코드 유효성 검사

---

## ⚙️ 시스템

### GET `/api/db-ping`
DB 연결 상태

**응답:**
```json
{
  "status": "ok",
  "latency": 12
}
```

### GET `/api/lib-health`
라이브러리 헬스체크

### GET `/api/stats`
서비스 통계 (관리자)

### GET `/api/visitors-today`
오늘 방문자 수

### GET `/api/cities`
도시 목록 (타임존용)

---

## 🔄 Rate Limiting

모든 API에 레이트 리밋 적용:

| API | 제한 |
|-----|------|
| `/api/checkout` | 8회/분 |
| `/api/saju` | 10회/분 |
| 기타 | 60회/분 |

**응답 헤더:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1704844800
```

**초과 시:**
```json
{
  "error": "rate_limited"
}
```
`Status: 429`

---

## 📊 에러 코드 정리

| HTTP 코드 | 에러 | 의미 |
|----------|------|------|
| 400 | `invalid_json` | JSON 파싱 실패 |
| 400 | `missing_required_fields` | 필수 필드 누락 |
| 401 | `not_authenticated` | 로그인 필요 |
| 401 | `Unauthorized` | 인증 실패 |
| 403 | `forbidden` | 권한 없음 |
| 429 | `rate_limited` | 요청 한도 초과 |
| 500 | `internal_error` | 서버 오류 |

---

## 🛠️ SDK 예제

### JavaScript/TypeScript
```typescript
// 사주 분석 요청
const response = await fetch('/api/saju', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    birthDate: '1990-05-15',
    birthTime: '14:30',
    gender: 'male',
    calendarType: 'solar',
    timezone: 'Asia/Seoul'
  })
});

const result = await response.json();
console.log(result.dayMaster); // { name: "갑", element: "목" }
```

### Python
```python
import requests

response = requests.post(
    'https://saju-astro-chat.vercel.app/api/saju',
    json={
        'birthDate': '1990-05-15',
        'birthTime': '14:30',
        'gender': 'male',
        'calendarType': 'solar',
        'timezone': 'Asia/Seoul'
    },
    cookies={'next-auth.session-token': 'YOUR_TOKEN'}
)

result = response.json()
print(result['dayMaster'])  # {'name': '갑', 'element': '목'}
```

### cURL
```bash
curl -X POST https://saju-astro-chat.vercel.app/api/saju \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "birthDate": "1990-05-15",
    "birthTime": "14:30",
    "gender": "male",
    "calendarType": "solar",
    "timezone": "Asia/Seoul"
  }'
```

---

## 📞 문의

- **기술 지원**: tech@example.com
- **파트너십**: partner@example.com
- **GitHub**: https://github.com/your-repo

---

*이 문서는 자동 생성되었습니다. 최신 API 변경사항은 코드를 참조하세요.*
