// src/lib/astrology/foundation/aspects.ts

import { ASPECT_ANGLES, AspectHit, AspectRules, AspectType, Chart } from './types'
import { shortestAngle } from './utils'
import { clamp } from '@/lib/utils/math'
import { evaluateAspect, AspectEngineConfig } from './aspectCore'

// ===== Hellenistic whole-sign regard helpers =====
// 사인 0=Aries..11=Pisces. 두 점이 같은 사인 = 0, 6번째 차이 = opposition 등.
// (영문 사인 이름만 인덱스가 살아있으면 OK. ZodiacKo 도 영문 12개.)
const SIGN_IDX: Record<string, number> = {
  Aries: 0,
  Taurus: 1,
  Gemini: 2,
  Cancer: 3,
  Leo: 4,
  Virgo: 5,
  Libra: 6,
  Scorpio: 7,
  Sagittarius: 8,
  Capricorn: 9,
  Aquarius: 10,
  Pisces: 11,
}
function lonToSignIdx(lon: number): number {
  const norm = ((lon % 360) + 360) % 360
  return Math.floor(norm / 30)
}
const WHOLE_SIGN_DIST: Partial<Record<AspectType, number>> = {
  conjunction: 0,
  sextile: 2,
  square: 3,
  trine: 4,
  opposition: 6,
}
/**
 * Hellenistic whole-sign regard 판정.
 * 두 점의 사인 거리(0..6) 가 aspect 의 expected sign-distance 와 일치하면 true.
 * sextile=2, square=3, trine=4, opposition=6, conjunction=0 (같은 사인).
 * minor aspect 는 whole-sign 에서는 의미 없음 (정통 헬레니즘이 minor 를 안 다룸).
 */
function isWholeSignRegard(lonA: number, lonB: number, aspect: AspectType): boolean {
  const expected = WHOLE_SIGN_DIST[aspect]
  if (expected === undefined) return false
  const a = lonToSignIdx(lonA)
  const b = lonToSignIdx(lonB)
  const diff = Math.min((a - b + 12) % 12, (b - a + 12) % 12)
  return diff === expected
}

const MAJOR_ASPECTS: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition']
// Hellenistic 정통화 (Phase 2): minor aspect 5종은 비정통 (Kepler/Lilly 이후 modern 영역).
// 외부 호출자가 rules.aspects 에 명시적으로 넣어도 resolveAspectList 에서 필터링.
const BLOCKED_MINOR = new Set<AspectType>([
  'semisextile',
  'quincunx',
  'quintile',
  'biquintile',
  'sesquiquadrate',
])

// 어스펙트 각도는 공용 SSOT(ASPECT_ANGLES, foundation/types) 사용.
const DESIRED_ANGLES = ASPECT_ANGLES

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
    case 'sesquiquadrate':
      return 0.65
    case 'semisextile':
      return 0.64
    default:
      return 0.7
  }
}

function desiredAngle(a: AspectType) {
  return DESIRED_ANGLES[a]
}

// Hellenistic moiety (per-planet half-orb) policy.
// 정통 헬레니즘 ~ 르네상스 (Lilly/Ptolemy 흐름): 각 행성은 고유한 orb 가 있고,
// 두 행성 사이 aspect 의 maximal orb = (moietyA + moietyB) / 2.
// (Pseudo-Ptolemaic / Lilly Christian Astrology 표 기반)
//   Sun 15, Moon 12, Mercury 7, Venus 7, Mars 8, Jupiter 9, Saturn 9.
//   외행성/Node/Chiron/Lilith 는 비정통 → 5 (좁게).
//
// 이전엔 Robert Hand modern 8° 단일 정책 + 행성별 5-8° 분리 운영. 그 잔재는
// getOrbLimitByName 에 fallback 으로 남겨둔다 (callers 가 명시 rules.orbs 를
// 넘기는 경로용). 기본 path 는 PLANET_MOIETY → pairMoietyOrb 로 흐른다.
const PLANET_MOIETY: Record<string, number> = {
  Sun: 15,
  Moon: 12,
  Mercury: 7,
  Venus: 7,
  Mars: 8,
  Jupiter: 9,
  Saturn: 9,
  // 외행성·노드·키론·릴리스 — 헬레니즘에서 다루지 않음. 좁은 5 로 통일.
  Uranus: 5,
  Neptune: 5,
  Pluto: 5,
  'True Node': 5,
  'Mean Node': 5,
  Chiron: 5,
  Lilith: 5,
  // ASC/MC 는 angle — sect light 와 동급 권한 (Lilly 5; 일부 학파 12).
  // 보수적 5 로 시작.
  Ascendant: 5,
  MC: 5,
}

