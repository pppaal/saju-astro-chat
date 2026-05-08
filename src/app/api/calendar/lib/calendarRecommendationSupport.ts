import type { TranslationData } from '@/types/calendar-api'
import { EVIDENCE_CONFIDENCE_THRESHOLDS } from '@/lib/counselor/calendar/scoring-config'

export const IRREVERSIBLE_RECOMMENDATION_KEYS = new Set([
  'majorDecision',
  'bigDecision',
  'wedding',
  'contract',
  'business',
  'reservation',
  'signature',
])

export const COMMUNICATION_WARNING_TOKENS = [
  'mercuryretrograde',
  'misunderstanding',
  'confusion',
  'voidofcourse',
  'communication',
  'conflict',
  'opposition',
]

const CONFLICT_LABEL_TOKENS = [
  'conflict',
  'mixed',
  'split',
  '\uCDA9\uB3CC',
  '\uD574\uC11D \uAC08\uB9BC',
  '\uAC08\uB9BC',
  '\uAE34\uC7A5+\uACBD\uACC4',
]

const CAUTION_WARNING_TOKENS = [
  ...COMMUNICATION_WARNING_TOKENS,
  'caution',
  'extremecaution',
  'recheck',
  '\uC7AC\uD655\uC778',
  '\uC624\uB958',
]

const HARD_GATE_WARNING_TOKENS = [
  ...COMMUNICATION_WARNING_TOKENS,
  'extremecaution',
  'danger',
  'accident',
  'injury',
  'surgery',
  'legal',
  'dispute',
  'eclipse',
]

const IRREVERSIBLE_RECOMMENDATION_PATTERNS = [
  /\b(sign(?:\s+now)?|finalize|confirm|book(?:ing)?|wedding|invitation|big decision|resign|launch|commit now)\b/i,
  /(contract|signature|reservation|final decision|major decision|big launch)/i,
  /(\uACC4\uC57D|\uC11C\uBA85|\uD655\uC815|\uC608\uC57D|\uACB0\uD63C\uC2DD|\uCCAD\uCCA9\uC7A5|\uC774\uC9C1\s*\uD655\uC815|\uCC3D\uC5C5\s*\uD655\uC815|\uB7F0\uCE6D|\uD070\s*\uACB0\uC815|\uC989\uC2DC\s*\uACB0\uC815)/i,
]

const VERIFICATION_TONE_PATTERNS = [
  /\uC11C\uBA85/g,
  /\uC608\uC57D/g,
  /\uD655\uC815/g,
  /\uACB0\uD63C\uC2DD/g,
  /\uCCAD\uCCA9\uC7A5/g,
  /\uACC4\uC57D/g,
  /\uD070\s*\uACB0\uC815/g,
  /\uC989\uC2DC\s*\uACB0\uC815/g,
  /\uC624\uB298\uB85C\s*\uC7A1\uC73C\uC138\uC694/g,
  /\uCD5C\uC6B0\uC120/g,
]

const RISKY_ACTION_RECOMMENDATION_PATTERNS = [
  /(\uC0AC\uC5C5\s*\uC2DC\uC791|\uC0AC\uC5C5\s*\uD655\uC7A5|\uD504\uB85C\uC81D\uD2B8|\uD30C\uD2B8\uB108\uC2ED|\uACE0\uBC31|\uD504\uB85C\uD3EC\uC988|\uBA74\uC811|\uC2B9\uC9C4|\uD22C\uC790|\uB9E4\uC218|\uC774\uC9C1|\uC774\uC0AC|\uC2DC\uC791|\uCD5C\uC801|\uD655\uC7A5|\uC2DC\uB108\uC9C0|\uD589\uC6B4)/i,
  /\b(start|launch|expand|proposal|promotion|interview|invest|buy|commit|book|wedding)\b/i,
]

