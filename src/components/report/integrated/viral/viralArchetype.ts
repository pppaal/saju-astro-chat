/**
 * 바이럴 "한 장 요약" 콘텐츠 — 무료 리포트 맨 위에서 "헐 완전 나야"를 만드는 카피.
 * 결정론 원칙: 모두 명식에서 도출(일간 10간 별명 / 용신 5오행 궁합)되는 고정 사전.
 * 한자·전문용어 없이 평어로. ko/en 짝. IntegratedReport 의 ViralTopCard 가 소비.
 */
import type { BiLabel } from '../reportTypes'

export interface Archetype {
  emoji: string
  /** 유형 별명 — MBTI "건축가"처럼 스크린샷에 박히는 한 줄 이름. */
  name: BiLabel
  /** 소름 한 줄 — 살짝 띄워주는 정곡. "이거 완전 나" 유발. */
  oneLiner: BiLabel
}

// 일간(천간 10간) → 유형. 한자(甲乙…)·한글(갑을…) 둘 다 키로 받게 정규화는 호출부에서.
export const ARCHETYPE_BY_STEM: Record<string, Archetype> = {
  甲: {
    emoji: '🌳',
    name: { ko: '뻗어나가는 개척자', en: 'The Trailblazer' },
    oneLiner: {
      ko: '한번 정한 방향으로 끝까지 밀고 나가는, 타고난 리더예요.',
      en: 'A born leader — you pick a direction and push it all the way through.',
    },
  },
  乙: {
    emoji: '🌿',
    name: { ko: '유연한 생존가', en: 'The Adapter' },
    oneLiner: {
      ko: '부드러워 보여도 어떤 환경에서든 기어이 살아남는 끈기의 사람이에요.',
      en: 'Soft on the surface, but you bend without breaking and survive any environment.',
    },
  },
  丙: {
    emoji: '☀️',
    name: { ko: '빛나는 분위기메이커', en: 'The Radiator' },
    oneLiner: {
      ko: '있으면 그 자리가 환해지는, 사람을 끌어당기는 에너지가 있어요.',
      en: 'You light up the room — people are drawn to your warmth and energy.',
    },
  },
  丁: {
    emoji: '🕯️',
    name: { ko: '깊게 집중하는 장인', en: 'The Focused Maker' },
    oneLiner: {
      ko: '겉은 조용해도 한 가지에 깊이 파고드는 집중력이 진짜 무기예요.',
      en: 'Quiet outside, but your real weapon is burning deep focus on one thing.',
    },
  },
  戊: {
    emoji: '⛰️',
    name: { ko: '흔들림 없는 버팀목', en: 'The Anchor' },
    oneLiner: {
      ko: '주변이 흔들릴 때 모두가 기대는, 듬직한 중심이 되는 사람이에요.',
      en: 'When everything shakes, you are the steady center everyone leans on.',
    },
  },
  己: {
    emoji: '🌾',
    name: { ko: '묵묵히 키워내는 사람', en: 'The Cultivator' },
    oneLiner: {
      ko: '티 안 나게 챙기고 키워서, 결국 단단한 결실을 만들어내요.',
      en: 'You nurture quietly behind the scenes and end up growing something solid.',
    },
  },
  庚: {
    emoji: '⚔️',
    name: { ko: '결단의 승부사', en: 'The Decider' },
    oneLiner: {
      ko: '결정적 순간엔 누구보다 과감한, 의리 있고 추진력 강한 사람이에요.',
      en: 'In the decisive moment you act bolder than anyone — loyal and driven.',
    },
  },
  辛: {
    emoji: '💎',
    name: { ko: '예리한 완벽주의자', en: 'The Perfectionist' },
    oneLiner: {
      ko: '디테일 하나도 놓치지 않는, 예리하고 빛나는 감각의 소유자예요.',
      en: 'You miss no detail — sharp, refined, and quietly brilliant.',
    },
  },
  壬: {
    emoji: '🌊',
    name: { ko: '거침없는 자유인', en: 'The Free Current' },
    oneLiner: {
      ko: '틀에 갇히지 않고 넓게 흐르는, 자유롭고 지혜로운 사람이에요.',
      en: 'You flow wide and refuse to be boxed in — free-spirited and wise.',
    },
  },
  癸: {
    emoji: '💧',
    name: { ko: '깊이 느끼는 직관가', en: 'The Quiet Seer' },
    oneLiner: {
      ko: '겉은 잔잔한데 속은 누구보다 깊이 느끼고 꿰뚫어 보는 사람이에요.',
      en: 'Calm on the surface, but you feel and see deeper than anyone — quietly intuitive.',
    },
  },
}

