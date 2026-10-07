// src/lib/report/milestoneHouse.ts
//
// 인생 마디(외행성 회귀·대립)를 *그 사람 차트에서 일어나는 자리*로 개인화한다.
//
// 문제: 마디 뜻풀이가 종류당 한 문장뿐이라 6명 중 6명이 같은 문장을 받았다.
// 실측(6인) 결과 인생총흐름 문장의 48% 가 "누구나 같은 문장" 이었고, 그 절반이
// 이 마디 텍스트였다. 목성 회귀 나이(12·24·36…)나 토성 회귀 나이(29·58)가 모두
// 같은 건 천문 사실이라 맞다 — 그러나 *그 회귀가 어느 하우스에서 일어나는지*는
// 사람마다 다르고, 그게 "무엇이 리셋되는가"를 정한다.
//
// 회귀는 정의상 그 행성이 본명 위치로 돌아오는 것이므로, 일어나는 자리 =
// **본명에서 그 행성이 있는 하우스**. 이미 계산된 natal chart 에서 그대로 읽는다
// (추가 에페메리스 연산 0).

export type Bi = { ko: string; en: string }

/** 마디 종류 → 그 마디의 주체 천체(본명 하우스를 읽을 대상). */
export const MILESTONE_BODY: Record<string, string> = {
  jupiter_return_1: 'Jupiter',
  jupiter_return_2: 'Jupiter',
  jupiter_return_3: 'Jupiter',
  jupiter_return_5: 'Jupiter',
  saturn_return_1: 'Saturn',
  saturn_return_2: 'Saturn',
  uranus_opposition: 'Uranus',
  uranus_return: 'Uranus',
  neptune_square: 'Neptune',
  pluto_square_pluto: 'Pluto',
  chiron_return: 'Chiron',
  progressed_lunar_1: 'Moon',
}

/** 하우스 → 그 마디가 건드리는 삶의 자리(짧은 구). 조합 문장의 뒷절로 쓴다. */
const HOUSE_ARENA: Record<number, Bi> = {
  1: { ko: '나 자신을 어떻게 내보이느냐', en: 'how you present yourself' },
  2: { ko: '돈과 내가 아끼는 것들', en: 'money and what you value' },
  3: { ko: '말·배움·가까운 일상', en: 'talk, learning, and daily life' },
  4: { ko: '집과 가족, 마음의 뿌리', en: 'home, family, and roots' },
  5: { ko: '연애와 즐거움, 만들어내는 것', en: 'romance, play, and what you create' },
  6: { ko: '일상의 리듬과 건강', en: 'daily rhythm and health' },
  7: { ko: '짝과 가까운 관계', en: 'partnership and close ties' },
  8: { ko: '깊은 결합과 함께 쥔 것', en: 'deep bonds and what you hold jointly' },
  9: { ko: '믿음과 넓은 세계', en: 'belief and the wider world' },
  10: { ko: '직업과 세상에서의 자리', en: 'career and public standing' },
  11: { ko: '사람들과 앞날의 그림', en: 'community and the future you picture' },
  12: { ko: '혼자 있는 시간과 안쪽 마음', en: 'solitude and the inner life' },
}

/**
 * 가장 무거운 마디(첫 토성 회귀 ~29세)는 하우스별로 직접 쓴다. 인생에서 한 번뿐인
 * 통과의례라 조합 문장으로 뭉뚱그리기엔 아깝다. 나머지 마디는 아래 compose 폴백.
 */
