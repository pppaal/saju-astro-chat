/**
 * Tarot Question Classifiers
 * Pattern-based question classification for tarot spread selection
 * Extracted from analyze-question/route.ts (4,681 lines → modular)
 *
 * Optimized: Pre-compiled regex patterns with memoization for better performance
 * Refactored: Pattern data separated to data/questionClassifierPatterns.ts
 * Enhanced: Korean text normalization, chosung handling, fuzzy matching
 */

import {
  normalizeText,
  fuzzyMatch,
  enhancedYesNoMatch,
  isChosungOnly,
  decodeChosung,
  prepareForMatching,
} from './utils/koreanTextNormalizer'
import {
  yesNoEndingPatterns,
  yesNoMidPatterns,
  yesNoKeywordPatterns,
  yesNoEnglishPatterns,
  crushPatterns,
  reconciliationPatterns,
  examInterviewPatterns,
  jobChangePatterns,
  comparisonPatterns,
  timingPatterns,
  findingPartnerPatterns,
  todayFortunePatterns,
  weeklyMonthlyPatterns,
  moneyFortunePatterns,
  healthFortunePatterns,
  familyRelationPatterns,
  businessPatterns,
  generalFortunePatterns,
  studyFortunePatterns,
  travelPatterns,
  workRelationPatterns,
  legalPatterns,
  drivingPatterns,
  petPatterns,
  friendRelationPatterns,
  marriageRelationPatterns,
  beautyFashionPatterns,
  movingRealEstatePatterns,
  parentCarePatterns,
  sleepRestPatterns,
  onlineShoppingPatterns,
  rentalLeasePatterns,
  phoneDevicePatterns,
  hairAppearancePatterns,
  giftPresentPatterns,
  dietWeightPatterns,
  languageLearningPatterns,
  driverLicensePatterns,
  volunteerCharityPatterns,
  coupleFightPatterns,
} from './data/questionClassifierPatterns'

// ============================================================
// Memoization cache for classifier results
// ============================================================
const classifierCache = new Map<string, Map<string, boolean>>()
const CACHE_MAX_SIZE = 500
const MAX_CLASSIFIERS = 50 // 최대 classifier 개수 제한

function getCachedResult(classifierName: string, question: string): boolean | undefined {
  const classifierMap = classifierCache.get(classifierName)
  return classifierMap?.get(question)
}

function setCachedResult(classifierName: string, question: string, result: boolean): void {
  let classifierMap = classifierCache.get(classifierName)
  if (!classifierMap) {
    // 외부 Map 크기 제한 - 초과 시 가장 오래된 classifier 제거
    if (classifierCache.size >= MAX_CLASSIFIERS) {
      const firstKey = classifierCache.keys().next().value
      if (firstKey) {
        classifierCache.delete(firstKey)
      }
    }
    classifierMap = new Map()
    classifierCache.set(classifierName, classifierMap)
  }
  // Limit cache size to prevent memory leaks
  if (classifierMap.size >= CACHE_MAX_SIZE) {
    const firstKey = classifierMap.keys().next().value
    if (firstKey) {
      classifierMap.delete(firstKey)
    }
  }
  classifierMap.set(question, result)
}

// Helper to test patterns with caching
function testPatternsWithCache(
  classifierName: string,
  question: string,
  patterns: RegExp[]
): boolean {
  const cached = getCachedResult(classifierName, question)
  if (cached !== undefined) {
    return cached
  }

  const result = patterns.some((p) => p.test(question))
  setCachedResult(classifierName, question, result)
  return result
}

// Pattern cache for lazy initialization
const patternCache = new Map<string, RegExp[]>()

// Helper to get or create patterns with lazy initialization
function getOrCreatePatterns(name: string, createPatterns: () => RegExp[]): RegExp[] {
  let patterns = patternCache.get(name)
  if (!patterns) {
    patterns = createPatterns()
    patternCache.set(name, patterns)
  }
  return patterns
}

// Combined helper: lazy pattern creation + result caching
function testWithLazyPatterns(
  classifierName: string,
  question: string,
  createPatterns: () => RegExp[]
): boolean {
  const patterns = getOrCreatePatterns(classifierName, createPatterns)
  return testPatternsWithCache(classifierName, question, patterns)
}

// Clear cache (useful for testing)
export function clearClassifierCache(): void {
  classifierCache.clear()
}

// ============================================================
// Combined Yes/No patterns
// ============================================================
const allYesNoPatterns = [
  ...yesNoEndingPatterns,
  ...yesNoMidPatterns,
  ...yesNoKeywordPatterns,
  ...yesNoEnglishPatterns,
]

const crushRelationshipContextPattern =
  /그 ?사람|그사람|상대(방)?|짝사랑|썸남|썸녀|썸 ?타|연애|호감|관심|나를|날|저를|they|he|she|crush|like me|into me|feelings for/i

const nonRelationshipMindContextPattern =
  /몸과 ?마음|마음의 ?균형|마음 ?균형|멘탈|우울|불안|회복|치유|스트레스|번아웃|수면|건강|컨디션|심리/i

const directCrushSignalPattern =
  /좋아해\??$|좋아하나|좋아할까|사랑해\??$|is .* into me|does .* like me|have feelings/i

// ============================================================
// Classifier Functions
// ============================================================

