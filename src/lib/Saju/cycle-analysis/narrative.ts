/**
 * Phase 2 — Cycle Narrative 생성기 (deterministic, no LLM, 정통 톤)
 *
 * Phase 1 의 9차원 cycleAnalysis 데이터를 정통 사주 의미로 변환해서
 * 한국어 narrative 를 생성. 점수와 narrative 가 같은 데이터 소스.
 *
 * 출력 구성:
 *   oneLineKey:    일진용 한 줄 — "오늘 키사인 (점수)"
 *   shortSummary:  월운용 압축 (3-5줄)
 *   fullNarrative: 대운/세운용 풀 — headline (종합) + sections (각 의미)
 *
 * v2 업그레이드:
 *   (A) 종합 headline — 점수 등급 + 톤 + 상쇄까지 반영
 *   (B) 섹션마다 "의미" 한 줄 — 데이터 → 행동/시기 advice
 *   (C) cross-signal 종합 — 파격+공망풀림 같이 상쇄 표현
 *   (D) 시기 조언 — 대운 phase / 삼재 단계별
 *   (E) 한국어 매끄럼 — 조사·어미 통일
 */
import type { CycleEntry } from '../../main-saju'
import type { TwelveStage } from './twelveStages'

export type CycleKind = 'daeun' | 'seun' | 'wolun' | 'iljin'

export interface NarrativeSection {
  title: string
  body: string
}

export interface CycleNarrative {
  oneLineKey: string
  shortSummary: string[]
  fullNarrative: {
    /** 종합 헤드라인 — 점수 등급 + 톤 + 핵심 시그널 */
    headline: string
    /** 종합 결론 (cross-signal 상쇄 후) */
    overallVerdict: string
    sections: NarrativeSection[]
  }
}

interface NarrateContext {
  cycleKind: CycleKind
  cycleGanji: string
  score?: number
  scoreMax?: number
  daeunPhase?: { phase: 'stem' | 'branch'; progress: number; phaseStartAge: number }
  samjaePhase?: 'enter' | 'middle' | 'exit'
  /** 본명 보조 정보 — 이중 격국 / 희신 / 기신 + 본명 보강 (iljuDeep, 신살, 천간충극) */
  natalContext?: {
    geokgukSecondary?: string
    yongsinPrimary?: string
    yongsinSecondary?: string
    kibsinElements?: string[]
    johuYongsinSecondary?: string
    /** 일주 60갑자 톤 */
    iljuCharacter?: string
    iljuStrengths?: string[]
    iljuWeaknesses?: string[]
    /** 본명 자체에 보유한 신살 (귀인 보유자 vs 비보유자 등) */
    natalShinsalKinds?: string[]
    /** 본명 4기둥 일간 12운성 분포 — ['장생','임관','묘','왕지'] 형태 */
    natalTwelveStages?: { year: string; month: string; day: string; time: string }
    /** 본명 천간 충극 — '甲庚충' 같은 라벨 배열 */
    natalStemConflicts?: string[]
  }
}

const CYCLE_LABEL: Record<CycleKind, string> = {
  daeun: '대운', seun: '세운', wolun: '월운', iljin: '일진',
}

// ─────────────────────────────────────────────────────────────────
// 의미 Lexicon — 데이터 → 정통 사주 의미 변환
// ─────────────────────────────────────────────────────────────────

const STAGE_MEANING: Record<TwelveStage, string> = {
  장생: '새 출발과 잠재력 발현',
  목욕: '시행착오와 도화 기운',
  관대: '독립과 자리 잡기',
  임관: '주도권 확립과 실력 발휘',
  왕지: '정점, 강한 자기주장',
  쇠: '열기 식고 신중해지는 흐름',
  병: '회의감과 재정비 필요',
  사: '의욕 저하와 마무리',
  묘: '수렴과 정리, 저장',
  절: '단절과 리셋, 바닥',
  태: '잉태기, 눈에 안 띄는 변화',
  양: '양육기, 서서히 형성',
}

const DOMAIN_MEANING_BY_RELATION: Record<string, Record<string, string>> = {
  year: {
    충: '조상·사회 영역에서 환경 흔들림 — 멀리서 오는 변동',
    삼합: '사회 인연이 크게 모이는 시기',
    육합: '윗세대·사회와 화합',
    형: '사회 마찰',
    해: '사회적 방해',
    파: '사회 관계 깨짐',
    원진: '사회 갈등',
    천간합: '윗사람·사회 인연 묶임',
  },
  month: {
    충: '직업·형제 영역 동요 — 본업 변동 가능',
    삼합: '직업·사회 큰 협업/연합 형성',
    육합: '직업 화합·인연',
    형: '직업 마찰·갈등',
    해: '동료 방해',
    파: '직업 단절',
    원진: '직장 내 원망',
    천간합: '직업 영역 묶임',
  },
  day: {
    충: '배우자·자기 영역 흔들림 — 가까운 관계 충돌',
    삼합: '배우자·인연 모임',
    육합: '배우자와 화합·인연',
    형: '배우자 마찰',
    해: '배우자 갈등',
    파: '관계 깨짐',
    원진: '배우자 원망',
    천간합: '배우자·자기 영역 묶임 (큰 사건)',
  },
  time: {
    충: '자녀·말년 영역 동요',
    삼합: '자녀·말년 인연',
    육합: '자녀와 화합',
    형: '자녀 갈등',
    해: '자녀 방해',
    파: '말년 단절',
    원진: '자녀 원망',
    천간합: '자녀·말년 영역 묶임',
  },
}

