# Quick Reference Guide - Extracted Modules

## 📦 Module Overview

| Module | Size | Functions | Purpose |
|--------|------|-----------|---------|
| **saju-temporal-scoring.ts** | 912 lines | 8 | Temporal luck cycles (年/月/日/大運) |
| **saju-character-analysis.ts** | 783 lines | 6 | Character structure & life phases |
| **astrology-lunar.ts** | 830 lines | 7 | Lunar phases & eclipse analysis |
| **TOTAL** | **2,525 lines** | **19** | Complete destiny analysis |

---

## 🎯 Quick Function Reference

### Module 1: Temporal Scoring

#### Year Calculation
```typescript
const yearGanzhi = getYearGanzhi(2024);
// { stem: '甲', branch: '辰', stemElement: 'wood', branchElement: 'earth' }
```

#### Score Calculations (by time scale)
```typescript
// Annual luck (세운) - 40% weight in total
const seunScore = calculateSeunScore('fire', '午', 2024);

// Monthly luck (월운) - 15% weight
const wolunScore = calculateWolunScore('fire', '午', 2024, 3);

// Daily luck (일진) - 15% weight
const iljinScore = calculateIljinScore('fire', '丁', '午', ganzhiData);

// 10-year cycle (대운) - 40% weight, most important
const daeunScore = calculateDaeunScore('fire', '午', cycles, 1990, 2024);

// Combined temporal score
const totalTemporal = calculateTotalTemporalScore(
  seunScore.score,     // 30%
  wolunScore.score,    // 15%
  iljinScore.score,    // 15%
  daeunScore.score     // 40%
);
```

**Score Ranges**:
| Type | Min | Max | Interpretation |
|------|-----|-----|-----------------|
| Seun | -30 | +35 | Bad/Neutral/Good year |
| Wolun | -20 | +25 | Bad/Neutral/Good month |
| Iljin | -60 | +50 | Very bad/Neutral/Very good day |
| Daeun | -40 | +65 | Most influential (10-year) |
| **Total** | **-100** | **+150** | Overall fortune |

---

### Module 2: Character Analysis

#### Element Analysis
```typescript
// Beneficial element (용신) - matches INCREASE fortune +30
const yongsinAnalysis = analyzeYongsin(yongsinInfo, ganzhiData, date);

// Pattern type (격국) - 12+ types with preferences
const geokgukAnalysis = analyzeGeokguk(geokgukInfo, ganzhiData, pillars);

// Birthday energy boost
const solarReturn = analyzeSolarReturn(date, birthMonth, birthDay);

// Life phase theme (8 phases: 0-70+ years)
const progression = analyzeProgressions(date, birthYear, sunElement, dayMaster);
```

**Character Score Composition**:
| Component | Weight | Range | Key Points |
|-----------|--------|-------|-----------|
| Yongsin | 40% | -28~+45 | Primary element match |
| Geokguk | 35% | -18~+20 | Pattern preferences |
| SolarReturn | 15% | 0~+25 | Birthday boost |
| Progression | 10% | -5~+13 | Life phase fit |

**Life Phases** (Progression):
- 0-7y: Lunar (emotions)
- 7-14y: Mercury (learning)
- 14-21y: Venus (love)
- 21-29y: Solar (identity)
- 29-42y: Mars (action)
- **42-56y: Jupiter (expansion)** ⭐ Most fortunate
- 56-70y: Saturn (maturity)
- 70+: Outer planets (spirituality)

---

### Module 3: Lunar Analysis

#### Lunar Cycles
```typescript
// Basic 8-phase cycle
const basicPhase = getLunarPhase(date);
// Returns: { phase, phaseName, phaseScore (-5 to +12) }

// Detailed phase with illumination
const detailed = getMoonPhaseDetailed(date);
// Returns: { phase, illumination (0-100%), isWaxing, score }

// Check if Moon's activities are ineffective
const voc = checkVoidOfCourseMoon(date);
// Returns: { isVoid, moonSign, hoursRemaining }

// Eclipse impacts
const eclipse = checkEclipseImpact(date);
// Returns: { hasImpact, type (solar/lunar), intensity (strong/medium/weak) }

// Complete lunar analysis
const complete = analyzeLunarComplete(date);
// Returns: all above + totalScore
```