export function isYesNoQuestion(question: string): boolean {
  // 0. 일반 흐름 질문은 Yes/No가 아님
  const generalFlowExclusions =
    /앞으로|전반적|흐름|전체적|overall|general.*flow|what('?s| is) ahead/i
  if (generalFlowExclusions.test(question)) {
    return false
  }

  // 0-1. "어떻게/why/how to" 형태의 방법 질문은 기본적으로 Yes/No가 아님
  const openEndedGuidePatterns =
    /어떻게|왜|무엇|뭐|무슨|어떤 ?방법|어떤 ?방식|how to|how can i|how do i|how should i|what should i do|what can i do/i
  const explicitDecisionSignals =
    /할까 ?말까|a ?vs ?b|vs|둘 ?중|아니면|should i|shall i|can i|may i|해도 ?될까|해야 ?할까|할지 ?말지|할지/i
  if (openEndedGuidePatterns.test(question) && !explicitDecisionSignals.test(question)) {
    return false
  }

  // 1. 기본 패턴 매칭
  if (testPatternsWithCache('yesNo', question, allYesNoPatterns)) {
    return true
  }

  // 2. 초성 질문 처리
  const normalized = normalizeText(question)
  if (isChosungOnly(normalized)) {
    const decoded = decodeChosung(normalized)
    if (decoded && testPatternsWithCache('yesNo', decoded, allYesNoPatterns)) {
      return true
    }
  }

  // 3. 강화된 Yes/No 매칭 (띄어쓰기 무시)
  if (enhancedYesNoMatch(question)) {
    return true
  }

  // 4. Fuzzy 매칭 (정규화 + 맞춤법 보정)
  return fuzzyMatch(question, allYesNoPatterns)
}

export function isCrushQuestion(question: string): boolean {
  if (
    nonRelationshipMindContextPattern.test(question) &&
    !crushRelationshipContextPattern.test(question)
  ) {
    return false
  }

  const matched = testPatternsWithCache('crush', question, crushPatterns)
  if (!matched) {
    return false
  }

  if (crushRelationshipContextPattern.test(question)) {
    return true
  }

  return directCrushSignalPattern.test(question)
}

export function isReconciliationQuestion(question: string): boolean {
  return testPatternsWithCache('reconciliation', question, reconciliationPatterns)
}

export function isExamInterviewQuestion(question: string): boolean {
  return testPatternsWithCache('examInterview', question, examInterviewPatterns)
}

export function isJobChangeQuestion(question: string): boolean {
  return testPatternsWithCache('jobChange', question, jobChangePatterns)
}

export function isComparisonQuestion(question: string): boolean {
  return testPatternsWithCache('comparison', question, comparisonPatterns)
}

export function isTimingQuestion(question: string): boolean {
  return testPatternsWithCache('timing', question, timingPatterns)
}

export function isFindingPartnerQuestion(question: string): boolean {
  return testPatternsWithCache('findingPartner', question, findingPartnerPatterns)
}

export function isTodayFortuneQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('todayFortune', question, todayFortunePatterns)
}

export function isWeeklyMonthlyQuestion(question: string): boolean {
  return testPatternsWithCache('weeklyMonthly', question, weeklyMonthlyPatterns)
}

export function isMoneyFortuneQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('moneyFortune', question, moneyFortunePatterns)
}

export function isHealthFortuneQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('healthFortune', question, healthFortunePatterns)
}

export function isFamilyRelationQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('familyRelation', question, familyRelationPatterns)
}

export function isBusinessQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('business', question, businessPatterns)
}

export function isGeneralFortuneQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  if (isTodayFortuneQuestion(question)) {
    return false
  }
  if (isWeeklyMonthlyQuestion(question)) {
    return false
  }
  return testPatternsWithCache('generalFortune', question, generalFortunePatterns)
}

export function isStudyFortuneQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('studyFortune', question, studyFortunePatterns)
}

export function isTravelQuestion(question: string): boolean {
  return testPatternsWithCache('travel', question, travelPatterns)
}

export function isWorkRelationQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('workRelation', question, workRelationPatterns)
}

export function isLegalQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('legal', question, legalPatterns)
}

export function isDrivingQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('driving', question, drivingPatterns)
}

export function isPetQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('pet', question, petPatterns)
}

export function isFriendRelationQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('friendRelation', question, friendRelationPatterns)
}

export function isMarriageRelationQuestion(question: string): boolean {
  if (isCrushQuestion(question)) {
    return false
  }
  if (isReconciliationQuestion(question)) {
    return false
  }
  if (isFindingPartnerQuestion(question)) {
    return false
  }
  return testPatternsWithCache('marriageRelation', question, marriageRelationPatterns)
}

export function isBeautyFashionQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('beautyFashion', question, beautyFashionPatterns)
}

export function isMovingRealEstateQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('movingRealEstate', question, movingRealEstatePatterns)
}

export function isParentCareQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('parentCare', question, parentCarePatterns)
}

export function isSleepRestQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('sleepRest', question, sleepRestPatterns)
}

export function isOnlineShoppingQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('onlineShopping', question, onlineShoppingPatterns)
}

export function isRentalLeaseQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('rentalLease', question, rentalLeasePatterns)
}

export function isPhoneDeviceQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('phoneDevice', question, phoneDevicePatterns)
}

export function isHairAppearanceQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('hairAppearance', question, hairAppearancePatterns)
}

export function isGiftPresentQuestion(question: string): boolean {
  return testPatternsWithCache('giftPresent', question, giftPresentPatterns)
}

export function isDietWeightQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('dietWeight', question, dietWeightPatterns)
}

export function isLanguageLearningQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('languageLearning', question, languageLearningPatterns)
}

export function isDriverLicenseQuestion(question: string): boolean {
  return testPatternsWithCache('driverLicense', question, driverLicensePatterns)
}

export function isVolunteerCharityQuestion(question: string): boolean {
  return testPatternsWithCache('volunteerCharity', question, volunteerCharityPatterns)
}

export function isCoupleFightQuestion(question: string): boolean {
  if (isYesNoQuestion(question)) {
    return false
  }
  return testPatternsWithCache('coupleFight', question, coupleFightPatterns)
}
