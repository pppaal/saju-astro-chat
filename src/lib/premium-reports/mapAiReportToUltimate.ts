// src/lib/premium-reports/mapAiReportToUltimate.ts
//
// Best-effort fallback adapter that converts a legacy report payload
// (AIPremiumReport / TimingAIPremiumReport) into UltimateReport `core`
// + `narrative`. Used until PR-C lets the LLM emit `core` directly.
//
// The adapter is intentionally defensive — every field is optional in the
// input, so we read what's there and fill missing slots with sensible
// derivations from `computed`.

import type { UltimateComputed } from './ultimateReport'
import {
  ULTIMATE_REPORT_VERSION,
  type UltimateCore,
  type UltimateInsight,
  type UltimateKeyDate,
  type UltimateNarrative,
  type UltimateRadarAxis,
  type UltimateReport,
  type UltimateReportMeta,
  type UltimatePeriod,
} from './ultimateReport'

// ---------- input shape (loose, structural) ----------

type LegacyReportSections = Record<string, unknown> | undefined

type LegacyTimingDomains = {
  career?: string
  love?: string
  wealth?: string
  health?: string
}

type LegacyPeriodScore = {
  overall?: number
  career?: number
  love?: number
  wealth?: number
  health?: number
}

type LegacyDomainScoreMap = Record<string, { score?: number } | undefined>

type LegacyTimelineEvent = {
  id?: string
  thesis?: string
  timeHint?: {
    year?: number
    month?: number
    date?: string
    ageRange?: string
  }
}

export interface LegacyReportLike {
  id?: string
  generatedAt?: string
  lang?: 'ko' | 'en'
  profile?: {
    name?: string
    birthDate?: string
    dayMaster?: string
    dominantElement?: string
  }
  period?: string
  targetDate?: string
  periodLabel?: string
  sections?: LegacyReportSections
  timelineEvents?: LegacyTimelineEvent[]
  matrixSummary?: {
    overallScore?: number
    grade?: string
    topInsights?: string[]
    keyStrengths?: string[]
    keyChallenges?: string[]
  }
  periodScore?: LegacyPeriodScore
  scores?: {
    overall?: { score?: number }
    domains?: LegacyDomainScoreMap
  }
  meta?: {
    modelUsed?: string
  }
}

export interface MapAiReportToUltimateInput {
  reportId: string
  period: UltimatePeriod
  targetDate?: string
  legacy: LegacyReportLike
  computed: UltimateComputed
}

// ---------- helpers ----------

const HANGUL_PARAGRAPH_FALLBACK_LENGTH = 320

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function nonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0
}

function compactStrings(values: unknown[]): string[] {
  const out: string[] = []
  for (const v of values) {
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed.length > 0) {
        out.push(trimmed)
      }
    }
  }
  return out
}

function splitParagraphs(text: string): string[] {
  if (!nonEmpty(text)) {
    return []
  }
  const blockSplit = text
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean)
  if (blockSplit.length > 0) {
    return blockSplit
  }
  const sentences = text
    .split(/(?<=[.!?。！？])\s+/g)
    .map((s) => s.trim())
    .filter(Boolean)
  if (sentences.length === 0) {
    return [text.trim()]
  }
  // group sentences into paragraphs near HANGUL_PARAGRAPH_FALLBACK_LENGTH chars
  const paragraphs: string[] = []
  let buffer = ''
  for (const sentence of sentences) {
    if (buffer.length + sentence.length > HANGUL_PARAGRAPH_FALLBACK_LENGTH && buffer.length > 0) {
      paragraphs.push(buffer.trim())
      buffer = sentence
    } else {
      buffer = buffer.length === 0 ? sentence : `${buffer} ${sentence}`
    }
  }
  if (buffer.trim().length > 0) {
    paragraphs.push(buffer.trim())
  }
  return paragraphs
}

function padToLength<T>(arr: T[], target: number, filler: () => T): T[] {
  if (arr.length >= target) {
    return arr.slice(0, target)
  }
  const result = arr.slice()
  while (result.length < target) {
    result.push(filler())
  }
  return result
}

function pickDomainSection(sections: LegacyReportSections, key: string): string {
  if (!sections || typeof sections !== 'object') {
    return ''
  }
  const direct = (sections as Record<string, unknown>)[key]
  if (nonEmpty(asString(direct))) {
    return asString(direct).trim()
  }
  const domains = (sections as { domains?: LegacyTimingDomains }).domains
  if (domains && typeof domains === 'object') {
    const value = (domains as Record<string, unknown>)[key]
    if (nonEmpty(asString(value))) {
      return asString(value).trim()
    }
  }
  return ''
}