**Lunar Phase Scores**:
| Phase | Angle Range | Score | Meaning |
|-------|-------------|-------|---------|
| New Moon | 0-22° | +8/+10 | New beginnings |
| Waxing Crescent | 22-68° | +5/+10 | Growth |
| First Quarter | 68-112° | -3/+5 | Challenge |
| Waxing Gibbous | 112-157° | +7 | Refinement |
| **Full Moon** | **157-202°** | **+12** | **Completion** |
| Waning Gibbous | 202-247° | +3/+4 | Sharing |
| Last Quarter | 247-292° | -5/0 | Reflection |
| Waning Crescent | 292-337° | -2/-3 | Rest |

**Eclipse Impact** (2024-2030):
- 28 major eclipses tracked
- Strong (±1 day): ±25 points
- Medium (±3 days): ±15 points
- Weak (±7 days): ±8 points

---

## 🔄 Integration Pattern

### Suggested Flow
```typescript
// 1. Get baseline Saju data
const seunScore = calculateSeunScore(dayMaster, dayBranch, year);
const wolunScore = calculateWolunScore(dayMaster, dayBranch, year, month);
const daeunScore = calculateDaeunScore(dayMaster, dayBranch, cycles, birthYear, year);

// 2. Add character analysis
const yongsinScore = analyzeYongsin(yongsinInfo, ganzhi, date);
const geokgukScore = analyzeGeokguk(geokgukInfo, ganzhi, pillars);

// 3. Add lunar/astrological
const lunarScore = analyzeLunarComplete(date);

// 4. Combine all scores
const totalFortune =
  (weightedTemporal * 0.4) +      // 40%
  (weightedCharacter * 0.35) +    // 35%
  (lunarScore.totalScore * 0.25); // 25%
```

---

## 📊 Score Interpretation

### Overall Fortune Scale
```
150 .................... Exceptional luck
 80-150 ................ Very favorable
 20-80 ................. Favorable
 -20-20 ................ Neutral/Mixed
-80--20 ................ Unfavorable
-150--80 ............... Very unfavorable
-infinity--150 ........ Exceptional misfortune
```

### Daily Activity Recommendations

**Excellent (>80)**
- Start major projects
- Important meetings/negotiations
- Travel, moving
- Weddings, celebrations
- Major purchases

**Good (20-80)**
- Normal activities
- Minor commitments
- Routine tasks
- Learning/studying

**Caution (-20-20)**
- Avoid major decisions
- Be flexible with plans
- Focus on completing existing work
- Rest, reflection

**Unfavorable (<-80)**
- Postpone important matters
- Avoid confrontation
- Stay home/rest
- Maintenance tasks only

---

## 🛠️ Common Use Cases

### Use Case 1: Daily Forecast
```typescript
function getDailyForecast(date: Date, saju: SajuData): Forecast {
  const temporal = {
    seun: calculateSeunScore(saju.dayMaster, saju.dayBranch, date.getFullYear()),
    wolun: calculateWolunScore(saju.dayMaster, saju.dayBranch, date.getFullYear(), date.getMonth() + 1),
    iljin: calculateIljinScore(saju.dayMaster, saju.dayMasterStem, saju.dayBranch, ganzhiForDate),
    daeun: calculateDaeunScore(saju.dayMaster, saju.dayBranch, saju.daeunCycles, saju.birthYear, date.getFullYear())
  };

  const lunar = analyzeLunarComplete(date);

  return {
    date,
    temporalScore: weightedTemporal(temporal),
    lunarScore: lunar.totalScore,
    activities: getRecommendedActivities(totalScore),
    warnings: getWarnings(totalScore)
  };
}
```

