# 🗺️ DestinyPal Development Roadmap

> **기술 개발 로드맵** | 2026-2030

**Last Updated**: 2026-02-09

_비즈니스 전략은 [UNICORN_STRATEGY.md](UNICORN_STRATEGY.md) 참고_

---

## 📅 Overview

이 로드맵은 DestinyPal의 **기술 개발 방향**을 단기(Q1-Q2 2026), 중기(Q3-Q4 2026), 장기(2027+) 관점에서 정리합니다.

**목표**: Enterprise-Grade 플랫폼 → 글로벌 확장 가능 인프라

---

## 🚀 Phase 1: Foundation Optimization (2026 Q1-Q2)

### 1.1 사용자 경험 (UX)

#### 온보딩 개선

- [ ] **3단계 → 1단계 간소화**
  - 현재: 생년월일 → 성별/시간 → 서비스 선택
  - 목표: 생년월일 입력 → 즉시 첫 리딩 시작
  - 파일: [src/components/calendar/BirthInfoForm.tsx](src/components/calendar/BirthInfoForm.tsx)
  - 우선순위: P0

- [x] **크레딧 에러 메시지 개선** ✅ (2026-02-02)
  - 크레딧 타입별 맞춤형 UI (reading/compatibility/followUp)
  - 한도 초과 시 사용량 프로그레스 바
  - 💡 설명 박스: "월간 한도 제한이란?"
  - 파일: [src/components/ui/CreditDepletedModal.tsx](src/components/ui/CreditDepletedModal.tsx)
  - 문서: [docs/CREDIT_ERROR_MESSAGES.md](docs/CREDIT_ERROR_MESSAGES.md)
  - **예상 효과: 고객 지원 문의 50% 감소**
  - 우선순위: P0 → ✅ 완료

- [ ] **첫 리딩 경험 최적화**
  - 타로 1장 무료 체험 (크레딧 소모 없음)
  - 결과 페이지 CTA 개선
  - 우선순위: P1

#### 페르소나 메모리 강화

- [ ] **대화 맥락 누적**
  - 자동 요약, 키워드 추출
  - RAG 통합: 이전 상담 반영
  - 파일: [src/lib/api/persona-memory/route.ts](src/lib/api/persona-memory/route.ts)
  - 우선순위: P1

- [ ] **AI 톤 조정**
  - `UserPreferences.tonePreference` 활용
  - 파일: [src/app/api/saju/chat-stream/route.ts](src/app/api/saju/chat-stream/route.ts)
  - 우선순위: P2

### 1.2 AI 품질 향상

#### 모델 라우팅 최적화

- [x] **스마트 모델 라우팅 (현재 구현됨)**
  - `FUSION_MINI_MODEL`: 타로 해석, 간단한 질문 분석
  - `FUSION_MODEL`: 사주 종합 분석, 프리미엄 리포트, 어드바이저 채팅
  - 파일: [tarot/interpret-stream/route.ts](src/app/api/tarot/interpret-stream/route.ts:422), [life-prediction/advisor-chat/route.ts](src/app/api/life-prediction/advisor-chat/route.ts:322)
  - 우선순위: ✅ 완료

- [x] **Fallback 체인 구현됨**
  - 순서: OpenAI → Replicate → Together AI
  - 파일: [aiBackend.ts](src/lib/destiny-matrix/ai-report/aiBackend.ts:44-66)
  - 우선순위: ✅ 완료

#### RAG 파이프라인 최적화

- [ ] **코퍼스 확장**
  - 사주: 1,000개 → 5,000개
  - 타로: 500개 → 2,000개
  - 점성술: 신규 추가
  - 파일: `backend_ai/corpus/`
  - 우선순위: P1

