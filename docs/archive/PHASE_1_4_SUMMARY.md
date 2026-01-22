# Phase 1.4 완료 요약: Data Loading 분리

**날짜**: 2026-01-14
**단계**: Phase 1.4 - Data Loading 분리
**상태**: ✅ 완료 (100%)

---

## 🎯 목표

app.py에 흩어진 JSON 데이터 로딩 코드를 utils/data_loader.py로 중앙화

---

## ✅ 완료된 작업

### 생성된 파일 (1개, ~600줄)

#### [utils/data_loader.py](backend_ai/app/utils/data_loader.py) (~600줄)
**역할**: 중앙화된 JSON 데이터 로딩 시스템

**주요 기능**:
- `load_json_file()` - 범용 JSON 파일 로더
- `load_json_files()` - 여러 JSON 파일 일괄 로딩
- `load_integration_data()` - Integration/Numerology 데이터
- `load_jung_data()` - Jung 심리학 데이터 (13개 파일)
- `load_cross_analysis_cache()` - Cross-analysis 캐시
- `load_fusion_rules()` - Fusion 규칙 (11개 테마)
- `load_spread_config()` - Tarot spread 설정
- `clear_all_caches()` - 캐시 초기화
- `get_cache_stats()` - 캐시 통계
- `preload_all_data()` - 전체 데이터 사전 로딩

**캐시 시스템**:
```python
# 5개 글로벌 캐시
_INTEGRATION_DATA_CACHE = {}  # Integration + Numerology (7개 파일)
_JUNG_DATA_CACHE = {}         # Jung psychology (13개 파일)
_CROSS_ANALYSIS_CACHE = {}    # Cross-analysis files
_FUSION_RULES_CACHE = {}      # Fusion rules (11개 테마)
_SPREAD_CONFIG_CACHE = {}     # Tarot spread configs
```

---

## 📊 데이터 로딩 통합

### Before: app.py에 흩어진 로딩 코드

**문제점**:
- ❌ 4개 다른 위치에서 JSON 로딩
- ❌ 각각 다른 캐싱 전략
- ❌ 중복된 에러 핸들링
- ❌ 재사용 불가능

**app.py의 JSON 로딩 패턴**:
```python
# Pattern 1: Integration data (L595-643)
_INTEGRATION_DATA_CACHE = {}
def _load_integration_data():
    # ... 48 lines of loading logic

# Pattern 2: Jung data (L684-723)
_JUNG_DATA_CACHE = {}
def _load_jung_data():
    # ... 39 lines of loading logic

# Pattern 3: Cross-analysis (L821-847)
_CROSS_ANALYSIS_CACHE = {}
def _load_cross_analysis_cache():
    # ... 26 lines of loading logic

# Pattern 4: Fusion rules (L1119-1137)
fusion_rules = {}
try:
    for rule_file in all_rule_files:
        # ... inline loading
```

---

### After: 중앙화된 data_loader.py

**개선점**:
- ✅ 단일 위치에서 모든 JSON 로딩
- ✅ 통일된 캐싱 전략
- ✅ 일관된 에러 핸들링
- ✅ 재사용 가능

**사용 예시**:
```python
from backend_ai.app.utils import (
    load_integration_data,
    load_jung_data,
    load_fusion_rules,
    preload_all_data
)

# Integration data
data = load_integration_data()
engine = data.get("multimodal_engine", {})

# Jung psychology data
jung_data = load_jung_data()
archetypes = jung_data.get("archetypes", {})

# Fusion rules
rules = load_fusion_rules()
career_rules = rules.get("career", {})

# Preload everything at startup
preload_all_data()
```

---

## 🗂️ 로딩되는 데이터

### 1. Integration Data (7개 파일)
**경로**: `data/graph/rules/integration/`, `data/graph/rules/numerology/`

**파일**:
- multimodal_integration_engine.json
- modern_career_mapping.json
- numerology_core_rules.json
- numerology_compatibility_rules.json
- numerology_saju_mapping.json
- numerology_astro_mapping.json
- numerology_therapeutic_questions.json

**용도**: 사주+점성술 통합 분석, 수비학 매핑

---

### 2. Jung Psychology Data (13개 파일)
**경로**: `data/graph/rules/jung/`

