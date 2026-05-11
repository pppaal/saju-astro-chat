// src/lib/astrology/asteroidInterpretations.ts
//
// Ceres / Pallas / Juno / Vesta × 12 signs interpretations (KO + EN).
// These four asteroids are the canonical "feminine archetypes" layered
// onto natal interpretation: Ceres=nurture/loss, Pallas=strategy/craft,
// Juno=committed partnership, Vesta=devotion/sacred-flame.

import type { ZodiacName } from './interpretations'

export type AsteroidName = 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'

interface Line {
  ko: string
  en: string
}

const CERES_SIGN: Record<ZodiacName, Line> = {
  Aries: { ko: '돌봄을 직진·즉결로 표현', en: 'Nurtures with directness and fierce protection' },
  Taurus: { ko: '몸·음식·감각으로 돌봄', en: 'Nurtures through body, food, sensory comfort' },
  Gemini: { ko: '말·정보·연결로 돌봄', en: 'Nurtures by talking, sharing information, connecting' },
  Cancer: { ko: '가정·정서·뿌리로 돌봄 (본거지)', en: 'Nurtures via home, emotion, family roots (home sign)' },
  Leo: { ko: '자부심·창조·드라마틱한 표현으로 돌봄', en: 'Nurtures via warm pride, creative expression' },
  Virgo: { ko: '실무·헌신·디테일로 돌봄', en: 'Nurtures through practical service and detail' },
  Libra: { ko: '균형·아름다움·관계 조율로 돌봄', en: 'Nurtures through harmony, beauty, fairness' },
  Scorpio: { ko: '깊이·신뢰·강렬함으로 돌봄', en: 'Nurtures through depth, trust, intense bond' },
  Sagittarius: { ko: '자유·신념·여행으로 돌봄', en: 'Nurtures through freedom, belief, exploration' },
  Capricorn: { ko: '책임·구조·장기 안정으로 돌봄', en: 'Nurtures through responsibility and long-build security' },
  Aquarius: { ko: '독립·비전·공동체로 돌봄', en: 'Nurtures through independence, vision, community' },
  Pisces: { ko: '직관·연민·예술로 돌봄', en: 'Nurtures through intuition, compassion, art' },
}

const PALLAS_SIGN: Record<ZodiacName, Line> = {
  Aries: { ko: '직관적 전술·즉결 전략', en: 'Intuitive tactics, decisive strategy' },
  Taurus: { ko: '꾸준한 빌드·감각적 패턴 인식', en: 'Steady build, sensory pattern recognition' },
  Gemini: { ko: '언어·정보 처리의 천재성', en: 'Genius in language and information patterns' },
  Cancer: { ko: '정서적 직관으로 짜는 전략', en: 'Strategy woven from emotional intuition' },
  Leo: { ko: '창조적 비전을 무기로 쓰는 전략', en: 'Strategy expressed through creative vision' },
  Virgo: { ko: '디테일·완벽 분석의 장인', en: 'Master of detail-perfect analysis' },
  Libra: { ko: '관계·외교·정의의 전략 (전통 강세)', en: 'Strategist of relationship, diplomacy, justice (classical strength)' },
  Scorpio: { ko: '심층 통찰·심리 전략', en: 'Depth-insight, psychological strategy' },
  Sagittarius: { ko: '큰 그림·철학적 전략', en: 'Big-picture, philosophical strategy' },
  Capricorn: { ko: '구조·시스템·장기 게임 전략', en: 'Strategist of structure and long-game' },
  Aquarius: { ko: '시스템·미래 비전 설계 (현대 강세)', en: 'Designer of systems and future vision' },
  Pisces: { ko: '직관·이미지 기반 패턴 인식', en: 'Pattern recognition through intuition and image' },
}

