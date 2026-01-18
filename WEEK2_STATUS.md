# Week 2: 코드 품질 개선 - 현재 상태

**날짜**: 2026-01-17
**목표**: 코드 구조 개선 및 유지보수성 향상

---

## 📊 전체 진행 상황

| Task | 목표 | 현재 상태 | 진행률 |
|------|------|-----------|--------|
| template_renderer.py 리팩토링 | 2456 lines → 10-15 files | ✅ **이미 완료** | 100% |
| app.py 리팩토링 | 1497 lines → <500 lines | 📋 계획 수립 완료 | 10% |
| 테스트 커버리지 | 45% → 60% | 🚧 **진행 중** | 30% |

---

## ✅ Task 1: template_renderer.py 리팩토링 (완료!)

### 발견 사항
**rendering 패키지가 이미 완벽하게 구현되어 있습니다!**

### 현재 구조
```
backend_ai/app/rendering/
├── __init__.py          (139 lines) - 공개 API
├── profiles.py          (160 lines) - 일주/별자리 프로필
├── constants.py         (138 lines) - 상수 정의
├── extractors.py        (243 lines) - 데이터 추출
├── generators.py        (359 lines) - 의미 생성
├── builders.py          (357 lines) - 분석 빌드
├── insights.py          (595 lines) - 인사이트 추출
├── theme_sections.py    (279 lines) - 테마별 섹션
└── main.py              (98 lines)  - 메인 엔트리
```

**총합**: 2,368 lines (원본 2,456 lines에서 잘 분리됨)

### 파일별 라인 수 비교

| 구분 | Before | After | 개선 |
|------|--------|-------|------|
| 최대 파일 크기 | 2,456 lines | 595 lines | ✅ 76% 감소 |
| 평균 파일 크기 | - | 263 lines | ✅ 관리 용이 |
| 파일 개수 | 1개 | 9개 | ✅ 도메인 분리 |

### 아키텍처 개선

**Before**:
```
template_renderer.py (2,456 lines)
└── 모든 로직이 한 파일에
```

**After**:
```
rendering/ (모듈화된 패키지)
├── profiles & constants (데이터 정의)
├── extractors (데이터 추출 로직)
├── generators (콘텐츠 생성 로직)
├── builders (분석 구축 로직)
├── insights (인사이트 추출)
├── theme_sections (테마별 렌더링)
└── main (통합 엔트리 포인트)
```

### 사용 현황
```python
# fusion_logic.py에서 사용
from rendering import render_template_report

fusion_text = render_template_report(
    saju_data=saju,
    astro_data=astro,
    theme=theme,
    locale=locale
)
```

### 다음 단계
- [x] 구조 분석 완료
- [x] 모듈화 확인
- [ ] `template_renderer.py` 제거 가능 여부 확인 (선택)
  - 현재: rendering 패키지와 병존
  - 옵션: rendering 패키지만 사용하도록 완전 전환

---

## 📋 Task 2: app.py 리팩토링 (계획 수립 완료)

### 현재 상태
- **파일 크기**: 1,497 lines
- **목표**: < 500 lines
- **전략**: 4개 하위 패키지로 분리

### 리팩토링 계획

#### 목표 구조
```
backend_ai/app/
├── app.py (~350 lines)           # Flask 핵심 설정만
│   ├── Flask app 생성
│   ├── CORS, 블루프린트 등록
│   ├── Error handlers
│   └── Middleware
│
├── loaders/ (~400 lines)         # Lazy loading
│   ├── model_loaders.py          # ML 모델
│   ├── rag_loaders.py            # RAG 시스템
│   └── feature_loaders.py        # 기타 기능
│
├── utils/ (~250 lines)           # 헬퍼 함수
│   ├── sanitizers.py             # sanitize, mask
│   └── normalizers.py            # normalize
│
├── services/ (~400 lines)        # 비즈니스 로직
│   ├── cross_analysis_service.py
│   ├── integration_service.py
│   ├── jung_service.py
│   └── cache_service.py
│
└── startup/ (~70 lines)          # 시작 로직
    └── warmup.py                 # warmup_models()
```

#### 코드 이동 계획

| 섹션 | 현재 lines | 목적지 | 예상 lines |
|------|-----------|--------|-----------|
| Lazy Loaders | ~400 | loaders/ | 400 |
| Helper Functions | ~300 | utils/ | 250 |
| Cross-Analysis | ~200 | services/ | 150 |
| Integration | ~100 | services/ | 100 |
| Jung Data | ~100 | services/ | 100 |
| Session Cache | ~100 | services/ | 100 |
| Warmup | ~70 | startup/ | 70 |
| **Flask 핵심** | ~177 | **app.py** | **~350** |

### 실행 단계
1. **Phase 1**: utils/ 생성 (30분)
2. **Phase 2**: services/ 생성 (1시간)
3. **Phase 3**: loaders/ 생성 (1시간)
4. **Phase 4**: startup/ 생성 (30분)
5. **Phase 5**: app.py 정리 (1시간)
6. **Phase 6**: 통합 테스트 (30분)

**예상 총 소요 시간**: 4-5시간

---

## 🚧 Task 3: 테스트 커버리지 60% 달성 (진행 중 - 30%)

### 완료된 작업 (2026-01-17)

#### 1. 커버리지 Threshold 설정 ✅
```typescript
// vitest.config.ts - Updated 2026-01-17
thresholds: {
  lines: 60,        // ✅ 45% → 60% (상향)
  functions: 75,    // ✅ 68% → 75% (상향)
  branches: 85,     // ✅ 78% → 85% (상향)
  statements: 60,   // ✅ 45% → 60% (상향)
}
```