const SHIFT_MEANING: Record<string, string> = {
  strengthen: '본업·격국이 cycle 인해 단단해지는 시기',
  break: '격국 깨질 위험 — 본업 동요·혼란 가능',
  protect: '위협 있으나 다른 신이 견제 — 보호받는 흐름',
  shake: '약한 동요, 큰 변화는 아님',
  neutral: '격국엔 큰 영향 없음',
}

const SHIFT_MEANING_JONGGEOK: Record<string, string> = {
  strengthen: '종격 본명 흐름 따라가는 시기 — 일행 강화로 결과 명확',
  break: '종격 거스름 — 본명 흐름 자체 흔들림 (매우 큰 충격, 신중)',
  protect: '거스름 위협 있으나 다른 신이 견제 — 흐름 유지',
  shake: '약한 동요, 종격 본질엔 영향 적음',
  neutral: '종격엔 큰 영향 없음',
}

const SHIFT_MEANING_HWAGYEOK: Record<string, string> = {
  strengthen: '化氣 보호 — 변신한 오행 흐름 강화, 새 정체성 단단',
  break: '化氣 깨짐 위험 — 일간 변신 실패, 정체성 혼란 가능',
  protect: '化氣 위협 있으나 견제됨 — 변신 유지',
  shake: '化氣 약한 동요',
  neutral: '化氣엔 큰 영향 없음',
}

function getShiftMeaning(geokguk: string, shift: string): string {
  // 종격 5종
  if (geokguk.startsWith('종')) {
    return SHIFT_MEANING_JONGGEOK[shift] || SHIFT_MEANING[shift]
  }
  // 화격 (갑기화토격 등)
  if (geokguk.includes('화') && (geokguk.includes('격') || geokguk.endsWith('화격'))) {
    if (geokguk === '화격' || /^[갑을병정무]/.test(geokguk)) {
      return SHIFT_MEANING_HWAGYEOK[shift] || SHIFT_MEANING[shift]
    }
  }
  return SHIFT_MEANING[shift]
}

const SHINSAL_MEANING: Record<string, string> = {
  천을귀인: '귀인 도움 — 만남·기회에 적극 응할 시기',
  천덕귀인: '하늘의 덕 — 위험에서 보호',
  월덕귀인: '달의 덕 — 안정과 화합',
  건록: '록지 — 안정적 수입·자리',
  암록: '숨은 도움',
  학당귀인: '학문·실력 발휘',
  문창: '학문·시험 운',
  문곡: '예술·창작 운',
  공망풀림: '비어있던 영역이 활성화 — 잠재 기운 발현',
  공망묶임: '비어있는 영역이 묶임 — 진전 어려움',
  역마: '이동·여행·환경 변화',
  도화: '인연·연애·인기',
  화개: '예술·종교·내면 활동',
  양인: '강한 에너지 — 다툼·사고 조심',
  공망: '허무함 — 결과 더디게',
  귀문관: '정신적 혼란',
  원진: '내적 갈등',
}

const SAMJAE_MEANING: Record<string, string> = {
  enter: '들어삼재 (1년차) — 변화 신호 시작, 큰 결정은 보류',
  middle: '누운삼재 (2년차) — 정점 흉, 새 시도 자제',
  exit: '나는삼재 (3년차) — 풀려가는 단계, 회복 시작',
}

// ─────────────────────────────────────────────────────────────────
// 종합 헤드라인 + Verdict (점수 + tone + cross-signal)
// ─────────────────────────────────────────────────────────────────

function gradeLabel(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 90) return '천운기'
  if (pct >= 75) return '길운기'
  if (pct >= 55) return '평운기'
  if (pct >= 35) return '주의기'
  return '흉운기'
}