function bulletsFromText(text: string, max: number): string[] {
  if (!nonEmpty(text)) {
    return []
  }
  const lines = text
    .split(/\n+/g)
    .map((l) => l.replace(/^[-*•·]\s*/, '').trim())
    .filter((l) => l.length > 0 && l.length < 200)
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of lines) {
    if (seen.has(line)) continue
    seen.add(line)
    out.push(line)
    if (out.length >= max) break
  }
  return out
}

function clampScore(v: number | undefined, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return fallback
  }
  return Math.max(0, Math.min(100, Math.round(v)))
}

// ---------- summary / theme ----------

function buildTheme(legacy: LegacyReportLike, period: UltimatePeriod): { theme: string; subTheme: string } {
  const label = nonEmpty(legacy.periodLabel) ? legacy.periodLabel.trim() : ''
  const dayMasterEl = legacy.profile?.dominantElement || legacy.profile?.dayMaster || ''
  const periodLabelKo: Record<UltimatePeriod, string> = {
    monthly: '이번 달의 흐름',
    yearly: '올해의 운명선',
    comprehensive: '인생 총운 청사진',
  }
  const headline = label.length > 0 ? `${label} — ${periodLabelKo[period]}` : periodLabelKo[period]
  const subParts: string[] = []
  if (nonEmpty(dayMasterEl)) {
    subParts.push(`${dayMasterEl} 일간이 이끄는 ${period === 'comprehensive' ? '인생 전반' : '시기'}`)
  }
  const challenges = legacy.matrixSummary?.keyChallenges || []
  const strengths = legacy.matrixSummary?.keyStrengths || []
  if (strengths.length > 0) {
    subParts.push(strengths[0])
  }
  if (challenges.length > 0) {
    subParts.push(`주의 신호: ${challenges[0]}`)
  }
  const subTheme = subParts.length > 0 ? subParts.join(' · ') : '사주 명식과 천체 배치가 교차하는 결정적 시기'
  return { theme: headline, subTheme }
}

function buildSummary(legacy: LegacyReportLike, period: UltimatePeriod): string[] {
  const sections = legacy.sections as Record<string, unknown> | undefined
  const candidates: string[] = []

  if (period === 'comprehensive') {
    candidates.push(asString(sections?.introduction))
    candidates.push(asString(sections?.lifeMission))
    candidates.push(asString(sections?.futureOutlook))
    candidates.push(asString(sections?.conclusion))
  } else {
    candidates.push(asString(sections?.overview))
    candidates.push(asString(sections?.energy))
    candidates.push(asString(sections?.opportunities))
    candidates.push(asString(sections?.cautions))
  }

  const fromSections = compactStrings(candidates)
  let paragraphs: string[] = []
  for (const chunk of fromSections) {
    paragraphs = paragraphs.concat(splitParagraphs(chunk))
    if (paragraphs.length >= 4) break
  }

  if (paragraphs.length === 0) {
    const insights = compactStrings(legacy.matrixSummary?.topInsights ?? [])
    if (insights.length > 0) {
      paragraphs = insights
    }
  }

  if (paragraphs.length === 0) {
    const fallback =
      period === 'comprehensive'
        ? '인생 전반의 흐름을 사주와 점성학 관점에서 종합한 결과를 본 페이지에서 확인할 수 있습니다.'
        : '해당 기간의 핵심 흐름을 사주와 점성학 관점에서 종합한 결과를 본 페이지에서 확인할 수 있습니다.'
    paragraphs = [fallback]
  }

  // Cap at 4, but keep what we have if shorter — PR-C will fill the gap.
  return paragraphs.slice(0, 4)
}

// ---------- insights ----------

const INSIGHT_TEMPLATES_TIMING: Array<{
  id: string
  title: string
  iconKey: UltimateInsight['iconKey']
  sourceKey: 'career' | 'love' | 'wealth' | 'health'
  fallbackTitle: string
}> = [
  { id: 'career', title: '커리어 & 성장', iconKey: 'target', sourceKey: 'career', fallbackTitle: '커리어 흐름' },
  { id: 'love', title: '관계 & 인연', iconKey: 'heart', sourceKey: 'love', fallbackTitle: '관계 흐름' },
  { id: 'wealth', title: '재물 & 결정', iconKey: 'sparkles', sourceKey: 'wealth', fallbackTitle: '재물 흐름' },
  { id: 'health', title: '건강 & 에너지', iconKey: 'shield', sourceKey: 'health', fallbackTitle: '건강 흐름' },
]

