# 🌟 DestinyPal - Complete Overview

> **AI 기반 운세/점술 종합 상담 플랫폼**
>
> 2026년 2월 9일 기준 - 전체 프로젝트 현황

---

## 📊 프로젝트 규모 (Project Scale)

| 항목                    | 수량                           |
| ----------------------- | ------------------------------ |
| **App Router Pages**    | 75 (`page.*`)                  |
| **API Route Handlers**  | 135                            |
| **React Components**    | 306                            |
| **Database Models**     | 42 (Prisma)                    |
| **Test Files**          | 1005 unit/integration + 54 E2E |
| **Languages (i18n)**    | 2 (ko, en)                     |
| **CI/CD Workflows**     | 12                             |

---

## 🎯 비즈니스 목표 (Business Goals)

### 단기 목표 (2026 Q1-Q2)

- ✅ **AI 비용 최적화** (mini 모델 + Redis) - 완료
- ✅ **크레딧 UX 개선** - 완료 (2026-02-02)
- 🔄 **MAU 50K 달성**
- 🔄 **일본어 시장 진출**

### 중기 목표 (2026 Q3-Q4)

- **MAU 100K**
- **다통화 결제 (USD/JPY/CNY)**
- **Public API 베타 출시**

### 장기 목표 (2027-2030)

- **2027 Q4**: MAU 1M, 10개 언어 지원
- **2030**: MAU 10M, **유니콘 밸류에이션 ($1B+)**

---

## 🏗️ 아키텍처 (Architecture)

```
[Browser / Mobile App (Capacitor)]
   |
   v
[Next.js 16 App Router] ──── [PostgreSQL (Supabase / Prisma)]
   |          |
   |          └── [Redis (Upstash) - Caching]
   |
   ├── [135 API Routes] ──── [Flask AI Backend] ──── [LLM Providers]
   |                                                   ├─ OpenAI (FUSION_MODEL / FUSION_MINI_MODEL)
   |                                                   ├─ Replicate (Fallback)
   |                                                   └─ Together (Fallback)
   |
   └── [Third-party Services]
        ├─ NextAuth (OAuth: Google, Kakao, Naver)
        ├─ Stripe (Payments)
        ├─ Sentry (Monitoring)
        └─ Vercel (Hosting)
```

---

## 🛠️ 기술 스택 (Tech Stack)

### Frontend

- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript 5.9
- **UI**: React 19.2, Tailwind CSS 3.4, Framer Motion 12
- **Mobile**: Capacitor 8 (iOS/Android)
- **State**: React Context, Server Components

### Backend

- **API**: Next.js API Routes (135 endpoints)
- **AI Engine**: Python Flask
- **Database**: PostgreSQL (Supabase) + Prisma 7.3 ORM
- **Cache**: Redis (Upstash)
- **Auth**: NextAuth.js

### AI/ML

- **Primary LLM**: OpenAI (FUSION_MODEL / FUSION_MINI_MODEL)
- **Fallback**: Replicate, Together AI
- **Technique**: RAG (Retrieval-Augmented Generation)
- **Embeddings**: SentenceTransformers (minilm/e5-large/bge-m3 via `RAG_EMBEDDING_MODEL`)

### DevOps

- **Hosting**: Vercel (Frontend), Docker (AI Backend)
- **CI/CD**: GitHub Actions (12 workflows)
- **Monitoring**: Sentry
- **Testing**: Vitest (1005 tests) + Playwright (54 E2E)

---

## 🎨 제공 서비스 (Services)

### 8개 점술 시스템

1. **사주 (Four Pillars)** 🔮
   - 기본/상세/전체 사주
   - 천간/지지/십성/오행 분석
   - AI 어드바이저 채팅

2. **타로 (Tarot)** 🃏
   - 1장/3장/켈틱크로스 스프레드
   - 78장 풀덱 지원
   - 질문 자동 분석

3. **주역 (I Ching)** ☯️
   - 64괘 해석
   - 변효 분석

4. **수비학 (Numerology)** 🔢
   - 생명수/운명수/영혼수
   - 이름 수비학

5. **꿈해몽 (Dream Interpretation)** 💭
   - AI 기반 상징 분석
   - 문화적 맥락 고려

6. **전생분석 (Past Life)** 🌀
   - 카르마 분석
   - 영적 여정

7. **궁합 (Compatibility)** 💑
   - 2-5인 다자 궁합
   - 사주/타로/수비학 통합

8. **서양점성술 (Astrology)** ⭐
   - 출생 차트 (Natal Chart)
   - 행성 배치, 하우스, 애스펙트

### 추가 기능

- **데스티니 맵 (Destiny Map)**: 10개 레이어 통합 분석
- **데스티니 매치 (Destiny Match)**: 매칭 시스템 (개발 중)
- **일일 운세 (Daily Fortune)**: 매일 자정 업데이트

