/**
 * Couple Extra Points — Lilith / Chiron / Vertex / Part of Fortune.
 *
 * These were computed by the astro engine but never wired into the
 * compatibility flow. Each adds a unique attraction/relationship layer:
 * - Chiron: 깊은 상처와 치유의 결 (서로 어디를 치유해주나)
 * - Lilith: 무의식적 끌림·금기·그림자
 * - Vertex: 운명적 만남 신호 (서로 vertex에 행성 합 → 깊은 끌림)
 * - Part of Fortune: 행복·기쁨의 자리 (어디서 함께 기쁨을 찾나)
 */

import type { Chart, ExtraPoint } from '@/lib/astrology/foundation/types'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import { extendChartWithExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import { calculateAllAsteroids, type Asteroid } from '@/lib/astrology/foundation/asteroids'

const SIGN_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

interface ExtraSet {
  chiron?: ExtraPoint
  lilith?: ExtraPoint
  partOfFortune?: ExtraPoint
  vertex?: ExtraPoint
}

function angleSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return Math.min(diff, 360 - diff)
}

interface CrossAspect {
  point: 'Chiron' | 'Lilith' | 'Vertex' | 'PartOfFortune' | 'Juno' | 'Vesta' | 'Pallas' | 'Ceres'
  to: string // partner planet name
  aspect: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile'
  orb: number
  meaning: string
}

const ASPECT_DEFS = [
  { type: 'conjunction', angle: 0, orb: 6 },
  { type: 'opposition', angle: 180, orb: 6 },
  { type: 'trine', angle: 120, orb: 5 },
  { type: 'square', angle: 90, orb: 5 },
  { type: 'sextile', angle: 60, orb: 4 },
] as const

const POINT_MEANING: Record<string, string> = {
  Chiron: '치유와 상처',
  Lilith: '그림자와 무의식적 끌림',
  Vertex: '운명적 만남',
  PartOfFortune: '함께하는 기쁨',
  Juno: '결혼 파트너의 결',
  Vesta: '깊은 헌신',
  Pallas: '지혜·전략적 사고',
  Ceres: '돌봄·양육',
}

const ASPECT_KO: Record<string, string> = {
  conjunction: '합 (강한 결합)',
  opposition: '대립 (정반대 끌림)',
  trine: '부드러운 흐름',
  square: '팽팽한 자극',
  sextile: '잔잔한 호응',
}

function detectCrossAspects(
  selfExtras: ExtraSet,
  selfAsteroids: { Juno?: Asteroid; Vesta?: Asteroid; Pallas?: Asteroid; Ceres?: Asteroid },
  partnerChart: Chart
): CrossAspect[] {
  const out: CrossAspect[] = []
  const targetPlanets: Array<{ name: string; longitude: number }> = []
  for (const p of partnerChart.planets) {
    if (['Sun', 'Moon', 'Venus', 'Mars', 'Mercury', 'Saturn'].includes(p.name)) {
      targetPlanets.push({ name: p.name, longitude: p.longitude })
    }
  }
  // ASC + MC
  if (partnerChart.ascendant) {
    targetPlanets.push({ name: 'Ascendant', longitude: partnerChart.ascendant.longitude })
  }
  if (partnerChart.mc) {
    targetPlanets.push({ name: 'MC', longitude: partnerChart.mc.longitude })
  }

  const points: Array<{ key: keyof typeof POINT_MEANING; lon?: number }> = [
    { key: 'Chiron', lon: selfExtras.chiron?.longitude },
    { key: 'Lilith', lon: selfExtras.lilith?.longitude },
    { key: 'Vertex', lon: selfExtras.vertex?.longitude },
    { key: 'PartOfFortune', lon: selfExtras.partOfFortune?.longitude },
    { key: 'Juno', lon: selfAsteroids.Juno?.longitude },
    { key: 'Vesta', lon: selfAsteroids.Vesta?.longitude },
    { key: 'Pallas', lon: selfAsteroids.Pallas?.longitude },
    { key: 'Ceres', lon: selfAsteroids.Ceres?.longitude },
  ]

  for (const pt of points) {
    if (pt.lon == null) continue
    for (const tp of targetPlanets) {
      const sep = angleSeparation(pt.lon, tp.longitude)
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(sep - def.angle)
        if (orb <= def.orb) {
          out.push({
            point: pt.key as CrossAspect['point'],
            to: tp.name,
            aspect: def.type as CrossAspect['aspect'],
            orb: Math.round(orb * 10) / 10,
            meaning: `${POINT_MEANING[pt.key]} ↔ ${tp.name}: ${ASPECT_KO[def.type]}`,
          })
          break
        }
      }
    }
  }

  // Sort by tightness (lowest orb first), keep top 8 (more points = more aspects to surface)
  return out.sort((a, b) => a.orb - b.orb).slice(0, 8)
}

