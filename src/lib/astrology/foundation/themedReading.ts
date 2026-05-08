// Theme-based astrology reading.
//
// Saju side has analyzeRelationships / analyzeCareer / analyzeHealth /
// etc. that produce a per-domain insight from the chart. This is the
// western counterpart: 6 life themes, each driven by its traditional
// houses + ruling planets + key aspects.
//
// All deterministic. Output mirrors saju's relationship cards in
// extendedAnalysis (label / summary / strengths / cautions / advice).

import type { Chart, PlanetBase } from './types'
import { findNatalAspects } from './aspects'

// ============================================================
// Theme metadata — which houses / planets traditionally rule each
// domain. Keep narrow & defensible (avoid pseudo-modern overrides).
// ============================================================

export type AstroTheme =
  | 'love'        // 5 (romance) + 7 (partnership) + Venus + Mars
  | 'career'      // 6 (daily work) + 10 (status) + Saturn + Sun
  | 'wealth'      // 2 (income) + 8 (shared/inheritance) + Venus + Jupiter
  | 'health'      // 6 (body) + 12 (subconscious) + Sun + Moon
  | 'family'      // 4 (roots) + 10 (parents) + Moon + Saturn
  | 'spirituality' // 9 (philosophy) + 12 (transcendence) + Jupiter + Neptune

const THEME_HOUSES: Record<AstroTheme, number[]> = {
  love: [5, 7],
  career: [6, 10],
  wealth: [2, 8],
  health: [6, 12],
  family: [4, 10],
  spirituality: [9, 12],
}

const THEME_KEY_PLANETS: Record<AstroTheme, string[]> = {
  love: ['Venus', 'Mars', 'Moon'],
  career: ['Saturn', 'Sun', 'Mars'],
  wealth: ['Venus', 'Jupiter'],
  health: ['Sun', 'Moon', 'Mars'],
  family: ['Moon', 'Saturn'],
  spirituality: ['Jupiter', 'Neptune', 'True Node'],
}

const THEME_LABEL_KO: Record<AstroTheme, string> = {
  love: '연애 · 파트너십',
  career: '커리어 · 사회적 위치',
  wealth: '재물 · 자원',
  health: '건강 · 활력',
  family: '가족 · 뿌리',
  spirituality: '영성 · 의미',
}

const THEME_EMOJI: Record<AstroTheme, string> = {
  love: '💞',
  career: '🏛',
  wealth: '💰',
  health: '🩺',
  family: '🏡',
  spirituality: '🕊',
}

// House meanings (Korean — short).
const HOUSE_MEANING: Record<number, string> = {
  1: '자기 자신·페르소나',
  2: '소득·자원',
  3: '소통·형제·근거리 이동',
  4: '가정·뿌리',
  5: '연애·창작·자녀',
  6: '일상 노동·건강',
  7: '파트너십·결혼',
  8: '공유 자원·변용',
  9: '철학·장거리·고등 교육',
  10: '커리어·사회적 위치',
  11: '집단·미래 비전',
  12: '내면·은둔·초월',
}

// Sign keywords — short.
const SIGN_KEYWORD: Record<string, string> = {
  Aries: '주도적', Taurus: '안정적', Gemini: '소통적', Cancer: '돌봄형',
  Leo: '표현형', Virgo: '정밀형', Libra: '조율형', Scorpio: '심층형',
  Sagittarius: '확장형', Capricorn: '구축형', Aquarius: '독립형', Pisces: '감응형',
}

const SIGN_KO: Record<string, string> = {
  Aries: '양', Taurus: '황소', Gemini: '쌍둥이', Cancer: '게',
  Leo: '사자', Virgo: '처녀', Libra: '천칭', Scorpio: '전갈',
  Sagittarius: '사수', Capricorn: '염소', Aquarius: '물병', Pisces: '물고기',
}

// ============================================================
// Per-theme strength + caution rules (aspect-based)
// ============================================================

