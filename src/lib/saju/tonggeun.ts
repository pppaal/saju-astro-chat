// src/lib/Saju/tonggeun.ts
// 통근(通根), 투출(透出), 회국(會局) 계산 모듈
// 일간 및 오행의 실제 힘을 정밀하게 계산

import { FiveElement, SajuPillarsInput, MaybeTimeless } from './types'
import { JIJANGGAN } from './constants'
import { THREE_HARMONY, DIRECTIONAL_HARMONY } from './relationTables'
import { getStemElement } from './stemBranchUtils'
import { JIJANGGAN_WEIGHTS } from './strengthScore'

// Re-export for backward compatibility
export type { SajuPillarsInput }

/**
 * 통근 결과
 */
export interface TonggeunResult {
  stem: string
  roots: Array<{
    branch: string
    pillar: 'year' | 'month' | 'day' | 'time'
    hiddenStem: string
    type: '정기' | '중기' | '여기'
    strength: number // 0-100
  }>
  totalStrength: number // 통근력 총합
  hasRoot: boolean // 통근 여부
}

/**
 * 투출 결과
 */
export interface TuechulResult {
  branch: string
  pillar: 'year' | 'month' | 'day' | 'time'
  hiddenStems: Array<{
    stem: string
    type: '정기' | '중기' | '여기'
    transparent: boolean // 천간에 투출되었는지
    transparentPillar?: 'year' | 'month' | 'day' | 'time'
  }>
}

/**
 * 회국 결과
 */
export interface HoegukResult {
  type: '삼합' | '방합' | '반합'
  branches: string[]
  resultElement: FiveElement
  complete: boolean // 완전한 합인지
  strength: number // 회국 강도 (0-100)
}

/**
 * 득령 결과
 */
export interface DeukryeongResult {
  daymaster: string
  monthBranch: string
  status: '득령' | '실령' | '평령'
  strength: number // 득령 강도 (-100 ~ 100)
  description: string
}

// ============ 통근 계산 ============

/**
 * 지장간 강도 — 정기 > 중기 > 여기.
 * CONVENTIONS §6 의 강약·통근 행(strengthScore.JIJANGGAN_WEIGHTS 0.60/0.25/0.15)을
 * 정기 = 100 으로 정규화해 쓴다(정기 100 · 중기 42 · 여기 25) — 통근력 0~200 스케일과
 * 그 임계(100 단단 / 50 뚜렷)는 그대로. 예전 100/60/30 은 §6 이 금지한 *제3의
 * 가중치*였다(엔진 감사 F8).
 */
const JIJANGGAN_STRENGTH: Record<string, number> = Object.fromEntries(
  Object.entries(JIJANGGAN_WEIGHTS).map(([k, w]) => [
    k,
    Math.round((100 * w) / JIJANGGAN_WEIGHTS.정기),
  ])
)

/**
 * 기둥별 통근 강도 가중치
 * 일지 > 월지 > 시지 > 년지
 */
const PILLAR_WEIGHT: Record<string, number> = {
  day: 1.0, // 일지: 100%
  month: 0.8, // 월지: 80%
  time: 0.6, // 시지: 60%
  year: 0.4, // 년지: 40%
}

/**
 * 천간의 통근 여부 및 강도 계산. 시주가 null/생략이면(출생시각 미상) 년·월·일 지지만 본다 —
 * 통근력은 뿌리의 *존재* 합이라 모르는 시지 몫을 다른 기둥에 재분배하지 않는다.
 */