- [ ] **임베딩 정확도 개선**
  - 현재: `RAG_EMBEDDING_MODEL=minilm` (기본)
  - 목표: `e5-large` / `bge-m3` 정밀도 비교 테스트
  - 벡터 스토어 최적화 (ChromaDB 마이그레이션 옵션)
  - 파일: [backend_ai/app/rag/model_manager.py](backend_ai/app/rag/model_manager.py)
  - 우선순위: P2

#### 피드백 루프 구축

- [ ] **AI 품질 평가 시스템**
  - `SectionFeedback` 데이터 분석 대시보드
  - 낮은 평가 섹션 자동 감지
  - 프롬프트 A/B 테스팅
  - 파일: [src/app/api/feedback/route.ts](src/app/api/feedback/route.ts)
  - 우선순위: P1

- [ ] **자동 프롬프트 개선**
  - 피드백 → 프롬프트 조정 추천
  - Git 버전 관리 (프롬프트 히스토리)
  - 우선순위: P2

### 1.3 성능 최적화

#### 번들 사이즈 축소

- [ ] **3MB → 2MB 목표**
  - 현재: 코드 스플리팅 (saju, tarot, iching)
  - 추가:
    - Chart.js → Recharts
    - 미사용 lodash 제거
  - 파일: [next.config.ts](next.config.ts)
  - 우선순위: P1

- [ ] **이미지 최적화**
  - WebP → AVIF (30% 추가 절감)
  - 레이지 로딩 강화
  - BlurHash 플레이스홀더
  - 우선순위: P2

#### Redis 캐싱 확대

- [ ] **동적 TTL 시스템**
  - 현재: Saju 7일, Tarot 1일 고정
  - 목표: 사용 빈도 기반 TTL 조정
  - 파일: [src/lib/cache/redis-cache.ts](src/lib/cache/redis-cache.ts)
  - 우선순위: P2

- [ ] **캐시 워밍 전략**
  - 새벽 인기 조합 프리로딩
  - 예측 캐싱 (생년월일 패턴)
  - 파일: `scripts/cache-warming.ts` (신규)
  - 우선순위: P3

#### 데이터베이스 최적화

- [ ] **N+1 쿼리 해결**
  - Prisma `include` 최적화
  - 배치 쿼리 활용
  - 우선순위: P1

- [ ] **인덱스 추가**
  - 복합 인덱스 (userId + createdAt + service)
  - 파일: [prisma/schema.prisma](prisma/schema.prisma)
  - 우선순위: P2

### 1.4 마케팅 & 성장

#### SEO 최적화

- [ ] **블로그 컨텐츠 활성화**
  - 목표: 월 10개 포스팅
  - 파일: `public/blog/`
  - 우선순위: P0

- [ ] **구조화된 데이터**
  - Schema.org 마크업 (LocalBusiness, FAQPage)
  - 우선순위: P1

#### SNS 자동화

- [ ] **자동 포스팅 강화**
  - 현재: `scripts/auto-post-daily-fortune.mjs`
  - 확장: 인스타그램, 페이스북, 트위터
  - 이미지 자동 생성
  - 우선순위: P1

#### 바이럴 기능

- [ ] **공유 기능 강화**
  - `SharedResult` 모델 활용
  - OG 태그 최적화
  - 파일: [src/app/shared/[id]/page.tsx](src/app/shared/[id]/page.tsx)
  - 우선순위: P1

---

## 🌏 Phase 2: Global Expansion (2026 Q3-Q4)

### 2.1 현지화 (Localization)

#### 다국어 UI

- [ ] **일본어 (ja) 추가**
  - 번역: `src/i18n/locales/ja/`
  - 일본식 용어 (사주 → 四柱推命)
  - 예상 투입: 2주
  - 우선순위: P0

- [ ] **중국어 간체 (zh-CN) 추가**
  - 중국 점술 용어 (자미두수)
  - 우선순위: P1

- [ ] **태국어 (th), 베트남어 (vi)**
  - 동남아 진출 대비
  - 우선순위: P2

#### 다통화 지원

