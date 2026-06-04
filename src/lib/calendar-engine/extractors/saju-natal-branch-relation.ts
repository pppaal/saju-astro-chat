import { computeDayBranch } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { PillarKind } from '@/lib/saju/types'

/**
 * 일진 지지 × 본명 4지지 합·충·형 추출기.
 *
 * 매일 일진 지지를 본명 year/month/day/hour 4기둥의 지지와 대조해
 * - 지지충(沖)        : -2 (volatility)
 * - 지지육합(六合)    : +1 (harmony)
 * - 지지삼합(三合)    : +1 (3-branch combo; 일진 + natal 에 3 중 2 이상 있을 때)
 * - 지지형(刑)        : -1 (tension; 상호형 + 자형)
 *
 * `saju-hyeongchung` 와 의도적으로 중첩되지만 (그쪽은 더 넓게 천간합·충/방합/파/해/원진까지 잡음)
 * 이 추출기는 user 요청대로 "표준 4관계만, 본명 4기둥 전체 안티-스폿"을 명시적으로
 * 다시 발신해 본명 지지가 한 번에 모두 활성됐을 때 매칭이 누락 없게 한다.
 *
 * 활성 윈도우: 해당 1일.
 */

// ─── 지지충 (6쌍) ───
const BRANCH_CHUNG: Array<[string, string]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]

// ─── 지지 육합 (6쌍) ───
const BRANCH_YUKHAP: Array<[string, string]> = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
]

// ─── 지지 삼합 (4그룹 + 합화 오행) ───
const BRANCH_SAMHAP_GROUPS: Array<{ branches: string[]; element: string }> = [
  { branches: ['申', '子', '辰'], element: '수' },
  { branches: ['寅', '午', '戌'], element: '화' },
  { branches: ['亥', '卯', '未'], element: '목' },
  { branches: ['巳', '酉', '丑'], element: '금' },
]

// ─── 지지형 (상호형 + 자형) ───
// 상호형: 寅巳申 삼형, 丑戌未 삼형, 子卯 상형
// 자형: 辰辰, 午午, 酉酉, 亥亥
const BRANCH_HYUNG_MUTUAL: Array<[string, string]> = [
  ['寅', '巳'], ['巳', '申'], ['申', '寅'],
  ['丑', '戌'], ['戌', '未'], ['未', '丑'],
  ['子', '卯'],
]
const BRANCH_HYUNG_SELF = new Set<string>(['辰', '午', '酉', '亥'])

const PILLAR_LABEL_KO: Record<PillarKind, string> = {
  year: '년주',
  month: '월주',
  day: '일주',
  time: '시주',
}
const PILLAR_LABEL_EN: Record<PillarKind, string> = {
  year: 'year pillar',
  month: 'month pillar',
  day: 'day pillar',
  time: 'hour pillar',
}

const sajuNatalBranchRelationExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'hyeongchung',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const p = natal.saju?.pillars
    if (!p) return []
    // 각 kind 에 `as PillarKind` — 배열 리터럴이 `string` 으로 wide 되면서
    // `.filter()` 결과가 PillarKind 와 호환 안 되던 TS 빌드 에러 fix (2026-06).
    const natalBranches: Array<{ kind: PillarKind; branch: string }> = [
      { kind: 'year' as PillarKind, branch: p.year?.earthlyBranch?.name ?? '' },
      { kind: 'month' as PillarKind, branch: p.month?.earthlyBranch?.name ?? '' },
      { kind: 'day' as PillarKind, branch: p.day?.earthlyBranch?.name ?? '' },
      { kind: 'time' as PillarKind, branch: p.time?.earthlyBranch?.name ?? '' },
    ].filter((b) => b.branch)

    if (natalBranches.length === 0) return []

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetBranch = computeDayBranch(date)
      if (!targetBranch) continue

      const dayIso = date.toISOString().slice(0, 10)
      const startIso = `${dayIso}T00:00:00.000Z`
      const peakIso = `${dayIso}T12:00:00.000Z`
      const endIso = `${dayIso}T23:59:59.999Z`

      // 1) 충 / 육합 / 형 — 본명 4지지 각각과 페어 검사.
      for (const nb of natalBranches) {
        // 충
        for (const [a, b] of BRANCH_CHUNG) {
          if ((targetBranch === a && nb.branch === b) || (targetBranch === b && nb.branch === a)) {
            signals.push(makeSignal({
              relation: 'chung',
              dayIso, startIso, peakIso, endIso,
              polarity: -2,
              name: `${targetBranch}${nb.branch} clash (${PILLAR_LABEL_EN[nb.kind]})`,
              korean: `${targetBranch}↔${nb.branch} 충 (${PILLAR_LABEL_KO[nb.kind]})`,
              weight: 0.8,
              detail: { targetBranch, natalBranch: nb.branch, natalPillar: nb.kind },
            }))
          }
        }
        // 육합
        for (const [a, b] of BRANCH_YUKHAP) {
          if ((targetBranch === a && nb.branch === b) || (targetBranch === b && nb.branch === a)) {
            signals.push(makeSignal({
              relation: 'yukhap',
              dayIso, startIso, peakIso, endIso,
              polarity: 1,
              name: `${targetBranch}-${nb.branch} harmony (${PILLAR_LABEL_EN[nb.kind]})`,
              korean: `${targetBranch}-${nb.branch} 육합 (${PILLAR_LABEL_KO[nb.kind]})`,
              weight: 0.6,
              detail: { targetBranch, natalBranch: nb.branch, natalPillar: nb.kind },
            }))
          }
        }
        // 상호형
        for (const [a, b] of BRANCH_HYUNG_MUTUAL) {
          if ((targetBranch === a && nb.branch === b) || (targetBranch === b && nb.branch === a)) {
            signals.push(makeSignal({
              relation: 'hyung',
              dayIso, startIso, peakIso, endIso,
              polarity: -1,
              name: `${targetBranch}-${nb.branch} punishment (${PILLAR_LABEL_EN[nb.kind]})`,
              korean: `${targetBranch}-${nb.branch} 형 (${PILLAR_LABEL_KO[nb.kind]})`,
              weight: 0.55,
              detail: { targetBranch, natalBranch: nb.branch, natalPillar: nb.kind, hyung: 'mutual' },
            }))
          }
        }
        // 자형 (target 과 본명 같은 자형 지지가 만나면)
        if (
          targetBranch === nb.branch &&
          BRANCH_HYUNG_SELF.has(targetBranch)
        ) {
          signals.push(makeSignal({
            relation: 'hyung-self',
            dayIso, startIso, peakIso, endIso,
            polarity: -1,
            name: `${targetBranch}-${targetBranch} self-punishment (${PILLAR_LABEL_EN[nb.kind]})`,
            korean: `${targetBranch}-${targetBranch} 자형 (${PILLAR_LABEL_KO[nb.kind]})`,
            weight: 0.5,
            detail: { targetBranch, natalBranch: nb.branch, natalPillar: nb.kind, hyung: 'self' },
          }))
        }
      }

      // 2) 삼합 — 일진 + natal 합쳐 3 중 2 이상 있을 때만 한 그룹에 하나의 신호.
      for (const group of BRANCH_SAMHAP_GROUPS) {
        if (!group.branches.includes(targetBranch)) continue
        const presentNatals = natalBranches.filter(
          (nb) => group.branches.includes(nb.branch) && nb.branch !== targetBranch
        )
        if (presentNatals.length === 0) continue
        // dedup: 같은 지지가 여러 기둥에 있어도 1번만 카운트.
        const distinctNatalBranches = new Set(presentNatals.map((nb) => nb.branch))
        const totalDistinct = distinctNatalBranches.size + 1 // +1 for targetBranch
        // user spec: 일진 + natal contain at least 2 of the 3 → 항상 true (target 1 + natal ≥ 1)
        // 강도: 3/3 (완전 삼합) > 2/3 (반합).
        const isFull = totalDistinct >= 3
        const pillarKinds = presentNatals.map((nb) => nb.kind)
        signals.push(makeSignal({
          relation: 'samhap',
          dayIso, startIso, peakIso, endIso,
          polarity: 1,
          name: `${group.branches.join('')} ${isFull ? 'full' : 'half'} combo (${group.element})`,
          korean: `${group.branches.join('')} ${isFull ? '삼합' : '반합'} → ${group.element}국 활성`,
          weight: isFull ? 0.75 : 0.55,
          detail: {
            targetBranch,
            samhapGroup: group.branches,
            element: group.element,
            natalContributors: Array.from(distinctNatalBranches),
            natalPillars: pillarKinds,
            full: isFull,
          },
        }))
      }

    }

    return signals
  },
}

interface MakeSignalArgs {
  relation: 'chung' | 'yukhap' | 'samhap' | 'hyung' | 'hyung-self'
  dayIso: string
  startIso: string
  peakIso: string
  endIso: string
  polarity: Polarity
  name: string
  korean: string
  weight: number
  detail: Record<string, unknown>
}

function makeSignal(args: MakeSignalArgs): ActiveSignal {
  // id 는 day + relation + natalPillar + branches 로 고유.
  const idTail =
    args.detail.natalPillar !== undefined
      ? `${args.detail.natalPillar}.${args.detail.targetBranch}-${args.detail.natalBranch ?? ''}`
      : `${(args.detail.samhapGroup as string[] | undefined)?.join('') ?? args.detail.targetBranch}`
  return {
    id: `saju.natal-branch-relation.${args.relation}.${args.dayIso}.${idTail}`,
    source: 'saju',
    kind: 'hyeongchung',
    name: args.name,
    korean: args.korean,
    themes: [],
    polarity: args.polarity,
    layer: 'daily',
    active: { start: args.startIso, peak: args.peakIso, end: args.endIso },
    weight: args.weight,
    evidence: {
      module: 'saju-natal-branch-relation',
      detail: { ...args.detail, relation: args.relation },
    },
  }
}

export default sajuNatalBranchRelationExtractor