function buildHeadline(entry: CycleEntry, ctx: NarrateContext): string {
  const label = CYCLE_LABEL[ctx.cycleKind]
  const tone = entry.twelveStages.tone
  const grade = ctx.score !== undefined && ctx.scoreMax
    ? gradeLabel(ctx.score, ctx.scoreMax)
    : ''

  // 핵심 키워드 추출
  const keys: string[] = []
  if (entry.geokgukShift.shift === 'strengthen' && entry.geokgukShift.intensity >= 2) {
    keys.push('격국 강화')
  } else if (entry.geokgukShift.shift === 'break' && entry.geokgukShift.intensity >= 2) {
    keys.push('파격 위협')
  }
  const lucky = entry.shinsalActivation.hits.filter((h) => h.tone === 'lucky')
  if (lucky.length > 0) keys.push(`${lucky[0].kind}`)
  const peak = entry.twelveStages.natalPeak
  if (peak && peak.strength >= 1) {
    const domain = peak.pillar === 'year' ? '사회' :
      peak.pillar === 'month' ? '직업' :
      peak.pillar === 'day' ? '관계' : '말년'
    keys.push(`${domain} ${peak.stage}`)
  }
  const keysStr = keys.slice(0, 3).join(' · ')

  const scoreStr = ctx.score !== undefined && ctx.scoreMax
    ? ` [${ctx.score.toFixed(1)}/${ctx.scoreMax}]`
    : ''
  const gradeStr = grade ? ` ${grade}` : ''

  return `${label} ${ctx.cycleGanji}${gradeStr}${scoreStr} — ${TONE_PHRASE[tone]}${keysStr ? ' · ' + keysStr : ''}`
}

const TONE_PHRASE: Record<string, string> = {
  rise: '운이 상승하는 흐름',
  peak: '운이 절정에 이른 시기',
  decline: '운이 빠지는 흐름',
  rest: '운이 가라앉아 정리하는 시기',
  transition: '운이 변동하며 자리잡는 시기',
}

/**
 * Cross-signal 종합 verdict — 점수 + 신호 합산해서 한 단락 결론
 */
function buildOverallVerdict(entry: CycleEntry, ctx: NarrateContext): string {
  const score = ctx.score
  const max = ctx.scoreMax
  const pct = score !== undefined && max ? (score / max) * 100 : 50

  // 시그널 수집
  const positives: string[] = []
  const negatives: string[] = []

  if (entry.geokgukShift.shift === 'strengthen') {
    positives.push(`격국 강화(강도 ${entry.geokgukShift.intensity})`)
  } else if (entry.geokgukShift.shift === 'break') {
    negatives.push(`격국 파격(강도 ${entry.geokgukShift.intensity})`)
  }
  const luckyShinsal = entry.shinsalActivation.hits
    .filter((h) => h.tone === 'lucky')
    .map((h) => h.kind)
  const unluckyShinsal = entry.shinsalActivation.hits
    .filter((h) => h.tone === 'unlucky')
    .map((h) => h.kind)
  if (luckyShinsal.length) positives.push(`길성 ${luckyShinsal.join('·')}`)
  if (unluckyShinsal.length) negatives.push(`흉성 ${unluckyShinsal.join('·')}`)

  if (entry.rootedness.isRootless) negatives.push('cycle 무근')
  else if (entry.rootedness.rootStrengthTotal >= 2) positives.push('통근 깊음')

  const hwa = entry.hwaTransform.primaryEvent
  if (hwa?.quality === 'true') positives.push('진짜 化(큰 전환)')
  else if (hwa?.significance === 3) negatives.push('일간 묶임 (假合)')

  if (entry.samgi.state === 'cycle_completes') positives.push('삼기 완성')

  // 종합 결론 — 임계값을 gradeLabel(90/75/55/35) 과 일치시켜 톤 일관 유지
  let verdict = ''
  if (pct >= 90 && negatives.length === 0) {
    verdict = '전반적으로 매우 길한 시기 — 적극 행동할 때다.'
  } else if (pct >= 75) {
    verdict = `호운 흐름 — ${(positives.slice(0, 2).join(', ')) || '전반적 길운'}이 길성 역할.`
    if (negatives.length) verdict += ` 다만 ${negatives[0]} 점은 주의.`
  } else if (pct >= 55) {
    if (positives.length && negatives.length) {
      verdict = `평운 — ${positives[0]} 보강 / ${negatives[0]} 견제로 균형.`
    } else if (positives.length) {
      verdict = `평운 — ${positives[0]}으로 일부 호조.`
    } else if (negatives.length) {
      verdict = `평운 — ${negatives[0]} 점은 주의, 큰 변동은 없음.`
    } else {
      verdict = '평운 — 큰 변동 없이 안정 유지.'
    }
  } else if (pct >= 35) {
    verdict = `주의기 — ${(negatives.slice(0, 2).join(', ')) || '전반적 약운'}가 우세. 보수적 자세.`
    if (positives.length) verdict += ` ${positives[0]}이 일부 상쇄.`
  } else {
    verdict = '흉운 흐름 — 새 시도 자제, 기존 자리 지키는 시기.'
    if (positives.length) verdict += ` 다만 ${positives[0]}이 풀어주는 면 있음.`
  }

  return verdict
}

// ─────────────────────────────────────────────────────────────────
// OneLineKey / ShortSummary
// ─────────────────────────────────────────────────────────────────

