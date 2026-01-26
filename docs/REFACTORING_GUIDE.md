# Refactoring Execution Guide

## 🎯 Quick Start

가장 크리티컬한 파일들의 리팩토링 실행 가이드입니다.

---

## 📘 past-life/analyzer.ts 리팩토링

### 현재 상태
- **2,051줄**: 데이터 1,800줄 + 로직 250줄
- **모든 것이 하나의 파일**: 유지보수 어려움
- **타입 안전성 부족**: 많은 옵셔널 체이닝

### 리팩토링 Step-by-Step

#### Step 1: 데이터 타입 분리 ✅ (완료)
```bash
# 이미 생성됨
src/lib/past-life/data/types.ts
```

#### Step 2: SOUL_PATTERNS 데이터 분리

**명령어**:
```bash
# 92-253줄 추출
sed -n '92,253p' src/lib/past-life/analyzer.ts > temp_soul_patterns.ts
```

**파일 생성**: `src/lib/past-life/data/soul-patterns.ts`
```typescript
import type { GeokgukType, SoulPatternData } from './types';

export const SOUL_PATTERNS: Record<GeokgukType, SoulPatternData> = {
  // 92-253줄 내용 복사
  siksin: { ... },
  sanggwan: { ... },
  // ... 나머지 8개 격국
};
```

#### Step 3: PAST_LIFE_THEMES 데이터 분리

**명령어**:
```bash
# 256-559줄 추출
sed -n '256,559p' src/lib/past-life/analyzer.ts > temp_past_life_themes.ts
```

**파일 생성**: `src/lib/past-life/data/past-life-themes.ts`
```typescript
import type { GeokgukType, PastLifeThemeData } from './types';

export const PAST_LIFE_THEMES: Record<GeokgukType, PastLifeThemeData> = {
  // 내용 복사
};
```

#### Step 4: NODE_JOURNEY 데이터 분리

**파일 생성**: `src/lib/past-life/data/node-journey.ts`
```typescript
import type { HouseNumber, NodeJourneyData } from './types';

export const NODE_JOURNEY: Record<HouseNumber, NodeJourneyData> = {
  // 560-971줄 내용
};
```

#### Step 5: SATURN_LESSONS 데이터 분리

**파일 생성**: `src/lib/past-life/data/saturn-lessons.ts`
```typescript
import type { HouseNumber, SaturnLessonData } from './types';

export const SATURN_LESSONS: Record<HouseNumber, SaturnLessonData> = {
  // 972-1287줄 내용
};
```

#### Step 6: DAY_MASTER_MISSION 데이터 분리

**파일 생성**: `src/lib/past-life/data/day-master-mission.ts`
```typescript
import type { HeavenlyStem, DayMasterMissionData } from './types';

export const DAY_MASTER_MISSION: Record<HeavenlyStem, DayMasterMissionData> = {
  // 1288-1619줄 내용
};
```

#### Step 7: 상수 데이터 분리

**파일 생성**: `src/lib/past-life/data/constants.ts`
```typescript
import type { GeokgukType } from './types';

export const GEOKGUK_TALENTS: Record<GeokgukType, { ko: string; en: string }[]> = {
  // 1620-1679줄
};

export const GEOKGUK_NAME_MAPPING: Record<string, GeokgukType> = {
  // 1680-1749줄
};

export const KARMIC_PATTERN_MATCHERS: Record<string, string[]> = {
  // 1750-1795줄
};

export const PLANET_ALIASES = {
  northNode: ['North Node', 'northnode', 'true node'],
  saturn: ['Saturn', 'saturn']
} as const;

export const KARMA_SCORE_CONFIG = {
  BASE_SCORE: 50,
  MAX_SCORE: 100,
  MIN_SCORE: 0,
  BONUS: {
    GEOKGUK: 10,
    NORTH_NODE: 10,
    SATURN: 10,
    DAY_MASTER: 10,
    PER_KARMIC_DEBT: 5,
  }
} as const;
```

#### Step 8: 헬퍼 함수 분리

**파일 생성**: `src/lib/past-life/utils/helpers.ts`
```typescript
import type { BilingualText, GeokgukType, HeavenlyStem, HouseNumber } from '../data/types';
import { GEOKGUK_NAME_MAPPING } from '../data/constants';

export function selectLang(isKo: boolean, text: BilingualText): string {
  return isKo ? text.ko : text.en;
}

export function selectLangFromArray<T extends { ko: string; en: string }>(
  isKo: boolean,
  items: readonly T[]
): string[] {
  return isKo ? items.map(x => x.ko) : items.map(x => x.en);
}

export function isValidHeavenlyStem(char: string): char is HeavenlyStem {
  return ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'].includes(char);
}

export function getGeokgukType(geokName: string | undefined): GeokgukType | null {
  if (!geokName) return null;
  return GEOKGUK_NAME_MAPPING[geokName] || null;
}

// ... 나머지 헬퍼 함수들
```

