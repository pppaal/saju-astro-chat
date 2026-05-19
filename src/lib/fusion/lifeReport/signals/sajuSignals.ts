// src/lib/fusion/lifeReport/signals/sajuSignals.ts
// Helpers that extract domain-relevant signals from MainSajuOutput.
// All helpers are defensive — missing fields silently return undefined/[].

import type { MainSajuOutput } from '@/lib/saju/main'
import type {
  SajuRelationsSummary,
  SajuRelationEntry,
} from '../adapters/fromCalendarEngine'

type SibsinCategory = '비겁' | '식상' | '재성' | '관성' | '인성'

const SIBSIN_TO_CAT: Record<string, SibsinCategory> = {
  비견: '비겁',
  겁재: '비겁',
  식신: '식상',
  상관: '식상',
  편재: '재성',
  정재: '재성',
  편관: '관성',
  정관: '관성',
  편인: '인성',
  정인: '인성',
}

const STRONG_STAGES = new Set(['장생', '관대', '임관', '왕지', '건록', '제왕'])
const WEAK_STAGES = new Set(['병', '사', '묘', '절', '태'])

export interface SibsinCount {
  비견: number
  겁재: number
  식신: number
  상관: number
  편재: number
  정재: number
  편관: number
  정관: number
  편인: number
  정인: number
}

/**
 * Count sibsin across the 4 stems and jijanggan (where available).
 * Returns 0 for any sibsin not present.
 */
export function countSibsin(saju: MainSajuOutput): SibsinCount {
  const out: SibsinCount = {
    비견: 0,
    겁재: 0,
    식신: 0,
    상관: 0,
    편재: 0,
    정재: 0,
    편관: 0,
    정관: 0,
    편인: 0,
    정인: 0,
  }
  // Stems on year/month/time (day stem = self, not counted)
  const stemSibsin = [
    saju.pillars.year.sibsin,
    saju.pillars.month.sibsin,
    saju.pillars.time.sibsin,
  ]
  for (const s of stemSibsin) {
    if (s && s in out) out[s as keyof SibsinCount]++
  }
  // Pull from ultraAdvanced.iljuDeep.sibsinRelation if present
  const ilju = saju.ultraAdvanced?.iljuDeep
  const jijang = ilju?.sibsinRelation?.jijangganSibsin ?? []
  for (const s of jijang) {
    if (s && s in out) out[s as keyof SibsinCount]++
  }
  return out
}

export function categoryCount(c: SibsinCount): Record<SibsinCategory, number> {
  const cat: Record<SibsinCategory, number> = {
    비겁: c.비견 + c.겁재,
    식상: c.식신 + c.상관,
    재성: c.편재 + c.정재,
    관성: c.편관 + c.정관,
    인성: c.편인 + c.정인,
  }
  return cat
}

/** 12-stage of the time pillar (휴식기/만년 에너지) */
export function timeStage(saju: MainSajuOutput): string | undefined {
  // not always exposed via main output; defensively probe ultraAdvanced
  const ilju = saju.ultraAdvanced?.iljuDeep
  // iljuDeep.twelveStage is the day pillar's stage; time stage needs separate
  // extraction. Return undefined when unavailable so callers skip.
  return ilju?.twelveStage
}

export function isStageStrong(stage: string | undefined): boolean {
  if (!stage) return false
  return STRONG_STAGES.has(stage)
}

export function isStageWeak(stage: string | undefined): boolean {
  if (!stage) return false
  return WEAK_STAGES.has(stage)
}

export function dayElement(saju: MainSajuOutput): string {
  return saju.pillars.day.element || ''
}

export function dayBranch(saju: MainSajuOutput): string {
  return saju.pillars.day.branch || ''
}

export function timeBranch(saju: MainSajuOutput): string {
  return saju.pillars.time.branch || ''
}

export function timeStem(saju: MainSajuOutput): string {
  return saju.pillars.time.stem || ''
}

export function geokgukType(saju: MainSajuOutput): string {
  return saju.advanced?.geokguk?.type || ''
}

export function yongsinPrimary(saju: MainSajuOutput): string {
  return saju.advanced?.yongsin?.primary || ''
}

export function jonggeokType(saju: MainSajuOutput): string {
  return saju.ultraAdvanced?.jonggeok?.type || ''
}

export function isJonggeok(saju: MainSajuOutput): boolean {
  return !!saju.ultraAdvanced?.jonggeok?.isJonggeok
}

export function gongmangBranches(saju: MainSajuOutput): string[] {
  return saju.ultraAdvanced?.gongmang?.gongmangBranches ?? []
}

export function gongmangAffectedPillars(saju: MainSajuOutput): string[] {
  return (saju.ultraAdvanced?.gongmang?.affectedPillars ?? []) as string[]
}

