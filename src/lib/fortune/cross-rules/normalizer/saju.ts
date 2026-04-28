// Saju normalizer: turns CalculateSajuDataResult (+ optional unse context)
// into a flat SajuSignal[] for the rule engine.
//
// Signal keys are namespaced `saju.<layer>.<sub>` so the source is grep-able.
// This is intentionally a thin adapter — it does NOT recompute saju facts.
//
// In addition to raw layer-state/relation/timing signals, this also emits
// COMPOSITE activation signals (timing.event scale) when an unse pillar
// triggers a relation against the natal chart. These composites are how
// "잠복 상태가 지금 발화" gets surfaced as a single signal.

import type {
  CalculateSajuDataResult,
  RelationHit,
  UnseData,
} from '@/lib/Saju/types'
import { KO_TO_SAJU_ELEMENT } from '../bridges/element'
import type { SajuSignal } from '../types'

export interface SajuNormalizerInput {
  saju: CalculateSajuDataResult
  natalRelations?: RelationHit[]   // 원국끼리의 합/충/형/파/해
  currentDaeun?: UnseData | null
  currentSeun?: UnseData | null
  currentWolun?: UnseData | null
  currentIljin?: UnseData | null
  // 운이 원국과 만나서 발화한 관계 (활성화 이벤트의 핵심)
  unseRelations?: Array<{
    source: 'daeun' | 'seun' | 'wolun' | 'iljin'
    relation: RelationHit
  }>
}

export function normalizeSaju(input: SajuNormalizerInput): SajuSignal[] {
  const out: SajuSignal[] = []
  const {
    saju,
    natalRelations = [],
    currentDaeun,
    currentSeun,
    currentWolun,
    currentIljin,
    unseRelations = [],
  } = input

  // ── state layer ─────────────────────────────────────────
  const dmEl = KO_TO_SAJU_ELEMENT[saju.dayMaster.element ?? '']
  if (dmEl) {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.dayMaster.element.${dmEl}`,
      fired: true,
      strength: 1,
      evidence: { dayMaster: saju.dayMaster },
    })
  }

  const fe = saju.fiveElements
  const total = fe.wood + fe.fire + fe.earth + fe.metal + fe.water || 1
  for (const [el, count] of Object.entries(fe)) {
    const ratio = count / total
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.elementCount.${el}`,
      fired: count > 0,
      strength: ratio,
      evidence: { count, total },
    })
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.elementAbsent.${el}`,
      fired: count === 0,
      strength: count === 0 ? 1 : 0,
      evidence: { count },
    })
    if (ratio >= 0.4) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.elementDominant.${el}`,
        fired: true,
        strength: ratio,
        evidence: { count, total },
      })
    }
  }

  // 일간 강약 근사: 일간 오행 + 같은 오행 카운트로 거칠게 추정.
  // 정확한 왕쇠는 saju 엔진 보강 후 교체.
  if (dmEl) {
    const sameElCount = fe[dmEl as keyof typeof fe] ?? 0
    const strong = sameElCount >= 3
    const weak = sameElCount <= 1
    if (strong) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.dayMaster.strength.strong`,
        fired: true,
        strength: Math.min(1, sameElCount / 4),
        evidence: { sameElCount, dmEl },
      })
    }
    if (weak) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.dayMaster.strength.weak`,
        fired: true,
        strength: 1 - sameElCount / 4,
        evidence: { sameElCount, dmEl },
      })
    }
  }

  // ── relation layer (원국 내부 관계) ─────────────────────
  for (const r of natalRelations) {
    out.push({
      system: 'saju',
      layer: 'relation',
      key: `saju.relation.${r.kind}`,
      fired: true,
      strength: 0.8,
      evidence: { kind: r.kind, pillars: r.pillars, detail: r.detail },
    })
    if (r.pillars.includes('day')) {
      out.push({
        system: 'saju',
        layer: 'relation',
        key: `saju.relation.day.${r.kind}`,
        fired: true,
        strength: 0.9,
        evidence: { pillars: r.pillars, detail: r.detail },
      })
    }
  }

  // ── timing layer ────────────────────────────────────────
  pushUnseSignals(out, currentDaeun, 'daeun', 'decade')
  pushUnseSignals(out, currentSeun, 'seun', 'year')
  pushUnseSignals(out, currentWolun, 'wolun', 'month')
  pushUnseSignals(out, currentIljin, 'iljin', 'day')

  // ── composite (event scale): 운-원국 합충 발화 ──────────
  for (const ur of unseRelations) {
    const r = ur.relation
    const involvesDay = r.pillars.includes('day')
    const sourceScale: 'decade' | 'year' | 'month' | 'day' =
      ur.source === 'daeun'
        ? 'decade'
        : ur.source === 'seun'
        ? 'year'
        : ur.source === 'wolun'
        ? 'month'
        : 'day'
    out.push({
      system: 'saju',
      layer: 'timing',
      scale: 'event',
      key: `saju.timing.event.${ur.source}.${r.kind}`,
      fired: true,
      strength: involvesDay ? 1 : 0.7,
      evidence: { source: ur.source, kind: r.kind, pillars: r.pillars, detail: r.detail },
    })
    if (involvesDay) {
      out.push({
        system: 'saju',
        layer: 'timing',
        scale: 'event',
        key: `saju.timing.event.day.${r.kind}`,
        fired: true,
        strength: 1,
        evidence: { source: ur.source, kind: r.kind, detail: r.detail },
      })
    }
    // Also emit the composite into the source's own scale so scale-specific
    // rules (year-only, month-only, …) can pick it up.
    out.push({
      system: 'saju',
      layer: 'timing',
      scale: sourceScale,
      key: `saju.timing.${ur.source}.activates.${r.kind}`,
      fired: true,
      strength: involvesDay ? 1 : 0.7,
      evidence: { kind: r.kind, pillars: r.pillars },
    })
  }

  return out
}

function pushUnseSignals(
  out: SajuSignal[],
  unse: UnseData | null | undefined,
  name: 'daeun' | 'seun' | 'wolun' | 'iljin',
  scale: 'decade' | 'year' | 'month' | 'day',
) {
  if (!unse) return
  out.push({
    system: 'saju',
    layer: 'timing',
    scale,
    key: `saju.timing.${name}.active`,
    fired: true,
    strength: 1,
    evidence: { unse },
  })
  if (unse.sibsin?.cheon) {
    out.push({
      system: 'saju',
      layer: 'timing',
      scale,
      key: `saju.timing.${name}.sibsin.${unse.sibsin.cheon}`,
      fired: true,
      strength: 0.9,
      evidence: { sibsin: unse.sibsin },
    })
  }
  if (unse.sibsin?.ji) {
    out.push({
      system: 'saju',
      layer: 'timing',
      scale,
      key: `saju.timing.${name}.sibsinJi.${unse.sibsin.ji}`,
      fired: true,
      strength: 0.7,
      evidence: { sibsin: unse.sibsin },
    })
  }
}
