// src/lib/compatibility/zodiacCompat.ts
//
// 띠궁합(십이지 궁합) 결정론 엔진 — "쥐띠 소띠 궁합" 류 검색을 받는 프로그램매틱
// SEO 페이지의 본문을 계산한다. 제품 철학 그대로: 판정은 코드(고전 지지 관계),
// 문장은 그 판정을 사람 말로 옮긴 것.
//
// 두 띠의 지지(년지) 관계를 relationForDay(fortune/zodiacDaily)로 얻는다 —
// 삼합(三合)·육합(六合)·충(沖)·형(刑)·해(害)·파(破)·생(生)·극(剋)·비화. 이 관계가
// 곧 궁합의 뼈대다. 순수·결정론: 같은 (A,B) → 항상 같은 결과. 클록/랜덤 없음.
//
// URL 대칭: 궁합은 A×B = B×A 이므로 정규 슬러그(지지 순서 오름차순)로 모은다.
// 역순 슬러그도 파싱은 되지만 canonical 은 정규 순서를 가리킨다(중복 색인 방지).

import {
  ZODIAC_ANIMALS,
  getAnimalBySlug,
  relationForDay,
  type ZodiacAnimal,
  type DailyRelation,
} from '@/lib/fortune/zodiacDaily'

export interface LocalizedText {
  ko: string
  en: string
}

// 십이지 → 오행(년지 기준). "왜 이 궁합인가"의 근거로 쓴다.
type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
const BRANCH_ELEMENT: Record<string, Element> = {
  子: 'water',
  丑: 'earth',
  寅: 'wood',
  卯: 'wood',
  辰: 'earth',
  巳: 'fire',
  午: 'fire',
  未: 'earth',
  申: 'metal',
  酉: 'metal',
  戌: 'earth',
  亥: 'water',
}
const ELEMENT_KO: Record<Element, string> = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)',
}
const ELEMENT_EN: Record<Element, string> = {
  wood: 'Wood',
  fire: 'Fire',
  earth: 'Earth',
  metal: 'Metal',
  water: 'Water',
}

export interface ZodiacCompat {
  a: ZodiacAnimal
  b: ZodiacAnimal
  relation: DailyRelation
  /** 0~100 궁합 점수(결정론). */
  score: number
  gradeLabel: LocalizedText
  /** 관계 한 줄 이름 — 예: "삼합(三合) 궁합". */
  relationName: LocalizedText
  headline: LocalizedText
  body: LocalizedText
  goodSide: LocalizedText
  watchSide: LocalizedText
}

// 관계별 기준 점수 — 육합·삼합이 최상, 충이 최하. 페이지마다 살짝 흔들어(±3,
// 쌍 인덱스 시드) 같은 관계라도 점수가 똑같이 찍히지 않게 한다(결정론 유지).
const RELATION_BASE: Record<DailyRelation, number> = {
  yukhap: 95,
  samhap: 91,
  'seng-in': 80,
  'seng-out': 78,
  same: 72,
  bihwa: 70,
  'geuk-out': 58,
  'geuk-in': 55,
  pa: 50,
  hai: 47,
  xing: 44,
  chung: 40,
}

const RELATION_NAME: Record<DailyRelation, LocalizedText> = {
  yukhap: { ko: '육합(六合) 궁합', en: 'Yukhap (six-harmony) match' },
  samhap: { ko: '삼합(三合) 궁합', en: 'Samhap (three-harmony) match' },
  'seng-in': { ko: '상생(相生) 궁합', en: 'Nurturing (sheng) match' },
  'seng-out': { ko: '상생(相生) 궁합', en: 'Nurturing (sheng) match' },
  same: { ko: '동일 지지 궁합', en: 'Same-sign match' },
  bihwa: { ko: '비화(比和) 궁합', en: 'Same-element match' },
  'geuk-out': { ko: '상극(相剋) 궁합', en: 'Controlling (ke) match' },
  'geuk-in': { ko: '상극(相剋) 궁합', en: 'Controlling (ke) match' },
  pa: { ko: '파(破) 궁합', en: 'Pa (break) match' },
  hai: { ko: '해(害) 궁합', en: 'Hai (harm) match' },
  xing: { ko: '형(刑) 궁합', en: 'Xing (friction) match' },
  chung: { ko: '충(沖) 궁합', en: 'Chung (clash) match' },
}