const INSIGHT_TEMPLATES_COMPREHENSIVE: Array<{
  id: string
  title: string
  iconKey: UltimateInsight['iconKey']
  sourceKey: string
  fallbackTitle: string
}> = [
  { id: 'personality', title: '성격 & 자아', iconKey: 'compass', sourceKey: 'personalityDeep', fallbackTitle: '성격 심층' },
  { id: 'relationship', title: '관계 패턴', iconKey: 'heart', sourceKey: 'relationshipDynamics', fallbackTitle: '관계 역학' },
  { id: 'career', title: '커리어 & 사명', iconKey: 'target', sourceKey: 'careerPath', fallbackTitle: '커리어 경로' },
  { id: 'wealth', title: '재물 & 안정', iconKey: 'sparkles', sourceKey: 'wealthPotential', fallbackTitle: '재물 잠재력' },
]

function buildInsights(legacy: LegacyReportLike, period: UltimatePeriod): UltimateInsight[] {
  const sections = legacy.sections
  const templates =
    period === 'comprehensive' ? INSIGHT_TEMPLATES_COMPREHENSIVE : INSIGHT_TEMPLATES_TIMING

  const insights: UltimateInsight[] = templates.map((t) => {
    const raw = pickDomainSection(sections, t.sourceKey)
    const paragraphs = splitParagraphs(raw)
    const content = paragraphs.length > 0 ? paragraphs.slice(0, 3) : []
    const highlight = paragraphs.length > 0 ? extractHighlight(paragraphs) : ''
    return {
      id: t.id,
      title: t.title,
      iconKey: t.iconKey,
      content,
      highlight,
    }
  })

  return insights
}

function extractHighlight(paragraphs: string[]): string {
  // Prefer the last sentence-like fragment of the first paragraph if short enough.
  const head = paragraphs[0] || ''
  const sentences = head.split(/(?<=[.!?。！？])\s+/g).filter((s) => s.trim().length > 0)
  if (sentences.length === 0) return ''
  const candidate = sentences[sentences.length - 1].trim()
  if (candidate.length > 0 && candidate.length <= 200) {
    return candidate
  }
  return candidate.slice(0, 200)
}

// ---------- key dates ----------

function buildKeyDates(legacy: LegacyReportLike): UltimateKeyDate[] {
  const events = (legacy.timelineEvents ?? []).slice(0, 6)
  const out: UltimateKeyDate[] = []
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    const date = formatTimeHint(ev.timeHint) || asString(ev.id)
    const title = asString(ev.thesis).slice(0, 60) || '주요 시점'
    const desc = asString(ev.thesis)
    if (!nonEmpty(date) && !nonEmpty(desc)) continue
    out.push({ date, title, desc })
    if (out.length >= 5) break
  }
  return out
}

function formatTimeHint(hint: LegacyTimelineEvent['timeHint']): string {
  if (!hint) return ''
  if (hint.date) return hint.date
  if (hint.year && hint.month) return `${hint.year}년 ${hint.month}월`
  if (hint.year) return `${hint.year}년`
  if (hint.ageRange) return hint.ageRange
  return ''
}

// ---------- dos and donts ----------