// Map a theme key planet's aspect set to strengths/cautions text.
// Only fires when an aspect is present so output stays evidence-backed.
const ASPECT_RULES: Array<{
  theme: AstroTheme
  planet: string
  aspectType: 'conjunction' | 'trine' | 'sextile' | 'square' | 'opposition'
  partner?: string  // optional — restrict to a specific partner planet
  strength?: string // copy
  caution?: string
}> = [
  // Love — Venus
  { theme: 'love', planet: 'Venus', aspectType: 'trine', strength: 'Venus 트라인 — 호감을 끌어당기는 자기장이 부드럽게 작동합니다.' },
  { theme: 'love', planet: 'Venus', aspectType: 'square', caution: 'Venus 스퀘어 — 끌림과 가치관이 충돌해 관계가 흔들리기 쉬움.' },
  { theme: 'love', planet: 'Venus', aspectType: 'conjunction', partner: 'Mars', strength: 'Venus-Mars 합 — 감정과 욕망의 결이 같이 움직여 강한 매력.' },
  { theme: 'love', planet: 'Mars', aspectType: 'opposition', partner: 'Venus', caution: 'Mars-Venus 어포지션 — 감정/욕망이 어긋날 때 충돌이 격해짐.' },

  // Career — Saturn / Sun
  { theme: 'career', planet: 'Saturn', aspectType: 'trine', strength: 'Saturn 트라인 — 책임감 있는 성장이 시간이 지날수록 빛납니다.' },
  { theme: 'career', planet: 'Saturn', aspectType: 'square', caution: 'Saturn 스퀘어 — 권위 구조와 마찰. 인내가 시험대에 오릅니다.' },
  { theme: 'career', planet: 'Sun', aspectType: 'conjunction', partner: 'Jupiter', strength: 'Sun-Jupiter 합 — 자기 정체성이 확장의 흐름을 탑니다.' },
  { theme: 'career', planet: 'Sun', aspectType: 'square', partner: 'Saturn', caution: 'Sun-Saturn 스퀘어 — 자기 표현이 책임/제약과 충돌해 답답할 때 많음.' },

  // Wealth — Jupiter / Venus
  { theme: 'wealth', planet: 'Jupiter', aspectType: 'trine', strength: 'Jupiter 트라인 — 물질적 흐름이 풍성하게 들어옵니다.' },
  { theme: 'wealth', planet: 'Jupiter', aspectType: 'square', caution: 'Jupiter 스퀘어 — 과욕·과확장으로 손실 위험.' },
  { theme: 'wealth', planet: 'Venus', aspectType: 'conjunction', partner: 'Jupiter', strength: 'Venus-Jupiter 합 — 가치 + 확장이 같이 움직이는 부의 결.' },

  // Health — Sun / Mars
  { theme: 'health', planet: 'Sun', aspectType: 'square', partner: 'Mars', caution: 'Sun-Mars 스퀘어 — 과열·소진 주의. 휴식 강제 필요.' },
  { theme: 'health', planet: 'Mars', aspectType: 'square', partner: 'Saturn', caution: 'Mars-Saturn 스퀘어 — 의지가 꺾이기 쉬움. 페이스 조절.' },
  { theme: 'health', planet: 'Sun', aspectType: 'trine', partner: 'Jupiter', strength: 'Sun-Jupiter 트라인 — 회복력과 활력이 좋음.' },

  // Family — Moon / Saturn
  { theme: 'family', planet: 'Moon', aspectType: 'square', partner: 'Saturn', caution: 'Moon-Saturn 스퀘어 — 가족 안에서 정서적 차가움/거리감 경험.' },
  { theme: 'family', planet: 'Moon', aspectType: 'trine', strength: 'Moon 트라인 — 가족·뿌리에서 안정적 정서 자원이 흐릅니다.' },
  { theme: 'family', planet: 'Moon', aspectType: 'opposition', partner: 'Pluto', caution: 'Moon-Pluto 어포지션 — 가족 안 깊은 감정·통제 이슈.' },

  // Spirituality — Jupiter / Neptune
  { theme: 'spirituality', planet: 'Jupiter', aspectType: 'trine', partner: 'Neptune', strength: 'Jupiter-Neptune 트라인 — 의미·영성에 자연스러운 통로.' },
  { theme: 'spirituality', planet: 'Neptune', aspectType: 'square', caution: 'Neptune 스퀘어 — 환상과 현실의 경계가 흐릿해질 위험.' },
]

// ============================================================
// Public API
// ============================================================

export interface ThemedReading {
  theme: AstroTheme
  label: string
  emoji: string
  /** Houses traditionally ruling this theme + signs/planets in them. */
  houses: Array<{
    index: number
    sign: string
    planets: string[]
    meaning: string
  }>
  /** Key planet's sign + house pairs ("Venus 염소 11H"). */
  keyPlanets: Array<{
    name: string
    sign: string
    house: number | null
  }>
  /** Strength bullets (only when evidence found). */
  strengths: string[]
  /** Caution bullets. */
  cautions: string[]
  /** 1-2 sentence narrative summary. */
  summary: string
  /** Concrete advice line. */
  advice: string
}

export interface ThemedAstroOutput {
  themes: ThemedReading[]
}

// ============================================================
// Implementation
// ============================================================

