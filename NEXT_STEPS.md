# 다음 단계: route.ts 본문 리팩토링

## 📋 현재 상태 (2026-01-22)

### ✅ 완료됨:
- 모든 빌더 모듈 생성 완료 (8개 파일)
- 타입 안정성 100% (빌더 모듈들)
- helpers/handlers/builders 인프라 완성
- route.ts import 정리

### ⚠️ 미완료:
- route.ts POST 핸들러 본문 (1193줄 → 여전히 구 코드)

## 🎯 route.ts 리팩토링 가이드

### 1단계: 데이터 로딩 섹션 교체 (라인 140-220)

**Before (80줄):**
```typescript
// Compute saju if not provided or empty
if (!saju || !saju.dayMaster) {
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
    const computedSaju = calculateSajuData(...);
    // ... 80줄의 복잡한 로직
  }
}
```

**After (5줄):**
```typescript
const loadedData = await loadOrComputeAllData(userId, {
  birthDate: effectiveBirthDate,
  birthTime: effectiveBirthTime,
  gender: effectiveGender as 'male' | 'female',
  latitude: effectiveLatitude,
  longitude: effectiveLongitude,
  saju,
  astro,
});

saju = loadedData.saju;
astro = loadedData.astro;
const currentTransits = loadedData.currentTransits;
```

### 2단계: 타이밍 분석 섹션 교체 (라인 484-549)

**Before (74줄):**
```typescript
let timingScoreSection = "";
if (saju?.dayMaster && (theme === "year" || ...)) {
  try {
    const dayStem = saju.dayMaster?.heavenlyStem || '甲';
    // ... 74줄의 복잡한 로직
  }
}
```

**After (1줄):**
```typescript
const timingScoreSection = buildAdvancedTimingSection(
  saju,
  effectiveBirthDate,
  theme,
  lang
);
```

### 3단계: 일진 정밀 분석 교체 (라인 554-664)

**Before (110줄):**
```typescript
let enhancedAnalysisSection = "";
try {
  const today = new Date();
  const dailyPillar = calculateDailyPillar(today);
  // ... 110줄의 복잡한 로직
}
```

**After (1줄):**
```typescript
const enhancedAnalysisSection = buildDailyPrecisionSection(
  saju,
  theme,
  lang
);
```

### 4단계: 대운-트랜짓 분석 교체 (라인 669-728)

**Before (59줄):**
```typescript
let daeunTransitSection = "";
try {
  if (saju?.unse?.daeun && currentAge) {
    const daeunList: DaeunInfo[] = convertSajuDaeunToInfo(saju.unse.daeun);
    // ... 59줄의 복잡한 로직
  }
}
```

**After (1줄):**
```typescript
const daeunTransitSection = buildDaeunTransitSection(
  saju,
  effectiveBirthDate,
  lang
);
```

### 5단계: 인생 예측 섹션 교체 (라인 965-1052)

**Before (87줄):**
```typescript
let lifePredictionSection = "";
const longTermThemes = ["future", "life-plan", ...];
if (longTermThemes.includes(theme)) {
  try {
    // ... 87줄의 복잡한 로직
  }
}
```

**After (2줄):**
```typescript
const lifePredictionSection = buildMultiYearTrendSection(
  saju,
  astro,
  effectiveBirthDate,
  theme,
  lang
);
```

### 6단계: 과거 분석 섹션 추가 (라인 764-828)

**Before (64줄):**
```typescript
let pastAnalysisSection = "";
const pastKeywords = ['그때', '당시', '과거', '작년'];
// ... 64줄의 복잡한 로직
```

**After (1줄):**
```typescript
const pastAnalysisSection = buildPastAnalysisSection(
  saju,
  astro,
  effectiveBirthDate,
  lastUser?.content || '',
  lang
);
```

### 7단계: 최종 프롬프트 조합 (라인 1115-1132)

**Before:**
```typescript
const finalPrompt = [
  systemPrompt,
  v3DataSection,
  timingScoreSection,
  // ... 많은 섹션 수동 조합
].filter(Boolean).join("\n\n");
```

**After:**
```typescript
const sections: PromptSection[] = [
  { name: 'base', content: v3DataSection, priority: SECTION_PRIORITIES.BASE_DATA },
  { name: 'timing', content: timingScoreSection, priority: SECTION_PRIORITIES.TIMING },
  { name: 'daily', content: enhancedAnalysisSection, priority: SECTION_PRIORITIES.DAILY_PRECISION },
  { name: 'daeun', content: daeunTransitSection, priority: SECTION_PRIORITIES.DAEUN_TRANSIT },
  { name: 'tier3', content: tier3Section, priority: SECTION_PRIORITIES.TIER3_ASTRO },
  { name: 'tier4', content: tier4Section, priority: SECTION_PRIORITIES.TIER4_HARMONICS },
  { name: 'life', content: lifePredictionSection, priority: SECTION_PRIORITIES.LIFE_PREDICTION },
  { name: 'past', content: pastAnalysisSection, priority: SECTION_PRIORITIES.PAST_ANALYSIS },
];

const finalPrompt = assembleFinalPrompt({
  systemPrompt,
  baseContext: v3DataSection,
  memoryContext: `${personaMemoryContext}\n\n${recentSessionSummaries}`,
  sections,
  messages: trimmedHistory,
  userQuestion: lastUser?.content || '',
});
```

