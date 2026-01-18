# app.py 리팩토링 계획

**현재 상태**: `backend_ai/app/app.py` (1497 lines)
**목표**: <500 lines (핵심 Flask 앱 설정만)

---

## 📊 현재 구조 분석

### 섹션별 코드 라인 수

| 섹션 | 라인 수 | 설명 |
|------|---------|------|
| **Lazy Loaders** | ~400 lines | 모든 모듈의 lazy loading 함수들 |
| **Helper Functions** | ~300 lines | sanitize, normalize, mask 등 |
| **Cross-Analysis** | ~200 lines | Integration context, Jung data |
| **Session Cache** | ~100 lines | RAG 캐시 관리 |
| **Warmup & Middleware** | ~150 lines | 모델 warmup, before/after request |
| **Flask Routes** | ~100 lines | 이미 routers/로 분리됨 |
| **기타** | ~247 lines | imports, config, etc. |

---

## 🎯 리팩토링 목표 구조

```
backend_ai/
├── app/
│   ├── app.py                       # Flask 앱 설정만 (~350 lines)
│   │   ├── Flask app 생성
│   │   ├── CORS 설정
│   │   ├── 블루프린트 등록
│   │   ├── Error handlers
│   │   └── Middleware (before/after_request)
│   │
│   ├── loaders/                     # 모듈 lazy loading
│   │   ├── __init__.py
│   │   ├── model_loaders.py         # ML 모델 로더 (~150 lines)
│   │   ├── rag_loaders.py           # RAG 시스템 로더 (~150 lines)
│   │   └── feature_loaders.py       # 기타 기능 로더 (~100 lines)
│   │
│   ├── utils/                       # 헬퍼 함수
│   │   ├── __init__.py
│   │   ├── sanitizers.py            # sanitize, mask 함수 (~50 lines)
│   │   └── normalizers.py           # normalize 함수 (~200 lines)
│   │
│   ├── services/                    # 비즈니스 로직 서비스
│   │   ├── __init__.py
│   │   ├── cross_analysis_service.py (~150 lines)
│   │   ├── integration_service.py    (~100 lines)
│   │   ├── jung_service.py           (~50 lines)
│   │   └── cache_service.py          (~100 lines)
│   │
│   └── startup/                     # 시작 로직
│       ├── __init__.py
│       └── warmup.py                # warmup_models() (~70 lines)
│
└── (기존 파일들)
```

---

## 📝 단계별 실행 계획

### Phase 1: 유틸리티 분리 (30분)
1. `backend_ai/app/utils/` 디렉토리 생성
2. `sanitizers.py` 생성 - `sanitize_messages()`, `mask_sensitive_data()` 이동
3. `normalizers.py` 생성 - `_normalize_birth_*()`, `normalize_day_master()` 이동
4. `app.py`에서 import 경로 업데이트

### Phase 2: 서비스 레이어 생성 (1시간)
5. `backend_ai/app/services/` 디렉토리 생성
6. `cross_analysis_service.py` 생성
   - `get_cross_analysis_for_chart()`
   - `get_theme_fusion_rules()`
   - `_load_cross_analysis_cache()`
7. `integration_service.py` 생성
   - `_load_integration_data()`
   - `get_integration_context()`
8. `jung_service.py` 생성
   - `_load_jung_data()`
   - `get_lifespan_guidance()`
   - `get_active_imagination_prompts()`
   - `get_crisis_resources()`
9. `cache_service.py` 생성
   - `get_session_rag_cache()`
   - `set_session_rag_cache()`
   - `_cleanup_expired_sessions()`
   - `_evict_lru_sessions()`

### Phase 3: Lazy Loaders 분리 (1시간)
10. `backend_ai/app/loaders/` 디렉토리 생성
11. `model_loaders.py` 생성
    - `_get_fusion_generate()` + `_generate_with_gpt4()`, `refine_with_gpt5mini()`
    - `_get_saju_astro_rag_module()` + `get_graph_rag()`, `get_model()`
    - `_get_corpus_rag_module()` + `get_corpus_rag()`
12. `rag_loaders.py` 생성
    - `_get_iching_rag()` + 관련 함수들
    - `_get_persona_embed_module()` + `get_persona_embed_rag()`
    - `_get_tarot_hybrid_rag_module()` + `get_tarot_hybrid_rag()`
    - `_get_domain_rag_module()` + `get_domain_rag()`
    - `_get_hybrid_rag_module()` + `hybrid_search()`, `build_rag_context()`
    - `_get_agentic_rag()` + 관련 함수들
13. `feature_loaders.py` 생성
    - `_get_compatibility_module()` + `interpret_compatibility*()`
    - `_get_counseling_engine_module()` + `get_counseling_engine()`, `CrisisDetectorProxy`

### Phase 4: Warmup & Middleware 분리 (30분)
14. `backend_ai/app/startup/` 디렉토리 생성
15. `warmup.py` 생성 - `warmup_models()` 이동

