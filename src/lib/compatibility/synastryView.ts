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
import { PLANET_KO as PLANET_KO_BASE } from '@/lib/calendar-engine/data/planetNames'

// 행성 한글 라벨 — 공용 SSOT(planetNames)에서 파생. 교점(北/南)만 시너스트리용으로 추가.
const PLANET_KO: Record<string, string> = {
  ...PLANET_KO_BASE,
  Node: '북교점',
  'True Node': '북교점',
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
// 출생 시각 의존 앵글 — 시각 미상이면 cross 제외 대상.
const ANGLE_POINTS = new Set(['Ascendant', 'MC'])

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

// 핵심 행성쌍이 "어떤 삶의 축을 건드리는지" — 톤-중립 명사구(끌림/마찰 방향은
// aspectMeaning 의 톤 접미사가 붙임). 그래야 라벨(조화/긴장)과 의미가 안 어긋난다.
// 키는 영문명 정렬 'A|B'. 없으면 PLANET_ROLE 조합 폴백.
const PAIR_MEANING: Record<string, { ko: string; en: string }> = {
  'Moon|Sun': {
    ko: '자아와 감정이 맞물리는 궁합의 핵심 축',
    en: 'the core axis where self meets feeling',
  },
  'Moon|Venus': { ko: '정서와 애정이 맞닿는 자리', en: 'where feelings and affection meet' },
  'Mars|Venus': { ko: '끌림과 케미의 핵심 축', en: 'the heart of attraction and chemistry' },
  'Mars|Moon': { ko: '감정과 욕망이 직결되는 자리', en: 'where feeling wires straight to desire' },
  'Sun|Venus': { ko: '자아와 애정이 만나는 자리', en: 'where self meets affection' },
  'Mercury|Mercury': {
    ko: '대화·사고방식이 맞물리는 축',
    en: 'the wavelength of talk and thinking',
  },
  'Moon|Moon': { ko: '정서 리듬이 닮았는지 보는 자리', en: 'whether your emotional rhythms match' },
  'Moon|Saturn': {
    ko: '감정과 책임·거리감이 만나는 자리',
    en: 'where feeling meets duty and distance',
  },
  'Saturn|Venus': { ko: '애정과 헌신·약속이 만나는 자리', en: 'where affection meets commitment' },
  'Mars|Saturn': { ko: '추진과 통제가 맞부딪는 축', en: 'where drive meets restraint' },
  'Moon|Pluto': {
    ko: '감정 가장 깊은 곳을 건드리는 자리',
    en: 'the place that touches your deepest feelings',
  },
  'Pluto|Venus': {
    ko: '사랑이 집착·변환과 닿는 자리',
    en: 'where love meets obsession and transformation',
  },
  'Mars|Pluto': { ko: '욕망과 힘이 증폭되는 축', en: 'where desire and power amplify' },
  'Saturn|Sun': {
    ko: '자아와 권위·무게가 만나는 자리',
    en: 'where self meets authority and weight',
  },
  'Pluto|Sun': {
    ko: '정체성을 뒤흔드는 변형의 자리',
    en: 'the transformative axis that reshapes identity',
  },
  'Uranus|Venus': {
    ko: '설렘·자유로운 끌림의 자리',
    en: 'the spot of an exciting, free-spirited draw',
  },
  'Moon|Uranus': { ko: '정서적 자극의 자리', en: 'the spot of an emotional jolt' },
  'Neptune|Venus': {
    ko: '이상·낭만이 어리는 사랑의 자리',
    en: 'where love meets dream and idealization',
  },
  'Mars|Sun': { ko: '자아와 추진력이 만나는 자리', en: 'where self meets drive' },
  'Jupiter|Sun': { ko: '서로를 넓혀주는 자리', en: 'where you expand each other' },
  'Jupiter|Moon': { ko: '정서적으로 품어주는 자리', en: 'where one buoys the other emotionally' },
  'Ascendant|Sun': {
    ko: '첫인상과 자아가 만나는 자리',
    en: 'where first impression meets the self',
  },
  'Ascendant|Moon': { ko: '겉모습과 정서가 만나는 자리', en: 'where persona meets feeling' },
  'Ascendant|Venus': {
    ko: '첫인상과 매력이 만나는 자리',
    en: 'where first impression meets charm',
  },
  'Venus|Venus': {
    ko: '취향·애정 방식이 닮았는지 보는 축',
    en: 'whether your tastes and ways of loving match',
  },
  'Sun|Sun': { ko: '두 자아의 기본 결을 보는 축', en: 'the baseline grain of two selves' },
  'Mars|Mars': { ko: '추진·욕망의 호흡을 보는 축', en: 'the rhythm of drive and desire' },
}

// 톤 방향 접미사 — 축(중립) 뒤에 붙여 라벨(조화/긴장)과 항상 일치.
function toneTail(tone: SynastryTone, isKo: boolean): string {
  if (isKo)
    return tone === 'harmony'
      ? ' — 여기선 자연스럽게 통해요'
      : tone === 'tension'
        ? ' — 여기선 부딪혀 조율이 필요해요'
        : ' — 미묘하게 엮이는 결이에요'
  return tone === 'harmony'
    ? ' — here you flow together'
    : tone === 'tension'
      ? ' — here it rubs and asks for tuning'
      : ' — a subtle interplay'
}

function aspectMeaning(aEn: string, bEn: string, tone: SynastryTone, isKo: boolean): string {
  const core = PAIR_MEANING[[aEn, bEn].sort().join('|')]
  const axis = core
    ? isKo
      ? core.ko
      : core.en
    : (() => {
        const ra = PLANET_ROLE[aEn]?.[isKo ? 'ko' : 'en'] ?? aEn
        const rb = PLANET_ROLE[bEn]?.[isKo ? 'ko' : 'en'] ?? bEn
        return isKo ? `${ra} — ${rb} 축` : `where ${ra} meets ${rb}`
      })()
  return axis + toneTail(tone, isKo)
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
  lang: 'ko' | 'en' = 'ko',
  // 출생 시각 미상 — 그 사람 ASC/MC/하우스는 자정 기준 날조값이라 cross 에서 제외.
  // astroSynastryFormatter 와 동일 규칙: 미상 쪽 앵글이 낀 aspect 제외 + 그 사람
  // 하우스로의 overlay 제외. 안 그러면 차트/리포트(band·crossVerdict 점수 포함)가
  // 날조된 ASC/하우스로 계산된다(LLM 텍스트 경로만 고쳤던 #1533 의 구조화판 미완결).
  timeUnknownA = false,
  timeUnknownB = false
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
      // 미상 쪽 앵글(ASC/MC, from=A·to=B)이 낀 각은 날조라 제외.
      if (timeUnknownA && ANGLE_POINTS.has(asp.from.name)) return false
      if (timeUnknownB && ANGLE_POINTS.has(asp.to.name)) return false
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
  // overlay A→B 는 B 의 하우스 경계 필요 → B 미상이면 통째 제외. 반대도 동일.
  const overlaysAtoB = (timeUnknownB ? [] : result.houseOverlaysAtoB)
    .filter((o) => PERSONAL_OVERLAY.has(o.planet))
    .map(mapOverlay)
  const overlaysBtoA = (timeUnknownA ? [] : result.houseOverlaysBtoA)
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
