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
  // 대운 sequence (previous/next + transition status).
  daeunSequence?: {
    previous: UnseData | null
    next: UnseData | null
    index: number
    yearsIntoCurrent: number
    yearsToNext: number
  }
  // Age at queryDate (used for life-stage context).
  ageYears?: number
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
    daeunSequence,
    ageYears,
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

  // ── relation layer (원국 내부 관계) — with 충 무력화 by 합 ──
  // Build pillar-pair sets for 합 (합 family weakens 충).
  const hapPairs = new Set<string>()
  const chungPairs = new Set<string>()
  const pairKey = (ps: string[]) => [...ps].sort().join('|')
  for (const r of natalRelations) {
    const k = pairKey(r.pillars)
    if (
      r.kind === '천간합' || r.kind === '지지육합' ||
      r.kind === '지지삼합' || r.kind === '지지방합'
    ) hapPairs.add(k)
    if (r.kind === '천간충' || r.kind === '지지충') chungPairs.add(k)
  }
  // Pillars involved in 충 — used later for 신살 cancellation.
  const chungPillars = new Set<string>()
  for (const r of natalRelations) {
    if (r.kind === '천간충' || r.kind === '지지충' || r.kind === '지지형') {
      for (const p of r.pillars) chungPillars.add(p)
    }
  }

  for (const r of natalRelations) {
    const isChung = r.kind === '천간충' || r.kind === '지지충'
    const dampedByHap = isChung && hapPairs.has(pairKey(r.pillars))
    const baseStr = isChung ? (dampedByHap ? 0.4 : 0.8) : 0.8
    out.push({
      system: 'saju',
      layer: 'relation',
      key: `saju.relation.${r.kind}`,
      fired: true,
      strength: baseStr,
      evidence: { kind: r.kind, pillars: r.pillars, detail: r.detail, dampedByHap },
    })
    if (dampedByHap) {
      out.push({
        system: 'saju',
        layer: 'relation',
        key: `saju.relation.${r.kind}.damped`,
        fired: true,
        strength: 0.6,
        evidence: { kind: r.kind, pillars: r.pillars, dampedByHap: true },
      })
    }
    if (r.pillars.includes('day')) {
      out.push({
        system: 'saju',
        layer: 'relation',
        key: `saju.relation.day.${r.kind}`,
        fired: true,
        strength: dampedByHap ? 0.5 : 0.9,
        evidence: { pillars: r.pillars, detail: r.detail, dampedByHap },
      })
    }

    // 합화 추출: detail에 "합화X" 또는 "化X" 포함 시 해당 오행 신호 추가.
    if ((r.kind === '천간합' || r.kind === '지지육합' || r.kind === '지지삼합' || r.kind === '지지방합') && r.detail) {
      const m = /합화\s*(목|화|토|금|수)|化\s*(목|화|토|금|수)/.exec(r.detail)
      const transformed = m ? (m[1] || m[2]) : null
      if (transformed) {
        out.push({
          system: 'saju',
          layer: 'state',
          key: `saju.state.transform.${transformed}`,
          fired: true,
          strength: 0.8,
          evidence: { kind: r.kind, pillars: r.pillars, transformed, detail: r.detail },
        })
      }
    }
  }

  // ── 신살 충 처리: 신살이 충된 기둥에 있으면 cancelled 신호 ──
  const cancelledShinsalLater = chungPillars
  // (extras 처리 시 사용 — extras 함수에서 이 set을 읽어 신살 무력화 신호 추가)
  ;(out as { _cancelledShinsalPillars?: Set<string> } & SajuSignal[])._cancelledShinsalPillars = cancelledShinsalLater

  // ── 통근 (rooting) — 천간이 지지 지장간에 뿌리 있는지 ───
  // jeonggi=3, junggi=2, chogi=1 가중. 4기둥 지지 모두 검사.
  const elementToKo: Record<string, string> = { 목: '목', 화: '화', 토: '토', 금: '금', 수: '수' }
  type Pillar = typeof saju.pillars.year
  type WithJijanggan = Pillar & { jijanggan?: { chogi?: { name?: string }; junggi?: { name?: string }; jeonggi?: { name?: string } } }
  function jijangganElements(p: WithJijanggan): Array<{ stem: string; weight: number }> {
    const j = p.jijanggan ?? {}
    const out: Array<{ stem: string; weight: number }> = []
    if (j.jeonggi?.name) out.push({ stem: j.jeonggi.name, weight: 3 })
    if (j.junggi?.name) out.push({ stem: j.junggi.name, weight: 2 })
    if (j.chogi?.name) out.push({ stem: j.chogi.name, weight: 1 })
    return out
  }
  function stemElement(stemName: string): string {
    // 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수
    const map: Record<string, string> = {
      甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토',
      庚: '금', 辛: '금', 壬: '수', 癸: '수',
    }
    return map[stemName] ?? ''
  }
  for (const pillarKind of ['year', 'month', 'day', 'time'] as const) {
    const stemEl = saju.pillars[pillarKind].heavenlyStem.element
    const elKo = elementToKo[stemEl] ?? stemEl
    let totalWeight = 0
    let detail: string[] = []
    for (const otherKind of ['year', 'month', 'day', 'time'] as const) {
      const p = saju.pillars[otherKind] as WithJijanggan
      for (const hidden of jijangganElements(p)) {
        if (stemElement(hidden.stem) === elKo) {
          totalWeight += hidden.weight
          detail.push(`${otherKind}/${hidden.stem}(+${hidden.weight})`)
        }
      }
    }
    let level: 'deep' | 'moderate' | 'weak' | 'none'
    if (totalWeight >= 6) level = 'deep'
    else if (totalWeight >= 3) level = 'moderate'
    else if (totalWeight >= 1) level = 'weak'
    else level = 'none'
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.tonggeun.${pillarKind}.${level}`,
      fired: true,
      strength: Math.min(1, totalWeight / 8),
      evidence: { pillarKind, totalWeight, level, detail: detail.slice(0, 4) },
    })
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

  // ── 대운 시퀀스 (이전/다음/전환임박) ─────────────────────
  if (daeunSequence) {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.daeun.index.${daeunSequence.index}`,
      fired: true,
      strength: 1,
      evidence: { index: daeunSequence.index, yearsIntoCurrent: daeunSequence.yearsIntoCurrent },
    })
    if (daeunSequence.previous?.sibsin?.cheon) {
      out.push({
        system: 'saju',
        layer: 'timing',
        scale: 'decade',
        key: `saju.timing.daeun.previous.sibsin.${daeunSequence.previous.sibsin.cheon}`,
        fired: true,
        strength: 0.6, // weaker — past influence echoing
        evidence: { previous: daeunSequence.previous },
      })
    }
    if (daeunSequence.next?.sibsin?.cheon) {
      out.push({
        system: 'saju',
        layer: 'timing',
        scale: 'decade',
        key: `saju.timing.daeun.next.sibsin.${daeunSequence.next.sibsin.cheon}`,
        fired: true,
        strength: 0.6, // weaker — future preview
        evidence: { next: daeunSequence.next, yearsToNext: daeunSequence.yearsToNext },
      })
    }
    if (daeunSequence.next && daeunSequence.yearsToNext <= 1) {
      out.push({
        system: 'saju',
        layer: 'timing',
        scale: 'event',
        key: 'saju.timing.daeun.transition.imminent',
        fired: true,
        strength: 1 - Math.max(0, daeunSequence.yearsToNext) / 1,
        evidence: { yearsToNext: daeunSequence.yearsToNext, next: daeunSequence.next },
      })
    }
  }

  // ── 인생 단계 (life-stage) ──────────────────────────────
  if (typeof ageYears === 'number') {
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.age.years.${ageYears}`,
      fired: true,
      strength: 1,
      evidence: { ageYears },
    })
    let stage = 'adult'
    if (ageYears < 12) stage = 'child'
    else if (ageYears < 20) stage = 'teen'
    else if (ageYears < 35) stage = 'young-adult'
    else if (ageYears < 55) stage = 'mid-adult'
    else if (ageYears < 70) stage = 'late-adult'
    else stage = 'elder'
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.lifeStage.${stage}`,
      fired: true,
      strength: 1,
      evidence: { ageYears, stage },
    })
  }

  // ── 육친 (六親) 호명 ─────────────────────────────────────
  // 십성 → 사람 관계 매핑. 도메인과 별개로 LLM/렌더러에 풍부한 컨텍스트 제공.
  // (일간 양음에 따라 일부 다르지만 표준 매핑 사용)
  const yukchinMap: Record<string, string[]> = {
    정재: ['배우자', '재물'],
    편재: ['활동가족', '변동재물'],
    정관: ['직장상사', '명예'],
    편관: ['압박원', '경쟁'],
    정인: ['어머니', '학습'],
    편인: ['양모/이모', '비정형 학습'],
    식신: ['자녀', '즐거운 표현'],
    상관: ['자녀', '도전적 표현'],
    비견: ['형제', '동료'],
    겁재: ['이복형제', '경쟁자'],
  }
  for (const [pillarKind, palace] of [
    ['year', '조상'], ['month', '부모'], ['day', '배우자'], ['time', '자녀'],
  ] as const) {
    const sb = String(saju.pillars[pillarKind].earthlyBranch.sibsin ?? '')
    const persons = yukchinMap[sb]
    if (persons) {
      for (const person of persons) {
        out.push({
          system: 'saju',
          layer: 'state',
          key: `saju.state.yukchin.${person}.in.${palace}`,
          fired: true,
          strength: 0.7,
          evidence: { palace, sibsin: sb, person, pillar: pillarKind },
        })
      }
    }
  }

  // ── extras: 신살 / 12운성 / 격국 / 용신 / 지장간 ────────
  if (input.extras) {
    pushExtraSignals(out, input.extras, saju)
  }

  return out
}

