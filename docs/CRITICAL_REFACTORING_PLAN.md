# Critical Refactoring Plan

## 🎯 Overview

크리티컬한 리팩토링이 필요한 파일들과 개선 전략을 정리합니다.

## 📊 Critical Files Analysis

### 파일 크기별 분류

| 파일 | 줄 수 | 크기 | 문제점 | 우선순위 |
|------|-------|------|--------|----------|
| `enhancedData.ts` | 6,822 | 293KB | ✅ 완료 (JSON 분리) | - |
| `blog-posts.ts` | 2,783 | 103KB | ✅ 완료 (JSON 분리) | - |
| `past-life/analyzer.ts` | 2,051 | - | 거대한 데이터 객체 | **HIGH** |
| `Tarot/questionClassifierPatterns.ts` | 1,655 | - | RegExp 패턴 배열 | MEDIUM |
| `cities/formatter.ts` | 1,437 | - | 도시 이름 데이터 | MEDIUM |
| `Saju/familyLineage.ts` | 1,111 | - | 데이터 + 로직 혼재 | MEDIUM |
| `prediction/precisionEngine.ts` | 1,107 | - | 복잡한 로직 | HIGH |
| `destiny-map/fun-insights/analyzers/matrixAnalyzer.ts` | 1,075 | - | 재사용성 낮음 | HIGH |

---

## 🔴 Priority 1: past-life/analyzer.ts (2,051 lines)

### 문제점
- **1,800줄 이상이 순수 데이터**: `SOUL_PATTERNS`, `PAST_LIFE_THEMES`, `NODE_JOURNEY`, `SATURN_LESSONS` 등
- **데이터와 로직이 혼재**: 유지보수성 저하
- **번들 크기 증가**: 사용하지 않는 데이터도 항상 로드됨
- **테스트 어려움**: 거대한 파일로 인해 테스트 작성 복잡

### 리팩토링 전략

#### 1단계: 데이터 분리
```
src/lib/past-life/
├── data/
│   ├── types.ts                  # 타입 정의 (완료)
│   ├── soul-patterns.ts          # SOUL_PATTERNS 데이터
│   ├── past-life-themes.ts       # PAST_LIFE_THEMES 데이터
│   ├── node-journey.ts           # NODE_JOURNEY 데이터
│   ├── saturn-lessons.ts         # SATURN_LESSONS 데이터
│   ├── day-master-mission.ts     # DAY_MASTER_MISSION 데이터
│   ├── geokguk-talents.ts        # GEOKGUK_TALENTS 데이터
│   └── constants.ts              # 기타 상수
├── utils/
│   ├── data-extractors.ts        # 데이터 추출 헬퍼
│   ├── builders.ts               # 결과 빌더 함수
│   └── validators.ts             # 검증 로직
├── analyzer.ts                   # 메인 분석 함수 (간소화)
└── types.ts                      # 공개 타입
```

#### 2단계: 함수 분리
- 15개의 헬퍼 함수를 `utils/` 디렉토리로 분리
- 각 함수의 단일 책임 원칙 적용
- 테스트 가능한 순수 함수로 리팩토링

#### 3단계: 타입 안전성 강화
- `any` 타입 제거
- 옵셔널 체이닝 대신 명확한 타입 가드 사용
- 입력 검증 함수 추가

#### 예상 효과
- **2,051줄 → ~300줄** (85% 감소)
- **모듈화**: 각 데이터 파일 200-300줄로 관리 용이
- **번들 최적화**: 필요한 데이터만 import 가능
- **테스트 용이성**: 각 함수별 단위 테스트 작성 가능

---

## 🟠 Priority 2: matrixAnalyzer.ts (1,075 lines)

### 문제점
- **단일 파일에 과도한 책임**: 10개 이상의 분석 함수
- **재사용성 낮음**: 특정 컴포넌트에 종속
- **타입 복잡도 높음**: 수십 개의 타입 정의
- **의존성 복잡**: 여러 모듈에서 순환 참조 가능성

### 리팩토링 전략

#### 현재 구조
```typescript
// matrixAnalyzer.ts (1,075 lines)
export { getMatrixAnalysis, getLoveMatrixAnalysis, ... } from './matrix';
// + 수십 개의 타입 정의
// + 헬퍼 함수들
```

#### 개선 구조
```
src/components/destiny-map/fun-insights/analyzers/
├── matrix/
│   ├── index.ts                  # 메인 export
│   ├── types.ts                  # 타입 정의 분리
│   ├── love-analysis.ts          # 사랑 분석
│   ├── career-analysis.ts        # 커리어 분석
│   ├── timing-analysis.ts        # 타이밍 분석
│   ├── relation-analysis.ts      # 관계 분석
│   └── helpers.ts                # 공통 헬퍼
├── matrixAnalyzer.ts             # 레거시 호환성 (re-export)
└── README.md                     # 사용 가이드
```

