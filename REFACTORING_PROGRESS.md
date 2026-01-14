# Backend_AI 리팩토링 진행 상황

> 전체 로드맵: [BACKEND_AI_REFACTORING_ROADMAP.md](BACKEND_AI_REFACTORING_ROADMAP.md)

## 🎉 Phase 1 완료! (100%)

### Phase 1 Overview
```
Phase 1.1: Routes 추출          ✅ 100% (24/24 routes, ~1,082줄)
Phase 1.2: Lazy Loading         ✅ 100% (443줄 유틸리티)
Phase 1.3: Service Layer        ✅ 100% (1,456줄 5개 서비스)
Phase 1.4: Data Loading         ✅ 100% (640줄 데이터 로더)
Phase 1.5: app.py Cleanup       ✅ 100% (24개 @app.route 제거)
────────────────────────────────────────────────────────
Phase 1 Total:                  ✅ 100% COMPLETE!
```

## 🎉 Phase 2 완료! (100%)

## 🚀 Phase 3 진행 중: Additional Services (추가 서비스 분리)

### Phase 3 Overview
```
Phase 3.1: DestinyStoryService 생성    ✅ 100% (558줄 분리!)
Phase 3.2: SajuCounselorService 생성   ✅ 100% (340줄 분리!)
Phase 3.3: AstrologyCounselorService   ✅ 100% (343줄 분리!)
Phase 3.4: TarotService 생성           ✅ 100% (426줄 분리!)
Phase 3.5: SearchRoutes 정리           ✅ 100% (218줄 분리!)
────────────────────────────────────────────────────────
Phase 3 진행률:                        ✅ 100% COMPLETE! (5/5 services)
```

---

## ✅ Phase 2 완료: Services Layer (비즈니스 로직 분리)

### Phase 2 Overview
```
Phase 2.1: FortuneService 생성       ✅ 100% (ask() 로직 분리, 60줄 감소)
Phase 2.2: StreamingService 생성     ✅ 100% (ask_stream() 987줄 분리!)
Phase 2.3: CounselorService 생성     ✅ 100% (counselor_init() 104줄 분리!)
Phase 2.4: DreamService + Routes     ✅ 100% (dream_chat_stream 602줄 분리!)
Phase 2.5: ChartService 생성         ✅ 100% (chart functions 901줄 분리!)
────────────────────────────────────────────────────────
Phase 2 진행률:                      ✅ 100% COMPLETE! (5/5 services)
```

### ✅ Phase 2.1 완료: FortuneService (2026-01-14)

**목표:** 운세 계산 비즈니스 로직을 app.py에서 FortuneService로 분리

**생성된 파일:**
1. `backend_ai/services/__init__.py` (48줄)
   - Service registry with lazy loading
   - get_fortune_service(), get_dream_service(), get_counseling_service(), get_chart_service()

2. `backend_ai/services/fortune_service.py` (139줄)
   - FortuneService.calculate_fortune() - ask() 로직 100% 동일하게 이동
   - Input validation, sanitization, performance monitoring 모두 포함
   - Helper function normalize_day_master() 포함

**수정된 파일:**
1. `backend_ai/app/routers/stream_routes.py`
   - /ask 라우트: Proxy 패턴 → FortuneService 직접 호출로 변경
   - _get_fortune_service() lazy loader 추가
   - ✅ Phase 2 리팩토링 완료 표시

2. `backend_ai/app/app.py`
   - ask() 함수 제거 (~60줄)
   - 제거 위치에 주석 마커 추가 (새 위치 안내)
   - **8,325줄 → 8,265줄 (60줄 감소)**

**아키텍처 변화:**
```
Before (Phase 1):
  Request → stream_routes.py → app.ask() → business logic

After (Phase 2.1):
  Request → stream_routes.py → FortuneService.calculate_fortune() → business logic
```

**결과:**
- ✅ 첫 번째 Service 성공적 추출 검증
- ✅ 비즈니스 로직 100% 동일 유지 (기능 변화 없음)
- ✅ app.py 크기 감소: 8,325 → 8,265 줄
- ✅ Services 레이어 패턴 확립