const WARNING_TEXT_FALLBACK: Record<'ko' | 'en', Record<string, string>> = {
  ko: {
    surgery:
      '\uC2DC\uC220/\uC218\uC220 \uAD00\uB828 \uC77C\uC815\uC740 \uC7AC\uD655\uC778\uD558\uACE0 \uC2E0\uC911\uD788 \uC9C4\uD589\uD558\uC138\uC694.',
    dispute:
      '\uBD84\uC7C1 \uC18C\uC9C0\uAC00 \uC788\uC73C\uB2C8 \uD575\uC2EC \uC870\uAC74\uC740 \uBB38\uC11C\uB85C \uD655\uC778\uD558\uC138\uC694.',
    legalIssue:
      '\uBC95\uB960/\uC57D\uAD00 \uAD00\uB828 \uC0AC\uC548\uC740 \uC804\uBB38\uAC00 \uAC80\uD1A0 \uD6C4 \uD655\uC815\uD558\uC138\uC694.',
  },
  en: {
    surgery: 'Recheck procedures and medical timing before confirming.',
    dispute: 'Potential dispute risk. Confirm core terms in writing.',
    legalIssue: 'Legal/terms risk. Validate with expert review before committing.',
  },
}

const RECOMMENDATION_TEXT_FALLBACK: Record<'ko' | 'en', string> = {
  ko: '\uC624\uB298\uC740 \uD655\uC815\uBCF4\uB2E4 \uAC80\uD1A0\u00B7\uC7AC\uD655\uC778 \uC6B0\uC120\uC73C\uB85C \uC9C4\uD589\uD558\uC138\uC694.',
  en: 'Prioritize review and verification over final commitment today.',
}

export type RecommendationGateInput = {
  recommendations: string[]
  recommendationKeys?: string[]
  warningKeys?: string[]
  warnings?: string[]
  confidence?: number
  grade?: number
  title?: string
  summary?: string
  lang: 'ko' | 'en'
  forceGate?: boolean
  irreversibleKeyPresent?: boolean
}

function includesToken(value: string, tokens: string[]): boolean {
  const lower = value.toLowerCase()
  return tokens.some((token) => lower.includes(token.toLowerCase()))
}

function normalizeTextForDedupe(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[!?.~,;:()\[\]{}"'`]/g, '')
    .trim()
}

function dedupeTexts(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeTextForDedupe(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

function shouldGateRecommendationSet(input: RecommendationGateInput): boolean {
  if (input.forceGate) {
    return true
  }

  const confidence = input.confidence ?? 100
  const lowConfidence = confidence < EVIDENCE_CONFIDENCE_THRESHOLDS.low
  const warningKeyBlob = (input.warningKeys || []).join(' ')
  const warningTextBlob = (input.warnings || []).join(' ')
  const titleBlob = `${input.title || ''} ${input.summary || ''}`

  const hasCommunicationWarning =
    includesToken(warningKeyBlob, COMMUNICATION_WARNING_TOKENS) ||
    includesToken(warningTextBlob, CAUTION_WARNING_TOKENS)

  const hasConflictLabel =
    includesToken(titleBlob, CONFLICT_LABEL_TOKENS) ||
    includesToken(warningTextBlob, CONFLICT_LABEL_TOKENS)

  const hasCautionFlag =
    (typeof input.grade === 'number' && input.grade >= 3) ||
    includesToken(warningKeyBlob, HARD_GATE_WARNING_TOKENS)
  const lowConfidenceOnly =
    lowConfidence && !hasCommunicationWarning && !hasConflictLabel && !hasCautionFlag

  if (lowConfidenceOnly && (input.grade ?? 4) <= 1 && !input.irreversibleKeyPresent) {
    return false
  }

  return lowConfidence || hasCommunicationWarning || hasConflictLabel || hasCautionFlag
}

function softenRecommendationTone(value: string, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    let softened = value
    for (const pattern of VERIFICATION_TONE_PATTERNS) {
      softened = softened.replace(pattern, '\uAC80\uD1A0')
    }
    return softened
      .replace(/\uC9C0\uAE08\s*\uACB0\uC815/g, '\uC7AC\uD655\uC778 \uD6C4 \uACB0\uC815')
      .replace(
        /\uC644\uBCBD\uD55C\s*\uD0C0\uC774\uBC0D/g,
        '\uAC80\uD1A0 \uD6C4 \uC9C4\uD589\uD558\uAE30 \uC88B\uC740 \uD0C0\uC774\uBC0D'
      )
      .replace(/\uCD5C\uACE0\uC758 \uB0A0/g, '\uC720\uB9AC\uD55C \uD750\uB984')
      .trim()
  }

  return value
    .replace(/\b(sign now|finalize now|decide now|commit now)\b/gi, 'review and verify first')
    .replace(/\b(contract|signature|reservation|wedding|launch|book)\b/gi, 'review')
    .replace(/\btop priority\b/gi, 'review priority')
    .trim()
}

function isIrreversibleRecommendationText(value: string): boolean {
  return IRREVERSIBLE_RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(value))
}

function isVerificationTone(value: string): boolean {
  return /\uAC80\uD1A0|\uC7AC\uD655\uC778|24\uC2DC\uAC04|review|verify|recheck|draft|24 hours/i.test(
    value
  )
}

function isRiskyActionRecommendationText(value: string): boolean {
  return RISKY_ACTION_RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(value))
}

