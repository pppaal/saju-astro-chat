// src/lib/astrology/foundation/aspects.ts

import { AspectHit, AspectRules, AspectType, Chart } from './types'
import { shortestAngle } from './utils'
import { clamp } from '@/lib/utils/math'

const MAJOR_ASPECTS: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition']
const MINOR_ASPECTS: AspectType[] = ['semisextile', 'quincunx', 'quintile', 'biquintile']

const DESIRED_ANGLES: Record<AspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
  semisextile: 30,
  quincunx: 150,
  quintile: 72,
  biquintile: 144,
}

function baseAspectWeight(a: AspectType) {
  switch (a) {
    case 'conjunction':
      return 1.0
    case 'opposition':
      return 0.96
    case 'square':
      return 0.92
    case 'trine':
      return 0.88
    case 'sextile':
      return 0.8
    case 'quincunx':
      return 0.7
    case 'quintile':
      return 0.68
    case 'biquintile':
      return 0.66
    case 'semisextile':
      return 0.64
    default:
      return 0.7
  }
}

function desiredAngle(a: AspectType) {
  return DESIRED_ANGLES[a]
}

// Orb defaults follow Robert Hand's modern standard (Planets in Transit / Horoscope Symbols).
// Previous values were 4-5x narrower — they reliably missed real natal/transit aspects
// that any traditional astrologer would interpret. Callers can still override via
// AspectRules.orbs when tighter tolerance is needed (e.g. composite charts).
function getOrbLimitByName(name: string, rules: AspectRules) {
  const { orbs = {} } = rules
  if (name === 'Sun') {
    return orbs.Sun ?? 8
  }
  if (name === 'Moon') {
    return orbs.Moon ?? 8
  }
  if (['Mercury', 'Venus', 'Mars'].includes(name)) {
    return orbs.inner ?? 6
  }
  if (['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(name)) {
    return orbs.outer ?? 5
  }
  if (['Ascendant', 'MC'].includes(name)) {
    return orbs.angles ?? 5
  }
  return orbs.default ?? 4
}

function getPairOrbOverride(aName: string, bName: string, aType: AspectType, rules: AspectRules) {
  const key1 = `${aName}|${bName}|${aType}`
  const key2 = `${bName}|${aName}|${aType}`
  const tbl = rules.perPairOrbs ?? {}
  return tbl[key1] ?? tbl[key2]
}

function orbOf(sep: number, a: AspectType) {
  return Math.abs(sep - desiredAngle(a))
}

/**
 * applying(접근) vs separating(분리) 판단 — 두 행성이 exact aspect 위치로
 * 가까워지는 중이면 true.
 *
 * 이전 구현 회귀: 인자가 `sep`(=shortestAngle, 0..180 부호 없는 값) 라서
 * "A 가 B 보다 앞/뒤" 정보가 손실됐다. 결과: conjunction(target=0) 케이스에
 * 서 delta=sep≥0 항상 양수 → 한 분기만 활성, 다른 분기는 dead. 진짜 분리/
 * 접근 구분 불가.
 *
 * 올바른 공식: 두 행성 사이의 부호 있는 짧은 거리(signedSep ∈ (-180, 180])
 * + relSpeed 의 부호 비교. signedSep 부호가 relSpeed 부호와 같으면 빠른
 * 행성이 느린 행성으로부터 멀어지는 중(separating), 다르면 접근 중(applying).
 */
function applyingFlag(lonA: number, lonB: number, relSpeed: number, a: AspectType): boolean {
  const target = desiredAngle(a)
  // 부호 있는 짧은 거리: B 기준 A 의 위치. 양수 = A 가 B 보다 앞.
  const signedSep = ((lonA - lonB + 540) % 360) - 180
  const absSep = Math.abs(signedSep)
  // orb 가 target 이랑 같을 때(=exact) applying/separating 의미가 모호 → false
  // (separating 보단 보수적으로 처리).
  if (absSep === target) return false
  // 현재 orb 가 target 보다 크면 행성이 가까워져야 applying.
  // signedSep 의 부호가 relSpeed 부호와 반대면 가까워지는 중.
  if (absSep > target) {
    return (signedSep > 0 && relSpeed < 0) || (signedSep < 0 && relSpeed > 0)
  }
  // 현재 orb 가 target 보다 작으면 행성이 멀어져야 applying (target 을 향해
  // 반대편에서 다시 접근). signedSep 부호가 relSpeed 부호와 같으면 멀어지는 중.
  return (signedSep > 0 && relSpeed > 0) || (signedSep < 0 && relSpeed < 0)
}

function resolveAspectList(rules: AspectRules) {
  if (rules.aspects) {
    return rules.aspects
  }
  return rules.includeMinor ? [...MAJOR_ASPECTS, ...MINOR_ASPECTS] : MAJOR_ASPECTS
}

/**
 * 🌟 안전하게 비어 있는 차트 데이터를 허용하는 findAspects 함수
 */
export function findAspects(natal: Chart, transit: Chart, rules: AspectRules = {}): AspectHit[] {
  const aspects = resolveAspectList(rules)
  const maxResults = rules.maxResults ?? 50

  // ✅ 안전하게 undefined 체크
  const natalPlanets = Array.isArray(natal?.planets) ? natal.planets : []
  const transitPlanets = Array.isArray(transit?.planets) ? transit.planets : []

  const natalTargets = [
    ...natalPlanets.map((p) => ({
      name: p.name,
      kind: 'natal' as const,
      longitude: p.longitude,
      house: p.house,
      sign: p.sign,
      speed: p.speed,
    })),
    { name: 'Ascendant', kind: 'natal' as const, longitude: natal?.ascendant?.longitude ?? 0 },
    { name: 'MC', kind: 'natal' as const, longitude: natal?.mc?.longitude ?? 0 },
  ]

  const transitSources = transitPlanets.map((p) => ({
    name: p.name,
    kind: 'transit' as const,
    longitude: p.longitude,
    house: p.house,
    sign: p.sign,
    speed: p.speed,
  }))

  const hits: AspectHit[] = []
  const wOrb = rules.scoring?.weights?.orb ?? 0.5
  const wAsp = rules.scoring?.weights?.aspect ?? 0.4
  const wSpd = rules.scoring?.weights?.speed ?? 0.1

  for (const t of transitSources) {
    for (const n of natalTargets) {
      const sep = shortestAngle(t.longitude, n.longitude)
      const relSpeed = (t.speed ?? 0) - (('speed' in n ? n.speed : 0) ?? 0)
      for (const a of aspects) {
        const orb = orbOf(sep, a)
        const pairOverride = getPairOrbOverride(t.name, n.name, a, rules)
        const baseLimit = Math.max(
          getOrbLimitByName(t.name, rules),
          getOrbLimitByName(n.name, rules)
        )
        const aspectDefault = rules.perAspectOrbs?.[a]
        let limit = pairOverride ?? aspectDefault ?? baseLimit

        // 빠른/느린 행성에 따른 미세 보정
        const speedAbs = Math.abs(t.speed ?? 0)
        const speedFactor = clamp(1 + (speedAbs - 1) * 0.1, 0.85, 1.15)
        limit *= speedFactor

        if (orb <= limit) {
          const orbWeight = 1 - orb / Math.max(limit, 1e-6)
          const aspectWeight = baseAspectWeight(a)
          const speedWeight = clamp(Math.abs(relSpeed) / 1.2, 0.6, 1.2) // 상대속도 클수록 약간 가중
          const applying = applyingFlag(t.longitude, n.longitude, relSpeed, a)
          const score =
            wOrb * orbWeight +
            wAsp * aspectWeight +
            wSpd * (applying ? speedWeight : speedWeight * 0.95)

          hits.push({
            from: {
              name: t.name,
              kind: 'transit',
              longitude: t.longitude,
              house: t.house,
              sign: t.sign,
            },
            to: {
              name: n.name,
              kind: 'natal',
              longitude: n.longitude,
              house: 'house' in n ? n.house : undefined,
              sign: 'sign' in n ? n.sign : undefined,
            },
            type: a,
            orb: Number(orb.toFixed(2)),
            applying,
            score: Number(score.toFixed(3)),
          })
          break
        }
      }
    }
  }

  return hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, maxResults)
}

