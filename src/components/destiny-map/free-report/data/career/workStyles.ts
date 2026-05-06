/**
 * 업무 스타일 관련 데이터
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

/**
 * 의사결정 스타일 (수성 별자리 기반)
 */
export const DECISION_STYLES: Record<ZodiacSign, BilingualText> = {
  aries: {
    ko: "빠르고 직관적으로 결정해요. 생각보다 행동이 먼저예요.",
    en: "Decide fast and intuitively. Action before thought."
  },
  taurus: {
    ko: "신중하고 천천히 결정해요. 충분한 시간이 필요해요.",
    en: "Decide carefully and slowly. Need enough time."
  },
  gemini: {
    ko: "여러 옵션을 비교해요. 정보 수집 후 결정해요.",
    en: "Compare multiple options. Decide after gathering info."
  },
  cancer: {
    ko: "직감과 감정을 따라 결정해요. 안전을 우선시해요.",
    en: "Decide following intuition and emotion. Safety first."
  },
  leo: {
    ko: "자신감 있게 결정해요. 큰 그림을 보고 선택해요.",
    en: "Decide confidently. Choose seeing the big picture."
  },
  virgo: {
    ko: "분석적으로 결정해요. 디테일까지 확인하고 결정해요.",
    en: "Decide analytically. Check details before deciding."
  },
  libra: {
    ko: "균형을 잡으며 결정해요. 다른 의견도 고려해요.",
    en: "Decide while balancing. Consider other opinions."
  },
  scorpio: {
    ko: "깊이 파고들어 결정해요. 본질을 파악한 후 선택해요.",
    en: "Dig deep to decide. Choose after understanding essence."
  },
  sagittarius: {
    ko: "낙관적으로 결정해요. 가능성을 보고 도전해요.",
    en: "Decide optimistically. Challenge seeing possibilities."
  },
  capricorn: {
    ko: "현실적으로 결정해요. 장기적 결과를 고려해요.",
    en: "Decide realistically. Consider long-term results."
  },
  aquarius: {
    ko: "독창적으로 결정해요. 전통보다 혁신을 선택해요.",
    en: "Decide originally. Choose innovation over tradition."
  },
  pisces: {
    ko: "직관과 영감으로 결정해요. 느낌이 중요해요.",
    en: "Decide by intuition and inspiration. Feeling matters."
  },
};

/**
 * 팀워크 스타일 (달 별자리 기반)
 */
export const TEAMWORK_STYLES: Record<ZodiacSign, BilingualText> = {
  aries: {
    ko: "주도적으로 팀을 이끌어요. 앞에서 끌어가는 타입이에요.",
    en: "Lead the team proactively. Pull from the front."
  },
  taurus: {
    ko: "안정적인 지원군이에요. 꾸준히 역할을 해내요.",
    en: "Stable support. Steadily fulfill your role."
  },
  gemini: {
    ko: "소통의 허브예요. 팀원들을 연결해요.",
    en: "Hub of communication. Connect team members."
  },
  cancer: {
    ko: "팀의 분위기 메이커예요. 정서적 지원을 해요.",
    en: "Team's mood maker. Provide emotional support."
  },
  leo: {
    ko: "팀의 에너지 센터예요. 동기부여를 잘해요.",
    en: "Team's energy center. Good at motivating."
  },
  virgo: {
    ko: "디테일을 챙기는 역할이에요. 실수를 줄여요.",
    en: "Handle details. Reduce mistakes."
  },
  libra: {
    ko: "팀의 조율자예요. 갈등을 중재해요.",
    en: "Team's mediator. Mediate conflicts."
  },
  scorpio: {
    ko: "깊은 집중력으로 핵심을 잡아요. 문제를 해결해요.",
    en: "Capture core with deep focus. Solve problems."
  },
  sagittarius: {
    ko: "팀에 비전을 제시해요. 넓은 시야를 줘요.",
    en: "Present vision to team. Give broad perspective."
  },
  capricorn: {
    ko: "팀의 기둥이에요. 책임감 있게 이끌어요.",
    en: "Team's pillar. Lead responsibly."
  },
  aquarius: {
    ko: "팀에 새로운 아이디어를 줘요. 혁신을 이끌어요.",
    en: "Give new ideas to team. Lead innovation."
  },
  pisces: {
    ko: "팀의 공감 능력자예요. 다른 시각을 제시해요.",
    en: "Team's empath. Present different perspectives."
  },
};