function buildDosAndDonts(legacy: LegacyReportLike): { dos: string[]; donts: string[] } {
  const sections = legacy.sections as Record<string, unknown> | undefined
  const actionText = asString(sections?.actionPlan)
  const opportunities = asString(sections?.opportunities)
  const cautions = asString(sections?.cautions)

  const dos = [
    ...bulletsFromText(actionText, 4),
    ...bulletsFromText(opportunities, 4),
    ...(legacy.matrixSummary?.keyStrengths ?? []),
  ]
  const donts = [
    ...bulletsFromText(cautions, 4),
    ...(legacy.matrixSummary?.keyChallenges ?? []),
  ]

  return {
    dos: dedupe(dos).slice(0, 4),
    donts: dedupe(donts).slice(0, 4),
  }
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const trimmed = (v ?? '').toString().trim()
    if (trimmed.length === 0) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

// ---------- radar ----------

const RADAR_AXES_TIMING: Array<{ subject: string; key: keyof LegacyPeriodScore; fallback: number }> = [
  { subject: '전체 흐름', key: 'overall', fallback: 65 },
  { subject: '커리어', key: 'career', fallback: 60 },
  { subject: '관계/사랑', key: 'love', fallback: 60 },
  { subject: '재물', key: 'wealth', fallback: 60 },
  { subject: '건강', key: 'health', fallback: 60 },
]

const RADAR_AXES_COMPREHENSIVE: Array<{ subject: string; domain: string; fallback: number }> = [
  { subject: '성격/자아', domain: 'personality', fallback: 65 },
  { subject: '관계', domain: 'relationship', fallback: 65 },
  { subject: '커리어', domain: 'career', fallback: 65 },
  { subject: '재물', domain: 'wealth', fallback: 65 },
  { subject: '건강', domain: 'health', fallback: 65 },
]

function buildRadar(legacy: LegacyReportLike, period: UltimatePeriod): UltimateRadarAxis[] {
  if (period !== 'comprehensive') {
    const score = legacy.periodScore ?? {}
    return RADAR_AXES_TIMING.map(({ subject, key, fallback }) => ({
      subject,
      value: clampScore(score[key], fallback),
      fullMark: 100,
    }))
  }
  const domains = legacy.scores?.domains ?? {}
  return RADAR_AXES_COMPREHENSIVE.map(({ subject, domain, fallback }) => ({
    subject,
    value: clampScore(domains[domain]?.score, fallback),
    fullMark: 100,
  }))
}

// ---------- narrative (cross matrix + volatility) ----------

function buildNarrative(
  legacy: LegacyReportLike,
  computed: UltimateComputed,
  period: UltimatePeriod
): UltimateNarrative {
  const dayPillar = computed.sajuPillars.find((p) => p.label === 'day')
  const monthPillar = computed.sajuPillars.find((p) => p.label === 'month')
  const venus = computed.astroPlacements.find((p) => p.body === 'Venus')
  const sun = computed.astroPlacements.find((p) => p.body === 'Sun')
  const moon = computed.astroPlacements.find((p) => p.body === 'Moon')
  const mars = computed.astroPlacements.find((p) => p.body === 'Mars')

  const sections = legacy.sections as Record<string, unknown> | undefined

  const radar = buildRadar(legacy, period)
  const overallScore = radar.find((r) => r.subject.includes('전체') || r.subject.includes('성격'))?.value ?? 70

  return {
    crossMatrix: [
      {
        module: '성격 코어',
        sajuVariable: dayPillar
          ? `일주 ${dayPillar.stem}${dayPillar.branch} (${dayPillar.stemElement}/${dayPillar.branchElement})`
          : '일주 분석',
        astroVariable: sun ? `Sun in ${sun.signKo ?? sun.sign}` : 'Sun 위치',
        result: '본질적 정체성 신호',
        score: clampScore(overallScore, 70),
        accuracy: '정합도 정량화',
        iconKey: 'compass',
        detail: extractFirstParagraph(asString(sections?.personalityDeep) || asString(sections?.overview)),
      },
      {
        module: '관계 패턴',
        sajuVariable: monthPillar
          ? `월주 ${monthPillar.stem}${monthPillar.branch}`
          : '월주 분석',
        astroVariable: venus ? `Venus in ${venus.signKo ?? venus.sign}` : 'Venus 위치',
        result: '관계 에너지의 결',
        score: clampScore(radar.find((r) => r.subject.includes('관계') || r.subject.includes('사랑'))?.value, 70),
        accuracy: '정합도 정량화',
        iconKey: 'heart',
        detail: extractFirstParagraph(
          asString(sections?.relationshipDynamics) || pickDomainSection(sections, 'love')
        ),
      },
      {
        module: '커리어 동력',
        sajuVariable: '식상/관성 균형',
        astroVariable: mars ? `Mars in ${mars.signKo ?? mars.sign}` : 'Mars 위치',
        result: '추진력과 결정의 강도',
        score: clampScore(radar.find((r) => r.subject.includes('커리어'))?.value, 70),
        accuracy: '정합도 정량화',
        iconKey: 'target',
        detail: extractFirstParagraph(
          asString(sections?.careerPath) || pickDomainSection(sections, 'career')
        ),
      },
      {
        module: '내면 정서',
        sajuVariable: '인성/식신 흐름',
        astroVariable: moon ? `Moon in ${moon.signKo ?? moon.sign}` : 'Moon 위치',
        result: '회복과 정서의 결',
        score: clampScore(radar.find((r) => r.subject.includes('건강'))?.value, 70),
        accuracy: '정합도 정량화',
        iconKey: 'shield',
        detail: extractFirstParagraph(
          asString(sections?.healthGuidance) || pickDomainSection(sections, 'health')
        ),
      },
    ],
    volatility: buildVolatility(legacy, period),
    caption: '계산은 결정적, 해석 텍스트는 LLM이 보조합니다.',
  }
}

function extractFirstParagraph(text: string): string {
  const paragraphs = splitParagraphs(text)
  return paragraphs[0] || ''
}

function buildVolatility(legacy: LegacyReportLike, period: UltimatePeriod): UltimateNarrative['volatility'] {
  const labelMap: Record<UltimatePeriod, { primary: string; secondary: string; axes: string[] }> = {
    monthly: {
      primary: '에너지 지수',
      secondary: '갈등 리스크',
      axes: ['1주', '2주', '3주', '4주', '5주'],
    },
    yearly: {
      primary: '에너지 지수',
      secondary: '갈등 리스크',
      axes: ['1Q', '2Q', '3Q', '4Q'],
    },
    comprehensive: {
      primary: '성장 곡선',
      secondary: '도전 강도',
      axes: ['10대', '20대', '30대', '40대', '50대+'],
    },
  }
  const cfg = labelMap[period]
  const events = legacy.timelineEvents ?? []
  const baseline = clampScore(legacy.matrixSummary?.overallScore, 65)
  const points = cfg.axes.map((axis, idx) => ({
    axis,
    primary: clampScore(baseline + ((idx * 7) % 25) - 10, baseline),
    secondary: clampScore(40 + ((idx * 11) % 30), 50),
  }))
  // light boost on axes that have timeline events near them
  for (const ev of events) {
    if (!ev?.timeHint) continue
    const hintIdx = mapEventToAxis(ev, cfg.axes.length, period)
    if (hintIdx >= 0 && hintIdx < points.length) {
      points[hintIdx].primary = clampScore(points[hintIdx].primary + 8, points[hintIdx].primary)
      points[hintIdx].secondary = clampScore(points[hintIdx].secondary + 6, points[hintIdx].secondary)
    }
  }
  return {
    primaryLabel: cfg.primary,
    secondaryLabel: cfg.secondary,
    points,
  }
}

function mapEventToAxis(
  ev: LegacyTimelineEvent,
  axisCount: number,
  period: UltimatePeriod
): number {
  const hint = ev.timeHint
  if (!hint) return -1
  if (period === 'monthly' && typeof hint.date === 'string') {
    const day = Number(hint.date.split('-')[2] ?? '0')
    if (Number.isFinite(day) && day > 0) {
      return Math.min(axisCount - 1, Math.floor((day - 1) / 7))
    }
  }
  if (period === 'yearly' && typeof hint.month === 'number') {
    return Math.min(axisCount - 1, Math.floor((hint.month - 1) / 3))
  }
  if (period === 'comprehensive' && typeof hint.year === 'number') {
    // crude age bucket
    const age = hint.year - new Date().getFullYear()
    if (age >= -100 && age <= 100) {
      return Math.min(axisCount - 1, Math.max(0, Math.floor(age / 10)))
    }
  }
  return -1
}

// ---------- meta ----------

function buildMeta(input: MapAiReportToUltimateInput): UltimateReportMeta {
  return {
    reportId: input.reportId,
    period: input.period,
    targetDate: input.targetDate ?? input.legacy.targetDate,
    generatedAt: input.legacy.generatedAt ?? new Date().toISOString(),
    lang: input.legacy.lang ?? 'ko',
    modelUsed: input.legacy.meta?.modelUsed,
    reportVersion: ULTIMATE_REPORT_VERSION,
  }
}

// ---------- entrypoint ----------

export function mapAiReportToUltimate(input: MapAiReportToUltimateInput): UltimateReport {
  const { theme, subTheme } = buildTheme(input.legacy, input.period)
  const summary = buildSummary(input.legacy, input.period)
  const insights = padToLength(buildInsights(input.legacy, input.period), 4, () => emptyInsight())
  const keyDates = buildKeyDates(input.legacy)
  const dosAndDonts = buildDosAndDonts(input.legacy)
  const radar = buildRadar(input.legacy, input.period)

  const core: UltimateCore = {
    theme,
    subTheme,
    summary,
    insights,
    keyDates,
    dosAndDonts,
    radar,
  }

  const narrative = buildNarrative(input.legacy, input.computed, input.period)

  return {
    meta: buildMeta(input),
    core,
    computed: input.computed,
    narrative,
    legacy: {
      sourceType: input.period === 'comprehensive' ? 'comprehensive' : 'timing',
      overallScore: input.legacy.matrixSummary?.overallScore,
      grade: input.legacy.matrixSummary?.grade,
    },
  }
}

function emptyInsight(): UltimateInsight {
  return {
    id: `placeholder-${Math.random().toString(36).slice(2, 8)}`,
    title: '추가 해설',
    iconKey: 'star',
    content: [],
    highlight: '',
  }
}
