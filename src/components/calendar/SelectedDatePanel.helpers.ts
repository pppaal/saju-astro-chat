import { repairMojibakeText } from '@/lib/text/mojibake'
import { EVIDENCE_CONFIDENCE_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'

export type SelectedPanelEventCategory = 'wealth' | 'career' | 'love' | 'health' | 'travel' | 'study' | 'general'

export const CATEGORY_EMOJI: Record<SelectedPanelEventCategory, string> = {
  wealth: '\u{1F4B0}',
  career: '\u{1F4BC}',
  love: '\u{1F495}',
  health: '\u{1F4AA}',
  travel: '\u2708\uFE0F',
  study: '\u{1F4DA}',
  general: '\u2B50',
}

export const WEEKDAYS_KO = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0']
export const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function normalizeEvidenceLine(value: string): string {
  if (!value) return ''
  const normalized = stripMatrixDomainText(deepRepairText(value)).replace(/\s+/g, ' ').trim()
  return isUnreadableText(normalized) ? '' : normalized
}

export function decodeUtf8FromLatin1(value: string): string {
  try {
    const bytes = Uint8Array.from([...value].map((ch) => ch.charCodeAt(0) & 0xff))
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return value
  }
}

export function deepRepairText(value: string): string {
  const firstPass = repairMojibakeText(value || '')
  if (!/[ÃƒÃ‚Ã°Ã¢]/.test(firstPass)) {
    return decodeBareUnicodeTokens(decodeUnicodeEscapes(firstPass))
  }
  const decoded = decodeUtf8FromLatin1(firstPass)
  const secondPass = repairMojibakeText(decoded)
  return decodeBareUnicodeTokens(decodeUnicodeEscapes(secondPass || firstPass))
}

export function decodeUnicodeEscapes(value: string): string {
  if (!value || value.indexOf('\\u') === -1) return value

  return value
    .replace(/\\u\{([0-9A-Fa-f]{1,6})\}/g, (raw, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      if (!Number.isFinite(codePoint)) return raw
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return raw
      }
    })
    .replace(/\\u([0-9A-Fa-f]{4})/g, (raw, hex: string) => {
      const codePoint = Number.parseInt(hex, 16)
      if (!Number.isFinite(codePoint)) return raw
      return String.fromCharCode(codePoint)
    })
}

export function decodeBareUnicodeTokens(value: string): string {
  if (!value || !/\bu[0-9A-Fa-f]{4,6}\b/.test(value)) return value
  return value.replace(/\bu([0-9A-Fa-f]{4,6})\b/g, (raw, hex: string) => {
    const codePoint = Number.parseInt(hex, 16)
    if (!Number.isFinite(codePoint)) return raw
    try {
      return String.fromCodePoint(codePoint)
    } catch {
      return raw
    }
  })
}

export function stripMatrixDomainText(value: string): string {
  if (!value) return ''
  return value
    .replace(/\bmatrix\s*:\s*/gi, '')
    .replace(/\bmatrix\s*domain\s*=\s*[^,|)\]]+/gi, '')
    .replace(/\bmatrix\s*domain\s*:\s*[^,|)\]]+/gi, '')
    .replace(/\bdomain\s*=\s*[^,|)\]]+/gi, '')
    .replace(/\bdomain\s*:\s*[^,|)\]]+/gi, '')
    .replace(/\bmatrix\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,|:;\-]+|[\s,|:;\-]+$/g, '')
}

export function isUnreadableText(value: string): boolean {
  if (!value) return true
  if (value.includes('\uFFFD')) return true
  const suspiciousMatches = value.match(/[ÃÂâìëêíð]/g) || []
  if (suspiciousMatches.length >= 3) return true
  return suspiciousMatches.length / Math.max(1, value.length) > 0.15
}

export function safeDisplayText(value: string | null | undefined, fallback = ''): string {
  if (!value) return fallback
  const normalized = stripMatrixDomainText(deepRepairText(value)).replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback
  return isUnreadableText(normalized) ? fallback : normalized
}