interface PersonExtras {
  chiron: string | null
  lilith: string | null
  vertex: string | null
  partOfFortune: string | null
  juno: string | null
  vesta: string | null
  pallas: string | null
  ceres: string | null
}

export interface CoupleExtraPointsResult {
  p1: PersonExtras
  p2: PersonExtras
  crossAspects: {
    p1ToP2: CrossAspect[]
    p2ToP1: CrossAspect[]
  }
  summary: string[]
}

function describeExtra(p?: ExtraPoint | Asteroid): string | null {
  if (!p) return null
  return `${SIGN_KO[p.sign] || p.sign} ${Math.round(p.degree)}도 (${p.house}하우스)`
}

export function analyzeCoupleExtraPoints(
  natalA: NatalChartData | Chart,
  natalB: NatalChartData | Chart,
  latA: number,
  lonA: number,
  latB: number,
  lonB: number
): CoupleExtraPointsResult | null {
  try {
    const jdA = (natalA as Chart).meta?.jdUT
    const jdB = (natalB as Chart).meta?.jdUT
    if (jdA == null || jdB == null) return null

    const extA = extendChartWithExtraPoints(natalA as Chart, jdA, latA, lonA)
    const extB = extendChartWithExtraPoints(natalB as Chart, jdB, latB, lonB)

    const p1Extras: ExtraSet = {
      chiron: extA.chiron,
      lilith: extA.lilith,
      vertex: extA.vertex,
      partOfFortune: extA.partOfFortune,
    }
    const p2Extras: ExtraSet = {
      chiron: extB.chiron,
      lilith: extB.lilith,
      vertex: extB.vertex,
      partOfFortune: extB.partOfFortune,
    }

    // Asteroids — Juno (결혼), Vesta (헌신), Pallas (지혜), Ceres (돌봄)
    const houseCuspsA = (natalA as Chart).houses.map((h) => h.cusp)
    const houseCuspsB = (natalB as Chart).houses.map((h) => h.cusp)
    const asteroidsA = calculateAllAsteroids(jdA, houseCuspsA)
    const asteroidsB = calculateAllAsteroids(jdB, houseCuspsB)

    const p1Asteroids = {
      Juno: asteroidsA.Juno,
      Vesta: asteroidsA.Vesta,
      Pallas: asteroidsA.Pallas,
      Ceres: asteroidsA.Ceres,
    }
    const p2Asteroids = {
      Juno: asteroidsB.Juno,
      Vesta: asteroidsB.Vesta,
      Pallas: asteroidsB.Pallas,
      Ceres: asteroidsB.Ceres,
    }

    const p1ToP2 = detectCrossAspects(p1Extras, p1Asteroids, extB)
    const p2ToP1 = detectCrossAspects(p2Extras, p2Asteroids, extA)

    // Summary highlights
    const summary: string[] = []

    // Strongest signal: vertex conjunction with partner's Sun/Moon/Venus/Mars
    const vertexHits = [...p1ToP2, ...p2ToP1].filter(
      (a) =>
        a.point === 'Vertex' &&
        a.aspect === 'conjunction' &&
        ['Sun', 'Moon', 'Venus', 'Mars'].includes(a.to)
    )
    if (vertexHits.length > 0) {
      summary.push(
        `운명점(Vertex)이 상대 ${vertexHits[0].to}와 합 — 두 분의 만남에 운명적 신호가 강하게 흐름`
      )
    }

    // Chiron healing
    const chironHits = [...p1ToP2, ...p2ToP1].filter(
      (a) => a.point === 'Chiron' && (a.aspect === 'conjunction' || a.aspect === 'trine')
    )
    if (chironHits.length > 0) {
      summary.push(
        `상처점(Chiron)이 상대 ${chironHits[0].to}와 ${ASPECT_KO[chironHits[0].aspect]} — 두 분이 서로의 깊은 상처를 치유해주는 결`
      )
    }

    // Lilith shadow
    const lilithHits = [...p1ToP2, ...p2ToP1].filter(
      (a) => a.point === 'Lilith' && a.aspect === 'conjunction' && ['Sun', 'Mars', 'Venus'].includes(a.to)
    )
    if (lilithHits.length > 0) {
      summary.push(
        `그림자점(Lilith)이 상대 ${lilithHits[0].to}와 합 — 무의식적 강한 끌림과 동시에 금기적 긴장이 공존`
      )
    }

    // POF
    const pofHits = [...p1ToP2, ...p2ToP1].filter(
      (a) => a.point === 'PartOfFortune' && (a.aspect === 'conjunction' || a.aspect === 'trine')
    )
    if (pofHits.length > 0) {
      summary.push(
        `행복점(POF)이 상대 ${pofHits[0].to}와 ${ASPECT_KO[pofHits[0].aspect]} — 함께할 때 자연스러운 기쁨과 운이 흐르는 결`
      )
    }

    // Juno (결혼점) — strongest signal for marriage compatibility
    const junoHits = [...p1ToP2, ...p2ToP1].filter(
      (a) =>
        a.point === 'Juno' &&
        (a.aspect === 'conjunction' || a.aspect === 'trine' || a.aspect === 'sextile') &&
        ['Sun', 'Moon', 'Venus', 'Mars'].includes(a.to)
    )
    if (junoHits.length > 0) {
      summary.push(
        `결혼점(Juno)이 상대 ${junoHits[0].to}와 ${ASPECT_KO[junoHits[0].aspect]} — 결혼 파트너로서 깊이 어울리는 신호`
      )
    }

    // Vesta (헌신점) — devotion / shared focus
    const vestaHits = [...p1ToP2, ...p2ToP1].filter(
      (a) => a.point === 'Vesta' && (a.aspect === 'conjunction' || a.aspect === 'trine')
    )
    if (vestaHits.length > 0) {
      summary.push(
        `헌신점(Vesta)이 상대 ${vestaHits[0].to}와 ${ASPECT_KO[vestaHits[0].aspect]} — 깊은 헌신과 공동 목표가 자연스럽게 흐르는 결`
      )
    }

    // Pallas (지혜점) — intellectual partnership
    const pallasHits = [...p1ToP2, ...p2ToP1].filter(
      (a) =>
        a.point === 'Pallas' &&
        (a.aspect === 'conjunction' || a.aspect === 'trine' || a.aspect === 'sextile') &&
        ['Mercury', 'Sun'].includes(a.to)
    )
    if (pallasHits.length > 0) {
      summary.push(
        `지혜점(Pallas)이 상대 ${pallasHits[0].to}와 만남 — 지적 동반자, 함께 문제 해결하는 결`
      )
    }

    return {
      p1: {
        chiron: describeExtra(p1Extras.chiron),
        lilith: describeExtra(p1Extras.lilith),
        vertex: describeExtra(p1Extras.vertex),
        partOfFortune: describeExtra(p1Extras.partOfFortune),
        juno: describeExtra(p1Asteroids.Juno),
        vesta: describeExtra(p1Asteroids.Vesta),
        pallas: describeExtra(p1Asteroids.Pallas),
        ceres: describeExtra(p1Asteroids.Ceres),
      },
      p2: {
        chiron: describeExtra(p2Extras.chiron),
        lilith: describeExtra(p2Extras.lilith),
        vertex: describeExtra(p2Extras.vertex),
        partOfFortune: describeExtra(p2Extras.partOfFortune),
        juno: describeExtra(p2Asteroids.Juno),
        vesta: describeExtra(p2Asteroids.Vesta),
        pallas: describeExtra(p2Asteroids.Pallas),
        ceres: describeExtra(p2Asteroids.Ceres),
      },
      crossAspects: { p1ToP2, p2ToP1 },
      summary,
    }
  } catch {
    return null
  }
}
