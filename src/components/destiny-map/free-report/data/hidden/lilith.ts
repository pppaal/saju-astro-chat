/**
 * Lilith(릴리스, 어두운 달) × 별자리 — 억압된 본능/그림자 측면.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const LILITH_SHADOW: Record<ZodiacSign, BilingualText> = {
  aries: { ko: '억눌린 분노와 도전 욕구가 폭발적으로 튀어나올 수 있어요.', en: 'Suppressed anger and challenge impulses may erupt.' },
  taurus: { ko: '소유와 감각 본능에 대한 깊은 갈증이 그림자.', en: 'Deep hunger for possession and sense — your shadow.' },
  gemini: { ko: '말로 다 못 한 진실이 그림자에 쌓여요.', en: 'Truths unsaid pile up in the shadow.' },
  cancer: { ko: '가족·돌봄에 대한 모순된 욕망이 깊이 잠들어 있어요.', en: 'Contradictory desires around family and caring sleep deep.' },
  leo: { ko: '인정받고 싶은 깊은 욕망이 그림자로 작용해요.', en: 'Deep desire for recognition operates as shadow.' },
  virgo: { ko: '완벽해야 한다는 강박이 자기 학대로 이어져요.', en: 'Perfectionism compulsion leads to self-abuse.' },
  libra: { ko: '공정함 뒤에 분노가 숨어 있어요.', en: 'Anger hides behind fairness.' },
  scorpio: { ko: '본진 — 본능과 권력에 대한 가장 깊은 그림자.', en: 'Home turf — deepest shadow on instinct and power.' },
  sagittarius: { ko: '자유에 대한 강박이 책임 회피로 변해요.', en: 'Compulsion for freedom turns into avoidance of duty.' },
  capricorn: { ko: '권력과 통제 욕구가 그림자에 깊어요.', en: 'Power and control needs run deep in shadow.' },
  aquarius: { ko: '집단 거부와 우월감이 그림자.', en: 'Group-rejection and superiority are shadow.' },
  pisces: { ko: '경계 없는 동화와 도피가 그림자.', en: 'Boundless merging and escape are shadow.' },
};