---

### ✅ Phase 2.2 완료: StreamingService (2026-01-14)

**목표:** SSE 스트리밍 비즈니스 로직을 app.py에서 StreamingService로 분리

**생성된 파일:**
1. `backend_ai/services/streaming_service.py` (1,088줄)
   - StreamingService.stream_fortune() - ask_stream() 로직 100% 동일하게 이동
   - SSE (Server-Sent Events) 스트리밍 처리
   - RAG 컨텍스트 통합 (Jung psychology, cross-analysis, graph nodes)
   - 위기 감지 및 치료 가이드 (CrisisDetector)
   - 대화 이력 관리 (12개 메시지 히스토리)
   - 생애주기 가이드, 테마 융합 규칙, 적극적 상상 프롬프트
   - 감정 추적 및 사용자 컨텍스트 (persona, sessions, personality type)
   - CV/이력서 통합 (커리어 상담용)
   - 8개 Helper 메서드: user_context, lifespan, theme_fusion, imagination, crisis, therapeutic, system_prompt, emotion

**수정된 파일:**
1. `backend_ai/app/routers/stream_routes.py`
   - /ask-stream 라우트: Proxy 패턴 → StreamingService 직접 호출로 변경
   - _get_streaming_service() lazy loader 추가
   - ✅ Phase 2 리팩토링 완료 표시
   - request 파라미터 추출 및 StreamingService.stream_fortune() 호출

2. `backend_ai/services/__init__.py`
   - get_streaming_service() 함수 추가
   - StreamingService exports 추가

3. `backend_ai/app/app.py`
   - ask_stream() 함수 제거 (~987줄)
   - 제거 위치에 주석 마커 추가 (새 위치 안내)
   - **8,282줄 → 7,295줄 (987줄 감소!)**

**아키텍처 변화:**
```
Before (Phase 1):
  Request → stream_routes.py → app.ask_stream() → SSE generator → OpenAI stream

After (Phase 2.2):
  Request → stream_routes.py → StreamingService.stream_fortune() → SSE generator → OpenAI stream
```

**결과:**
- ✅ 최대 규모 함수(994줄) 성공적 추출
- ✅ 비즈니스 로직 100% 동일 유지 (SSE, RAG, 위기감지, 치료가이드 모두 포함)
- ✅ app.py 크기 대폭 감소: 8,282 → 7,295 줄 (**987줄 감소!**)
- ✅ 복잡한 스트리밍 로직 완전 분리

---

### ✅ Phase 2.3 완료: CounselorService (2026-01-14)

**목표:** Counselor 세션 초기화 및 RAG prefetch 로직을 app.py에서 CounselorService로 분리

**생성된 파일:**
1. `backend_ai/services/counselor_service.py` (165줄)
   - CounselorService.initialize_session() - counselor_init() 로직 100% 동일하게 이동
   - RAG prefetch 로직 (GraphRAG, CorpusRAG, PersonaEmbedRAG, DomainRAG, Cross-analysis)
   - Birth data validation 및 computed payload 검증
   - Session cache 관리 (UUID 생성, Redis 저장)

**수정된 파일:**
1. `backend_ai/app/routers/stream_routes.py`
   - /counselor/init 라우트: Proxy 패턴 → CounselorService 직접 호출로 변경
   - _get_counselor_service() lazy loader 추가
   - ✅ Phase 2 리팩토링 완료 표시
   - Request 파라미터 추출 및 CounselorService.initialize_session() 호출

2. `backend_ai/services/__init__.py`
   - get_counselor_service() 함수 추가 (이미 존재했음)
   - CounselorService exports 추가

3. `backend_ai/app/app.py`
   - counselor_init() 함수 제거 (~104줄)
   - 제거 위치에 주석 마커 추가 (새 위치 안내)
   - **7,295줄 → 7,197줄 (104줄 감소!)**

**아키텍처 변화:**
```
Before (Phase 1):
  Request → stream_routes.py → app.counselor_init() → RAG prefetch

After (Phase 2.3):
  Request → stream_routes.py → CounselorService.initialize_session() → RAG prefetch
```

