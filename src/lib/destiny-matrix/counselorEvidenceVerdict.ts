import type {
  CounselorEvidencePacket,
  CounselorTheme,
} from '@/lib/destiny-matrix/counselorEvidence'
import type { InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import {
  localizeCounselorDomain,
  sanitizeCounselorFreeText,
} from '@/lib/destiny-matrix/counselorEvidenceSanitizer'

export function normalizeCounselorSentence(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.。!！?？]+$/u, '')
}

export function joinUniqueVerdictParts(parts: Array<string | null | undefined>): string {
  const normalized: string[] = []
  for (const raw of parts) {
    const cleaned = normalizeCounselorSentence(String(raw || ''))
    if (!cleaned) continue
    if (
      normalized.some(
        (existing) =>
          existing === cleaned || existing.includes(cleaned) || cleaned.includes(existing)
      )
    ) {
      continue
    }
    normalized.push(cleaned)
  }
  return normalized.join('. ').trim()
}

export function buildCounselorVerdictLead(
  topDecisionLabel: string | undefined,
  actionFocusDomain: string | undefined,
  focusDomain: string | undefined,
  lang: 'ko' | 'en'
): string | undefined {
  if (!topDecisionLabel) return undefined
  if (actionFocusDomain && focusDomain && actionFocusDomain !== focusDomain) {
    return lang === 'ko'
      ? `지금 질문에 바로 닿는 축은 ${localizeCounselorDomain(actionFocusDomain, lang)}입니다. 우선은 ${topDecisionLabel}입니다.`
      : `The axis that matters most for this question right now is ${localizeCounselorDomain(actionFocusDomain, lang)}. The priority is ${topDecisionLabel}.`
  }
  return lang === 'ko'
    ? `지금 우선은 ${topDecisionLabel}입니다`
    : `The priority now is ${topDecisionLabel}.`
}

export function buildCounselorVerdictContext(input: {
  lang: 'ko' | 'en'
  domainLabel: string
  topTimingWindow?: CounselorEvidencePacket['topTimingWindow'] | null
  topDomainAdvisory?: CounselorEvidencePacket['topDomainAdvisory'] | null
  topManifestation?: CounselorEvidencePacket['topManifestation'] | null
}): string | undefined {
  const timing = input.topTimingWindow
  const advisory = input.topDomainAdvisory
  const manifestation = input.topManifestation
  const sanitizedThesis = sanitizeCounselorFreeText(advisory?.thesis || '', input.lang)
  const sanitizedTiming = sanitizeCounselorFreeText(
    timing?.timingConflictNarrative || timing?.whyNow || '',
    input.lang
  )
  const sanitizedManifestation = sanitizeCounselorFreeText(
    manifestation?.manifestation || '',
    input.lang
  )

  if (input.lang === 'ko') {
    if (sanitizedThesis) return `${input.domainLabel} 해석의 핵심은 ${sanitizedThesis}`
    if (sanitizedTiming) return sanitizedTiming
    if (sanitizedManifestation) return sanitizedManifestation
    return undefined
  }

  if (sanitizedThesis) return `The core read on ${input.domainLabel} is ${sanitizedThesis}`
  if (sanitizedTiming) return sanitizedTiming
  if (sanitizedManifestation) return sanitizedManifestation
  return undefined
}

export function buildCounselorVerdictTimingLine(input: {
  lang: 'ko' | 'en'
  topTimingWindow?: CounselorEvidencePacket['topTimingWindow'] | null
  topManifestation?: CounselorEvidencePacket['topManifestation'] | null
}): string | undefined {
  const timing = input.topTimingWindow
  const manifestation = input.topManifestation

  if (input.lang === 'ko') {
    if (timing?.entryConditions?.length) {
      const entry = timing.entryConditions
        .slice(0, 2)
        .map((item) =>
          sanitizeCounselorFreeText(item, 'ko')
            .replace(/가 유지될 것/g, '이 유지되고')
            .replace(/이 유지될 것/g, '이 유지되고')
            .replace(/를 바로 실행할 수 있을 것/g, '를 바로 실행할 수 있는지')
            .replace(/할 수 있을 것/g, '할 수 있는지')
            .replace(/근거이/g, '근거가')
            .replace(/(\d+(?:\.\d+)?)%이 유지되고/g, '$1%가 유지되고')
            .replace(/(\d+(?:\.\d+)?)%이 유지되는지/g, '$1%가 유지되는지')
        )
        .filter(Boolean)
      return entry.length > 1
        ? `실제 성사는 핵심 조건 ${entry.length}개가 함께 맞을 때 빨라집니다.`
        : `실제 성사는 핵심 조건이 맞을 때 빨라집니다.`
    }
    if (manifestation?.likelyExpressions?.length) {
      return `지금 먼저 보이는 형태는 ${manifestation.likelyExpressions.slice(0, 2).join(', ')} 쪽입니다`
    }
    return undefined
  }

  if (timing?.entryConditions?.length) {
    const count = Math.min(timing.entryConditions.length, 2)
    return `This moves faster when ${count} core condition${count > 1 ? 's' : ''} line up.`
  }
  if (manifestation?.likelyExpressions?.length) {
    return `The first visible form is likely ${manifestation.likelyExpressions.slice(0, 2).join(', ')}`
  }
  return undefined
}

export function buildCounselorArbitrationLine(input: {
  focusDomain: string
  actionFocusDomain?: string
  focusRunnerUpDomain?: string
  actionRunnerUpDomain?: string
  lang: 'ko' | 'en'
}): string {
  const focusLabel = localizeCounselorDomain(input.focusDomain, input.lang)
  const actionLabel = localizeCounselorDomain(
    input.actionFocusDomain || input.focusDomain,
    input.lang
  )
  const focusRunnerUp = input.focusRunnerUpDomain
    ? localizeCounselorDomain(input.focusRunnerUpDomain, input.lang)
    : ''
  const actionRunnerUp = input.actionRunnerUpDomain
    ? localizeCounselorDomain(input.actionRunnerUpDomain, input.lang)
    : ''

  if (input.lang === 'ko') {
    if (input.actionFocusDomain && input.actionFocusDomain !== input.focusDomain) {
      return `${actionLabel}이 ${actionRunnerUp || '다른 축'}보다 앞서 실제 행동 압력을 끌고 가고, ${focusLabel} 축은 배경 구조로 남아 있습니다.`
    }
    return `${focusLabel}이 ${focusRunnerUp || '다른 축'}보다 한 단계 앞서 현재 중심 판단으로 채택됐습니다.`
  }

  if (input.actionFocusDomain && input.actionFocusDomain !== input.focusDomain) {
    return `${actionLabel} moved ahead of ${actionRunnerUp || 'the runner-up domain'} as the actionable pressure, while ${focusLabel} remains the background structural axis.`
  }
  return `${focusLabel} stayed ahead of ${focusRunnerUp || 'the runner-up domain'} as the current lead axis.`
}

export function isQuestionDrivenTheme(theme: CounselorTheme): boolean {
  return ['love', 'career', 'wealth', 'health', 'family', 'life'].includes(String(theme))
}

export function mapThemeToDomain(theme: CounselorTheme): InsightDomain {
  switch (theme) {
    case 'love':
    case 'family':
      return 'relationship'
    case 'career':
      return 'career'
    case 'wealth':
      return 'wealth'
    case 'health':
      return 'health'
    case 'today':
    case 'month':
    case 'year':
      return 'timing'
    case 'life':
    case 'chat':
    default:
      return 'personality'
  }
}