export function calculateTonggeun(
  stem: string,
  pillars: MaybeTimeless<SajuPillarsInput>
): TonggeunResult {
  const roots: TonggeunResult['roots'] = []
  let totalStrength = 0

  const pillarEntries: Array<{ key: 'year' | 'month' | 'day' | 'time'; branch: string }> = [
    { key: 'year', branch: pillars.year.branch },
    { key: 'month', branch: pillars.month.branch },
    { key: 'day', branch: pillars.day.branch },
  ]
  if (pillars.time) pillarEntries.push({ key: 'time', branch: pillars.time.branch })

  for (const { key, branch } of pillarEntries) {
    const jijanggan = JIJANGGAN[branch]
    if (!jijanggan) {
      continue
    }

    for (const [type, hiddenStem] of Object.entries(jijanggan)) {
      if (hiddenStem === stem) {
        // 같은 천간이 지장간에 있으면 통근
        const baseStrength = JIJANGGAN_STRENGTH[type] || 0
        const weight = PILLAR_WEIGHT[key] || 0.5
        const strength = Math.round(baseStrength * weight)

        roots.push({
          branch,
          pillar: key,
          hiddenStem,
          type: type as '정기' | '중기' | '여기',
          strength,
        })
        totalStrength += strength
      } else {
        // 같은 오행이면 부분 통근 (동기통근)
        const stemElement = getStemElement(stem)
        const hiddenElement = getStemElement(hiddenStem)
        if (stemElement === hiddenElement) {
          const baseStrength = (JIJANGGAN_STRENGTH[type] || 0) * 0.5 // 50% 감소
          const weight = PILLAR_WEIGHT[key] || 0.5
          const strength = Math.round(baseStrength * weight)

          roots.push({
            branch,
            pillar: key,
            hiddenStem,
            type: type as '정기' | '중기' | '여기',
            strength,
          })
          totalStrength += strength
        }
      }
    }
  }

  return {
    stem,
    roots,
    totalStrength: Math.min(totalStrength, 200), // 최대 200
    hasRoot: roots.length > 0,
  }
}

// ============ 투출 계산 ============

/**
 * 지지의 지장간이 천간에 투출되었는지 확인
 */
export function calculateTuechul(pillars: SajuPillarsInput): TuechulResult[] {
  const results: TuechulResult[] = []
  const allStems = [
    { stem: pillars.year.stem, pillar: 'year' as const },
    { stem: pillars.month.stem, pillar: 'month' as const },
    { stem: pillars.day.stem, pillar: 'day' as const },
    { stem: pillars.time.stem, pillar: 'time' as const },
  ]

  const pillarEntries: Array<{ key: 'year' | 'month' | 'day' | 'time'; branch: string }> = [
    { key: 'year', branch: pillars.year.branch },
    { key: 'month', branch: pillars.month.branch },
    { key: 'day', branch: pillars.day.branch },
    { key: 'time', branch: pillars.time.branch },
  ]

  for (const { key, branch } of pillarEntries) {
    const jijanggan = JIJANGGAN[branch]
    if (!jijanggan) {
      continue
    }

    const hiddenStems: TuechulResult['hiddenStems'] = []

    for (const [type, hiddenStem] of Object.entries(jijanggan)) {
      const transparentInfo = allStems.find((s) => s.stem === hiddenStem)

      hiddenStems.push({
        stem: hiddenStem,
        type: type as '정기' | '중기' | '여기',
        transparent: !!transparentInfo,
        transparentPillar: transparentInfo?.pillar,
      })
    }

    results.push({
      branch,
      pillar: key,
      hiddenStems,
    })
  }

  return results
}

/**
 * 월지 지장간 투출 우선순위 확인 (격국 판정용)
 */
export function getMonthBranchTransparency(pillars: SajuPillarsInput): {
  transparentStem: string | null
  transparentType: '정기' | '중기' | '여기' | null
  priority: number
} {
  const monthBranch = pillars.month.branch
  const jijanggan = JIJANGGAN[monthBranch]
  if (!jijanggan) {
    return { transparentStem: null, transparentType: null, priority: 0 }
  }

  const allStems = [pillars.year.stem, pillars.month.stem, pillars.time.stem]

  // 정기 > 중기 > 여기 순서로 투출 확인
  const order: Array<'정기' | '중기' | '여기'> = ['정기', '중기', '여기']
  const priorities: Record<string, number> = { 정기: 3, 중기: 2, 여기: 1 }

  for (const type of order) {
    const hiddenStem = jijanggan[type]
    if (hiddenStem && allStems.includes(hiddenStem)) {
      return {
        transparentStem: hiddenStem,
        transparentType: type,
        priority: priorities[type],
      }
    }
  }

  return { transparentStem: null, transparentType: null, priority: 0 }
}

// ============ 회국 계산 ============

/**
 * 삼합 정의
 */
// canon 파생. 표시 순서(수·화·금·목) 보존.
const SAMHAP: Array<{ branches: string[]; result: FiveElement }> = (
  ['수', '화', '금', '목'] as const
).map((el) => {
  const t = THREE_HARMONY.find((x) => x.element === el)!
  return { branches: [...t.members], result: el }
})

