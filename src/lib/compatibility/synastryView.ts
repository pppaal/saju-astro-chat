/**
 * 궁합 차트용 시너스트리 — 상담사가 쓰는 것과 *같은 엔진*(calculateSynastry)을
 * 서버(compatReport)에서 호출해 구조화 결과만 차트로 내려준다. ScoreBreakdown 의 자체
 * 휴리스틱(플랫 6° orb·전 행성쌍 동일가중)과 달리 엔진은 어스펙트별 orb +
 * orb-가중 score 를 쓰므로 "차트 숫자 = 상담사가 추론한 그 값" 이 보장된다.
 *
 * 엔진/포매터는 손대지 않는다 — natal(/api/astrology
 * chartData)을 calculateSynastry 가 보는 최소 Chart 형태로 매핑만 한다.
 * (toChart 는 swisseph 파일에 있어 클라 import 불가라 여기서 가볍게 reshape.)
 */

import { calculateSynastry } from '@/lib/astrology/foundation/synastry'
import type { Chart } from '@/lib/astrology/foundation/types'

const PLANET_KO: Record<string, string> = {
  Sun: '태양',
  Moon: '달',
  Mercury: '수성',
  Venus: '금성',
  Mars: '화성',
  Jupiter: '목성',
  Saturn: '토성',
  Uranus: '천왕성',
  Neptune: '해왕성',
  Pluto: '명왕성',
  Node: '북교점',
  'True Node': '북교점',
  Ascendant: '상승점',
  MC: '중천점',
}

// 엔진의 HARMONY/TENSION 분류와 동일 (synastry.ts).
const HARMONY = new Set(['conjunction', 'trine', 'sextile'])
const TENSION = new Set(['square', 'opposition', 'quincunx'])

// 느낌(평이한 말)을 앞세우고 전문용어는 작게. (잡지처럼 읽히게 — 상담사 voice)
const ASPECT_LABEL: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: '겹침', en: 'tight blend' },
  trine: { ko: '조화', en: 'harmony' },
  sextile: { ko: '받쳐줌', en: 'support' },
  square: { ko: '긴장', en: 'tension' },
  opposition: { ko: '팽팽함', en: 'face-off' },
  quincunx: { ko: '엇박', en: 'subtle misfit' },
}

const HOUSE_MEANING_KO: Record<number, string> = {
  1: '자아·인상',
  2: '재물·가치',
  3: '소통·일상',
  4: '가정·뿌리',
  5: '연애·즐거움',
  6: '일·습관',
  7: '동반자·결혼',
  8: '깊은 결합·변환',
  9: '신념·확장',
  10: '커리어·지위',
  11: '친구·미래',
  12: '내면·비밀',
}
const HOUSE_MEANING_EN: Record<number, string> = {
  1: 'self·image',
  2: 'money·values',
  3: 'talk·daily',
  4: 'home·roots',
  5: 'romance·play',
  6: 'work·habits',
  7: 'partner·marriage',
  8: 'depth·merge',
  9: 'belief·growth',
  10: 'career·status',
  11: 'friends·future',
  12: 'inner·secrets',
}

// 개인 행성 — 어스펙트/오버레이의 핵심. 외행성끼리는 동세대 노이즈라 비중↓.
const PERSONAL = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Ascendant'])
const PERSONAL_OVERLAY = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'])

// 행성별 "관계에서의 역할" 한 마디 — 의미 사전에 없는 쌍을 위한 폴백 조합용.
const PLANET_ROLE: Record<string, { ko: string; en: string }> = {
  Sun: { ko: '자아·정체성', en: 'core self' },
  Moon: { ko: '감정·정서', en: 'feelings' },
  Mercury: { ko: '대화·생각', en: 'talk and thinking' },
  Venus: { ko: '애정·매력', en: 'affection and charm' },
  Mars: { ko: '욕망·추진', en: 'desire and drive' },
  Ascendant: { ko: '첫인상·태도', en: 'first impression' },
  Jupiter: { ko: '확장·너그러움', en: 'expansion and generosity' },
  Saturn: { ko: '책임·시험', en: 'commitment and testing' },
  Uranus: { ko: '자극·변화', en: 'spark and change' },
  Neptune: { ko: '환상·이상', en: 'dream and idealization' },
  Pluto: { ko: '깊이·강렬함', en: 'depth and intensity' },
  Node: { ko: '운명·과제', en: 'fate and lesson' },
  'True Node': { ko: '운명·과제', en: 'fate and lesson' },
}