/**
 * 두 점 사이 aspect 의 maximal orb (Hellenistic pair moiety).
 * = (moietyA + moietyB) / 2.
 * rules.orbs 가 명시되면 그쪽이 우선 (legacy 경로 호환).
 */
function pairMoietyOrb(aName: string, bName: string, rules: AspectRules = {}): number {
  if (rules.orbs && Object.keys(rules.orbs).length > 0) {
    // legacy 경로 — 둘 중 더 큰 per-name limit 사용 (기존 동작).
    return Math.max(getOrbLimitByName(aName, rules), getOrbLimitByName(bName, rules))
  }
  const a = PLANET_MOIETY[aName] ?? 5
  const b = PLANET_MOIETY[bName] ?? 5
  return (a + b) / 2
}

// Legacy per-name orb (modern Hand-style). 호출자가 rules.orbs 를 명시할 때만 활성.
// 새 코드 경로(pairMoietyOrb) 가 기본이지만 외부 callers 가 orbs 를 명시하면 우선.
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
function applyingFlagByTarget(
  lonA: number,
  lonB: number,
  relSpeed: number,
  target: number
): boolean {
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
  // 정통 Hellenistic: minor aspect 는 항상 차단. rules.aspects 가 명시돼도 minor 는 필터.
  // includeMinor=true 옵션은 backward compat 위해 받지만 무시.
  if (rules.aspects) {
    return rules.aspects.filter((a) => !BLOCKED_MINOR.has(a))
  }
  return MAJOR_ASPECTS
}

/**
 * 🌟 안전하게 비어 있는 차트 데이터를 허용하는 findAspects 함수
 */