### Phase 5: app.py 최종 정리 (1시간)
16. 모든 import 경로 업데이트
17. `app.py`를 핵심 Flask 설정만 남기도록 정리
18. Middleware (`before_request`, `after_request`) 유지
19. Error handlers 유지
20. 블루프린트 등록 로직 유지

### Phase 6: 통합 테스트 (30분)
21. 전체 테스트 실행
22. Flask 앱 시작 확인
23. API 엔드포인트 동작 확인

---

## 🔍 파일별 이동 계획

### utils/sanitizers.py
```python
# From app.py lines ~604-632
- sanitize_messages()
- mask_sensitive_data()
```

### utils/normalizers.py
```python
# From app.py lines ~939-1127
- normalize_day_master()
- _normalize_birth_date()
- _normalize_birth_time()
- _normalize_birth_payload()
```

### services/cross_analysis_service.py
```python
# From app.py lines ~840-937
- get_cross_analysis_for_chart()
- get_theme_fusion_rules()
- get_active_imagination_prompts()
- get_crisis_resources()
- _load_cross_analysis_cache()
```

### services/integration_service.py
```python
# From app.py lines ~651-718
- _load_integration_data()
- get_integration_context()
```

### services/jung_service.py
```python
# From app.py lines ~752-909
- _load_jung_data()
- get_lifespan_guidance()
```

### services/cache_service.py
```python
# From app.py lines ~1158-1248
- SESSION_CACHE 관련 전역 변수
- _cleanup_expired_sessions()
- _evict_lru_sessions()
- prefetch_all_rag_data() (wrapper만, 실제는 rag_manager.py)
- get_session_rag_cache()
- set_session_rag_cache()
```

### loaders/model_loaders.py
```python
# From app.py lines ~106-158, 456-511
- _get_fusion_generate() + related
- _get_saju_astro_rag_module() + related
- _get_corpus_rag_module() + related
```

### loaders/rag_loaders.py
```python
# From app.py lines ~162-368
- _get_iching_rag() + related (I-Ching)
- _get_persona_embed_module() + related
- _get_tarot_hybrid_rag_module() + related
- _get_domain_rag_module() + related
- _get_hybrid_rag_module() + related
- _get_agentic_rag() + related
```

### loaders/feature_loaders.py
```python
# From app.py lines ~281-410
- _get_compatibility_module() + related
- _get_counseling_engine_module() + CrisisDetectorProxy
```

### startup/warmup.py
```python
# From app.py lines ~1253-1315
- warmup_models()
```

---

## ⚠️ 주의사항

### 1. Lazy Loading 유지
모든 loader 함수는 lazy loading 패턴을 유지해야 합니다:
```python
_module_cache = None

def get_module():
    global _module_cache
    if _module_cache is None:
        _module_cache = import_module()
    return _module_cache
```

### 2. 전역 변수 관리
전역 변수(`_SESSION_RAG_CACHE`, `HAS_*` 플래그)는 적절한 모듈로 이동:
```python
# cache_service.py
_SESSION_RAG_CACHE = {}
_SESSION_CACHE_LOCK = Lock()

# model_loaders.py
HAS_GRAPH_RAG = True
HAS_CORPUS_RAG = True
```

### 3. Import 순환 방지
의존성 순서 유지:
```
utils → services → loaders → app
```

### 4. 기존 API 호환성
외부에서 `from backend_ai.app.app import function_name`으로 import하는 경우를 위해:
```python
# app.py
from backend_ai.app.loaders.model_loaders import get_graph_rag
from backend_ai.app.services.cache_service import get_session_rag_cache
# ... etc

# Re-export for backward compatibility
__all__ = ['get_graph_rag', 'get_session_rag_cache', ...]
```

---

## 📈 예상 효과

### Before
```
app.py: 1497 lines
├─ Imports & Config: 100 lines
├─ Lazy Loaders: 400 lines
├─ Helper Functions: 300 lines
├─ Services: 350 lines
├─ Cache: 100 lines
├─ Warmup: 70 lines
└─ Flask setup: 177 lines
```

### After
```
app.py: ~350 lines (핵심만)
├─ Imports: 50 lines
├─ Flask app 생성: 50 lines
├─ CORS 설정: 20 lines
├─ 블루프린트 등록: 30 lines
├─ Error handlers: 100 lines
├─ Middleware: 80 lines
└─ Warmup 호출: 20 lines

+ utils/: ~250 lines
+ services/: ~400 lines
+ loaders/: ~400 lines
+ startup/: ~70 lines
```

**총합**: 1470 lines (거의 동일하지만 훨씬 구조화됨)

---

## ✅ 완료 기준

- [ ] `app.py` < 500 lines
- [ ] 4개 새 디렉토리 생성 (utils, services, loaders, startup)
- [ ] 12개 새 파일 생성
- [ ] 모든 기존 테스트 통과
- [ ] Flask 앱 정상 시작
- [ ] API 엔드포인트 동작 확인
- [ ] 코드 리뷰 가능한 구조

---

**예상 소요 시간**: 4-5시간
**우선순위**: High
**복잡도**: Medium

**시작일**: 2026-01-17
**목표 완료일**: 2026-01-18