// 핵심 행성쌍의 "관계 의미" — 어떤 삶의 축을 건드리는지(톤-중립, 끌림/마찰
// 색깔은 라벨·강도가 전달). 키는 영문명 정렬 'A|B'. 없으면 PLANET_ROLE 조합 폴백.
const PAIR_MEANING: Record<string, { ko: string; en: string }> = {
  'Moon|Sun': {
    ko: '자아와 감정이 맞물리는 궁합의 핵심 축 — 함께 있으면 서로를 자연스럽게 채워요',
    en: 'the core axis of self meeting feeling — you naturally complete each other',
  },
  'Moon|Venus': {
    ko: '정서와 애정이 부드럽게 통해 — 편안하고 다정한 끌림',
    en: 'feelings and affection flow gently — a warm, easy draw',
  },
  'Mars|Venus': {
    ko: '끌림·케미의 핵심 축 — 로맨스와 열정의 불꽃',
    en: 'the heart of chemistry — the spark of romance and passion',
  },
  'Mars|Moon': {
    ko: '감정과 욕망이 직결 — 뜨겁게 통하지만 욱하기도',
    en: 'feeling wired straight to desire — hot, but quick to flare',
  },
  'Sun|Venus': {
    ko: '자아와 애정이 통해 — 서로 좋아하고 인정하는 결',
    en: 'self and affection align — you like and validate each other',
  },
  'Mercury|Mercury': {
    ko: '대화·사고방식의 결 — 말이 통하는지를 가르는 축',
    en: 'the wavelength of talk and thinking — whether you click in conversation',
  },
  'Moon|Moon': {
    ko: '정서 리듬이 닮았는지 — 집·일상의 편안함',
    en: 'whether your emotional rhythms match — comfort of home and daily life',
  },
  'Moon|Saturn': {
    ko: '감정과 책임이 만나 — 안정감과 거리감이 함께 오는 양날',
    en: 'feeling meets duty — a double edge of security and distance',
  },
  'Saturn|Venus': {
    ko: '애정과 헌신 — 진지하고 오래가나 의무감은 경계',
    en: 'affection and commitment — lasting and serious, but watch for obligation',
  },
  'Mars|Saturn': {
    ko: '추진과 통제 — 함께 일하면 단단, 부딪히면 답답',
    en: 'drive meets restraint — solid when aligned, stifling when not',
  },
  'Moon|Pluto': {
    ko: '감정 가장 깊은 곳을 건드리는 강렬한 이끌림 — 무의식적',
    en: 'a pull that reaches your deepest feelings — unconscious and intense',
  },
  'Pluto|Venus': {
    ko: '사랑이 집착·변환으로 — 강렬하고 운명적인 결',
    en: 'love turned to obsession and transformation — intense, fated',
  },
  'Mars|Pluto': {
    ko: '욕망과 힘이 증폭 — 강렬하나 주도권 다툼은 주의',
    en: 'desire and power amplified — intense, but mind the power struggle',
  },
  'Saturn|Sun': {
    ko: '자아와 권위 — 든든한 버팀목과 억압이 함께 오는 양날',
    en: 'self meets authority — a pillar and a weight at once',
  },
  'Pluto|Sun': {
    ko: '정체성을 뒤흔드는 강한 영향 — 변형적인 관계',
    en: 'a force that reshapes who you are — transformative',
  },
  'Uranus|Venus': {
    ko: '설레고 자유로운 끌림 — 짜릿하나 변덕도',
    en: 'an exciting, free-spirited draw — thrilling but flighty',
  },
  'Moon|Uranus': {
    ko: '정서적 자극 — 신선하나 불안정',
    en: 'an emotional jolt — fresh but unsteady',
  },
  'Neptune|Venus': {
    ko: '이상적이고 낭만적인 사랑 — 환상은 경계',
    en: 'idealized, romantic love — beware the illusion',
  },
  'Mars|Sun': {
    ko: '자아와 추진력 — 활력 넘치나 경쟁도',
    en: 'self and drive — energizing, but competitive',
  },
  'Jupiter|Sun': {
    ko: '서로를 넓혀주고 북돋아 — 관대하고 성장적',
    en: 'you expand and uplift each other — generous and growthful',
  },
  'Jupiter|Moon': {
    ko: '정서적으로 넉넉하게 품어줘 — 따뜻하고 안심되는 결',
    en: 'emotionally generous and reassuring',
  },
  'Ascendant|Sun': {
    ko: '첫인상과 자아가 통해 — 처음부터 자연스러운 사이',
    en: 'first impression and self align — natural from the start',
  },
  'Ascendant|Moon': {
    ko: '겉모습과 정서가 맞아 — 곁에 있으면 편안',
    en: 'persona and feeling match — easy to be around',
  },
  'Ascendant|Venus': {
    ko: '첫눈에 끌리는 매력 — 호감이 빠르게',
    en: 'attraction at first sight — quick rapport',
  },
  'Venus|Venus': {
    ko: '취향과 애정 방식이 닮았는지 — 미감·가치의 결',
    en: 'whether your tastes and ways of loving match — shared aesthetics and values',
  },
  'Sun|Sun': {
    ko: '두 자아가 같은 결인지 — 근본 기질의 궁합',
    en: 'whether your two selves run the same grain — core temperament fit',
  },
  'Mars|Mars': {
    ko: '추진·욕망의 결 — 함께 밀어붙이는 호흡',
    en: 'the grain of drive and desire — how you push forward together',
  },
}