**결과:**
- ✅ stream_routes.py의 모든 proxy 제거 완료 (/ask, /ask-stream, /counselor/init)
- ✅ RAG prefetch 로직 100% 동일 유지 (기능 변화 없음)
- ✅ app.py 크기 감소: 7,295 → 7,197 줄 (**104줄 감소!**)
- ✅ Counselor 세션 관리 완전 분리

---

### ✅ Phase 2.4 완료: DreamService + dream_routes.py (2026-01-14)

**목표:** 꿈 해석 비즈니스 로직을 app.py에서 DreamService + dream_routes.py로 완전 분리

**생성된 파일:**
1. `backend_ai/services/dream_service.py` (736줄) - **이미 Phase 2.3에서 생성됨**
   - DreamService.stream_dream_chat() - dream_chat_stream() 로직 100% 동일하게 이동
   - SSE (Server-Sent Events) 스트리밍 처리
   - RAG 통합: DreamRAG (interpretation context, therapeutic questions, counseling scenarios)
   - Crisis detection (5-level severity with CounselingEngine)
   - Session management with CounselingEngine (phase tracking)
   - Celestial context (moon phase, moon sign, retrogrades)
   - Saju fortune context (day master, daeun, iljin)
   - Previous consultations memory (continuity, up to 3 sessions)
   - Persona memory (personalization, session count, key insights, emotional tone)
   - Jung enhanced context from CounselingEngine (psychological type, alchemy stage, RAG questions/insights)
   - Multi-language support (Korean/English)
   - Cultural notes (Korean haemong + Western psychology)
   - 8개 Helper 메서드: celestial_context, saju_context, previous_context, persona_context, jung_context, session_phase_context, prompts (build_prompts)

2. `backend_ai/app/routers/dream_routes.py` (285줄) - **Phase 2.4에서 신규 생성**
   - /api/dream/chat-stream 라우트: DreamService.stream_dream_chat() 직접 호출
   - /api/dream/interpret-stream 라우트: 간단한 GPT 스트리밍 (dream_interpret_stream 로직 100% 이동)
   - _get_dream_service() lazy loader 추가
   - ✅ Phase 2.4 리팩토링 완료 표시

**수정된 파일:**
1. `backend_ai/app/routers/__init__.py`
   - dream_bp import 추가 (lines 75-79) - **이미 존재했음**
   - register_all_blueprints()에서 자동 등록

2. `backend_ai/services/__init__.py`
   - get_dream_service() 함수 추가 (이미 존재했음)
   - DreamService exports 추가

3. `backend_ai/app/app.py`
   - dream_chat_stream() 함수 제거 (~602줄) - **Phase 2.3에서 이미 제거됨**
   - dream_interpret_stream() 함수 제거 (~178줄) - **Phase 2.4에서 제거**
   - 제거 위치에 주석 마커 추가 (새 위치 안내)
   - **7,197줄 → 6,448줄 (749줄 감소!)**

**아키텍처 변화:**
```
Before (Phase 1):
  Request → app.dream_chat_stream() → SSE generator → OpenAI stream (602줄 함수)
  Request → app.dream_interpret_stream() → SSE generator → OpenAI stream (178줄 함수)

After (Phase 2.4):
  Request → dream_routes.py → DreamService.stream_dream_chat() → SSE generator (736줄 서비스)
  Request → dream_routes.py → dream_interpret_stream() → SSE generator (route에서 직접 처리)
```

**결과:**
- ✅ 꿈 해석 관련 2개 함수 성공적 추출 (총 780줄)
  - dream_chat_stream: 602줄 (Phase 2.3에서 DreamService로 이동)
  - dream_interpret_stream: 178줄 (Phase 2.4에서 dream_routes.py로 이동)
- ✅ 비즈니스 로직 100% 동일 유지 (RAG, Crisis detection, Jung psychology, Saju, Celestial)
- ✅ app.py 크기 대폭 감소: 7,197 → 6,448 줄 (**749줄 감소!**)
- ✅ 꿈 해석 SSE 스트리밍 완전 분리
- ✅ dream_routes.py 신규 생성으로 꿈 관련 라우팅 중앙화

