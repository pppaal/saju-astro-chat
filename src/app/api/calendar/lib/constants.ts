/**
 * Calendar message constants
 */

import type { EventCategory } from "@/lib/destiny-map/destinyCalendar";

type CategoryMessages = Record<EventCategory | 'general', string>;

/**
 * Korean message templates for different grades
 */
export const KO_MESSAGES = {
  GRADE_0: {
    career: "🌟 인생을 바꿀 계약, 사업 시작에 완벽한 날!",
    wealth: "💎 대박 재물운! 중요한 투자/계약 강력 추천!",
    love: "💍 프로포즈, 결혼 결정에 최고의 날!",
    health: "✨ 에너지 폭발! 새로운 도전을 시작하세요!",
    travel: "🌈 인생 여행 떠나기 완벽한 날!",
    study: "🏆 합격운 최고! 시험, 면접에 행운이!",
    general: "✨ 천운이 함께하는 특별한 날!"
  } as CategoryMessages,

  GRADE_1: {
    career: "💼 계약, 협상, 중요한 결정에 최적의 날!",
    wealth: "💰 재물운 최고! 투자, 쇼핑에 좋아요!",
    love: "💕 연애운 폭발! 고백, 데이트 적극 추천!",
    health: "💪 활력 넘치는 날! 새 운동 시작해보세요!",
    travel: "✈️ 여행운 최고! 출발하기 좋은 날!",
    study: "📚 집중력 UP! 시험, 공부에 유리해요!",
    general: "⭐ 모든 일이 잘 풀리는 최고의 날!"
  } as CategoryMessages,

  GRADE_2_HIGH: {
    career: "📋 업무가 순조롭게 진행되는 날",
    wealth: "💵 작은 행운이 찾아올 수 있어요",
    love: "☕ 편안한 만남에 좋은 날",
    health: "🌿 가벼운 산책이나 휴식 추천",
    travel: "🚶 가까운 곳 나들이에 좋아요",
    study: "📖 꾸준한 학습이 성과를 내요",
    general: "🌤️ 평온하게 흘러가는 괜찮은 날"
  } as CategoryMessages,

  GRADE_2_LOW: "🌥️ 평범한 하루, 무리하지 마세요",

  GRADE_3: {
    career: "⚠️ 업무에 장애물이 있을 수 있어요. 신중하게!",
    wealth: "💸 지출에 주의하세요. 큰 거래는 미루세요.",
    love: "💔 오해가 생기기 쉬워요. 대화 조심!",
    health: "🏥 컨디션이 저하될 수 있어요. 휴식 필요!",
    travel: "🚫 이동 시 주의하세요. 계획 변경 가능성!",
    study: "😓 집중이 어려울 수 있어요. 무리하지 마세요.",
    general: "🌧️ 기운이 약한 날입니다. 조용히 보내세요."
  } as CategoryMessages,

  GRADE_4: {
    career: "🚨 중요한 결정은 반드시 미루세요!",
    wealth: "💀 큰 지출/투자는 절대 금지!",
    love: "🖤 감정적 결정은 후회할 수 있어요!",
    health: "🆘 무리한 활동은 삼가고 건강 관리!",
    travel: "☠️ 장거리 이동은 피하세요!",
    study: "🔴 시험/면접은 다른 날로 미루세요!",
    general: "⛈️ 최악의 날! 모든 중요한 일을 피하세요!"
  } as CategoryMessages,

  GRADE_5: {
    career: "🚨 모든 중요한 일정을 연기하세요!",
    wealth: "💀 절대 투자/계약 금지!",
    love: "🖤 감정적 결정은 후회할 수 있어요",
    health: "🆘 건강 관리에 특히 주의하세요",
    travel: "☠️ 장거리 이동은 피하세요!",
    study: "🔴 시험/면접은 다른 날로!",
    general: "⛈️ 최악의 날, 모든 것을 조심하세요!"
  } as CategoryMessages,
} as const;

/**
 * English message templates for different grades
 */
export const EN_MESSAGES = {
  GRADE_0: {
    career: "🌟 Perfect day for life-changing contracts!",
    wealth: "💎 Amazing fortune! Big investments highly recommended!",
    love: "💍 Best day for proposals and wedding decisions!",
    health: "✨ Energy explosion! Start new challenges!",
    travel: "🌈 Perfect day for a journey of a lifetime!",
    study: "🏆 Best luck for exams and interviews!",
    general: "✨ A special day blessed by heaven!"
  } as CategoryMessages,

  GRADE_1: {
    career: "💼 Best day for contracts and decisions!",
    wealth: "💰 Great wealth luck! Good for investments!",
    love: "💕 Romance luck high! Perfect for dates!",
    health: "💪 Full of energy! Start something new!",
    travel: "✈️ Excellent travel luck! Go for it!",
    study: "📚 Focus is sharp! Great for exams!",
    general: "⭐ Everything flows smoothly today!"
  } as CategoryMessages,

  GRADE_2_HIGH: "🌤️ A good day with positive energy",
  GRADE_2_LOW: "🌥️ An ordinary day, take it easy",
  GRADE_3: "⚠️ Low energy day. Be cautious and avoid stress.",
  GRADE_4: "🚨 Bad day! Avoid all major decisions!",
  GRADE_5: "⛈️ Worst day! Postpone all important matters!",
} as const;