---

## 💳 수익 모델 (Revenue Model)

### 구독 플랜 (Subscription Plans)

| 플랜        | 월 크레딧 | 궁합 한도 | 후속질문 한도 | 월 가격 |
| ----------- | --------- | --------- | ------------- | ------- |
| **Free**    | 7         | 0         | 0             | 무료    |
| **Starter** | 25        | 2         | 2             | ₩4,900  |
| **Pro**     | 80        | 5         | 5             | ₩9,900  |
| **Premium** | 200       | 10        | 10            | ₩19,900 |

### 크레딧 팩 (One-time Purchase)

- Mini: 5 크레딧 (₩1,900)
- Standard: 15 크레딧 (₩4,900)
- Plus: 40 크레딧 (₩9,900) ⭐ 인기
- Mega: 100 크레딧 (₩19,900)
- Ultimate: 250 크레딧 (₩39,900)

**유효기간**: 구매일로부터 3개월

---

## 🎯 최근 완료 사항 (Recent Achievements)

### ✅ 크레딧 에러 메시지 개선 (2026-02-02)

**문제**: 사용자가 크레딧 vs 궁합 vs 후속질문 한도를 구분 못함

**해결**:

- 크레딧 타입별 맞춤형 에러 UI
- 한도 초과 시 프로그레스 바 (2/2회)
- 💡 설명 박스: "월간 한도 제한이란?"
- 버튼 변경: "플랜 업그레이드" vs "크레딧 구매"

**예상 효과**: 고객 지원 문의 50% 감소

**관련 파일**:

- [CreditDepletedModal.tsx](src/components/ui/CreditDepletedModal.tsx)
- [CreditModalContext.tsx](src/contexts/CreditModalContext.tsx)
- [withCredits.ts](src/lib/credits/withCredits.ts)

**문서**: [docs/CREDIT_ERROR_MESSAGES.md](docs/CREDIT_ERROR_MESSAGES.md)

---

### ✅ AI 비용 최적화 (완료)

**스마트 모델 라우팅**:

- **FUSION_MINI_MODEL** (예: gpt-4.1-mini): 타로 해석, 간단한 질문
- **FUSION_MODEL** (예: gpt-4.1): 사주 종합 분석, 프리미엄 리포트

**Redis 캐싱**:

- Calendar: 30일 TTL
- Daily Fortune: 12시간 TTL
- Destiny Map: 7일 TTL

**비용 절감**: 약 30-40% 예상

---

## 🚀 다음 우선순위 (Next Priorities)

### P0 - Critical Path

1. **온보딩 간소화**: 3단계 → 1단계
2. **SEO 최적화**: 블로그 월 10개 포스팅
3. **일본어 현지화**: 번역 + 결제 수단
4. **다통화 결제**: USD, JPY 지원

### P1 - High Priority

1. **RAG 코퍼스 확장**: 사주 1K→5K, 타로 500→2K
2. **번들 사이즈 축소**: 3MB → 2MB
3. **SNS 자동 포스팅**: 인스타/페북/트위터
4. **푸시 알림 전략**: 일일 운세 알림

---

## 📁 프로젝트 구조 (Project Structure)

```
saju-astro-chat-backup-latest/
├── src/
│   ├── app/              # Next.js 16 App Router
│   │   ├── (main)/       # 메인 페이지
│   │   ├── api/          # 135 API 엔드포인트
│   │   ├── saju/         # 사주 서비스
│   │   ├── tarot/        # 타로 서비스
│   │   ├── compatibility/ # 궁합 서비스
│   │   └── ...
│   ├── components/       # 306 React 컴포넌트
│   ├── lib/              # 44 라이브러리 모듈
│   │   ├── api/          # API 유틸
│   │   ├── credits/      # 크레딧 시스템
│   │   ├── cache/        # Redis 캐싱
│   │   └── ...
│   ├── contexts/         # React Context
│   └── i18n/             # 2개 언어 번역 (ko, en)
├── backend_ai/           # Flask AI 백엔드
│   ├── app.py            # 메인 엔트리
│   ├── corpus/           # RAG 데이터
│   └── llm/              # LLM 클라이언트
├── prisma/               # Prisma ORM
│   ├── schema.prisma     # 35개 모델
│   └── migrations/       # DB 마이그레이션
├── tests/                # 1005 테스트
├── e2e/                  # 54 E2E 테스트
├── docs/                 # 문서
│   ├── README.md         # 문서 허브
│   └── CREDIT_ERROR_MESSAGES.md
├── ROADMAP.md            # 기술 로드맵
├── UNICORN_STRATEGY.md   # 비즈니스 전략
└── README.md             # 프로젝트 소개
```

---