// 용신(가장 필요한 기운) 오행 → "이런 사람과 잘 맞아요" 궁합 한 줄. 친구·연인 태그 유발.
export const PARTNER_BY_ELEMENT: Record<string, BiLabel> = {
  wood: {
    ko: '꾸준히 성장하고 따뜻하게 이끌어주는 사람',
    en: 'someone who grows steadily and leads you with warmth',
  },
  fire: {
    ko: '밝고 적극적이고 표현이 풍부한 사람',
    en: 'someone bright, outgoing, and expressive',
  },
  earth: {
    ko: '듬직하고 믿음직해서 안정감을 주는 사람',
    en: 'someone steady and dependable who makes you feel safe',
  },
  metal: {
    ko: '결단력 있고 깔끔하게 정리해주는 사람',
    en: 'someone decisive who brings clarity and order',
  },
  water: {
    ko: '지혜롭고 유연하게 받아주는 사람',
    en: 'someone wise and flexible who flows with you',
  },
}

// 신강·신약(일간 강약) → 유형의 "결" 보조축. 같은 일간이라도 강약에 따라
// 표현 방식이 달라 — 헤드라인을 10종(일간)에서 30종(일간×강약)으로 넓힌다.
// 용신(부족·보강)이 아니라 강약을 쓰는 이유: 강약은 "어떤 사람인가"(정체)에
// 직결되지만 용신은 "무엇이 필요한가"라 정체 라벨엔 덜 맞는다.
export type StrengthState = 'strong' | 'weak' | 'balanced'

export const STRENGTH_TAG: Record<StrengthState, BiLabel> = {
  strong: { ko: '주도형', en: 'Driven' },
  weak: { ko: '조율형', en: 'Adaptive' },
  balanced: { ko: '균형형', en: 'Balanced' },
}

// oneLiner 뒤에 붙는 강약별 한 문장 — 같은 유형도 결이 달라지게.
const STRENGTH_FLAVOR: Record<StrengthState, BiLabel> = {
  strong: {
    ko: '스스로 밀고 나가는 힘이 강해, 방향만 정하면 끝까지 가는 편이에요.',
    en: 'Your inner drive runs strong — once you set a direction, you carry it all the way.',
  },
  weak: {
    ko: '혼자 밀어붙이기보다 좋은 사람·환경과 어우러질 때 더 크게 빛나는 결이에요.',
    en: 'You shine brightest in sync with the right people and surroundings, not going it alone.',
  },
  balanced: {
    ko: '치우치지 않고 상황 따라 강약을 조절하는 균형이 강점이에요.',
    en: 'Your strength is balance — you adjust your intensity to fit the moment.',
  },
}

// 강약 라벨 정규화 — 데이터는 한글('신강'/'신약'/'')인데 일부 코드가 영문을
// 기대해 늘 '중화'로 새던 버그가 있었다. 양쪽 표기를 모두 받는다.
export function normalizeStrength(raw: string | null | undefined): StrengthState {
  if (raw === 'strong' || raw === '신강') return 'strong'
  if (raw === 'weak' || raw === '신약') return 'weak'
  return 'balanced'
}

const STEM_KO_TO_HAN: Record<string, string> = {
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
}

/** 일간 글자(한자 甲 또는 한글 갑)로 유형을 찾는다. 매칭 없으면 null. */
export function getArchetype(dayMaster: string): Archetype | null {
  const key = ARCHETYPE_BY_STEM[dayMaster] ? dayMaster : STEM_KO_TO_HAN[dayMaster]
  return key ? (ARCHETYPE_BY_STEM[key] ?? null) : null
}

// 헤드라인 합성에 쓸 수 있는 십성 10종(정재·상관 등). count 키·라벨이 이 집합.
const SIBSIN_NAMES = [
  '비견',
  '겁재',
  '식신',
  '상관',
  '편재',
  '정재',
  '편관',
  '정관',
  '편인',
  '정인',
] as const

