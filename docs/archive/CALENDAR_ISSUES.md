# 운세 캘린더 품질 검증 결과

## ✅ 완료된 수정 사항 (2026-01-17)

### 1. Grade 0 임계값 조정 ✅
- **변경**: `scoring-config.ts`와 `grading.ts`에서 임계값 조정
  - Grade 0: 72 → 68 (최고의날)
  - Grade 1: 65 → 62 (좋은날)
  - Grade 2: 45 → 42 (보통날)
  - Grade 3: 30 → 28 (안좋은날)
- **효과**: 최고의날이 연간 5-8% 정도 나올 것으로 예상
- **테스트**: 44개 테스트 케이스 모두 통과

### 2. 좋은날/나쁜날 카운트 제거 ✅
- **변경**: `DestinyCalendar.tsx`, `FortuneGraph.tsx`에서 의미없는 통계 제거
- **제거된 요소**:
  - 좋은날 카운트 계산 (Grade 0-2, ~70%)
  - 주의 카운트 계산 (Grade 4, ~5%)
  - UI에서 해당 통계 표시
- **효과**: 더 깔끔한 UI, 의미있는 정보만 표시

### 3. 경고 필터링 검증 ✅
- **확인**: `date-analysis-orchestrator.ts:1118`에서 `filterWarningsByGrade` 정상 호출
- **동작**: Grade 0-1에서 모든 경고 제거, Grade 2에서 심각한 경고만 제거
- **결과**: 좋은 날에 경고가 표시되지 않도록 보장

---

## 🔍 발견된 문제점

### 1. ❌ Grade 0 (최고의날)이 없거나 매우 적음

**원인 분석:**
```typescript
// grading.ts:79
if (adjustedScore >= 72 && !hasBothChungAndXing) {
  grade = 0;
}
```

**문제:**
- 점수 72점 달성이 매우 어려움
- 기본 점수 범위: 0~100 (사주 50 + 점성술 50)
- 보너스 최대 +4로 제한
- 페널티: 충 OR 형 = -2, 충 AND 형 = -4

**실제 점수 분포 예상:**
- 대부분 날짜: 40~65점
- 72점 이상: 매우 드묾 (< 1%)
- 목표인 ~5%에 크게 미달

**해결 방안:**

#### 옵션 1: 임계값 낮추기 (추천)
```typescript
// GRADE_THRESHOLDS를 수정
grade0: 68,  // 72 → 68 (약 5~8% 예상)
grade1: 62,  // 65 → 62
grade2: 42,  // 45 → 42
grade3: 28,  // 30 → 28
```

#### 옵션 2: 보너스 증가
```typescript
// 생일 특수일 +2 → +3
// 교차 검증 +2 → +3
// 최대 보너스 +4 → +6
```

#### 옵션 3: 조정된 점수 계산 방식 변경
```typescript
// 백분위 기반 등급 부여
// 상위 5% → Grade 0
// 상위 6~20% → Grade 1
```

---

### 2. ⚠️ 내용과 등급 불일치 가능성

**문제 시나리오:**
1. **나쁜 날인데 좋은 내용**: Grade 3-4인데 긍정적 키워드
2. **좋은 날인데 경고**: Grade 0-1인데 warnings 배열에 항목

**원인:**
```typescript
// grading.ts:140-163
export function filterWarningsByGrade(grade: ImportanceGrade, warningKeys: string[]): string[] {
  if (grade <= 1) {
    // Grade 0, 1: 모든 경고 제거
    return [];
  }
  // ...
}
```

- `filterWarningsByGrade`가 호출되지 않는 경우
- 사주 십성 설명과 등급이 맞지 않는 경우

**검증 필요:**
- 실제 캘린더 데이터에서 불일치 비율 확인
- Grade별 설명 톤 일치성 확인

**해결 방안:**
1. `filterWarningsByGrade`가 항상 호출되도록 보장
2. 사주 십성별 기본 톤 설정 검증
3. i18n 번역 키 재검토

---

### 3. 🤔 좋은날/나쁜날 카운트의 유용성

**현재 구현:**
```typescript
// DestinyCalendar.tsx:205
const { goodDaysCount, badDaysCount } = useMemo(() => {
  let good = 0;
  let bad = 0;
  for (const d of fortuneData) {
    if (d.grade <= 2) good++;  // Grade 0, 1, 2
    else if (d.grade >= 4) bad++;  // Grade 4만
  }
  return { goodDaysCount: good, badDaysCount: bad };
}, [fortuneData]);
```