function buildOneLineKey(entry: CycleEntry, ctx: NarrateContext): string {
  const sign = entry.shinsalActivation.hits.find((h) => h.tone === 'lucky')?.kind
    || entry.shinsalActivation.hits.find((h) => h.tone === 'unlucky')?.kind
    || (entry.geokgukShift.shift !== 'neutral' ? entry.geokgukShift.shift : '')

  const grade = ctx.score !== undefined && ctx.scoreMax
    ? gradeLabel(ctx.score, ctx.scoreMax)
    : ''
  const scoreStr = ctx.score !== undefined && ctx.scoreMax
    ? `${ctx.score.toFixed(1)}/${ctx.scoreMax}`
    : ''
  const tone = TONE_PHRASE[entry.twelveStages.tone] || ''

  const parts = [
    ctx.cycleGanji,
    grade,
    tone,
    sign,
  ].filter(Boolean).join(' · ')
  return scoreStr ? `${parts} (${scoreStr})` : parts
}

function buildShortSummary(entry: CycleEntry, ctx: NarrateContext): string[] {
  const lines: string[] = []
  // 1. 종합
  lines.push(buildOverallVerdict(entry, ctx))

  // 2. 활동 영역
  const dom = entry.pillarInteractions.dominantSignal
  if (dom) {
    const meaning = DOMAIN_MEANING_BY_RELATION[dom.pillar]?.[dom.relation]
    if (meaning) lines.push(`핵심: ${meaning}.`)
  }

  // 3. 격국 변동 (강화/파격일 때만)
  if (entry.geokgukShift.shift !== 'neutral') {
    lines.push(`${getShiftMeaning(entry.geokgukShift.geokguk, entry.geokgukShift.shift)}.`)
  }

  // 4. 신살
  const activeLuck = entry.shinsalActivation.hits
    .filter((h) => h.tone !== 'neutral')
    .map((h) => SHINSAL_MEANING[h.kind] ? `${h.kind}` : '')
    .filter(Boolean)
  if (activeLuck.length) {
    lines.push(`신살: ${activeLuck.slice(0, 3).join(', ')}.`)
  }

  // 5. 무근시 경고
  if (entry.rootedness.isRootless) {
    lines.push('cycle 무근 — 표면 변화만 있고 실제 발현은 약함.')
  }

  return lines.slice(0, 5)
}

// ─────────────────────────────────────────────────────────────────
// 섹션 빌더 (의미 변환 추가)
// ─────────────────────────────────────────────────────────────────

function buildNatalToneSection(ctx: NarrateContext): NarrativeSection | null {
  const nc = ctx.natalContext
  if (!nc) return null
  const lines: string[] = []
  if (nc.iljuCharacter) {
    lines.push(`일주 톤: ${nc.iljuCharacter}.`)
  }
  if (nc.iljuStrengths?.length) {
    lines.push(`강점: ${nc.iljuStrengths.slice(0, 3).join('·')}.`)
  }
  if (nc.iljuWeaknesses?.length) {
    lines.push(`약점: ${nc.iljuWeaknesses.slice(0, 3).join('·')}.`)
  }
  if (nc.natalTwelveStages) {
    const t = nc.natalTwelveStages
    lines.push(`본명 12운성 (일간 기준): 사회 ${t.year} / 직업 ${t.month} / 자기 ${t.day} / 자녀 ${t.time}.`)
  }
  if (nc.natalShinsalKinds?.length) {
    lines.push(`본명 보유 신살: ${nc.natalShinsalKinds.slice(0, 5).join('·')}.`)
  }
  if (nc.natalStemConflicts?.length) {
    lines.push(`천간충극: ${nc.natalStemConflicts.join(', ')} — 명조 자체 불안정 요소.`)
  }
  if (lines.length === 0) return null
  return { title: '본명 톤', body: lines.join('\n     ') }
}

function buildFlowSection(entry: CycleEntry): NarrativeSection {
  const ts = entry.twelveStages
  const cycleMean = STAGE_MEANING[ts.cycleStage] || ''
  const dayMean = STAGE_MEANING[ts.dayMasterStage] || ''
  let body = `cycle 천간 ${ts.cycleStage} 자리(${cycleMean}), 일간 ${ts.dayMasterStage} 자리(${dayMean}).`

  if (ts.natalPeak && ts.natalPeak.strength >= 0.5) {
    const domain =
      ts.natalPeak.pillar === 'year' ? '조상·사회' :
      ts.natalPeak.pillar === 'month' ? '직업·형제' :
      ts.natalPeak.pillar === 'day' ? '배우자·자기' : '자녀·말년'
    body += ` 본명 ${domain} 영역이 ${ts.natalPeak.stage} 단계로 가장 두드러짐.`
  }
  // 4기둥 전체 분포 (입체 묘사)
  if (ts.natalPillarStages && ts.natalPillarStages.length === 4) {
    const dist = ts.natalPillarStages.map((s) => {
      const dom = s.pillar === 'year' ? '사회' : s.pillar === 'month' ? '직업' : s.pillar === 'day' ? '관계' : '자녀'
      return `${dom} ${s.stage}`
    }).join(' / ')
    body += `\n     본명 4기둥 분포: ${dist}.`
  }
  return { title: '운기 흐름', body }
}

