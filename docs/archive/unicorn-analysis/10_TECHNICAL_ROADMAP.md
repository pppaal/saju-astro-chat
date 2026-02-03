# 10. 기술 로드맵 (Technical Roadmap)

**작성일**: 2026-01-31
**버전**: 1.0
**목적**: DestinyPal의 단계별 기술 개발 계획 (Year 1-5)

---

## 목차

1. [Phase 1: PMF 검증](#phase-1-pmf-검증-0-6개월)
2. [Phase 2: 성장 가속](#phase-2-성장-가속-6-18개월)
3. [Phase 3: 시리즈 A 준비](#phase-3-시리즈-a-준비-18-24개월)
4. [Phase 4: 유니콘 진입](#phase-4-유니콘-진입-3-5년)

---

## Phase 1: PMF 검증 (0-6개월)

### 목표

- DAU 10,000+ 달성
- 프리미엄 전환율 3%+
- NPS 50+ 확보
- Destiny Match 일일 활성 매칭 100+

---

### Q1-Q2 (Month 1-6)

#### 1.1 Destiny Match 바이럴화

**개발 작업**:

- [ ] 매칭 알고리즘 ML 정교화
  - TensorFlow.js 또는 PyTorch 활용
  - 사주 + 점성술 벡터 임베딩
  - Cosine Similarity 계산
- [ ] "Match of the Day" 푸시 알림
  - Firebase Cloud Messaging 통합
  - 개인화 알고리즘
- [ ] 매치 성공 스토리 수집 (10쌍)
  - 사용자 피드백 시스템
  - 성공 케이스 큐레이션
- [ ] 인스타그램 공유 카드 자동 생성
  - Canvas API로 이미지 생성
  - OG 메타태그 최적화

**예상 공수**: 3주 (개발자 2명)

---

#### 1.2 온보딩 최적화

**개발 작업**:

- [ ] Aha Moment를 5분 이내로 단축
  - 5단계 → 3단계 간소화
  - 소셜 로그인 (구글/카카오)
  - 즉시 첫 리딩 제공
- [ ] 튜토리얼 간소화 (3단계로)
  - 대화형 가이드
  - 스킵 가능하게
- [ ] A/B 테스트 (5개 변형)
  - Mixpanel/Amplitude 통합
  - Feature Flag (LaunchDarkly or Custom)

**예상 공수**: 2주 (개발자 1명 + 디자이너 1명)

---

#### 1.3 바이럴 루프 구축

**개발 작업**:

- [ ] 추천 보상 3 → 5 크레딧
  - Referral 시스템 업그레이드
  - 추천 링크 생성
- [ ] 친구 초대 시 양쪽 모두 보상
  - 양방향 보상 로직
- [ ] 공유 리딩 OG 이미지 최적화
  - 동적 이미지 생성 (Vercel OG Image)
- [ ] 카카오톡 공유 딥링크
  - Universal Link 설정
  - 딥링크 라우팅

**예상 공수**: 1주 (개발자 1명)

---

#### 1.4 데이터 수집

**개발 작업**:

- [ ] Mixpanel/Amplitude 통합
  - Event tracking 설계
  - Custom properties
- [ ] 퍼널 분석 자동화
  - 가입 → 첫 리딩 → 유료 전환
  - Funnel 대시보드
- [ ] 코호트 분석 대시보드
  - D1, D7, D30 리텐션
  - Cohort 테이블
- [ ] 주간 사용자 인터뷰 (10명)
  - 피드백 수집 시스템
  - NPS 조사 자동화

**예상 공수**: 2주 (개발자 1명)

---

### Phase 1 예상 비용

- 인프라: $500/월
- AI 비용: $2,000/월 → $9,000/월 (최적화 후)
- 마케팅: $5,000/월
- **Total: $14,500/월**

### Phase 1 예상 수익

- 10k DAU × 3% 전환 × $8 ARPU = **$2,400/월**
- 적자: -$12,100/월 (투자 필요)

---

## Phase 2: 성장 가속 (6-18개월)

### 목표

- MAU 100,000+ 달성
- MRR $100K ($1.2M ARR)
- LTV/CAC 3:1+
- Destiny Match 일일 매칭 1,000+

---

### Q3-Q6 (Month 7-18)

#### 2.1 인플루언서 마케팅

**개발 작업**:

- [ ] 인플루언서 전용 프로모션 코드
  - 고유 코드 생성 시스템
  - 전환 추적 대시보드
- [ ] 인플루언서 대시보드
  - 실시간 통계 (클릭, 가입, 전환)
  - 매출 쉐어 계산
- [ ] UTM 파라미터 자동 추적
  - UTM 태깅 시스템
  - 채널별 ROI 분석

**예상 공수**: 1주 (개발자 1명)

---

#### 2.2 커뮤니티 구축

**개발 작업**:

- [ ] 포럼 기능 (사주/타로 토론)
  - 댓글 시스템
  - 추천/비추천
  - 모더레이션 도구
- [ ] 사용자 리뷰/후기 시스템
  - 별점 + 텍스트 리뷰
  - 리뷰 큐레이션
- [ ] Discord 커뮤니티 통합
  - Discord Bot
  - 자동 역할 할당

**예상 공수**: 4주 (개발자 2명)

---

#### 2.3 국제 진출

**일본 시장 진출**:

- [ ] 일본어 완벽 번역
  - i18n 시스템 구축
  - 번역 품질 검수
- [ ] 현지 결제 (LINE Pay, PayPay)
  - 결제 게이트웨이 통합
  - 세금 계산 로직
- [ ] 일본식 사주 (四柱推命) 지원
  - 알고리즘 현지화
  - 일본 점성술 통합

**예상 공수**: 6주 (개발자 2명 + 번역가 1명)

**동남아 진출** (태국, 베트남):

- [ ] 불교 점성술 통합
- [ ] 현지 인플루언서 협업

**미국 Z세대 타겟**:

- [ ] 영어 UX 최적화
- [ ] TikTok 집중 마케팅

---

#### 2.4 B2B 파일럿

**개발 작업**:

- [ ] 결혼정보회사 API 제공
  - RESTful API 설계
  - API 문서 (Swagger)
  - 인증 (OAuth 2.0)
- [ ] 점집/철학관 SaaS 모델
  - 멀티 테넌시 아키텍처
  - 화이트라벨 옵션
- [ ] HR 업체 (성격/궁합 테스트)
  - 엔터프라이즈 플랜
  - 대량 분석 API

**예상 공수**: 8주 (개발자 3명)

---

### Phase 2 예상 비용

- 인프라: $3,000/월
- AI 비용: $15,000/월
- 마케팅: $30,000/월
- 인건비: $50,000/월 (10명)
- **Total: $98,000/월**

### Phase 2 예상 수익

- 100k MAU × 5% 전환 × $10 ARPU = **$50,000/월 MRR**
- B2B: $50,000/월 (추가)
- **Total: $100,000/월 ($1.2M ARR)**
- 손익분기 달성!

---

## Phase 3: 시리즈 A 준비 (18-24개월)

### 목표

- MAU 1,000,000+
- ARR $10M+
- YoY Growth 200%+
- Magic Number 1.0+

---

### Year 2-3 (Month 19-24)

#### 3.1 독자 AI 모델 개발

**개발 작업**:

- [ ] 점술 특화 LLM fine-tuning
  - 100만+ 리딩 데이터 수집
  - 데이터 전처리 및 레이블링
  - GPT-4o 또는 Llama 기반 fine-tuning
  - 정확도 벤치마크 (GPT-4o 대비 +15%)
- [ ] 사용자 피드백 루프 구축
  - 리딩 평가 시스템 (1-5 별점)
  - 피드백 데이터 재학습
- [ ] A/B 테스트 (GPT vs 독자 모델)
  - 품질 비교
  - 비용 비교

**예상 공수**: 12주 (ML 엔지니어 2명 + 데이터 사이언티스트 1명)

**예상 절감**:

- AI 비용 -70% ($50k → $15k/월, 1M DAU 기준)

---

#### 3.2 플랫폼화

**개발 작업**:

- [ ] Public API 출시 ($0.10/요청)
  - RESTful API 설계
  - Rate Limiting (Upstash)
  - API 문서 (Swagger/OpenAPI)
  - Developer Portal
- [ ] SDK 제공 (React, Vue, Flutter)
  - TypeScript SDK
  - 코드 예제 및 튜토리얼
- [ ] 파트너 프로그램 (레베뉴 쉐어 30%)
  - 파트너 대시보드
  - 자동 정산 시스템

**예상 공수**: 8주 (개발자 3명)

**예상 수익**:

- API 매출: $200,000/월 (Year 3)

---

#### 3.3 프리미엄 강화

**개발 작업**:

- [ ] 1:1 라이브 상담 (전문가 매칭)
  - 실시간 채팅 시스템
  - 전문가 매칭 알고리즘
  - 예약 시스템
- [ ] 맞춤형 PDF 리포트 (디자인 개선)
  - PDF 생성 엔진 (Puppeteer)
  - 템플릿 디자인 시스템
- [ ] 장기 구독 할인 (연간 30% 할인)
  - 구독 관리 시스템
  - 자동 갱신 로직
- [ ] 기업 플랜 (팀 궁합 분석)
  - 멀티 사용자 관리
  - 팀 대시보드

**예상 공수**: 6주 (개발자 2명 + 디자이너 1명)

---

#### 3.4 시리즈 A 투자 유치

**준비 작업**:

- [ ] 피칭덱 제작
- [ ] 재무 모델 Excel
- [ ] VC 미팅 (a16z, Lightspeed, Sequoia)
- [ ] Due Diligence 준비

**목표**: $15-30M 조달
**밸류에이션**: $100-150M (post-money)

---

### Phase 3 예상 비용

- 인프라: $20,000/월
- AI 비용: $50,000/월 (독자 모델 전환 시 $15,000)
- 마케팅: $200,000/월
- 인건비: $300,000/월 (50명)
- **Total: $570,000/월**

### Phase 3 예상 수익

- 1M MAU × 7% 전환 × $12 ARPU = **$840,000/월 MRR**
- B2B/API: $200,000/월
- **Total: $1,040,000/월 ($12.5M ARR)**
- 순이익: $470,000/월

---

## Phase 4: 유니콘 진입 (3-5년)

### 목표

- ARR $100M+
- MAU 10,000,000+
- 밸류에이션 $1B+
- 시장 지배력 확보

---

### Year 4-5

#### 4.1 M&A 전략

**개발 작업**:

- [ ] 경쟁사 인수 통합
  - 데이터 마이그레이션
  - 시스템 통합
- [ ] 인재 인수 (Acqui-hire)

**타겟**:

- 지역별 경쟁사 (일본, 동남아)
- 보완 서비스 (명상, 웰니스)

---

#### 4.2 글로벌 확장

**개발 작업**:

- [ ] 10개국 진출 완료
  - 다국어 지원 (15개 언어)
  - 현지 결제 시스템
  - 문화권별 콘텐츠
- [ ] Multi-region 배포
  - AWS/GCP Multi-region
  - CDN 최적화
  - 지연 시간 < 200ms (글로벌)

**예상 공수**: 24주 (개발자 10명)

---

#### 4.3 수익 다각화

**개발 작업**:

- [ ] 광고 플랫폼 (정교한 타겟팅)
  - 자체 광고 시스템
  - 사주/점성술 데이터 기반 타겟팅
- [ ] 커머스 (점술 굿즈)
  - e-Commerce 플랫폼
  - 물류 시스템 통합
- [ ] 이벤트 (온라인 페스티벌)
  - 라이브 스트리밍
  - 티켓팅 시스템
- [ ] 교육 (점술 아카데미)
  - LMS (Learning Management System)
  - 강의 콘텐츠 플랫폼

**예상 공수**: 52주 (개발자 20명)

---

#### 4.4 Exit 옵션

**IPO 준비**:

- [ ] NASDAQ 상장
- [ ] $5B 시가총액 목표
- [ ] 재무 감사
- [ ] 규제 준수 (SOX)

**인수 대상**:

- Match Group
- Bumble
- Meta

**독립 성장**:

- The Pattern 모델 (비상장 유지)

---

## 기술 부채 관리

### 우선순위별 리팩토링

**High Priority** (Phase 2):

- [ ] TypeScript 100% 전환 (현재 95%)
- [ ] API 미들웨어 통합 (중복 제거)
- [ ] 테스트 커버리지 80%+ (현재 669 테스트)

**Medium Priority** (Phase 3):

- [ ] 마이크로서비스 전환
  - AI 서비스 분리
  - 결제 서비스 분리
  - 알림 서비스 분리
- [ ] Event-driven Architecture
  - Kafka or RabbitMQ
  - Event Sourcing

**Low Priority** (Phase 4):

- [ ] GraphQL API 추가
- [ ] gRPC for internal services

---

## 기술 스택 진화

### Current (Year 1)

```
Frontend: Next.js 16 + React 19
Backend: Next.js API Routes
Database: PostgreSQL (Supabase)
Cache: Redis (Upstash)
AI: OpenAI GPT-4o
```

### Target (Year 3)

```
Frontend: Next.js 17+ + React 19
Backend: Next.js + Custom 독자 AI
Database: Citus (분산 PostgreSQL)
Cache: Redis Cluster
AI: 독자 LLM (70% 비용 절감)
```

### Target (Year 5)

```
Frontend: Next.js + React
Backend: Microservices (Node.js + Python)
Database: CockroachDB (글로벌 분산)
Cache: Redis Enterprise
AI: 독자 LLM + Multi-modal AI
Infrastructure: Kubernetes (GKE/EKS)
```

---

## 실행 체크리스트

### Phase 1 (Month 1-6)

- [ ] Destiny Match 바이럴화
- [ ] 온보딩 최적화
- [ ] 바이럴 루프 구축
- [ ] Mixpanel/Amplitude 통합

### Phase 2 (Month 7-18)

- [ ] 인플루언서 마케팅 시스템
- [ ] 커뮤니티 기능
- [ ] 일본 시장 진출
- [ ] B2B API 출시

### Phase 3 (Month 19-24)

- [ ] 독자 AI 모델 개발
- [ ] Public API 출시
- [ ] 프리미엄 강화
- [ ] Series A 투자 유치

### Phase 4 (Year 3-5)

- [ ] 글로벌 확장 (10개국)
- [ ] 수익 다각화
- [ ] M&A 실행
- [ ] IPO 준비

---

**관련 문서**:

- [08_AI_COST_OPTIMIZATION.md](./08_AI_COST_OPTIMIZATION.md)
- [09_SCALING_INFRASTRUCTURE.md](./09_SCALING_INFRASTRUCTURE.md)
- [02_GO_TO_MARKET_STRATEGY.md](./02_GO_TO_MARKET_STRATEGY.md)
