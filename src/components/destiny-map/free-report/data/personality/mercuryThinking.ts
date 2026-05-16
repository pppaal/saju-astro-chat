/**
 * 수성 별자리별 사고방식.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const MERCURY_THINKING: Record<ZodiacSign, BilingualText> = {
  aries: { ko: '빠르고 직관적으로 생각해요. 결정이 빨라요.', en: 'Think fast and intuitively. Quick decisions.' },
  taurus: { ko: '천천히 신중하게 생각해요. 실용적인 결론을 내요.', en: 'Think slowly and carefully. Reach practical conclusions.' },
  gemini: { ko: '다양한 관점으로 생각해요. 호기심이 끝이 없어요.', en: 'Think from various perspectives. Endless curiosity.' },
  cancer: { ko: '감정과 연결된 생각을 해요. 직관이 뛰어나요.', en: 'Think connected to emotions. Excellent intuition.' },
  leo: { ko: '창의적이고 극적으로 생각해요. 큰 그림을 봐요.', en: 'Think creatively and dramatically. See the big picture.' },
  virgo: { ko: '분석적이고 세밀하게 생각해요. 완벽을 추구해요.', en: 'Think analytically and detailed. Pursue perfection.' },
  libra: { ko: '균형 잡힌 시각으로 생각해요. 공정함을 중시해요.', en: 'Think with balanced perspective. Value fairness.' },
  scorpio: { ko: '깊이 파고들며 생각해요. 진실을 찾아요.', en: 'Think by digging deep. Search for truth.' },
  sagittarius: { ko: '넓게 철학적으로 생각해요. 의미를 찾아요.', en: 'Think broadly and philosophically. Search for meaning.' },
  capricorn: { ko: '실용적이고 전략적으로 생각해요. 결과를 중시해요.', en: 'Think practically and strategically. Value results.' },
  aquarius: { ko: '독창적이고 혁신적으로 생각해요. 미래를 봐요.', en: 'Think originally and innovatively. See the future.' },
  pisces: { ko: '상상력 풍부하게 생각해요. 영감이 넘쳐요.', en: 'Think imaginatively. Full of inspiration.' },
};
