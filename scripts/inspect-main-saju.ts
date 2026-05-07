/**
 * 메인 사주 엔진 raw output — 1995-02-09 06:40 Seoul (남자) 기본.
 *
 * Run: npx tsx scripts/inspect-main-saju.ts
 */
import { runMainSaju } from '../src/lib/main-saju'

const out = runMainSaju({
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male',
  timezone: 'Asia/Seoul',
})

console.log('='.repeat(72))
console.log('  메인 사주 엔진 — 1995-02-09 06:40 서울 (남)')
console.log('='.repeat(72))

console.log('\n## 1. 명식 (4기둥)')
console.log(`  年柱: ${out.pillars.year.stem}${out.pillars.year.branch}  [${out.pillars.year.sibsin}]`)
console.log(`  月柱: ${out.pillars.month.stem}${out.pillars.month.branch}  [${out.pillars.month.sibsin}]`)
console.log(`  日柱: ${out.pillars.day.ganzhi}  ← 일주 (본명)`)
console.log(`        일간 ${out.pillars.day.stem} (${out.pillars.day.element}, ${out.pillars.day.yinYang})`)
console.log(`  時柱: ${out.pillars.time.stem}${out.pillars.time.branch}  [${out.pillars.time.sibsin}]`)

console.log('\n## 2. 오행 분포')
for (const [el, count] of Object.entries(out.fiveElements)) {
  console.log(`  ${el}: ${count}`)
}

console.log('\n## 3. 강약 / 격국 / 용신 / 기신')
console.log(`  강약:  ${out.advanced.strength.level}  (점수 ${out.advanced.strength.score})`)
console.log(`  격국:  ${out.advanced.geokguk.type}${out.advanced.geokguk.basis ? ` — ${out.advanced.geokguk.basis}` : ''}`)
console.log(`  용신:  ${out.advanced.yongsin.primary}${out.advanced.yongsin.secondary ? ` / ${out.advanced.yongsin.secondary}` : ''}`)
if (out.advanced.yongsin.basis) console.log(`  근거:  ${out.advanced.yongsin.basis}`)
if (out.advanced.yongsin.unfavorable?.length) {
  console.log(`  기신:  ${out.advanced.yongsin.unfavorable.join(', ')}`)
}
if (out.advanced.johuYongsin) {
  console.log(`  조후용신: ${out.advanced.johuYongsin.primary} / ${out.advanced.johuYongsin.secondary} (${out.advanced.johuYongsin.season})`)
  console.log(`            ${out.advanced.johuYongsin.description}`)
}

console.log('\n## 4. 종격 / 화격 / 일주 깊이 / 공망 / 삼기 (ultra)')
console.log(`  종격: ${out.ultraAdvanced.jonggeok.isJonggeok ? `${out.ultraAdvanced.jonggeok.type} (${out.ultraAdvanced.jonggeok.confidence}%)` : '아님'}`)
console.log(`  화격: ${out.ultraAdvanced.hwagyeok.isHwagyeok ? `${out.ultraAdvanced.hwagyeok.type} (${out.ultraAdvanced.hwagyeok.confidence}%)` : '아님'}`)
const ilju = out.ultraAdvanced.iljuDeep
console.log(`  일주 깊이: 등급 ${ilju.grade}`)
if (ilju.characteristics?.length) console.log(`              특성: ${ilju.characteristics.slice(0, 3).join(', ')}`)
const gm = out.ultraAdvanced.gongmang
console.log(`  공망 (지지): ${gm.gongmangBranches?.join(', ') || '—'}`)
if (gm.affectedAreas?.length) console.log(`              영향 영역: ${gm.affectedAreas.join(', ')}`)
const sg = out.ultraAdvanced.samgi
console.log(`  삼기: ${sg.hasSamgi ? sg.type : '아님'}`)
if (out.ultraAdvanced.specialFormations?.length) {
  console.log(`  특수 격: ${out.ultraAdvanced.specialFormations.join(', ')}`)
}
if (out.ultraAdvanced.masterySummary) {
  console.log(`  종합: ${out.ultraAdvanced.masterySummary}`)
}

