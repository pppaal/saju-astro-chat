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
    .replace(/[.!?]+$/u, '')
}

function normalizeCounselorUnitValue(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value <= 1) return Math.max(0, Math.min(1, value))
  return Math.max(0, Math.min(1, value / 100))
}

function joinCounselorFragments(
  fragments: Array<string | null | undefined>,
  separator: string
): string | undefined {
  const cleaned = fragments
    .map((fragment) => normalizeCounselorSentence(String(fragment || '')))
    .filter(Boolean)
  return cleaned.length > 0 ? cleaned.join(separator) : undefined
}

function summarizeCounselorConditions(
  values: string[] | undefined,
  lang: 'ko' | 'en',
  limit = 2
): string {
  const cleaned = (values || [])
    .map((item) => sanitizeCounselorFreeText(item, lang))
    .map((item) => normalizeCounselorSentence(item))
    .filter(Boolean)
    .slice(0, limit)
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned[0]
  if (lang === 'ko') return `${cleaned[0]}, ${cleaned[1]}`
  return `${cleaned[0]} and ${cleaned[1]}`
}

function describeCounselorCrossAlignment(input: {
  lang: 'ko' | 'en'
  domainLabel: string
  crossAgreement?: number | null
}): string | undefined {
  const agreement = normalizeCounselorUnitValue(input.crossAgreement)
  if (agreement === null) return undefined

  if (input.lang === 'ko') {
    if (agreement >= 0.74) {
      return `${input.domainLabel} 해석은 사주 구조와 점성 타이밍이 같은 방향으로 겹치는 상태입니다`
    }
    if (agreement >= 0.52) {
      return `${input.domainLabel} 해석은 큰 흐름은 같지만 진입 속도는 한 번 더 확인해야 합니다`
    }
    return `${input.domainLabel} 해석은 사주 구조와 점성 촉발 시점이 엇갈려 서두르기보다 조건 정리가 우선입니다`
  }

  if (agreement >= 0.74) {
    return `${input.domainLabel} is getting the same directional push from saju structure and astrology timing`
  }
  if (agreement >= 0.52) {
    return `${input.domainLabel} keeps the same broad direction, but the entry speed still needs checking`
  }
  return `${input.domainLabel} still has structural and trigger timing pulling in slightly different directions, so conditions matter more than speed`
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
  crossAgreement?: number | null
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
  const alignmentLine = describeCounselorCrossAlignment({
    lang: input.lang,
    domainLabel: input.domainLabel,
    crossAgreement: input.crossAgreement,
  })
  const timingLine =
    sanitizedTiming && timing?.window
      ? input.lang === 'ko'
        ? `${sanitizeCounselorFreeText(timing.window, input.lang)} 구간을 보는 이유는 ${sanitizedTiming}`
        : `The ${sanitizeCounselorFreeText(timing.window, input.lang)} window matters because ${sanitizedTiming}`
      : sanitizedTiming

  if (input.lang === 'ko') {
    return joinCounselorFragments(
      [
        sanitizedThesis ? `${input.domainLabel} 해석의 핵심은 ${sanitizedThesis}` : '',
        alignmentLine,
        timingLine,
        sanitizedManifestation,
      ],
      '. '
    )
  }

  return joinCounselorFragments(
    [
      sanitizedThesis ? `The core read on ${input.domainLabel} is ${sanitizedThesis}` : '',
      alignmentLine,
      timingLine,
      sanitizedManifestation,
    ],
    '. '
  )
}

