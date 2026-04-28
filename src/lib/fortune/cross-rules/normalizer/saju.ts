// Saju normalizer: turns CalculateSajuDataResult (+ optional unse context)
// into a flat SajuSignal[] for the rule engine.
//
// Signal keys are namespaced `saju.<layer>.<sub>` so the source is grep-able.
// This is intentionally a thin adapter — it does NOT recompute saju facts.

import type {
  CalculateSajuDataResult,
  RelationHit,
  UnseData,
} from '@/lib/Saju/types'
import { KO_TO_SAJU_ELEMENT } from '../bridges/element'
import type { SajuSignal } from '../types'

export interface SajuNormalizerInput {
  saju: CalculateSajuDataResult
  relations?: RelationHit[] // 합/충/형/파/해 결과 (있으면 주입)
  currentDaeun?: UnseData | null
  currentSeun?: UnseData | null
}

export function normalizeSaju(input: SajuNormalizerInput): SajuSignal[] {
  const out: SajuSignal[] = []
  const { saju, relations = [], currentDaeun, currentSeun } = input

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
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.elementCount.${el}`,
      fired: count > 0,
      strength: count / total,
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
  }

  // ── relation layer ──────────────────────────────────────
  for (const r of relations) {
    out.push({
      system: 'saju',
      layer: 'relation',
      key: `saju.relation.${r.kind}`,
      fired: true,
      strength: 0.8, // RelationHit은 binary; 강도 미세조정은 추후
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
  if (currentDaeun) {
    out.push({
      system: 'saju',
      layer: 'timing',
      key: 'saju.timing.daeun.active',
      fired: true,
      strength: 1,
      evidence: { daeun: currentDaeun },
    })
    if (currentDaeun.sibsin?.cheon) {
      out.push({
        system: 'saju',
        layer: 'timing',
        key: `saju.timing.daeun.sibsin.${currentDaeun.sibsin.cheon}`,
        fired: true,
        strength: 0.9,
        evidence: { sibsin: currentDaeun.sibsin },
      })
    }
  }
  if (currentSeun) {
    out.push({
      system: 'saju',
      layer: 'timing',
      key: 'saju.timing.seun.active',
      fired: true,
      strength: 1,
      evidence: { seun: currentSeun },
    })
    if (currentSeun.sibsin?.cheon) {
      out.push({
        system: 'saju',
        layer: 'timing',
        key: `saju.timing.seun.sibsin.${currentSeun.sibsin.cheon}`,
        fired: true,
        strength: 0.9,
        evidence: { sibsin: currentSeun.sibsin },
      })
    }
  }

  return out
}