/**
 * 🌟 네이탈 차트 내부 요소 간의 Aspect 계산
 */
export function findNatalAspects(natal: Chart, rules: AspectRules = {}): AspectHit[] {
  const aspects = resolveAspectList(rules)
  const maxResults = rules.maxResults ?? 100
  const ps = Array.isArray(natal?.planets) ? natal.planets : []
  const hits: AspectHit[] = []

  const wOrb = rules.scoring?.weights?.orb ?? 0.55
  const wAsp = rules.scoring?.weights?.aspect ?? 0.45
  const wSpd = rules.scoring?.weights?.speed ?? 0.0

  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const A = ps[i],
        B = ps[j]
      const sep = shortestAngle(A.longitude, B.longitude)
      const relSpeed = (A.speed ?? 0) - (B.speed ?? 0)
      for (const t of aspects) {
        const orb = Math.abs(sep - DESIRED_ANGLES[t])
        const pairOverride = getPairOrbOverride(A.name, B.name, t, rules)
        const baseLimit =
          Math.max(getOrbLimitByName(A.name, rules), getOrbLimitByName(B.name, rules)) + 3 // natal은 +3
        const aspectDefault = rules.perAspectOrbs?.[t]
        const limit = pairOverride ?? aspectDefault ?? baseLimit

        if (orb <= limit) {
          const orbWeight = 1 - orb / Math.max(limit, 1e-6)
          const aspectWeight = baseAspectWeight(t)
          const applying = applyingFlag(A.longitude, B.longitude, relSpeed, t)
          const score = wOrb * orbWeight + wAsp * aspectWeight + wSpd * (applying ? 1 : 0.95)

          hits.push({
            from: {
              name: A.name,
              kind: 'natal',
              longitude: A.longitude,
              house: A.house,
              sign: A.sign,
            },
            to: {
              name: B.name,
              kind: 'natal',
              longitude: B.longitude,
              house: B.house,
              sign: B.sign,
            },
            type: t,
            orb: Number(orb.toFixed(2)),
            applying,
            score: Number(score.toFixed(3)),
          })
          break
        }
      }
    }
  }
  return hits.sort((x, y) => (y.score ?? 0) - (x.score ?? 0)).slice(0, maxResults)
}