function grade(score: number): LocalizedText {
  if (score >= 88) return { ko: '천생연분', en: 'Soulmate tier' }
  if (score >= 75) return { ko: '아주 잘 맞음', en: 'Excellent' }
  if (score >= 62) return { ko: '무난함', en: 'Steady' }
  if (score >= 50) return { ko: '노력이 필요', en: 'Needs work' }
  return { ko: '조율이 관건', en: 'High-friction' }
}

// 관계별 본문 — 두 띠 이름·오행을 실제로 박아 78쌍이 저마다 다른 문장이 되게 한다.
function copyFor(
  relation: DailyRelation,
  a: ZodiacAnimal,
  b: ZodiacAnimal
): { headline: LocalizedText; body: LocalizedText; good: LocalizedText; watch: LocalizedText } {
  const aEl = BRANCH_ELEMENT[a.branch]
  const bEl = BRANCH_ELEMENT[b.branch]
  const elKo = `${ELEMENT_KO[aEl]}·${ELEMENT_KO[bEl]}`
  const elEn = `${ELEMENT_EN[aEl]} & ${ELEMENT_EN[bEl]}`

  switch (relation) {
    case 'yukhap':
      return {
        headline: {
          ko: `${a.ko}와 ${b.ko}, 서로를 끌어당기는 짝`,
          en: `${a.en} and ${b.en}: a magnetic pair`,
        },
        body: {
          ko: `${a.ko}(${a.branch})와 ${b.ko}(${b.branch})는 십이지에서 육합(六合)으로 묶이는 조합입니다. 서로의 부족한 부분을 자연스럽게 채워, 처음 만나도 오래 안 사이처럼 편안합니다. ${elKo} 기운이 부딪히지 않고 맞물려 갈등이 적습니다.`,
          en: `${a.en} (${a.branch}) and ${b.en} (${b.branch}) form a "six-harmony" (yukhap) bond in the Chinese zodiac. You fill each other's gaps naturally and feel familiar fast. Your ${elEn} energies interlock rather than clash.`,
        },
        good: {
          ko: '말하지 않아도 통하는 편안함, 위기에서 서로를 먼저 챙기는 신뢰.',
          en: 'Effortless understanding, and instinctive loyalty when things get hard.',
        },
        watch: {
          ko: '너무 편해서 서로를 당연하게 여길 수 있으니, 표현을 아끼지 마세요.',
          en: 'It can get so comfortable you take each other for granted — keep saying it out loud.',
        },
      }
    case 'samhap':
      return {
        headline: {
          ko: `${a.ko}와 ${b.ko}, 같은 방향을 보는 팀`,
          en: `${a.en} and ${b.en}: a team pulling the same way`,
        },
        body: {
          ko: `${a.ko}(${a.branch})와 ${b.ko}(${b.branch})는 삼합(三合)으로 이어지는 조합입니다. 목표와 리듬이 비슷해 함께 일을 벌이고 키우는 데 강합니다. ${elKo} 기운이 한 흐름으로 합쳐져 추진력이 붙습니다.`,
          en: `${a.en} (${a.branch}) and ${b.en} (${b.branch}) belong to the same "three-harmony" (samhap) trine. You share goals and pacing, so you build things well together. Your ${elEn} energies merge into one current with real momentum.`,
        },
        good: {
          ko: '함께 목표를 세우면 빠르게 굴러가는 시너지, 서로의 야망을 응원.',
          en: 'Set a goal together and it moves fast — you cheer each other on.',
        },
        watch: {
          ko: '일에 몰입하다 감정 교류가 뒤로 밀릴 수 있어요. 쉼표도 함께 찍으세요.',
          en: 'Chasing goals can crowd out feelings — schedule rest together too.',
        },
      }
    case 'seng-in':
    case 'seng-out':
      return {
        headline: {
          ko: `${a.ko}와 ${b.ko}, 한쪽이 기운을 북돋는 사이`,
          en: `${a.en} and ${b.en}: one lifts the other`,
        },
        body: {
          ko: `${a.ko}(${a.branch})와 ${b.ko}(${b.branch})는 오행 상생(相生) 관계입니다. ${elKo}이(가) 서로를 살려주는 흐름이라, 한쪽이 지칠 때 다른 쪽이 힘을 보태는 보완형 궁합입니다.`,
          en: `${a.en} (${a.branch}) and ${b.en} (${b.branch}) sit in a "generating" (sheng) relationship. ${elEn} feed each other, so when one runs low the other tops them up — a complementary match.`,
        },
        good: {
          ko: '지친 날 기대게 되는 안정감, 서로를 성장시키는 방향.',
          en: 'A place to lean on tired days, and growth in each other’s direction.',
        },
        watch: {
          ko: '한쪽만 계속 베풀면 지칩니다. 받는 쪽도 표현으로 돌려주세요.',
          en: 'If only one gives, they burn out — the receiver should give back in words.',
        },
      }
    case 'same':
      return {
        headline: {
          ko: `${a.ko}끼리, 거울 같은 사이`,
          en: `Two ${a.en}s: a mirror match`,
        },
        body: {
          ko: `같은 ${a.ko}(${a.branch}) 조합입니다. 가치관과 속도가 닮아 서로를 금방 이해하지만, 장단점도 똑같아 같은 지점에서 부딪힐 수 있습니다. ${ELEMENT_KO[aEl]} 기운이 겹쳐 색이 진해집니다.`,
          en: `A same-sign ${a.en} (${a.branch}) pairing. You share values and pace and "get" each other fast — but you also share the same flaws and can trip on the same spot. Doubled ${ELEMENT_EN[aEl]} makes the color intense.`,
        },
        good: {
          ko: '설명이 필요 없는 이해, 비슷한 취향으로 편한 일상.',
          en: 'Understanding that needs no explaining, and easy shared taste.',
        },
        watch: {
          ko: '똑같은 약점이 동시에 터질 때 완충이 없어요. 역할을 나눠보세요.',
          en: 'Shared weak spots can blow at once with no buffer — split roles.',
        },
      }
    case 'bihwa':
      return {
        headline: {
          ko: `${a.ko}와 ${b.ko}, 결이 비슷한 사이`,
          en: `${a.en} and ${b.en}: a similar wavelength`,
        },
        body: {
          ko: `${a.ko}(${a.branch})와 ${b.ko}(${b.branch})는 같은 ${ELEMENT_KO[aEl]} 기운을 공유하는 비화(比和) 관계입니다. 코드가 비슷해 편하지만, 밀어주는 힘보다 나란히 가는 힘이라 자극은 적습니다.`,
          en: `${a.en} (${a.branch}) and ${b.en} (${b.branch}) share the same ${ELEMENT_EN[aEl]} element (bihwa). Similar wiring makes it comfortable, but you walk side by side rather than push each other — less spark, more ease.`,
        },
        good: {
          ko: '가치관이 통해 다툴 일이 적고, 함께 있으면 안정적.',
          en: 'Aligned values, few fights, and a steady feeling together.',
        },
        watch: {
          ko: '둘 다 비슷해 정체될 수 있어요. 새 자극은 밖에서 함께 찾으세요.',
          en: 'Too alike can stall — go find fresh stimulation together, outside.',
        },
      }
    case 'geuk-in':
    case 'geuk-out':
      return {
        headline: {
          ko: `${a.ko}와 ${b.ko}, 팽팽한 끌림`,
          en: `${a.en} and ${b.en}: a taut attraction`,
        },
        body: {
          ko: `${a.ko}(${a.branch})와 ${b.ko}(${b.branch})는 오행 상극(相剋) 관계입니다. ${elKo}이(가) 서로를 누르는 힘이라 긴장이 있지만, 그 긴장이 끌림으로 바뀌면 누구보다 강렬한 관계가 됩니다.`,
          en: `${a.en} (${a.branch}) and ${b.en} (${b.branch}) are in a "controlling" (ke) relationship. ${elEn} press on each other, so there's tension — but if that tension turns to attraction, few pairs burn brighter.`,
        },
        good: {
          ko: '서로를 긴장시키는 매력, 자극과 성장이 함께 오는 관계.',
          en: 'A charge that keeps you on your toes — stimulation and growth together.',
        },
        watch: {
          ko: '주도권 다툼이 감정싸움이 되기 쉬워요. 이길 상대가 아니라 팀이라 여기세요.',
          en: 'Power struggles turn personal fast — treat each other as a team, not an opponent.',
        },
      }
    case 'pa':
    case 'hai':
    case 'xing':
      return {
        headline: {
          ko: `${a.ko}와 ${b.ko}, 결이 어긋나는 지점이 있는 사이`,
          en: `${a.en} and ${b.en}: some grain runs against`,
        },
        body: {
          ko: `${a.ko}(${a.branch})와 ${b.ko}(${b.branch})는 십이지에서 ${relation === 'xing' ? '형(刑)' : relation === 'hai' ? '해(害)' : '파(破)'} 관계로, 은근한 마찰이 쌓이기 쉬운 조합입니다. ${elKo} 기운의 엇갈림을 알고 다루면 오히려 단단해집니다.`,
          en: `${a.en} (${a.branch}) and ${b.en} (${b.branch}) sit in a ${relation === 'xing' ? 'xing (friction)' : relation === 'hai' ? 'hai (harm)' : 'pa (break)'} relationship — quiet friction can accumulate. Name the ${elEn} mismatch and handle it, and it actually toughens the bond.`,
        },
        good: {
          ko: '차이가 커서 서로에게 배울 게 많고, 넘기면 훨씬 깊어집니다.',
          en: 'Big differences mean a lot to learn — get past them and it deepens.',
        },
        watch: {
          ko: '작은 서운함을 묵히면 커져요. 그날그날 짧게 푸는 습관이 핵심.',
          en: 'Small resentments grow if stored — clear them daily, briefly.',
        },
      }
    case 'chung':
    default:
      return {
        headline: {
          ko: `${a.ko}와 ${b.ko}, 정면으로 부딪히는 사이`,
          en: `${a.en} and ${b.en}: a head-on pair`,
        },
        body: {
          ko: `${a.ko}(${a.branch})와 ${b.ko}(${b.branch})는 십이지에서 충(沖) 관계입니다. 성향이 정반대라 강하게 끌리기도, 세게 부딪히기도 합니다. ${elKo}의 충돌을 서로 인정하면 상반됨이 오히려 서로를 완성합니다.`,
          en: `${a.en} (${a.branch}) and ${b.en} (${b.branch}) are in a "clash" (chung) — opposite temperaments that attract hard and collide hard. Own the ${elEn} collision and your opposites can complete each other.`,
        },
        good: {
          ko: '정반대라서 끌리는 강렬함, 내게 없는 걸 가진 상대.',
          en: 'The pull of true opposites — they have what you don’t.',
        },
        watch: {
          ko: '같은 방식으로는 절대 안 맞아요. 다름을 규칙으로 정해두세요.',
          en: 'The same approach will never fit — turn your differences into agreed rules.',
        },
      }
  }
}

