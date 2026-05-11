// astrology/astroScore.ts
// 점성 layer bundle → 연속점수 (0..100, 테마별).
// 모든 raw 계산은 astroLayers.ts 에서 이미 끝남 — 이 파일은 받기만.
//
// 설계 원칙:
//   1. 연속값 0..100 (다수결 X)
//   2. layer × planet × theme 3축 가중치
//   3. 모든 layer 가 점수에 기여 — neutral 디폴트 없음
//   4. 확신도 (confidence) 같이 출력

import type { Chart } from './foundation/types'
import type { AstroLayersBundle } from './astroLayers'

// ============================================================
// 1) 테마 정의 (사주와 동일 18테마)
// ============================================================
export type Theme =
  | 'love' | 'money' | 'career' | 'family' | 'health' | 'personality'
  | 'study' | 'children' | 'parents' | 'travel' | 'social' | 'business'
  | 'reputation' | 'spirituality' | 'karma' | 'crisis' | 'creativity' | 'legal'

const THEMES: Theme[] = [
  'love','money','career','family','health','personality',
  'study','children','parents','travel','social','business',
  'reputation','spirituality','karma','crisis','creativity','legal',
]

// ============================================================
// 2) 행성 × 테마 관련성 (Hellenistic 전통 기반)
// ============================================================
type PlanetName = 'Sun'|'Moon'|'Mercury'|'Venus'|'Mars'|'Jupiter'|'Saturn'|'Uranus'|'Neptune'|'Pluto'

const PLANET_THEME_RELEVANCE: Record<PlanetName, Partial<Record<Theme, number>>> = {
  Sun:     { career: 0.9, reputation: 0.9, health: 0.7, personality: 0.8, family: 0.4 },
  Moon:    { family: 0.9, health: 0.7, personality: 0.6, love: 0.5, parents: 0.8, children: 0.7 },
  Mercury: { study: 1.0, travel: 0.7, business: 0.7, social: 0.6, career: 0.5, legal: 0.6 },
  Venus:   { love: 1.0, money: 0.7, creativity: 0.9, social: 0.8, family: 0.5 },
  Mars:    { career: 0.7, crisis: 0.9, health: 0.7, business: 0.6, legal: 0.5 },
  Jupiter: { money: 1.0, career: 0.7, study: 0.8, travel: 0.8, reputation: 0.7, legal: 0.7, spirituality: 0.8 },
  Saturn:  { career: 0.8, karma: 0.9, parents: 0.7, business: 0.6, health: 0.6, reputation: 0.6 },
  Uranus:  { crisis: 0.7, creativity: 0.8, personality: 0.5, career: 0.4 },
  Neptune: { spirituality: 1.0, creativity: 0.7, karma: 0.5, crisis: 0.4 },
  Pluto:   { karma: 1.0, crisis: 0.9, money: 0.5, personality: 0.6, spirituality: 0.5 },
}

const PLANET_NATURE: Record<PlanetName, number> = {
  Sun: 0.3, Moon: 0.2, Mercury: 0.0,
  Venus: 0.8, Jupiter: 1.0,
  Mars: -0.7, Saturn: -0.5,
  Uranus: -0.2, Neptune: -0.1, Pluto: -0.3,
}

const ASPECT_HARMONY: Record<string, number> = {
  trine: 0.9,
  sextile: 0.6,
  square: -0.7,
  opposition: -0.8,
  semisextile: 0.2,
  quincunx: -0.3,
}

const HOUSE_THEMES: Record<number, Theme[]> = {
  1:  ['personality','health'],
  2:  ['money'],
  3:  ['study','social','travel'],
  4:  ['family','parents'],
  5:  ['love','children','creativity'],
  6:  ['health','career'],
  7:  ['love','social'],
  8:  ['karma','crisis','money'],
  9:  ['study','travel','spirituality','legal'],
  10: ['career','reputation','parents'],
  11: ['social','business','money'],
  12: ['spirituality','karma','crisis'],
}

const LAYER_WEIGHT = {
  dailyTransit: 1.0,
  eclipse:      1.5,
  lunarReturn:  0.8,
  solarReturn:  0.6,
  profection:   0.5,
  lots:         0.4,
  hourly:       0.3,
  retrograde:   0.4,
}