function aspectMeaning(aEn: string, bEn: string, tone: SynastryTone, isKo: boolean): string {
  const core = PAIR_MEANING[[aEn, bEn].sort().join('|')]
  if (core) return isKo ? core.ko : core.en
  // 폴백 — 두 행성의 역할 + 톤 색.
  const ra = PLANET_ROLE[aEn]?.[isKo ? 'ko' : 'en'] ?? aEn
  const rb = PLANET_ROLE[bEn]?.[isKo ? 'ko' : 'en'] ?? bEn
  if (isKo) {
    // 조사 안전 — '축이'(받침 고정)로 받아 ra/rb 받침과 무관하게.
    const t =
      tone === 'harmony'
        ? '매끄럽게 통해요'
        : tone === 'tension'
          ? '부딪혀 긴장을 만들어요 — 조율이 곧 성장'
          : '미묘하게 엮여요'
    return `${ra} — ${rb} 축이 ${t}`
  }
  const t =
    tone === 'harmony'
      ? 'flow together smoothly'
      : tone === 'tension'
        ? 'rub against each other — tuning is where you grow'
        : 'interweave subtly'
  return `where ${ra} meets ${rb} — they ${t}`
}

export type SynastryTone = 'harmony' | 'tension' | 'neutral'

export interface SynAspectView {
  /** A 행성 (KO/EN) */
  a: string
  /** B 행성 (KO/EN) */
  b: string
  /** 관계어 라벨 */
  label: string
  tone: SynastryTone
  orb: number
  /** orb 에서 도출한 강도 표현 (숫자 대신 사용자용) */
  strength: string
  /** 이 행성쌍이 관계에서 무엇을 뜻하는지 한 줄 — raw 데이터에 해석을 붙임 */
  meaning: string
}

export interface SynOverlayView {
  planet: string
  house: number
  meaning: string
}

export interface SynastryView {
  aspects: SynAspectView[]
  overlaysAtoB: SynOverlayView[]
  overlaysBtoA: SynOverlayView[]
  /** 엔진 raw score — harmony/tension 합(가중) */
  harmony: number
  tension: number
}