/** 지지 순서 인덱스(子=0…亥=11). */
function branchIndex(a: ZodiacAnimal): number {
  return ZODIAC_ANIMALS.findIndex((z) => z.slug === a.slug)
}

/** 정규 슬러그 — 지지 순서가 빠른 쪽을 앞에. A×B=B×A 대칭을 하나로 모은다. */
export function canonicalPairSlug(x: ZodiacAnimal, y: ZodiacAnimal): string {
  return branchIndex(x) <= branchIndex(y) ? `${x.slug}-${y.slug}` : `${y.slug}-${x.slug}`
}

/** "rat-ox" 류 슬러그 → 두 동물(순서 무관). 잘못된 슬러그면 null. */
export function parsePairSlug(slug: string): { a: ZodiacAnimal; b: ZodiacAnimal } | null {
  const parts = (slug || '').split('-')
  if (parts.length !== 2) return null
  const a = getAnimalBySlug(parts[0])
  const b = getAnimalBySlug(parts[1])
  if (!a || !b) return null
  return { a, b }
}

/**
 * 모든 정규 조합 슬러그(78개 = 같은 띠 12 + 서로 다른 쌍 66). 사이트맵·인덱스용.
 * 지지 순서 오름차순 쌍만 — 역순은 canonical 로 정규 슬러그를 가리킨다.
 */
export function allPairSlugs(): string[] {
  const out: string[] = []
  for (let i = 0; i < ZODIAC_ANIMALS.length; i++) {
    for (let j = i; j < ZODIAC_ANIMALS.length; j++) {
      out.push(`${ZODIAC_ANIMALS[i].slug}-${ZODIAC_ANIMALS[j].slug}`)
    }
  }
  return out
}

/** 두 띠의 궁합을 계산한다(결정론). */
export function computeZodiacCompat(a: ZodiacAnimal, b: ZodiacAnimal): ZodiacCompat {
  const relation = relationForDay(a.branch, b.branch)
  const base = RELATION_BASE[relation]
  // 쌍 인덱스 시드로 ±3 결정론 흔들기 — 같은 관계라도 점수 다양화.
  const seed = (branchIndex(a) * 12 + branchIndex(b)) % 7
  const score = Math.max(0, Math.min(100, base + (seed - 3)))
  const copy = copyFor(relation, a, b)
  return {
    a,
    b,
    relation,
    score,
    gradeLabel: grade(score),
    relationName: RELATION_NAME[relation],
    headline: copy.headline,
    body: copy.body,
    goodSide: copy.good,
    watchSide: copy.watch,
  }
}
