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

function stripCounselorDomainLead(
  value: string,
  domainLabel: string,
  lang: 'ko' | 'en'
): string {
  const cleaned = value.trim()
  if (!cleaned) return ''
  if (lang === 'ko') {
    return cleaned
      .replace(new RegExp(`^${domainLabel}\\s*\uD574\uC11D\uC758\\s*\uD575\uC2EC\uC740\\s*`), '')
      .replace(new RegExp(`^${domainLabel}\\s*\uC601\uC5ED\uC740\\s*`), '')
      .replace(new RegExp(`^${domainLabel}\\s*\uCD95\uC774\\s*`), '')
      .replace(new RegExp(`^${domainLabel}\\s*\uAE30\uC900\uC73C\uB85C\\s*`), '')
      .replace(new RegExp(`^${domainLabel}\uB294\\s*`), '')
      .trim()
  }
  return cleaned
    .replace(new RegExp(`^The core read on ${domainLabel} is\\s*`, 'i'), '')
    .replace(new RegExp(`^${domainLabel}\\s+is\\s*`, 'i'), '')
    .trim()
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
  const sanitizedThesis = stripCounselorDomainLead(
    sanitizeCounselorFreeText(advisory?.thesis || '', input.lang),
    input.domainLabel,
    input.lang
  )
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
        sanitizedThesis ? `${input.domainLabel}\uB294 ${sanitizedThesis}` : '',
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
        entrySummary ? `The window opens faster when ${entrySummary}` : '',
        abortSummary ? `Slow down when ${abortSummary}` : '',
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

export function buildCounselorWhyStack(input: {
  lang: 'ko' | 'en'
  domain?: string
  sajuReasons?: string[]
  astroReasons?: string[]
  crossSummary?: string | null
  timingSummary?: string | null
  decisionSummary?: string | null
  conflictSummary?: string | null
  calibrationSummary?: string | null
  trustSummary?: string | null
  provenanceSummary?: string | null
  latentSummary?: string | null
  limit?: number
}): string[] {
  const {
    lang,
    domain,
    sajuReasons = [],
    astroReasons = [],
    crossSummary,
    timingSummary,
    decisionSummary,
    conflictSummary,
    calibrationSummary,
    trustSummary,
    provenanceSummary,
    latentSummary,
    limit = 7,
  } = input

  const domainKey = String(domain || '').trim().toLowerCase()
  const isRelationship = domainKey === 'relationship'
  const isCareer = domainKey === 'career'
  const isWealth = domainKey === 'wealth'
  const isHealth = domainKey === 'health'
  const isMove = domainKey === 'move'

  const narrate = (
    kind:
      | 'cross'
      | 'saju'
      | 'astro'
      | 'timing'
      | 'decision'
      | 'conflict'
      | 'calibration'
      | 'latent'
      | 'trust'
      | 'provenance',
    value: string | null | undefined
  ) => {
    const domainLabel = localizeCounselorDomain(domainKey, lang)
    const cleaned = normalizeCounselorSentence(
      stripCounselorDomainLead(
        sanitizeCounselorFreeText(value || '', lang)
          .replace(/\s*\/\s*/g, '. ')
          .replace(/\.\.+/g, '.'),
        domainLabel,
        lang
      )
    )
    if (!cleaned) return ''

    const fallbackKo = (() => {
      if (kind === 'saju') {
        if (isRelationship) return '\uC0B4\uC544 \uC788\uC5B4 \uAC10\uC815\uBCF4\uB2E4 \uAE30\uC900 \uC815\uB9AC\uB97C \uBA3C\uC800 \uC138\uC6B0\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4'
        if (isCareer) return '\uC0B4\uC544 \uC788\uC5B4 \uC2E4\uD589 \uAE30\uC900\uC744 \uBA3C\uC800 \uC138\uC6B0\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4'
        if (isWealth) return '\uC0B4\uC544 \uC788\uC5B4 \uC190\uC2E4 \uC0C1\uD55C\uBD80\uD130 \uBA3C\uC800 \uC815\uB9AC\uD558\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4'
        if (isHealth) return '\uC0B4\uC544 \uC788\uC5B4 \uD68C\uBCF5 \uB9AC\uB4EC\uBD80\uD130 \uBA3C\uC800 \uB9DE\uCD94\uB294 \uD3B8\uC774 \uB0AB\uC2B5\uB2C8\uB2E4'
        if (isMove) return '\uC0B4\uC544 \uC788\uC5B4 \uC21C\uC11C\uC640 \uAC70\uC810\uBD80\uD130 \uBA3C\uC800 \uC815\uB9AC\uD558\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4'
        return '\uC0B4\uC544 \uC788\uC5B4 \uAE30\uC900 \uC815\uB9AC\uB97C \uBA3C\uC800 \uD558\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4'
      }
      if (kind === 'astro') {
        if (isRelationship) return '\uAD00\uACC4 \uC790\uADF9\uC774 \uB4E4\uC5B4\uC640 \uC18D\uB3C4\uBCF4\uB2E4 \uD398\uC774\uC2A4 \uC870\uC808\uC774 \uBA3C\uC800\uC785\uB2C8\uB2E4'
        if (isCareer) return '\uCC45\uC784 \uC555\uB825\uACFC \uD655\uC7A5 \uC2E0\uD638\uAC00 \uD568\uAED8 \uB4E4\uC5B4\uC640 \uC5ED\uD560 \uC870\uC815\uC774 \uBA3C\uC800\uC785\uB2C8\uB2E4'
        if (isWealth) return '\uD604\uAE08 \uD750\uB984 \uC790\uADF9\uC774 \uB4E4\uC5B4\uC640 \uC218\uC775\uBCF4\uB2E4 \uB9AC\uC2A4\uD06C \uC18D\uB3C4 \uC870\uC808\uC774 \uBA3C\uC800\uC785\uB2C8\uB2E4'
        if (isHealth) return '\uCEE8\uB514\uC158 \uC790\uADF9\uC774 \uB4E4\uC5B4\uC640 \uACFC\uBD80\uD558 \uC2E0\uD638\uB97C \uBA3C\uC800 \uC904\uC5EC\uC57C \uD569\uB2C8\uB2E4'
        if (isMove) return '\uBCC0\uD654 \uC790\uADF9\uC774 \uB4E4\uC5B4\uC640 \uC774\uB3D9 \uC21C\uC11C\uC640 \uC644\uCDA9 \uC2DC\uAC04\uC744 \uBA3C\uC800 \uBD10\uC57C \uD569\uB2C8\uB2E4'
        return '\uC810\uC131 \uD2B8\uB9AC\uAC70\uAC00 \uB4E4\uC5B4\uC640 \uC18D\uB3C4\uBCF4\uB2E4 \uC870\uAC74 \uD655\uC778\uC774 \uBA3C\uC800\uC785\uB2C8\uB2E4'
      }
      return ''
    })()

    const normalized = lang === 'ko' && /\?{2,}/.test(cleaned) && fallbackKo ? fallbackKo : cleaned

    if (lang === 'ko') {
      switch (kind) {
        case 'cross':
          return isRelationship
            ? `\uAD00\uACC4 \uD750\uB984\uC744 \uBB36\uC5B4\uC11C \uBCF4\uBA74 ${normalized}.`
            : isCareer
              ? `\uCEE4\uB9AC\uC5B4 \uD750\uB984\uC744 \uBB36\uC5B4\uC11C \uBCF4\uBA74 ${normalized}.`
              : isWealth
                ? `\uC7AC\uC815 \uD750\uB984\uC744 \uBB36\uC5B4\uC11C \uBCF4\uBA74 ${normalized}.`
                : isHealth
                  ? `\uAC74\uAC15 \uD750\uB984\uC744 \uBB36\uC5B4\uC11C \uBCF4\uBA74 ${normalized}.`
                  : isMove
                    ? `\uC774\uB3D9\uACFC \uBCC0\uD654 \uD750\uB984\uC744 \uBB36\uC5B4\uC11C \uBCF4\uBA74 ${normalized}.`
                    : `\uBA3C\uC800 \uAD50\uCC28 \uACB0\uB860\uBD80\uD130 \uBCF4\uBA74 ${normalized}.`
        case 'saju':
          return isRelationship
            ? `\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uAD00\uACC4 \uAE30\uC900\uC120\uC774 ${normalized}.`
            : isCareer
              ? `\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uC5ED\uD560\uACFC \uCC45\uC784\uC120\uC774 ${normalized}.`
              : isWealth
                ? `\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uC7AC\uC815 \uAE30\uC900\uC120\uC774 ${normalized}.`
                : isHealth
                  ? `\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uBAB8 \uC0C1\uD0DC \uAE30\uC900\uC120\uC774 ${normalized}.`
                  : isMove
                    ? `\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 \uC774\uB3D9 \uAE30\uC900\uC120\uC774 ${normalized}.`
                    : `\uC0AC\uC8FC \uCABD\uC5D0\uC11C\uB294 ${normalized}.`
        case 'astro':
          return isRelationship
            ? `\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 \uAD00\uACC4 \uD2B8\uB9AC\uAC70\uAC00 ${normalized}.`
            : isCareer
              ? `\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 \uCEE4\uB9AC\uC5B4 \uD2B8\uB9AC\uAC70\uAC00 ${normalized}.`
              : isWealth
                ? `\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 \uD604\uAE08 \uD750\uB984 \uD2B8\uB9AC\uAC70\uAC00 ${normalized}.`
                : isHealth
                  ? `\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 \uCEE8\uB514\uC158 \uD2B8\uB9AC\uAC70\uAC00 ${normalized}.`
                  : isMove
                    ? `\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 \uBCC0\uD654 \uD2B8\uB9AC\uAC70\uAC00 ${normalized}.`
                    : `\uC810\uC131 \uCABD\uC5D0\uC11C\uB294 ${normalized}.`
        case 'timing':
          return isRelationship
            ? `\uAD00\uACC4 \uD0C0\uC774\uBC0D\uC740 ${normalized}.`
            : isCareer
              ? `\uCEE4\uB9AC\uC5B4 \uD0C0\uC774\uBC0D\uC740 ${normalized}.`
              : isWealth
                ? `\uC7AC\uC815 \uD0C0\uC774\uBC0D\uC740 ${normalized}.`
                : isHealth
                  ? `\uAC74\uAC15 \uD0C0\uC774\uBC0D\uC740 ${normalized}.`
                  : isMove
                    ? `\uC774\uB3D9 \uD0C0\uC774\uBC0D\uC740 ${normalized}.`
                    : `\uD0C0\uC774\uBC0D\uC740 ${normalized}.`
        case 'decision':
          return isRelationship
            ? `\uADF8\uB798\uC11C \uAD00\uACC4 \uD310\uB2E8\uC740 ${normalized}.`
            : isCareer
              ? `\uADF8\uB798\uC11C \uCEE4\uB9AC\uC5B4 \uD310\uB2E8\uC740 ${normalized}.`
              : isWealth
                ? `\uADF8\uB798\uC11C \uC7AC\uC815 \uD310\uB2E8\uC740 ${normalized}.`
                : isHealth
                  ? `\uADF8\uB798\uC11C \uAC74\uAC15 \uD310\uB2E8\uC740 ${normalized}.`
                  : isMove
                    ? `\uADF8\uB798\uC11C \uC774\uB3D9 \uD310\uB2E8\uC740 ${normalized}.`
                    : `\uADF8\uB798\uC11C \uD310\uB2E8 \uCD95\uC740 ${normalized}.`
        case 'conflict':
          return isRelationship
            ? `\uB2E4\uB9CC \uAD00\uACC4\uC5D0\uC11C \uC5C7\uAC08\uB9AC\uB294 \uC9C0\uC810\uC740 ${normalized}.`
            : isCareer
              ? `\uB2E4\uB9CC \uCEE4\uB9AC\uC5B4\uC5D0\uC11C \uC5C7\uAC08\uB9AC\uB294 \uC9C0\uC810\uC740 ${normalized}.`
              : isWealth
                ? `\uB2E4\uB9CC \uC7AC\uC815\uC5D0\uC11C \uC5C7\uAC08\uB9AC\uB294 \uC9C0\uC810\uC740 ${normalized}.`
                : isHealth
                  ? `\uB2E4\uB9CC \uAC74\uAC15\uC5D0\uC11C \uC5C7\uAC08\uB9AC\uB294 \uC9C0\uC810\uC740 ${normalized}.`
                  : isMove
                    ? `\uB2E4\uB9CC \uC774\uB3D9\uC5D0\uC11C \uC5C7\uAC08\uB9AC\uB294 \uC9C0\uC810\uC740 ${normalized}.`
                    : `\uB2E4\uB9CC \uCDA9\uB3CC \uBA54\uBAA8\uB85C\uB294 ${normalized}.`
        case 'calibration':
          return isRelationship
            ? `\uAD00\uACC4 \uD0C0\uC774\uBC0D\uC744 \uC77D\uC744 \uB54C\uB294 ${normalized}.`
            : isCareer
              ? `\uCEE4\uB9AC\uC5B4 \uD0C0\uC774\uBC0D\uC744 \uC77D\uC744 \uB54C\uB294 ${normalized}.`
              : isWealth
                ? `\uC7AC\uC815 \uD0C0\uC774\uBC0D\uC744 \uC77D\uC744 \uB54C\uB294 ${normalized}.`
                : isHealth
                  ? `\uAC74\uAC15 \uD0C0\uC774\uBC0D\uC744 \uC77D\uC744 \uB54C\uB294 ${normalized}.`
                  : isMove
                    ? `\uC774\uB3D9 \uD0C0\uC774\uBC0D\uC744 \uC77D\uC744 \uB54C\uB294 ${normalized}.`
                    : `\uC815\uBC00\uB3C4 \uBA54\uBAA8\uB85C\uB294 ${normalized}.`
        case 'latent':
          return isRelationship
            ? `\uC9C0\uAE08 \uAD00\uACC4 \uCABD\uC744 \uAC00\uC7A5 \uC138\uAC8C \uB044\uB294 \uCE35\uC740 ${normalized}.`
            : isCareer
              ? `\uC9C0\uAE08 \uCEE4\uB9AC\uC5B4 \uCABD\uC744 \uAC00\uC7A5 \uC138\uAC8C \uB044\uB294 \uCE35\uC740 ${normalized}.`
              : isWealth
                ? `\uC9C0\uAE08 \uC7AC\uC815 \uCABD\uC744 \uAC00\uC7A5 \uC138\uAC8C \uB044\uB294 \uCE35\uC740 ${normalized}.`
                : isHealth
                  ? `\uC9C0\uAE08 \uAC74\uAC15 \uCABD\uC744 \uAC00\uC7A5 \uC138\uAC8C \uB044\uB294 \uCE35\uC740 ${normalized}.`
                  : isMove
                    ? `\uC9C0\uAE08 \uC774\uB3D9 \uCABD\uC744 \uAC00\uC7A5 \uC138\uAC8C \uB044\uB294 \uCE35\uC740 ${normalized}.`
                    : `\uC9C0\uAE08 \uAC00\uC7A5 \uC138\uAC8C \uC791\uB3D9\uD558\uB294 \uCE35\uC740 ${normalized}.`
        case 'trust':
          return isRelationship
            ? `\uAD00\uACC4 \uD574\uC11D \uC2E0\uB8B0\uB3C4\uB294 ${normalized}.`
            : isCareer
              ? `\uCEE4\uB9AC\uC5B4 \uD574\uC11D \uC2E0\uB8B0\uB3C4\uB294 ${normalized}.`
              : isWealth
                ? `?? ?? ???? ${normalized}.`
                : isHealth
                  ? `?? ?? ???? ${normalized}.`
                  : isMove
                    ? `?? ?? ???? ${normalized}.`
                    : `???? ${normalized}.`
        case 'provenance':
          return isRelationship
            ? `?? ??? ${normalized}.`
            : isCareer
              ? `??? ??? ${normalized}.`
              : isWealth
                ? `?? ??? ${normalized}.`
                : isHealth
                  ? `?? ??? ${normalized}.`
                  : isMove
                    ? `?? ??? ${normalized}.`
                    : `?? ??? ${normalized}.`
      }
    }

    switch (kind) {
      case 'cross':
        return isRelationship
          ? `At the combined relationship-read level, ${normalized}.`
          : isCareer
            ? `At the combined career-read level, ${normalized}.`
            : isWealth
              ? `At the combined financial-read level, ${normalized}.`
              : isHealth
                ? `At the combined health-read level, ${normalized}.`
                : isMove
                  ? `At the combined movement-read level, ${normalized}.`
                  : `At the cross-read level, ${normalized}.`
      case 'saju':
        return isRelationship
          ? `From the saju side, the relationship baseline says ${normalized}.`
          : isCareer
            ? `From the saju side, the role-and-responsibility baseline says ${normalized}.`
            : isWealth
              ? `From the saju side, the money baseline says ${normalized}.`
              : isHealth
                ? `From the saju side, the body baseline says ${normalized}.`
                : isMove
                  ? `From the saju side, the movement baseline says ${normalized}.`
                  : `From the saju side, ${normalized}.`
      case 'astro':
        return isRelationship
          ? `From the astrology side, the relationship trigger says ${normalized}.`
          : isCareer
            ? `From the astrology side, the career trigger says ${normalized}.`
            : isWealth
              ? `From the astrology side, the cash-flow trigger says ${normalized}.`
              : isHealth
                ? `From the astrology side, the condition trigger says ${normalized}.`
                : isMove
                  ? `From the astrology side, the movement trigger says ${normalized}.`
                  : `From the astrology side, ${normalized}.`
      case 'timing':
        return `Timing-wise, ${normalized}.`
      case 'decision':
        return `So the decision line is simple: ${normalized}.`
      case 'conflict':
        return `The part still pulling in different directions is ${normalized}.`
      case 'calibration':
        return `For timing precision, ${normalized}.`
      case 'latent':
        return `The strongest latent driver right now is ${normalized}.`
      case 'trust':
        return `The trust read is ${normalized}.`
      case 'provenance':
        return `The evidence trail is ${normalized}.`
    }
  }

  const labeled = [
    narrate('cross', crossSummary || undefined),
    ...sajuReasons.map((reason) => narrate('saju', reason)),
    ...astroReasons.map((reason) => narrate('astro', reason)),
    narrate('timing', timingSummary || undefined),
    narrate('decision', decisionSummary || undefined),
    narrate('conflict', conflictSummary || undefined),
    narrate('calibration', calibrationSummary || undefined),
    narrate('latent', latentSummary || undefined),
    narrate('trust', trustSummary || undefined),
    narrate('provenance', provenanceSummary || undefined),
  ].filter(Boolean)

  const deduped: string[] = []
  for (const line of labeled) {
    const normalized = normalizeCounselorSentence(line)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (deduped.some((existing) => existing.toLowerCase() === key)) continue
    deduped.push(normalized)
  }

  return deduped.slice(0, limit)
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
  const normalizedFocusRunnerUp = focusRunnerUp === focusLabel ? '' : focusRunnerUp
  const normalizedActionRunnerUp = actionRunnerUp === actionLabel ? '' : actionRunnerUp

  if (input.lang === 'ko') {
    if (input.actionFocusDomain && input.actionFocusDomain !== input.focusDomain) {
      return `${actionLabel}\u0020\uCABD \uC2E4\uD589 \uC555\uB825\uC774 ${normalizedActionRunnerUp || '\uB2E4\uB978 \uCD95'}\uBCF4\uB2E4 \uC55E\uC11C \uC788\uC5B4, \uC2E4\uC81C \uD589\uB3D9\uC740 ${actionLabel}\u0020\uAE30\uC900\uC73C\uB85C \uC7A1\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4. ${focusLabel}\uC740 \uBC30\uACBD \uAD6C\uC870\uB85C \uD568\uAED8 \uBCF4\uBA74 \uB429\uB2C8\uB2E4.`
    }
    return `${focusLabel}\u0020\uCD95\uC774 ${normalizedFocusRunnerUp || '\uB2E4\uB978 \uCD95'}\uBCF4\uB2E4 \uD55C \uB2E8\uACC4 \uC55E\uC11C \uC788\uC5B4, \uC9C0\uAE08 \uD310\uB2E8\uC740 ${focusLabel}\u0020\uAE30\uC900\uC73C\uB85C \uC7A1\uB294 \uD3B8\uC774 \uB9DE\uC2B5\uB2C8\uB2E4.`
  }

  if (input.actionFocusDomain && input.actionFocusDomain !== input.focusDomain) {
    return `${actionLabel} moved ahead of ${normalizedActionRunnerUp || 'the runner-up domain'} as the actionable pressure, while ${focusLabel} remains the background structural axis.`
  }
  return `${focusLabel} stayed ahead of ${normalizedFocusRunnerUp || 'the runner-up domain'} as the current lead axis.`
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
