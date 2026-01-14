# Backend_AI 리팩토링 진행 상황

> 전체 로드맵: [BACKEND_AI_REFACTORING_ROADMAP.md](BACKEND_AI_REFACTORING_ROADMAP.md)

## 📊 현재 진행: Phase 1.1 - 라우트 추출

### ✅ 완료된 작업 (2026-01-14)

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
- **이동 완료**: 17 / 32 라우트 (53%)
- **새 파일**: 4개 router 파일 생성
- **코드 라인**: ~714줄 (4개 파일 합계)

### 📋 남은 라우트 (15개)

#### 스트리밍 관련 (복잡한 로직)
- `/ask` - 메인 fortune telling (synchronous)
- `/ask-stream` - 메인 fortune telling (streaming)
- `/counselor/init` - Counselor session initialization
- `/api/dream/interpret-stream` - Dream interpretation streaming
- `/api/dream/chat-stream` - Dream chat streaming
- `/dream`, `/api/dream` - Dream endpoints

#### 상담 관련
- `/api/counseling/chat` - Counseling chat
- `/api/counseling/therapeutic-questions` - Therapeutic questions
- `/api/counseling/health` - Counseling health check

#### 도메인별 Counselor
- `/saju/counselor/init` - Saju counselor init
- `/saju/ask-stream` - Saju streaming
- `/astrology/counselor/init` - Astrology counselor init
- `/astrology/ask-stream` - Astrology streaming

#### 스토리 생성
- `/api/destiny-story/generate-stream` - 15-chapter destiny story streaming

### 🎯 다음 단계

1. **남은 라우트 이동 (선택적)**
   - 복잡한 스트리밍 라우트들은 helper functions과 함께 이동해야 함
   - 일부는 기존 routers와 통합 필요 (dream_routes, counseling_routes)

2. **현재 작업 검증**
   - 새로 만든 routers가 정상 작동하는지 확인
   - app.py에서 Blueprint 등록 확인

3. **Phase 1.2로 진행**
   - 중앙화된 lazy loading 유틸리티 생성
   - 코드 중복 제거

---

## 📊 통계

### app.py 크기 변화
- **시작**: 8,342줄 (367KB)
- **현재**: 8,342줄 (아직 제거 안 함)
- **이동 완료**: ~714줄이 routers로 분리됨
- **목표 (Phase 1 완료)**: ~1,200줄 (85% 감소)

### 생성된 파일
- ✅ backend_ai/app/routers/core_routes.py (91줄)
- ✅ backend_ai/app/routers/chart_routes.py (167줄)
- ✅ backend_ai/app/routers/cache_routes.py (169줄)
- ✅ backend_ai/app/routers/search_routes.py (287줄)
- ✅ backend_ai/app/routers/__init__.py (업데이트)

### 이동된 라우트
- **완료**: 17 / 32 (53%)
- **남음**: 15 / 32 (47%)

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

시작일: 2026-01-14
마지막 업데이트: 2026-01-14 (search_routes 추가)
