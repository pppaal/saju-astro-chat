import { STEMS, BRANCHES, FIVE_ELEMENT_RELATIONS } from '@/lib/saju/constants'
import { computeDayBranch, computeDayStem } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { FiveElement } from '@/lib/saju/types'

const ELEMENT_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}
// 일진 오행 → 본명 일간 관계의 EN 동사구 (kind 기준).
const RELATION_EN: Record<string, string> = {
  same: 'reinforces (peer/rival)',
  'give-birth': 'nourishes (resource)',
  'receive-birth': 'draws on (output)',
  control: 'controls (wealth)',
  'be-controlled': 'is controlled by (officer)',
}

/**
 * 일진 오행 vs 본명 4기둥 오행 직접 상생/상극 추출기.
 *
 * 누락됐던 가장 직관적 명리 신호:
 *  - 일진 木 + 본명 火 일간 → 木이 火를 생함 (인성)
 *  - 일진 金 + 본명 木 일간 → 金이 木을 극함 (관성)
 *  - 5가지 관계: 同(비겁) / 生하는(식상) / 生받는(인성) / 剋하는(재성) / 剋받는(관성)
 *
 * 매일 일진 천간·지지 오행 × 본명 4기둥 8개 오행 = 16 관계 검사.
 * 강도 큰 관계만 신호로 emit.
 */
const sajuElementFlowExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'pillar-sibsin',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const pillars = natal.saju.pillars
    const dayMasterElement = pillars.day.heavenlyStem.element as FiveElement

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const dayStemName = computeDayStem(date)
      const dayBranchName = computeDayBranch(date)
      if (!dayStemName || !dayBranchName) continue

      const dayStem = STEMS.find((s) => s.name === dayStemName)
      const dayBranch = BRANCHES.find((b) => b.name === dayBranchName)
      if (!dayStem || !dayBranch) continue

      const dayIso = date.toISOString().slice(0, 10)
      const startIso = `${dayIso}T00:00:00.000Z`
      const peakIso = `${dayIso}T12:00:00.000Z`
      const endIso = `${dayIso}T23:59:59.999Z`

      // 일진 천간 → 본명 일간 관계 (가장 직접적)
      const stemRelation = elementRelation(dayStem.element as FiveElement, dayMasterElement)
      if (stemRelation && stemRelation.polarity !== 0) {
        signals.push({
          id: `saju.element-flow.stem.${dayIso}`,
          source: 'saju',
          kind: 'pillar-sibsin',
          name: `일진 ${dayStem.element} ${stemRelation.label}`,
          korean: `오늘 ${dayStem.element}(${dayStemName}) 기운이 본명 일간 ${dayMasterElement} 기운을 ${stemRelation.label}`,
          english: `today's ${ELEMENT_EN[dayStem.element] ?? dayStem.element} ${RELATION_EN[stemRelation.kind] ?? ''} your day master ${ELEMENT_EN[dayMasterElement] ?? dayMasterElement}`,
          polarity: stemRelation.polarity,
          layer: 'daily',
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: 0.7,
          evidence: {
            module: 'saju-element-flow',
            element: dayStem.element as FiveElement,
            detail: {
              source: 'stem',
              dayStem: dayStemName,
              dayElement: dayStem.element,
              natalElement: dayMasterElement,
              relation: stemRelation.kind,
              label: stemRelation.label,
            },
          },
        })
      }

      // 일진 지지 → 본명 일간 관계
      const branchRelation = elementRelation(dayBranch.element as FiveElement, dayMasterElement)
      if (branchRelation && branchRelation.polarity !== 0) {
        signals.push({
          id: `saju.element-flow.branch.${dayIso}`,
          source: 'saju',
          kind: 'pillar-sibsin',
          name: `일진지 ${dayBranch.element} ${branchRelation.label}`,
          korean: `오늘 ${dayBranch.element}(${dayBranchName}) 기운이 본명 일간을 ${branchRelation.label}`,
          english: `today's branch ${ELEMENT_EN[dayBranch.element] ?? dayBranch.element} ${RELATION_EN[branchRelation.kind] ?? ''} your day master`,
          polarity: branchRelation.polarity,
          layer: 'daily',
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: 0.55,
          evidence: {
            module: 'saju-element-flow',
            element: dayBranch.element as FiveElement,
            detail: {
              source: 'branch',
              dayBranch: dayBranchName,
              dayElement: dayBranch.element,
              natalElement: dayMasterElement,
              relation: branchRelation.kind,
              label: branchRelation.label,
            },
          },
        })
      }
    }

    return signals
  },
}

interface RelationResult {
  kind: 'same' | 'receive-birth' | 'give-birth' | 'control' | 'be-controlled'
  label: string
  polarity: Polarity
}

/**
 * 일진 오행 → 본명 일간 오행 관계 + polarity.
 * 명리적으로: 생받는(印星) +2, 동(比劫) +1, 생하는(食傷) -1, 극하는(財星) 0, 극받는(官星) -2
 * (단순화 — 본명 강약 미반영. 추후 강약별 미세조정 가능)
 */
function elementRelation(from: FiveElement, to: FiveElement): RelationResult | null {
  if (from === to) {
    return { kind: 'same', label: '동일 (비겁)', polarity: 1 }
  }
  if (FIVE_ELEMENT_RELATIONS.생하는관계[from] === to) {
    return { kind: 'give-birth', label: '생함 (인성)', polarity: 2 }
  }
  if (FIVE_ELEMENT_RELATIONS.생받는관계[from] === to) {
    return { kind: 'receive-birth', label: '받음 (식상)', polarity: -1 }
  }
  if (FIVE_ELEMENT_RELATIONS.극하는관계[from] === to) {
    return { kind: 'control', label: '극함 (재성)', polarity: 0 }
  }
  if (FIVE_ELEMENT_RELATIONS.극받는관계[from] === to) {
    return { kind: 'be-controlled', label: '극받음 (관성)', polarity: -2 }
  }
  return null
}

export default sajuElementFlowExtractor
