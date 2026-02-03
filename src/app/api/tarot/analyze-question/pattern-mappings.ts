// src/app/api/tarot/analyze-question/pattern-mappings.ts
// 질문 패턴 → 스프레드 매핑 테이블

import {
  isYesNoQuestion,
  isCrushQuestion,
  isReconciliationQuestion,
  isExamInterviewQuestion,
  isJobChangeQuestion,
  isComparisonQuestion,
  isTimingQuestion,
  isFindingPartnerQuestion,
  isTodayFortuneQuestion,
  isWeeklyMonthlyQuestion,
  isMoneyFortuneQuestion,
  isHealthFortuneQuestion,
  isFamilyRelationQuestion,
  isBusinessQuestion,
  isGeneralFortuneQuestion,
  isStudyFortuneQuestion,
  isTravelQuestion,
  isWorkRelationQuestion,
  isLegalQuestion,
  isDrivingQuestion,
  isPetQuestion,
  isFriendRelationQuestion,
  isMarriageRelationQuestion,
  isBeautyFashionQuestion,
  isMovingRealEstateQuestion,
  isParentCareQuestion,
  isSleepRestQuestion,
  isOnlineShoppingQuestion,
  isRentalLeaseQuestion,
  isPhoneDeviceQuestion,
  isHairAppearanceQuestion,
  isGiftPresentQuestion,
  isDietWeightQuestion,
  isLanguageLearningQuestion,
  isDriverLicenseQuestion,
  isVolunteerCharityQuestion,
  isCoupleFightQuestion,
} from '@/lib/Tarot/questionClassifiers'

export interface PatternMapping {
  check: (q: string) => boolean
  targetSpread: string
  themeId: string
  reason: string
  koExplanation: string
  enExplanation: string
  priority: number // 낮을수록 우선 처리
}

/**
 * 패턴 매핑 테이블 (priority 순으로 정렬됨)
 * priority 1: 켈틱 크로스 (종합 분석)
 * priority 2-4: 비교/타이밍 (Yes/No보다 우선)
 * priority 5-10: 특화 스프레드 (재회, 호감, 인연 찾기, 이직 등)
 * priority 11: Yes/No (catch-all)
 * priority 12+: 카테고리 매핑
 */
