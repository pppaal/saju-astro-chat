/**
 * 화성 별자리별 의사결정/행동 스타일.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const MARS_DECISION: Record<ZodiacSign, BilingualText> = {
  aries: { ko: '빠르고 과감하게 결정해요. 주저하지 않고 행동에 옮겨요.', en: 'Decide quickly and boldly. Act without hesitation.' },
  taurus: { ko: '천천히 확실하게 결정해요. 한번 정하면 끝까지 밀고 나가요.', en: 'Decide slowly but surely. Once decided, push through to the end.' },
  gemini: { ko: '여러 옵션을 검토하고 결정해요. 유연하게 계획을 수정해요.', en: 'Review multiple options before deciding. Flexibly modify plans.' },
  cancer: { ko: '직감과 감정을 믿고 결정해요. 가족과 소중한 사람을 고려해요.', en: 'Decide trusting intuition and emotion. Consider family and loved ones.' },
  leo: { ko: '자신감 있게 결정하고 이끌어요. 큰 그림을 보고 행동해요.', en: 'Decide confidently and lead. Act seeing the big picture.' },
  virgo: { ko: '분석하고 계획을 세워 결정해요. 세부사항까지 신경 써요.', en: 'Decide after analyzing and planning. Pay attention to details.' },
  libra: { ko: '균형과 공정함을 고려해 결정해요. 다른 사람 의견도 참고해요.', en: "Decide considering balance and fairness. Reference others' opinions too." },
  scorpio: { ko: '전략적으로 깊이 생각하고 결정해요. 한번 정하면 강력하게 추진해요.', en: 'Decide after strategic deep thinking. Once set, pursue powerfully.' },
  sagittarius: { ko: '낙관적으로 과감하게 결정해요. 모험을 두려워하지 않아요.', en: 'Decide optimistically and boldly. Not afraid of adventure.' },
  capricorn: { ko: '현실적이고 장기적으로 결정해요. 성과와 결과를 중시해요.', en: 'Decide realistically and long-term. Value outcomes and results.' },
  aquarius: { ko: '독창적인 방식으로 결정해요. 기존 방식에 얽매이지 않아요.', en: 'Decide in original ways. Not bound by conventional methods.' },
  pisces: { ko: '직관과 영감을 따라 결정해요. 유연하게 흐름에 맡기기도 해요.', en: 'Decide following intuition and inspiration. Sometimes go with the flow.' },
};