- [ ] **Stripe 다국가 결제**
  - 추가: USD, JPY, CNY
  - 환율 자동 반영
  - 파일: [src/lib/payments/prices.ts](src/lib/payments/prices.ts)
  - 우선순위: P0

- [ ] **현지 결제 수단**
  - 일본: LINE Pay, PayPay
  - 중국: Alipay, WeChat Pay
  - 우선순위: P1

#### 문화적 현지화

- [ ] **해석 스타일 조정**
  - 한국: 직설적
  - 일본: 완곡
  - 중국: 길흉 명확
  - 파일: `backend_ai/prompts/` (언어별)
  - 우선순위: P1

### 2.2 모바일 앱 성장

#### 앱스토어 최적화 (ASO)

- [ ] **키워드 연구**
  - 한국: "사주", "타로"
  - 일본: "占い", "タロット"
  - 우선순위: P1

- [ ] **스크린샷 & 비디오**
  - 5개 스크린샷
  - 30초 프로모션 비디오
  - 우선순위: P1

#### 푸시 알림 전략

- [ ] **일일 운세 알림**
  - 아침 9시 (현지 시간)
  - 개인화 메시지
  - 오픈율 목표: 30%
  - 우선순위: P1

- [ ] **특별한 날 알림**
  - 생일, 명절, 천체 이벤트
  - 크레딧 만료 임박
  - 우선순위: P2

- [ ] **푸시 A/B 테스팅**
  - 메시지 톤, 타이밍 최적화
  - 파일: [src/app/api/push/subscribe/route.ts](src/app/api/push/subscribe/route.ts)
  - 우선순위: P2

#### 네이티브 기능 추가

- [ ] **Capacitor 플러그인**
  - 카메라 (AR 타로 준비)
  - 알림 (로컬, 원격)
  - 생체 인증
  - 파일: `capacitor.config.ts`
  - 우선순위: P2

### 2.3 B2B 준비

#### Public API 설계

- [ ] **API 문서화**
  - OpenAPI 3.0 스펙
  - Swagger UI
  - 코드 예제 (Python, JS)
  - 파일: [scripts/generate-openapi.ts](scripts/generate-openapi.ts), [docs/README.md](docs/README.md)
  - 우선순위: P2

- [ ] **API 키 관리**
  - 발급, 갱신, 폐기
  - Rate Limiting (티어별)
  - 파일: `src/app/api/api-keys/` (신규)
  - 우선순위: P2

- [ ] **Webhook 시스템**
  - 리딩 완료 알림
  - 크레딧 소진 알림
  - 파일: `src/app/api/webhooks/` (신규)
  - 우선순위: P3

#### 화이트라벨 솔루션

- [ ] **커스터마이징 UI**
  - 로고, 색상, 폰트
  - 도메인 매핑
  - 파일: `src/app/white-label/` (신규)
  - 우선순위: P3

- [ ] **대시보드**
  - 사용량 분석
  - 수익 리포트
  - 파일: `src/app/dashboard/` (신규)
  - 우선순위: P3

---

## 🚀 Phase 3: Platform Expansion (2027-2028)

### 3.1 마켓플레이스

#### 타사 개발자 생태계

- [ ] **스프레드 마켓플레이스**
  - 타로 스프레드 업로드
  - 수익 분배 (70% 개발자)
  - 파일: `src/app/marketplace/` (신규)

- [ ] **커스텀 해석 판매**
  - 전문 역술인 해석 패키지
  - 1:1 상담 예약
  - 에스크로 결제
  - 파일: `src/app/consultations/` (신규)

- [ ] **플러그인 시스템**
  - 타사 점술 시스템 통합 (API)
  - SDK 제공 (TypeScript, Python)

#### 전문가 네트워크

- [ ] **역술인 플랫폼**
  - 프로필, 포트폴리오
  - 스케줄 관리
  - 수수료: 20%

- [ ] **검증 시스템**
  - 자격증 확인
  - 사용자 평가

