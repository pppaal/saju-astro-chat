// src/lib/fusion/lifeReport/pools/planetHousePool.ts
//
// Planet × House domain-agnostic narrative.
//
// Sun / Moon / Mercury / Venus / Mars 의 12궁 cross. ASC 는 정의상
// 1궁에 위치하므로 sign 만 다루면 충분, 여기선 5 planets.
//
// 출처: 점성 정통 (Robert Hand "Horoscope Symbols" + Stephen Forrest
// "Inner Sky"). 각 행성의 핵심 voice (Sun = 자아 표현, Moon = 정서
// 안전, Mercury = 사고, Venus = 끌림·미감, Mars = 행동·욕망) 가
// 해당 house 의 무대에서 어떻게 펼쳐지는지 한 줄로 압축.
//
// 12 houses × 5 planets × 2 languages = 120 entries.
// 도메인-agnostic — career/love/money/health 어떤 챕터에서든 자연
// 합성. 챕터별 도메인 flavor 는 호출 측에서 둘러쌈.

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

// Mercury × house — 사고·말이 어디 무대에서 펼쳐지는지
const MERCURY_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '말과 사고가 정체성 자체로 드러나는 결',
  2: '실용적 사고가 자원의 흐름을 만드는 결',
  3: '소통과 짧은 학습이 본인의 핵심 결',
  4: '가정·뿌리 안에서 사고가 차분히 다듬어지는 결',
  5: '창의적 표현과 즐거운 학습이 사고의 결',
  6: '일상의 분석·관리에서 명민함이 빛나는 결',
  7: '대화와 협력 안에서 사고가 정리되는 결',
  8: '심층 연구·심리·재무 분석이 본인다움인 결',
  9: '큰 그림·철학·국제 시야가 사고의 결',
  10: '공적 자리에서 말과 사고가 평판이 되는 결',
  11: '네트워크와 미래 비전 안에서 아이디어가 풀리는 결',
  12: '내면 사유와 명상에서 깊은 통찰이 열리는 결',
}

const MERCURY_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Speech and thinking are part of your identity itself.',
  2: 'Practical thinking shapes how resources flow.',
  3: 'Communication and short-form learning are core to you.',
  4: 'Inside home and roots, thinking quietly refines itself.',
  5: 'Creative expression and joyful learning carry your thought.',
  6: 'Sharp analysis shines in daily management and service.',
  7: 'Thinking organises itself through dialogue and partnership.',
  8: 'Depth research, psychology and finance are most authentic for your mind.',
  9: 'Big picture, philosophy, and international scope drive your thinking.',
  10: 'On the public stage, your speech and thought become reputation.',
  11: 'Networks and future-vision unlock your ideas.',
  12: 'Inner reflection and meditation open the deepest insight.',
}

// Venus × house — 끌림·미감이 어디 무대에서 펼쳐지는지
const VENUS_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '매력이 첫인상으로 그대로 드러나는 결',
  2: '소유와 감각이 미감의 토대인 결',
  3: '대화와 학습 안에서 끌림이 시작되는 결',
  4: '가정·뿌리가 미감과 안식의 자리인 결',
  5: '창조와 연애가 미감의 정점인 결',
  6: '일상 챙김과 작은 봉사 안에서 사랑이 풀리는 결',
  7: '관계와 파트너십이 정체성의 거울인 결',
  8: '깊은 결합과 공유 자원에서 가치가 만들어지는 결',
  9: '먼 곳·다른 문화 안에서 사랑이 깨어나는 결',
  10: '공적 자리에서 매력과 미감이 자산이 되는 결',
  11: '커뮤니티와 친구가 사랑의 통로인 결',
  12: '내면·은둔 안에서 깊은 사랑이 자라는 결',
}

const VENUS_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'Magnetism radiates through first impression itself.',
  2: 'Possessions and the senses are the bedrock of beauty.',
  3: 'Attraction begins through dialogue and learning.',
  4: 'Home and roots are the chamber of beauty and rest.',
  5: 'Creation and romance are where beauty peaks.',
  6: 'Love unfolds through daily care and small service.',
  7: 'Partnership mirrors identity — love is the central relationship.',
  8: 'Deep merging and shared resources are where value is forged.',
  9: 'Love awakens in distant places and other cultures.',
  10: 'In public, charm and beauty become an asset.',
  11: 'Community and friends are the channel of love.',
  12: 'Inside solitude and retreat, the deepest love grows.',
}

// Mars × house — 행동·욕망이 어디 무대에서 펼쳐지는지
const MARS_HOUSE_LINES: Record<HouseNumber, string> = {
  1: '자기 자신을 던지는 게 행동의 결인 사람',
  2: '자원·소유를 쌓는 행동에서 욕망이 풀리는 결',
  3: '말과 학습을 추진하는 자리에서 본인다움',
  4: '가정·뿌리를 지키는 행동이 욕망의 결',
  5: '창조·연애의 자리에서 욕망이 폭발하는 결',
  6: '일상 노동·운동·반복 작업에서 추진력이 풀리는 결',
  7: '관계와 파트너십 안에서 욕망이 비춰지는 결',
  8: '심층 변화·공유 자원·위기에서 추진력이 풀리는 결',
  9: '여행·확장·학문 추진에서 본인다움이 살아나는 결',
  10: '공적 자리·커리어 추진에서 욕망이 가장 또렷한 결',
  11: '커뮤니티·미래 비전을 위한 행동이 본인의 결',
  12: '뒤에서·내면에서 조용히 행동하는 결, 보이지 않는 추진',
}

const MARS_HOUSE_LINES_EN: Record<HouseNumber, string> = {
  1: 'You act by throwing your whole self in.',
  2: 'Desire unfolds through building resources and possessions.',
  3: 'You shine when pushing speech and learning forward.',
  4: 'Protecting home and roots is the grain of desire.',
  5: 'Creation and romance are where desire bursts open.',
  6: 'Drive unfolds in daily work, exercise, and repetition.',
  7: 'Desire mirrors in partnership and one-on-one engagement.',
  8: 'Drive activates in deep change, shared resources, and crisis.',
  9: 'Travel, expansion, and study are where authenticity comes alive.',
  10: 'On the public stage, desire becomes most distinct.',
  11: 'Action toward community and future-vision is your grain.',
  12: 'You act quietly from behind — an unseen drive.',
}

const PLANET_HOUSE_LINES = {
  Sun: { ko: SUN_HOUSE_LINES, en: SUN_HOUSE_LINES_EN },
  Moon: { ko: MOON_HOUSE_LINES, en: MOON_HOUSE_LINES_EN },
  Mercury: { ko: MERCURY_HOUSE_LINES, en: MERCURY_HOUSE_LINES_EN },
  Venus: { ko: VENUS_HOUSE_LINES, en: VENUS_HOUSE_LINES_EN },
  Mars: { ko: MARS_HOUSE_LINES, en: MARS_HOUSE_LINES_EN },
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