console.log('\n## 5. 대운 (cycle)')
console.log(`  대운수: ${out.cycles.daeunsu}세 시작`)
if (out.cycles.currentDaeun) {
  const cd = out.cycles.currentDaeun
  const sib = cd.sibsin as { cheon?: string; ji?: string } | undefined
  console.log(`  현재 대운: ${cd.age}세~ ${cd.heavenlyStem}${cd.earthlyBranch} (천간 ${sib?.cheon}, 지지 ${sib?.ji})  ← 지금`)
  if (cd.phase) {
    const phaseLabel = cd.phase === 'stem' ? '천간기 (전반 5년)' : '지지기 (후반 5년)'
    console.log(`         ${phaseLabel} — 단계 진행 ${Math.round((cd.phaseProgress ?? 0) * 100)}% (시작 ${cd.phaseStartAge}세)`)
  }
}
console.log(`  전체 cycles (${out.cycles.daeunCycles.length}개):`)
for (const c of out.cycles.daeunCycles) {
  const ganji = c.ganji || `${c.heavenlyStem || '?'}${c.earthlyBranch || '?'}`
  const sib = (c as { sibsin?: { cheon?: string; ji?: string } }).sibsin
  const sibStr = sib ? `  (${sib.cheon}/${sib.ji})` : ''
  console.log(`    ${c.age}세~ : ${ganji}${sibStr}`)
}

console.log('\n## 6. 운 점수 (오늘 기준) — 근거 포함')
const showInput = (input: Record<string, unknown>) => {
  const cheon = input.sibsin ? `천간=${input.sibsin}` : ''
  const ji = input.branchSibsin ? `지지=${input.branchSibsin}` : ''
  const flags = [
    input.hasYukhap && 'yukhap+',
    input.hasSamhapPositive && 'samhap+',
    input.hasChung && 'chung-',
    input.hasGwansal && 'gwansal-',
    input.hasXing && 'xing-',
    input.hasHai && 'hai-',
  ].filter(Boolean).join(', ')
  const ctx = [
    input.strength && `[${input.strength}]`,
    input.cycleStemElement && input.yongsinPrimary === input.cycleStemElement && '용신✓',
    input.cycleStemElement && input.yongsinSecondary === input.cycleStemElement && '희신✓',
    input.cycleStemElement &&
      Array.isArray(input.kibsinElements) &&
      (input.kibsinElements as string[]).includes(input.cycleStemElement as string) &&
      '기신✗',
  ].filter(Boolean).join(' ')
  // Phase 1.15~1.19 신규 boolean 표시
  const newFlags = [
    input.geokgukShift && input.geokgukShift !== 'neutral' &&
      `격국:${input.geokgukShift}(강도${input.geokgukShiftIntensity ?? 0})`,
    input.hasGongmangResolution && '沖空+',
    input.hasGongmangLock && '合空-',
    input.hasHwaCompletion && '진짜化+',
    input.hasSamgiCompletion && '삼기✓',
    input.isSamjaeYear && `삼재(${input.samjaePhase ?? '?'})-`,
    input.hasGwiin && '귀인+',
    input.hasYeokma && '역마',
    input.hasYangin && '양인-',
    input.hasGongmang && '공망-',
  ].filter(Boolean).join(' ')
  return [cheon, ji, flags, ctx, newFlags].filter(Boolean).join(' | ')
}
const pct = (v: number, max: number) => `${((v / max) * 100).toFixed(0)}%`
console.log(`  대운 점수: ${out.scores.daeunScore.toFixed(2)} / 8   (${pct(out.scores.daeunScore, 8)})`)
console.log(`         근거: ${showInput(out.scoreInputs.daeun as Record<string, unknown>)}`)
console.log(`  세운 점수: ${out.scores.seunScore.toFixed(2)} / 10  (${pct(out.scores.seunScore, 10)})`)
console.log(`         근거: ${showInput(out.scoreInputs.seun as Record<string, unknown>)}`)
console.log(`  월운 점수: ${out.scores.wolunScore.toFixed(2)} / 7   (${pct(out.scores.wolunScore, 7)})`)
console.log(`         근거: ${showInput(out.scoreInputs.wolun as Record<string, unknown>)}`)
console.log(`  일진 점수: ${out.scores.iljinScore.toFixed(2)} / 12  (${pct(out.scores.iljinScore, 12)})`)
console.log(`         근거: ${showInput(out.scoreInputs.iljin as Record<string, unknown>)}`)