#### 예상 효과
- **1,075줄 → 각 파일 100-200줄**
- **명확한 책임 분리**: 각 분석 타입별 파일
- **재사용성 향상**: 독립적으로 사용 가능
- **타입 안전성**: 명확한 인터페이스

---

## 🟡 Priority 3: precisionEngine.ts (1,107 lines)

### 문제점
- **복잡한 비즈니스 로직**: 예측 엔진
- **테스트 부족**: 크리티컬한 로직인데 테스트 부족
- **성능 이슈**: 반복적인 계산

### 리팩토링 전략

#### 개선 방향
1. **로직 모듈화**: 예측 알고리즘을 독립 함수로 분리
2. **캐싱 추가**: 반복 계산 결과 캐싱
3. **테스트 작성**: 단위 테스트 및 통합 테스트
4. **문서화**: 복잡한 알고리즘 설명 추가

---

## 🟢 Priority 4: Data Files

### cities/formatter.ts (1,437 lines)
**특징**: 대부분이 도시 이름 번역 데이터

#### 개선 방향
- JSON 파일로 추출 고려
- 필요시 국가별로 분리
- 현재는 **낮은 우선순위** (데이터 성격상 문제 없음)

### questionClassifierPatterns.ts (1,655 lines)
**특징**: RegExp 패턴 배열

#### 개선 방향
- 현재 구조가 적절함 (코드로 관리 필요)
- 주석 추가로 가독성 개선
- **낮은 우선순위**

---

## 📋 Action Items

### Completed ✅
- [x] `enhancedData.ts` → JSON 분리 (293KB → 17 files)
- [x] `blog-posts.ts` → JSON 분리 (103KB → 12 files)
- [x] 번들 최적화 문서화

### High Priority 🔴
- [ ] **`past-life/analyzer.ts` 리팩토링**
  - [ ] 데이터 파일 분리 (6개 파일)
  - [ ] 유틸리티 함수 분리
  - [ ] 타입 안전성 강화
  - [ ] 단위 테스트 작성

- [ ] **`matrixAnalyzer.ts` 모듈화**
  - [ ] 분석 타입별 파일 분리
  - [ ] 타입 정의 분리
  - [ ] 헬퍼 함수 공통화

- [ ] **`precisionEngine.ts` 개선**
  - [ ] 로직 모듈화
  - [ ] 테스트 작성
  - [ ] 성능 최적화

### Medium Priority 🟡
- [ ] `familyLineage.ts` 데이터 분리
- [ ] 코드 품질 개선
  - [ ] `any` 타입 제거 (370개)
  - [ ] ESLint 경고 해결 (25개)

### Low Priority 🟢
- [ ] `cities/formatter.ts` - 현재 구조 유지
- [ ] `questionClassifierPatterns.ts` - 주석 개선

---

## 🎯 Success Metrics

### 코드 품질
- [ ] **줄 수**: 1000줄 이상 파일 0개
- [ ] **any 타입**: 100개 이하로 감소
- [ ] **테스트 커버리지**: 크리티컬 로직 80% 이상

### 번들 크기
- [ ] **초기 번들**: 400KB 이하
- [ ] **라우트별 청크**: 100KB 이하

### 유지보수성
- [ ] **모듈화**: 각 파일 단일 책임
- [ ] **문서화**: 복잡한 로직 문서화
- [ ] **테스트**: 크리티컬 함수 테스트 커버리지

---

## 📚 리팩토링 가이드라인

### 데이터 분리 기준
1. **크기**: 200줄 이상의 순수 데이터
2. **재사용**: 여러 곳에서 사용하는 데이터
3. **번들 영향**: 불필요한 로딩 발생

### 함수 분리 기준
1. **책임**: 한 가지 일만 수행
2. **테스트**: 독립적으로 테스트 가능
3. **재사용**: 다른 곳에서도 사용 가능

### 타입 안전성
1. **any 금지**: 명확한 타입 정의
2. **옵셔널 처리**: 타입 가드 또는 기본값
3. **제네릭 활용**: 재사용 가능한 타입

---

## 🔄 Implementation Order

### Week 1: Critical Data Separation
1. `past-life/analyzer.ts` 데이터 분리
2. 유틸리티 함수 추출
3. 타입 정의 정리

### Week 2: Module Restructuring
1. `matrixAnalyzer.ts` 분석 함수 분리
2. 타입 정의 분리
3. 레거시 호환성 유지

### Week 3: Testing & Optimization
1. 단위 테스트 작성
2. 통합 테스트 작성
3. 성능 최적화

### Week 4: Code Quality
1. `any` 타입 제거
2. ESLint 경고 해결
3. 문서화 업데이트

---

## 📝 Notes

- **레거시 호환성**: 기존 import 경로 유지 (re-export)
- **점진적 개선**: 한 번에 모든 것을 바꾸지 않음
- **테스트 우선**: 리팩토링 전 테스트 작성
- **문서화 필수**: 복잡한 로직은 반드시 문서화

---

**Last Updated**: 2026-01-26
**Status**: Planning Phase
**Next Action**: `past-life/analyzer.ts` 데이터 분리 시작