export function samgiInfo(
  saju: MainSajuOutput
): { hasSamgi: boolean; type?: string } {
  const s = saju.ultraAdvanced?.samgi
  if (!s) return { hasSamgi: false }
  return { hasSamgi: !!s.hasSamgi, type: s.type }
}

/** Day-master strength level (verystrong/strong/balanced/weak/veryweak). */
export function dayStrength(saju: MainSajuOutput): string {
  return saju.advanced?.strength?.level || ''
}

/** Day-master numeric score (-100..100 ish). */
export function dayStrengthScore(saju: MainSajuOutput): number {
  return Number(saju.advanced?.strength?.score ?? 0)
}

/** Five-element ratios (wood/fire/earth/metal/water). */
export function fiveElements(saju: MainSajuOutput): Record<string, number> {
  return saju.fiveElements ?? {}
}

export function weakElements(saju: MainSajuOutput): string[] {
  const fe = fiveElements(saju)
  const total = Object.values(fe).reduce((a, b) => a + Number(b || 0), 0) || 1
  const out: string[] = []
  for (const [k, v] of Object.entries(fe)) {
    if (Number(v) / total < 0.1) out.push(k)
  }
  return out
}

/** Get current daeun summary or undefined. */
export function currentDaeun(
  saju: MainSajuOutput
): { age: number; stem: string; branch: string; sibsin?: string } | undefined {
  const cd = saju.cycles?.currentDaeun
  if (!cd) return undefined
  const sib = cd.sibsin as { cheon?: string } | string | undefined
  const sibCheon =
    typeof sib === 'object' && sib && 'cheon' in sib ? sib.cheon : undefined
  return {
    age: cd.age,
    stem: cd.heavenlyStem,
    branch: cd.earthlyBranch,
    sibsin: typeof sib === 'string' ? sib : sibCheon,
  }
}

/** All daeun cycles. */
export function daeunCycles(
  saju: MainSajuOutput
): Array<{ age: number; ganji?: string }> {
  return saju.cycles?.daeunCycles ?? []
}

/** Find earliest daeun whose category matches the requested sibsin category. */
export function findDaeunByCategory(
  saju: MainSajuOutput,
  cat: SibsinCategory
): { age: number; ganji?: string } | undefined {
  const cycles = daeunCycles(saju)
  for (const c of cycles) {
    const ganji = c.ganji || ''
    const stem = ganji.charAt(0)
    if (!stem) continue
    // resolve stem→sibsin against day master
    const sib = stemSibsinAgainst(stem, saju.pillars.day.stem)
    if (sib && SIBSIN_TO_CAT[sib] === cat) return c
  }
  return undefined
}

const STEM_ELEMENTS: Record<string, string> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
  // also support korean stem labels (rare)
}
const STEM_YINYANG: Record<string, '양' | '음'> = {
  甲: '양',
  乙: '음',
  丙: '양',
  丁: '음',
  戊: '양',
  己: '음',
  庚: '양',
  辛: '음',
  壬: '양',
  癸: '음',
}
const SIBSIN_ORDER = [
  '비견',
  '겁재',
  '식신',
  '상관',
  '편재',
  '정재',
  '편관',
  '정관',
  '편인',
  '정인',
] as const

function stemSibsinAgainst(
  stem: string,
  daystem: string
): (typeof SIBSIN_ORDER)[number] | undefined {
  const a = STEM_ELEMENTS[stem]
  const b = STEM_ELEMENTS[daystem]
  if (!a || !b) return undefined
  const yyA = STEM_YINYANG[stem]
  const yyB = STEM_YINYANG[daystem]
  if (!yyA || !yyB) return undefined
  const els = ['목', '화', '토', '금', '수']
  const dayIdx = els.indexOf(b)
  const tgtIdx = els.indexOf(a)
  const diff = (tgtIdx - dayIdx + 5) % 5
  const samePolarity = yyA === yyB
  const base = diff * 2
  const idx = samePolarity ? base : base + 1
  return SIBSIN_ORDER[idx]
}

/** Shinsal lucky list (천덕귀인/금여 등) — placeholders pulled defensively. */
export function luckyShinsalNames(saju: MainSajuOutput): string[] {
  // luckyList is not surfaced through MainSajuOutput; probe loosely.
  const obj = saju as unknown as {
    shinsal?: { luckyList?: Array<{ kind?: string }> }
  }
  const items = obj.shinsal?.luckyList ?? []
  return items.map((x) => x?.kind ?? '').filter(Boolean)
}

export function unluckyShinsalNames(saju: MainSajuOutput): string[] {
  const obj = saju as unknown as {
    shinsal?: { unluckyList?: Array<{ kind?: string }> }
  }
  const items = obj.shinsal?.unluckyList ?? []
  return items.map((x) => x?.kind ?? '').filter(Boolean)
}