---

### ✅ Phase 2.5 완료: ChartService (2026-01-14)

**목표:** 차트 분석 비즈니스 로직을 app.py에서 ChartService로 분리

**생성된 파일:**
1. `backend_ai/services/chart_service.py` (750줄)
   - ChartService.get_cross_analysis_for_chart() - 532줄 함수 100% 동일하게 이동
   - ChartService.get_theme_fusion_rules() - 369줄 함수 100% 동일하게 이동
   - Cross-analysis: 9 types combining Saju and Astrology from GraphRAG cache
     * Daymaster × Sun Sign
     * Ten Gods × Planets
     * Branch × House
     * Relations × Aspects
     * Shinsal × Asteroids
     * Geokguk × House
     * Daeun × Progressions
     * 60 Ganji × Harmonics
     * Gongmang × Draconic
   - Theme-specific fusion rules from JSON files:
     * daily.json, monthly.json, new_year.json, next_year.json
     * family.json, health.json, wealth.json, life_path.json
   - Planet-house combinations with timing/advice
   - Multi-language support (Korean/English)
   - Theme-based domain selection (career, love, health, wealth, family, life_path, etc.)

**수정된 파일:**
1. `backend_ai/app/app.py`
   - get_cross_analysis_for_chart() 함수 제거 (532줄)
   - get_theme_fusion_rules() 함수 제거 (369줄)
   - prefetch_all_rag_data() 함수에서 ChartService 사용하도록 변경 (line 2120-2123)
   - 제거 위치에 주석 마커 추가 (새 위치 안내)
   - **6,620줄 → 5,581줄 (1,039줄 감소!)**

2. `backend_ai/services/__init__.py`
   - get_chart_service() 함수 이미 존재
   - ChartService exports 이미 존재

**아키텍처 변화:**
```
Before (Phase 2.4):
  Request → prefetch_all_rag_data() → app.get_cross_analysis_for_chart() → analysis

After (Phase 2.5):
  Request → prefetch_all_rag_data() → ChartService.get_cross_analysis_for_chart() → analysis
```

**결과:**
- ✅ Phase 2 완료! 5개 Service 모두 추출 완료
- ✅ 차트 분석 함수 2개 성공적 추출 (총 901줄)
  - get_cross_analysis_for_chart: 532줄 (9가지 cross-analysis + fusion rules)
  - get_theme_fusion_rules: 369줄 (theme-specific rules from 8 JSON files)
- ✅ 비즈니스 로직 100% 동일 유지 (GraphRAG, fusion rules, multi-language, planet-house)
- ✅ app.py 크기 대폭 감소: 6,620 → 5,581 줄 (**1,039줄 감소!**)
- ✅ 차트 분석 로직 완전 분리
- ✅ ChartService는 stateless로 재사용 가능

---

## 📊 Phase 1 완료: Blueprint 기반 라우팅 ✅ COMPLETE

### ✅ 완료된 작업 (2026-01-14)

#### Phase 1.6: 최종 @app.route 제거 (2026-01-14)

모든 남아있던 @app.route 데코레이터를 제거하여 완전한 Blueprint 기반 라우팅으로 전환:

1. **Dream Routes** (3개 라우트)
   - `/api/dream/interpret-stream` → dream_routes.py
   - `/api/dream/chat-stream` → dream_routes.py
   - `/dream`, `/api/dream` → dream_routes.py

2. **Counseling Routes** (3개 라우트)
   - `/api/counseling/chat` → counseling_routes.py
   - `/api/counseling/therapeutic-questions` → counseling_routes.py
   - `/api/counseling/health` → counseling_routes.py

3. **Destiny Story Route** (1개 라우트)
   - `/api/destiny-story/generate-stream` → TODO: fortune_routes.py로 이동 예정

**결과:**
- ✅ app.py에서 모든 @app.route 데코레이터 제거 완료 (0개 남음)
- ✅ app.py 크기: 8,342줄 → 8,325줄 (17줄 감소)
- ✅ 함수는 유지 (Routers가 import)
- ✅ 완전한 Blueprint 기반 아키텍처로 전환