function buildDomainSection(entry: CycleEntry): NarrativeSection {
  const pi = entry.pillarInteractions
  const active = pi.pillars.filter((p) => p.tone !== 'neutral')
  if (active.length === 0) {
    return { title: '활동 영역', body: '본명 4기둥과 큰 합/충 없이 조용한 흐름.' }
  }
  const lines = active.map((p) => {
    // 의미 변환
    const stemRel = p.stemRelation
    const branchRel = p.branchRelation
    const dominantRel = branchRel || stemRel
    const meaning = dominantRel ? DOMAIN_MEANING_BY_RELATION[p.pillar]?.[dominantRel] : null
    const techStr = [
      p.stemRelation && `천간 ${p.stemRelation}`,
      p.branchRelation && `지지 ${p.branchRelation}`,
    ].filter(Boolean).join(' + ')
    return meaning
      ? `· ${meaning} (${techStr})`
      : `· ${p.domain}: ${techStr}`
  })
  return { title: '활동 영역', body: lines.join('\n     ') }
}

function buildRootednessSection(entry: CycleEntry): NarrativeSection {
  const r = entry.rootedness
  if (r.isRootless) {
    return {
      title: '영향력 실재',
      body: 'cycle 천간 무근 — 표면 흐름만 보이고 실제 결과는 약함. 큰 결심·투자는 신중.',
    }
  }
  const strength = r.rootStrengthTotal
  const strengthDesc = strength >= 2 ? '매우 깊게' : strength >= 1 ? '단단히' : '얕게'
  // 모든 통근 위치 (최대 4개)
  const rootList = r.cycleStemRoots
    .slice(0, 4)
    .map((rt) => `${rt.pillar}(${rt.branch}) ${rt.layer}`)
    .join(', ')
  let body = `cycle 천간이 ${rootList}에 ${strengthDesc} 통근 (총 강도 ${strength}). 운이 실제로 자리잡고 결과를 만든다.`
  if (r.cycleBranchTuggan.length > 0) {
    const tug = r.cycleBranchTuggan
      .slice(0, 4)
      .map((t) => `${t.stem}(${t.pillar})`)
      .join(', ')
    body += ` 잠재 에너지 표면화: ${tug}.`
  }
  return { title: '영향력 실재', body }
}

function buildGeokgukSection(entry: CycleEntry, ctx: NarrateContext): NarrativeSection {
  const g = entry.geokgukShift
  if (g.shift === 'neutral') {
    return { title: '격국 변동', body: `${g.geokguk}: 별다른 변동 없음.` }
  }
  const meaning = getShiftMeaning(g.geokguk, g.shift)
  let body = `${g.geokguk}`
  if (ctx.natalContext?.geokgukSecondary && ctx.natalContext.geokgukSecondary !== g.geokguk) {
    body += ` (이중격: ${ctx.natalContext.geokgukSecondary})`
  }
  body += `: ${meaning} (강도 ${g.intensity}).`
  if (g.transformedTo) {
    body += ` 일시 ${g.transformedTo.geokguk}으로 변질 — 새 역할 임시 부여.`
  }
  if (g.reasons.length > 0) {
    body += ` (근거: ${g.reasons.slice(0, 2).join('; ')})`
  }
  return { title: '격국 변동', body }
}

function buildShinsalSection(entry: CycleEntry): NarrativeSection | null {
  const hits = entry.shinsalActivation.hits
  if (hits.length === 0) return null
  const lines = hits.slice(0, 5).map((h) => {
    const meaning = SHINSAL_MEANING[h.kind]
    return meaning ? `· ${h.kind}: ${meaning}` : `· ${h.kind}`
  })
  return { title: '신살 발현', body: lines.join('\n     ') }
}

function buildHwaSection(entry: CycleEntry): NarrativeSection | null {
  const hwa = entry.hwaTransform.primaryEvent
  if (!hwa) return null
  const qualityMeaning: Record<string, string> = {
    true: `진짜 化 — 일간이 ${hwa.hwaElement}오행으로 변신. 직업·관계 큰 전환의 시기.`,
    false: `假合 (${hwa.hwaElement}) — 化 깨짐. 합으로 묶이지만 변신은 미성립. 묶인 채 진전 어려움.`,
    simple: `단순 합 — ${hwa.hwaElement} 化氣 미성립 (월령 부족). 인연 묶임만 발생.`,
  }
  return {
    title: '천간합 化',
    body: `cycle 천간 + ${hwa.natalStem} 합 (${hwa.natalPillar} 위치): ${qualityMeaning[hwa.quality]}`,
  }
}