const MILESTONE_HOUSE: Record<string, Bi> = {
  'saturn_return_1|1': {
    ko: '내가 어떤 사람인지를 처음으로 스스로 정하는 통과의례예요. 남이 붙여준 이름표가 떨어져 나가요.',
    en: 'The rite where you first define who you are yourself — labels others gave you fall away.',
  },
  'saturn_return_1|2': {
    ko: '돈과 자립이 시험대에 올라요. 벌이·씀씀이의 기준을 여기서 다시 세워요.',
    en: 'Money and self-reliance go on trial — you rebuild your standard for earning and spending.',
  },
  'saturn_return_1|3': {
    ko: '말과 배움의 방식이 정리돼요. 가볍게 하던 공부나 관계가 진지해져요.',
    en: 'How you speak and learn gets disciplined — casual study and ties turn serious.',
  },
  'saturn_return_1|4': {
    ko: '집과 가족의 무게를 정면으로 마주해요. 독립하거나, 뿌리를 다시 놓는 시기예요.',
    en: 'You face the weight of home and family — you leave, or you re-lay your roots.',
  },
  'saturn_return_1|5': {
    ko: '연애·창작이 진지해지는 자리예요. 재미로 하던 걸 업으로 삼을지 갈리는 시기예요.',
    en: 'Romance and making things turn serious — what was play decides whether it becomes work.',
  },
  'saturn_return_1|6': {
    ko: '생활 습관과 몸이 대가를 청구해요. 무리하던 방식이 여기서 한 번 멈춰요.',
    en: 'Habits and the body send their bill — the way you were overdoing it stops here.',
  },
  'saturn_return_1|7': {
    ko: '관계가 시험대에 올라요. 결혼하거나 정리하거나 — 어중간한 사이가 정리되는 시기예요.',
    en: 'Relationships go on trial — marry or end it; the in-between ones resolve.',
  },
  'saturn_return_1|8': {
    ko: '함께 쥔 돈·신뢰가 시험받아요. 의존하던 걸 끊고 스스로 서는 법을 배워요.',
    en: 'Shared money and trust get tested — you cut a dependency and learn to stand alone.',
  },
  'saturn_return_1|9': {
    ko: '믿어온 것이 흔들리고 다시 세워져요. 배움이나 먼 곳이 인생 방향을 바꿔요.',
    en: 'What you believed shakes and resets — study or distance redirects your life.',
  },
  'saturn_return_1|10': {
    ko: '직업에서 어른이 되는 통과의례예요. 이때 잡은 자리가 이후 30년의 뼈대가 돼요.',
    en: 'The rite of becoming an adult at work — the position you take here frames the next thirty years.',
  },
  'saturn_return_1|11': {
    ko: '사람 관계가 걸러져요. 어울리던 무리가 정리되고 진짜 동료만 남아요.',
    en: 'Your circle gets filtered — the crowd thins and only real allies remain.',
  },
  'saturn_return_1|12': {
    ko: '혼자 감당하던 것이 드러나요. 미뤄둔 마음을 정면으로 봐야 하는 시기예요.',
    en: 'What you carried alone surfaces — you have to look straight at what you postponed.',
  },
}

/** 본명 차트에서 그 천체가 있는 하우스(1~12). 못 찾으면 null. */
export function natalHouseOf(
  planets: ReadonlyArray<{ name?: string; house?: number }> | undefined,
  bodyName: string
): number | null {
  if (!planets) return null
  const p = planets.find((x) => x?.name === bodyName)
  const h = p?.house
  return typeof h === 'number' && h >= 1 && h <= 12 ? h : null
}

/**
 * 마디 뜻풀이를 그 사람 하우스로 개인화한다.
 *
 * 1) 직접 쓴 조합이 있으면 그걸 쓴다(첫 토성 회귀).
 * 2) 없으면 종류별 일반 뜻 + "특히 …자리에서" 를 붙여 조합한다 — 종류 12 × 하우스
 *    12 = 144 가지가 문자열 24개로 나온다.
 * 3) 하우스를 못 읽으면(시각 미상 등) 원문 그대로 — 날조하지 않는다.
 */
export function personalizeMilestoneMeaning(
  kind: string,
  house: number | null,
  generic: string,
  isKo: boolean
): string {
  if (house == null) return generic
  const exact = MILESTONE_HOUSE[`${kind}|${house}`]
  if (exact) return isKo ? exact.ko : exact.en
  const arena = HOUSE_ARENA[house]
  if (!arena) return generic
  return isKo
    ? `${generic} 특히 ${arena.ko} 쪽에서 또렷해져요.`
    : `${generic} It shows most clearly around ${arena.en}.`
}