## 📚 핵심 문서 (Key Documents)

### 전략 문서

- **[UNICORN_STRATEGY.md](UNICORN_STRATEGY.md)** - 유니콘 비즈니스 전략
- **[ROADMAP.md](ROADMAP.md)** - 기술 개발 로드맵 (2026-2030)
- **[REFACTORING_GUIDE.md](REFACTORING_GUIDE.md)** - 코드 개선 가이드

### 기술 문서

- **[docs/README.md](docs/README.md)** - 문서 허브 (중앙 인덱스)
- **[docs/CREDIT_ERROR_MESSAGES.md](docs/CREDIT_ERROR_MESSAGES.md)** - 크레딧 UX 개선
- **[src/lib/api/README.md](src/lib/api/README.md)** - API 설계 원칙
- **[backend_ai/APP_PY_REFACTORING_COMPLETE.md](backend_ai/APP_PY_REFACTORING_COMPLETE.md)** - AI 백엔드 구조

### 사용자 가이드

- **[README.md](README.md)** - 프로젝트 소개 및 Getting Started

---

## 🔐 보안 (Security)

### 구현된 보안 기능

- ✅ **OAuth 인증**: Google, Kakao, Naver
- ✅ **Token 암호화**: AES-256-GCM
- ✅ **Secrets 스캐닝**: Gitleaks
- ✅ **RBAC**: Role-Based Access Control
- ✅ **Rate Limiting**: API 요청 제한
- ✅ **SQL Injection 방지**: Prisma ORM
- ✅ **XSS 방지**: React 자동 이스케이핑

---

## 📈 성능 (Performance)

### 최적화 완료

- ✅ **번들 사이즈**: ~3MB (코드 스플리팅)
- ✅ **Redis 캐싱**: 주요 API 캐시
- ✅ **이미지 최적화**: WebP, 레이지 로딩
- ✅ **CDN**: Vercel Edge Network

### 목표

- 🎯 번들 사이즈: 3MB → 2MB
- 🎯 First Contentful Paint: <1.5s
- 🎯 Time to Interactive: <3s

---

## 🌏 글로벌 확장 (Global Expansion)

### 현재 지원 언어

- 🇰🇷 한국어 (ko)
- 🇺🇸 영어 (en)

### 개발 중/계획 중

- 🇯🇵 일본어 (ja) - 2026 Q2 목표
- 🇨🇳 중국어 간체 (zh-CN)
- 🇹🇭 태국어 (th)
- 🇻🇳 베트남어 (vi)
- 10+ 언어 지원 목표 (2027)

---

## 💰 주요 KPI (Key Performance Indicators)

### 현재 (2026 Q1)

- **MAU**: [비공개]
- **Conversion Rate**: [측정 중]
- **ARPU**: [측정 중]

### 목표

| 시기    | MAU  | MRR | 비고          |
| ------- | ---- | --- | ------------- |
| 2026 Q2 | 50K  | -   | 일본어 출시   |
| 2026 Q4 | 100K | -   | 다통화 지원   |
| 2027 Q4 | 1M   | -   | 10개 언어     |
| 2030    | 10M  | -   | 유니콘 ($1B+) |

---

## 🤝 기여 (Contributing)

### 개발 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local

# 3. 데이터베이스 마이그레이션
npx prisma migrate dev

# 4. 개발 서버 실행
npm run dev
```

### 테스트 실행

```bash
# Unit/Integration 테스트
npm test

# E2E 테스트
npm run test:e2e

# 타입 체크
npm run typecheck

# 린트
npm run lint
```

---

## 📞 연락처 (Contact)

### Production

- **웹사이트**: https://destinypal.com
- **문의**: support@destinypal.com

### Development

- **GitHub**: [Repository URL]
- **Slack**: [Team Workspace]

---

## 📄 라이선스 (License)

MIT License - 자세한 내용은 [LICENSE](LICENSE) 참조

---

**마지막 업데이트**: 2026-02-09
**작성자**: Codex
**버전**: v1.1

---

## 🔗 Quick Links

| 카테고리         | 링크                                                           |
| ---------------- | -------------------------------------------------------------- |
| 📖 문서 허브     | [docs/README.md](docs/README.md)                               |
| 🗺️ 기술 로드맵   | [ROADMAP.md](ROADMAP.md)                                       |
| 🦄 비즈니스 전략 | [UNICORN_STRATEGY.md](UNICORN_STRATEGY.md)                     |
| 🔧 API 가이드    | [src/lib/api/README.md](src/lib/api/README.md)                 |
| 🧪 테스트 전략   | [tests/README.md](tests/README.md)                             |
| 💳 크레딧 UX     | [docs/CREDIT_ERROR_MESSAGES.md](docs/CREDIT_ERROR_MESSAGES.md) |