export const PATTERN_MAPPINGS: PatternMapping[] = [
  // === Priority 1: Celtic Cross (종합 깊이 분석) ===
  {
    check: (q: string) => {
      const normalized = q.toLowerCase().replace(/\s+/g, '')
      // 한국어: 종합, 전체, 모든 측면, 깊이, 복잡, 상세, 디테일, 전반적
      const koPatterns =
        /종합|전체|모든.*측면|모두.*보|깊이|복잡|상세|디테일|전반적|심층|완벽|구체적.*모든/
      // 영어: comprehensive, detailed, full picture, all aspects, deep analysis, in-depth, thorough
      const enPatterns =
        /comprehensive|detailed|full.*picture|all.*aspects?|deep.*analys|in[- ]?depth|thorough|complete.*reading|everything/
      return koPatterns.test(normalized) || enPatterns.test(q)
    },
    targetSpread: 'celtic-cross',
    themeId: 'general-insight',
    reason: '종합 심층 분석',
    koExplanation: '모든 측면을 깊이 있게 분석하는 10장 스프레드로 봐드릴게요! 🔮✨',
    enExplanation: "Let's do a comprehensive 10-card Celtic Cross reading! 🔮✨",
    priority: 1,
  },
  // === Priority 2-4: 비교/타이밍 (Yes/No보다 우선) ===
  {
    check: isComparisonQuestion,
    targetSpread: 'two-paths',
    themeId: 'decisions-crossroads',
    reason: '두 가지 선택 비교',
    koExplanation: '두 선택지를 비교해서 카드가 방향을 알려드릴게요! ⚖️',
    enExplanation: "Let's compare both options with the cards! ⚖️",
    priority: 2,
  },
  {
    check: isFindingPartnerQuestion,
    targetSpread: 'finding-a-partner',
    themeId: 'love-relationships',
    reason: '인연 만남 시기',
    koExplanation: '좋은 인연을 언제 만날지 카드로 살펴볼게요! 💫',
    enExplanation: "Let's see when you'll meet someone special! 💫",
    priority: 3,
  },
  {
    check: isJobChangeQuestion,
    targetSpread: 'job-change',
    themeId: 'career-work',
    reason: '이직/퇴사 상담',
    koExplanation: '직장 변화의 흐름을 카드로 살펴볼게요! 💼',
    enExplanation: "Let's explore your career transition! 💼",
    priority: 3.5, // 타이밍보다 우선
  },
  {
    check: isTimingQuestion,
    targetSpread: 'timing-window',
    themeId: 'decisions-crossroads',
    reason: '타이밍/시기 확인',
    koExplanation: '언제가 좋을지 카드로 알아볼게요! ⏰',
    enExplanation: "Let's find the right timing! ⏰",
    priority: 4,
  },
  // === Priority 5-10: 특화 스프레드 ===
  {
    check: isReconciliationQuestion,
    targetSpread: 'reconciliation',
    themeId: 'love-relationships',
    reason: '재회 가능성 확인',
    koExplanation: '다시 만날 수 있을지 카드로 살펴볼게요! 💔➡️💕',
    enExplanation: "Let's see the possibility of reconciliation! 💔➡️💕",
    priority: 5,
  },
  {
    check: isCrushQuestion,
    targetSpread: 'crush-feelings',
    themeId: 'love-relationships',
    reason: '상대방 마음 확인',
    koExplanation: '그 사람의 마음을 카드로 살펴볼게요! 💕',
    enExplanation: "Let's see what they really feel! 💕",
    priority: 6,
  },
  {
    check: (q: string) => {
      const isExamInterview = isExamInterviewQuestion(q)
      if (!isExamInterview) return false
      return /면접/.test(q) || /interview/i.test(q)
    },
    targetSpread: 'interview-result',
    themeId: 'career-work',
    reason: '면접 결과 확인',
    koExplanation: '면접 결과를 카드로 살펴볼게요! 💼',
    enExplanation: "Let's see your interview outcome! 💼",
    priority: 8,
  },
  {
    check: (q: string) => {
      const isExamInterview = isExamInterviewQuestion(q)
      if (!isExamInterview) return false
      return /시험|합격|자격증|수능|토익|공시|고시|편입|입시/.test(q) || /exam|test|pass/i.test(q)
    },
    targetSpread: 'exam-pass',
    themeId: 'career-work',
    reason: '시험 합격 확인',
    koExplanation: '시험 합격 가능성을 카드로 살펴볼게요! 📝',
    enExplanation: "Let's see your exam result! 📝",
    priority: 8,
  },
  {
    check: isTodayFortuneQuestion,
    targetSpread: 'day-card',
    themeId: 'daily-reading',
    reason: '오늘의 운세',
    koExplanation: '오늘 하루를 위한 카드를 뽑아볼게요! ☀️',
    enExplanation: "Let's draw a card for your day! ☀️",
    priority: 9,
  },
  {
    check: isWeeklyMonthlyQuestion,
    targetSpread: 'weekly-forecast',
    themeId: 'daily-reading',
    reason: '주간/월간 운세',
    koExplanation: '이번 주/달의 흐름을 카드로 살펴볼게요! 📅',
    enExplanation: "Let's see your week/month ahead! 📅",
    priority: 10,
  },

  // === Priority 11+: 카테고리 매핑 ===
  {
    check: isMoneyFortuneQuestion,
    targetSpread: 'financial-snapshot',
    themeId: 'money-finance',
    reason: '금전/재물 운세',
    koExplanation: '금전과 재물의 흐름을 카드로 살펴볼게요! 💰',
    enExplanation: "Let's explore your financial fortune! 💰",
    priority: 11,
  },
  {
    check: isHealthFortuneQuestion,
    targetSpread: 'mind-body-scan',
    themeId: 'well-being-health',
    reason: '건강 운세',
    koExplanation: '건강과 활력의 흐름을 카드로 살펴볼게요! 💪',
    enExplanation: "Let's explore your health and vitality! 💪",
    priority: 12,
  },
  {
    check: isFamilyRelationQuestion,
    targetSpread: 'relationship-cross',
    themeId: 'love-relationships',
    reason: '가족 관계 운세',
    koExplanation: '가족 관계의 흐름을 카드로 살펴볼게요! 👨‍👩‍👧',
    enExplanation: "Let's explore your family relationships! 👨‍👩‍👧",
    priority: 13,
  },
  {
    check: isBusinessQuestion,
    targetSpread: 'financial-snapshot',
    themeId: 'money-finance',
    reason: '사업/창업 운세',
    koExplanation: '사업과 창업의 흐름을 카드로 살펴볼게요! 📈',
    enExplanation: "Let's explore your business fortune! 📈",
    priority: 14,
  },
  {
    check: isGeneralFortuneQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '일반 운세',
    koExplanation: '전반적인 흐름을 카드로 살펴볼게요! ✨',
    enExplanation: "Let's see the overall flow! ✨",
    priority: 15,
  },
  {
    check: isStudyFortuneQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '학업 운세',
    koExplanation: '학업과 공부의 흐름을 카드로 살펴볼게요! 📚',
    enExplanation: "Let's explore your academic fortune! 📚",
    priority: 16,
  },
  {
    check: isTravelQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '여행 운세',
    koExplanation: '여행과 이동의 흐름을 카드로 살펴볼게요! ✈️',
    enExplanation: "Let's explore your travel fortune! ✈️",
    priority: 17,
  },
  {
    check: isWorkRelationQuestion,
    targetSpread: 'relationship-cross',
    themeId: 'love-relationships',
    reason: '직장 관계 운세',
    koExplanation: '직장 내 관계를 카드로 살펴볼게요! 👔',
    enExplanation: "Let's explore your workplace relationships! 👔",
    priority: 18,
  },
  {
    check: isLegalQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '법적 문제 운세',
    koExplanation: '법적 상황의 흐름을 카드로 살펴볼게요! ⚖️',
    enExplanation: "Let's explore your legal situation! ⚖️",
    priority: 19,
  },
  {
    check: isDrivingQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '운전/차량 운세',
    koExplanation: '운전과 차량 관련 흐름을 카드로 살펴볼게요! 🚗',
    enExplanation: "Let's explore your driving fortune! 🚗",
    priority: 20,
  },
  {
    check: isPetQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '반려동물 운세',
    koExplanation: '반려동물과의 인연을 카드로 살펴볼게요! 🐾',
    enExplanation: "Let's explore your pet's fortune! 🐾",
    priority: 21,
  },
  {
    check: isFriendRelationQuestion,
    targetSpread: 'relationship-cross',
    themeId: 'love-relationships',
    reason: '친구 관계 운세',
    koExplanation: '친구 관계의 흐름을 카드로 살펴볼게요! 🤝',
    enExplanation: "Let's explore your friendships! 🤝",
    priority: 22,
  },
  {
    check: isMarriageRelationQuestion,
    targetSpread: 'relationship-cross',
    themeId: 'love-relationships',
    reason: '연애/결혼 운세',
    koExplanation: '연애와 결혼의 흐름을 카드로 살펴볼게요! 💍',
    enExplanation: "Let's explore your love and marriage! 💍",
    priority: 23,
  },
  {
    check: isBeautyFashionQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '외모/패션 운세',
    koExplanation: '외모와 스타일의 방향을 카드로 살펴볼게요! 💄',
    enExplanation: "Let's explore your beauty and style! 💄",
    priority: 24,
  },
  {
    check: isMovingRealEstateQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '이사/부동산 운세',
    koExplanation: '주거와 이사의 흐름을 카드로 살펴볼게요! 🏠',
    enExplanation: "Let's explore your moving fortune! 🏠",
    priority: 25,
  },
  {
    check: isParentCareQuestion,
    targetSpread: 'relationship-cross',
    themeId: 'love-relationships',
    reason: '부모님 관계 운세',
    koExplanation: '부모님과의 관계와 효도의 방향을 카드로 살펴볼게요 👨‍👩‍👧',
    enExplanation: "Let's explore your relationship with your parents 👨‍👩‍👧",
    priority: 26,
  },
  {
    check: isSleepRestQuestion,
    targetSpread: 'healing-path',
    themeId: 'well-being-health',
    reason: '수면/휴식 운세',
    koExplanation: '편안한 휴식과 수면의 방향을 카드로 살펴볼게요 😴',
    enExplanation: "Let's explore your path to restful sleep 😴",
    priority: 27,
  },
  {
    check: isOnlineShoppingQuestion,
    targetSpread: 'financial-snapshot',
    themeId: 'money-finance',
    reason: '쇼핑/구매 운세',
    koExplanation: '쇼핑과 구매 결정의 흐름을 카드로 살펴볼게요 🛒',
    enExplanation: "Let's explore your shopping and purchase decisions 🛒",
    priority: 28,
  },
  {
    check: isRentalLeaseQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '임대/주거 운세',
    koExplanation: '주거와 임대 관련 흐름을 카드로 살펴볼게요 🏠',
    enExplanation: "Let's explore your housing and rental situation 🏠",
    priority: 29,
  },
  {
    check: isPhoneDeviceQuestion,
    targetSpread: 'financial-snapshot',
    themeId: 'money-finance',
    reason: '기기 구매 운세',
    koExplanation: '전자기기 구매와 교체 시기를 카드로 살펴볼게요 📱',
    enExplanation: "Let's explore the timing for your device purchase 📱",
    priority: 30,
  },
  {
    check: isHairAppearanceQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '외모 변화 운세',
    koExplanation: '외모 변화와 이미지 전환을 카드로 살펴볼게요 💇',
    enExplanation: "Let's explore your appearance transformation 💇",
    priority: 31,
  },
  {
    check: isGiftPresentQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '선물 운세',
    koExplanation: '선물 선택과 마음 전달을 카드로 살펴볼게요 🎁',
    enExplanation: "Let's explore the perfect gift choice 🎁",
    priority: 32,
  },
  {
    check: isDietWeightQuestion,
    targetSpread: 'healing-path',
    themeId: 'well-being-health',
    reason: '다이어트/체중관리 운세',
    koExplanation: '건강한 체중 관리와 다이어트 흐름을 카드로 살펴볼게요 💪',
    enExplanation: "Let's explore your weight management journey 💪",
    priority: 33,
  },
  {
    check: isLanguageLearningQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '언어학습 운세',
    koExplanation: '외국어 학습과 실력 향상을 카드로 살펴볼게요 📚',
    enExplanation: "Let's explore your language learning path 📚",
    priority: 34,
  },
  {
    check: isDriverLicenseQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '운전/차량 운세',
    koExplanation: '운전과 차량 관련 흐름을 카드로 살펴볼게요 🚗',
    enExplanation: "Let's explore your driving and vehicle decisions 🚗",
    priority: 35,
  },
  {
    check: isVolunteerCharityQuestion,
    targetSpread: 'past-present-future',
    themeId: 'general-insight',
    reason: '봉사/기부 운세',
    koExplanation: '나눔과 봉사 활동의 방향을 카드로 살펴볼게요 🤝',
    enExplanation: "Let's explore your path to giving back 🤝",
    priority: 36,
  },
  {
    check: isCoupleFightQuestion,
    targetSpread: 'relationship-cross',
    themeId: 'love-relationships',
    reason: '커플 화해 운세',
    koExplanation: '갈등 해결과 화해의 방향을 카드로 살펴볼게요 💕',
    enExplanation: "Let's explore how to reconcile and heal 💕",
    priority: 37,
  },

  // === Priority 99: Yes/No Catch-all (마지막 폴백) ===
  {
    check: isYesNoQuestion,
    targetSpread: 'yes-no-why',
    themeId: 'decisions-crossroads',
    reason: '결정이 필요한 질문',
    koExplanation: '해야 할지 말아야 할지, 카드가 답해드릴게요! 🎴',
    enExplanation: "Should you or shouldn't you? Let the cards answer! 🎴",
    priority: 99,
  },
].sort((a, b) => a.priority - b.priority)

/**
 * 면접/시험 질문 특수 처리용 매핑
 */
export function getExamInterviewMapping(question: string, language: string) {
  if (!isExamInterviewQuestion(question)) {
    return null
  }

  const isInterview = /면접/.test(question)
  const targetSpread = isInterview ? 'interview-result' : 'exam-pass'

  return {
    themeId: 'career-work',
    spreadId: targetSpread,
    reason: isInterview ? '면접 결과 확인' : '시험 합격 확인',
    userFriendlyExplanation:
      language === 'ko'
        ? isInterview
          ? '면접 결과를 카드로 살펴볼게요! 💼'
          : '시험 합격 가능성을 카드로 살펴볼게요! 📝'
        : isInterview
          ? "Let's see your interview outcome! 💼"
          : "Let's see your exam result! 📝",
  }
}