### 3.2 커뮤니티 플랫폼

#### 포럼 & 소셜

- [ ] **테마별 커뮤니티**
  - 사주 게시판, 타로 게시판
  - Q&A 섹션
  - 파일: `src/app/community/` (신규)

- [ ] **라이브 방송**
  - 역술인 라이브 상담
  - 실시간 Q&A
  - 기술 스택: WebRTC, Agora

- [ ] **이벤트 & 챌린지**
  - 일일 타로 챌린지
  - 보상: 크레딧, 배지

### 3.3 아시아 전역 확장

#### 추가 언어

- [ ] 인도네시아어 (id)
- [ ] 말레이시아어 (ms)
- [ ] 힌디어 (hi)
- [ ] 아랍어 (ar)

#### 현지 점술 시스템

- [ ] **인도 점성술 (Vedic)**
  - 나크샤트라, 다샤 시스템

- [ ] **중국 자미두수 (Ziwei)**
  - 12궁 시스템

- [ ] **일본 사주팔자**
  - 일본식 용어, 해석

---

## 🌟 Phase 4: Innovation & Unicorn (2028-2030)

### 4.1 멀티모달 AI

#### 음성 AI

- [ ] **대화형 상담**
  - 기술 스택: Whisper (STT), ElevenLabs (TTS)
  - 파일: `src/app/voice/` (신규)

- [ ] **감정 인식**
  - 목소리 톤 분석
  - 기술 스택: Hume AI

#### 이미지 AI

- [ ] **타로 카드 스캔**
  - 스마트폰 카메라 → 카드 인식
  - 기술 스택: OpenCV, TensorFlow
  - 파일: `src/app/tarot-scan/` (신규)

- [ ] **얼굴 관상 분석**
  - 기술 스택: Face-API.js
  - 주의: 윤리적 가이드라인 준수

#### AR/VR 통합

- [ ] **AR 타로 카드**
  - 3D 타로 카드
  - 기술 스택: AR.js, WebXR
  - 파일: `src/app/ar-tarot/` (신규)

- [ ] **VR 명상 공간**
  - 가상 사원, 자연 환경
  - 기술 스택: Three.js, A-Frame

- [ ] **메타버스 통합**
  - Roblox, Sandbox 연동
  - NFT 타로 카드

### 4.2 AI 고도화

#### 파인튜닝 자동화

- [ ] **사용자 피드백 학습**
  - `SectionFeedback` → 자동 조정
  - RLHF (강화학습)

- [ ] **전문가 검증**
  - 역술인 AI 평가
  - 고품질 데이터셋 (100K+)

- [ ] **도메인 특화 모델**
  - 사주/타로 전용 모델
  - 상용 LLM 파인튜닝/지식 증류 가능성 검토

#### 멀티모달 해석

- [ ] **텍스트 + 이미지 + 음성**
  - 통합 해석
  - 기술 스택: 멀티모달 LLM API (OpenAI/Gemini 등)

- [ ] **컨텍스트 인지 AI**
  - 날씨, 시간, 위치 반영
  - 실시간 천체 이벤트
  - 파일: [src/lib/astrology/ephemeris.ts](src/lib/astrology/ephemeris.ts) 확장

### 4.3 플랫폼 비즈니스

#### B2B SaaS

- [ ] **기업용 HR 솔루션**
  - 채용 성향 분석
  - 팀 빌딩 추천
  - 연간 계약 (최소 $10K)

- [ ] **헬스케어 연동**
  - Calm, Headspace 통합
  - HIPAA 준수

- [ ] **교육 플랫폼**
  - 점술 교육 코스
  - 자격증 프로그램

### 4.4 글로벌 확장 완성

#### 나머지 대륙

- [ ] **유럽**: 영어, 프랑스어, 독일어
- [ ] **북미**: TikTok, Instagram 마케팅
- [ ] **남미**: 포르투갈어, 스페인어