/**
 * 헤드라인용 "주도 십성" 선택 — 바이럴 한 줄이 "완전 나"가 되려면 그 사람의
 * *정체*를 대표하는 십성이어야 한다. 일지(배우자궁) 십성은 관계 자리라 정체
 * 라벨엔 맞지 않으므로(C1), 명식 전체 십성 개수(count)의 최빈값을 쓴다.
 *   - count 최빈값이 2 이상이면 그것(정체를 지배하는 십성).
 *   - 동률이면 월간(월령 근접, 격국의 자리) 십성을 우선한다.
 *   - 지배(≥2)가 없으면(고른 명식) 월간 → 일지 십성 순으로 폴백.
 * 순수 함수 — 카운트 없으면(구데이터) 폴백만으로 동작, 매칭 없으면 null.
 */
export function pickHeadlineSibsin(
  count: Record<string, number> | null | undefined,
  monthStemSibsin?: string | null,
  dayBranchSibsin?: string | null
): string | null {
  if (count) {
    let best: string | null = null
    let bestN = 0
    for (const n of SIBSIN_NAMES) {
      const c = count[n] ?? 0
      if (c > bestN || (c === bestN && c > 0 && n === monthStemSibsin)) {
        bestN = c
        best = n
      }
    }
    if (best && bestN >= 2) return best
  }
  if (monthStemSibsin && (SIBSIN_NAMES as readonly string[]).includes(monthStemSibsin)) {
    return monthStemSibsin
  }
  if (dayBranchSibsin && (SIBSIN_NAMES as readonly string[]).includes(dayBranchSibsin)) {
    return dayBranchSibsin
  }
  return null
}

// ── 차트 합성 헤드라인 ─────────────────────────────────────────────────────
// "완전 나"는 버킷 라벨이 아니라 그 사람만의 디테일에서 온다. 일간 archetype 을
// 그 사람의 지배 십성(domSibsin)으로 합성해 헤드라인을 차트별로 가른다:
//   name      = [십성 수식] + [일간 역할 명사]   (예: 판을 뒤집는 개척자)
//   oneLiner  = [십성 결 한 줄] + [강약 결]
//   edgeLine  = [십성 그림자 한 줄] — tension 이 있을 때만(없는 친화 차트엔 억지 X)

// 일간 → 짧은 역할 명사(수식어가 앞에 붙어도 자연스럽게).
const STEM_CORE: Record<string, BiLabel> = {
  甲: { ko: '개척자', en: 'Trailblazer' },
  乙: { ko: '생존가', en: 'Survivor' },
  丙: { ko: '분위기메이커', en: 'Spark' },
  丁: { ko: '장인', en: 'Craftsman' },
  戊: { ko: '버팀목', en: 'Anchor' },
  己: { ko: '살림꾼', en: 'Cultivator' },
  庚: { ko: '승부사', en: 'Closer' },
  辛: { ko: '완벽주의자', en: 'Perfectionist' },
  壬: { ko: '자유인', en: 'Free Spirit' },
  癸: { ko: '직관가', en: 'Seer' },
}

// 지배 십성 → 이름 수식어.
const SIBSIN_MODIFIER: Record<string, BiLabel> = {
  비견: { ko: '나란히 가는', en: 'shoulder-to-shoulder' },
  겁재: { ko: '지지 않는', en: 'never-backing-down' },
  식신: { ko: '여유로운', en: 'easygoing' },
  상관: { ko: '판을 뒤집는', en: 'rule-bending' },
  편재: { ko: '크게 굴리는', en: 'big-swinging' },
  정재: { ko: '착실히 쌓는', en: 'steady-building' },
  편관: { ko: '밀어붙이는', en: 'hard-charging' },
  정관: { ko: '반듯한', en: 'straight-arrow' },
  편인: { ko: '촉이 좋은', en: 'sharp-instinct' },
  정인: { ko: '받쳐주는', en: 'steadying' },
}