function isConservativeRecommendationTone(value: string): boolean {
  return /(\uAC80\uD1A0|\uC7AC\uD655\uC778|\uBCF4\uB958|\uC2E0\uC911|\uC815\uB9AC|\uC694\uC57D|\uCD08\uC548|24\uC2DC\uAC04|\uD734\uC2DD|\uBC84\uD37C|review|verify|recheck|draft|wait|pause|hold|rest|buffer)/i.test(
    value
  )
}

export function getTranslation(key: string, translations: TranslationData): string {
  const keys = key.split('.')
  let result: unknown = translations
  for (const part of keys) {
    result = (result as Record<string, unknown>)?.[part]
    if (result === undefined) {
      return key
    }
  }
  return typeof result === 'string' ? result : key
}

export function resolveWarningTranslation(
  warningKey: string,
  translations: TranslationData,
  lang: 'ko' | 'en'
): string {
  const path = `calendar.warnings.${warningKey}`
  const translated = getTranslation(path, translations)
  if (translated === path || translated.startsWith('calendar.')) {
    return WARNING_TEXT_FALLBACK[lang][warningKey] || WARNING_TEXT_FALLBACK[lang].dispute
  }
  return translated
}

export function resolveRecommendationTranslation(
  recommendationKey: string,
  translations: TranslationData,
  lang: 'ko' | 'en'
): string {
  const path = `calendar.recommendations.${recommendationKey}`
  const translated = getTranslation(path, translations)
  if (translated === path || translated.startsWith('calendar.')) {
    return RECOMMENDATION_TEXT_FALLBACK[lang]
  }
  return translated
}