/**
 * 방합 정의 — canon 파생
 */
const BANGHAP: Array<{ branches: string[]; result: FiveElement }> = DIRECTIONAL_HARMONY.map(
  (d) => ({
    branches: [...d.members],
    result: d.element,
  })
)

/**
 * 반합(半合) 정의 - 삼합의 왕지 포함 인접 2지지. canon 파생, center=왕지(가운데).
 */
const BANHAP: Array<{ branches: string[]; result: FiveElement; center: string }> = (
  ['수', '화', '금', '목'] as const
).flatMap((el) => {
  const t = THREE_HARMONY.find((x) => x.element === el)!
  const [first, center, last] = t.members
  return [
    { branches: [first, center], result: el, center },
    { branches: [center, last], result: el, center },
  ]
})

/**
 * 회국 계산
 */
export function calculateHoeguk(pillars: MaybeTimeless<SajuPillarsInput>): HoegukResult[] {
  // 시간 미상(삼주)이면 시지 없이 년·월·일 세 지지만 본다(CONVENTIONS §5).
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    ...(pillars.time ? [pillars.time.branch] : []),
  ]
  const results: HoegukResult[] = []

  // 삼합 체크
  for (const samhap of SAMHAP) {
    const matchCount = samhap.branches.filter((b) => branches.includes(b)).length
    if (matchCount === 3) {
      results.push({
        type: '삼합',
        branches: samhap.branches,
        resultElement: samhap.result,
        complete: true,
        strength: 100,
      })
    }
  }

  // 방합 체크
  for (const banghap of BANGHAP) {
    const matchCount = banghap.branches.filter((b) => branches.includes(b)).length
    if (matchCount === 3) {
      results.push({
        type: '방합',
        branches: banghap.branches,
        resultElement: banghap.result,
        complete: true,
        strength: 90,
      })
    }
  }

  // 반합 체크 (삼합이 없을 때만)
  if (results.filter((r) => r.type === '삼합').length === 0) {
    for (const banhap of BANHAP) {
      const hasAll = banhap.branches.every((b) => branches.includes(b))
      if (hasAll) {
        results.push({
          type: '반합',
          branches: banhap.branches,
          resultElement: banhap.result,
          complete: false,
          strength: 50,
        })
      }
    }
  }

  return results
}

// ============ 득령 계산 ============

/**
 * 월지별 왕상휴수사(旺相休囚死) 계산
 */
const MONTH_ELEMENT_MAP: Record<string, FiveElement> = {
  寅: '목',
  卯: '목',
  辰: '토',
  巳: '화',
  午: '화',
  未: '토',
  申: '금',
  酉: '금',
  戌: '토',
  亥: '수',
  子: '수',
  丑: '토',
}

/**
 * 왕상휴수사 계산 — 當令者旺 · 令生者相 · 生令者休 · 剋令者囚 · 令剋者死
 * 旺(100): 월령이 같은 오행
 * 相(80): 월령이 나를 생함
 * 休(0): 내가 월령을 생함
 * 囚(-50): 내가 월령을 극함 (剋令者囚 — 예: 甲 辰월)
 * 死(-80): 월령이 나를 극함 (令剋者死 — 예: 甲 申월)
 * 예전 표는 囚/死 를 다섯 행 모두 뒤바꿔 甲 申월을 '수령'(-50)으로 냈다
 * (엔진 감사 SD-16). strengthScore.deukryeongScore 의 순서(극출 5 > 극입 0)와 같다.
 */
