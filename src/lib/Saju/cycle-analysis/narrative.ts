/**
 * Phase 2 — Cycle Narrative 생성기 (deterministic, no LLM)
 *
 * Phase 1 의 9차원 cycleAnalysis 데이터를 받아서 정통 사주 톤의
 * 한국어 narrative 를 생성. LLM 없이 데이터 기반.
 *
 * 출력:
 *   - oneLineKey:    일진용 한 줄 (점수 + 키 사인)
 *   - shortSummary:  월운용 3-5줄
 *   - fullNarrative: 대운/세운용 5-10 섹션
 *
 * 정통 일관성: 점수와 narrative 가 같은 cycleAnalysis 데이터를 본다.
 */
import type { CycleEntry } from '../../main-saju'

export type CycleKind = 'daeun' | 'seun' | 'wolun' | 'iljin'

export interface NarrativeSection {
  title: string
  body: string
}

export interface CycleNarrative {
  /** 일진용 한 줄 — "점수 X (오늘 키워드)" */
  oneLineKey: string
  /** 월운용 압축 요약 (3-5줄) */
  shortSummary: string[]
  /** 대운/세운용 풀 narrative */
  fullNarrative: {
    headline: string
    sections: NarrativeSection[]
  }
}

interface NarrateContext {
  cycleKind: CycleKind
  cycleGanji: string // 예: "甲戌"
  score?: number
  scoreMax?: number
  /** 대운 5/5 phase (대운만) */
  daeunPhase?: { phase: 'stem' | 'branch'; progress: number; phaseStartAge: number }
  /** 세운 삼재 (세운만) */
  samjaePhase?: 'enter' | 'middle' | 'exit'
}

const CYCLE_LABEL: Record<CycleKind, string> = {
  daeun: '대운', seun: '세운', wolun: '월운', iljin: '일진',
}

const TONE_PHRASE: Record<string, string> = {
  rise: '운이 상승하는 흐름',
  peak: '운이 절정에 이른 시기',
  decline: '운이 빠지는 흐름',
  rest: '운이 가라앉아 정리하는 시기',
  transition: '운이 변동하며 자리잡는 시기',
}

const SHIFT_LABEL: Record<string, string> = {
  strengthen: '격국 강화',
  break: '격국 파격 위협',
  protect: '격국 호격 (위협 견제)',
  shake: '격국 동요',
  neutral: '격국 무관',
}

export function narrateCycle(entry: CycleEntry, ctx: NarrateContext): CycleNarrative {
  const sections: NarrativeSection[] = []

  // ── 1. 운기 흐름
  sections.push(buildFlowSection(entry, ctx))

  // ── 2. 활동 영역 (어느 기둥에 영향)
  sections.push(buildDomainSection(entry, ctx))

  // ── 3. 영향력 실재 (통근/투간)
  sections.push(buildRootednessSection(entry))

  // ── 4. 격국 변동
  sections.push(buildGeokgukSection(entry, ctx))

  // ── 5. 신살 발현
  const shinsalSection = buildShinsalSection(entry)
  if (shinsalSection) sections.push(shinsalSection)

  // ── 6. 천간합 化 (이벤트 있을 때만)
  const hwaSection = buildHwaSection(entry)
  if (hwaSection) sections.push(hwaSection)

  // ── 7. 삼기 (cycle_completes 또는 already_complete 일 때만)
  const samgiSection = buildSamgiSection(entry)
  if (samgiSection) sections.push(samgiSection)

  // ── 8. 조후 변화 (improving / worsening 일 때만)
  const johuSection = buildJohuSection(entry)
  if (johuSection) sections.push(johuSection)

  // ── 9. 대운 5/5 단계 (대운만)
  if (ctx.daeunPhase) {
    sections.push(buildDaeunPhaseSection(entry, ctx))
  }
  // ── 10. 세운 삼재 단계 (세운만)
  if (ctx.cycleKind === 'seun' && ctx.samjaePhase) {
    sections.push(buildSamjaePhaseSection(ctx.samjaePhase))
  }

  const headline = buildHeadline(entry, ctx)

  return {
    oneLineKey: buildOneLineKey(entry, ctx),
    shortSummary: buildShortSummary(entry, ctx),
    fullNarrative: { headline, sections },
  }
}

// ─────────────────────────────────────────────────────────────────
// Headline / OneLineKey / ShortSummary
// ─────────────────────────────────────────────────────────────────