// ============================================================
// 헬퍼
// ============================================================
function asPlanet(name: string): PlanetName | null {
  if (['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(name)) {
    return name as PlanetName
  }
  return null
}

function relevance(planet: string, theme: Theme): number {
  const p = asPlanet(planet)
  if (!p) return 0.3
  return PLANET_THEME_RELEVANCE[p]?.[theme] ?? 0.3
}

function aspectVal(type: string, transitPlanet: string, natalPlanet: string, orb: number): number {
  const harmony = type === 'conjunction'
    ? (PLANET_NATURE[asPlanet(transitPlanet)!] ?? 0) * (PLANET_NATURE[asPlanet(natalPlanet)!] ?? 0) >= 0
        ? 0.8 : -0.8
    : ASPECT_HARMONY[type] ?? 0
  const orbFactor = Math.max(0, 1 - orb / 6)
  return harmony * orbFactor
}

// ============================================================
// 결과 타입
// ============================================================
export interface AstroScoreContribution {
  layer: string
  source: string
  themeScores: Partial<Record<Theme, number>>
  confidence: number
}

export interface AstroDayScore {
  overall: number                          // 0..100
  byTheme: Record<Theme, number>           // 0..100
  confidence: number                       // 0..1
  breakdown: AstroScoreContribution[]
}

// ============================================================
// 메인 — 받기만 함
// ============================================================
export function scoreAstroFromBundle(bundle: AstroLayersBundle, natal: Chart): AstroDayScore {
  const breakdown: AstroScoreContribution[] = []
  const themeAccum: Record<Theme, { sum: number; weight: number }> =
    THEMES.reduce((acc, t) => { acc[t] = { sum: 0, weight: 0 }; return acc }, {} as Record<Theme, { sum: number; weight: number }>)

  function addContrib(layer: string, source: string, themeContribs: Partial<Record<Theme, number>>, layerWeight: number, confidence = 1) {
    const themeScores: Partial<Record<Theme, number>> = {}
    for (const [theme, v] of Object.entries(themeContribs)) {
      if (v == null) continue
      const w = layerWeight * confidence
      themeAccum[theme as Theme].sum += v * w
      themeAccum[theme as Theme].weight += w
      themeScores[theme as Theme] = v
    }
    if (Object.keys(themeScores).length > 0) {
      breakdown.push({ layer, source, themeScores, confidence })
    }
  }

  const raw = bundle.raw

  // ─────────────────────────────────────────────────────────
  // Layer 1: Daily Transit aspects (raw.transitAspects)
  // ─────────────────────────────────────────────────────────
  if (raw.transitAspects) {
    for (const a of raw.transitAspects) {
      const fromName = a.from.name
      const toName = a.to.name
      const val = aspectVal(a.type, fromName, toName, a.orb)
      if (val === 0) continue
      const transitPlanet = asPlanet(fromName)
      if (!transitPlanet) continue
      const themeContribs: Partial<Record<Theme, number>> = {}
      for (const t of THEMES) {
        const rel = relevance(transitPlanet, t)
        if (rel < 0.1) continue
        const nature = PLANET_NATURE[transitPlanet] ?? 0
        themeContribs[t] = val * (1 + nature * 0.3) * rel
      }
      addContrib(
        'dailyTransit',
        `T:${fromName} ${a.type} N:${toName} (orb ${a.orb.toFixed(1)})`,
        themeContribs,
        LAYER_WEIGHT.dailyTransit,
        Math.max(0.3, 1 - a.orb / 6),
      )
    }
  }

  // ─────────────────────────────────────────────────────────
  // Layer 2: Retrograde
  // ─────────────────────────────────────────────────────────
  if (raw.retrogradePlanets) {
    for (const r of raw.retrogradePlanets) {
      const p = asPlanet(r)
      if (!p) continue
      const themeContribs: Partial<Record<Theme, number>> = {}
      for (const t of THEMES) {
        const rel = relevance(p, t)
        if (rel < 0.2) continue
        themeContribs[t] = -0.3 * rel
      }
      addContrib('retrograde', `${p} retrograde`, themeContribs, LAYER_WEIGHT.retrograde, 0.7)
    }
  }

  // ─────────────────────────────────────────────────────────
  // Layer 3: Eclipses
  // ─────────────────────────────────────────────────────────
  if (raw.eclipses) {
    for (const e of raw.eclipses) {
      const themeContribs: Partial<Record<Theme, number>> = {}
      for (const t of THEMES) {
        themeContribs[t] = ['crisis','karma','personality'].includes(t) ? -0.6 : -0.3
      }
      addContrib('eclipse', `${e.type} eclipse ${e.date}`, themeContribs, LAYER_WEIGHT.eclipse, 1.0)
    }
  }

  // ─────────────────────────────────────────────────────────
  // Layer 4: Profection
  // ─────────────────────────────────────────────────────────
  if (raw.profection) {
    const active = HOUSE_THEMES[raw.profection.activatedHouse] ?? []
    const themeContribs: Partial<Record<Theme, number>> = {}
    for (const t of active) themeContribs[t] = 0.4
    addContrib('profection', `Profection ${raw.profection.activatedHouse}궁`, themeContribs, LAYER_WEIGHT.profection, 0.8)
  }

  // ─────────────────────────────────────────────────────────
  // Layer 5: Solar Return — angular 행성 (1·4·7·10)
  // ─────────────────────────────────────────────────────────
  if (raw.solarReturn) {
    const themeContribs: Partial<Record<Theme, number>> = {}
    for (const p of raw.solarReturn.planets) {
      if (![1,4,7,10].includes(p.house)) continue
      const planet = asPlanet(p.name)
      if (!planet) continue
      const nature = PLANET_NATURE[planet]
      for (const t of THEMES) {
        const rel = relevance(planet, t)
        if (rel < 0.3) continue
        themeContribs[t] = (themeContribs[t] ?? 0) + nature * rel * 0.4
      }
    }
    addContrib('solarReturn', 'SR angular planets', themeContribs, LAYER_WEIGHT.solarReturn, 0.7)
  }

  // ─────────────────────────────────────────────────────────
  // Layer 6: Lunar Return — angular
  // ─────────────────────────────────────────────────────────
  if (raw.lunarReturn) {
    const themeContribs: Partial<Record<Theme, number>> = {}
    for (const p of raw.lunarReturn.planets) {
      if (![1,4,7,10].includes(p.house)) continue
      const planet = asPlanet(p.name)
      if (!planet) continue
      const nature = PLANET_NATURE[planet]
      for (const t of THEMES) {
        const rel = relevance(planet, t)
        if (rel < 0.3) continue
        themeContribs[t] = (themeContribs[t] ?? 0) + nature * rel * 0.3
      }
    }
    addContrib('lunarReturn', 'LR angular planets', themeContribs, LAYER_WEIGHT.lunarReturn, 0.7)
  }

  // ─────────────────────────────────────────────────────────
  // Layer 7: Arabic Lots (natal baseline)
  // ─────────────────────────────────────────────────────────
  if (raw.lots) {
    const lotThemes: Record<string, Theme[]> = {
      'Eros': ['love','creativity'],
      'Fortune': ['money','health'],
      'Spirit': ['career','reputation','spirituality'],
      'Necessity': ['karma','crisis'],
      'Courage': ['career','crisis'],
      'Victory': ['career','reputation'],
      'Nemesis': ['karma','crisis'],
    }
    for (const lot of raw.lots) {
      const themes = lotThemes[lot.name]
      if (!themes) continue
      const themeContribs: Partial<Record<Theme, number>> = {}
      for (const t of themes) themeContribs[t] = 0.15
      addContrib('lots', `Lot of ${lot.name}`, themeContribs, LAYER_WEIGHT.lots, 0.5)
    }
  }

  // ─────────────────────────────────────────────────────────
  // Layer 8: Planetary Hour
  // ─────────────────────────────────────────────────────────
  if (raw.planetaryHour) {
    const planet = raw.planetaryHour.planet as PlanetName
    const nature = PLANET_NATURE[planet]
    const themeContribs: Partial<Record<Theme, number>> = {}
    for (const t of THEMES) {
      const rel = relevance(planet, t)
      if (rel < 0.3) continue
      themeContribs[t] = nature * rel * 0.5
    }
    addContrib('hourly', `${planet} 행성시`, themeContribs, LAYER_WEIGHT.hourly, 0.6)
  }

  // ============================================================
  // 합산: themeAccum → 0..100
  // ============================================================
  const byTheme = {} as Record<Theme, number>
  for (const t of THEMES) {
    const { sum, weight } = themeAccum[t]
    if (weight === 0) { byTheme[t] = 50; continue }
    const normalized = sum / weight
    const clamped = Math.max(-1, Math.min(1, normalized))
    byTheme[t] = Math.round((clamped + 1) * 50)
  }

  const overall = Math.round(
    THEMES.reduce((acc, t) => acc + byTheme[t], 0) / THEMES.length,
  )

  const usedLayers = new Set(breakdown.map(b => b.layer)).size
  const confidence = Math.min(1, usedLayers / 7)

  // unused param warning 회피
  void natal

  return { overall, byTheme, confidence, breakdown }
}