// 지배 십성 → oneLiner 결 한 줄.
const SIBSIN_LINE: Record<string, BiLabel> = {
  비견: {
    ko: '남이랑 겨루기보다 나란히 같이 가는 걸 좋아하는 사람이에요.',
    en: "You'd rather move shoulder-to-shoulder with people than compete against them.",
  },
  겁재: {
    ko: '은근한 승부욕으로, 곁에 자극이 있을 때 더 잘하는 타입이에요.',
    en: "A quiet competitive streak — you sharpen up when there's someone to measure against.",
  },
  식신: {
    ko: '좋아하는 걸 편하게 즐기고 표현하는, 결이 부드러운 사람이에요.',
    en: 'You enjoy and express what you love at ease — a soft, unforced grain.',
  },
  상관: {
    ko: '정해진 답보다 내 식대로 새로 짜는 게 빠른, 재기 넘치는 사람이에요.',
    en: "You'd rather redo it your own way than follow the set answer — quick and inventive.",
  },
  편재: {
    ko: '기회를 크게 보고 사람·판을 시원하게 굴리는 스케일 큰 사람이에요.',
    en: 'You see opportunity big and move people and resources with an open hand.',
  },
  정재: {
    ko: '큰소리보다 손에 잡히는 결과로 착실하게 증명하는 사람이에요.',
    en: 'You prove yourself with tangible results, not big talk — steady and real.',
  },
  편관: {
    ko: '위기일수록 앞장서서 밀어붙이는 추진력의 사람이에요.',
    en: 'The harder it gets, the more you step up and push — sheer drive.',
  },
  정관: {
    ko: '원칙과 책임을 지키며 신뢰를 쌓는 반듯한 사람이에요.',
    en: 'You keep your principles and carry your weight, building trust by being solid.',
  },
  편인: {
    ko: '남이 못 보는 결을 먼저 읽는, 촉과 깊이가 있는 사람이에요.',
    en: 'You read what others miss first — instinct and depth.',
  },
  정인: {
    ko: '배우고 품어서 곁을 든든하게 받쳐주는 사람이에요.',
    en: 'You learn and hold space, steadying the people around you.',
  },
}

// 지배 십성 → "콕 집는" 그림자 한 줄(살짝 불편하게 정확한 말). tension 있을 때만.
const SIBSIN_EDGE: Record<string, BiLabel> = {
  비견: { ko: '근데 내 영역 침범당하는 건 못 참죠.', en: "But don't step into your turf." },
  겁재: { ko: '사실 지는 거, 진짜 싫어하죠.', en: 'Truth is, you hate losing.' },
  식신: {
    ko: '편한 게 좋아서 가끔 미루는 거, 본인도 알죠.',
    en: 'You know you put things off when it gets too cozy.',
  },
  상관: {
    ko: '하고 싶은 말, 결국 다 해버리고 마는 편이고요.',
    en: 'And you usually end up saying the thing out loud.',
  },
  편재: {
    ko: '벌이는 건 잘하는데 마무리에서 새는 거 있죠.',
    en: 'Great at starting big — it leaks at the finish.',
  },
  정재: {
    ko: '내 사람 아니면, 정 잘 안 주는 편이죠.',
    en: "If you're not 'mine,' you stay guarded.",
  },
  편관: {
    ko: '스스로를 너무 몰아붙이는 게 문제고요.',
    en: 'The catch is how hard you push yourself.',
  },
  정관: {
    ko: '틀에서 벗어나는 걸 은근 불편해하죠.',
    en: 'Coloring outside the lines quietly unsettles you.',
  },
  편인: { ko: '생각이 많아 시작이 자꾸 늦어지죠.', en: 'You overthink, so starting drags.' },
  정인: { ko: '남 챙기다 정작 내 걸 놓치는 편이고요.', en: 'You mind others and drop your own.' },
}

