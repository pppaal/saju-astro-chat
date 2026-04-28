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
  ShinsalHit,
  TwelveStage,
  UnseData,
  PillarKind,
} from '@/lib/Saju/types'
import type { StrengthScore } from '@/lib/Saju/strengthScore'
import type { GeokgukResult } from '@/lib/Saju/geokguk'
import type { YongsinResult } from '@/lib/Saju/yongsin'
import { KO_TO_SAJU_ELEMENT } from '../bridges/element'
import type { SajuSignal } from '../types'

export interface SajuExtrasInput {
  shinsal: ShinsalHit[]
  twelveStages: { [K in PillarKind]: TwelveStage }
  geokguk: GeokgukResult | null
  yongsin: YongsinResult | null
  jijanggan: { [K in PillarKind]: string[] }
}

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
  // Optional real strength score from saju engine. When provided, the
  // heuristic in this normalizer is skipped.
  strength?: StrengthScore
  // Pulled extras: 신살, 12운성, 격국, 용신, 지장간.
  extras?: SajuExtrasInput
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
    strength,
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

  // 일간 강약: real engine `calculateStrengthScore` 결과 우선, 없으면 휴리스틱.
  if (strength) {
    const strongLevels: StrengthScore['level'][] = ['극강', '강', '중강']
    const weakLevels: StrengthScore['level'][] = ['중약', '약', '극약']
    if (strongLevels.includes(strength.level)) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: 'saju.state.dayMaster.strength.strong',
        fired: true,
        strength: Math.min(1, strength.total / 100),
        evidence: { level: strength.level, total: strength.total },
      })
    }
    if (weakLevels.includes(strength.level)) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: 'saju.state.dayMaster.strength.weak',
        fired: true,
        strength: Math.min(1, 1 - strength.total / 100),
        evidence: { level: strength.level, total: strength.total },
      })
    }
  } else if (dmEl) {
    const sameElCount = fe[dmEl as keyof typeof fe] ?? 0
    if (sameElCount >= 3) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: 'saju.state.dayMaster.strength.strong',
        fired: true,
        strength: Math.min(1, sameElCount / 4),
        evidence: { sameElCount, dmEl, source: 'heuristic' },
      })
    }
    if (sameElCount <= 1) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: 'saju.state.dayMaster.strength.weak',
        fired: true,
        strength: 1 - sameElCount / 4,
        evidence: { sameElCount, dmEl, source: 'heuristic' },
      })
    }
  }

  // ── 십성 distribution + palace branches (전문가 시그널) ─
  const sibsinCounts: Record<string, number> = {}
  const sibsinGroupCounts: Record<string, number> = {
    비겁: 0, // 비견 + 겁재
    식상: 0, // 식신 + 상관
    재성: 0, // 정재 + 편재
    관성: 0, // 정관 + 편관
    인성: 0, // 정인 + 편인
  }
  const sibsinToGroup: Record<string, keyof typeof sibsinGroupCounts> = {
    비견: '비겁', 겁재: '비겁',
    식신: '식상', 상관: '식상',
    정재: '재성', 편재: '재성',
    정관: '관성', 편관: '관성',
    정인: '인성', 편인: '인성',
  }
  for (const pillarKind of ['year', 'month', 'day', 'time'] as const) {
    const p = saju.pillars[pillarKind]
    for (const slot of [p.heavenlyStem, p.earthlyBranch]) {
      const sb = String(slot.sibsin ?? '')
      if (!sb) continue
      sibsinCounts[sb] = (sibsinCounts[sb] ?? 0) + 1
      const grp = sibsinToGroup[sb]
      if (grp) sibsinGroupCounts[grp]++
    }
  }
  for (const [sb, count] of Object.entries(sibsinCounts)) {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.sibsin.count.${sb}`,
      fired: count > 0,
      strength: Math.min(1, count / 4),
      evidence: { sibsin: sb, count },
    })
    if (count >= 2) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.sibsin.strong.${sb}`,
        fired: true,
        strength: Math.min(1, count / 3),
        evidence: { sibsin: sb, count },
      })
    }
  }
  // group totals + dominance
  const groupTotal = Object.values(sibsinGroupCounts).reduce((a, b) => a + b, 0) || 1
  let dominantGroup: keyof typeof sibsinGroupCounts | null = null
  let dominantCount = 0
  for (const [grp, count] of Object.entries(sibsinGroupCounts) as Array<[keyof typeof sibsinGroupCounts, number]>) {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.sibsinGroup.${grp}.count`,
      fired: count > 0,
      strength: count / groupTotal,
      evidence: { group: grp, count, total: groupTotal },
    })
    if (count >= 3) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.sibsinGroup.${grp}.strong`,
        fired: true,
        strength: Math.min(1, count / 4),
        evidence: { group: grp, count },
      })
    }
    if (count > dominantCount) {
      dominantCount = count
      dominantGroup = grp
    }
  }
  if (dominantGroup && dominantCount >= 3) {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.sibsinGroup.dominant.${dominantGroup}`,
      fired: true,
      strength: dominantCount / groupTotal,
      evidence: { group: dominantGroup, count: dominantCount },
    })
  }

  // ── palace branches (year=조상궁, month=부모궁, day=배우자궁, time=자녀궁) ──
  const palaces: Record<'year' | 'month' | 'day' | 'time', string> = {
    year: '조상',
    month: '부모',
    day: '배우자',
    time: '자녀',
  }
  for (const [pillarKind, palace] of Object.entries(palaces) as Array<['year' | 'month' | 'day' | 'time', string]>) {
    const p = saju.pillars[pillarKind]
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.palace.${palace}.branch.${p.earthlyBranch.name}`,
      fired: true,
      strength: 1,
      evidence: { pillar: pillarKind, palace, branch: p.earthlyBranch.name },
    })
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.palace.${palace}.element.${p.earthlyBranch.element}`,
      fired: true,
      strength: 1,
      evidence: { pillar: pillarKind, palace, element: p.earthlyBranch.element },
    })
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.palace.${palace}.sibsin.${p.earthlyBranch.sibsin}`,
      fired: true,
      strength: 1,
      evidence: { pillar: pillarKind, palace, sibsin: p.earthlyBranch.sibsin },
    })
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

  // ── extras: 신살 / 12운성 / 격국 / 용신 / 지장간 ────────
  if (input.extras) {
    pushExtraSignals(out, input.extras)
  }

  return out
}