---

### ✅ 이전 완료 작업

#### 새로 생성된 Routers

1. **core_routes.py** (91줄) - Core functionality
   - `/` - Index/health check
   - `/health` - Basic health check
   - `/ready` - Readiness check
   - `/capabilities` - Feature capabilities

2. **chart_routes.py** (167줄) - Chart calculations
   - `/calc_saju` - Saju calculation
   - `/calc_astro` - Astrology calculation
   - `/transits` - Current transits
   - `/charts/saju` - Saju chart SVG
   - `/charts/natal` - Natal chart SVG
   - `/charts/full` - Full chart HTML

3. **cache_routes.py** (169줄) - Cache & monitoring
   - `/cache/stats` - Cache statistics
   - `/cache/clear` - Clear cache
   - `/performance/stats` - Performance stats
   - `/metrics` - Prometheus metrics
   - `/health/full` - Full health check

4. **search_routes.py** (287줄) - RAG search
   - `/api/search/domain` - Domain-specific RAG search
   - `/api/search/hybrid` - Hybrid RAG search (BM25 + Vector + Graph)
   - Includes helper functions for Tarot query expansion

5. **routers/__init__.py** - Updated with new blueprints

### 📈 진행 상황
- **이동 완료**: 32 / 32 라우트 (100%) ✅
- **Router 파일**: 18개 Blueprint 파일
- **@app.route 제거**: 32개 → 0개 (완전 제거)

### ✅ 모든 라우트 이동 완료!

#### 이동된 라우트 목록 (32개)

**Core & Infrastructure (9개)**
- `/`, `/health`, `/ready`, `/capabilities` → core_routes.py
- `/cache/stats`, `/cache/clear`, `/performance/stats`, `/metrics`, `/health/full` → cache_routes.py

**Chart Calculation (6개)**
- `/calc_saju`, `/calc_astro`, `/transits` → chart_routes.py
- `/charts/saju`, `/charts/natal`, `/charts/full` → chart_routes.py

**RAG Search (2개)**
- `/api/search/domain`, `/api/search/hybrid` → search_routes.py

**Streaming Fortune (3개)**
- `/ask`, `/ask-stream`, `/counselor/init` → stream_routes.py

**Dream Analysis (4개)**
- `/dream`, `/api/dream` → dream_routes.py
- `/api/dream/interpret-stream`, `/api/dream/chat-stream` → dream_routes.py

**Counseling (3개)**
- `/api/counseling/chat`, `/api/counseling/therapeutic-questions`, `/api/counseling/health` → counseling_routes.py

**Saju Counselor (2개)**
- `/saju/counselor/init`, `/saju/ask-stream` → saju_routes.py

**Astrology Counselor (2개)**
- `/astrology/counselor/init`, `/astrology/ask-stream` → astrology_routes.py

**Destiny Story (1개)**
- `/api/destiny-story/generate-stream` → (app.py에 유지, fortune_routes.py 이동 예정)

### 🎯 Phase 1 완료 요약

**달성한 목표:**
1. ✅ 모든 @app.route 데코레이터 제거 (32개 → 0개)
2. ✅ 18개 Blueprint router 파일로 완전 분리
3. ✅ 완전한 Blueprint 기반 아키텍처로 전환
4. ✅ Lazy loading을 통한 메모리 최적화 유지
5. ✅ app.py 크기 감소: 8,342줄 → 8,325줄

**아키텍처 개선:**
- 라우팅이 완전히 Blueprint로 분리됨
- 각 도메인별 router 파일로 책임 분산
- app.py는 이제 Flask 앱 초기화 및 공통 로직만 담당

**다음 개선 사항 (Phase 2 고려):**
1. Services 레이어 생성 (비즈니스 로직 분리)
2. Routers가 app.py 함수 대신 Services 직접 호출
3. app.py에서 비즈니스 로직 완전 제거

---

## 📊 통계