export function buildCounselorVerdictTimingLine(input: {
  lang: 'ko' | 'en'
  topTimingWindow?: CounselorEvidencePacket['topTimingWindow'] | null
  topManifestation?: CounselorEvidencePacket['topManifestation'] | null
}): string | undefined {
  const timing = input.topTimingWindow
  const manifestation = input.topManifestation
  const windowLabel = normalizeCounselorSentence(
    sanitizeCounselorFreeText(timing?.window || '', input.lang)
  )
  const entrySummary = summarizeCounselorConditions(timing?.entryConditions, input.lang)
  const abortSummary = summarizeCounselorConditions(timing?.abortConditions, input.lang, 1)

  if (input.lang === 'ko') {
    if (timing) {
      return joinCounselorFragments(
        [
          windowLabel ? `실제 타이밍은 ${windowLabel} 구간을 먼저 보면 됩니다` : '',
          entrySummary ? `${entrySummary}가 맞으면 실행 속도를 올려도 됩니다` : '',
          abortSummary ? `${abortSummary} 조짐이 보이면 확정 속도를 늦추는 편이 안전합니다` : '',
          timing.timingReliabilityBand === 'low'
            ? '정밀 날짜보다 구간 중심으로 읽는 편이 맞습니다'
            : '',
        ],
        '. '
      )
    }
    if (manifestation?.likelyExpressions?.length) {
      return `지금 먼저 보이는 형태는 ${manifestation.likelyExpressions.slice(0, 2).join(', ')} 쪽입니다`
    }
    return undefined
  }

  if (timing) {
    return joinCounselorFragments(
      [
        windowLabel ? `The timing reads best through the ${windowLabel} window first` : '',
        entrySummary ? `It opens faster when ${entrySummary} are in place` : '',
        abortSummary ? `Slow down if ${abortSummary} starts to show up` : '',
        timing.timingReliabilityBand === 'low'
          ? 'Treat this as a window-level read rather than a precise date call'
          : '',
      ],
      '. '
    )
  }
  if (manifestation?.likelyExpressions?.length) {
    return `The first visible form is likely ${manifestation.likelyExpressions.slice(0, 2).join(', ')}`
  }
  return undefined
}

export function buildCounselorCrossSystemSummary(input: {
  lang: 'ko' | 'en'
  domainLabel: string
  crossAgreement?: number | null
  topTimingWindow?: CounselorEvidencePacket['topTimingWindow'] | null
}): string | undefined {
  const agreement = normalizeCounselorUnitValue(input.crossAgreement)
  const windowLabel = normalizeCounselorSentence(
    sanitizeCounselorFreeText(input.topTimingWindow?.window || '', input.lang)
  )
  if (agreement === null && !windowLabel) return undefined

  if (input.lang === 'ko') {
    if (agreement !== null && agreement >= 0.74) {
      return `${input.domainLabel}은 사주 구조와 점성 타이밍이 같은 방향으로 겹쳐${windowLabel ? ` ${windowLabel} 구간 설명이 비교적 또렷합니다` : ' 해석 축이 비교적 선명합니다'}.`
    }
    if (agreement !== null && agreement >= 0.52) {
      return `${input.domainLabel}은 큰 흐름은 같지만 진입 속도는 갈릴 수 있어${windowLabel ? ` ${windowLabel} 구간에서도` : ''} 조건 확인이 먼저입니다.`
    }
    if (agreement !== null) {
      return `${input.domainLabel}은 구조와 촉발 시점이 엇갈려${windowLabel ? ` ${windowLabel}이라도` : ''} 바로 확정하기보다 재확인이 필요합니다.`
    }
    return `${input.domainLabel}은 ${windowLabel} 구간을 기준으로 보되, 정밀 날짜보다 조건 일치 여부가 더 중요합니다.`
  }

  if (agreement !== null && agreement >= 0.74) {
    return `${input.domainLabel} is getting the same directional push from saju structure and astrology timing${windowLabel ? `, so the ${windowLabel} window reads more cleanly` : ''}.`
  }
  if (agreement !== null && agreement >= 0.52) {
    return `${input.domainLabel} keeps the same broad direction, but the entry speed can still split${windowLabel ? ` inside the ${windowLabel} window` : ''}, so condition checks come first.`
  }
  if (agreement !== null) {
    return `${input.domainLabel} still has structural and trigger timing pulling in slightly different directions${windowLabel ? ` even inside the ${windowLabel} window` : ''}, so re-checks matter more than speed.`
  }
  return `${input.domainLabel} should be read through the ${windowLabel} window, with more weight on condition fit than exact date precision.`
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