function buildSamgiSection(entry: CycleEntry): NarrativeSection | null {
  const s = entry.samgi
  if (s.state === 'cycle_completes') {
    return {
      title: '삼기 완성',
      body: `${s.type} 가 cycle 천간 ${s.completingStem}로 완성됨. 큰 길운 시기 — 본명 ${(s.natalStems || []).join('·')} + ${s.completingStem}.`,
    }
  }
  if (s.state === 'already_complete') {
    return {
      title: '삼기',
      body: `본명에 이미 ${s.type} 갖춤. cycle 추가 영향은 없으나 잠재 길운 유지.`,
    }
  }
  if (s.state === 'partial' && s.type && s.natalStems) {
    // 완성 위해 필요한 글자 추출
    const allByType: Record<string, string[]> = {
      천상삼기: ['甲', '戊', '庚'],
      지하삼기: ['乙', '丙', '丁'],
      인중삼기: ['壬', '癸', '辛'],
    }
    const needed = (allByType[s.type] || []).filter((stem) => !s.natalStems!.includes(stem))
    return {
      title: '삼기 잠재',
      body: `${s.type} 부분 갖춤 (${s.natalStems.join('·')}). ${needed.length > 0 ? `${needed.join('·')} cycle 들어오면 완성 가능 — 잠재 길운 대기.` : ''}`,
    }
  }
  return null
}

function buildHiddenHapSection(entry: CycleEntry): NarrativeSection | null {
  const h = entry.hiddenStemHap
  if (h.hits.length === 0) return null
  return {
    title: '지장간 잠재 합',
    body: `${h.summary} 무의식·잠재 영역에서 일어나는 변화 신호.`,
  }
}

function buildJohuSection(entry: CycleEntry, ctx: NarrateContext): NarrativeSection | null {
  const j = entry.johuShift
  if (j.shift === 'neutral') return null
  const meaning =
    j.shift === 'improving'
      ? '한난조습 균형이 풀려 편안해지는 흐름'
      : j.shift === 'worsening'
      ? '한난조습 불균형 심화 — 건강·기분 영향'
      : '한난조습 혼재'
  let body = `${meaning} (강도 ${j.intensity}).`
  if (ctx.natalContext?.johuYongsinSecondary) {
    body += ` 보조 조후용신: ${ctx.natalContext.johuYongsinSecondary} 도 함께 작용.`
  }
  return { title: '조후 변화', body }
}

function buildDaeunPhaseSection(ctx: NarrateContext): NarrativeSection {
  const dp = ctx.daeunPhase!
  const phaseLabel = dp.phase === 'stem' ? '천간기 (전반 5년)' : '지지기 (후반 5년)'
  const focus = dp.phase === 'stem' ? '천간 영향이 70%' : '지지 영향이 70% (현실 발현기)'
  const pct = Math.round(dp.progress * 100)
  let advice: string
  if (pct < 25) {
    advice = dp.phase === 'stem'
      ? '이제 막 진입. 첫 발 디디는 시기 — 방향 설정 신중.'
      : '지지기 진입. 천간기에 잡은 흐름이 실제로 표면화 시작.'
  } else if (pct < 75) {
    advice = '안정 흐름. 지금 잡은 일이 충분히 발현될 시기.'
  } else {
    advice = dp.phase === 'stem'
      ? '전반 마무리. 곧 후반 지지기 진입 — 다음 단계 준비.'
      : '대운 마지막. 다음 대운 (10년 흐름 전환) 임박.'
  }
  return {
    title: '대운 5/5 단계',
    body: `${phaseLabel} 진행 ${pct}% (시작 ${dp.phaseStartAge}세). ${focus}. ${advice}`,
  }
}

function buildSamjaePhaseSection(phase: 'enter' | 'middle' | 'exit'): NarrativeSection {
  return { title: '삼재 단계', body: SAMJAE_MEANING[phase] }
}

// ─────────────────────────────────────────────────────────────────
// Tier별 framing — 대운(인생 챕터) / 세운(해의 이벤트) / 월운(달 집중) / 일진(오늘 액션)
// ─────────────────────────────────────────────────────────────────

const TIME_HORIZON: Record<CycleKind, string> = {
  daeun: '이 10년 흐름',
  seun: '이 한 해',
  wolun: '이번 달',
  iljin: '오늘',
}

/** 대운: 인생 챕터 테마 + big picture */
function buildDaeunChapterTheme(entry: CycleEntry, ctx: NarrateContext): NarrativeSection {
  const ageRange = ctx.daeunPhase
    ? `${ctx.daeunPhase.phaseStartAge - (ctx.daeunPhase.phase === 'branch' ? 5 : 0)}~${ctx.daeunPhase.phaseStartAge - (ctx.daeunPhase.phase === 'branch' ? 5 : 0) + 9}세`
    : '이 10년'
  const sibsin = entry.geokgukShift.geokguk
  const shift = entry.geokgukShift.shift

  let theme: string
  if (shift === 'strengthen') {
    theme = `${ageRange} = ${sibsin} 흐름이 단단해지는 안정·정착 챕터`
  } else if (shift === 'break') {
    theme = `${ageRange} = ${sibsin} 흐름이 흔들리는 전환·재정립 챕터`
  } else if (shift === 'protect') {
    theme = `${ageRange} = 흔들림 있으나 견제받아 유지되는 챕터`
  } else if (entry.geokgukShift.transformedTo) {
    theme = `${ageRange} = ${sibsin}이 ${entry.geokgukShift.transformedTo.geokguk}으로 일시 변신, 새 역할 챕터`
  } else {
    theme = `${ageRange} = 큰 변동 없는 평탄 챕터`
  }

  // 통근/무근 → 실제 발현 강도
  const realization = entry.rootedness.isRootless
    ? '단, cycle 천간 무근으로 표면적 변화만 보이고 실제 결과는 약함'
    : entry.rootedness.rootStrengthTotal >= 2
    ? '통근 깊어 흐름이 실제로 자리잡고 결과를 만든다'
    : '통근 얕아 변화는 있되 깊이는 제한적'

  return { title: '인생 챕터 테마', body: `${theme}. ${realization}.` }
}