**파일**:
- jung_active_imagination.json
- jung_lifespan_individuation.json
- jung_crisis_intervention.json
- jung_archetypes.json
- jung_therapeutic.json
- jung_cross_analysis.json
- jung_psychological_types.json
- jung_alchemy.json
- jung_counseling_scenarios.json
- jung_integrated_counseling.json
- jung_counseling_prompts.json
- jung_personality_integration.json
- jung_expanded_counseling.json

**용도**: 융 심리학 기반 상담, 치료적 개입

---

### 3. Cross-Analysis Cache (가변)
**경로**: `data/graph/fusion/`

**파일**: `cross_*.json` (파일명에 "cross" 포함)
- cross_sipsin_planets.json
- cross_branch_house.json
- cross_relations_aspects.json
- cross_shinsal_asteroids.json
- cross_geokguk_house.json
- cross_luck_progression.json
- cross_60ganji_harmonic.json
- cross_draconic_karma.json

**용도**: 사주×점성술 교차 분석

---

### 4. Fusion Rules (11개 테마)
**경로**: `data/graph/fusion/`

**파일**:
- career.json
- love.json
- health.json
- wealth.json
- family.json
- life_path.json
- daily.json
- monthly.json
- compatibility.json
- new_year.json
- next_year.json

**용도**: 테마별 융합 분석 규칙

---

### 5. Spread Configurations (테마별)
**경로**: `data/tarot/spreads/`

**파일**: `{theme}_spreads.json`
- career_spreads.json
- love_spreads.json
- decision_spreads.json
- etc.

**용도**: 타로 스프레드 설정

---

## 💡 주요 기능

### 1. 범용 JSON 로더

```python
from backend_ai.app.utils.data_loader import load_json_file

# 기본 사용
data = load_json_file("path/to/file.json")

# 캐싱 사용
cache = {}
data = load_json_file("path/to/file.json", "my_key", cache)
# 두 번째 호출은 캐시에서 가져옴
data = load_json_file("path/to/file.json", "my_key", cache)
```

---

### 2. 일괄 JSON 로딩

```python
from pathlib import Path
from backend_ai.app.utils.data_loader import load_json_files

# 여러 파일 한 번에 로딩
files = {
    "core": "core.json",
    "rules": "rules.json",
    "config": "config.json"
}

cache = {}
load_json_files(Path("data/rules"), files, cache, "rules")

# cache = {
#     "core": {...},
#     "rules": {...},
#     "config": {...}
# }
```

---

### 3. Integration Context

```python
from backend_ai.app.utils import get_integration_context

# 테마별 통합 컨텍스트
context = get_integration_context("career")

# context = {
#     "correlation_matrix": {...},
#     "theme_focus": {
#         "primary": ["career_path", "advancement"],
#         "secondary": ["finances", "timing"]
#     }
# }
```

---

### 4. Lifespan Guidance

```python
from backend_ai.app.utils import get_lifespan_guidance

# 연령별 심리학적 가이드
guidance = get_lifespan_guidance(1990)

# guidance = {
#     "age": 36,
#     "stage": "midlife",
#     "focus": "Integration and individuation",
#     "challenges": ["midlife crisis", "career plateau"],
#     "growth_areas": ["self-actualization", "legacy"]
# }
```

---

### 5. 캐시 관리

```python
from backend_ai.app.utils import clear_all_caches, get_cache_stats

# 캐시 통계
stats = get_cache_stats()
# stats = {
#     "integration": 7,
#     "jung": 13,
#     "cross_analysis": 8,
#     "fusion_rules": 11,
#     "spread_configs": 3
# }

# 캐시 초기화
clear_all_caches()
```

---

### 6. Production Preloading

```python
from backend_ai.app.utils import preload_all_data

# 서버 시작 시 모든 데이터 사전 로딩
preload_all_data()

# [DataLoader] Preloading all JSON data...
# [DataLoader] Loaded 7/7 integration
# [DataLoader] Loaded 13/13 Jung psychology
# [DataLoader] Loaded 8 cross-analysis files
# [DataLoader] Loaded 11/11 fusion rules
# [DataLoader] Preload complete: {...}
```

---

## 📈 통계

### 생성된 코드
```
data_loader.py:           ~600줄
utils/__init__.py:        ~40줄 (업데이트)
-----------------------------------------
총합:                     ~640줄
```