function buildHeadline(entry: CycleEntry, ctx: NarrateContext): string {
  const label = CYCLE_LABEL[ctx.cycleKind]
  const tone = TONE_PHRASE[entry.twelveStages.tone] || ''
  const shift = entry.geokgukShift.shift
  const shiftLabel = shift !== 'neutral' ? `, ${SHIFT_LABEL[shift]}` : ''
  const scoreStr = ctx.score !== undefined && ctx.scoreMax
    ? ` — ${ctx.score.toFixed(1)}/${ctx.scoreMax}`
    : ''
  return `${label} ${ctx.cycleGanji}: ${tone}${shiftLabel}${scoreStr}`
}

function buildOneLineKey(entry: CycleEntry, ctx: NarrateContext): string {
  const tone = entry.twelveStages.tone
  const peak = entry.twelveStages.natalPeak
  const peakDesc = peak ? `${peak.pillar}에서 ${peak.stage}` : ''
  const luckShinsal = entry.shinsalActivation.hits
    .filter((h) => h.tone === 'lucky')
    .map((h) => h.kind)[0]
  const unluckShinsal = entry.shinsalActivation.hits
    .filter((h) => h.tone === 'unlucky')
    .map((h) => h.kind)[0]

  const sign = luckShinsal ? `${luckShinsal}+` : unluckShinsal ? `${unluckShinsal}-` : peakDesc
  const scoreStr = ctx.score !== undefined && ctx.scoreMax
    ? `${ctx.score.toFixed(1)}/${ctx.scoreMax}`
    : ''
  return `${ctx.cycleGanji} ${TONE_PHRASE[tone] || tone}${sign ? ' · ' + sign : ''}${scoreStr ? ' (' + scoreStr + ')' : ''}`
}

function buildShortSummary(entry: CycleEntry, ctx: NarrateContext): string[] {
  const lines: string[] = []
  const tone = entry.twelveStages.tone
  lines.push(`${ctx.cycleGanji} ${TONE_PHRASE[tone] || tone}.`)

  const dominant = entry.pillarInteractions.dominantSignal
  if (dominant) {
    lines.push(`${dominant.domain}이 핵심 — ${dominant.pillar}와 ${dominant.relation}.`)
  }

  if (entry.geokgukShift.shift !== 'neutral') {
    lines.push(`격국은 ${SHIFT_LABEL[entry.geokgukShift.shift]} (강도 ${entry.geokgukShift.intensity}).`)
  }

  const activeShinsal = entry.shinsalActivation.hits
    .filter((h) => h.tone !== 'neutral')
    .map((h) => h.kind)
  if (activeShinsal.length > 0) {
    lines.push(`신살: ${activeShinsal.slice(0, 3).join(', ')}.`)
  }

  if (entry.rootedness.isRootless) {
    lines.push('cycle 천간 무근 — 영향력 약함 (실제 발현 제한적).')
  }

  return lines.slice(0, 5)
}

// ─────────────────────────────────────────────────────────────────
// 섹션 빌더들
// ─────────────────────────────────────────────────────────────────

function buildFlowSection(entry: CycleEntry, _ctx: NarrateContext): NarrativeSection {
  const ts = entry.twelveStages
  const cycleStateDesc = phraseStrength(ts.cycleStrength)
  const dayStateDesc = phraseStrength(ts.dayMasterStrength)
  const keywords = ts.keywords.slice(0, 3).join('·')

  let body =
    `cycle 천간은 ${ts.cycleStage} 자리에서 ${cycleStateDesc}로, 본인 일간은 ${ts.dayMasterStage} 자리에서 ${dayStateDesc}.`
  if (keywords) body += ` 핵심 기운: ${keywords}.`
  if (ts.natalPeak) {
    body += ` 본명 ${ts.natalPeak.pillar}(${ts.natalPeak.branch}) 영역에서 ${ts.natalPeak.stage}로 가장 두드러짐.`
  }
  return { title: '운기 흐름', body }
}

function buildDomainSection(entry: CycleEntry, _ctx: NarrateContext): NarrativeSection {
  const pi = entry.pillarInteractions
  const active = pi.pillars.filter((p) => p.tone !== 'neutral')
  if (active.length === 0) {
    return { title: '활동 영역', body: '본명 4기둥과 큰 합/충 없이 조용한 흐름.' }
  }
  const lines = active.map((p) => {
    const stem = p.stemRelation ? `천간 ${p.stemRelation}` : ''
    const br = p.branchRelation ? `지지 ${p.branchRelation}` : ''
    const rel = [stem, br].filter(Boolean).join(' + ')
    return `${p.domain}: ${rel}`
  })
  return {
    title: '활동 영역',
    body: lines.join(' / '),
  }
}