#### 2. Grading 시스템 테스트 업데이트 ✅
**변경 사항**: GRADE_THRESHOLDS 조정에 따른 테스트 수정
- Grade 0 (최고): 72+ → **68+**
- Grade 1 (좋음): 65-71 → **62-67**
- Grade 2 (보통): 45-64 → **42-61**
- Grade 3 (안좋음): 30-44 → **28-41**
- Grade 4 (최악): <30 → **<28**

**수정된 파일**:
- ✅ `tests/lib/destiny-map/grading.test.ts` (99 tests pass)
- ✅ `tests/lib/destiny-map/scoring-config.test.ts`
- ✅ `tests/lib/destiny-map/calendar/calendar-helpers.test.ts`
- ✅ `src/lib/destiny-map/calendar/grading.ts` (주석 업데이트)

#### 3. 문서 작성 ✅
- ✅ [TEST_COVERAGE_PLAN.md](TEST_COVERAGE_PLAN.md) - 상세 커버리지 개선 계획

### 현재 테스트 현황
- **총 테스트 파일**: 376개
- **총 테스트 케이스**: ~12,644개
- **통과율**: 368 passed / 8 failed (98% 통과)
- **실패 원인**: Redis 환경 의존성 (로컬 환경 이슈)

### 다음 단계

#### Day 3 오후 (남은 작업)
- [ ] 커버리지 리포트 분석 (coverage-summary.json)
- [ ] 낮은 커버리지 파일 식별 및 우선순위 설정
- [ ] Edge case 테스트 추가 시작
  - [ ] date-helpers.ts: Timezone, leap year
  - [ ] cosmicCompatibility.ts: Element matching

#### Day 4
- [ ] ultraPrecisionEngine.ts 예측 로직 테스트
- [ ] engine-core.ts 행성 계산 테스트
- [ ] 60% 목표 달성 확인

### 우선순위 파일 (예상)
1. `src/lib/destiny-map/calendar/date-helpers.ts` - Timezone/Date 경계
2. `src/lib/compatibility/cosmicCompatibility.ts` - 교차 분석
3. `src/lib/prediction/ultraPrecisionEngine.ts` - 운세 예측
4. `src/lib/destiny-map/astrology/engine-core.ts` - 행성 계산
5. `src/lib/Tarot/questionClassifiers.ts` - 질문 분류

**예상 남은 시간**: 2-3시간

---

## 📈 Week 2 전체 타임라인

### Day 1-2 (완료)
- [x] template_renderer.py 분석
- [x] rendering 패키지 구조 확인
- [x] app.py 리팩토링 계획 수립

### Day 3-4 (예정)
- [ ] app.py 리팩토링 실행
  - [ ] Phase 1-3: 코드 분리
  - [ ] Phase 4-6: 통합 및 테스트

### Day 5 (예정)
- [ ] 테스트 커버리지 개선
  - [ ] 핵심 파일 5개 테스트 추가
  - [ ] 60% 목표 달성
  - [ ] Coverage 리포트 생성

---

## 🎯 성공 기준

### 코드 구조
- [x] template_renderer.py: 파일당 <600 lines ✅
- [ ] app.py: <500 lines ⏳
- [ ] 각 모듈 독립적으로 테스트 가능

### 테스트
- [ ] 전체 테스트 통과율 100%
- [ ] 커버리지 60% 이상
- [ ] E2E 테스트 안정성 유지

### 문서화
- [x] 리팩토링 계획서 작성
- [ ] 각 모듈 docstring 추가
- [ ] 아키텍처 다이어그램 업데이트

---

## 📚 생성된 문서

1. **[REFACTORING_PLAN_TEMPLATE_RENDERER.md](REFACTORING_PLAN_TEMPLATE_RENDERER.md)**
   - template_renderer.py 리팩토링 계획 (완료된 작업 확인용)

2. **[REFACTORING_PLAN_APP_PY.md](REFACTORING_PLAN_APP_PY.md)**
   - app.py 리팩토링 상세 계획
   - 단계별 실행 가이드

3. **[WEEK2_STATUS.md](WEEK2_STATUS.md)** (이 문서)
   - Week 2 전체 진행 상황

---

## 🔍 발견 사항 & 인사이트

### 긍정적 발견
1. **rendering 패키지 이미 완성**: 코드 품질이 이미 높은 수준
2. **모듈화 패턴 일관성**: profiles → extractors → generators → builders 흐름
3. **테스트 파일 존재**: `test_template_renderer.py`, `test_rendering.py`

### 개선 필요 사항
1. **app.py 복잡도**: 여전히 1,497 lines로 높음
2. **전역 변수 남용**: `_SESSION_RAG_CACHE`, lazy loader 전역 변수들
3. **순환 import 리스크**: 일부 모듈 간 의존성 복잡

### 배운 점
- **Lazy Loading 패턴**: OOM 방지 위해 필수적
- **Flask 블루프린트**: 이미 routers/로 잘 분리됨
- **점진적 리팩토링**: rendering 패키지처럼 기존 파일 유지하며 신규 패키지 추가

---

## 다음 작업

**우선순위 1**: app.py 리팩토링 실행
- 예상 시간: 4-5시간
- 시작: 준비 완료 (계획 수립됨)

**우선순위 2**: 테스트 커버리지 개선
- 예상 시간: 3-4시간
- 의존성: app.py 리팩토링 후 진행

---

**마지막 업데이트**: 2026-01-17
**다음 업데이트**: app.py Phase 1 완료 후