function pushExtraSignals(out: SajuSignal[], extras: NonNullable<SajuNormalizerInput['extras']>, saju: CalculateSajuDataResult) {
  // 신살 (각 hit를 single signal로 + 길/흉 분류 시그널)
  const luckyShinsal = new Set(['천을귀인','천덕귀인','월덕귀인','문창','학당','금여','암록','복성귀인','반안','장성','길성'])
  const unluckyShinsal = new Set(['망신','겁살','재살','천살','월살','육해','괘살','흉성','자형'])
  // 신살 충 처리: 운반자 구조에 cancellation set이 들어있으면 사용.
  const cancelSet: Set<string> | undefined = (out as { _cancelledShinsalPillars?: Set<string> })._cancelledShinsalPillars
  for (const hit of extras.shinsal) {
    const cancelled = !!cancelSet && hit.pillars.some((p) => cancelSet.has(p))
    out.push({
      system: 'saju',
      layer: 'state',
      key: `saju.state.shinsal.${hit.kind}`,
      fired: true,
      strength: cancelled ? 0.4 : 0.85,
      evidence: { kind: hit.kind, pillars: hit.pillars, target: hit.target, detail: hit.detail, cancelled },
    })
    if (cancelled) {
      // 충된 길성 = 불귀인 (효력 약화), 충된 흉성 = 비교적 풀림 (소손). 둘 다 cancelled 신호.
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.shinsal.cancelled.${hit.kind}`,
        fired: true,
        strength: 0.7,
        evidence: { kind: hit.kind, pillars: hit.pillars, cancelledByChung: true },
      })
    }
    if (luckyShinsal.has(hit.kind) && !cancelled) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.shinsal.lucky.${hit.kind}`,
        fired: true,
        strength: 0.9,
        evidence: { kind: hit.kind, pillars: hit.pillars },
      })
    }
    if (unluckyShinsal.has(hit.kind) && !cancelled) {
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

  // ─── 격국 + 용신 classical 조합 (자평진전 패턴) ──────────
  // 용신 오행으로 이어지는 십성을 매핑해서 조합 식별.
  if (extras.geokguk && extras.yongsin && extras.geokguk.primary !== '미정') {
    const elementToSibsinForDM: Record<string, string> = {
      // (간단 매핑) 일간이 X일 때 어떤 오행이 어떤 십성? — 일간 양음에 따라 정/편 미세 차이는 LLM에서 보정.
      // 여기서는 그룹 단위로만 사용.
    }
    void elementToSibsinForDM // (사용 안 함; 그룹 매칭으로 진행)

    const yongsinKo = extras.yongsin.primaryYongsin // '목'/'화'/'토'/'금'/'수'
    const dmEl = saju.dayMaster.element
    // 일간 vs 용신 오행 관계 → 어떤 십성 그룹이 용신인지 결정
    const sangsang: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' } // 생함
    const sangsangBack: Record<string, string> = { 화: '목', 토: '화', 금: '토', 수: '금', 목: '수' } // 받음
    const sangkeuk: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' } // 극함
    const sangkeukBack: Record<string, string> = { 토: '목', 수: '토', 화: '수', 금: '화', 목: '금' } // 극받음

    let yongsinGroup: string | null = null
    if (yongsinKo === dmEl) yongsinGroup = '비겁'
    else if (sangsang[dmEl] === yongsinKo) yongsinGroup = '식상'
    else if (sangsangBack[dmEl] === yongsinKo) yongsinGroup = '인성'
    else if (sangkeuk[dmEl] === yongsinKo) yongsinGroup = '재성'
    else if (sangkeukBack[dmEl] === yongsinKo) yongsinGroup = '관성'

    if (yongsinGroup) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.yongsinGroup.${yongsinGroup}`,
        fired: true,
        strength: 0.9,
        evidence: { yongsin: yongsinKo, dayMaster: dmEl, group: yongsinGroup },
      })

      // 자평진전 classical 조합 식별:
      const geokguk = extras.geokguk.primary
      const combos: Array<{ geokguk: string; yongsin: string; id: string; meaning: string }> = [
        { geokguk: '정관격', yongsin: '재성', id: '부귀쌍전', meaning: '정관격에 재성이 받쳐주는 부귀쌍전 구조' },
        { geokguk: '정관격', yongsin: '인성', id: '관인상생', meaning: '정관격에 인성이 흐르는 명예·학문 구조' },
        { geokguk: '식신격', yongsin: '재성', id: '식신생재', meaning: '식신이 재성을 생하는 부유 패턴' },
        { geokguk: '편관격', yongsin: '인성', id: '살인상생', meaning: '칠살을 인성으로 화하는 권력자 구조' },
        { geokguk: '편관격', yongsin: '식상', id: '식신제살', meaning: '식상이 칠살을 제어하는 능동적 권력' },
        { geokguk: '양인격', yongsin: '관성', id: '양인합살', meaning: '양인이 칠살과 합하는 무관·정치 패턴' },
        { geokguk: '정인격', yongsin: '관성', id: '관인쌍청', meaning: '관성과 인성이 함께 청한 학자형 구조' },
        { geokguk: '편인격', yongsin: '관성', id: '편인봉관', meaning: '비정형 학습이 권위와 만나는 구조' },
        { geokguk: '정재격', yongsin: '관성', id: '재관인상생', meaning: '재성이 관성을 생하는 부유한 책임가' },
        { geokguk: '편재격', yongsin: '관성', id: '편재봉살', meaning: '활동 재성이 권력과 만나는 큰 흐름' },
      ]
      const matched = combos.find((c) => c.geokguk === geokguk && c.yongsin === yongsinGroup)
      if (matched) {
        out.push({
          system: 'saju',
          layer: 'state',
          key: `saju.state.classicalCombo.${matched.id}`,
          fired: true,
          strength: 0.95,
          evidence: { geokguk, yongsinGroup, comboId: matched.id, meaning: matched.meaning },
        })
      }
    }

    // ── 상신(相神) derivation + 성격(成格)/파격(破格) ────────
    // 자평진전: 격국마다 그 격을 보좌하는 "재상" 십성 그룹이 정해져 있음.
    const sangsinByGeokguk: Record<string, string[]> = {
      정관격: ['재성', '인성'],   // 생관 또는 호관
      편관격: ['식상', '인성'],   // 식신제살 또는 살인상생
      정인격: ['관성'],           // 생인
      편인격: ['관성'],
      정재격: ['식상', '관성'],   // 생재 또는 호재
      편재격: ['식상', '관성'],
      식신격: ['재성'],           // 식신생재
      상관격: ['재성', '인성'],   // 생재 또는 수상관
      양인격: ['관성'],           // 제양인 (칠살)
      건록격: ['관성', '재성'],
      월겁격: ['관성', '재성'],
    }
    const candidates = sangsinByGeokguk[extras.geokguk.primary] ?? []
    let foundSangsin: string | null = null
    let strongCount = 0
    for (const cand of candidates) {
      // 후보 그룹이 사주 안에 살아있는가 — 이미 푸시된 sibsinGroup 신호를 검사.
      const inOut = out.find((s) => s.key === `saju.state.sibsinGroup.${cand}.strong` && s.fired)
      if (inOut) {
        foundSangsin = cand
        strongCount += 1
      } else {
        // weak/absent
        const weakInOut = out.find((s) => s.key === `saju.state.sibsinGroup.${cand}.count` && s.fired)
        if (weakInOut) {
          // present but not strong
          if (!foundSangsin) foundSangsin = cand
        }
      }
    }
    if (foundSangsin) {
      out.push({
        system: 'saju',
        layer: 'state',
        key: `saju.state.sangsin.${foundSangsin}`,
        fired: true,
        strength: strongCount > 0 ? 0.9 : 0.55,
        evidence: { geokguk: extras.geokguk.primary, sangsinGroup: foundSangsin, strongCount },
      })
      if (strongCount > 0) {
        out.push({
          system: 'saju',
          layer: 'state',
          key: 'saju.state.seonggyeok',
          fired: true,
          strength: 0.9,
          evidence: { geokguk: extras.geokguk.primary, sangsin: foundSangsin, status: '성격' },
        })
      }
    } else if (candidates.length > 0) {
      // 격국은 잡혔는데 상신 후보가 모두 약함/부재 → 파격
      out.push({
        system: 'saju',
        layer: 'state',
        key: 'saju.state.pagyeok',
        fired: true,
        strength: 0.85,
        evidence: { geokguk: extras.geokguk.primary, missingSangsin: candidates, status: '파격' },
      })

      // ── 구응(救應) 검출: 운에서 부재한 상신 그룹이 들어오면 회복 ──
      // 사주 운(대운/세운)에서 들어오는 십성이 missingSangsin 그룹에 속하면
      // "패중유성" — 패격이 운에서 회복되는 시기.
      const sibsinToGroupForRescue: Record<string, string> = {
        비견: '비겁', 겁재: '비겁',
        식신: '식상', 상관: '식상',
        정재: '재성', 편재: '재성',
        정관: '관성', 편관: '관성',
        정인: '인성', 편인: '인성',
      }
      const unseSignals = out.filter((s) =>
        s.fired &&
        (s.key.startsWith('saju.timing.daeun.sibsin.') ||
         s.key.startsWith('saju.timing.seun.sibsin.')),
      )
      for (const us of unseSignals) {
        const m = /sibsin\.(.+)$/.exec(us.key)
        if (!m) continue
        const sibsin = m[1]
        const grp = sibsinToGroupForRescue[sibsin]
        if (grp && candidates.includes(grp)) {
          const scale: 'decade' | 'year' = us.key.includes('.daeun.') ? 'decade' : 'year'
          out.push({
            system: 'saju',
            layer: 'timing',
            scale,
            key: 'saju.timing.gueung.rescue',
            fired: true,
            strength: 0.95,
            evidence: {
              geokguk: extras.geokguk.primary,
              missingSangsin: candidates,
              rescuedBy: sibsin,
              rescueGroup: grp,
              scale,
              status: '패중유성·구응',
            },
          })
          break
        }
      }
    }

    // ── 성중유패 검출: 성격이었던 사주에 운이 상신을 충/극으로 약화 ──
    // (운에서 들어오는 십성이 상신 그룹의 반대편이면 — 예: 상신=인성인데 운에서 재성이 강하게 들어와 인성 극)
    if (foundSangsin && strongCount > 0) {
      const oppositeGroup: Record<string, string> = {
        비겁: '관성', // 관극비
        식상: '인성', // 인극식
        재성: '비겁', // 비극재
        관성: '식상', // 식극관 (식신제살 다른 맥락)
        인성: '재성', // 재극인
      }
      const opp = oppositeGroup[foundSangsin]
      if (opp) {
        const sibsinToGroupOpp: Record<string, string> = {
          비견: '비겁', 겁재: '비겁',
          식신: '식상', 상관: '식상',
          정재: '재성', 편재: '재성',
          정관: '관성', 편관: '관성',
          정인: '인성', 편인: '인성',
        }
        const unseStrike = out.find((s) =>
          s.fired &&
          (s.key.startsWith('saju.timing.daeun.sibsin.') || s.key.startsWith('saju.timing.seun.sibsin.')) &&
          (() => {
            const mm = /sibsin\.(.+)$/.exec(s.key)
            if (!mm) return false
            return sibsinToGroupOpp[mm[1]] === opp
          })()
        )
        if (unseStrike) {
          const scale: 'decade' | 'year' = unseStrike.key.includes('.daeun.') ? 'decade' : 'year'
          out.push({
            system: 'saju',
            layer: 'timing',
            scale,
            key: 'saju.timing.seongJungYuPae.strike',
            fired: true,
            strength: 0.85,
            evidence: {
              geokguk: extras.geokguk.primary,
              sangsin: foundSangsin,
              strikeGroup: opp,
              scale,
              status: '성중유패',
            },
          })
        }
      }
    }
  }
}

// (note) 상신 후보 평가는 pushExtraSignals 안에서 'out' 배열을 검색해 이미
// emit된 sibsinGroup.<grp>.strong 시그널을 확인하는 식으로 처리한다 — 별도
// 외부 카운터 변수를 노출하지 않는다.

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