export function calculateDeukryeong(daymaster: string, monthBranch: string): DeukryeongResult {
  const daymasterElement = getStemElement(daymaster)
  const monthElement = MONTH_ELEMENT_MAP[monthBranch] || '토'

  // 오행 관계 매핑
  const relations: Record<
    FiveElement,
    Record<FiveElement, { status: '득령' | '실령' | '평령'; strength: number; desc: string }>
  > = {
    목: {
      목: { status: '득령', strength: 100, desc: '목왕절, 득령' },
      수: { status: '득령', strength: 80, desc: '수생목, 상령' },
      화: { status: '평령', strength: 0, desc: '목생화, 휴령' },
      금: { status: '실령', strength: -80, desc: '금극목, 사령' },
      토: { status: '실령', strength: -50, desc: '목극토, 수령' },
    },
    화: {
      화: { status: '득령', strength: 100, desc: '화왕절, 득령' },
      목: { status: '득령', strength: 80, desc: '목생화, 상령' },
      토: { status: '평령', strength: 0, desc: '화생토, 휴령' },
      수: { status: '실령', strength: -80, desc: '수극화, 사령' },
      금: { status: '실령', strength: -50, desc: '화극금, 수령' },
    },
    토: {
      토: { status: '득령', strength: 100, desc: '토왕절, 득령' },
      화: { status: '득령', strength: 80, desc: '화생토, 상령' },
      금: { status: '평령', strength: 0, desc: '토생금, 휴령' },
      목: { status: '실령', strength: -80, desc: '목극토, 사령' },
      수: { status: '실령', strength: -50, desc: '토극수, 수령' },
    },
    금: {
      금: { status: '득령', strength: 100, desc: '금왕절, 득령' },
      토: { status: '득령', strength: 80, desc: '토생금, 상령' },
      수: { status: '평령', strength: 0, desc: '금생수, 휴령' },
      화: { status: '실령', strength: -80, desc: '화극금, 사령' },
      목: { status: '실령', strength: -50, desc: '금극목, 수령' },
    },
    수: {
      수: { status: '득령', strength: 100, desc: '수왕절, 득령' },
      금: { status: '득령', strength: 80, desc: '금생수, 상령' },
      목: { status: '평령', strength: 0, desc: '수생목, 휴령' },
      토: { status: '실령', strength: -80, desc: '토극수, 사령' },
      화: { status: '실령', strength: -50, desc: '수극화, 수령' },
    },
  }

  const result = relations[daymasterElement]?.[monthElement] || {
    status: '평령' as const,
    strength: 0,
    desc: '판정 불가',
  }

  return {
    daymaster,
    monthBranch,
    status: result.status,
    strength: result.strength,
    description: result.desc,
  }
}

// ============ 종합 세력 분석 — 삭제됨 ============
//
// 옛 analyzeStrength / calculateElementStrengths 는 *두 번째 강약 알고리즘*이었다:
// 통근/5 + 득령×0.3 + 오행 세력비(천간 10·지지 15·지장간 10/5/3 — CONVENTIONS §6 이
// 금지한 제4의 가중치)로 −100..100 점수를 만들고 >50/>20/>−20/>−50 으로 5단계 라벨을
// 붙였다. 강약 SSOT(computeStrengthScore → strengthBandOf, CONVENTIONS §10·§11)와 3분류로
// 약 22% 차트에서 갈렸고, 시주가 없으면 throw 했다. 프로덕션 호출자가 없어 2026-11 에
// 지웠다(재감사 SDR-07). 일간 강약은 strengthScore.ts 하나만 쓴다.

/**
 * 특정 천간의 힘 평가 (격국 판정용)
 */
export function evaluateStemPower(
  stem: string,
  pillars: SajuPillarsInput
): {
  tonggeunScore: number
  transparentScore: number
  hoegukBonus: number
  total: number
  description: string
} {
  const tonggeun = calculateTonggeun(stem, pillars)
  const stemElement = getStemElement(stem)

  // 투출 점수 (월지 기준)
  const monthTuechul = getMonthBranchTransparency(pillars)
  const transparentScore = monthTuechul.transparentStem === stem ? monthTuechul.priority * 20 : 0

  // 회국 보너스
  const hoeguk = calculateHoeguk(pillars)
  let hoegukBonus = 0
  for (const hg of hoeguk) {
    if (hg.resultElement === stemElement) {
      hoegukBonus += hg.complete ? 30 : 15
    }
  }

  const total = tonggeun.totalStrength + transparentScore + hoegukBonus

  let description = ''
  if (total >= 100) {
    description = '매우 강함'
  } else if (total >= 60) {
    description = '강함'
  } else if (total >= 30) {
    description = '보통'
  } else if (total > 0) {
    description = '약함'
  } else {
    description = '무력'
  }

  return {
    tonggeunScore: tonggeun.totalStrength,
    transparentScore,
    hoegukBonus,
    total,
    description,
  }
}