function findPlanetsInHouse(planets: PlanetBase[], house: number): PlanetBase[] {
  return planets.filter((p) => (p as { house?: number }).house === house)
}

function getPlanet(planets: PlanetBase[], name: string): PlanetBase | null {
  return planets.find((p) => p.name === name) || null
}

function buildHouseInfo(
  planets: PlanetBase[],
  asc: { sign?: string } | undefined,
  houses: Array<{ index?: number; cusp?: number; sign?: string }> | undefined,
  index: number,
): { index: number; sign: string; planets: string[]; meaning: string } {
  const inHouse = findPlanetsInHouse(planets, index)
  const cuspSign = houses?.find((h) => h.index === index)?.sign || ''
  return {
    index,
    sign: SIGN_KO[cuspSign] || cuspSign || '',
    planets: inHouse.map((p) => p.name).filter(Boolean) as string[],
    meaning: HOUSE_MEANING[index] || '',
  }
}

function buildThemeReading(
  theme: AstroTheme,
  chart: Chart,
  aspectsByPlanet: Map<string, ReturnType<typeof findNatalAspects>>,
): ThemedReading {
  const planets = chart.planets || []
  const houses = (chart as { houses?: Array<{ index?: number; cusp?: number; sign?: string }> }).houses
  const houseList = THEME_HOUSES[theme].map((idx) =>
    buildHouseInfo(planets, chart.ascendant, houses, idx),
  )
  const keyPlanets = THEME_KEY_PLANETS[theme]
    .map((name) => {
      const p = getPlanet(planets, name)
      if (!p) return null
      return {
        name,
        sign: p.sign || '',
        house: ((p as { house?: number }).house ?? null) as number | null,
      }
    })
    .filter((p): p is NonNullable<typeof p> => !!p)

  // Strengths / cautions from aspect rules.
  const strengths: string[] = []
  const cautions: string[] = []
  for (const rule of ASPECT_RULES) {
    if (rule.theme !== theme) continue
    const aspects = aspectsByPlanet.get(rule.planet) || []
    for (const a of aspects) {
      if (a.type !== rule.aspectType) continue
      const otherName =
        ((a.from as { name?: string })?.name || '') === rule.planet
          ? (a.to as { name?: string })?.name || ''
          : (a.from as { name?: string })?.name || ''
      if (rule.partner && otherName !== rule.partner) continue
      if (rule.strength) strengths.push(rule.strength)
      if (rule.caution) cautions.push(rule.caution)
    }
  }

  // Narrative summary.
  const sigParts: string[] = []
  for (const kp of keyPlanets.slice(0, 2)) {
    const k = `${kp.name} ${SIGN_KEYWORD[kp.sign] || ''}${kp.house ? ` ${kp.house}H` : ''}`
    sigParts.push(k.trim())
  }
  const summary =
    sigParts.length > 0
      ? `이 영역은 ${sigParts.join(' / ')}의 결로 풀립니다. 해당 하우스의 별자리·행성이 주제를 색칠합니다.`
      : '이 영역은 다른 영역에 비해 외부 자극이 적은 결입니다.'

  // Advice — derived from strongest signal (first strength wins, else first caution).
  const advice =
    strengths.length > 0
      ? '강점을 먼저 신뢰하세요 — 자연스럽게 흐를 때 가장 큰 힘이 나옵니다.'
      : cautions.length > 0
        ? '주의 신호가 있는 영역이라 시간을 두고 천천히 다가가세요.'
        : '큰 굴곡 없이 균형을 유지하면 안정적으로 풀립니다.'

  return {
    theme,
    label: THEME_LABEL_KO[theme],
    emoji: THEME_EMOJI[theme],
    houses: houseList,
    keyPlanets,
    strengths,
    cautions,
    summary,
    advice,
  }
}

export function buildThemedAstroReading(chart: Chart): ThemedAstroOutput {
  const aspects = findNatalAspects(chart, { orbs: { default: 7 } })

  // Index aspects by planet for fast theme lookup.
  const byPlanet = new Map<string, typeof aspects>()
  for (const a of aspects) {
    const fromName = (a.from as { name?: string })?.name || ''
    const toName = (a.to as { name?: string })?.name || ''
    if (fromName) {
      const list = byPlanet.get(fromName) || []
      list.push(a)
      byPlanet.set(fromName, list)
    }
    if (toName && toName !== fromName) {
      const list = byPlanet.get(toName) || []
      list.push(a)
      byPlanet.set(toName, list)
    }
  }

  const themes: AstroTheme[] = ['love', 'career', 'wealth', 'health', 'family', 'spirituality']
  return {
    themes: themes.map((t) => buildThemeReading(t, chart, byPlanet)),
  }
}