export function findAspects(natal: Chart, transit: Chart, rules: AspectRules = {}): AspectHit[] {
  const aspects = resolveAspectList(rules)
  const maxResults = rules.maxResults ?? 50
  const useWholeSign = rules.useWholeSign === true

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

  // 현재 바깥 루프(transit source)의 속도 — limit/score 의 speedFactor·
  // speedWeight 이 source 행성마다 달라지므로 클로저로 캡처한다. 코어
  // config 콜백은 (이름, sep, relSpeed) 만 받지만 limit 보정에 source 속도가
  // 필요해서 이 변수로 흘려준다. (기존 인라인 산술과 1:1 동일.)
  let currentSourceSpeed = 0

  // 트랜짓-네이탈(synastry/transit overlay) 엔진 config.
  // 코어에 주입하지만 orb/limit/applying/score 식은 기존 findAspects 와 동일.
  // useWholeSign 모드: computeOrb 는 sign 거리 만족이면 0, 아니면 999 반환.
  // limit 은 항상 1 → orb=0(매치) 만 accept, orb=999(미매치) 는 reject.
  // 이렇게 하면 evaluateAspect 의 일반 path 를 그대로 쓰면서도 sign-based regard 가능.
  const config: AspectEngineConfig = {
    desiredAngle: (a) => desiredAngle(a),
    computeOrb: (sep, target) => Math.abs(sep - target),
    computeLimit: (aName, bName, a) => {
      const pairOverride = getPairOrbOverride(aName, bName, a, rules)
      // Hellenistic moiety pair orb (정통). rules.orbs 가 명시되면 legacy max-per-name 사용.
      const baseLimit = pairMoietyOrb(aName, bName, rules)
      const aspectDefault = rules.perAspectOrbs?.[a]
      let limit = pairOverride ?? aspectDefault ?? baseLimit
      // 빠른/느린 행성에 따른 미세 보정 (source 속도 기준).
      const speedAbs = Math.abs(currentSourceSpeed)
      const speedFactor = clamp(1 + (speedAbs - 1) * 0.1, 0.85, 1.15)
      limit *= speedFactor
      return limit
    },
    // 코어가 evaluateAspect 안에서 targetAngle 을 계산해 넘겨주므로 target 으로
    // 직접 판정한다 (기존 applyingFlag(…, aspectType) 과 동일한 결과).
    isApplying: (lonA, lonB, relSpeed, target) =>
      applyingFlagByTarget(lonA, lonB, relSpeed, target),
    computeScore: ({ orb, limit, applying, relSpeed, aspect }) => {
      const orbWeight = 1 - orb / Math.max(limit, 1e-6)
      const aspectWeight = baseAspectWeight(aspect)
      const speedWeight = clamp(Math.abs(relSpeed) / 1.2, 0.6, 1.2) // 상대속도 클수록 약간 가중
      return (
        wOrb * orbWeight +
        wAsp * aspectWeight +
        wSpd * (applying ? speedWeight : speedWeight * 0.95)
      )
    },
  }

  for (const t of transitSources) {
    for (const n of natalTargets) {
      const sep = shortestAngle(t.longitude, n.longitude)
      const relSpeed = (t.speed ?? 0) - (('speed' in n ? n.speed : 0) ?? 0)
      currentSourceSpeed = t.speed ?? 0
      for (const a of aspects) {
        // Hellenistic whole-sign: sign 거리만 보고 accept. orb=0 으로 보고.
        if (useWholeSign) {
          if (!isWholeSignRegard(t.longitude, n.longitude, a)) continue
          // applying/score 는 degree-based 와 호환되게 합리적 디폴트.
          const applying = applyingFlagByTarget(t.longitude, n.longitude, relSpeed, desiredAngle(a))
          const score = 0.6 + 0.3 * baseAspectWeight(a) // whole-sign 은 항상 같은 base score
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
            orb: 0,
            applying,
            score: Number(score.toFixed(3)),
          })
          break
        }
        const evalResult = evaluateAspect(
          t.name,
          t.longitude,
          n.name,
          n.longitude,
          sep,
          relSpeed,
          a,
          config
        )

        if (evalResult.accepted) {
          const orb = evalResult.orb
          const applying = evalResult.applying
          const score = evalResult.score

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
  const useWholeSign = rules.useWholeSign === true
  const ps = Array.isArray(natal?.planets) ? natal.planets : []
  const hits: AspectHit[] = []

  const wOrb = rules.scoring?.weights?.orb ?? 0.55
  const wAsp = rules.scoring?.weights?.aspect ?? 0.45
  const wSpd = rules.scoring?.weights?.speed ?? 0.0

  // 네이탈(차트 내부) 엔진 config. findAspects 와 *알고리즘* 은 공유하지만
  // 튜닝은 distinct: orb 한도 +3°(넓게), score 가중치도 다름, applying 은
  // 고정 (applying?1:0.95). 기존 인라인 산술과 1:1 동일.
  const config: AspectEngineConfig = {
    desiredAngle: (a) => DESIRED_ANGLES[a],
    computeOrb: (sep, target) => Math.abs(sep - target),
    computeLimit: (aName, bName, a) => {
      const pairOverride = getPairOrbOverride(aName, bName, a, rules)
      // Natal 차트는 transit 대비 +3 (natal aspect 는 일생 유지되므로 더 관대).
      // Hellenistic moiety 기준 + 3 (legacy 동작 유지).
      const baseLimit = pairMoietyOrb(aName, bName, rules) + 3
      const aspectDefault = rules.perAspectOrbs?.[a]
      return pairOverride ?? aspectDefault ?? baseLimit
    },
    isApplying: (lonA, lonB, relSpeed, target) =>
      applyingFlagByTarget(lonA, lonB, relSpeed, target),
    computeScore: ({ orb, limit, applying, aspect }) => {
      const orbWeight = 1 - orb / Math.max(limit, 1e-6)
      const aspectWeight = baseAspectWeight(aspect)
      return wOrb * orbWeight + wAsp * aspectWeight + wSpd * (applying ? 1 : 0.95)
    },
  }

  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const A = ps[i],
        B = ps[j]
      const sep = shortestAngle(A.longitude, B.longitude)
      const relSpeed = (A.speed ?? 0) - (B.speed ?? 0)
      for (const t of aspects) {
        if (useWholeSign) {
          if (!isWholeSignRegard(A.longitude, B.longitude, t)) continue
          const applying = applyingFlagByTarget(
            A.longitude,
            B.longitude,
            relSpeed,
            DESIRED_ANGLES[t]
          )
          const score = 0.6 + 0.35 * baseAspectWeight(t)
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
            orb: 0,
            applying,
            score: Number(score.toFixed(3)),
          })
          break
        }
        const evalResult = evaluateAspect(
          A.name,
          A.longitude,
          B.name,
          B.longitude,
          sep,
          relSpeed,
          t,
          config
        )

        if (evalResult.accepted) {
          const orb = evalResult.orb
          const applying = evalResult.applying
          const score = evalResult.score

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
