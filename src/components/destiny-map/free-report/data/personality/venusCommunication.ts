/**
 * 금성 별자리별 의사소통/관계 스타일.
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const VENUS_COMMUNICATION: Record<ZodiacSign, BilingualText> = {
  aries: { ko: '직접적이고 솔직하게 소통해요. 돌려 말하는 걸 싫어해요.', en: 'Communicate directly and honestly. Dislike beating around the bush.' },
  taurus: { ko: '차분하고 신중하게 대화해요. 진심 어린 표현을 중시해요.', en: 'Talk calmly and thoughtfully. Value sincere expressions.' },
  gemini: { ko: '재치 있고 다양한 화제로 대화해요. 대화의 즐거움을 아는 사람이에요.', en: 'Converse with wit on various topics. Someone who knows the joy of conversation.' },
  cancer: { ko: '공감과 배려가 담긴 대화를 해요. 상대의 감정을 잘 읽어요.', en: "Communicate with empathy and care. Read others' emotions well." },
  leo: { ko: '열정적이고 따뜻하게 소통해요. 칭찬과 격려를 잘 해요.', en: 'Communicate passionately and warmly. Good at praise and encouragement.' },
  virgo: { ko: '정확하고 구체적으로 전달해요. 실질적인 도움을 주려 해요.', en: 'Deliver precisely and specifically. Try to give practical help.' },
  libra: { ko: '조화롭고 우아하게 대화해요. 갈등을 피하고 균형을 추구해요.', en: 'Converse harmoniously and elegantly. Avoid conflict and seek balance.' },
  scorpio: { ko: '깊이 있고 진실한 대화를 원해요. 피상적인 대화는 싫어해요.', en: 'Want deep and truthful conversations. Dislike superficial talk.' },
  sagittarius: { ko: '유머와 철학이 있는 대화를 해요. 열린 마음으로 소통해요.', en: 'Converse with humor and philosophy. Communicate with an open mind.' },
  capricorn: { ko: '신뢰와 실용성을 담아 소통해요. 말에 책임을 져요.', en: 'Communicate with trust and practicality. Take responsibility for words.' },
  aquarius: { ko: '독창적이고 평등한 대화를 추구해요. 다양한 관점을 존중해요.', en: 'Pursue original and equal conversation. Respect diverse viewpoints.' },
  pisces: { ko: '감성적이고 부드럽게 소통해요. 상대의 마음을 이해하려 해요.', en: "Communicate emotionally and gently. Try to understand others' hearts." },
};
