// src/lib/astrology/pofVertexInterpretations.ts
//
// Part of Fortune (PoF) — Arabic Part: Asc + Moon - Sun (day) / Asc + Sun - Moon (night).
// The point where Sun, Moon, and Asc combine; surfaces *natural ease and joy*.
//
// Vertex — auxiliary angle in the western horizon; "fated encounters",
// magnetic pull, life-altering meetings.

import type { ZodiacName } from './interpretations'

interface Line {
  ko: string
  en: string
}

const POF_SIGN: Record<ZodiacName, Line> = {
  Aries: { ko: '용기·개척으로 자연스럽게 운이 풀림', en: 'Luck flows through courage and pioneering' },
  Taurus: { ko: '꾸준함·감각·자원 축적으로 운이 풀림', en: 'Luck flows through steadiness and resource-building' },
  Gemini: { ko: '학습·소통·다재다능으로 운이 풀림', en: 'Luck flows through learning and communication' },
  Cancer: { ko: '가정·정서·뿌리 안에서 운이 풀림', en: 'Luck flows through home, family, emotional roots' },
  Leo: { ko: '표현·창조·자기 빛 내기로 운이 풀림', en: 'Luck flows through creative self-expression' },
  Virgo: { ko: '실무·헌신·디테일로 운이 풀림', en: 'Luck flows through service, craft, refinement' },
  Libra: { ko: '관계·균형·아름다움으로 운이 풀림', en: 'Luck flows through relationship, balance, beauty' },
  Scorpio: { ko: '깊이·변용·심층 신뢰로 운이 풀림', en: 'Luck flows through depth and transformation' },
  Sagittarius: { ko: '신념·여행·확장으로 운이 풀림', en: 'Luck flows through belief, travel, expansion' },
  Capricorn: { ko: '구조·책임·장기 빌드로 운이 풀림', en: 'Luck flows through structure and long-build' },
  Aquarius: { ko: '비전·공동체·혁신으로 운이 풀림', en: 'Luck flows through vision, community, innovation' },
  Pisces: { ko: '직관·예술·연민으로 운이 풀림', en: 'Luck flows through intuition, art, compassion' },
}

const POF_HOUSE: Record<number, Line> = {
  1: { ko: '자아·외모·존재 자체에서 행운의 흐름', en: 'Joy and ease found through identity and presence' },
  2: { ko: '자원·자기가치 영역에서 행운의 흐름', en: 'Joy and ease found in resources and self-worth' },
  3: { ko: '소통·학습·이동 영역에서 행운의 흐름', en: 'Joy and ease found in communication and learning' },
  4: { ko: '가정·뿌리 영역에서 행운의 흐름', en: 'Joy and ease found in home and roots' },
  5: { ko: '창조·연애·놀이 영역에서 행운의 흐름', en: 'Joy and ease found in creativity, romance, play' },
  6: { ko: '일상·건강·실무 영역에서 행운의 흐름', en: 'Joy and ease found in daily routine, health, service' },
  7: { ko: '관계·파트너십 영역에서 행운의 흐름', en: 'Joy and ease found in partnership' },
  8: { ko: '깊이·공유 자원·변용 영역에서 행운의 흐름', en: 'Joy and ease found in intimacy and shared resources' },
  9: { ko: '믿음·여행·고등 학습 영역에서 행운의 흐름', en: 'Joy and ease found in belief, travel, study' },
  10: { ko: '커리어·사회상 영역에서 행운의 흐름', en: 'Joy and ease found in career and public role' },
  11: { ko: '커뮤니티·미래 영역에서 행운의 흐름', en: 'Joy and ease found in community and future vision' },
  12: { ko: '내면·은둔·영성 영역에서 행운의 흐름', en: 'Joy and ease found in the inner, quiet, spiritual realm' },
}

const VERTEX_SIGN: Record<ZodiacName, Line> = {
  Aries: { ko: '운명적 만남이 도전·개척의 결로 옴', en: 'Fated encounters arrive through challenge and initiative' },
  Taurus: { ko: '운명적 만남이 안정·감각의 결로 옴', en: 'Fated encounters arrive through steadiness and sensuality' },
  Gemini: { ko: '운명적 만남이 대화·우연한 만남의 결로 옴', en: 'Fated encounters arrive through chance conversation' },
  Cancer: { ko: '운명적 만남이 가정·정서의 결로 옴', en: 'Fated encounters arrive through home and emotional bonds' },
  Leo: { ko: '운명적 만남이 무대·드라마틱한 결로 옴', en: 'Fated encounters arrive on dramatic, public stages' },
  Virgo: { ko: '운명적 만남이 일상·실무 속에서 옴', en: 'Fated encounters arrive in daily routine and work' },
  Libra: { ko: '운명적 만남이 관계·소개의 결로 옴', en: 'Fated encounters arrive through introductions and partnerships' },
  Scorpio: { ko: '운명적 만남이 강렬·심층 변용의 결로 옴', en: 'Fated encounters arrive through intensity and depth' },
  Sagittarius: { ko: '운명적 만남이 여행·신념의 결로 옴', en: 'Fated encounters arrive through travel and belief' },
  Capricorn: { ko: '운명적 만남이 커리어·구조의 결로 옴', en: 'Fated encounters arrive through career and structure' },
  Aquarius: { ko: '운명적 만남이 공동체·우연한 비전 공유로 옴', en: 'Fated encounters arrive through community and shared vision' },
  Pisces: { ko: '운명적 만남이 예술·영성의 결로 옴', en: 'Fated encounters arrive through art and the spiritual' },
}

export function getPartOfFortuneSignInterpretation(sign: ZodiacName, language: 'ko' | 'en' = 'ko'): string {
  const e = POF_SIGN[sign]
  return language === 'ko' ? e.ko : e.en
}

export function getPartOfFortuneHouseInterpretation(house: number, language: 'ko' | 'en' = 'ko'): string {
  const e = POF_HOUSE[house]
  if (!e) {
    return language === 'ko' ? `${house}하우스에서 행운의 흐름` : `Joy flows in House ${house}`
  }
  return language === 'ko' ? e.ko : e.en
}

export function getVertexSignInterpretation(sign: ZodiacName, language: 'ko' | 'en' = 'ko'): string {
  const e = VERTEX_SIGN[sign]
  return language === 'ko' ? e.ko : e.en
}