### Use Case 2: Life Phase Counseling
```typescript
function getLifePhaseGuidance(currentDate: Date, birthYear: number, saju: SajuData) {
  const progression = analyzeProgressions(currentDate, birthYear, sunElement, saju.dayMaster);

  return {
    currentPhase: progression.currentPhase,
    ageRange: getPhaseAgeRange(progression.currentPhase),
    theme: getPhaseTheme(progression.currentPhase),
    challenges: getPhasesChallenges(progression),
    opportunities: getPhasesOpportunities(progression),
    advice: generatePhaseAdvice(progression, saju)
  };
}
```

### Use Case 3: Compatibility Check
```typescript
function checkDateCompatibility(proposedDate: Date, person1Saju: SajuData, person2Saju: Person2Saju) {
  const person1Fortune = {
    temporal: calculateTotalTemporalScore(...),
    lunar: analyzeLunarComplete(proposedDate).totalScore,
    character: calculateTotalCharacterScore(...)
  };

  const person2Fortune = { /* similar */ };

  const compatibility = calculateCompatibility(person1Fortune, person2Fortune);

  return {
    overallScore: compatibility,
    favorableForPerson1: compatibility > 0,
    favorableForPerson2: compatibility > 0,
    alternativesDates: findBetterDates(7) // Next 7 days
  };
}
```

---

## ⚠️ Important Notes

### Accuracy
- Calculations are **timezone-aware** (UTC-based)
- All approximations are sufficient for astrology/saju purposes
- Not suitable for astronomy/ephemeris calculations
- Planet positions ±3-5° accuracy

### Performance
- All calculations **O(1)** constant time
- No network calls or async operations
- Suitable for real-time applications
- Can calculate 1,000+ dates/second

### Data Requirements
```typescript
// Minimum required Saju data
interface SajuData {
  dayMaster: string;           // 일간 (목/화/토/금/수)
  dayMasterStem: string;       // 일천간 (甲乙丙...)
  dayBranch: string;           // 일지 (子丑寅...)
  birthYear?: number;          // For daeun
  daeunCycles?: DaeunCycle[]; // For 10-year luck
  yongsin?: YongsinInfo;       // For character
  geokguk?: GeokgukInfo;       // For pattern
}
```

---

## 📚 Dependencies

### Shared Constants (from constants.ts)
```typescript
ELEMENT_RELATIONS    // 5 elements × 4 relationships
STEMS               // 10 heavenly stems
BRANCHES            // 12 earthly branches
STEM_TO_ELEMENT     // Stem → element mapping
BRANCH_TO_ELEMENT   // Branch → element mapping
SAMHAP              // 3-harmony combinations
YUKHAP              // 6-harmony pairs
CHUNG               // Clash pairs
XING                // Punishment pairs
HAI                 // Harm pairs
ZODIAC_TO_ELEMENT   // Zodiac → element
```

### Shared Utilities (from utils.ts)
```typescript
getSipsin()         // Get 10-relationship type
normalizeElement()  // Normalize element spelling
```

---

## 🚀 Getting Started

### Installation
```bash
# All modules are in src/lib/destiny-map/calendar/
# No additional dependencies required
```

### Basic Import
```typescript
import {
  getYearGanzhi,
  calculateSeunScore,
  calculateTotalTemporalScore
} from '@/lib/destiny-map/calendar/saju-temporal-scoring';

import {
  analyzeYongsin,
  analyzeGeokguk
} from '@/lib/destiny-map/calendar/saju-character-analysis';

import {
  getLunarPhase,
  analyzeLunarComplete
} from '@/lib/destiny-map/calendar/astrology-lunar';
```

### First Calculation
```typescript
// 1. Get today's ganzhi
const today = new Date();
const dayGanzhi = getGanzhiForDate(today); // from destinyCalendar.ts

// 2. Calculate today's luck
const seunScore = calculateSeunScore('fire', '午', today.getFullYear());
const lunarScore = analyzeLunarComplete(today).totalScore;

// 3. Display result
console.log(`Today's luck: ${seunScore.score} (Saju) + ${lunarScore} (Lunar)`);
```

---

## 📞 Support

All modules include:
✅ Try-catch error handling
✅ Fallback values
✅ Console logging for debugging
✅ Type-safe TypeScript
✅ Comprehensive JSDoc

For errors, check console logs which include:
- Function name
- Error details
- Recovery strategy