const JUNO_SIGN: Record<ZodiacName, Line> = {
  Aries: { ko: '독립·도전을 인정해주는 파트너 추구', en: 'Seeks a partner who honors independence and challenge' },
  Taurus: { ko: '안정·감각·신뢰의 파트너 추구', en: 'Seeks a steady, sensual, dependable partner' },
  Gemini: { ko: '대화·자극·다재다능한 파트너 추구', en: 'Seeks a conversational, mentally-stimulating partner' },
  Cancer: { ko: '가정·정서 안전을 함께 짓는 파트너 추구', en: 'Seeks a partner who builds home and emotional safety' },
  Leo: { ko: '인정·로맨스·존엄을 함께하는 파트너 추구', en: 'Seeks a romantic, dignifying, recognizing partner' },
  Virgo: { ko: '실무·헌신·일상을 함께 다듬는 파트너 추구', en: 'Seeks a service-oriented, daily-life partner' },
  Libra: { ko: '균형·공정·미적 감각의 파트너 (본거지)', en: 'Seeks a fair, balanced, beautiful partner (home sign)' },
  Scorpio: { ko: '깊이·신뢰·강렬한 합일의 파트너 추구', en: 'Seeks an intense, trust-deep, transformative partner' },
  Sagittarius: { ko: '자유·신념·확장의 파트너 추구', en: 'Seeks a free-spirited, belief-aligned partner' },
  Capricorn: { ko: '책임·장기·구조의 파트너 추구', en: 'Seeks a committed, long-build, structured partner' },
  Aquarius: { ko: '독립·비전·우정 기반 파트너 추구', en: 'Seeks an independent, friendship-based partner' },
  Pisces: { ko: '영혼·연민·예술적 합일의 파트너 추구', en: 'Seeks a soul-merged, compassionate partner' },
}

const VESTA_SIGN: Record<ZodiacName, Line> = {
  Aries: { ko: '자기 의지·개척에 집중적 헌신', en: 'Devotion to independent will and pioneering' },
  Taurus: { ko: '몸·자원·꾸준한 빌드에 집중적 헌신', en: 'Devotion to body, resources, steady build' },
  Gemini: { ko: '학습·정보·소통에 집중적 헌신', en: 'Devotion to learning, information, voice' },
  Cancer: { ko: '가정·정서 회복에 집중적 헌신', en: 'Devotion to home and emotional restoration' },
  Leo: { ko: '창조 표현·존재감에 집중적 헌신', en: 'Devotion to creative expression and presence' },
  Virgo: { ko: '실무·완성·헌신적 봉사 (강세)', en: 'Devotion to craft, perfection, sacred service' },
  Libra: { ko: '관계·균형·아름다움에 집중적 헌신', en: 'Devotion to relationship, balance, beauty' },
  Scorpio: { ko: '심층·변용·신비에 집중적 헌신 (강세)', en: 'Devotion to depth, transformation, mystery' },
  Sagittarius: { ko: '신념·여행·진리에 집중적 헌신', en: 'Devotion to belief, travel, truth' },
  Capricorn: { ko: '구조·책임·장기 사명에 집중적 헌신', en: 'Devotion to structure, responsibility, long mission' },
  Aquarius: { ko: '비전·공동체·미래에 집중적 헌신', en: 'Devotion to vision, community, the future' },
  Pisces: { ko: '연민·영성·예술에 집중적 헌신', en: 'Devotion to compassion, spirit, art' },
}

const TABLES: Record<AsteroidName, Record<ZodiacName, Line>> = {
  Ceres: CERES_SIGN,
  Pallas: PALLAS_SIGN,
  Juno: JUNO_SIGN,
  Vesta: VESTA_SIGN,
}

export function getAsteroidSignInterpretation(
  asteroid: AsteroidName,
  sign: ZodiacName,
  language: 'ko' | 'en' = 'ko'
): string {
  const entry = TABLES[asteroid][sign]
  return language === 'ko' ? entry.ko : entry.en
}

export function getAsteroidThemeKo(asteroid: AsteroidName): string {
  switch (asteroid) {
    case 'Ceres':
      return '돌봄·상실·양육의 패턴'
    case 'Pallas':
      return '전략·지혜·창조적 지능의 패턴'
    case 'Juno':
      return '헌신적 파트너십의 패턴'
    case 'Vesta':
      return '집중적 헌신·신성한 불꽃의 패턴'
  }
}