### app.py에서 제거될 코드 (예상)
```
_load_integration_data():     ~48줄
_load_jung_data():             ~39줄
_load_cross_analysis_cache():  ~26줄
Inline fusion loading:         ~18줄
-----------------------------------------
총 제거 예정:                  ~131줄
```

---

## 🎯 달성한 목표

### 1. ✅ 코드 중앙화
- 모든 JSON 로딩이 data_loader.py에 집중
- 일관된 API

### 2. ✅ 캐싱 전략 통합
- 5개 글로벌 캐시로 통합
- 강제 재로딩 지원 (force_reload 파라미터)

### 3. ✅ 에러 핸들링 개선
- 통일된 try-except 패턴
- 명확한 로깅

### 4. ✅ 재사용성
- 다른 모듈에서도 import하여 사용 가능
- app.py 의존성 제거

---

## 🔄 마이그레이션 가이드

### app.py 업데이트 방법

#### Before:
```python
# app.py

_INTEGRATION_DATA_CACHE = {}

def _load_integration_data():
    global _INTEGRATION_DATA_CACHE
    # ... 48 lines

def get_integration_context(theme: str = "life") -> Dict:
    data = _load_integration_data()
    # ...
```

#### After:
```python
# app.py

from backend_ai.app.utils import (
    load_integration_data,
    get_integration_context
)

# _load_integration_data() 함수 삭제
# get_integration_context() 함수 삭제

# 사용처에서는 그대로 호출 가능
context = get_integration_context("career")
```

---

### Legacy 호환성

data_loader.py는 backward compatibility를 위한 래퍼 제공:

```python
# data_loader.py

def _load_integration_data():
    """DEPRECATED: Use load_integration_data() instead."""
    return load_integration_data()

def _load_jung_data():
    """DEPRECATED: Use load_jung_data() instead."""
    return load_jung_data()

def _load_cross_analysis_cache():
    """DEPRECATED: Use load_cross_analysis_cache() instead."""
    return load_cross_analysis_cache()
```

**마이그레이션 전략**:
1. utils/data_loader.py 생성 ✅
2. app.py에서 legacy wrapper import (안전)
3. 점진적으로 app.py 로딩 함수 제거
4. 최종적으로 import만 남김

---

## ⏭️ 다음 단계

### 즉시: app.py 마이그레이션
**작업**:
1. app.py에서 data_loader import
2. 기존 `_load_*` 함수 제거
3. 테스트

**예상 시간**: 30분

---

### 단기: 남은 Phase 1.1 작업
**목표**: 복잡한 스트리밍 라우트 이동

**남은 라우트** (15개):
- `/ask`, `/ask-stream` → stream_routes.py
- `/saju/*` → saju_routes.py
- `/astrology/*` → astrology_routes.py

**예상 시간**: 4-6시간

---

### 중기: Phase 2 시작
**목표**: RAG 시스템 통합

로드맵 참조: [BACKEND_AI_REFACTORING_ROADMAP.md](BACKEND_AI_REFACTORING_ROADMAP.md)

---

## 🎯 Phase 1 전체 진행 상황

```
Phase 1.1: Routes 추출          53% (17/32 routes)
Phase 1.2: Lazy Loading         100% ✅
Phase 1.3: Service Layer        100% ✅
Phase 1.4: Data Loading         100% ✅
----------------------------------------
Phase 1 Total:                  ~88%

남은 작업: Phase 1.1 완료 (15개 라우트)
```

---

## 📝 성과 요약

### 생성된 유틸리티
- **data_loader.py**: 600줄의 중앙화된 데이터 로딩
- **5개 캐시 시스템**: 통합 관리
- **10개 공개 함수**: 재사용 가능

### 통합된 데이터
- **Integration**: 7개 파일
- **Jung Psychology**: 13개 파일
- **Cross-Analysis**: 8+ 파일
- **Fusion Rules**: 11개 테마
- **Spread Configs**: 테마별

### 개선 효과
- 🎯 **중앙화**: 모든 JSON 로딩이 한 곳에
- 🔄 **재사용성**: 다른 모듈에서도 사용 가능
- 📊 **관리 용이성**: 캐시 통계, 일괄 초기화
- 🚀 **성능**: Preload 지원, 캐싱 최적화

---

**작성 완료**: 2026-01-14
**Phase 1.4 코드**: ~640줄
**다음**: app.py 마이그레이션 or Phase 1.1 완료

**Excellent progress! 🎉**