type Loose = Record<string, unknown>

// natal(/api/astrology chartData) → calculateSynastry 가 읽는 최소 Chart.
// 엔진은 planets(longitude/name/sign) + ascendant + mc + houses(cusp)만 본다.
function toChartLike(natal: unknown): Chart | null {
  if (!natal || typeof natal !== 'object') return null
  const n = natal as Loose
  const planets = n.planets
  if (!Array.isArray(planets) || planets.length === 0) return null
  const hasLon = planets.some((p) => typeof (p as Loose)?.longitude === 'number')
  if (!hasLon) return null
  return {
    planets,
    ascendant: n.ascendant,
    mc: n.mc,
    houses: Array.isArray(n.houses) ? n.houses : [],
  } as unknown as Chart
}

function toneOf(type: string): SynastryTone {
  if (HARMONY.has(type)) return 'harmony'
  if (TENSION.has(type)) return 'tension'
  return 'neutral'
}
const pko = (name: string, isKo: boolean) => (isKo ? (PLANET_KO[name] ?? name) : name)

/**
 * 차트 렌더용 시너스트리 뷰. astroA/astroB 는 이미 unwrap 된 natal(chartData).
 * 데이터가 부족하면 null (차트는 이 섹션을 숨김).
 */
export function computeSynastryView(
  astroA: unknown,
  astroB: unknown,
  lang: 'ko' | 'en' = 'ko'
): SynastryView | null {
  const a = toChartLike(astroA)
  const b = toChartLike(astroB)
  if (!a || !b) return null

  let result
  try {
    result = calculateSynastry({ chartA: a, chartB: b })
  } catch {
    return null
  }

  const isKo = lang === 'ko'
  const houseMeaning = isKo ? HOUSE_MEANING_KO : HOUSE_MEANING_EN

  // 어스펙트 — 개인행성이 하나라도 낀 것 우선, orb≤5° 만, score(가중) 순.
  const aspects: SynAspectView[] = result.aspects
    .filter((asp) => {
      if (asp.orb > 5) return false
      // 이름 없는 엔드포인트(미라벨 각·결손 데이터)는 "undefined" 노출 방지로 제외.
      if (!asp.from?.name || !asp.to?.name) return false
      return PERSONAL.has(asp.from.name) || PERSONAL.has(asp.to.name)
    })
    .slice(0, 8)
    .map((asp) => ({
      a: pko(asp.from.name, isKo),
      b: pko(asp.to.name, isKo),
      label: (isKo ? ASPECT_LABEL[asp.type]?.ko : ASPECT_LABEL[asp.type]?.en) ?? asp.type,
      tone: toneOf(asp.type),
      meaning: aspectMeaning(asp.from.name, asp.to.name, toneOf(asp.type), isKo),
      orb: Math.round(asp.orb * 10) / 10,
      // orb 좁을수록 강함 — 숫자(0.5°)는 일반 사용자에게 의미 없어 강도 표현으로.
      strength: isKo
        ? asp.orb <= 1.5
          ? '강하게'
          : asp.orb <= 3
            ? '또렷이'
            : '은은히'
        : asp.orb <= 1.5
          ? 'strong'
          : asp.orb <= 3
            ? 'clear'
            : 'faint',
    }))

  const mapOverlay = (o: { planet: string; inHouse: number }): SynOverlayView => ({
    planet: pko(o.planet, isKo),
    house: o.inHouse,
    meaning: houseMeaning[o.inHouse] ?? '',
  })
  const overlaysAtoB = result.houseOverlaysAtoB
    .filter((o) => PERSONAL_OVERLAY.has(o.planet))
    .map(mapOverlay)
  const overlaysBtoA = result.houseOverlaysBtoA
    .filter((o) => PERSONAL_OVERLAY.has(o.planet))
    .map(mapOverlay)

  return {
    aspects,
    overlaysAtoB,
    overlaysBtoA,
    harmony: result.score.harmony,
    tension: result.score.tension,
  }
}