export function formatPolicyMode(mode: 'execute' | 'verify' | 'prepare' | undefined, locale: 'ko' | 'en') {
  if (locale === 'ko') {
    if (mode === 'execute') return '실행 우선'
    if (mode === 'prepare') return '준비 우선'
    return '검토 우선'
  }
  if (mode === 'execute') return 'execute-first'
  if (mode === 'prepare') return 'prepare-first'
  return 'verify-first'
}

export function getDomainLabel(
  domain: 'career' | 'love' | 'money' | 'health' | 'move' | 'general' | undefined,
  locale: 'ko' | 'en'
): string {
  const labels = {
    ko: {
      career: '직장/커리어',
      love: '관계/연애',
      money: '재물/금전',
      health: '건강',
      move: '이동/변화',
      general: '전반',
    },
    en: {
      career: 'career',
      love: 'relationships',
      money: 'finance',
      health: 'health',
      move: 'movement/change',
      general: 'overall',
    },
  } as const

  const key = (domain || 'general') as keyof (typeof labels)['ko']
  return labels[locale][key]
}

export function toCalendarDomain(
  domain: string | undefined
): 'career' | 'love' | 'money' | 'health' | 'move' | 'general' | undefined {
  if (!domain) return undefined
  if (domain === 'relationship') return 'love'
  if (domain === 'wealth') return 'money'
  if (domain === 'career' || domain === 'health' || domain === 'move') return domain
  return 'general'
}

export function getReliabilityBand(confidence: number | undefined): 'low' | 'medium' | 'high' {
  if (typeof confidence !== 'number') return 'medium'
  if (confidence < EVIDENCE_CONFIDENCE_THRESHOLDS.low) return 'low'
  if (confidence < EVIDENCE_CONFIDENCE_THRESHOLDS.medium) return 'medium'
  return 'high'
}

export function getReliabilityLabel(confidence: number | undefined, locale: 'ko' | 'en'): string {
  const band = getReliabilityBand(confidence)
  if (locale === 'ko') {
    if (band === 'high') return '높음'
    if (band === 'medium') return '중간'
    return '낮음'
  }
  if (band === 'high') return 'High'
  if (band === 'medium') return 'Medium'
  return 'Low'
}

