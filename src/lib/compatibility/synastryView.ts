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
      return PERSONAL.has(asp.from.name) || PERSONAL.has(asp.to.name)
    })
    .slice(0, 8)
    .map((asp) => ({
      a: pko(asp.from.name, isKo),
      b: pko(asp.to.name, isKo),
      label: (isKo ? ASPECT_LABEL[asp.type]?.ko : ASPECT_LABEL[asp.type]?.en) ?? asp.type,
      tone: toneOf(asp.type),
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