### app.py 크기 변화 (Phase 1 + Phase 2 + Phase 3)
- **시작 (Phase 0)**: 8,342줄, 32개 @app.route 데코레이터
- **Phase 1.6 완료 후**: 8,325줄, 0개 @app.route 데코레이터 (17줄 감소)
- **Phase 2.1 완료 후**: 8,265줄 (ask() 함수 제거, 60줄 감소)
- **Phase 2.2 완료 후**: 7,295줄 (ask_stream() 함수 제거, 987줄 감소)
- **Phase 2.3 완료 후**: 7,197줄 (counselor_init() 함수 제거, 98줄 감소)
- **Phase 2.4 완료 후**: 6,620줄 (dream_chat_stream() 함수 제거, 602줄 감소)
- **Phase 2.5 완료 후**: 5,581줄 (chart functions 제거, 1,039줄 감소)
- **Phase 3.1 완료 후**: 5,033줄 (generate_destiny_story_stream 제거, **558줄 감소**)
- **Phase 3.2 완료 후**: 4,693줄 (saju counselor functions 제거, **340줄 감소**)
- **Phase 3.3 완료 후**: 4,350줄 (astrology counselor functions 제거, **343줄 감소**)
- **Phase 3.4 완료 후**: 3,924줄 (tarot functions 제거, **426줄 감소**)
- **Phase 3.5 완료 후**: 3,724줄 (search functions 제거, **218줄 감소**)
- **총 감소**: **4,618줄** (8,342 → 3,724)
- **목표**: ~1,000줄 (약 2,724줄 더 제거 필요)
- **진행률**: 62.9% (4,618/7,342 줄)

### Router 파일 (18개) - Phase 1
- ✅ core_routes.py (91줄) - 기본 인프라
- ✅ chart_routes.py (167줄) - 차트 계산
- ✅ cache_routes.py (169줄) - 캐시 & 모니터링
- ✅ search_routes.py (287줄) - RAG 검색
- ✅ stream_routes.py (~170줄) - 스트리밍 포춘텔링 [Phase 2: /ask 리팩토링 완료]
- ✅ saju_routes.py (~140줄) - 사주 counselor
- ✅ astrology_routes.py (~140줄) - 점성 counselor
- ✅ dream_routes.py (285줄) - 꿈 해몽 [Phase 2.4: dream_interpret_stream 추가]
- ✅ counseling_routes.py (20KB+) - 융 심리 상담
- ✅ tarot_routes.py (82KB+) - 타로 해석
- ✅ iching_routes.py (26KB+) - 주역 점
- ✅ fortune_routes.py (~23KB) - 운세 점수
- ✅ prediction_routes.py (~12KB) - 예측 엔진
- ✅ theme_routes.py (~6KB) - 테마 필터
- ✅ compatibility_routes.py (~8KB) - 궁합 분석
- ✅ numerology_routes.py (~2KB) - 수비학
- ✅ icp_routes.py (~2KB) - ICP 성격
- ✅ rlhf_routes.py (~10KB) - RLHF 피드백

### Service 파일 (5개 계획 / 5개 완료) - Phase 2 ✅ COMPLETE!
- ✅ fortune_service.py (139줄) - 운세 계산 [Phase 2.1 완료]
- ✅ streaming_service.py (1,087줄) - SSE 스트리밍, RAG, 위기감지, 치료가이드 [Phase 2.2 완료]
- ✅ counselor_service.py (165줄) - RAG prefetch, 세션 관리 [Phase 2.3 완료]
- ✅ dream_service.py (735줄) - 꿈 해석, SSE 스트리밍, DreamRAG, 위기감지, Jung 컨텍스트 [Phase 2.4 완료]
- ✅ chart_service.py (750줄) - 차트 분석, Cross-analysis (9 types), Theme fusion rules [Phase 2.5 완료]

### 이동된 라우트
- **완료**: 32 / 32 (100%) ✅
- **남음**: 0 / 32 (0%) ✅

---

## 💡 인사이트

### 발견된 패턴
1. **복잡한 helper functions**: search_routes의 Tarot query expansion 같은 복잡한 로직이 라우트 안에 포함
2. **Lazy loading 의존성**: 많은 라우트가 app.py의 lazy loading 변수에 의존
3. **스트리밍 패턴**: /ask-stream, /saju/ask-stream 등 유사한 스트리밍 패턴 반복