#### 글로벌 브랜드

- [ ] **국제 컨퍼런스**
  - TechCrunch Disrupt, SXSW

- [ ] **글로벌 파트너십**
  - Google Assistant, Siri 통합

---

## 📊 우선순위 매트릭스

### Critical Path (P0)

- [x] 모델 라우팅 최적화 (`FUSION_MINI_MODEL` 적용)
- [x] Redis 캐싱 구현 (calendar, daily-fortune, destiny-map 등)
- [x] 크레딧 에러 메시지 개선 ✅ (2026-02-02)
- [ ] 온보딩 간소화 (전환율 개선)
- [ ] SEO 최적화 (유기적 성장)
- [ ] 일본어 현지화 (아시아 확장)
- [ ] 다통화 결제 (글로벌 수익화)

### High Priority (P1)

- [ ] RAG 코퍼스 확장
- [ ] 번들 사이즈 축소
- [ ] SNS 자동 포스팅
- [ ] 푸시 알림 전략
- [ ] 중국어 현지화

### Medium Priority (P2)

- [ ] 페르소나 메모리 강화
- [ ] 임베딩 정확도 개선
- [ ] Redis 동적 TTL
- [ ] Public API 출시
- [ ] 태국어/베트남어

### Low Priority (P3)

- [ ] 캐시 워밍 전략
- [ ] Webhook 시스템
- [ ] 화이트라벨 솔루션
- [ ] AR/VR 통합 (실험적)
- [ ] NFT 타로 카드

---

## 🎯 마일스톤

### 2026 Q2

- [ ] MAU 50K
- [ ] 일본어 출시
- [x] AI 비용 최적화 완료 (`FUSION_MINI_MODEL` + Redis 캐싱)
- [x] 크레딧 UX 개선 완료 (고객 지원 문의 감소 목표)

### 2026 Q4

- [ ] MAU 100K
- [ ] 다통화 지원
- [ ] Public API 베타

### 2027 Q4

- [ ] MAU 1M
- [ ] 마켓플레이스 출시
- [ ] 10개 언어 지원

### 2030

- [ ] MAU 10M
- [ ] 멀티모달 AI
- [ ] **Unicorn Valuation ($1B+)**

---

## 📝 기술 스택 요약

### Frontend

- Next.js 16.1, React 19.2, TypeScript 5.9
- Tailwind CSS 3.4, Framer Motion 12
- Capacitor 8 (iOS/Android)

### Backend

- Next.js API Routes (135 endpoints)
- Python Flask (AI Engine)
- PostgreSQL + Prisma 7.3 (42 models)
- Redis (Upstash)

### AI/ML

- OpenAI (`FUSION_MODEL`/`FUSION_MINI_MODEL`), Replicate, Together
- RAG (Retrieval-Augmented Generation)
- SentenceTransformers (minilm/e5-large/bge-m3)

### Infrastructure

- Vercel (Frontend)
- Docker (Backend AI)
- Stripe (Payments)
- Sentry (Monitoring)

---

## 🔗 참고 문서

### 전략 & 계획

- [유니콘 전략](UNICORN_STRATEGY.md) - 비즈니스 전략, KPI 목표
- [리팩토링 가이드](REFACTORING_GUIDE.md) - 코드 개선 전략

### 기술 문서

- [문서 허브](docs/README.md) - 중앙 문서 인덱스
- [크레딧 에러 메시지](docs/CREDIT_ERROR_MESSAGES.md) - UX 개선 가이드
- [API 가이드](src/lib/api/README.md) - API 설계 원칙
- [AI 백엔드](backend_ai/APP_PY_REFACTORING_COMPLETE.md) - Python 백엔드 구조

### 아카이브

- [구 문서들](docs/archive/) - 레거시 문서 보관

---

**마지막 업데이트**: 2026-02-09
**작성자**: Codex
**버전**: v2.1 (지표/현황 업데이트)