## 📊 예상 효과

| 섹션 | Before | After | 감소율 |
|------|--------|-------|--------|
| 데이터 로딩 | 80줄 | 5줄 | -94% |
| 타이밍 분석 | 74줄 | 1줄 | -99% |
| 일진 정밀 분석 | 110줄 | 1줄 | -99% |
| 대운-트랜짓 | 59줄 | 1줄 | -98% |
| 인생 예측 | 87줄 | 2줄 | -98% |
| 과거 분석 | 64줄 | 1줄 | -98% |
| **총합** | **474줄** | **11줄** | **-98%** |

**전체 route.ts 예상**: 1193줄 → **300-400줄** (70% 감소)

## 🔧 실행 단계

### 필수 준비사항:
1. ✅ 모든 빌더 모듈 생성 완료
2. ✅ 타입 에러 해결 완료
3. ⚠️ route.ts 백업 완료 (route.ts.backup-refactor)

### 실행:
```bash
# 1. 현재 브랜치 확인
git status

# 2. route.ts 편집 시작
# - 위의 1-7단계를 순차적으로 적용
# - 각 단계마다 저장하고 타입 체크

# 3. 타입 체크
npx tsc --noEmit

# 4. 빌드 테스트
npm run build

# 5. 커밋
git add .
git commit -m "refactor: Modularize route.ts with builder pattern

- Extract data loading to dataLoader.ts
- Extract timing analysis to advancedTimingBuilder.ts
- Extract daily precision to dailyPrecisionBuilder.ts
- Extract daeun-transit to daeunTransitBuilder.ts
- Extract life prediction to lifeAnalysisBuilder.ts
- Use promptAssembly for final prompt composition
- Reduce route.ts from 1193 to ~350 lines (70% reduction)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## ⚠️ 주의사항

1. **점진적 교체**: 한 번에 모든 섹션을 교체하지 말고, 하나씩 교체하면서 테스트
2. **백업 확인**: route.ts.backup-refactor 파일 유지
3. **기능 검증**: 각 단계 후 API 테스트
4. **성능 측정**: 리팩토링 전후 응답 시간 비교
5. **로깅 유지**: 디버그 로그는 빌더 내부로 이동됨

## 🐛 알려진 이슈

### 1. Gender 하드코딩
**파일**: `lifeAnalysisBuilder.ts`
**위치**: 라인 63, 115
```typescript
gender: 'male', // Default, should be passed from parent
```
**해결**: buildPastAnalysisSection, buildMultiYearTrendSection에 gender 파라미터 추가

### 2. 날짜 추천 빌더 미사용
**파일**: `dateRecommendationBuilder.ts`
**상태**: 이미 존재하지만 route.ts에서 아직 사용 안 함
**해결**: 라인 830-927을 dateRecommendationBuilder 호출로 교체

## 📚 참고 문서

- [REFACTORING_PROGRESS.md](REFACTORING_PROGRESS.md) - 전체 진행 상황
- [route.ts.backup-refactor](src/app/api/destiny-map/chat-stream/route.ts.backup-refactor) - 원본 백업
- [builders/README.md](src/app/api/destiny-map/chat-stream/builders/README.md) - 빌더 사용법 (TODO)

## ✅ 체크리스트

### 리팩토링 전:
- [ ] route.ts 백업 확인
- [ ] 현재 git branch 확인
- [ ] 빌더 모듈 테스트 통과 확인

### 리팩토링 중:
- [ ] 1단계: 데이터 로딩 교체
- [ ] 2단계: 타이밍 분석 교체
- [ ] 3단계: 일진 분석 교체
- [ ] 4단계: 대운-트랜짓 교체
- [ ] 5단계: 인생 예측 교체
- [ ] 6단계: 과거 분석 교체
- [ ] 7단계: 프롬프트 조합 교체

### 리팩토링 후:
- [ ] 타입 에러 0개
- [ ] 빌드 성공
- [ ] API 테스트 통과
- [ ] 성능 벤치마크
- [ ] Git 커밋

---

**마지막 업데이트**: 2026-01-22
**다음 작업**: route.ts 본문 리팩토링 (1-2시간 예상)
**책임자**: 개발자
