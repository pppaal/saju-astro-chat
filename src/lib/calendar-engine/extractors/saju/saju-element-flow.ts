import { STEMS, BRANCHES, FIVE_ELEMENT_RELATIONS, ELEMENT_KO_TO_EN } from '@/lib/saju/constants'
import { computeDayBranch, computeDayStem } from './saju-shinsal'
// 일진 천간의 그날 십신(정관/정인/식신…) — cross-activation 매칭 키로 evidence.sibsin 에 태깅.
import { getSibsinFromStemInfo as getSibsin } from '../shared/sibsin'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../../types'
import type { FiveElement } from '@/lib/saju/types'

// 오행 KO→EN — 공용 SSOT(constants.ELEMENT_KO_TO_EN)에서 파생(복붙 금지).
const ELEMENT_EN = ELEMENT_KO_TO_EN
// 일진 오행 → 본명 일간 관계의 EN 동사구 (kind 기준).
const RELATION_EN: Record<string, string> = {
  same: 'reinforces (peer/rival)',
  'give-birth': 'nourishes (resource)',
  'receive-birth': 'draws on (output)',
  control: 'controls (officer)',
  'be-controlled': 'is controlled by (wealth)',
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
    const dayMaster = pillars.day.heavenlyStem
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
            // 그날 일진 천간의 십신 — cross-activation extractor 가 이 키로 점성 행성과 페어링.
            sibsin: getSibsin(dayMaster, dayStem) ?? undefined,
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
 * 일진 오행(from) → 본명 일간 오행(to) 관계 + polarity. 십성은 *일간 기준*:
 *   생하는관계[일진]===일간 = 일진生일간 = 印星 +2
 *   동(同) = 比劫 +1
 *   생받는관계[일진]===일간 = 일간生일진 = 食傷 -1
 *   극받는관계[일진]===일간 = 일간剋일진 = 財星 0   (내가 극하는 재물 → 중립)
 *   극하는관계[일진]===일간 = 일진剋일간 = 官星 -2  (나를 극하는 관성 → 압박)
 * (직전엔 극하는/극받는의 십성·polarity 가 뒤바뀌어, 관성 압박일이 재성(중립)으로
 *  필터링돼 사라지고, 재성일이 관성 -2 로 잘못 떴다. core/sibsin SSOT 와 정렬.)
 */
export function elementRelation(from: FiveElement, to: FiveElement): RelationResult | null {
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
    // 일진이 일간을 극함 = (일간 입장) 官星 압박.
    return { kind: 'control', label: '극함 (관성)', polarity: -2 }
  }
  if (FIVE_ELEMENT_RELATIONS.극받는관계[from] === to) {
    // 일간이 일진을 극함 = (일간 입장) 財星, 중립.
    return { kind: 'be-controlled', label: '극받음 (재성)', polarity: 0 }
  }
  return null
}

export default sajuElementFlowExtractor