export function normalizeSemanticKey(value: string): string {
  if (!value) return ''
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function dedupeDisplayLines(values: string[]): string[] {
  const out: string[] = []
  const keys: string[] = []

  for (const value of values) {
    const line = safeDisplayText(value, '')
    if (!line) continue
    const key = normalizeSemanticKey(line)
    if (!key) continue

    const hasDuplicate = keys.some((existing) => {
      if (existing === key) return true
      const canCompareInclusion = existing.length >= 16 && key.length >= 16
      return canCompareInclusion && (existing.includes(key) || key.includes(existing))
    })
    if (hasDuplicate) continue

    keys.push(key)
    out.push(line)
  }

  return out
}

export function takeLeadLine(value: string, maxLength = 88): string {
  const line = safeDisplayText(value, '')
  if (!line) return ''

  const sentenceMatch = line.match(/(.+?[.!?。]|.+?다\.|.+?요\.|.+?$)/)
  const sentence = sentenceMatch?.[1]?.trim() || line
  if (sentence.length <= maxLength) {
    return sentence
  }
  return `${sentence.slice(0, maxLength - 1).trimEnd()}…`
}

export function looksDefensivePhase(value: string): boolean {
  return /(방어|재정렬|안정|검토|defensive|reset|stabil|review)/i.test(value)
}

export function humanizePhaseLabel(value: string, locale: 'ko' | 'en'): string {
  const line = safeDisplayText(value, '')
  if (!line) return ''
  if (locale === 'ko') {
    return line
      .replace(/방어\/재정렬 국면/g, '정비 우선 흐름')
      .replace(/공격\/확장 국면/g, '추진 우선 흐름')
      .replace(/국면/g, '흐름')
  }
  return line
    .replace(/defensive\s*reset/gi, 'stabilizing flow')
    .replace(/aggressive\s*expansion/gi, 'push flow')
    .replace(/\bphase\b/gi, 'flow')
}

export function buildReadableCrossLine(input: {
  locale: 'ko' | 'en'
  confidence?: number
  crossAgreement?: number
  focusDomain: string
}): string {
  const { locale, confidence, crossAgreement, focusDomain } = input
  const agreement =
    typeof crossAgreement === 'number' && Number.isFinite(crossAgreement)
      ? Math.max(0, Math.min(100, Math.round(crossAgreement)))
      : undefined
  const conf =
    typeof confidence === 'number' && Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : undefined

  if (locale === 'ko') {
    if (typeof agreement === 'number' && agreement < 60) {
      return `${focusDomain} 해석에서 사주와 점성 신호가 완전히 겹치지 않아, 오늘은 확정보다 재확인이 더 중요합니다.`
    }
    if (typeof conf === 'number' && conf < 45) {
      return `${focusDomain} 해석 근거는 약한 편이라, 방향은 참고하되 실행 범위는 작게 가져가는 편이 안전합니다.`
    }
    return `${focusDomain} 해석에서 사주와 점성 신호가 비교적 같은 방향을 가리켜 핵심 흐름을 읽는 데는 무리가 적습니다.`
  }

  if (typeof agreement === 'number' && agreement < 60) {
    return `Saju and astrology are not fully aligned for ${focusDomain}, so re-checking matters more than committing today.`
  }
  if (typeof conf === 'number' && conf < 45) {
    return `Evidence for ${focusDomain} is relatively weak, so keep execution small even if the direction looks usable.`
  }
  return `Saju and astrology broadly point in the same direction for ${focusDomain}, so the core flow is reasonably readable.`
}

export function buildReadableFlowSummary(input: {
  locale: 'ko' | 'en'
  focusDomain: string
  phase: string
  gradeLabel: string
  reliability: string
  attackPercent?: number
  defensePercent?: number
  action?: string
  caution?: string
}): string {
  const {
    locale,
    focusDomain,
    phase,
    gradeLabel,
    reliability,
    attackPercent,
    defensePercent,
    action,
    caution,
  } = input

  const hasAttack = typeof attackPercent === 'number' && Number.isFinite(attackPercent)
  const hasDefense = typeof defensePercent === 'number' && Number.isFinite(defensePercent)
  const balanceGap = hasAttack && hasDefense ? Math.abs(attackPercent - defensePercent) : undefined
  const defensive = looksDefensivePhase(phase)

  if (locale === 'ko') {
    const intro = phase
      ? defensive
        ? `지금은 ${phase}이지만 완전 정지보다 정비하면서 움직이는 쪽에 가깝습니다.`
        : `지금은 ${phase}으로 ${focusDomain} 쪽 일을 밀 수 있는 여지가 있는 날입니다.`
      : `${focusDomain} 흐름은 ${gradeLabel}이며, 오늘은 방향을 넓히기보다 핵심을 좁히는 편이 좋습니다.`

    const balance = (() => {
      if (!hasAttack || !hasDefense) return ''
      if (typeof balanceGap === 'number' && balanceGap <= 8) {
        return '실행 여력과 리스크 관리 비중이 비슷해 무리한 확장보다 핵심 1~2건만 정확히 처리하는 편이 낫습니다.'
      }
      if ((attackPercent as number) > (defensePercent as number)) {
        return '움직일 여지는 있지만, 범위를 넓히기보다 작은 실행으로 먼저 확인하는 편이 안전합니다.'
      }
      return '리스크 관리 비중이 더 커서 속도보다 손실 방지와 조건 점검이 우선입니다.'
    })()

    const closing = caution || action || reliability
    return [intro, balance, takeLeadLine(closing || '', 90)].filter(Boolean).join(' ')
  }

  const intro = phase
    ? defensive
      ? `The day sits in a ${phase} phase, but it is closer to review-led execution than a full stop.`
      : `The day leans toward ${phase}, which supports execution in ${focusDomain}.`
    : `${focusDomain} is in a ${gradeLabel.toLowerCase()} flow today, and narrowing the focus works better than expanding it.`
  const balance = (() => {
    if (!hasAttack || !hasDefense) return ''
    if (typeof balanceGap === 'number' && balanceGap <= 8) {
      return 'Attack and defense are close, so handling one or two priorities cleanly is better than pushing broadly.'
    }
    if ((attackPercent as number) > (defensePercent as number)) {
      return 'Expansion is slightly ahead, but smaller verified execution is safer than widening the scope.'
    }
    return 'Defensive pressure is stronger, so loss prevention and condition checks matter more than speed.'
  })()
  return [intro, balance, takeLeadLine(caution || action || reliability || '', 90)]
    .filter(Boolean)
    .join(' ')
}

export function softenDecisionTone(value: string, locale: 'ko' | 'en', lowReliability = false): string {
  const line = safeDisplayText(value)
  if (!line) return ''

  if (locale === 'ko') {
    let softened = line
      .replace(/1년에 몇 번 없는/gi, '드문 편인')
      .replace(/결혼 결정/gi, '관계 관련 대화')
      .replace(/프로포즈/gi, '중요한 감정 표현')
      .replace(/오늘로 잡으세요/gi, '우선 검토해 보세요')
      .replace(/지금 결정/gi, '재확인 후 결정')

    if (lowReliability) {
      softened = softened
        .replace(/최적/gi, '검토에 무난')
        .replace(/유리/gi, '무난')
        .replace(/적합/gi, '보수적 검토에 무난')
        .replace(/최고조/gi, '높은 편')
    }
    return softened
  }

  let softened = line.replace(/decide now/gi, 'confirm once more before deciding')

  if (lowReliability) {
    softened = softened
      .replace(/\boptimal\b/gi, 'reasonable for cautious review')
      .replace(/\bfavorable\b/gi, 'workable with cautious review')
      .replace(/\bideal\b/gi, 'reasonable')
  }
  return softened
}

export function toUserFacingEvidenceLine(
  value: string,
  source: 'saju' | 'astro' | 'bridge',
  locale: 'ko' | 'en'
): string {
  const normalized = normalizeEvidenceLine(value)
  if (!normalized) return ''

  const stripped = normalized
    .replace(/\(([AS]\d+)\)\s*/gi, '')
    .replace(/\b[AS]\d+\s*[↔\-]{1,2}\s*[AS]\d+\b[:：]?\s*/gi, '')
    .replace(/\b[AS]\d+\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const hasTechnicalPayload =
    /(pair=|angle=|orb=|allowed=|dayMaster=|geokguk=|yongsin=|sibsin=|daeun=|saeun=|profile=|matrix=|overlap=|orbFit=|set\s*\d+)/i.test(
      normalized
    )

  if (hasTechnicalPayload) {
    if (locale === 'ko') {
      if (source === 'saju') return '사주 흐름에서 말과 약속의 균형을 점검하면 안정적입니다.'
      if (source === 'astro')
        return '점성 흐름에서 감정 반응이 커질 수 있어 속도 조절이 유리합니다.'
      return '사주와 점성 신호를 함께 보면 방향은 비슷하지만 재확인이 중요합니다.'
    }
    if (source === 'saju') return 'Saju signals suggest checking communication and commitments.'
    if (source === 'astro') return 'Astrology signals suggest pacing emotional reactions.'
    return 'Saju and astrology are broadly aligned, but confirmation still helps.'
  }

  return stripped
}
