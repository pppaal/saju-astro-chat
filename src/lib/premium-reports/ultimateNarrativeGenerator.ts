// src/lib/premium-reports/ultimateNarrativeGenerator.ts
//
// Calls the existing AI backend (Claude / OpenAI failover) with the
// UltimateCore-focused prompt and parses the response into a typed,
// validated UltimateCore. Soft-validates length / shape and returns
// detailed diagnostics so the caller can decide whether to retry.

import { callAIBackendGeneric } from '@/lib/destiny-matrix/ai-report/aiBackend'
import { logger } from '@/lib/logger'
import type { UltimateCore, UltimateInsight, UltimatePeriod } from './ultimateReport'
import {
  buildUltimateNarrativeSystemPrompt,
  buildUltimateNarrativeUserPrompt,
  type UltimateNarrativePromptInput,
} from './ultimateNarrativePrompts'

const ALLOWED_ICONS: ReadonlyArray<UltimateInsight['iconKey']> = [
  'sparkles',
  'flame',
  'message',
  'heart',
  'compass',
  'star',
  'shield',
  'target',
]

export interface UltimateNarrativeGenerationResult {
  core: UltimateCore
  modelUsed: string
  tokensUsed?: number
  /** Soft warnings about length / shape — non-fatal. */
  warnings: string[]
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const asString = (v: unknown): string => (typeof v === 'string' ? v : '')
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function clampScore(v: unknown, fallback = 70): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function pickIcon(v: unknown, fallback: UltimateInsight['iconKey']): UltimateInsight['iconKey'] {
  return ALLOWED_ICONS.includes(v as UltimateInsight['iconKey'])
    ? (v as UltimateInsight['iconKey'])
    : fallback
}

function validateAndCoerce(raw: unknown, period: UltimatePeriod): {
  core: UltimateCore
  warnings: string[]
} {
  const warnings: string[] = []
  const obj = isObject(raw) ? raw : ({} as Record<string, unknown>)

  const theme = isString(obj.theme) ? obj.theme.trim() : ''
  const subTheme = isString(obj.subTheme) ? obj.subTheme.trim() : ''
  if (!theme) warnings.push('theme missing')
  if (!subTheme) warnings.push('subTheme missing')

  const summaryArr = Array.isArray(obj.summary) ? obj.summary : []
  const summary: string[] = summaryArr
    .map((p) => asString(p).trim())
    .filter((p) => p.length > 0)
    .slice(0, 4)
  if (summary.length < 4) {
    warnings.push(`summary expected 4 paragraphs, got ${summary.length}`)
  }
  for (let i = 0; i < summary.length; i += 1) {
    if (summary[i].length < 180) {
      warnings.push(`summary[${i}] short (${summary[i].length} chars)`)
    }
  }

  const insightsArr = Array.isArray(obj.insights) ? obj.insights : []
  const insights: UltimateInsight[] = []
  const fallbackIcons: UltimateInsight['iconKey'][] = ['compass', 'heart', 'target', 'shield']
  for (let i = 0; i < Math.min(4, insightsArr.length); i += 1) {
    const item = isObject(insightsArr[i]) ? (insightsArr[i] as Record<string, unknown>) : {}
    const id = isString(item.id) ? item.id.trim() : `insight-${i + 1}`
    const title = isString(item.title) ? item.title.trim() : `핵심 분석 ${i + 1}`
    const iconKey = pickIcon(item.iconKey, fallbackIcons[i] ?? 'compass')
    const contentArr = Array.isArray(item.content) ? item.content : []
    const content = contentArr
      .map((p) => asString(p).trim())
      .filter((p) => p.length > 0)
      .slice(0, 3)
    if (content.length < 2) {
      warnings.push(`insights[${i}].content expected 2 paragraphs, got ${content.length}`)
    }
    for (let p = 0; p < content.length; p += 1) {
      if (content[p].length < 140) {
        warnings.push(`insights[${i}].content[${p}] short (${content[p].length} chars)`)
      }
    }
    const highlight = isString(item.highlight) ? item.highlight.trim() : ''
    if (!highlight) {
      warnings.push(`insights[${i}].highlight missing`)
    }
    insights.push({ id, title, iconKey, content, highlight })
  }
  while (insights.length < 4) {
    warnings.push(`insights[${insights.length}] missing — padded`)
    insights.push({
      id: `placeholder-${insights.length + 1}`,
      title: '추가 분석 영역',
      iconKey: fallbackIcons[insights.length] ?? 'compass',
      content: [],
      highlight: '',
    })
  }

  const keyDatesArr = Array.isArray(obj.keyDates) ? obj.keyDates : []
  const keyDates = keyDatesArr
    .map((entry) => {
      const e = isObject(entry) ? (entry as Record<string, unknown>) : {}
      return {
        date: asString(e.date).trim(),
        title: asString(e.title).trim() || '주요 시점',
        desc: asString(e.desc).trim(),
      }
    })
    .filter((d) => d.date.length > 0 || d.desc.length > 0)
    .slice(0, 6)
  if (keyDates.length < 3) {
    warnings.push(`keyDates expected at least 3, got ${keyDates.length}`)
  }

  const dosAndDontsObj = isObject(obj.dosAndDonts)
    ? (obj.dosAndDonts as Record<string, unknown>)
    : {}
  const dosArr = Array.isArray(dosAndDontsObj.dos) ? dosAndDontsObj.dos : []
  const dontsArr = Array.isArray(dosAndDontsObj.donts) ? dosAndDontsObj.donts : []
  const dos = dosArr
    .map((s) => asString(s).trim())
    .filter((s) => s.length > 0)
    .slice(0, 4)
  const donts = dontsArr
    .map((s) => asString(s).trim())
    .filter((s) => s.length > 0)
    .slice(0, 4)
  if (dos.length < 4) warnings.push(`dosAndDonts.dos expected 4, got ${dos.length}`)
  if (donts.length < 4) warnings.push(`dosAndDonts.donts expected 4, got ${donts.length}`)

  const radarArr = Array.isArray(obj.radar) ? obj.radar : []
  const radar = radarArr
    .map((entry) => {
      const e = isObject(entry) ? (entry as Record<string, unknown>) : {}
      return {
        subject: asString(e.subject).trim() || '영역',
        value: clampScore(e.value, 70),
        fullMark: 100,
      }
    })
    .slice(0, 5)
  while (radar.length < 5) {
    warnings.push(`radar expected 5 axes, padding axis ${radar.length + 1}`)
    radar.push({
      subject: defaultRadarSubject(period, radar.length),
      value: 60,
      fullMark: 100,
    })
  }

  const core: UltimateCore = {
    theme: theme || defaultTheme(period),
    subTheme: subTheme || defaultSubTheme(period),
    summary,
    insights,
    keyDates,
    dosAndDonts: { dos, donts },
    radar,
  }

  return { core, warnings }
}

function defaultTheme(period: UltimatePeriod): string {
  if (period === 'monthly') return '이번 달의 운명선'
  if (period === 'yearly') return '올해의 운명선'
  return '인생 총운 청사진'
}

function defaultSubTheme(period: UltimatePeriod): string {
  if (period === 'monthly') return '한 달의 흐름과 결정적 타이밍'
  if (period === 'yearly') return '한 해의 큰 흐름과 분기별 변곡점'
  return '본질·관계·일·사명의 4축으로 본 인생 청사진'
}

const COMPREHENSIVE_AXES = ['성격·자아', '관계', '커리어·사명', '재물·안정', '건강·생명력']
const TIMING_AXES = ['전체 흐름', '커리어', '관계', '재물', '건강']

function defaultRadarSubject(period: UltimatePeriod, idx: number): string {
  const axes = period === 'comprehensive' ? COMPREHENSIVE_AXES : TIMING_AXES
  return axes[idx] ?? `영역 ${idx + 1}`
}

export async function generateUltimateNarrative(
  input: UltimateNarrativePromptInput,
  options?: {
    userPlan?: 'free' | 'starter' | 'pro' | 'premium'
    debugTag?: string
  }
): Promise<UltimateNarrativeGenerationResult> {
  const systemPrompt = buildUltimateNarrativeSystemPrompt(input.period)
  const userPrompt = buildUltimateNarrativeUserPrompt(input)

  const combinedPrompt = `${systemPrompt}\n\n[사용자 요청]\n${userPrompt}`

  const response = await callAIBackendGeneric<unknown>(combinedPrompt, 'ko', {
    userPlan: options?.userPlan ?? 'premium',
    qualityTier: 'quality',
    debugTag: options?.debugTag ?? 'ultimate-narrative',
    maxTokensOverride: 12000,
  })

  const { core, warnings } = validateAndCoerce(response.sections, input.period)

  if (warnings.length > 0) {
    logger.warn('[premium-reports/ultimate-narrative] soft validation warnings', {
      period: input.period,
      warnings: warnings.slice(0, 12),
      model: response.model,
    })
  }

  return {
    core,
    modelUsed: response.model,
    tokensUsed: response.tokensUsed,
    warnings,
  }
}