// ── 화면/공유 카드가 함께 쓰는 언어-해석 완료 요약 ──────────────────────────
export interface ViralSummary {
  emoji: string
  name: string
  /** 강약 기반 결 라벨(주도형/조율형/균형형) — 헤드라인 칩. */
  subtype: string
  oneLiner: string
  /** "콕 집는" 그림자 한 줄 — 지배 십성 × tension. 없으면 null. */
  edgeLine: string | null
  /** 겉모습(상승궁) 한 줄 — 이미 lang 해석됨. 없으면 null. */
  outer: string | null
  /** 강점 → 해시태그(최대 3). */
  hashtags: string[]
  /** 동·서양이 둘 다 가리키는 주제(최대 3) — 우리만의 신뢰 훅. */
  resonant: string[]
  /** 궁합 한 줄(용신 기반) — 이미 lang 해석됨. 없으면 null. */
  partner: string | null
  /** 일주(60갑자) 캐릭터 별명 구절 — 십성×강약(30조합)만으로는 친구끼리 카드
   *  문장이 겹쳐서, 60-way 축을 더해 사실상 충돌을 없앤다. 없으면 null. */
  iljuLine: string | null
  /** 동·서양이 실제로 엇갈린 지점 — 교차 tension 행의 서술자 쌍("금 · 예리하고
   *  결단하는" ⚡ "공기 · 퍼뜨리고 연결하는"). 둘 다 진짜 나라는 현실 모순 훅. */
  clash: { category: string; saju: string; astro: string } | null
}

/** 명식에서 뽑은 1차 값으로 바이럴 요약을 합성. 순수 함수(테스트 가능). */
export function buildViralSummary(input: {
  dayMaster: string
  ascTrait?: string | null
  strengths: string[]
  resonant: string[]
  yongsinElement?: string | null
  /** 일간 강약 — 'strong' | 'weak' | (그 외=중화). 헤드라인 결(subtype)을 가른다. */
  strength?: string | null
  /** 지배 십성(예: '상관','정재') — 헤드라인을 차트별로 합성하는 핵심 축. */
  dominantSibsin?: string | null
  /** 차트에 마찰(tension) 신호가 있나 — 있을 때만 "콕 집는" 그림자 한 줄을 노출. */
  hasTension?: boolean
  /** 일주 사전 character 원문 — 첫 별명 구절만 잘라 iljuLine 으로 노출. */
  iljuCharacter?: string | null
  /** 교차 tension 1위 행(서술자 있는 것) — clash ⚡ 블록 재료. */
  topTension?: { category: string; left?: string; right?: string } | null
  lang: 'ko' | 'en'
}): ViralSummary | null {
  const a = getArchetype(input.dayMaster)
  if (!a) return null
  const lang = input.lang
  const st = normalizeStrength(input.strength)
  // 지배 십성이 사전에 있으면 합성, 없으면 일간 archetype 으로 폴백.
  const sib =
    input.dominantSibsin && SIBSIN_LINE[input.dominantSibsin] ? input.dominantSibsin : null
  const stemHan = ARCHETYPE_BY_STEM[input.dayMaster]
    ? input.dayMaster
    : STEM_KO_TO_HAN[input.dayMaster]
  const core = stemHan ? STEM_CORE[stemHan] : null
  const name = sib && core ? `${SIBSIN_MODIFIER[sib][lang]} ${core[lang]}` : a.name[lang]
  const baseLine = sib ? SIBSIN_LINE[sib][lang] : a.oneLiner[lang]
  return {
    emoji: a.emoji,
    name,
    subtype: STRENGTH_TAG[st][lang],
    // 십성 결 한 줄 + 강약 결 → 같은 일간도 사람마다 다른 문장.
    oneLiner: `${baseLine} ${STRENGTH_FLAVOR[st][lang]}`,
    // 콕 집는 그림자 — 마찰이 실제로 있을 때만(억지 X).
    edgeLine: sib && input.hasTension ? SIBSIN_EDGE[sib][lang] : null,
    outer: input.ascTrait ?? null,
    hashtags: input.strengths.filter(Boolean).slice(0, 3),
    resonant: input.resonant.filter(Boolean).slice(0, 3),
    partner: input.yongsinElement
      ? (PARTNER_BY_ELEMENT[input.yongsinElement]?.[lang] ?? null)
      : null,
    // 일주 character 는 "별명 구절. 본문…" 꼴 — 첫 문장(별명)만 카드에 싣는다.
    iljuLine: input.iljuCharacter ? (input.iljuCharacter.split('.')[0]?.trim() ?? null) : null,
    clash:
      input.topTension?.left && input.topTension.right
        ? {
            category: input.topTension.category,
            saju: input.topTension.left,
            astro: input.topTension.right,
          }
        : null,
  }
}
