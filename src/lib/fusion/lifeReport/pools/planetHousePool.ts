// src/lib/fusion/lifeReport/pools/planetHousePool.ts
//
// Planet × House domain-agnostic narrative.
//
// Sun / Moon 의 12궁 cross — Big 3 의 house 축. ASC 는 정의상 1궁에
// 위치하므로 sign 만 다루면 충분, 여기선 Sun + Moon 만.
//
// 출처: 점성 정통 (Robert Hand "Horoscope Symbols" + Stephen Forrest
// "Inner Sky"). 각 행성의 핵심 voice (Sun = 자아 표현, Moon = 정서
// 안전) 가 해당 house 의 무대에서 어떻게 펼쳐지는지 한 줄로 압축.
//
// 12 houses × 2 planets = 24 entries. 도메인-agnostic (career/love/
// money/health 어떤 챕터에서든 자연스럽게 사용 가능) — 챕터별 도메인
// flavor 는 호출 측 (love.ts / career.ts 등) 에서 둘러쌈.

type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

const SUN_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '자기 자신을 통째로 드러내는 게 본인다움의 핵심이에요. 무대 위에 서는 결',
  2: '자기 가치와 자원이 자아 표현의 통로예요. 손에 잡히는 결과로 자기를 드러내는 결',
  3: '말과 학습, 짧은 거리의 소통에서 본인다움이 살아나요. 호기심을 따라가는 결',
  4: '뿌리와 가정 안에서 자기 정체성이 단단해져요. 보이지 않는 자리에서 빛나는 결',
  5: '창조·연애·놀이의 자리에서 가장 본인답게 빛나요. 표현이 정체성인 결',
  6: '일상의 노동과 봉사에서 자기를 풀어내요. 디테일을 다듬는 결',
  7: '관계와 파트너십이 정체성의 거울이 돼요. 일대일 만남에서 본인다움이 또렷해지는 결',
  8: '깊은 변화와 공유 자원의 자리에서 자아가 새겨져요. 변혁의 결',
  9: '확장·믿음·먼 여행에서 자기를 발견해요. 큰 그림이 정체성인 결',
  10: '사회 무대와 직업이 자아의 정점이에요. 공적인 자리에서 본인다움이 가장 또렷한 결',
  11: '커뮤니티와 미래 비전 안에서 자기를 풀어내요. 친구와 큰 그룹이 정체성의 거울인 결',
  12: '내면·은둔·영성의 자리에서 자아가 흐려졌다가 깊어져요. 보이지 않는 자리에서 빛나는 결',
}

const MOON_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '감정이 표면에 그대로 드러나요. 본인의 기분이 곧 첫인상이 되는 결',
  2: '자원과 소유 안에서 정서적 안전을 찾아요. 손에 잡히는 것이 마음을 채우는 결',
  3: '대화와 학습이 정서의 안식처예요. 말로 마음을 풀어내는 결',
  4: '뿌리와 가정이 정서의 토대예요. 집과 가족 안에서 마음이 안전해지는 결',
  5: '창조와 놀이로 감정이 풀려요. 표현이 곧 정서 회복인 결',
  6: '일상의 루틴과 돌봄에서 마음의 안정을 찾아요. 작은 일상을 챙기는 결',
  7: '관계 안에서 정서가 비춰져요. 파트너를 통해 자기 마음을 알게 되는 결',
  8: '강렬한 변화·심층 결합에서 정서의 결이 깊어져요. 위기를 통해 마음이 단단해지는 결',
  9: '신념과 큰 그림이 정서의 안식처예요. 여행과 배움에서 마음이 자유로워지는 결',
  10: '사회적 성취와 인정이 정서와 연결돼요. 평판이 마음을 흔드는 결',
  11: '친구와 커뮤니티가 정서의 안전망이에요. 무리 속에서 마음이 채워지는 결',
  12: '고독과 영성에서 정서의 본질을 만나요. 보이지 않는 자리에서 깊어지는 결',
}

const SUN_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Self-expression is most authentic when you put your whole self on display.',
  2: 'Personal resources and tangible values are the channel for self-expression.',
  3: 'You shine through language, learning, and short-distance communication.',
  4: 'Identity hardens inside roots and home, often away from the public eye.',
  5: 'Creativity, romance, and play are where your selfhood radiates most.',
  6: 'You express selfhood through service, daily work, and refining details.',
  7: 'Partnership mirrors identity — selfhood sharpens in one-on-one encounters.',
  8: 'Selfhood is forged in deep transformations and shared resources.',
  9: 'You find yourself through expansion, belief, and long-distance journeys.',
  10: 'The public stage is where your identity peaks — you shine through career and reputation.',
  11: 'Community and future-vision become the canvas for your selfhood.',
  12: 'Selfhood dissolves and deepens in solitude, retreat, and spirit.',
}

const MOON_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Your emotions sit on the surface — feelings become your first impression.',
  2: 'Tangible resources and possessions are how you feel emotionally safe.',
  3: 'Conversation and learning are the safe-house for your feelings.',
  4: 'Home and roots are the bedrock of emotional safety.',
  5: 'You discharge emotion through creativity and play — expression is restoration.',
  6: 'Daily routine and care-taking ground your feelings.',
  7: 'Emotion mirrors through relationships — you discover yourself in a partner.',
  8: 'Intense change and deep merging deepen the texture of your feelings.',
  9: 'Belief and long horizons are emotional refuge — travel and study set you free.',
  10: 'Public achievement and reputation are emotionally entangled.',
  11: 'Friends and community are your emotional safety net.',
  12: 'Solitude and spirit are where your emotional essence lives.',
}

const PLANET_HOUSE_LINES = {
  Sun: { ko: SUN_HOUSE_LINES, en: SUN_HOUSE_LINES_EN },
  Moon: { ko: MOON_HOUSE_LINES, en: MOON_HOUSE_LINES_EN },
} as const

export type PlanetHouseKey = keyof typeof PLANET_HOUSE_LINES

/**
 * One-line bilingual narrative for a planet × house. Empty when planet
 * is unsupported or house is out of range. Domain-agnostic — callers
 * compose their own domain flavor around the returned string.
 *
 * 12 houses × 2 planets × 2 languages = 48 distinct lines.
 */
export function planetHouseLine(
  planet: PlanetHouseKey | string,
  house: number | undefined,
  lang: 'ko' | 'en' = 'ko'
): string {
  if (!house || house < 1 || house > 12) return ''
  const planetData = PLANET_HOUSE_LINES[planet as PlanetHouseKey]
  if (!planetData) return ''
  return planetData[lang][house as HouseNumber] ?? ''
}