export function gateRecommendations(input: RecommendationGateInput): string[] {
  const shouldGate = shouldGateRecommendationSet(input)
  const candidateLines =
    shouldGate && input.irreversibleKeyPresent ? [] : [...input.recommendations]

  if (!shouldGate) {
    return dedupeTexts(candidateLines).slice(0, 6)
  }

  const filtered = candidateLines
    .filter(
      (line) =>
        !isIrreversibleRecommendationText(line) &&
        !(isRiskyActionRecommendationText(line) && !isVerificationTone(line))
    )
    .map((line) => softenRecommendationTone(line, input.lang))
    .filter(Boolean)
  const conservativeFiltered = filtered.filter(
    (line) => isConservativeRecommendationTone(line) || isVerificationTone(line)
  )

  // Caution-day fallback. Earlier we used three corporate one-liners
  // ("\uAC80\uD1A0/\uC7AC\uD655\uC778 \uC6B0\uC120\u2026", "\uC870\uAC74 \uC815\uB9AC \uD6C4 \uC694\uC57D\u2026", "\uCD08\uC548\uB9CC \uB9CC\uB4E4\uACE0 24\uC2DC\uAC04\u2026")
  // which felt identical across every flagged day and had zero edge.
  // Pick from a wider, more direct pool so users actually see different
  // advice on different caution days. Per-day variety happens at the
  // recommendation-key layer; this is the safety net when keys get
  // filtered out by the gate.
  const koPool = [
    '\uD655\uC2E0 \uC5C6\uB294 \uCC44\uB85C \uC0AC\uC778\uD558\uC9C0 \uB9D0\uACE0, \uACB0\uC815 \uC804\uC5D0 \uAC19\uC740 \uC0AC\uB78C\uD55C\uD14C \uD55C \uBC88 \uB354 \uBB3C\uC5B4\uBCF4\uC138\uC694.',
    "\uC624\uB298\uC740 '\uD655\uC815'\uC774\uB77C\uB294 \uB2E8\uC5B4 \uB4E4\uC5B4\uAC04 \uC77C\uC740 \uB0B4\uC77C\uB85C \uBBF8\uB8E8\uC138\uC694.",
    '\uC9C0\uAE08 \uBCF4\uB0B4\uB824\uB294 \uBA54\uC2DC\uC9C0 \uD55C \uC904, \uB2E4\uB978 \uD1A4\uC73C\uB85C \uB2E4\uC2DC \uC368\uBCF4\uACE0 \uBCF4\uB0B4\uC138\uC694.',
    '\uC624\uB298 \uACB0\uC815\uD55C \uAC74 24\uC2DC\uAC04 \uC548\uC5D0 \uD55C \uBC88 \uB4A4\uC9D1\uC5B4\uBD10\uB3C4 \uC190\uD574 \uC5C6\uB294 \uAC15\uB3C4\uB85C\uB9CC \uAC00\uC138\uC694.',
    "\uD68C\uC758\u00B7\uD1B5\uD654 \uB05D\uB098\uAE30 \uC804\uC5D0 '\uB204\uAC00 \uBB50 \uD558\uAE30\uB85C \uD588\uB294\uC9C0' \uD55C \uC904 \uC801\uC5B4 \uACF5\uC720\uD558\uC138\uC694.",
    '\uD070 \uAE08\uC561\u00B7\uD070 \uC57D\uC18D\uC740 \uBA54\uBAA8\uB9CC \uB0A8\uAE30\uACE0, \uC2E4\uC81C \uC0AC\uC778\uC740 \uB2E4\uC74C \uC8FC\uB85C \uB118\uAE30\uC138\uC694.',
    "\uAC10\uC815\uC774 70% \uB118\uAC8C \uCC28\uC624\uB974\uBA74 \uC624\uB298\uC740 \uADF8 \uCC44\uB85C \uB2F5\uD558\uC9C0 \uB9D0\uACE0 '\uB0B4\uC77C \uB2F5\uD560\uAC8C\uC694'\uB85C \uB04A\uC5B4\uB0B4\uC138\uC694.",
    '\uC9C0\uAE08 \uBA38\uB9AC \uBCF5\uC7A1\uD558\uBA74 \uACB0\uB860 \uB0B4\uB9AC\uC9C0 \uB9D0\uACE0, 30\uBD84 \uC0B0\uCC45 \uD6C4 \uB2E4\uC2DC \uBCF4\uC138\uC694.',
  ]
  const enPool = [
    'Don\u2019t sign anything you\u2019re not 100% sure on \u2014 ask one trusted person first.',
    'Push anything labelled \u201Cfinal\u201D or \u201Ccontract\u201D to tomorrow.',
    'Rewrite your next message in a different tone before you hit send.',
    'Only commit to things you\u2019d be fine reversing within 24 hours.',
    'Before any meeting ends, write one line of \u201Cwho owns what\u201D and share it.',
    'Note big numbers and big promises today, sign them next week.',
    'When emotion crosses 70%, reply tomorrow \u2014 not now.',
    'If your head feels noisy, walk 30 min before any conclusion.',
  ]
  const fallback = input.lang === 'ko' ? koPool : enPool

  // If we kept filtered originals, they came from the user's own pool \u2014
  // surface those. Otherwise dip into the new fallback pool. Cap at 3 so
  // the panel doesn't dump an essay; the pool itself is varied so cards
  // on different days won't repeat each other.
  const merged = conservativeFiltered.length > 0 ? conservativeFiltered : fallback
  return dedupeTexts(merged).slice(0, 3)
}