function pushExtraSignals(out: SajuSignal[], extras: NonNullable<SajuNormalizerInput['extras']>) {
  // 신살 (각 hit를 single signal로 + 길/흉 분류 시그널)
  const luckyShinsal = new Set(['천을귀인','천덕귀인','월덕귀인','문창','학당','금여','암록','복성귀인','반안','장성','길성'])
  const unluckyShinsal = new Set(['망신','겁살','재살','천살','월살','육해','괘살','흉성','자형'])
  for (const hit of extras.shinsal) {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.shinsal.${hit.kind}`,
      fired: true,
      strength: 0.85,
      evidence: { kind: hit.kind, pillars: hit.pillars, target: hit.target, detail: hit.detail },
    })
    if (luckyShinsal.has(hit.kind)) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.shinsal.lucky.${hit.kind}`,
        fired: true,
        strength: 0.9,
        evidence: { kind: hit.kind, pillars: hit.pillars },
      })
    }
    if (unluckyShinsal.has(hit.kind)) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.shinsal.unlucky.${hit.kind}`,
        fired: true,
        strength: 0.9,
        evidence: { kind: hit.kind, pillars: hit.pillars },
      })
    }
  }

  // 12운성
  const activeStages = new Set(['장생','관대','임관','왕지','건록','제왕'])
  const dormantStages = new Set(['쇠','병','사','묘','절'])
  for (const [pillar, stage] of Object.entries(extras.twelveStages) as [keyof typeof extras.twelveStages, string][]) {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.twelveStage.${pillar}.${stage}`,
      fired: true,
      strength: 0.7,
      evidence: { pillar, stage },
    })
    if (activeStages.has(stage)) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.twelveStage.active.${pillar}`,
        fired: true,
        strength: 0.85,
        evidence: { pillar, stage },
      })
    }
    if (dormantStages.has(stage)) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.twelveStage.dormant.${pillar}`,
        fired: true,
        strength: 0.85,
        evidence: { pillar, stage },
      })
    }
  }

  // 격국
  if (extras.geokguk && extras.geokguk.primary !== '미정') {
    const confidenceWeight = extras.geokguk.confidence === 'high' ? 1 : extras.geokguk.confidence === 'medium' ? 0.7 : 0.4
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.geokguk.${extras.geokguk.primary}`,
      fired: true,
      strength: confidenceWeight,
      evidence: { type: extras.geokguk.primary, category: extras.geokguk.category },
    })
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.geokguk.category.${extras.geokguk.category}`,
      fired: true,
      strength: confidenceWeight,
      evidence: { type: extras.geokguk.primary, category: extras.geokguk.category },
    })
  }

  // 용신
  if (extras.yongsin) {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.yongsin.primary.${extras.yongsin.primaryYongsin}`,
      fired: true,
      strength: 1,
      evidence: { yongsin: extras.yongsin.primaryYongsin, type: extras.yongsin.yongsinType },
    })
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.yongsin.type.${extras.yongsin.yongsinType}`,
      fired: true,
      strength: 0.9,
      evidence: { type: extras.yongsin.yongsinType },
    })
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.yongsin.daymasterStrength.${extras.yongsin.daymasterStrength}`,
      fired: true,
      strength: 0.9,
      evidence: { strength: extras.yongsin.daymasterStrength },
    })
    if (extras.yongsin.kibsin) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.yongsin.kibsin.${extras.yongsin.kibsin}`,
        fired: true,
        strength: 0.8,
        evidence: { kibsin: extras.yongsin.kibsin },
      })
    }
  }

  // 지장간 (각 기둥의 hidden stems)
  for (const [pillar, hiddenStems] of Object.entries(extras.jijanggan) as [keyof typeof extras.jijanggan, string[]][]) {
    for (const hs of hiddenStems) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.jijanggan.${pillar}.${hs}`,
        fired: true,
        strength: 0.5,
        evidence: { pillar, hidden: hs },
      })
    }
  }
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