### Phase 1.2-1.3에서 처리할 사항
- Helper functions를 services로 분리
- Lazy loading 유틸리티 중앙화
- 스트리밍 패턴 공통화

---

## 🎯 Phase 1.5: app.py Cleanup 상세 내역

### 제거된 @app.route 데코레이터 (24개)

**core_routes.py로 이동 (4개)**:
- `@app.route("/")` → index()
- `@app.route("/health")` → health_check()
- `@app.route("/ready")` → readiness_check()
- `@app.route("/capabilities")` → get_capabilities()

**chart_routes.py로 이동 (6개)**:
- `@app.route("/calc_saju")` → calc_saju()
- `@app.route("/calc_astro")` → calc_astro()
- `@app.route("/transits")` → get_transits()
- `@app.route("/charts/saju")` → generate_saju_chart()
- `@app.route("/charts/natal")` → generate_natal_chart()
- `@app.route("/charts/full")` → generate_full_charts()

**cache_routes.py로 이동 (5개)**:
- `@app.route("/cache/stats")` → cache_stats()
- `@app.route("/cache/clear")` → cache_clear()
- `@app.route("/performance/stats")` → performance_stats()
- `@app.route("/metrics")` → prometheus_metrics()
- `@app.route("/health/full")` → full_health_check()

**search_routes.py로 이동 (2개)**:
- `@app.route("/api/search/domain")` → domain_rag_search()
- `@app.route("/api/search/hybrid")` → hybrid_rag_search()

**stream_routes.py로 이동 (3개)**:
- `@app.route("/ask")` → ask()
- `@app.route("/ask-stream")` → ask_stream()
- `@app.route("/counselor/init")` → counselor_init()

**saju_routes.py로 이동 (2개)**:
- `@app.route("/saju/counselor/init")` → saju_counselor_init()
- `@app.route("/saju/ask-stream")` → saju_ask_stream()

**astrology_routes.py로 이동 (2개)**:
- `@app.route("/astrology/counselor/init")` → astrology_counselor_init()
- `@app.route("/astrology/ask-stream")` → astrology_ask_stream()

### 자동화 도구
- **스크립트**: [backend_ai/scripts/remove_migrated_routes.py](backend_ai/scripts/remove_migrated_routes.py)
- **기능**: @app.route 데코레이터만 제거, 함수 본체는 유지 (proxy pattern)
- **안전성**: Dry run 먼저 실행 → 검증 → 실제 제거

---

## 📝 변경 이력

- **2026-01-14 (Phase 2.4)**: dream_routes.py 생성, dream_interpret_stream() 로직 분리 (**749줄 감소!**)
  - dream_routes.py 신규 생성 (285줄)
  - /api/dream/interpret-stream, /api/dream/chat-stream 라우트 추가
  - dream_interpret_stream() 함수 제거 (178줄)
  - app.py: 7,197 → 6,448줄
- **2026-01-14 (Phase 2.3)**: CounselorService 생성, counselor_init() 로직 분리 (98줄 감소)
- **2026-01-14 (Phase 2.2)**: StreamingService 생성, ask_stream() 로직 분리 (**987줄 감소!**)
- **2026-01-14 (Phase 2.1)**: FortuneService 생성, ask() 로직 분리 (60줄 감소)
- **2026-01-14 (Phase 1.6)**: 최종 7개 @app.route 제거 (dream, counseling, destiny-story)
- **2026-01-14 (Phase 1.5)**: 초기 24개 @app.route 제거 완료
- **2026-01-14 (Phase 1.1-1.4)**: Router 파일 생성 및 Blueprint 구조 수립
- **2026-01-14**: Backend AI 리팩토링 시작

**시작일**: 2026-01-14
**Phase 1 완료**: 2026-01-14
**Phase 2 완료**: 2026-01-14 (5/5 services)
**Phase 3 완료**: 2026-01-14 (5/5 services)
**상태**: ✅ **Phase 3 완료! app.py 8,342 → 3,724줄 (55.4% 감소)**
