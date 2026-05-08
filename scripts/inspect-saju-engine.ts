/**
 * 메인 사주 엔진 raw output — 1995-02-09 06:40 Seoul (남자) 기본.
 *
 * Run: npx tsx scripts/inspect-saju-engine.ts
 */
import { runMainSaju } from '../src/lib/saju/engine'

const out = runMainSaju({
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male',
  timezone: 'Asia/Seoul',
})

console.log('='.repeat(72))
console.log(`  ${out.engine.name} 엔진 v${out.engine.version} — ${out.engine.tagline}`)
console.log(`  (${out.engine.tradition} · ${out.engine.dimensions}차원)`)
console.log('  대상: 1995-02-09 06:40 서울 (남)')
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
const eb = out.lifeNarrative?.summary.elementBalance
if (eb) {
  console.log(`  ─ 균형: ${eb.balance}${eb.dominant ? ` (강: ${eb.dominant})` : ''}${eb.deficient ? ` (결핍: ${eb.deficient})` : ''}`)
  console.log(`  ─ ${eb.interpretation}`)
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
console.log(`  일진 점수: ${out.scores.iljinScore.toFixed(2)} / 15  (${pct(out.scores.iljinScore, 15)})`)
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

console.log('\n## 8. Phase 2 Narrative (정통, deterministic)')
type NarrativeBlock = {
  oneLineKey: string
  shortSummary: string[]
  fullNarrative: {
    headline: string
    overallVerdict: string
    sections: Array<{ title: string; body: string }>
  }
}
const showNarrative = (label: string, n?: NarrativeBlock) => {
  if (!n) {
    console.log(`  [${label}] —`)
    return
  }
  console.log(`\n  ━━━ ${label} ━━━`)
  console.log(`  📌 ${n.fullNarrative.headline}`)
  console.log(`  ⚖  ${n.fullNarrative.overallVerdict}`)
  console.log(`  💡 (한 줄) ${n.oneLineKey}`)
  console.log(`  📋 (요약):`)
  for (const line of n.shortSummary) console.log(`     · ${line}`)
  console.log(`  📖 (풀):`)
  for (const sec of n.fullNarrative.sections) {
    console.log(`     [${sec.title}]`)
    const lines = sec.body.split('\n')
    for (const ln of lines) console.log(`       ${ln}`)
  }
}
showNarrative('대운', out.narratives.daeun as NarrativeBlock | undefined)
showNarrative('세운', out.narratives.seun as NarrativeBlock | undefined)
showNarrative('월운', out.narratives.wolun as NarrativeBlock | undefined)
showNarrative('일진', out.narratives.iljin as NarrativeBlock | undefined)

console.log('\n## 9. 인생 전체 (대운 10개 챕터)')
const ln = (out as { lifeNarrative?: {
  chapters: Array<{ age: number; ageRange: string; ganji: string; isCurrent: boolean; score: number; narrative: { fullNarrative: { headline: string; overallVerdict: string } } }>
  summary: {
    peakChapters: Array<{ age: number; ageRange: string; ganji: string; score: number }>
    valleyChapters: Array<{ age: number; ageRange: string; ganji: string; score: number }>
    overallTheme: string
    stageThemes: Array<{ stage: string; ages: string; theme: string }>
  }
} }).lifeNarrative
if (ln) {
  console.log(`\n  📅 챕터별 점수 + 한 줄:`)
  for (const c of ln.chapters) {
    const mark = c.isCurrent ? ' ← 지금' : ''
    const pct = ((c.score / 8) * 100).toFixed(0)
    console.log(`     ${c.ageRange.padEnd(10)} ${c.ganji}  ${c.score.toFixed(1)}/8 (${pct}%)${mark}`)
    console.log(`               ⚖ ${c.narrative.fullNarrative.overallVerdict}`)
  }
  console.log(`\n  🌟 인생 정점:`)
  for (const p of ln.summary.peakChapters) {
    console.log(`     ${p.ageRange} ${p.ganji} — ${p.score.toFixed(1)}/8`)
  }
  console.log(`\n  💀 인생 저점:`)
  for (const v of ln.summary.valleyChapters) {
    console.log(`     ${v.ageRange} ${v.ganji} — ${v.score.toFixed(1)}/8`)
  }
  console.log(`\n  🎬 인생 단계별 테마:`)
  for (const s of ln.summary.stageThemes) {
    console.log(`     ${s.stage} (${s.ages}): ${s.theme}`)
  }
  console.log(`\n  📜 인생 전체 한 줄: ${ln.summary.overallTheme}`)
}

console.log('\n## 10. Extended (격국 narrative 일부)')
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

console.log('\n## 11. Full Insights (흩어졌던 advice 모듈 통합 출력)')
const fi = (out as { fullInsights?: {
  orthodox?: { advanced?: unknown; root?: unknown; jonggeok?: unknown; hwagyeok?: unknown; ilju?: unknown; samgi?: unknown; gongmang?: unknown }
  sibsin?: { dominantSibsin?: string[]; missingSibsin?: string[]; personality?: string[]; careerAptitude?: Array<{ category: string; description: string }>; relationshipPatterns?: Array<{ category: string; description: string }> }
  healthCareer?: { health?: { overall?: string; warnings?: string[] }; career?: { aptitudes?: string[]; suitable?: string[] }; synergy?: string[]; warnings?: string[] }
  unseDeep?: { period?: string; sibsinRelation?: string; yongsinHarmony?: string; advice?: string[]; cautions?: string[] }
  comprehensiveReport?: { sections?: Array<{ title: string; body: string }>; summary?: string }
} }).fullInsights
if (fi) {
  if (fi.sibsin) {
    console.log(`\n  ━━━ 십신 종합 ━━━`)
    if (fi.sibsin.dominantSibsin?.length) console.log(`  과다: ${fi.sibsin.dominantSibsin.join(', ')}`)
    if (fi.sibsin.missingSibsin?.length) console.log(`  결핍: ${fi.sibsin.missingSibsin.join(', ')}`)
    if (fi.sibsin.personality?.length) {
      console.log(`  성격:`)
      for (const p of fi.sibsin.personality.slice(0, 3)) console.log(`    · ${p}`)
    }
    if (fi.sibsin.careerAptitude?.length) {
      console.log(`  직업 적성:`)
      for (const c of fi.sibsin.careerAptitude.slice(0, 3)) console.log(`    · ${c.category}: ${c.description}`)
    }
    if (fi.sibsin.relationshipPatterns?.length) {
      console.log(`  관계 패턴:`)
      for (const r of fi.sibsin.relationshipPatterns.slice(0, 3)) console.log(`    · ${r.category}: ${r.description}`)
    }
  }
  if (fi.healthCareer) {
    console.log(`\n  ━━━ 건강·직업 ━━━`)
    const hc = fi.healthCareer as unknown as {
      health: { overallScore: number; constitution: string; dominantElement: string; weakElement: string; organHealth: Array<{ organ?: string; element: string; status: string }>; preventionAdvice: string[]; lifestyleRecommendations: string[] }
      career: { primaryFields: Array<{ category: string; jobs: string[]; description: string; fitScore: number }>; secondaryFields: Array<{ category: string; jobs: string[] }>; workStyle: { type: string }; entrepreneurialScore: number; leadershipScore: number; creativityScore: number; stabilityPreference: number; careerPath: string[]; peakCareerAges: number[]; careerAdvice: string[] }
      synergy: string[]
      warnings: string[]
    }
    console.log(`  건강 점수: ${hc.health.overallScore}/100  체질: ${hc.health.constitution}`)
    console.log(`  강한 오행: ${hc.health.dominantElement} / 약한 오행: ${hc.health.weakElement}`)
    if (hc.health.organHealth?.length) {
      const vulnerable = hc.health.organHealth.filter((o) => o.status === 'vulnerable')
      if (vulnerable.length) console.log(`  취약 장기: ${vulnerable.map((o) => `${o.organ ?? o.element}`).join(', ')}`)
    }
    if (hc.health.preventionAdvice?.length) {
      console.log(`  건강 advice:`)
      for (const a of hc.health.preventionAdvice.slice(0, 3)) console.log(`    · ${a}`)
    }
    console.log(`  직업 점수: 창업 ${hc.career.entrepreneurialScore} / 리더십 ${hc.career.leadershipScore} / 창의 ${hc.career.creativityScore} / 안정 ${hc.career.stabilityPreference}`)
    console.log(`  업무 스타일: ${hc.career.workStyle?.type || '-'}`)
    if (hc.career.primaryFields?.length) {
      console.log(`  주 직업 분야:`)
      for (const f of hc.career.primaryFields.slice(0, 3)) {
        console.log(`    · ${f.category} (${f.fitScore}점) — ${f.description}`)
        if (f.jobs?.length) console.log(`        예: ${f.jobs.slice(0, 4).join(', ')}`)
      }
    }
    if (hc.career.peakCareerAges?.length) {
      console.log(`  커리어 정점기: ${hc.career.peakCareerAges.join('세, ')}세`)
    }
    if (hc.career.careerAdvice?.length) {
      console.log(`  커리어 advice:`)
      for (const a of hc.career.careerAdvice.slice(0, 3)) console.log(`    · ${a}`)
    }
    if (hc.synergy?.length) for (const s of hc.synergy.slice(0, 2)) console.log(`  ✨ ${s}`)
    if (hc.warnings?.length) for (const w of hc.warnings.slice(0, 2)) console.log(`  ⚠ ${w}`)
  }
  if (fi.unseDeep) {
    console.log(`\n  ━━━ 운세 깊이 분석 (현재 대운 기준) ━━━`)
    const ud = fi.unseDeep as unknown as {
      unseInfo: { stem: string; branch: string; period: string }
      overallScore: number
      grade: string
      summary: string
      yongsinMatch: { matched: boolean; score: number; reason?: string }
      twelveStage: { stage: string; energy: string; score: number }
      sibsinRelations: Array<{ sibsin: string; impact: string }>
      themes: string[]
      opportunities: string[]
      challenges: string[]
      advice: string[]
    }
    const periodKo = ud.unseInfo.period === 'daeun' ? '대운' : ud.unseInfo.period === 'seun' ? '세운' : ud.unseInfo.period === 'wolun' ? '월운' : ud.unseInfo.period === 'iljin' ? '일진' : ud.unseInfo.period
    console.log(`  ${ud.unseInfo.stem}${ud.unseInfo.branch} (${periodKo})  ${ud.overallScore}/100 [${ud.grade}]`)
    if (ud.summary) console.log(`  📜 ${ud.summary.replace(/^undefined\s/, '')}`)
    console.log(`  용신 일치: ${ud.yongsinMatch?.matched ? '✓' : '✗'} (${ud.yongsinMatch?.score})  12운성: ${ud.twelveStage?.stage} (${ud.twelveStage?.energy})`)
    if (ud.themes?.length) console.log(`  🎯 테마: ${ud.themes.slice(0, 3).join(' / ')}`)
    if (ud.opportunities?.length) {
      console.log(`  🌱 기회:`)
      for (const o of ud.opportunities.slice(0, 3)) console.log(`    · ${o}`)
    }
    if (ud.challenges?.length) {
      console.log(`  ⚠ 도전:`)
      for (const c of ud.challenges.slice(0, 3)) console.log(`    · ${c}`)
    }
    if (ud.advice?.length) {
      console.log(`  💡 조언:`)
      for (const a of ud.advice.slice(0, 3)) console.log(`    · ${a}`)
    }
  }
  if (fi.comprehensiveReport) {
    console.log(`\n  ━━━ 종합 리포트 ━━━`)
    if (fi.comprehensiveReport.summary) console.log(`  요약: ${fi.comprehensiveReport.summary.slice(0, 200)}`)
    if (fi.comprehensiveReport.sections?.length) {
      console.log(`  섹션 ${fi.comprehensiveReport.sections.length}개:`)
      for (const s of fi.comprehensiveReport.sections.slice(0, 3)) {
        console.log(`    📖 ${s.title}: ${String(s.body).slice(0, 120)}`)
      }
    }
  }
  if (fi.orthodox) {
    console.log(`\n  ━━━ 정통 해석 (orthodox aggregator) ━━━`)
    const o = fi.orthodox as Record<string, unknown>
    for (const k of ['advanced', 'root', 'jonggeok', 'hwagyeok', 'ilju', 'samgi', 'gongmang']) {
      if (o[k]) console.log(`    ✓ ${k} 분석 포함`)
    }
  }
  // ⭐ 새 3 — narrative / patterns / predictive
  const fix = fi as unknown as {
    narrative?: { main?: string; details?: string[]; keywords?: string[]; advice?: string }
    patterns?: { matched?: Array<{ name: string; rarity?: string; description?: string }>; recommendations?: string[]; cautions?: string[] }
    predictive?: { favorableAreas?: string[]; warningAreas?: string[]; keyEvents?: Array<{ description: string; date?: string }>; recommendations?: string[] }
  }
  if (fix.narrative) {
    console.log(`\n  ━━━ 종합 자연어 (generateComprehensiveText) ━━━`)
    if (fix.narrative.main) console.log(`  📖 ${fix.narrative.main}`)
    if (fix.narrative.advice) console.log(`  💡 ${fix.narrative.advice}`)
    if (fix.narrative.keywords?.length) console.log(`  🏷  키워드: ${fix.narrative.keywords.slice(0, 6).join(', ')}`)
    if (fix.narrative.details?.length) {
      console.log(`  📋 상세:`)
      for (const d of fix.narrative.details.slice(0, 4)) console.log(`    · ${d}`)
    }
  }
  if (fix.patterns) {
    console.log(`\n  ━━━ 명리 패턴 (analyzePatterns) ━━━`)
    if (fix.patterns.matched?.length) {
      console.log(`  매칭 ${fix.patterns.matched.length}개:`)
      for (const p of fix.patterns.matched.slice(0, 5)) {
        console.log(`    · ${p.name}${p.rarity ? ` [${p.rarity}]` : ''}: ${p.description || ''}`)
      }
    } else {
      console.log(`  매칭 패턴 없음`)
    }
    if (fix.patterns.recommendations?.length) {
      console.log(`  권장: ${fix.patterns.recommendations.slice(0, 3).join(' / ')}`)
    }
    if (fix.patterns.cautions?.length) {
      console.log(`  주의: ${fix.patterns.cautions.slice(0, 3).join(' / ')}`)
    }
  }
  // ⭐ 진짜 종합 예측 (matrix/prediction:generateComprehensivePrediction)
  const cp = (fi as unknown as {
    comprehensivePrediction?: {
      multiYearTrend?: {
        startYear: number; endYear: number;
        yearlyScores: Array<{ year: number; score: number; grade?: string; theme?: string }>;
        overallTrend?: string;
        peakYears?: number[]; lowYears?: number[];
        summary?: string;
      }
      upcomingHighlights?: Array<{ date?: Date | string; description: string; type?: string; grade?: string }>
      lifeSync?: { syncStrength?: number; alignmentLevel?: string; recommendations?: string[] }
      confidence?: number
    }
  }).comprehensivePrediction
  if (cp) {
    console.log(`\n  ━━━ 종합 예측 (matrix/prediction — 다년 트렌드 + 대운트랜짓) ━━━`)
    if (cp.confidence !== undefined) console.log(`  신뢰도: ${cp.confidence > 1 ? cp.confidence.toFixed(0) : (cp.confidence * 100).toFixed(0)}점`)
    if (cp.multiYearTrend) {
      const my = cp.multiYearTrend
      console.log(`  다년 트렌드 (${my.startYear}~${my.endYear}, 전반: ${my.overallTrend || '—'}):`)
      for (const y of (my.yearlyScores || []).slice(0, 8)) {
        console.log(`    ${y.year}: ${y.score?.toFixed(0)}점${y.grade ? ` [${y.grade}]` : ''}${y.theme ? ` — ${y.theme}` : ''}`)
      }
      if (my.peakYears?.length) console.log(`    🌟 정점: ${my.peakYears.join(', ')}년`)
      if (my.lowYears?.length) console.log(`    💀 저점: ${my.lowYears.join(', ')}년`)
      if (my.summary) console.log(`    📜 ${my.summary}`)
    }
    if (cp.upcomingHighlights?.length) {
      console.log(`  🎯 다가올 핵심 시기:`)
      for (const h of cp.upcomingHighlights.slice(0, 5)) {
        const dateStr = h.date instanceof Date ? h.date.toISOString().slice(0, 10) : (h.date || '')
        console.log(`    · ${dateStr ? `[${dateStr}] ` : ''}${h.description}${h.grade ? ` [${h.grade}]` : ''}`)
      }
    }
    if (cp.lifeSync) {
      if (cp.lifeSync.alignmentLevel) console.log(`  대운트랜짓 동기화: ${cp.lifeSync.alignmentLevel}${cp.lifeSync.syncStrength !== undefined ? ` (강도 ${cp.lifeSync.syncStrength})` : ''}`)
      if (cp.lifeSync.recommendations?.length) {
        console.log(`  💡 동기화 권장:`)
        for (const r of cp.lifeSync.recommendations.slice(0, 3)) console.log(`    · ${r}`)
      }
    }
  }

  if (fix.predictive) {
    // 옛 stub 만 남은 경우 — 빈 출력 안 보이도록 skip
    const hasContent = (fix.predictive.favorableAreas?.length ?? 0) + (fix.predictive.warningAreas?.length ?? 0) + (fix.predictive.keyEvents?.length ?? 0) + (fix.predictive.recommendations?.length ?? 0)
    if (hasContent > 0) {
      console.log(`\n  ━━━ 예측 통찰 (eventCorrelation — simple) ━━━`)
      if (fix.predictive.favorableAreas?.length) console.log(`  ✨ 길지: ${fix.predictive.favorableAreas.slice(0, 5).join(', ')}`)
      if (fix.predictive.warningAreas?.length) console.log(`  ⚠ 주의: ${fix.predictive.warningAreas.slice(0, 5).join(', ')}`)
      if (fix.predictive.keyEvents?.length) {
        console.log(`  🎯 핵심 이벤트:`)
        for (const e of fix.predictive.keyEvents.slice(0, 3)) console.log(`    · ${e.description}${e.date ? ` (${e.date})` : ''}`)
      }
      if (fix.predictive.recommendations?.length) {
        console.log(`  📌 권장:`)
        for (const r of fix.predictive.recommendations.slice(0, 3)) console.log(`    · ${r}`)
      }
    }
  }
}

console.log('\n' + '='.repeat(72))