function buildRootednessSection(entry: CycleEntry): NarrativeSection {
  const r = entry.rootedness
  if (r.isRootless) {
    return {
      title: '영향력 실재',
      body: 'cycle 천간이 무근 — 표면적 변화는 있되 실제 발현은 제한적.',
    }
  }
  const top = r.cycleStemRoots[0]
  let body = `cycle 천간이 ${top.pillar}(${top.branch}) ${top.layer}에 통근, 총 강도 ${r.rootStrengthTotal}.`
  if (r.cycleBranchTuggan.length > 0) {
    const tug = r.cycleBranchTuggan
      .slice(0, 2)
      .map((t) => `${t.stem}(${t.cycleLayer}, ${t.pillar})`)
      .join(', ')
    body += ` 지장간 투간: ${tug}.`
  }
  return { title: '영향력 실재', body }
}

function buildGeokgukSection(entry: CycleEntry, _ctx: NarrateContext): NarrativeSection {
  const g = entry.geokgukShift
  let body = `${g.geokguk}에 ${SHIFT_LABEL[g.shift]} (강도 ${g.intensity}).`
  if (g.reasons.length > 0) {
    body += ` 근거: ${g.reasons.slice(0, 3).join('; ')}.`
  }
  if (g.transformedTo) {
    body += ` 일시 변질: ${g.transformedTo.geokguk} (${g.transformedTo.by} ${g.transformedTo.sibsin}).`
  }
  return { title: '격국 변동', body }
}

function buildShinsalSection(entry: CycleEntry): NarrativeSection | null {
  const hits = entry.shinsalActivation.hits
  if (hits.length === 0) return null
  const lucky = hits.filter((h) => h.tone === 'lucky').map((h) => h.kind)
  const unlucky = hits.filter((h) => h.tone === 'unlucky').map((h) => h.kind)
  const neutral = hits.filter((h) => h.tone === 'neutral').map((h) => h.kind)
  const parts: string[] = []
  if (lucky.length) parts.push(`길성: ${lucky.join('·')}`)
  if (unlucky.length) parts.push(`흉성: ${unlucky.join('·')}`)
  if (neutral.length) parts.push(`중성: ${neutral.join('·')}`)
  return { title: '신살 발현', body: parts.join(' / ') }
}

function buildHwaSection(entry: CycleEntry): NarrativeSection | null {
  const hwa = entry.hwaTransform.primaryEvent
  if (!hwa) return null
  const labels: Record<string, string> = {
    true: '진짜 化 — 일간 변신, 직업/관계 큰 전환',
    false: '假合 — 化 깨짐, 행동 묶임',
    simple: '단순 합 — 인연 묶임만, 化 미성립',
  }
  const body = `${hwa.description} → ${labels[hwa.quality]}.`
  return { title: '천간합 化', body }
}

function buildSamgiSection(entry: CycleEntry): NarrativeSection | null {
  const s = entry.samgi
  if (s.state === 'none' || s.state === 'partial') return null
  if (s.state === 'cycle_completes') {
    return {
      title: '삼기 완성',
      body: `${s.type} 가 cycle 천간 ${s.completingStem}로 완성됨 — 큰 길운 (${(s.natalStems || []).join('·')}+${s.completingStem}).`,
    }
  }
  if (s.state === 'already_complete') {
    return {
      title: '삼기',
      body: `본명에 이미 ${s.type} 갖춤 — cycle 영향 없으나 잠재 길운 유지.`,
    }
  }
  return null
}

function buildJohuSection(entry: CycleEntry): NarrativeSection | null {
  const j = entry.johuShift
  if (j.shift === 'neutral') return null
  return { title: '조후 변화', body: j.summary }
}

function buildDaeunPhaseSection(_entry: CycleEntry, ctx: NarrateContext): NarrativeSection {
  const dp = ctx.daeunPhase!
  const phaseLabel = dp.phase === 'stem' ? '천간기 (전반 5년)' : '지지기 (후반 5년)'
  const focus = dp.phase === 'stem' ? '천간 영향 70%' : '지지 영향 70%'
  return {
    title: '대운 5/5 단계',
    body: `현재 ${phaseLabel}, 진행도 ${Math.round(dp.progress * 100)}% (시작 ${dp.phaseStartAge}세). ${focus}.`,
  }
}

function buildSamjaePhaseSection(phase: 'enter' | 'middle' | 'exit'): NarrativeSection {
  const labels: Record<string, string> = {
    enter: '들어삼재 (1년차) — 변화 시작, 신중',
    middle: '누운삼재 (2년차) — 정점 흉, 가장 무거움',
    exit: '나는삼재 (3년차) — 풀려가는 단계',
  }
  return { title: '삼재 단계', body: labels[phase] }
}

// ─────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────

function phraseStrength(s: number): string {
  if (s >= 1.5) return '절정'
  if (s >= 1) return '강세'
  if (s >= 0.5) return '상승'
  if (s <= -1.5) return '침체'
  if (s <= -1) return '약세'
  if (s <= -0.5) return '하강'
  return '중간'
}