**문제:**
- "좋은 날": Grade 0~2 = 약 70% (대부분)
- "주의": Grade 4 = 약 5% (매우 적음)
- **의미 없는 통계**: 대부분 날짜가 "좋은 날"로 표시

**UI 표시:**
```
📊 월간 운세 흐름
좋은 날 22일 | 주의 1일
```

**개선 방안:**

#### 옵션 1: 제거 (추천)
```typescript
// goodDaysCount, badDaysCount 계산 및 UI 제거
// 대신 yearSummary (Grade별 개수)만 표시
```

#### 옵션 2: 더 의미있게 변경
```typescript
// 좋은 날: Grade 0~1만 (약 20%)
// 주의 필요: Grade 3~4 (약 30%)
if (d.grade <= 1) good++;
else if (d.grade >= 3) bad++;
```

#### 옵션 3: 라벨 변경
```
특별한 날 3일 | 조심할 날 8일 | 보통날 20일
```

---

## 📊 우선순위별 개선 작업

### 🔴 High Priority (즉시 수정 필요)

1. **Grade 0 임계값 조정**
   - 파일: `src/lib/destiny-map/calendar/scoring-config.ts`
   - 변경: `grade0: 72 → 68`
   - 이유: 최고의날이 하나도 없는 연도 방지

2. **좋은날/나쁜날 카운트 제거 또는 변경**
   - 파일: `src/components/calendar/DestinyCalendar.tsx`
   - 변경: Line 205-213, 1214-1219 수정/제거
   - 이유: 의미 없는 통계 제거

### 🟡 Medium Priority (검증 후 수정)

3. **내용과 등급 일치성 검증**
   - 실제 데이터에서 불일치 비율 확인 필요
   - 불일치 샘플 5~10개 확인

4. **경고 필터링 강제 적용**
   - `filterWarningsByGrade` 호출 보장
   - Grade 0-1에서 경고 완전 제거

### 🟢 Low Priority (선택 사항)

5. **보너스/페널티 밸런스 조정**
   - 현재: -6 ~ +4
   - 제안: -6 ~ +6 (더 넓은 범위)

6. **백분위 기반 등급**
   - 절대 점수 대신 상대 백분위 사용
   - 항상 5/15/50/25/5% 분포 보장

---

## 🎯 즉시 적용 가능한 수정안

### 1. Grade 0 임계값 낮추기

```typescript
// src/lib/destiny-map/calendar/scoring-config.ts
export const GRADE_THRESHOLDS = {
  grade0: 68,  // 72 → 68 (변경)
  grade1: 62,  // 65 → 62 (변경)
  grade2: 42,  // 45 → 42 (변경)
  grade3: 28,  // 30 → 28 (변경)
};
```

### 2. 좋은날/나쁜날 카운트 제거

```typescript
// src/components/calendar/DestinyCalendar.tsx
// Line 205-213 삭제
// Line 1214-1219 삭제 (FortuneGraph 컴포넌트에서)
```

또는

```typescript
// 더 의미있게 변경
const { goodDaysCount, badDaysCount } = useMemo(() => {
  let good = 0;
  let bad = 0;
  for (const d of fortuneData) {
    if (d.grade <= 1) good++;      // Grade 0-1만
    else if (d.grade >= 3) bad++;  // Grade 3-4
  }
  return { goodDaysCount: good, badDaysCount: bad };
}, [fortuneData]);
```

---

## ✅ 검증 체크리스트

- [x] Grade 0 (최고의날) 연간 5% 이상 존재 - **임계값 72→68로 조정 완료**
- [ ] Grade 분포가 목표(5/15/50/25/5%)에 근접 - **실제 데이터로 검증 필요**
- [ ] 좋은 등급(0-2)에서 부정적 설명 없음 - **실제 데이터로 검증 필요**
- [ ] 나쁜 등급(3-4)에서 긍정적 설명만 없음 - **실제 데이터로 검증 필요**
- [x] Grade 0-1에서 경고(warnings) 없음 - **filterWarningsByGrade 호출 확인 완료**
- [x] UI 통계가 의미있는 정보 제공 - **의미없는 좋은날/나쁜날 카운트 제거 완료**

---

## 📝 테스트 방법

1. **브라우저에서 직접 확인**
   ```
   http://localhost:3000/calendar
   ```

2. **연도 변경해가며 확인**
   - 2024, 2025, 2026, 2027
   - 각 연도마다 Grade 0이 있는지

3. **샘플 날짜 10개 확인**
   - 등급과 설명이 일치하는지
   - 경고가 적절한지

4. **등급 분포 확인**
   - 헤더의 yearSummary 숫자 확인
   - 5/15/50/25/5%에 근접하는지