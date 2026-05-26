import type { TranslationData } from '@/types/calendar-api'
import { EVIDENCE_CONFIDENCE_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'

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
  /** Per-day seed (e.g. ISO date) — fallback pool 회전에 사용. 없으면 첫 3개. */
  dateSeed?: string
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
  // 24\uAC1C \uD589\uB3D9\uC9C0\uCE68 \u2014 \uACB0\uC815\u00B7\uC18C\uD1B5\u00B7\uB3C8\u00B7\uAD00\uACC4\u00B7\uD734\uC2DD\u00B7\uC810\uAC80 \uCE74\uD14C\uACE0\uB9AC \uACE8\uACE0\uB8E8.
  // seed shuffle\uB85C \uB9E4\uC77C 3\uAC1C sampled \u2192 2024\uAC1C (24 choose 3) \uC870\uD569 \uAC00\uB2A5.
  const koPool = [
    // \uACB0\uC815 \u00B7 \uAC80\uD1A0
    '\uD655\uC2E0 \uC5C6\uB294 \uCC44\uB85C \uC0AC\uC778\uD558\uC9C0 \uB9D0\uACE0, \uACB0\uC815 \uC804\uC5D0 \uAC19\uC740 \uC0AC\uB78C\uD55C\uD14C \uD55C \uBC88 \uB354 \uBB3C\uC5B4\uBCF4\uC138\uC694.',
    "\uC624\uB298\uC740 '\uD655\uC815'\uC774\uB77C\uB294 \uB2E8\uC5B4 \uB4E4\uC5B4\uAC04 \uC77C\uC740 \uB0B4\uC77C\uB85C \uBBF8\uB8E8\uC138\uC694.",
    '\uC624\uB298 \uACB0\uC815\uD55C \uAC74 24\uC2DC\uAC04 \uC548\uC5D0 \uD55C \uBC88 \uB4A4\uC9D1\uC5B4\uBD10\uB3C4 \uC190\uD574 \uC5C6\uB294 \uAC15\uB3C4\uB85C\uB9CC \uAC00\uC138\uC694.',
    '\uD070 \uAE08\uC561\u00B7\uD070 \uC57D\uC18D\uC740 \uBA54\uBAA8\uB9CC \uB0A8\uAE30\uACE0, \uC2E4\uC81C \uC0AC\uC778\uC740 \uB2E4\uC74C \uC8FC\uB85C \uB118\uAE30\uC138\uC694.',
    '\uACB0\uC815\uC744 90% \uAD73\uD614\uB2E4\uBA74 \uADF8 10%\uAC00 \uBCF4\uB0B4\uB294 \uC2E0\uD638\uB97C \uAF2D \uC801\uC5B4\uB450\uC138\uC694.',
    '\uC624\uB298 \uC548 \uC815\uD574\uB3C4 \uB418\uB294 \uAC74 \uAD73\uC774 \uC624\uB298 \uC815\uD558\uC9C0 \uB9C8\uC138\uC694.',
    // \uC18C\uD1B5 \u00B7 \uBA54\uC2DC\uC9C0
    '\uC9C0\uAE08 \uBCF4\uB0B4\uB824\uB294 \uBA54\uC2DC\uC9C0 \uD55C \uC904, \uB2E4\uB978 \uD1A4\uC73C\uB85C \uB2E4\uC2DC \uC368\uBCF4\uACE0 \uBCF4\uB0B4\uC138\uC694.',
    "\uD68C\uC758\u00B7\uD1B5\uD654 \uB05D\uB098\uAE30 \uC804\uC5D0 '\uB204\uAC00 \uBB50 \uD558\uAE30\uB85C \uD588\uB294\uC9C0' \uD55C \uC904 \uC801\uC5B4 \uACF5\uC720\uD558\uC138\uC694.",
    "\uAC10\uC815\uC774 70% \uB118\uAC8C \uCC28\uC624\uB974\uBA74 \uC624\uB298\uC740 \uADF8 \uCC44\uB85C \uB2F5\uD558\uC9C0 \uB9D0\uACE0 '\uB0B4\uC77C \uB2F5\uD560\uAC8C\uC694'\uB85C \uB04A\uC5B4\uB0B4\uC138\uC694.",
    '\uC608\uBBFC\uD55C \uB2F5\uC7A5\uC740 \uCD08\uC548\uB9CC \uC801\uC5B4\uB450\uACE0 \uC790\uACE0 \uC77C\uC5B4\uB098\uC11C \uB2E4\uC2DC \uBCF4\uB0B4\uC138\uC694.',
    '\uC624\uD574 \uC18C\uC9C0 \uC788\uB294 \uB2E8\uC5B4\uB294 \uD55C \uBC88 \uB354 \uD480\uC5B4\uC11C \uC4F0\uC138\uC694.',
    '\uB9D0\uAF2C\uB9AC \uC7A1\uACE0 \uC2F6\uC740 \uC21C\uAC04\uC774 \uC624\uBA74 \uD55C \uBC15\uC790 \uB2A6\uCDB0\uC11C \uB4E3\uAE30\uBD80\uD130 \uD558\uC138\uC694.',
    // \uB3C8 \u00B7 \uACC4\uC57D
    '\uC624\uB298 \uCDA9\uB3D9\uAD6C\uB9E4 \uC695\uAD6C\uAC00 \uC624\uBA74 \uC7A5\uBC14\uAD6C\uB2C8\uC5D0\uB9CC \uB2F4\uACE0 24\uC2DC\uAC04 \uD6C4 \uB2E4\uC2DC \uBCF4\uC138\uC694.',
    '\uD070 \uAE08\uC561 \uC774\uCCB4\uB294 \uC0AC\uB78C\u00B7\uACC4\uC88C\u00B7\uAE08\uC561 \uC138 \uBC88 \uD655\uC778\uD558\uACE0 \uB204\uB974\uC138\uC694.',
    '\uD22C\uC790 \uACB0\uC815\uC740 \uC624\uB298 \uD558\uC9C0 \uB9D0\uACE0, \uC790\uB8CC\uBD80\uD130 \uD55C \uBC88 \uB354 \uC815\uB9AC\uD558\uC138\uC694.',
    '\uACC4\uC57D\uC11C\uB294 \uB05D \uC904\uAE4C\uC9C0 \uC9C1\uC811 \uC77D\uACE0, \uBAA8\uB974\uB294 \uB2E8\uC5B4 \uD558\uB098\uB77C\uB3C4 \uC788\uC73C\uBA74 \uBA48\uCD94\uC138\uC694.',
    // \uD734\uC2DD \u00B7 \uCEE8\uB514\uC158
    '\uC9C0\uAE08 \uBA38\uB9AC \uBCF5\uC7A1\uD558\uBA74 \uACB0\uB860 \uB0B4\uB9AC\uC9C0 \uB9D0\uACE0, 30\uBD84 \uC0B0\uCC45 \uD6C4 \uB2E4\uC2DC \uBCF4\uC138\uC694.',
    '\uC624\uB298 \uC77C\uC815 \uD558\uB098\uB294 \uBE44\uC6CC\uB450\uACE0 \uCEE8\uB514\uC158 \uD68C\uBCF5\uC5D0 \uC4F0\uC138\uC694.',
    '\uC810\uC2EC\u00B7\uC800\uB141 \uC911 \uD55C \uB07C\uB294 \uCC9C\uCC9C\uD788 \uBA39\uB294 \uC2DC\uAC04\uC73C\uB85C \uD655\uBCF4\uD558\uC138\uC694.',
    '\uC7A0 \uBD80\uC871\uD558\uBA74 \uCE74\uD398\uC778 \uC758\uC874\uD558\uC9C0 \uB9D0\uACE0 20\uBD84 \uB0AE\uC7A0\uC73C\uB85C \uAC08\uC74C\uD558\uC138\uC694.',
    // \uAD00\uACC4 \u00B7 \uBAA8\uC784
    '\uC624\uB298\uC740 \uAC70\uC808\uC774 \uD544\uC694\uD55C \uC790\uB9AC\uC5D0\uC11C \uB9DD\uC124\uC774\uC9C0 \uB9D0\uACE0 \uC194\uC9C1\uD788 \uB9D0\uD558\uC138\uC694.',
    "\uC775\uC219\uD55C \uC0AC\uB78C\uACFC\uC758 \uC57D\uC18D\uC774\uB77C\uB3C4 '\uADF8\uB0E5 \uAC00\uB358 \uACF3' \uB9D0\uACE0 \uC0C8 \uC7A5\uC18C\uB85C \uC7A1\uC544\uBCF4\uC138\uC694.",
    "\uAD00\uACC4\uC5D0\uC11C \uC6B1\uD558\uB294 \uC21C\uAC04 \uC624\uBA74 '\uB0B4\uAC00 \uC9C0\uAE08 \uBB50\uAC00 \uC11C\uC6B4\uD55C\uC9C0' \uD55C \uC904 \uC801\uC5B4\uB450\uC138\uC694.",
    '\uC624\uB298\uC740 \uBD80\uD0C1\uBC1B\uC740 \uC77C \uD558\uB098 \uC815\uC911\uD788 \uAC70\uC808\uD574\uB3C4 \uC190\uD574 \uC5C6\uC2B5\uB2C8\uB2E4.',
  ]
  const enPool = [
    // Decision / review
    'Don\u2019t sign anything you\u2019re not 100% sure on \u2014 ask one trusted person first.',
    'Push anything labelled \u201Cfinal\u201D or \u201Ccontract\u201D to tomorrow.',
    'Only commit to things you\u2019d be fine reversing within 24 hours.',
    'For big money or big promises, take notes only \u2014 sign next week.',
    'If you\u2019re 90% set on a decision, write down what that last 10% is telling you.',
    'If a decision doesn\u2019t need to be made today, don\u2019t force it.',
    // Communication
    'Rewrite your next message in a different tone before you hit send.',
    'Before any meeting ends, write one line of \u201Cwho owns what\u201D and share it.',
    'When emotion crosses 70%, reply tomorrow \u2014 not now.',
    'Draft a sensitive reply tonight, send it after sleeping on it.',
    'Reword anything that could be misread \u2014 leave less room for inference.',
    'When you want to nitpick someone\u2019s wording, slow down and listen first.',
    // Money / contracts
    'When a buying urge hits, add to cart and revisit in 24 hours.',
    'Triple-check name, account, and amount before any big transfer.',
    'Don\u2019t decide investments today \u2014 sit with the data one more pass.',
    'Read contracts to the last line; stop if a single term is unclear.',
    // Rest / energy
    'If your head feels noisy, walk 30 min before any conclusion.',
    'Block one calendar slot today purely for recovery.',
    'Make one meal a slow meal today \u2014 lunch or dinner, your choice.',
    'Skip the extra caffeine; a 20-minute nap fixes more.',
    // Relationships
    'When a no is needed, say it plainly \u2014 don\u2019t hedge.',
    'For routine plans with a familiar person, pick a brand-new venue.',
    'When you snap in a relationship, jot down what specifically hurt before replying.',
    'You can decline one favor today without any real cost.',
  ]
  const fallback = input.lang === 'ko' ? koPool : enPool

  // If we kept filtered originals, they came from the user's own pool \u2014
  // surface those. Otherwise dip into the new fallback pool. Cap at 3.
  // dateSeed\uac00 \uc788\uc73c\uba74 pool\uc744 \uadf8 hash\ub85c rotate\ud574\uc11c \ub9e4\uc77c \ub2e4\ub978 3\uac1c\uac00 picked.
  // (\uc774\uc804\uc5d4 \ud56d\uc0c1 \uccab 3\uac1c\ub77c \ubaa8\ub4e0 caution day\uac00 \uac19\uc740 \uc548\ub0b4 \u2192 \uc0ac\uc6a9\uc790 \ud53c\ub4dc\ubc31 \ubc18\uc601.)
  // dateSeed 기반 deterministic Fisher-Yates 셔플 후 첫 3개 pick.
  // 24개 pool에서 3개 sampled → 매일 다른 조합. 같은 날은 항상 같은 결과.
  const merged = conservativeFiltered.length > 0 ? conservativeFiltered : fallback
  if (input.dateSeed && merged.length > 3) {
    return dedupeTexts(seededShuffle(merged, input.dateSeed)).slice(0, 3)
  }
  return dedupeTexts(merged).slice(0, 3)
}

/** mulberry32 PRNG — seed 정수 → 0~1 사이 deterministic 시퀀스. */
function mulberry32(seedInt: number): () => number {
  let s = seedInt >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates with seeded PRNG — deterministic shuffle. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) | 0
  }
  const rand = mulberry32(hash)
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