**파일 생성**: `src/lib/past-life/utils/extractors.ts`
```typescript
// 데이터 추출 관련 함수들
export function extractDayMasterChar(saju: SajuData | null): HeavenlyStem | null { ... }
export function findPlanetHouse(astro: AstroData | null, planetName: string): HouseNumber | null { ... }
export function findPlanetByAliases(astro: AstroData | null, aliases: readonly string[]): HouseNumber | null { ... }
```

**파일 생성**: `src/lib/past-life/utils/builders.ts`
```typescript
// 결과 빌더 함수들
export function buildSoulPattern(geokgukType: GeokgukType | null, isKo: boolean) { ... }
export function buildPastLife(geokgukType: GeokgukType | null, isKo: boolean) { ... }
export function buildSoulJourney(northNodeHouse: HouseNumber | null, isKo: boolean) { ... }
export function buildSaturnLesson(saturnHouse: HouseNumber | null, isKo: boolean) { ... }
export function buildThisLifeMission(dayMasterChar: HeavenlyStem | null, isKo: boolean) { ... }
```

#### Step 9: 메인 analyzer.ts 간소화

**최종 analyzer.ts** (~100줄):
```typescript
import type { PastLifeResult } from './types';
import { getGeokgukType } from './utils/helpers';
import { extractDayMasterChar, findPlanetByAliases } from './utils/extractors';
import {
  buildSoulPattern,
  buildPastLife,
  buildSoulJourney,
  buildSaturnLesson,
  buildThisLifeMission,
} from './utils/builders';
import { analyzeKarmicDebts, extractTalentsCarried, calculateKarmaScore } from './utils/analyzers';
import { PLANET_ALIASES } from './data/constants';

export function analyzePastLife(
  saju: SajuData | null,
  astro: AstroData | null,
  isKo: boolean
): PastLifeResult {
  // 기본 데이터 추출
  const geokguk = saju?.advancedAnalysis?.geokguk;
  const geokName = geokguk?.name || geokguk?.type;
  const geokgukType = getGeokgukType(geokName);
  const dayMasterChar = extractDayMasterChar(saju);
  const northNodeHouse = findPlanetByAliases(astro, PLANET_ALIASES.northNode);
  const saturnHouse = findPlanetByAliases(astro, PLANET_ALIASES.saturn);

  // 각 섹션 생성
  const soulPattern = buildSoulPattern(geokgukType, isKo);
  const pastLife = buildPastLife(geokgukType, isKo);
  const soulJourney = buildSoulJourney(northNodeHouse, isKo);
  const karmicDebts = analyzeKarmicDebts(saju, isKo);
  const saturnLesson = buildSaturnLesson(saturnHouse, isKo);
  const talentsCarried = extractTalentsCarried(geokgukType, isKo);
  const thisLifeMission = buildThisLifeMission(dayMasterChar, isKo);
  const karmaScore = calculateKarmaScore(
    geokgukType,
    northNodeHouse,
    saturnHouse,
    dayMasterChar,
    karmicDebts.length
  );

  return {
    soulPattern,
    pastLife,
    soulJourney,
    karmicDebts,
    saturnLesson,
    talentsCarried,
    thisLifeMission,
    karmaScore,
    geokguk: geokName,
    northNodeHouse: northNodeHouse ?? undefined,
    saturnHouse: saturnHouse ?? undefined,
    dayMaster: dayMasterChar ?? undefined,
  };
}
```

#### Step 10: 테스트 작성

**파일 생성**: `tests/lib/past-life/helpers.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import {
  selectLang,
  isValidHeavenlyStem,
  getGeokgukType
} from '@/lib/past-life/utils/helpers';

describe('past-life helpers', () => {
  describe('selectLang', () => {
    it('should return Korean text when isKo is true', () => {
      const text = { ko: '한국어', en: 'English' };
      expect(selectLang(true, text)).toBe('한국어');
    });

    it('should return English text when isKo is false', () => {
      const text = { ko: '한국어', en: 'English' };
      expect(selectLang(false, text)).toBe('English');
    });
  });

  describe('isValidHeavenlyStem', () => {
    it('should return true for valid stems', () => {
      expect(isValidHeavenlyStem('갑')).toBe(true);
      expect(isValidHeavenlyStem('을')).toBe(true);
    });

    it('should return false for invalid stems', () => {
      expect(isValidHeavenlyStem('가')).toBe(false);
      expect(isValidHeavenlyStem('')).toBe(false);
    });
  });
});
```

