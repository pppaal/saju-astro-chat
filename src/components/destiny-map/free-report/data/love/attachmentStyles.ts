/**
 * 애착 스타일 및 사랑의 언어 데이터
 */

import type { BilingualText } from '../../types/core';

/**
 * 애착 스타일 유형
 */
export type AttachmentStyleType = 'secure' | 'anxious' | 'avoidant' | 'disorganized';

/**
 * 애착 스타일 (달 + 4하우스 기반)
 */
export const ATTACHMENT_STYLES: Record<AttachmentStyleType, BilingualText> = {
  secure: {
    ko: "안정 애착형: 관계에서 편안함을 느끼고, 친밀감과 독립성의 균형을 잘 맞춰요.",
    en: "Secure attachment: Comfortable in relationships, balance intimacy and independence well."
  },
  anxious: {
    ko: "불안 애착형: 사랑받고 싶은 욕구가 강해요. 연락이 늦으면 불안해질 수 있어요.",
    en: "Anxious attachment: Strong desire to be loved. May get anxious when replies are late."
  },
  avoidant: {
    ko: "회피 애착형: 독립성을 중시해요. 너무 가까워지면 부담을 느낄 수 있어요.",
    en: "Avoidant attachment: Value independence. May feel burdened by too much closeness."
  },
  disorganized: {
    ko: "혼란 애착형: 친밀함을 원하면서도 두려워해요. 관계가 복잡해지기 쉬워요.",
    en: "Disorganized attachment: Want intimacy but fear it. Relationships can get complicated."
  },
};

/**
 * 사랑의 언어 유형
 */
export type LoveLanguageType = 'words' | 'time' | 'gifts' | 'service' | 'touch';

/**
 * 사랑의 언어 (금성 + 화성 조합 기반)
 */
export const LOVE_LANGUAGES: Record<LoveLanguageType, BilingualText> = {
  words: {
    ko: "언어 표현형: '사랑해', 칭찬, 격려의 말이 가장 중요해요. 말로 사랑을 주고받아요.",
    en: "Words of Affirmation: 'I love you', compliments, encouragement matter most. Give and receive love through words."
  },
  time: {
    ko: "함께하는 시간형: 같이 있는 시간이 사랑이에요. 함께하는 것 자체가 행복해요.",
    en: "Quality Time: Time together is love. Just being together makes you happy."
  },
  gifts: {
    ko: "선물형: 정성이 담긴 선물로 마음을 표현해요. 작은 것도 기억해서 준비해요.",
    en: "Receiving Gifts: Express heart through thoughtful gifts. Remember small things and prepare them."
  },
  service: {
    ko: "행동 표현형: 도와주고 챙겨주는 것이 사랑이에요. 말보다 행동으로 보여줘요.",
    en: "Acts of Service: Helping and caring is love. Show through actions rather than words."
  },
  touch: {
    ko: "스킨십형: 손잡기, 포옹, 키스... 피부로 닿는 것이 가장 중요해요.",
    en: "Physical Touch: Holding hands, hugging, kissing... Physical contact matters most."
  },
};

/**
 * 갈등 해결 스타일 유형
 */
export type ConflictStyleType = 'direct' | 'diplomatic' | 'withdrawal' | 'passionate';

/**
 * 갈등 해결 스타일 (화성 + 수성 조합)
 */
export const CONFLICT_STYLES: Record<ConflictStyleType, BilingualText> = {
  direct: {
    ko: "직접 대면형: 문제가 생기면 바로 대화해요. 싸우더라도 빨리 해결하고 싶어요.",
    en: "Direct confrontation: Talk immediately when problems arise. Want to resolve quickly even if it means arguing."
  },
  diplomatic: {
    ko: "외교형: 충돌을 피하고 조화를 추구해요. 대화로 타협점을 찾으려 해요.",
    en: "Diplomatic: Avoid conflict and seek harmony. Try to find compromise through discussion."
  },
  withdrawal: {
    ko: "철수형: 갈등이 생기면 거리를 둬요. 혼자 정리할 시간이 필요해요.",
    en: "Withdrawal: Distance yourself when conflict arises. Need time to process alone."
  },
  passionate: {
    ko: "열정형: 감정적으로 표현해요. 화내고 풀고를 반복할 수 있어요.",
    en: "Passionate: Express emotionally. May go through cycles of anger and making up."
  },
};
