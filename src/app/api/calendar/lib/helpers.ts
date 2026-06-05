/**
 * @file Calendar API helper functions
 * Extracted from route.ts for modularity
 */

import type {
  EventCategory,
  ImportanceGrade,
  ImportantDate,
} from '@/lib/destiny-map/destinyCalendar'
import type { TranslationData } from '@/types/calendar-api'
import type { PillarData } from '@/lib/saju/types'
import type { SajuPillarAccessor, FormattedDate, LocationCoord } from './types'
import {
  isAlignedAcrossSystems,
  isLowCoherenceSignal,
  sanitizeCalendarCopy,
} from './calendarMatrixTextSupport'
import { getFactorTranslation } from './translations'
import {
  COMMUNICATION_WARNING_TOKENS as CALENDAR_COMMUNICATION_WARNING_TOKENS,
  IRREVERSIBLE_RECOMMENDATION_KEYS,
  gateRecommendations,
  getTranslation as getTranslationSupport,
  resolveRecommendationTranslation,
  resolveWarningTranslation,
} from './calendarRecommendationSupport'
import { EVIDENCE_CONFIDENCE_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'
import { normalizeUserFacingGuidance } from '@/lib/calendar-engine/matrix/guidanceLanguage'
import { normalizeMojibakePayload } from '@/lib/text/mojibake'
export { generateBestTimes, generateSummary } from './calendarSummarySupport'
import { generateBestTimes, generateSummary } from './calendarSummarySupport'
import {
  applyMatrixDisplayScoreBias,
  buildCrossEvidenceBundle,
  buildMatrixFirstDescription,
  buildMatrixFirstRecommendations,
  buildMatrixFirstSummary,
  buildMatrixFirstWarnings,
  buildMatrixOverlay,
  buildMatrixStrictDescriptionFallback,
  buildMatrixStrictRecommendations,
  buildMatrixStrictSummaryFallback,
  buildMatrixStrictWarnings,
  clampDisplayScore,
  getEffectiveGradeFromDisplayScore,
} from './calendarMatrixEvidenceSupport'
import { dedupeTexts } from './textDedupe'

export { gateRecommendations }
export const getTranslation = getTranslationSupport
export type { MatrixCalendarContext } from './calendarMatrixTextSupport'

const CALENDAR_MATRIX_STRICT_MODE = true

export function getPillarStemName(pillar: PillarData | SajuPillarAccessor | undefined): string {
  if (!pillar) {
    return ''
  }
  const p = pillar as SajuPillarAccessor
  // PillarData format (heavenlyStem is object with name)
  if (typeof p.heavenlyStem === 'object' && p.heavenlyStem && 'name' in p.heavenlyStem) {
    return p.heavenlyStem.name || ''
  }
  // Simple format with stem.name
  if (typeof p.stem === 'object' && p.stem && 'name' in p.stem) {
    return p.stem.name || ''
  }
  // String format
  if (typeof p.heavenlyStem === 'string') {
    return p.heavenlyStem
  }
  if (typeof p.stem === 'string') {
    return p.stem
  }
  return ''
}

export function getPillarBranchName(pillar: PillarData | SajuPillarAccessor | undefined): string {
  if (!pillar) {
    return ''
  }
  const p = pillar as SajuPillarAccessor
  // PillarData format (earthlyBranch is object with name)
  if (typeof p.earthlyBranch === 'object' && p.earthlyBranch && 'name' in p.earthlyBranch) {
    return p.earthlyBranch.name || ''
  }
  // Simple format with branch.name
  if (typeof p.branch === 'object' && p.branch && 'name' in p.branch) {
    return p.branch.name || ''
  }
  // String format
  if (typeof p.earthlyBranch === 'string') {
    return p.earthlyBranch
  }
  if (typeof p.branch === 'string') {
    return p.branch
  }
  return ''
}

// ==== Date helpers ====
export function parseBirthDate(birthDateParam: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateParam)
  if (!match) {
    return null
  }
  const [, y, m, d] = match
  const year = Number(y)
  const month = Number(m)
  const day = Number(d)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

// 한줄 요약 생성
function seedNumber(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function pickBySeed<T>(seed: string, items: T[]): T {
  if (items.length === 0) {
    throw new Error('pickBySeed requires a non-empty array')
  }
  return items[seedNumber(seed) % items.length]
}

/**
 * bad day specific reason
 */
function buildCategoryAction(
  category: EventCategory,
  grade: ImportanceGrade,
  lang: 'ko' | 'en',
  seed: string
): string {
  const ko: Record<EventCategory, string[]> = {
    career: ['핵심 업무 1건을 오전에 선처리하세요.', '협업/보고는 짧고 명확하게 진행하세요.'],
    wealth: [
      '지출·투자 기준선을 먼저 정하고 움직이세요.',
      '작은 수익보다 리스크 통제를 우선하세요.',
    ],
    love: [
      '감정보다 의도를 분명히 말하면 오해를 줄일 수 있어요.',
      '관계 대화는 저녁 시간에 짧게 정리하세요.',
    ],
    health: [
      '수면·식사 리듬을 먼저 맞추면 컨디션이 회복됩니다.',
      '무리한 강도보다 가벼운 루틴이 유리합니다.',
    ],
    travel: [
      '이동 전 일정과 동선을 한 번 더 점검하세요.',
      '출발 시간 버퍼를 넉넉히 두는 게 좋습니다.',
    ],
    study: ['집중 블록 40~60분 단위로 학습하세요.', '복습 우선 순위를 3개로 제한하세요.'],
    general: [
      '오늘 목표를 2개 이하로 줄이면 성과가 올라갑니다.',
      '중요하지 않은 요청은 과감히 미루세요.',
    ],
  }
  const en: Record<EventCategory, string[]> = {
    career: ['Finish one core work item early.', 'Keep meetings and updates concise.'],
    wealth: ['Set a spending/investment limit first.', 'Prioritize risk control over quick gains.'],
    love: [
      'State intentions clearly to reduce misunderstandings.',
      'Keep relationship talks short and focused.',
    ],
    health: ['Stabilize sleep and meal rhythm first.', 'Choose consistency over intensity.'],
    travel: ['Re-check route and schedule before moving.', 'Add a safe time buffer to departures.'],
    study: ['Work in 40-60 minute focus blocks.', 'Limit review priorities to three topics.'],
    general: ["Cut today's priorities down to two.", 'Delay low-impact requests without guilt.'],
  }
  const source = lang === 'ko' ? ko : en
  const base = pickBySeed(seed, source[category] || source.general)
  if (grade >= 3) {
    return lang === 'ko'
      ? `${base} 큰 결정은 하루 미뤄도 괜찮습니다.`
      : `${base} Defer major decisions for a day.`
  }
  return base
}

function buildFactorAction(factors: string[], lang: 'ko' | 'en', seed: string): string | null {
  const lower = factors.map((f) => f.toLowerCase())
  if (lower.some((f) => f.includes('retrograde'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          '계약·결제는 재확인 후 진행하세요.',
          '메시지/문서는 오탈자 점검 후 발송하세요.',
        ])
      : pickBySeed(seed, [
          'Double-check contracts and payments.',
          'Proofread messages and documents before sending.',
        ])
  }
  if (lower.some((f) => f.includes('chung') || f.includes('xing') || f.includes('conflict'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          '정면충돌보다 우회안을 준비하세요.',
          '예민한 대화는 결론보다 사실 확인부터 하세요.',
        ])
      : pickBySeed(seed, [
          'Prepare a fallback path instead of direct confrontation.',
          'Validate facts first in sensitive conversations.',
        ])
  }
  if (lower.some((f) => f.includes('samhap') || f.includes('yukhap') || f.includes('cheoneul'))) {
    return lang === 'ko'
      ? pickBySeed(seed, [
          '협업 제안·네트워킹에 유리한 흐름입니다.',
          '도움을 요청하면 응답을 얻기 쉽습니다.',
        ])
      : pickBySeed(seed, [
          'Good timing for collaboration and networking.',
          'Support requests are likely to get traction.',
        ])
  }
  return null
}

function buildContextWarnings(
  grade: ImportanceGrade,
  factors: string[],
  lang: 'ko' | 'en'
): string[] {
  const lower = factors.map((f) => f.toLowerCase())
  const warnings: string[] = []
  if (grade >= 3) {
    warnings.push(
      lang === 'ko'
        ? '일정 지연 가능성을 고려해 버퍼를 확보하세요.'
        : 'Add schedule buffer to absorb delays.'
    )
  }
  if (lower.some((f) => f.includes('retrograde'))) {
    warnings.push(
      lang === 'ko'
        ? '커뮤니케이션 오류 가능성이 있어 재확인이 필요합니다.'
        : 'Communication errors are more likely today.'
    )
  }
  if (lower.some((f) => f.includes('gongmang') || f.includes('void'))) {
    warnings.push(
      lang === 'ko'
        ? '새 프로젝트의 즉시 확정은 신중히 검토하세요.'
        : 'Avoid locking in new projects impulsively.'
    )
  }
  if (lower.some((f) => f.includes('accident') || f.includes('backho'))) {
    warnings.push(
      lang === 'ko'
        ? '이동·운동 시 안전수칙을 강화하세요.'
        : 'Use extra safety precautions for movement and exercise.'
    )
  }
  return dedupeTexts(warnings)
}

function buildEnhancedRecommendations(
  date: ImportantDate,
  categories: EventCategory[],
  bestTimes: string[],
  translations: TranslationData,
  lang: 'ko' | 'en'
): string[] {
  const lowConfidence = (date.confidence ?? 100) < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  const communicationWarning = date.warningKeys.some((key) =>
    CALENDAR_COMMUNICATION_WARNING_TOKENS.some((token) => key.toLowerCase().includes(token))
  )
  const shouldGateIrreversible = lowConfidence || communicationWarning
  const gatedRecommendationKeys = shouldGateIrreversible
    ? date.recommendationKeys.filter((key) => !IRREVERSIBLE_RECOMMENDATION_KEYS.has(key))
    : date.recommendationKeys

  const translated = gatedRecommendationKeys.map((key) =>
    resolveRecommendationTranslation(key, translations, lang)
  )
  const seed = `${date.date}|${date.score}|${date.grade}|${categories[0] || 'general'}`
  const categoryAction = buildCategoryAction(categories[0] || 'general', date.grade, lang, seed)
  const factorAction = buildFactorAction(
    [...date.sajuFactorKeys, ...date.astroFactorKeys],
    lang,
    seed
  )
  const timeHint = bestTimes[0]
    ? lang === 'ko'
      ? `추천 시간 우선: ${bestTimes[0]}`
      : `Prioritize this time window: ${bestTimes[0]}`
    : null

  return gateRecommendations({
    recommendations: [...translated, categoryAction, factorAction || '', timeHint || ''],
    recommendationKeys: gatedRecommendationKeys,
    warningKeys: date.warningKeys,
    confidence: date.confidence,
    grade: date.grade,
    lang,
    forceGate: shouldGateIrreversible,
    irreversibleKeyPresent: date.recommendationKeys.some((key) =>
      IRREVERSIBLE_RECOMMENDATION_KEYS.has(key)
    ),
    dateSeed: date.date,
  }).map((text) => normalizeUserFacingGuidance(text, lang))
}

function buildEnhancedWarnings(
  date: ImportantDate,
  translations: TranslationData,
  lang: 'ko' | 'en'
): string[] {
  const severeWarningKeys = new Set([
    'extremeCaution',
    'confusion',
    'accident',
    'injury',
    'legal',
    'danger',
    'surgery',
    'eclipseDay',
    'eclipseNear',
  ])
  const lowConfidence = (date.confidence ?? 100) < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  const crossAligned = isAlignedAcrossSystems(date.crossAgreementPercent)
  const warningKeysForGrade =
    date.grade <= 1
      ? date.warningKeys.filter((key) => {
          if (severeWarningKeys.has(key)) return true
          if (key.toLowerCase().includes('retrograde')) return lowConfidence || !crossAligned
          return false
        })
      : date.warningKeys

  const translated = warningKeysForGrade.map((key) =>
    resolveWarningTranslation(key, translations, lang)
  )
  const factors = [...date.sajuFactorKeys, ...date.astroFactorKeys]
  let contextual = buildContextWarnings(date.grade, factors, lang)

  if (date.grade <= 1) {
    const lower = factors.map((f) => f.toLowerCase())
    contextual = []

    // Keep safety-critical cautions even on high-grade days.
    if (lower.some((f) => f.includes('accident') || f.includes('backho'))) {
      contextual.push(
        lang === 'ko'
          ? '이동·운동 시 안전수칙을 강화하세요.'
          : 'Use extra safety precautions for movement and exercise.'
      )
    }

    // Show communication caution on high-grade days only when confidence/alignment is weak.
    if (lower.some((f) => f.includes('retrograde')) && (lowConfidence || !crossAligned)) {
      contextual.push(
        lang === 'ko'
          ? '커뮤니케이션 오류 가능성이 있어 재확인이 필요합니다.'
          : 'Communication errors are more likely today.'
      )
    }
  }

  return dedupeTexts([...translated, ...contextual])
    .slice(0, 6)
    .map((text) => normalizeUserFacingGuidance(text, lang))
}

// applyMatrixPreformatRegrade: matrix context 항상 null 이라 함수 즉시 return date.
// 제거됨 (route.ts 호출 제거 + 함수 정의 제거).

export function formatDateForResponse(
  date: ImportantDate,
  locale: string,
  koTranslations: TranslationData,
  enTranslations: TranslationData
): FormattedDate {
  const translations = locale === 'ko' ? koTranslations : enTranslations
  const lang = locale === 'ko' ? 'ko' : 'en'

  // 중복 카테고리 제거
  const uniqueCategories = [...new Set(date.categories)]

  // 번역된 요소만 포함 (사전에 없는 풀-문장 키는 그대로 통과)
  const looksLikeShortKey = (key: string) =>
    key.length <= 32 && !/[\s.　]/.test(key) && !/[가-힣]/.test(key.replace(/^[a-zA-Z]+$/, ''))
  const resolveFactor = (key: string): string | null => {
    const translated = getFactorTranslation(key, lang)
    if (translated) return translated
    // 짧은 영문 키 형태(stemBijeon 등)인데 번역이 없으면 표시하지 않음 (옛 동작 유지)
    if (looksLikeShortKey(key)) return null
    return key
  }
  const translatedSajuFactors = date.sajuFactorKeys
    .map(resolveFactor)
    .filter((t): t is string => t !== null && t.length > 0)
    .map((text) => sanitizeCalendarCopy(text, lang))

  const translatedAstroFactors = date.astroFactorKeys
    .map(resolveFactor)
    .filter((t): t is string => t !== null && t.length > 0)
    .map((text) => sanitizeCalendarCopy(text, lang))

  // Grade 3 이상(안좋음)에서는 부정적 요소를 먼저 표시
  let orderedSajuFactors = translatedSajuFactors
  let orderedAstroFactors = translatedAstroFactors

  if (date.grade >= 3) {
    // 부정적 키워드가 포함된 요소를 앞으로
    const negativeKeywords = [
      '\uCDA9',
      '형',
      '\uD574',
      '공망',
      '\uC5ED\uD589',
      '주의',
      'clash',
      'conflict',
      'retrograde',
      'caution',
    ]
    orderedSajuFactors = [...translatedSajuFactors].sort((a, b) => {
      const aHasNeg = negativeKeywords.some((k) => a.toLowerCase().includes(k) || a.includes(k))
      const bHasNeg = negativeKeywords.some((k) => b.toLowerCase().includes(k) || b.includes(k))
      if (aHasNeg && !bHasNeg) {
        return -1
      }
      if (!aHasNeg && bHasNeg) {
        return 1
      }
      return 0
    })
    orderedAstroFactors = [...translatedAstroFactors].sort((a, b) => {
      const aHasNeg = negativeKeywords.some((k) => a.toLowerCase().includes(k) || a.includes(k))
      const bHasNeg = negativeKeywords.some((k) => b.toLowerCase().includes(k) || b.includes(k))
      if (aHasNeg && !bHasNeg) {
        return -1
      }
      if (!aHasNeg && bHasNeg) {
        return 1
      }
      return 0
    })
  }

  const bestTimes = generateBestTimes(date.grade, uniqueCategories, lang, date.confidence, date)
  const recommendations = buildEnhancedRecommendations(
    date,
    uniqueCategories,
    bestTimes,
    translations,
    lang
  )
  const warnings = buildEnhancedWarnings(date, translations, lang)
  const crossEvidence = buildCrossEvidenceBundle(
    date,
    lang,
    orderedSajuFactors,
    orderedAstroFactors,
    date.crossAgreementPercent,
    isAlignedAcrossSystems
  )
  const matrixOverlay = buildMatrixOverlay(
    date.date,
    null,
    uniqueCategories,
    lang,
    date.grade,
    date.confidence,
    date.crossAgreementPercent,
    crossEvidence,
    isLowCoherenceSignal
  )
  // matrix packet 항상 null → attachMatrixVerdict noop → evidence 그대로.
  const evidenceWithVerdict = matrixOverlay.evidence
  const matrixVerdict = evidenceWithVerdict.matrixVerdict
  const baseDisplayScore = date.displayScore ?? date.adjustedScore ?? date.score
  const hasPregradedDisplay =
    typeof date.displayScore === 'number' && typeof date.grade === 'number'
  const displayScore = hasPregradedDisplay
    ? clampDisplayScore(date.displayScore ?? date.score)
    : applyMatrixDisplayScoreBias({
        baseScore: baseDisplayScore,
        evidence: evidenceWithVerdict,
      })
  const effectiveGrade = hasPregradedDisplay
    ? (date.grade as ImportanceGrade)
    : getEffectiveGradeFromDisplayScore(displayScore)
  const baseSummary = generateSummary(
    date.grade,
    uniqueCategories,
    displayScore,
    lang,
    date.sajuFactorKeys,
    date.astroFactorKeys,
    date.crossVerified,
    date.date,
    date.crossAgreementPercent
  )
  const engineDescription = sanitizeCalendarCopy(getTranslation(date.descKey, translations), lang)
  const matrixHasNarrative = Boolean(
    matrixVerdict?.topAnchorSummary || matrixVerdict?.topClaim || matrixVerdict?.verdict
  )
  // 매트릭스가 풍부한 서사를 주면 그걸 쓰고, 없을 땐 엔진 베이스(상담사 톤)를 우선
  const matrixFallbackSummary =
    matrixHasNarrative && CALENDAR_MATRIX_STRICT_MODE
      ? buildMatrixStrictSummaryFallback({
          lang,
          evidence: evidenceWithVerdict,
        })
      : engineDescription || baseSummary
  const finalSummary = buildMatrixFirstSummary({
    verdict: matrixVerdict?.verdict,
    topClaim: matrixVerdict?.topClaim,
    topAnchorSummary: matrixVerdict?.topAnchorSummary,
    fallbackSummary: matrixOverlay.summary || matrixFallbackSummary,
  })
  const coherenceConfidence = date.confidence ?? evidenceWithVerdict.confidence
  const coherenceAgreement = date.crossAgreementPercent ?? evidenceWithVerdict.crossAgreementPercent
  const lowCoherence = isLowCoherenceSignal(coherenceConfidence, coherenceAgreement)
  // 제목·점수·등급은 v2 점수를 따르는 v3 풀(defaultTitle)로 단일화한다.
  // 과거엔 교차일치 낮음(forceConservativeMode)·매트릭스 방어국면
  // (highGradePhaseConflict)이 제목을 "해석 갈림/조심하는 날"로 덮고 점수까지
  // 끌어내려, 80점인데 제목은 경고인 모순이 났다. 이제 그 신호는 제목을 바꾸지
  // 않고 경고(warning)로만 surface한다 (forceConservativeMode는 아래 경고/추천 게이트에서 유지).
  const forceConservativeMode = effectiveGrade <= 1 && lowCoherence
  const defaultTitle = sanitizeCalendarCopy(getTranslation(date.titleKey, translations), lang)
  const title = defaultTitle
  const alignedDisplayScore = displayScore
  const alignedEffectiveGrade = effectiveGrade
  const strictWarnings = CALENDAR_MATRIX_STRICT_MODE
    ? buildMatrixStrictWarnings({
        lang,
        evidence: evidenceWithVerdict,
        guardrail: matrixVerdict?.guardrail,
        matrixWarnings: matrixOverlay.warnings,
        grade: alignedEffectiveGrade,
      })
    : dedupeTexts([...warnings, ...matrixOverlay.warnings]).slice(0, 6)
  const warningsForResponse = buildMatrixFirstWarnings({
    matrixGuardrail: matrixVerdict?.guardrail,
    baseWarnings: strictWarnings,
    conservativeWarning: forceConservativeMode
      ? lang === 'ko'
        ? '커뮤니케이션 오류 가능성이 있어 재확인이 필요합니다.'
        : 'Communication errors are more likely today. Re-check before committing.'
      : '',
  })
  const strictRecommendations = CALENDAR_MATRIX_STRICT_MODE
    ? buildMatrixStrictRecommendations({
        lang,
        evidence: evidenceWithVerdict,
        topClaim: matrixVerdict?.topClaim,
        matrixRecommendations: matrixOverlay.recommendations,
      })
    : dedupeTexts([...recommendations, ...matrixOverlay.recommendations]).slice(0, 6)
  const recommendationsForResponse = gateRecommendations({
    recommendations: buildMatrixFirstRecommendations({
      matrixTopClaim: matrixVerdict?.topClaim,
      baseRecommendations: strictRecommendations,
    }),
    recommendationKeys: date.recommendationKeys,
    warningKeys: date.warningKeys,
    warnings: warningsForResponse,
    confidence: evidenceWithVerdict.confidence ?? date.confidence,
    grade: alignedEffectiveGrade,
    title,
    summary: finalSummary,
    lang,
    forceGate: forceConservativeMode,
    irreversibleKeyPresent: date.recommendationKeys.some((key) =>
      IRREVERSIBLE_RECOMMENDATION_KEYS.has(key)
    ),
    dateSeed: date.date,
  })
  // forceConservativeMode일 때 description/summary를 "신호가 엇갈립니다"로
  // 통째 교체하면 title은 defaultTitle("최고의 흐름")인데 본문은 정반대로 가서
  // 같은 카드 안 모순이 다시 난다. 주의 어조는 위 warningsForResponse의
  // conservativeWarning("커뮤니케이션 오류 가능성…")과 recommendation 게이트에서
  // 이미 surface 되므로, description/summary는 평상시 경로로 두고 모순을 막는다.
  const finalDescription = normalizeUserFacingGuidance(
    sanitizeCalendarCopy(
      buildMatrixFirstDescription({
        topAnchorSummary: matrixVerdict?.topAnchorSummary,
        verdict: matrixVerdict?.verdict,
        topClaim: matrixVerdict?.topClaim,
        overlaySummary: matrixOverlay.summary,
        // 매트릭스 서사가 비어 있을 땐 strict 일반문구 대신 엔진의 상담사 톤 description을 사용
        fallbackDescription:
          matrixHasNarrative && CALENDAR_MATRIX_STRICT_MODE
            ? buildMatrixStrictDescriptionFallback({
                lang,
                evidence: evidenceWithVerdict,
                summary: finalSummary,
                guardrail: matrixVerdict?.guardrail,
              })
            : engineDescription || getTranslation(date.descKey, translations),
      }),
      lang
    ),
    lang
  )
  const summarizedBase = sanitizeCalendarCopy(finalSummary, lang)
  const summarized = normalizeUserFacingGuidance(summarizedBase, lang)

  return normalizeMojibakePayload({
    date: date.date,
    grade: alignedEffectiveGrade,
    score: alignedDisplayScore,
    displayScore: alignedDisplayScore,
    displayGrade: alignedEffectiveGrade,
    categories: uniqueCategories,
    title: normalizeUserFacingGuidance(sanitizeCalendarCopy(title, lang), lang),
    description: finalDescription,
    summary: summarized,
    sajuFactors: orderedSajuFactors,
    astroFactors: orderedAstroFactors,
    scoreBreakdown: (
      date as { scoreBreakdown?: import('./yearlyDates').YearlyImportantDate['scoreBreakdown'] }
    ).scoreBreakdown,
    // 시간 층 흐름 + 운끼리 충/합/형 — FlowLadder UI 가 소비.
    longCycleContext: (
      date as { longCycleContext?: import('./yearlyDates').YearlyImportantDate['longCycleContext'] }
    ).longCycleContext,
    cycleInteractions: (
      date as { cycleInteractions?: import('./yearlyDates').YearlyImportantDate['cycleInteractions'] }
    ).cycleInteractions,
    recommendations: recommendationsForResponse.map((text) =>
      normalizeUserFacingGuidance(sanitizeCalendarCopy(text, lang), lang)
    ),
    warnings: warningsForResponse.map((text) =>
      normalizeUserFacingGuidance(sanitizeCalendarCopy(text, lang), lang)
    ),
    evidence: evidenceWithVerdict,
  })
}

// 위치 좌표
export const LOCATION_COORDS: Record<string, LocationCoord> = {
  Seoul: { lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul' },
  'Seoul, KR': { lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul' },
  Busan: { lat: 35.1796, lng: 129.0756, tz: 'Asia/Seoul' },
  'Busan, KR': { lat: 35.1796, lng: 129.0756, tz: 'Asia/Seoul' },
  Tokyo: { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  'Tokyo, JP': { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  'New York': { lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
  'New York, US': { lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
  'Los Angeles': { lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
  'Los Angeles, US': { lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
  London: { lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  'London, GB': { lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  Paris: { lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
  'Paris, FR': { lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
  Beijing: { lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai' },
  'Beijing, CN': { lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai' },
  Shanghai: { lat: 31.2304, lng: 121.4737, tz: 'Asia/Shanghai' },
  'Shanghai, CN': { lat: 31.2304, lng: 121.4737, tz: 'Asia/Shanghai' },
}
