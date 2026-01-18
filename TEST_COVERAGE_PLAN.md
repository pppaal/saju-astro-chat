# 테스트 커버리지 개선 계획

**현재 날짜**: 2026-01-17
**목표**: 커버리지 45% → 60% 달성

---

## 📊 현재 상태

### 커버리지 메트릭 (Baseline)

| 메트릭 | 현재 | 목표 | 증가 필요 |
|--------|------|------|-----------|
| Lines | 45% | 60% | +15% |
| Functions | 68% | 75% | +7% |
| Branches | 78% | 85% | +7% |
| Statements | 45% | 60% | +15% |

### 테스트 현황
- **총 테스트 파일**: 361개
- **총 테스트 케이스**: ~12,603개
- **테스트 실행 시간**: ~130초

---

## 🎯 전략

### Phase 1: 임계값 업데이트 ✅
- `vitest.config.ts` threshold를 60%로 상향
- 현재 통과하는 커버리지는 유지
- 점진적 개선을 위한 baseline 설정

### Phase 2: 낮은 커버리지 파일 식별
커버리지 리포트를 분석하여 우선순위 결정:
1. **Critical 파일** (커버리지 <30%)
2. **High Priority** (커버리지 30-45%)
3. **Medium Priority** (커버리지 45-60%)

### Phase 3: 테스트 추가
다음 영역에 집중:

#### 1. Destiny Map Calendar 시스템
**대상 파일**:
- `src/lib/destiny-map/calendar/grading.ts` ✅ (Already well-tested)
- `src/lib/destiny-map/calendar/scoring-config.ts` ✅ (Already well-tested)
- `src/lib/destiny-map/calendar/date-helpers.ts` (추가 필요)
  - [ ] Timezone edge cases
  - [ ] Leap year handling
  - [ ] Date boundary tests

#### 2. Compatibility 시스템
**대상 파일**:
- `src/lib/compatibility/cosmicCompatibility.ts`
  - [ ] 사주+점성술 교차 분석
  - [ ] Element matching logic
  - [ ] 호환성 점수 계산

#### 3. Prediction 엔진
**대상 파일**:
- `src/lib/prediction/ultraPrecisionEngine.ts`
  - [ ] 대운/세운/월운/일진 예측
  - [ ] Period transition logic
  - [ ] Fortune calculation edge cases

#### 4. Astrology Engine
**대상 파일**:
- `src/lib/destiny-map/astrology/engine-core.ts`
  - [ ] Planetary position calculation
  - [ ] Aspect calculations
  - [ ] Retrograde detection
  - [ ] House system calculations

#### 5. Tarot 시스템
**대상 파일**:
- `src/lib/Tarot/questionClassifiers.ts`
  - [ ] Question type classification
  - [ ] Keyword extraction
  - [ ] Category matching

---

## 📝 테스트 작성 가이드

### Unit Test 우선순위
1. **비즈니스 로직 함수**
   - 예: `calculateCompatibilityScore()`, `getPlanetaryAspects()`
   - 입력/출력이 명확한 순수 함수

2. **Edge Cases**
   - 경계값 (0, 100, 음수)
   - Null/undefined handling
   - 날짜/시간 경계 (자정, 년말, 윤년)
   - Timezone transitions

3. **Error Handling**
   - Invalid input
   - Missing data
   - Calculation overflow/underflow

### 테스트 작성 예시

```typescript
// Good: 명확한 입력/출력, edge case 포함
describe('calculateCompatibilityScore', () => {
  it('returns high score for same day masters', () => {
    const result = calculateCompatibilityScore('갑목', '갑목');
    expect(result).toBeGreaterThan(70);
  });

  it('handles null inputs gracefully', () => {
    expect(() => calculateCompatibilityScore(null, null)).not.toThrow();
  });

  it('returns 0-100 range', () => {
    const result = calculateCompatibilityScore('갑목', '을목');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});
```

---

## 📈 실행 계획

### Week 2 Day 3-4 (2026-01-17 ~ 2026-01-18)

#### Day 3 오전 (2시간)
- [x] 테스트 실패 수정 (scoring-config threshold 변경)
- [x] TEST_COVERAGE_PLAN.md 작성
- [ ] vitest.config.ts threshold 60%로 업데이트
- [ ] 커버리지 리포트 분석 (coverage-summary.json)

#### Day 3 오후 (2시간)
- [ ] date-helpers.ts 테스트 추가 (timezone, leap year)
- [ ] cosmicCompatibility.ts 핵심 로직 테스트 추가
- [ ] 커버리지 재확인 (48% → 52% 목표)

#### Day 4 오전 (2시간)
- [ ] ultraPrecisionEngine.ts 예측 로직 테스트
- [ ] engine-core.ts 행성 계산 테스트
- [ ] 커버리지 재확인 (52% → 56% 목표)

#### Day 4 오후 (1시간)
- [ ] questionClassifiers.ts 분류 로직 테스트
- [ ] 최종 커버리지 확인 (56% → 60%+ 목표)
- [ ] 문서 업데이트 (WEEK2_STATUS.md)

---

## 🔍 커버리지 측정

### 로컬 실행
```bash
# 전체 커버리지 리포트 생성
npm run test:coverage

# HTML 리포트 확인
open coverage/index.html

# JSON summary 확인
cat coverage/coverage-summary.json | jq .total
```

### CI/CD 통합
```yaml
# .github/workflows/test.yml에서 자동 실행
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

---

## ✅ 완료 기준

### Must Have
- [ ] Lines coverage ≥ 60%
- [ ] Functions coverage ≥ 75%
- [ ] Branches coverage ≥ 85%
- [ ] Statements coverage ≥ 60%
- [ ] 모든 테스트 통과 (0 failures)

### Nice to Have
- [ ] 핵심 파일 (grading, compatibility) ≥ 80% 커버리지
- [ ] 새로운 edge case 발견 및 문서화
- [ ] 성능 회귀 방지 (테스트 실행 시간 <3분)

---

## 📚 참고 자료

### 테스트 가이드
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### 프로젝트 문서
- [WEEK2_STATUS.md](WEEK2_STATUS.md) - Week 2 진행 상황
- [PRODUCTION_READINESS_ROADMAP.md](PRODUCTION_READINESS_ROADMAP.md) - 전체 로드맵

---

**최종 업데이트**: 2026-01-17
**다음 리뷰**: Day 3 오후 (커버리지 첫 중간 점검)
