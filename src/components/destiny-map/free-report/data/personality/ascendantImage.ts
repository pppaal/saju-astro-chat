/**
 * ASC(상승점) 별자리별 외적 이미지 (성격용 짧은 요약).
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const ASCENDANT_IMAGE: Record<ZodiacSign, BilingualText> = {
  aries: { ko: '첫인상이 당당하고 에너지 넘쳐요. 리더처럼 보여요.', en: 'First impression is confident and energetic. Looks like a leader.' },
  taurus: { ko: '첫인상이 안정적이고 신뢰감 있어요. 품격이 느껴져요.', en: 'First impression is stable and trustworthy. Feels classy.' },
  gemini: { ko: '첫인상이 재치 있고 호기심 많아 보여요. 사교적이에요.', en: 'First impression is witty and curious. Social.' },
  cancer: { ko: '첫인상이 따뜻하고 보호적이에요. 친근해 보여요.', en: 'First impression is warm and protective. Looks approachable.' },
  leo: { ko: '첫인상이 화려하고 자신감 넘쳐요. 주목받아요.', en: 'First impression is glamorous and confident. Draws attention.' },
  virgo: { ko: '첫인상이 깔끔하고 분석적이에요. 신중해 보여요.', en: 'First impression is neat and analytical. Looks careful.' },
  libra: { ko: '첫인상이 우아하고 조화로워요. 친절해 보여요.', en: 'First impression is elegant and harmonious. Looks kind.' },
  scorpio: { ko: '첫인상이 강렬하고 신비로워요. 깊이가 느껴져요.', en: 'First impression is intense and mysterious. Feels deep.' },
  sagittarius: { ko: '첫인상이 자유롭고 낙관적이에요. 모험적이에요.', en: 'First impression is free and optimistic. Adventurous.' },
  capricorn: { ko: '첫인상이 진지하고 책임감 있어요. 신뢰할 수 있어요.', en: 'First impression is serious and responsible. Trustworthy.' },
  aquarius: { ko: '첫인상이 독특하고 진보적이에요. 특별해 보여요.', en: 'First impression is unique and progressive. Looks special.' },
  pisces: { ko: '첫인상이 부드럽고 감성적이에요. 예술적이에요.', en: 'First impression is soft and emotional. Artistic.' },
};