---

## 📈 예상 결과

### Before (2,051줄)
```
src/lib/past-life/
└── analyzer.ts (2,051줄)
```

### After (~600줄 total, 평균 100줄/파일)
```
src/lib/past-life/
├── data/
│   ├── types.ts (50줄)
│   ├── soul-patterns.ts (162줄)
│   ├── past-life-themes.ts (305줄)
│   ├── node-journey.ts (412줄)
│   ├── saturn-lessons.ts (316줄)
│   ├── day-master-mission.ts (332줄)
│   └── constants.ts (150줄)
├── utils/
│   ├── helpers.ts (50줄)
│   ├── extractors.ts (80줄)
│   ├── builders.ts (200줄)
│   └── analyzers.ts (100줄)
├── analyzer.ts (100줄) ⭐ 간소화!
└── types.ts (50줄)
```

### 개선 효과
- ✅ **가독성**: 각 파일 100-400줄로 관리 용이
- ✅ **유지보수**: 데이터 수정 시 해당 파일만 수정
- ✅ **테스트**: 각 함수 독립적으로 테스트 가능
- ✅ **재사용**: 다른 곳에서도 데이터 활용 가능
- ✅ **번들 최적화**: 필요한 데이터만 import 가능

---

## 🚀 빠른 실행 스크립트

```bash
# 1. 디렉토리 생성
mkdir -p src/lib/past-life/data
mkdir -p src/lib/past-life/utils
mkdir -p tests/lib/past-life

# 2. types.ts 이미 생성됨 ✅

# 3. 데이터 추출 (각 데이터 객체별로 수동 복사)
# - SOUL_PATTERNS → soul-patterns.ts
# - PAST_LIFE_THEMES → past-life-themes.ts
# - NODE_JOURNEY → node-journey.ts
# - SATURN_LESSONS → saturn-lessons.ts
# - DAY_MASTER_MISSION → day-master-mission.ts
# - 기타 상수 → constants.ts

# 4. 함수 추출 (헬퍼 함수들 복사)
# - 유틸리티 함수 → utils/helpers.ts
# - 추출 함수 → utils/extractors.ts
# - 빌더 함수 → utils/builders.ts
# - 분석 함수 → utils/analyzers.ts

# 5. analyzer.ts 간소화

# 6. import 경로 업데이트

# 7. 테스트 실행
npm test src/lib/past-life
```

---

## ✅ 검증 체크리스트

리팩토링 후 확인사항:

- [ ] 모든 import 경로가 올바른가?
- [ ] 기존 테스트가 통과하는가?
- [ ] 타입 에러가 없는가?
- [ ] 번들 빌드가 성공하는가?
- [ ] 기능이 정상 동작하는가?
- [ ] 새로운 단위 테스트 작성했는가?
- [ ] 문서 업데이트했는가?

---

## 📝 커밋 가이드

```bash
# 1단계: 타입 분리
git add src/lib/past-life/data/types.ts
git commit -m "refactor(past-life): Extract data types to separate file"

# 2단계: 데이터 분리
git add src/lib/past-life/data/
git commit -m "refactor(past-life): Separate data objects into individual files

- Extract SOUL_PATTERNS (162 lines)
- Extract PAST_LIFE_THEMES (305 lines)
- Extract NODE_JOURNEY (412 lines)
- Extract SATURN_LESSONS (316 lines)
- Extract DAY_MASTER_MISSION (332 lines)
- Extract constants (150 lines)"

# 3단계: 유틸리티 분리
git add src/lib/past-life/utils/
git commit -m "refactor(past-life): Extract helper functions to utils

- helpers.ts: Language selection, type guards
- extractors.ts: Data extraction functions
- builders.ts: Result builder functions
- analyzers.ts: Analysis logic"

# 4단계: 메인 파일 간소화
git add src/lib/past-life/analyzer.ts
git commit -m "refactor(past-life): Simplify main analyzer (2,051 → 100 lines)

Import data and utilities from modularized files.
Main analyzer now focuses solely on orchestration."

# 5단계: 테스트 추가
git add tests/lib/past-life/
git commit -m "test(past-life): Add unit tests for helper functions"
```

---

**Last Updated**: 2026-01-26
**Estimated Time**: 2-3 hours
**Difficulty**: Medium
**Impact**: High (85% line reduction)
