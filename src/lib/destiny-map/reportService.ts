//src/lib/destiny-map/reportService.ts

// Note: 'use server' removed - exports include interface definitions

import { computeDestinyMap } from './astrology'
import type { CombinedResult } from '@/lib/destiny-map/astrology'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'

// Import from centralized modules
import { hashName, maskDisplayName, maskTextWithName } from '@/lib/security'
import { generateLocalReport, generateLocalStructuredReport } from './local-report-generator'
import {
  cleanseText,
  getDateInTimezone,
  extractDefaultElements,
  hasBrokenPlaceholderArtifacts,
  validateSections,
} from './report-helpers'

/**
 * DestinyMap Report Service - Fusion backend version
 */

export interface ReportOutput {
  meta: {
    generator: string
    generatedAt: string
    theme: string
    lang: string
    name?: string
    gender?: string
    modelUsed?: string
    validationWarnings?: string[]
    validationPassed?: boolean
    backendAvailable?: boolean
    promptTrimmed?: boolean
  }
  summary: string
  report: string
  raw: Record<string, unknown>
  crossHighlights?: { summary: string; points?: string[] }
  themes?: Record<string, unknown>
}

// Alias for backward compatibility
const extractElements = extractDefaultElements

export async function generateReport({
  name,
  birthDate,
  birthTime,
  latitude,
  longitude,
  gender = 'male',
  theme,
  lang = 'ko',
  extraPrompt,
  userTimezone,
}: {
  name?: string
  birthDate: string
  birthTime: string
  latitude: number
  longitude: number
  gender?: 'male' | 'female'
  theme: string
  lang?: string
  extraPrompt?: string
  userTimezone?: string
}): Promise<ReportOutput> {
  // 🔥 Cache check - return cached result if available (TTL: 24h)
  const analysisDate = getDateInTimezone(userTimezone)
  const cacheKey = makeCacheKey('destiny', {
    birthDate,
    birthTime,
    lat: latitude.toFixed(4),
    lon: longitude.toFixed(4),
    theme,
    lang,
    date: analysisDate, // 같은 날에만 캐시 유효
    mode: 'template_v13', // v13: Repair broken backend template placeholders and reset stale cache
    name: hashName(name),
    gender,
    userTimezone: userTimezone || 'unknown',
  })

  const cached = await cacheGet<ReportOutput>(cacheKey)
  if (cached) {
    logger.debug('[DestinyMap] Cache HIT:', cacheKey)
    return cached
  }
  logger.debug('[DestinyMap] Cache MISS:', cacheKey)

  const safeExtra = extraPrompt ? guardText(extraPrompt, 2000) : ''
  const promptWasTrimmed = safeExtra.length > 1200
  const effectivePrompt = promptWasTrimmed ? safeExtra.slice(0, 1200) : safeExtra
  if (extraPrompt && containsForbidden(extraPrompt)) {
    const msg = safetyMessage(lang)
    return {
      meta: {
        generator: 'DestinyMap_Report_via_Fusion',
        generatedAt: new Date().toISOString(),
        theme,
        lang,
        name,
        gender,
        modelUsed: 'filtered',
      },
      summary: '',
      report: msg,
      raw: {},
    }
  }

  // 1) Calculate astro + saju baseline (userTimezone으로 트랜짓/프로그레션 계산)
  const result: CombinedResult = await computeDestinyMap({
    name,
    birthDate,
    birthTime,
    latitude,
    longitude,
    gender,
    theme,
    userTimezone,
  })

  // 사용자 타임존 기준 분석 날짜 추가
  result.userTimezone = userTimezone
  result.analysisDate = analysisDate // 이미 위에서 계산됨

  // 2) 템플릿 모드 - AI 없이 계산 데이터로 즉시 리포트 생성
  // extraPrompt가 있으면 상담사 모드로 AI 사용
  const useAI = Boolean(safeExtra)

  // 3) Local fusion generation — Python AI backend was removed.
  // Counselor / detailed AI flows now go through @anthropic-ai/sdk directly
  // (see askClaude / callClaude / aiBackend.ts), not through this fallback.
  let aiText = useAI
    ? generateLocalReport(result, theme, lang, name)
    : generateLocalStructuredReport(result, theme, lang, name)
  let modelUsed = 'local-template'
  const backendAvailable = false

  // Template mode must stay readable/structured. If backend output is broken, regenerate locally.
  if (!useAI) {
    const hasStructuredShape =
      aiText.trim().startsWith('{') ||
      aiText.includes('"lifeTimeline"') ||
      aiText.includes('"categoryAnalysis"')
    const hasBrokenPlaceholders = hasBrokenPlaceholderArtifacts(aiText)

    if (!hasStructuredShape || hasBrokenPlaceholders) {
      logger.warn(
        '[DestinyMap] Broken/non-structured template response detected; falling back to local structured report',
        {
          modelUsed,
          hasStructuredShape,
          hasBrokenPlaceholders,
        }
      )
      aiText = generateLocalStructuredReport(result, theme, lang, name)
      modelUsed = 'local-template-repair'
    }
  }

  // 3.5) Validate required sections / cross evidence
  // Skip validation for local-template and error-fallback responses to allow graceful degradation
  const validationWarnings =
    modelUsed === 'error-fallback' ||
    modelUsed === 'local-template' ||
    modelUsed === 'local-template-repair'
      ? []
      : validateSections(theme, aiText)
  if (!backendAvailable) {
    validationWarnings.push('backend_unavailable')
  }
  const validationPassed = validationWarnings.length === 0

  // 4) Assemble response with name masking for privacy
  const maskedName = maskDisplayName(name)
  const maskedSummary = maskTextWithName(result.summary, name)
  const maskedReport = maskTextWithName(cleanseText(aiText), name)
  const maskedRaw = {
    ...result,
    meta: { ...(result.meta || {}), name: maskedName },
    saju: result.saju ?? extractElements(aiText),
  }

  const output: ReportOutput = {
    meta: {
      generator: 'DestinyMap_Report_via_Fusion',
      generatedAt: new Date().toISOString(),
      theme,
      lang,
      name: maskedName,
      gender,
      modelUsed,
      validationWarnings,
      validationPassed,
      backendAvailable,
      promptTrimmed: promptWasTrimmed || undefined,
    },
    summary: maskedSummary,
    report: maskedReport,
    raw: maskedRaw,
  }

  // 🔥 Save to cache (24h TTL) - only if we got a real response
  if (modelUsed !== 'error-fallback') {
    cacheSet(cacheKey, output, 86400).catch(() => {})
    logger.debug('[DestinyMap] Cached result:', cacheKey)
  }

  return output
}
