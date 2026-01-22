# Template Renderer 리팩토링 계획

**현재 상태**: `template_renderer.py` (2456 lines, 164KB)
**목표**: 10-15개 파일로 분리 (각 ~200-300 lines)

---

## 📊 현재 구조 분석

### 함수 목록 (24개)

#### 1. Saju 관련 (6개)
- `_get_sibsin_value()` - 십신 값 추출
- `_get_element_from_stem()` - 천간에서 오행 추출
- `_get_element_meaning()` - 오행 의미
- `_normalize_day_master()` - 일주 정규화
- `_get_saju_highlight()` - 사주 하이라이트
- `_build_saju_analysis()` - 사주 분석 빌드

#### 2. Astrology 관련 (2개)
- `_get_yearly_transit_info()` - 행성 이동 정보
- `_get_astro_highlight()` - 점성술 하이라이트
- `_build_astro_analysis()` - 점성술 분석 빌드

#### 3. Cross-Analysis (통합 분석) (2개)
- `_build_cross_insight()` - 사주+점성술 교차 인사이트
- `_get_category_keywords()` - 카테고리 키워드

#### 4. Fortune/Timing 관련 (7개)
- `_get_important_years()` - 중요 년도 추출
- `_calculate_rating()` - 평점 계산 (오행, 십신)
- `_calculate_rating_from_sibsin()` - 십신에서 평점 계산
- `_get_daeun_meaning()` - 대운 의미
- `_get_personalized_daeun_meaning()` - 개인화 대운
- `_get_personalized_annual_meaning()` - 개인화 연운
- `_get_period_advice()` - 기간 조언

#### 5. Theme/Category 관련 (4개)
- `_get_category_analysis()` - 카테고리 분석
- `_get_key_insights()` - 핵심 인사이트
- `_get_theme_sections()` - 테마 섹션 (가장 긴 함수, ~880 lines!)
- `_get_theme_summary()` - 테마 요약

#### 6. Lucky Elements (1개)
- `_get_lucky_elements()` - 행운의 요소

#### 7. Main Entry Point (1개)
- `render_template_report()` - 메인 렌더링 함수

---

## 🎯 리팩토링 목표 구조

```
backend_ai/app/rendering/
├── __init__.py                      # 공개 API
├── base.py                          # 공통 유틸리티 (~150 lines)
│   ├── _get_element_from_stem()
│   ├── _get_element_meaning()
│   ├── _calculate_rating()
│   └── _calculate_rating_from_sibsin()
│
├── saju_renderer.py                 # 사주 렌더링 (~350 lines)
│   ├── _get_sibsin_value()
│   ├── _normalize_day_master()
│   ├── _get_saju_highlight()
│   └── _build_saju_analysis()
│
├── astro_renderer.py                # 점성술 렌더링 (~250 lines)
│   ├── _get_yearly_transit_info()
│   ├── _get_astro_highlight()
│   └── _build_astro_analysis()
│
├── cross_renderer.py                # 교차 분석 (~200 lines)
│   ├── _build_cross_insight()
│   └── _get_category_keywords()
│
├── fortune_renderer.py              # 운세/타이밍 (~400 lines)
│   ├── _get_important_years()
│   ├── _get_daeun_meaning()
│   ├── _get_personalized_daeun_meaning()
│   ├── _get_personalized_annual_meaning()
│   └── _get_period_advice()
│
├── theme_renderer.py                # 테마별 렌더링 (~900 lines)
│   ├── _get_theme_sections()        # 가장 큰 함수
│   └── _get_theme_summary()
│
├── category_renderer.py             # 카테고리 분석 (~250 lines)
│   ├── _get_category_analysis()
│   └── _get_key_insights()
│
├── lucky_renderer.py                # 행운 요소 (~100 lines)
│   └── _get_lucky_elements()
│
└── main_renderer.py                 # 메인 엔트리 (~150 lines)
    └── render_template_report()
```

---

## 📝 단계별 실행 계획

### Phase 1: 기반 구조 생성 (1시간)
1. `backend_ai/app/rendering/` 디렉토리 생성
2. `__init__.py` 생성 - 공개 API 정의
3. `base.py` 생성 - 공통 유틸리티 이동
4. 기존 테스트 실행 확인

### Phase 2: 도메인별 분리 (2-3시간)
5. `saju_renderer.py` 생성 및 함수 이동
6. `astro_renderer.py` 생성 및 함수 이동
7. `fortune_renderer.py` 생성 및 함수 이동
8. `cross_renderer.py` 생성 및 함수 이동
9. 각 단계마다 import 경로 업데이트 및 테스트

### Phase 3: 복잡한 로직 분리 (2시간)
10. `theme_renderer.py` 생성 - `_get_theme_sections()` 이동
11. `category_renderer.py` 생성
12. `lucky_renderer.py` 생성
13. `main_renderer.py` 생성

### Phase 4: 통합 및 검증 (1시간)
14. `__init__.py`에서 모든 함수 re-export
15. `app.py`의 import 경로 업데이트
16. 전체 테스트 실행
17. 원본 `template_renderer.py` 삭제

---

## 🔍 주요 의존성 분석

### Import 의존성
```python
# 현재 template_renderer.py의 imports:
from typing import Dict, List, Any, Optional
from datetime import datetime
# ... (기타)

# 각 렌더러가 필요로 하는 것:
- base.py: 기본 타입만
- saju_renderer.py: base.py의 함수
- astro_renderer.py: base.py의 함수
- theme_renderer.py: 모든 렌더러의 함수
```

### 함수 간 호출 관계
```
render_template_report()
├─> _get_theme_sections()
│   ├─> _build_saju_analysis()
│   ├─> _build_astro_analysis()
│   ├─> _build_cross_insight()
│   └─> _get_category_analysis()
├─> _get_key_insights()
├─> _get_lucky_elements()
└─> _get_theme_summary()
```

---

## ⚠️ 주의사항

### 1. Private 함수 유지
모든 함수가 `_`로 시작하는 private 함수이므로, 외부 노출을 최소화합니다.
```python
# __init__.py에서는 메인 함수만 export
from .main_renderer import render_template_report

__all__ = ['render_template_report']
```

### 2. Import 순서
순환 import 방지를 위해 의존성 순서를 지킵니다:
```
base → saju/astro/cross/fortune/category/lucky → theme → main
```

### 3. 테스트 유지
각 이동 후 기존 테스트가 통과해야 합니다:
```bash
pytest backend_ai/tests/unit/test_template_renderer.py -v
pytest backend_ai/tests/unit/test_rendering.py -v
```

---

## 📈 예상 효과

### Before
- 1개 파일: 2456 lines (164KB)
- 함수 찾기 어려움
- 코드 리뷰 힘듦
- 병합 충돌 빈번

### After
- 9개 파일: 평균 ~270 lines
- 도메인별로 명확히 분리
- 유지보수 용이
- 테스트 작성 쉬움

---

## ✅ 완료 기준

- [ ] 9개 렌더러 파일 생성 완료
- [ ] 각 파일 500 lines 이하
- [ ] 모든 기존 테스트 통과
- [ ] `app.py`에서 정상 import
- [ ] 원본 `template_renderer.py` 삭제
- [ ] 새로운 테스트 추가 (선택)

---

**예상 소요 시간**: 6-8시간
**우선순위**: High
**복잡도**: Medium-High

**시작일**: 2026-01-17
**목표 완료일**: 2026-01-18
