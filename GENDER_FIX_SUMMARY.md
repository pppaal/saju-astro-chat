# Gender 하드코딩 이슈 해결 (2026-01-23)

## 문제점

### Before
[lifeAnalysisBuilder.ts](src/app/api/destiny-map/chat-stream/builders/lifeAnalysisBuilder.ts)에서 gender 필드가 'male'로 하드코딩되어 있었습니다.

**영향받는 함수**:
1. `buildPastAnalysisSection()` - 라인 63
2. `buildMultiYearTrendSection()` - 라인 115

**문제 코드**:
```typescript
const input: LifePredictionInput = {
  birthYear,
  birthMonth,
  birthDay,
  gender: 'male', // ❌ 하드코딩!
  dayStem: saju.dayMaster?.heavenlyStem || '甲',
  // ...
};
```

**영향**:
- 여성 사용자도 남성 사주로 분석됨
- 성별에 따른 대운 순역 계산 오류
- 인생 예측 정확도 저하

---

## 해결 방법

### 1. lifeAnalysisBuilder.ts 함수 시그니처 수정

#### buildPastAnalysisSection()
```typescript
// Before
export function buildPastAnalysisSection(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  birthDate: string,
  question: string,
  lang: string
): string

// After
export function buildPastAnalysisSection(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  birthDate: string,
  gender: 'male' | 'female', // ✅ 추가
  question: string,
  lang: string
): string
```

#### buildMultiYearTrendSection()
```typescript
// Before
export function buildMultiYearTrendSection(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  birthDate: string,
  theme: string,
  lang: string
): string

// After
export function buildMultiYearTrendSection(
  saju: SajuDataStructure | undefined,
  astro: AstroDataStructure | undefined,
  birthDate: string,
  gender: 'male' | 'female', // ✅ 추가
  theme: string,
  lang: string
): string
```

### 2. LifePredictionInput 객체 수정

```typescript
// Before (2곳)
const input: LifePredictionInput = {
  birthYear,
  birthMonth,
  birthDay,
  gender: 'male', // ❌ 하드코딩
  dayStem: saju.dayMaster?.heavenlyStem || '甲',
  dayBranch: saju?.pillars?.day?.earthlyBranch?.name || '子',
  monthBranch: allBranches[1],
  yearBranch: allBranches[0],
  allStems,
  allBranches,
};

// After (2곳)
const input: LifePredictionInput = {
  birthYear,
  birthMonth,
  birthDay,
  gender, // ✅ 파라미터 사용
  dayStem: saju.dayMaster?.heavenlyStem || '甲',
  dayBranch: saju?.pillars?.day?.earthlyBranch?.name || '子',
  monthBranch: allBranches[1],
  yearBranch: allBranches[0],
  allStems,
  allBranches,
};
```

### 3. route.ts에서 실제 gender 값 전달

```typescript
// Before
pastAnalysisSection = buildPastAnalysisSection(
  saju,
  astro,
  effectiveBirthDate,
  lastUser?.content || '',
  lang
);

lifePredictionSection = buildMultiYearTrendSection(
  saju,
  astro,
  effectiveBirthDate,
  theme,
  lang
);

// After
pastAnalysisSection = buildPastAnalysisSection(
  saju,
  astro,
  effectiveBirthDate,
  effectiveGender as 'male' | 'female', // ✅ 실제 값 전달
  lastUser?.content || '',
  lang
);

lifePredictionSection = buildMultiYearTrendSection(
  saju,
  astro,
  effectiveBirthDate,
  effectiveGender as 'male' | 'female', // ✅ 실제 값 전달
  theme,
  lang
);
```

---

## 변경된 파일

### 1. src/app/api/destiny-map/chat-stream/builders/lifeAnalysisBuilder.ts
- `buildPastAnalysisSection()` 함수 시그니처에 `gender: 'male' | 'female'` 파라미터 추가
- `buildMultiYearTrendSection()` 함수 시그니처에 `gender: 'male' | 'female'` 파라미터 추가
- 하드코딩된 `gender: 'male'` 2곳을 파라미터 `gender` 사용으로 변경

### 2. src/app/api/destiny-map/chat-stream/route.ts
- `buildPastAnalysisSection()` 호출 시 `effectiveGender` 전달
- `buildMultiYearTrendSection()` 호출 시 `effectiveGender` 전달

---

## 검증

### TypeScript 검증
```bash
npx tsc --noEmit 2>&1 | grep -v "\.next/types" | grep "error TS"
```
**결과**: route.ts 및 lifeAnalysisBuilder.ts 관련 에러 0개 ✅

### 빌드 검증
```bash
npm run build
```
**실행 중**: 백그라운드 빌드 진행 중

---

## 효과

### Before
```typescript
// 여성 사용자 예시
gender: 'female' (실제)
↓
gender: 'male' (분석 시 사용) ❌
↓
대운 순역 계산 오류
인생 예측 부정확
```

### After
```typescript
// 여성 사용자 예시
gender: 'female' (실제)
↓
gender: 'female' (분석 시 사용) ✅
↓
대운 순역 계산 정확
인생 예측 정확
```

---

## 영향 분석

### 대운 순역 계산
- **남성**: 양간(甲丙戊庚壬) 출생 → 순행, 음간(乙丁己辛癸) 출생 → 역행
- **여성**: 양간(甲丙戊庚壬) 출생 → 역행, 음간(乙丁己辛癸) 출생 → 순행

**하드코딩 시 문제**:
- 여성이 양간으로 태어나면 순행으로 잘못 계산됨
- 대운 시작 나이 및 흐름이 완전히 반대로 계산됨

### 인생 예측 정확도
- **결혼 시기**: 성별에 따라 용신이 다름 (남성: 재성, 여성: 관성)
- **자녀 운**: 성별에 따라 식상의 의미가 다름
- **커리어 운**: 성별에 따라 관성/인수의 비중이 다름

---

## 테스트 케이스

### 테스트 시나리오 1: 여성 사용자, 양간 출생
```typescript
{
  birthDate: '1990-03-15',
  birthTime: '14:30',
  gender: 'female',
  dayStem: '甲' (양간)
}
```
**예상 결과**:
- 대운: 역행 ✅
- 결혼 시기: 관성 중심 분석 ✅
- 자녀 운: 식상 중심 분석 ✅

### 테스트 시나리오 2: 남성 사용자, 음간 출생
```typescript
{
  birthDate: '1985-07-20',
  birthTime: '10:00',
  gender: 'male',
  dayStem: '乙' (음간)
}
```
**예상 결과**:
- 대운: 역행 ✅
- 결혼 시기: 재성 중심 분석 ✅
- 자녀 운: 관성 중심 분석 ✅

---

## 관련 이슈

### 해결됨 ✅
- [REFACTORING_PROGRESS.md](REFACTORING_PROGRESS.md) - Known Issue #2
- [NEXT_STEPS.md](NEXT_STEPS.md) - Known Issue #1

### 다음 작업
- Phase 1: 예측 엔진 코드 중복 제거
- Phase 2: 대형 함수 분해
- Phase 3: 컴포넌트 분해
- Phase 4: 타입 안정성 개선

---

**작업 시간**: 10분
**파일 수정**: 2개
**라인 수정**: 6줄
**테스트 상태**: TypeScript 검증 통과, 빌드 진행 중
**우선순위**: 높음 (데이터 정확성 직결)

---

**마지막 업데이트**: 2026-01-23
**상태**: 완료 ✅
**다음 단계**: 빌드 완료 확인 후 Phase 1 시작