console.log('\n## 7. cycle별 정통 분석 (Phase 1)')
type StageBlock = {
  cycleStage: string
  dayMasterStage: string
  cycleStrength: number
  dayMasterStrength: number
  keywords: string[]
  tone: string
  summary: string
  natalPillarStages?: Array<{ pillar: string; branch: string; stage: string; strength: number }>
  natalPeak?: { pillar: string; branch: string; stage: string; strength: number }
}
type InteractionBlock = {
  pillars: Array<{ pillar: string; domain: string; stemRelation: string | null; branchRelation: string | null; tone: string; summary: string }>
  dominantSignal?: { pillar: string; domain: string; relation: string; tone: string }
  summary: string
}
type RootednessBlock = {
  cycleStemRoots: Array<{ pillar: string; branch: string; layer: string; strength: number }>
  rootStrengthTotal: number
  isRootless: boolean
  cycleBranchTuggan: Array<{ cycleLayer: string; stem: string; pillar: string; strength: number }>
  summary: string
}
type ShinsalBlock = {
  hits: Array<{ kind: string; tone: string; basis: string; on: string }>
  luckyCount: number
  unluckyCount: number
  neutralCount: number
  summary: string
}
type GeokgukShiftBlock = {
  geokguk: string
  shift: string
  intensity: number
  reasons: string[]
  summary: string
  transformedTo?: { geokguk: string; by: string; sibsin: string }
}
type SamgiBlock = { state: string; type?: string; completingStem?: string; natalStems?: string[]; summary: string }
type HwaBlock = {
  events: Array<{ natalPillar: string; natalStem: string; hwaElement: string; quality: string; significance: number; description: string }>
  primaryEvent?: { natalPillar: string; natalStem: string; hwaElement: string; quality: string; significance: number }
  summary: string
}
type JohuShiftBlock = {
  yongsin: string
  shift: string
  intensity: number
  summary: string
}
const showCycle = (label: string, c?: { twelveStages: StageBlock; pillarInteractions: InteractionBlock; rootedness: RootednessBlock; shinsalActivation: ShinsalBlock; geokgukShift: GeokgukShiftBlock; johuShift: JohuShiftBlock; hwaTransform: HwaBlock; samgi: SamgiBlock }) => {
  if (!c) {
    console.log(`  ${label}: —`)
    return
  }
  const t = c.twelveStages
  console.log(`  ${label}:`)
  console.log(`    12운성: ${t.summary}`)
  console.log(`            tone=${t.tone}, keywords=${t.keywords.join('·')}`)
  if (t.natalPillarStages) {
    const stages = t.natalPillarStages.map((s) => `${s.pillar}(${s.branch}):${s.stage}`).join(' / ')
    console.log(`            본명별: ${stages}`)
    if (t.natalPeak) {
      console.log(`            절정: ${t.natalPeak.pillar}(${t.natalPeak.branch}) ${t.natalPeak.stage}`)
    }
  }
  const pi = c.pillarInteractions
  console.log(`    4기둥:  ${pi.summary}`)
  for (const p of pi.pillars) {
    if (p.tone === 'neutral') continue
    const stem = p.stemRelation ? `천간 ${p.stemRelation}` : ''
    const br = p.branchRelation ? `지지 ${p.branchRelation}` : ''
    const rel = [stem, br].filter(Boolean).join(' + ')
    console.log(`            · ${p.pillar} (${p.domain}): ${rel}  [${p.tone}]`)
  }
  const r = c.rootedness
  console.log(`    통근/투간: ${r.summary}`)
  const s = c.shinsalActivation
  console.log(`    신살:    ${s.summary}`)
  for (const h of s.hits) {
    console.log(`            · ${h.kind} [${h.tone}] — ${h.basis} (${h.on})`)
  }
  const g = c.geokgukShift
  console.log(`    격국변동: ${g.summary}`)
  for (const r of g.reasons) {
    console.log(`            · ${r}`)
  }
  if (g.transformedTo) {
    console.log(`            ⤳ 일시 변질: ${g.transformedTo.geokguk} (${g.transformedTo.by} ${g.transformedTo.sibsin})`)
  }
  const j = c.johuShift
  console.log(`    조후변화: ${j.summary}`)
  const h = c.hwaTransform
  console.log(`    천간합化: ${h.summary}`)
  const sm = c.samgi
  console.log(`    삼기:    ${sm.summary}`)
}
showCycle('대운', out.cycleAnalysis.daeun)
showCycle('세운', out.cycleAnalysis.seun)
showCycle('월운', out.cycleAnalysis.wolun)
showCycle('일진', out.cycleAnalysis.iljin)

console.log('\n## 8. Extended (격국 narrative 일부)')
if (out.extended) {
  const e = out.extended as Record<string, unknown>
  for (const k of ['johuYongsin', 'rootAnalysis', 'extendedYongsin', 'narrative', 'overall']) {
    if (e[k]) {
      console.log(`  [${k}]: ${typeof e[k] === 'string' ? e[k] : JSON.stringify(e[k]).slice(0, 200)}`)
    }
  }
} else {
  console.log('  (extended null — input 형식 미스매치 가능)')
}

console.log('\n' + '='.repeat(72))