/** 세운: 그 해의 주요 이벤트 3-5개 */
function buildSeunYearEvents(entry: CycleEntry, ctx: NarrateContext): NarrativeSection {
  const events: string[] = []

  // 격국 변동
  if (entry.geokgukShift.shift === 'strengthen' && entry.geokgukShift.intensity >= 2) {
    events.push(`본업 정점기 — 그동안 키운 ${entry.geokgukShift.geokguk} 자리에서 결과 발현`)
  } else if (entry.geokgukShift.shift === 'break' && entry.geokgukShift.intensity >= 2) {
    events.push('본업 흔들림 — 직업·역할 전환 가능')
  }

  // 천간합 化
  const hwa = entry.hwaTransform.primaryEvent
  if (hwa?.quality === 'true' && hwa.natalPillar === 'day') {
    events.push(`일간 변신 (化${hwa.hwaElement}) — 결혼·직업 큰 전환`)
  } else if (hwa?.significance === 3 && hwa.quality === 'simple') {
    events.push(`일간 묶임 (단순 합) — 관계 인연 강하게 묶이나 변신은 미성립`)
  }

  // 삼합 활성화
  const samhap = entry.pillarInteractions.pillars.filter((p) => p.branchRelation === '삼합')
  if (samhap.length > 0) {
    const domains = samhap.map((p) => p.domain).join(', ')
    events.push(`${domains} 영역 큰 협업·연합 형성`)
  }

  // 충
  const chung = entry.pillarInteractions.pillars.filter((p) => p.branchRelation === '충')
  if (chung.length > 0) {
    const domains = chung.map((p) => p.domain).join(', ')
    events.push(`${domains} 영역 충돌·이동 사건`)
  }

  // 길성 신살
  const lucky = entry.shinsalActivation.hits.filter((h) => h.tone === 'lucky')
  if (lucky.length >= 2) {
    events.push(`귀인·길성 다발 (${lucky.map((h) => h.kind).slice(0, 3).join('·')}) — 적극 행동`)
  }

  // 흉성 신살
  const unlucky = entry.shinsalActivation.hits.filter((h) => h.tone === 'unlucky')
  if (unlucky.length > 0) {
    events.push(`주의: ${unlucky.map((h) => h.kind).slice(0, 2).join('·')} 활성`)
  }

  // 삼재
  if (ctx.samjaePhase) {
    events.push(SAMJAE_MEANING[ctx.samjaePhase])
  }

  if (events.length === 0) {
    return { title: '이 해의 주요 이벤트', body: '큰 사건 신호 없이 평탄한 흐름.' }
  }

  return {
    title: '이 해의 주요 이벤트',
    body: events.slice(0, 5).map((e) => `· ${e}`).join('\n     '),
  }
}

/** 월운: 이번 달 집중 영역 + 행동 advice */
function buildWolunMonthFocus(entry: CycleEntry): NarrativeSection {
  const dom = entry.pillarInteractions.dominantSignal
  const lucky = entry.shinsalActivation.hits.find((h) => h.tone === 'lucky')
  const unlucky = entry.shinsalActivation.hits.find((h) => h.tone === 'unlucky')

  const lines: string[] = []
  if (dom) {
    const focus = DOMAIN_MEANING_BY_RELATION[dom.pillar]?.[dom.relation] || dom.domain
    lines.push(`집중 영역: ${focus}`)
  }
  if (lucky) {
    lines.push(`적극 활용: ${lucky.kind} (${SHINSAL_MEANING[lucky.kind] || ''})`)
  }
  if (unlucky) {
    lines.push(`조심: ${unlucky.kind} (${SHINSAL_MEANING[unlucky.kind] || ''})`)
  }
  if (entry.geokgukShift.shift === 'strengthen') {
    lines.push('본업 활성 — 진척 좋은 시기')
  } else if (entry.geokgukShift.shift === 'break') {
    lines.push('본업 일시 동요 — 큰 결정 보류')
  }
  if (lines.length === 0) {
    return { title: '이번 달 집중', body: '특별한 집중 영역 없이 평소대로 진행.' }
  }
  return {
    title: '이번 달 집중',
    body: lines.map((l) => `· ${l}`).join('\n     '),
  }
}

