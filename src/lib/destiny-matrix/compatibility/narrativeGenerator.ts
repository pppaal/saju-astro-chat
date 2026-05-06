// src/lib/destiny-matrix/compatibility/narrativeGenerator.ts
//
// Calls the existing AI backend (Anthropic / OpenAI failover) with the
// CompatibilityNarrative-focused prompt, parses the response into a
// typed CompatibilityNarrative, and surfaces soft validation warnings
// so the route can decide whether to retry.

import { callAIBackendGeneric } from '@/lib/destiny-matrix/ai-report/aiBackend'
import { logger } from '@/lib/logger'
import type {
  CompatibilityNarrative,
  CompatibilityNarrativeIcon,
  CompatibilityNarrativeInsight,
  CompatibilityNarrativeKeyMoment,
} from './narrativeTypes'
import {
  buildCompatibilityNarrativeSystemPrompt,
  buildCompatibilityNarrativeUserPrompt,
  type CompatibilityNarrativePromptInput,
} from './narrativePrompt'

const ALLOWED_ICONS: ReadonlyArray<CompatibilityNarrativeIcon> = [
  'sparkles',
  'flame',
  'message',
  'heart',
  'compass',
  'star',
  'shield',
  'target',
]

export interface CompatibilityNarrativeGenerationResult {
  narrative: CompatibilityNarrative
  modelUsed: string
  tokensUsed?: number
  warnings: string[]
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const asString = (v: unknown): string => (typeof v === 'string' ? v : '')
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function pickIcon(
  v: unknown,
  fallback: CompatibilityNarrativeIcon
): CompatibilityNarrativeIcon {
  return ALLOWED_ICONS.includes(v as CompatibilityNarrativeIcon)
    ? (v as CompatibilityNarrativeIcon)
    : fallback
}

function validateAndCoerce(raw: unknown): {
  narrative: CompatibilityNarrative
  warnings: string[]
} {
  const warnings: string[] = []
  const obj = isObject(raw) ? raw : ({} as Record<string, unknown>)

  const theme = isString(obj.theme) ? obj.theme.trim() : ''
  const subTheme = isString(obj.subTheme) ? obj.subTheme.trim() : ''
  if (!theme) warnings.push('theme missing')
  if (!subTheme) warnings.push('subTheme missing')

  const summaryArr = Array.isArray(obj.summary) ? obj.summary : []
  const summary = summaryArr
    .map((p) => asString(p).trim())
    .filter((p) => p.length > 0)
    .slice(0, 4)
  if (summary.length < 4) warnings.push(`summary expected 4, got ${summary.length}`)
  for (let i = 0; i < summary.length; i += 1) {
    if (summary[i].length < 180) warnings.push(`summary[${i}] short (${summary[i].length})`)
  }

  const insightsArr = Array.isArray(obj.insights) ? obj.insights : []
  const fallbackIcons: CompatibilityNarrativeIcon[] = ['heart', 'message', 'shield', 'compass']
  const insights: CompatibilityNarrativeInsight[] = []
  for (let i = 0; i < Math.min(4, insightsArr.length); i += 1) {
    const item = isObject(insightsArr[i]) ? (insightsArr[i] as Record<string, unknown>) : {}
    const id = isString(item.id) ? item.id.trim() : `insight-${i + 1}`
    const title = isString(item.title) ? item.title.trim() : `핵심 분석 ${i + 1}`
    const iconKey = pickIcon(item.iconKey, fallbackIcons[i] ?? 'heart')
    const contentArr = Array.isArray(item.content) ? item.content : []
    const content = contentArr
      .map((p) => asString(p).trim())
      .filter((p) => p.length > 0)
      .slice(0, 3)
    if (content.length < 2) warnings.push(`insights[${i}].content expected 2, got ${content.length}`)
    for (let p = 0; p < content.length; p += 1) {
      if (content[p].length < 140) warnings.push(`insights[${i}].content[${p}] short`)
    }
    const advice = isString(item.advice) ? item.advice.trim() : ''
    if (!advice) warnings.push(`insights[${i}].advice missing`)
    insights.push({ id, title, iconKey, content, advice })
  }
  while (insights.length < 4) {
    warnings.push(`insights[${insights.length}] missing — padded`)
    insights.push({
      id: `placeholder-${insights.length + 1}`,
      title: '추가 분석 영역',
      iconKey: fallbackIcons[insights.length] ?? 'heart',
      content: [],
      advice: '',
    })
  }

  const dndObj = isObject(obj.dosAndDonts) ? (obj.dosAndDonts as Record<string, unknown>) : {}
  const dosArr = Array.isArray(dndObj.dos) ? dndObj.dos : []
  const dontsArr = Array.isArray(dndObj.donts) ? dndObj.donts : []
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

  const keyMomentsArr = Array.isArray(obj.keyMoments) ? obj.keyMoments : []
  const keyMoments: CompatibilityNarrativeKeyMoment[] = keyMomentsArr
    .map((entry) => {
      const e = isObject(entry) ? (entry as Record<string, unknown>) : {}
      return {
        phase: asString(e.phase).trim() || '시기',
        headline: asString(e.headline).trim() || '관계의 신호',
        desc: asString(e.desc).trim(),
      }
    })
    .filter((m) => m.desc.length > 0)
    .slice(0, 6)
  if (keyMoments.length < 3) warnings.push(`keyMoments expected at least 3, got ${keyMoments.length}`)

  return {
    narrative: {
      theme: theme || '두 사람의 관계 흐름',
      subTheme: subTheme || '사주와 점성으로 본 두 사람의 결',
      summary,
      insights,
      dosAndDonts: { dos, donts },
      keyMoments,
    },
    warnings,
  }
}

export async function generateCompatibilityNarrative(
  input: CompatibilityNarrativePromptInput,
  options?: {
    userPlan?: 'free' | 'starter' | 'pro' | 'premium'
    debugTag?: string
  }
): Promise<CompatibilityNarrativeGenerationResult> {
  const systemPrompt = buildCompatibilityNarrativeSystemPrompt()
  const userPrompt = buildCompatibilityNarrativeUserPrompt(input)
  const combinedPrompt = `${systemPrompt}\n\n[사용자 요청]\n${userPrompt}`

  const response = await callAIBackendGeneric<unknown>(combinedPrompt, 'ko', {
    userPlan: options?.userPlan ?? 'premium',
    qualityTier: 'quality',
    debugTag: options?.debugTag ?? 'compatibility-narrative',
    maxTokensOverride: 10000,
  })

  const { narrative, warnings } = validateAndCoerce(response.sections)

  if (warnings.length > 0) {
    logger.warn('[compatibility/narrative] soft validation warnings', {
      warnings: warnings.slice(0, 12),
      model: response.model,
    })
  }

  return {
    narrative,
    modelUsed: response.model,
    tokensUsed: response.tokensUsed,
    warnings,
  }
}