// ─── Saju relation narrative helpers ─────────────────────────
// Map a SajuRelationsSummary into a 1-sentence natural-language phrase that
// each domain narrative can splice into [paragraph 3] or [paragraph 4]
// without exposing 합/충/형/해 jargon. Returns undefined when the summary
// has no meaningful axis to talk about.

interface RelationPhraseOpts {
  /** Bias toward a specific kind ('충'|'합'|'형'|'해'|'회'). */
  preferKind?: SajuRelationEntry['kind']
  /** Bias toward involving a specific pillar (day/year/month/time). */
  preferPillar?: 'year' | 'month' | 'day' | 'time'
}

export function relationPhraseKo(
  rel: SajuRelationsSummary | undefined,
  opts: RelationPhraseOpts = {},
): string | undefined {
  if (!rel || rel.total === 0) return undefined
  const cand = pickRelationEntry(rel, opts)
  if (!cand) return rel.primaryAxisKo ? `사주의 합충 패턴을 보면, ${rel.primaryAxisKo} 흐름이 인생 결에 한 번 굵게 작용해요.` : undefined
  const pillarsKo: Record<string, string> = {
    year: '년주', month: '월주', day: '일간', time: '시지',
  }
  const a = cand.pillars[0] ? pillarsKo[cand.pillars[0]] ?? cand.pillars[0] : '명식'
  const b = cand.pillars[1] ? pillarsKo[cand.pillars[1]] ?? cand.pillars[1] : '다른 자리'
  const subjectParticle = endsWithBatchim(a) ? '이' : '가'
  const objectParticle = endsWithBatchim(b) ? '과' : '와'
  const verb = kindVerbKo(cand.kind)
  return `사주의 합충 패턴을 보면, ${a}${subjectParticle} ${b}${objectParticle} ${verb} 흐름이 있어요.`
}

// True when the last char of `s` carries a final consonant (받침) — used to
// choose 이/가, 과/와 etc. Deterministic.
function endsWithBatchim(s: string): boolean {
  if (!s) return false
  const lastChar = s[s.length - 1]
  const code = lastChar.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

export function relationPhraseEn(
  rel: SajuRelationsSummary | undefined,
  opts: RelationPhraseOpts = {},
): string | undefined {
  if (!rel || rel.total === 0) return undefined
  const cand = pickRelationEntry(rel, opts)
  if (!cand) return rel.primaryAxisEn ? `In the saju relations, ${rel.primaryAxisEn} runs as a heavy single grain through the chart.` : undefined
  const pillarsEn: Record<string, string> = {
    year: 'year pillar', month: 'month pillar', day: 'day master', time: 'hour pillar',
  }
  const a = cand.pillars[0] ? pillarsEn[cand.pillars[0]] ?? cand.pillars[0] : 'the chart'
  const b = cand.pillars[1] ? pillarsEn[cand.pillars[1]] ?? cand.pillars[1] : 'another seat'
  const verb = kindVerbEn(cand.kind)
  return `Looking at the saju relations, the ${a} ${verb} the ${b}.`
}

/** Return the underlying entry (so callers can read kind / pillars). */
export function pickRelationEntry(
  rel: SajuRelationsSummary,
  opts: RelationPhraseOpts = {},
): SajuRelationEntry | undefined {
  const buckets: SajuRelationEntry[][] = []
  if (opts.preferKind === '합') buckets.push(rel.hap)
  if (opts.preferKind === '충') buckets.push(rel.chung)
  if (opts.preferKind === '형') buckets.push(rel.hyung)
  if (opts.preferKind === '해') buckets.push(rel.hae)
  if (opts.preferKind === '회') buckets.push(rel.hoe)
  buckets.push(rel.chung, rel.hap, rel.hyung, rel.hoe, rel.hae)
  // 1st pass: respect preferPillar.
  if (opts.preferPillar) {
    for (const bucket of buckets) {
      if (!bucket || bucket.length === 0) continue
      const hit = bucket.find((e) => e.pillars.includes(opts.preferPillar!))
      if (hit) return hit
    }
  }
  // 2nd pass: any entry in priority order.
  for (const bucket of buckets) {
    if (!bucket || bucket.length === 0) continue
    return bucket[0]
  }
  return undefined
}

function kindVerbKo(k: SajuRelationEntry['kind']): string {
  if (k === '합') return '조화롭게 결합하는'
  if (k === '충') return '팽팽하게 마주서는'
  if (k === '형') return '변형을 일으키며 닿는'
  if (k === '해') return '은근히 어긋나는'
  return '한자리에 모이는'
}
function kindVerbEn(k: SajuRelationEntry['kind']): string {
  if (k === '합') return 'harmoniously joins with'
  if (k === '충') return 'stands in tense opposition to'
  if (k === '형') return 'reshapes against'
  if (k === '해') return 'subtly misaligns with'
  return 'gathers together with'
}