/** 일진: 오늘 핵심 액션 1-2개 */
function buildIljinTodayAction(entry: CycleEntry): NarrativeSection {
  const luckyTop = entry.shinsalActivation.hits.find((h) => h.tone === 'lucky')
  const unluckyTop = entry.shinsalActivation.hits.find((h) => h.tone === 'unlucky')
  const dom = entry.pillarInteractions.dominantSignal

  const actions: string[] = []
  if (luckyTop) {
    actions.push(`✓ ${luckyTop.kind} 활용 — ${SHINSAL_MEANING[luckyTop.kind] || ''}`)
  }
  if (unluckyTop) {
    actions.push(`✗ ${unluckyTop.kind} 조심 — ${SHINSAL_MEANING[unluckyTop.kind] || ''}`)
  }
  if (dom && dom.tone === 'positive') {
    const focus = DOMAIN_MEANING_BY_RELATION[dom.pillar]?.[dom.relation]
    if (focus) actions.push(`✓ 집중: ${focus}`)
  } else if (dom && dom.tone === 'negative') {
    const focus = DOMAIN_MEANING_BY_RELATION[dom.pillar]?.[dom.relation]
    if (focus) actions.push(`✗ 주의: ${focus}`)
  }
  if (entry.geokgukShift.shift === 'break' && entry.geokgukShift.intensity >= 2) {
    actions.push('✗ 본업·격국 동요 — 큰 결정·계약 미루기')
  }
  if (actions.length === 0) {
    return { title: '오늘 액션', body: '특별한 신호 없음. 평소대로 진행.' }
  }
  return {
    title: '오늘 액션',
    body: actions.slice(0, 4).map((a) => `${a}`).join('\n     '),
  }
}

// ─────────────────────────────────────────────────────────────────
// 메인 진입점
// ─────────────────────────────────────────────────────────────────

export function narrateCycle(entry: CycleEntry, ctx: NarrateContext): CycleNarrative {
  const sections: NarrativeSection[] = []
  const horizon = TIME_HORIZON[ctx.cycleKind]

  // ─── Tier별 섹션 구성 ───
  if (ctx.cycleKind === 'daeun') {
    // 대운: 본명톤 + 인생 챕터 테마 + 깊은 분석 (모든 섹션)
    const natal = buildNatalToneSection(ctx)
    if (natal) sections.push(natal)
    sections.push(buildDaeunChapterTheme(entry, ctx))
    sections.push(buildFlowSection(entry))
    sections.push(buildDomainSection(entry))
    sections.push(buildRootednessSection(entry))
    sections.push(buildGeokgukSection(entry, ctx))
    const shinsal = buildShinsalSection(entry)
    if (shinsal) sections.push(shinsal)
    const hwa = buildHwaSection(entry)
    if (hwa) sections.push(hwa)
    const hiddenHap = buildHiddenHapSection(entry)
    if (hiddenHap) sections.push(hiddenHap)
    const samgi = buildSamgiSection(entry)
    if (samgi) sections.push(samgi)
    const johu = buildJohuSection(entry, ctx)
    if (johu) sections.push(johu)
    if (ctx.daeunPhase) sections.push(buildDaeunPhaseSection(ctx))
  } else if (ctx.cycleKind === 'seun') {
    // 세운: 본명톤 + 해의 이벤트 + 핵심 분석 (8개)
    const natal = buildNatalToneSection(ctx)
    if (natal) sections.push(natal)
    sections.push(buildSeunYearEvents(entry, ctx))
    sections.push(buildFlowSection(entry))
    sections.push(buildDomainSection(entry))
    sections.push(buildGeokgukSection(entry, ctx))
    const shinsal = buildShinsalSection(entry)
    if (shinsal) sections.push(shinsal)
    const hwa = buildHwaSection(entry)
    if (hwa) sections.push(hwa)
    const samgi = buildSamgiSection(entry)
    if (samgi) sections.push(samgi)
    if (ctx.samjaePhase) sections.push(buildSamjaePhaseSection(ctx.samjaePhase))
  } else if (ctx.cycleKind === 'wolun') {
    // 월운: 집중 + 핵심 (5-6개)
    sections.push(buildWolunMonthFocus(entry))
    sections.push(buildFlowSection(entry))
    sections.push(buildDomainSection(entry))
    sections.push(buildGeokgukSection(entry, ctx))
    const shinsal = buildShinsalSection(entry)
    if (shinsal) sections.push(shinsal)
    const hwa = buildHwaSection(entry)
    if (hwa) sections.push(hwa)
  } else {
    // 일진: 오늘 액션 + 짧은 핵심 (4-5개)
    sections.push(buildIljinTodayAction(entry))
    sections.push(buildDomainSection(entry))
    sections.push(buildGeokgukSection(entry, ctx))
    const shinsal = buildShinsalSection(entry)
    if (shinsal) sections.push(shinsal)
  }

  return {
    oneLineKey: buildOneLineKey(entry, ctx),
    shortSummary: buildShortSummary(entry, ctx),
    fullNarrative: {
      headline: `[${horizon}] ${buildHeadline(entry, ctx)}`,
      overallVerdict: buildOverallVerdict(entry, ctx),
      sections,
    },
  }
}
