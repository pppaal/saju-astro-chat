import { logger } from '@/lib/logger'
import { callAIBackendGeneric } from './aiBackend'
import type { ReportEvidenceRef, SectionEvidenceRefs } from './evidenceRefs'
import type { AIUserPlan } from './reportTypes'
import type { DeterministicSectionBlock } from './deterministicCore'

type ReportLang = 'ko' | 'en'

const HIGH_RISK_WEEKDAY_TOKENS = [
  'ì›”ìš”ì¼',
  'í™”ìš”ì¼',
  'ìˆ˜ìš”ì¼',
  'ëª©ìš”ì¼',
  'ê¸ˆìš”ì¼',
  'í† ìš”ì¼',
  'ì¼ìš”ì¼',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const HIGH_RISK_PLANET_TOKENS = [
  'íƒœì–‘',
  'ë‹¬',
  'ìˆ˜ì„±',
  'ê¸ˆì„±',
  'í™”ì„±',
  'ëª©ì„±',
  'í† ì„±',
  'ì²œì™•ì„±',
  'í•´ì™•ì„±',
  'ëª…ì™•ì„±',
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
]

const HIGH_RISK_ASPECT_TOKENS = [
  'í•©',
  'ì¶©',
  'í˜•',
  'íŒŒ',
  'í•´',
  'conjunction',
  'opposition',
  'square',
  'trine',
  'sextile',
]

const HIGH_RISK_TRANSIT_TOKENS = [
  'íŠ¸ëžœì§“',
  'ì§„í–‰',
  'ì—­í–‰',
  'íšŒê·€',
  'transit',
  'retrograde',
  'return',
  'progression',
]

const HIGH_RISK_TOKEN_ALIASES: Record<string, string[]> = {
  mercury: ['ìˆ˜ì„±'],
  venus: ['ê¸ˆì„±'],
  mars: ['í™”ì„±'],
  jupiter: ['ëª©ì„±'],
  saturn: ['í† ì„±'],
  uranus: ['ì²œì™•ì„±'],
  neptune: ['í•´ì™•ì„±'],
  pluto: ['ëª…ì™•ì„±'],
  conjunction: ['í•©'],
  opposition: ['ì¶©'],
  square: ['í˜•'],
  trine: ['ì‚¼í•©'],
  sextile: ['ìœ¡í•©'],
  transit: ['íŠ¸ëžœì§“'],
  retrograde: ['ì—­í–‰'],
}

const REWRITE_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'to',
  'of',
  'in',
  'on',
  'is',
  'are',
  'as',
  'at',
  'be',
  'it',
  'or',
  'an',
  'a',
  'ë°',
  'ê·¸ë¦¬ê³ ',
  'í•˜ì§€ë§Œ',
  'ë˜í•œ',
  'ì—ì„œ',
  'ìœ¼ë¡œ',
  'ë¥¼',
  'ì„',
  'ì´',
  'ê°€',
  'ì€',
  'ëŠ”',
  'ì—',
  'ì˜',
  'ê³¼',
  'ì™€',
  'ë„',
  'ë¡œ',
  'ìœ¼ë¡œ',
])

const ALLOWED_LONG_REWRITE_TOKENS = new Set([
  'relationshipdynamics',
  'wealthpotential',
  'healthguidance',
  'personalitydeep',
  'actionplan',
  'timingadvice',
  'deterministic',
  'crossevidence',
])

function compactToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim()
}

function tokenizeEvidenceText(value?: string): string[] {
  if (!value) return []
  return value
    .split(/[\s,./;:(){}\[\]<>|+\-_=!?'"`~]+/)
    .map((token) => compactToken(token))
    .filter((token) => token.length > 0)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getPathText(sections: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cursor: unknown = sections
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return ''
    cursor = (cursor as Record<string, unknown>)[part]
  }
  return typeof cursor === 'string' ? cursor : ''
}

export function getPathValue(sections: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let cursor: unknown = sections
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[part]
  }
  return cursor
}

export function hasRequiredSectionPaths(payload: unknown, paths: string[]): boolean {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as Record<string, unknown>
  return paths.every((path) => getPathText(record, path).trim().length > 0)
}

export function setPathText(sections: Record<string, unknown>, path: string, value: string): void {
  const parts = path.split('.')
  let cursor: Record<string, unknown> = sections
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    const current = cursor[part]
    if (!current || typeof current !== 'object') {
      cursor[part] = {}
    }
    cursor = cursor[part] as Record<string, unknown>
  }
  cursor[parts[parts.length - 1]] = value
}

function hasEvidenceSupport(text: string, refs: ReportEvidenceRef[]): boolean {
  if (!text || refs.length === 0) return true
  const lowered = text.toLowerCase()
  for (const ref of refs) {
    const tokens = [
      ...tokenizeEvidenceText(ref.keyword),
      ...tokenizeEvidenceText(ref.rowKey),
      ...tokenizeEvidenceText(ref.colKey),
      ...tokenizeEvidenceText(ref.sajuBasis),
      ...tokenizeEvidenceText(ref.astroBasis),
    ].slice(0, 12)
    for (const token of tokens) {
      if (!token || token.length < 2) continue
      if (lowered.includes(token)) return true
    }
  }
  return false
}

function buildAllowedHighRiskTokenSet(evidenceRefs: SectionEvidenceRefs): Set<string> {
  const allowed = new Set<string>()
  for (const refs of Object.values(evidenceRefs)) {
    for (const ref of refs || []) {
      for (const token of [
        ...tokenizeEvidenceText(ref.id),
        ...tokenizeEvidenceText(ref.rowKey),
        ...tokenizeEvidenceText(ref.colKey),
        ...tokenizeEvidenceText(ref.keyword),
        ...tokenizeEvidenceText(ref.sajuBasis),
        ...tokenizeEvidenceText(ref.astroBasis),
      ]) {
        allowed.add(token)
        const aliases = HIGH_RISK_TOKEN_ALIASES[token]
        if (aliases) {
          for (const alias of aliases) {
            allowed.add(compactToken(alias))
          }
        }
      }
    }
  }
  return allowed
}

function findUnsupportedHighRiskTokens(text: string, allowed: Set<string>): string[] {
  const found = new Set<string>()
  const lowered = text.toLowerCase()
  const allRiskTokens = [
    ...HIGH_RISK_WEEKDAY_TOKENS,
    ...HIGH_RISK_PLANET_TOKENS,
    ...HIGH_RISK_ASPECT_TOKENS,
    ...HIGH_RISK_TRANSIT_TOKENS,
  ]
  for (const token of allRiskTokens) {
    const hasToken = /[a-z]/i.test(token)
      ? lowered.includes(token.toLowerCase())
      : text.includes(token)
    if (!hasToken) continue
    const compact = compactToken(token)
    if (!compact || compact.length < 2) continue
    if (!allowed.has(compact)) {
      found.add(token)
    }
  }
  return [...found]
}

function hasAnyHighRiskToken(text: string): boolean {
  if (!text) return false
  const lowered = text.toLowerCase()
  const allRiskTokens = [
    ...HIGH_RISK_WEEKDAY_TOKENS,
    ...HIGH_RISK_PLANET_TOKENS,
    ...HIGH_RISK_ASPECT_TOKENS,
    ...HIGH_RISK_TRANSIT_TOKENS,
  ]
  return allRiskTokens.some((token) => {
    if (/[a-z]/i.test(token)) return lowered.includes(token.toLowerCase())
    return text.includes(token)
  })
}

export interface EvidenceBindingViolation {
  path: string
  missingBinding: boolean
  unsupportedTokens: string[]
}

export function validateEvidenceBinding(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs
): { needsRepair: boolean; violations: EvidenceBindingViolation[] } {
  const allowedHighRisk = buildAllowedHighRiskTokenSet(evidenceRefs)
  const violations: EvidenceBindingViolation[] = []
  for (const path of sectionPaths) {
    const text = getPathText(sections, path)
    if (!text) continue
    const refs = evidenceRefs[path] || []
    const missingBinding =
      refs.length > 0 && hasAnyHighRiskToken(text) && !hasEvidenceSupport(text, refs)
    const unsupportedTokens = findUnsupportedHighRiskTokens(text, allowedHighRisk)
    if (missingBinding || unsupportedTokens.length > 0) {
      violations.push({ path, missingBinding, unsupportedTokens })
    }
  }
  return { needsRepair: violations.length > 0, violations }
}

export function buildEvidenceBindingRepairPrompt(
  lang: ReportLang,
  sections: Record<string, unknown>,
  evidenceRefs: SectionEvidenceRefs,
  violations: EvidenceBindingViolation[]
): string {
  const violationLines = violations.map((violation) => {
    const refs = (evidenceRefs[violation.path] || []).map((ref) => ref.id).join(', ')
    const unsupported = violation.unsupportedTokens.join(', ')
    return `- ${violation.path}: missingBinding=${violation.missingBinding ? 'yes' : 'no'}, unsupported=[${unsupported || 'none'}], allowedEvidence=[${refs || 'none'}]`
  })

  if (lang === 'ko') {
    return [
      'ì¤‘ìš”: ì•„ëž˜ sections JSONì„ ê·¼ê±° ê³ ì • ê·œì¹™ì— ë§žê²Œ ë¦¬íŽ˜ì–´í•˜ì„¸ìš”.',
      'ê·œì¹™:',
      '- violationì— í‘œì‹œëœ pathë§Œ ìˆ˜ì •í•˜ê³  ë‚˜ë¨¸ì§€ pathëŠ” ìœ ì§€í•©ë‹ˆë‹¤.',
      '- evidenceRefsì— ì—†ëŠ” ê³ ìœ„í—˜ í† í°(ìš”ì¼/í–‰ì„±/ê°/íŠ¸ëžœì§“)ì€ ì œê±°í•©ë‹ˆë‹¤.',
      '- ê° ìˆ˜ì • pathì—ëŠ” allowedEvidence ê¸°ì¤€ì˜ ê·¼ê±° í‚¤ì›Œë“œë¥¼ ìµœì†Œ 1ê°œ ì´ìƒ ë°˜ì˜í•©ë‹ˆë‹¤.',
      '- JSON êµ¬ì¡°ì™€ í‚¤ëŠ” ì ˆëŒ€ ë³€ê²½í•˜ì§€ ì•ŠìŠµë‹ˆë‹¤.',
      '- JSONë§Œ ë°˜í™˜í•©ë‹ˆë‹¤.',
      'violations:',
      ...violationLines,
      'evidenceRefs:',
      JSON.stringify(evidenceRefs, null, 2),
      'sections:',
      JSON.stringify(sections, null, 2),
    ].join('\n')
  }
  return [
    'IMPORTANT: Repair the sections JSON below to satisfy evidence-binding rules.',
    'Rules:',
    '- Modify only violating paths and keep all other paths unchanged.',
    '- Remove unsupported high-risk tokens (weekday/planet/aspect/transit) not in evidenceRefs.',
    '- Each modified path must include at least one keyword grounded by allowedEvidence refs.',
    '- Keep JSON structure and keys exactly intact.',
    '- Return JSON only.',
    'violations:',
    ...violationLines,
    'evidenceRefs:',
    JSON.stringify(evidenceRefs, null, 2),
    'sections:',
    JSON.stringify(sections, null, 2),
  ].join('\n')
}

export function enforceEvidenceBindingFallback(
  sections: Record<string, unknown>,
  violations: EvidenceBindingViolation[],
  evidenceRefs: SectionEvidenceRefs,
  lang: ReportLang
): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(sections)) as Record<string, unknown>
  for (const violation of violations) {
    const current = getPathText(next, violation.path)
    if (!current) continue
    let cleaned = current
    for (const token of violation.unsupportedTokens) {
      const compact = compactToken(token)
      if (!compact || compact.length < 2) continue
      const pattern = new RegExp(escapeRegExp(token), /[a-z]/i.test(token) ? 'gi' : 'g')
      cleaned = cleaned
        .replace(pattern, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }
    // Avoid injecting synthetic grounding sentences that degrade tone.
    // Missing-binding is handled by rewrite prompt constraints and deterministic draft content.
    void evidenceRefs
    void lang
    setPathText(next, violation.path, cleaned)
  }
  return next
}

function tokenizeRewrite(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:_+-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !REWRITE_STOP_WORDS.has(token))
}

function buildAllowedRewriteTokenSet(
  draftSections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs
): Set<string> {
  const allowed = buildAllowedHighRiskTokenSet(evidenceRefs)
  for (const path of sectionPaths) {
    const text = getPathText(draftSections, path)
    for (const token of tokenizeRewrite(text)) {
      allowed.add(token)
    }
    const refs = evidenceRefs[path] || []
    for (const ref of refs) {
      for (const token of [
        ...tokenizeRewrite(ref.id || ''),
        ...tokenizeRewrite(ref.rowKey || ''),
        ...tokenizeRewrite(ref.colKey || ''),
        ...tokenizeRewrite(ref.keyword || ''),
        ...tokenizeRewrite(ref.sajuBasis || ''),
        ...tokenizeRewrite(ref.astroBasis || ''),
      ]) {
        allowed.add(token)
      }
    }
  }
  return allowed
}

function buildMustKeepTokensByPath(params: {
  draftSections: Record<string, unknown>
  blocksBySection?: Record<string, DeterministicSectionBlock[]>
}): Map<string, string[]> {
  const out = new Map<string, string[]>()
  if (!params.blocksBySection) return out
  for (const [path, blocks] of Object.entries(params.blocksBySection)) {
    const draftText = getPathText(params.draftSections, path).toLowerCase()
    const tokens = unique(
      (blocks || [])
        .flatMap((block) => block.mustKeepTokens || [])
        .map((token) => (token || '').trim())
        .filter((token) => token.length >= 2)
        .filter((token) => (draftText ? draftText.includes(token.toLowerCase()) : true))
    )
    if (tokens.length > 0) out.set(path, tokens)
  }
  return out
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function validateRewriteOnlyOutput(
  draftSections: Record<string, unknown>,
  rewrittenSections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs,
  mustKeepTokensByPath: Map<string, string[]>
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = []
  const allowedTokens = buildAllowedRewriteTokenSet(draftSections, sectionPaths, evidenceRefs)
  const evidenceCheck = validateEvidenceBinding(rewrittenSections, sectionPaths, evidenceRefs)
  if (evidenceCheck.needsRepair) {
    reasons.push(
      ...evidenceCheck.violations.map(
        (violation) =>
          `evidence-mismatch:${violation.path}:missing=${violation.missingBinding}:unsupported=${violation.unsupportedTokens.join('|')}`
      )
    )
  }

  for (const path of sectionPaths) {
    const draftText = getPathText(draftSections, path)
    const rewrittenText = getPathText(rewrittenSections, path)
    if (!draftText || !rewrittenText) continue
    const draftSet = new Set(tokenizeRewrite(draftText))
    const rewrittenSet = new Set(tokenizeRewrite(rewrittenText))
    const rewrittenTokens = [...rewrittenSet]
    const newTokens = rewrittenTokens.filter((token) => !allowedTokens.has(token))

    const suspiciousNovel = newTokens.filter(
      (token) => /^[a-z][a-z0-9_-]{12,}$/i.test(token) && !ALLOWED_LONG_REWRITE_TOKENS.has(token)
    )
    if (suspiciousNovel.length > 0) {
      reasons.push(`suspicious-token:${path}:${suspiciousNovel.slice(0, 8).join(',')}`)
    }

    const overlapCount = rewrittenTokens.filter(
      (token) => draftSet.has(token) || allowedTokens.has(token)
    ).length
    const overlapRatio = overlapCount / Math.max(1, rewrittenTokens.length)
    const noveltyRatio = newTokens.length / Math.max(1, rewrittenTokens.length)
    if (rewrittenTokens.length >= 20 && overlapRatio < 0.18 && noveltyRatio > 0.55) {
      reasons.push(
        `rewrite-drift:${path}:overlap=${overlapRatio.toFixed(2)}:novelty=${noveltyRatio.toFixed(2)}`
      )
    }

    const mustKeepTokens = mustKeepTokensByPath.get(path) || []
    if (mustKeepTokens.length > 0) {
      const loweredRewritten = rewrittenText.toLowerCase()
      const missing = mustKeepTokens.filter(
        (token) => !loweredRewritten.includes(token.toLowerCase())
      )
      if (missing.length > 0) {
        reasons.push(`must-keep-missing:${path}:${missing.slice(0, 6).join(',')}`)
      }
    }
  }
  return { pass: reasons.length === 0, reasons }
}

function buildRewriteOnlyPrompt(
  lang: ReportLang,
  draftSections: Record<string, unknown>,
  evidenceRefs: SectionEvidenceRefs,
  sectionPaths: string[],
  minCharsPerSection: number,
  blocksBySection?: Record<string, DeterministicSectionBlock[]>
): string {
  const payload = JSON.stringify(draftSections, null, 2)
  const refs = JSON.stringify(evidenceRefs, null, 2)
  const blocks = JSON.stringify(blocksBySection || {}, null, 2)
  if (lang === 'ko') {
    return [
      'You are a rewrite-only Korean editor.',
      'Polish tone and readability only. Keep meaning and facts exactly the same.',
      'Hard rules:',
      '- No new facts, no new interpretations, no new entities, no new dates',
      '- Keep all named entities exactly as in draft/evidence',
      '- Do not add weekday/transit/planet/aspect beyond evidenceRefs',
      '- Preserve blocksBySection.mustKeepTokens exactly',
      '- Keep section keys and structure unchanged',
      '- Keep minimum section length',
      '- Avoid repetitive sentence templates and repetitive endings',
      '- Avoid bureaucratic wording: 영역, 구간, 프로토콜, 운영, 핵심은',
      '- Use natural, vivid Korean prose with varied rhythm',
      '- Include practical micro-context without adding facts',
      `- minimum length: ${minCharsPerSection} chars`,
      `- target sections: ${sectionPaths.join(', ')}`,
      'evidenceRefs:',
      refs,
      'blocksBySection:',
      blocks,
      'draft:',
      payload,
      'Return JSON only',
    ].join('\n')
  }
  return [
    'You are a rewrite-only editor.',
    'Polish prose only. Keep meaning and facts exactly the same.',
    'Hard rules:',
    '- No new facts, no new interpretation, no new concepts',
    '- Keep proper entities exactly as in draft',
    '- Do not add entities/weekday/transit/planet/aspect beyond evidenceRefs',
    '- Preserve blocksBySection.mustKeepTokens exactly',
    '- Keep section keys and structure unchanged',
    `- Keep minimum ${minCharsPerSection} chars per section`,
    '- Avoid repetitive sentence templates and bureaucratic tone',
    '- Add practical context wording without adding facts',
    `- Target sections: ${sectionPaths.join(', ')}`,
    'evidenceRefs:',
    refs,
    'blocksBySection:',
    blocks,
    'draft:',
    payload,
    'Return JSON only',
  ].join('\n')
}

function buildSectionLengthPad(path: string, lang: ReportLang): string {
  const key = path.toLowerCase()
  if (lang === 'ko') {
    if (key.includes('career') || key.includes('strategy')) {
      return 'í•µì‹¬ì€ ë²”ìœ„ë¥¼ ì¢í˜€ ì™„ë£Œìœ¨ì„ ì˜¬ë¦¬ê³ , ì—­í• Â·ê¸°í•œÂ·ì±…ìž„ì„ ë¨¼ì € ë§žì¶˜ ë’¤ í™•ì •í•˜ëŠ” ìš´ì˜ìž…ë‹ˆë‹¤.'
    }
    if (key.includes('relationship') || key.includes('love') || key.includes('communication')) {
      return 'ê´€ê³„ëŠ” ê²°ë¡ ì˜ ì†ë„ë³´ë‹¤ í•´ì„ì˜ ì¼ì¹˜ê°€ ì¤‘ìš”í•˜ë¯€ë¡œ, ìš”ì•½ í™•ì¸ì„ ë¨¼ì € í•˜ê³  í•©ì˜ë¥¼ ë‹¨ê³„ì ìœ¼ë¡œ ì§„í–‰í•˜ì„¸ìš”.'
    }
    if (key.includes('wealth') || key.includes('money') || key.includes('risk')) {
      return 'ìž¬ì •ì€ ìˆ˜ìµ ê¸°ëŒ€ë³´ë‹¤ ì†ì‹¤ í†µì œê°€ ìš°ì„ ì´ë©°, ê¸ˆì•¡Â·ê¸°í•œÂ·ì·¨ì†Œ ì¡°ê±´ì„ ë¶„ë¦¬ ì ê²€í•œ ë’¤ í™•ì •í•˜ëŠ” íŽ¸ì´ ì•ˆì „í•©ë‹ˆë‹¤.'
    }
    if (key.includes('health') || key.includes('energy') || key.includes('recovery')) {
      return 'ê±´ê°• ë¦¬ë“¬ì€ ê³¼ì†ë³´ë‹¤ íšŒë³µ ë£¨í‹´ì´ ì„±ê³¼ë¥¼ ì§€í‚¤ë¯€ë¡œ ìˆ˜ë©´Â·ìˆ˜ë¶„Â·íœ´ì‹ ë¸”ë¡ì„ ë¨¼ì € ê³ ì •í•´ í”¼ë¡œ ëˆ„ì ì„ ë§‰ìœ¼ì„¸ìš”.'
    }
    if (key.includes('timing') || key.includes('overview') || key.includes('caution')) {
      return 'íƒ€ì´ë°ì€ ì°©ìˆ˜ì™€ í™•ì •ì„ ë¶„ë¦¬í•´ ìš´ì˜í• ìˆ˜ë¡ ì•ˆì •ì„±ì´ ë†’ìœ¼ë©°, ë‹¹ì¼ í™•ì •ë³´ë‹¤ ìž¬í™•ì¸ ë‹¨ê³„ë¥¼ ë‘¬ì•¼ ë³€ë™ì„±ì´ ì¤„ì–´ë“­ë‹ˆë‹¤.'
    }
    if (key.includes('actionplan') || key.includes('action')) {
      return 'ì‹¤í–‰ì€ ì™„ë£Œ 1ê±´Â·ë³´ë¥˜ 1ê±´Â·ìž¬í™•ì¸ 1ê±´ì˜ ë£¨í”„ë¡œ ë‹¨ìˆœí™”í•˜ë©´ ì‹¤ì œ í–‰ë™ ì „í™˜ì´ ë¹¨ë¼ì§€ê³  ëˆ„ë½ì´ ì¤„ì–´ë“­ë‹ˆë‹¤.'
    }
    return 'ì˜¤ëŠ˜ì€ ì†ë„ë³´ë‹¤ ìˆœì„œë¥¼ ì§€í‚¤ëŠ” ìš´ì˜ì´ ìœ ë¦¬í•˜ë©°, ì¤‘ìš”í•œ í•­ëª©ì€ ìž¬í™•ì¸ ë‹¨ê³„ë¥¼ ê±°ì³ í™•ì •í•´ì•¼ ì•ˆì •ì ìž…ë‹ˆë‹¤.'
  }
  if (key.includes('career') || key.includes('strategy')) {
    return 'Narrow scope to raise completion rate, and lock role, deadline, and ownership before commitment.'
  }
  if (key.includes('relationship') || key.includes('love') || key.includes('communication')) {
    return 'In relationships, alignment quality matters more than speed, so confirm interpretation before agreement.'
  }
  if (key.includes('wealth') || key.includes('money') || key.includes('risk')) {
    return 'For finances, downside control comes first; separate amount, deadline, and cancellation checks before commitment.'
  }
  if (key.includes('health') || key.includes('energy') || key.includes('recovery')) {
    return 'Recovery-first scheduling protects output quality better than overspeed in this phase.'
  }
  if (key.includes('timing') || key.includes('overview') || key.includes('caution')) {
    return 'Stability improves when start and commit are separated and recheck gates are kept before final decisions.'
  }
  if (key.includes('actionplan') || key.includes('action')) {
    return 'A simple loop of one completion, one defer, and one recheck reduces omission and improves execution.'
  }
  return 'Prioritize sequence over speed and keep a recheck step before final commitment.'
}

function enforceDraftLengthFloor(
  candidateSections: Record<string, unknown>,
  draftSections: Record<string, unknown>,
  sectionPaths: string[],
  minCharsPerSection: number,
  lang: ReportLang
): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(candidateSections)) as Record<string, unknown>
  for (const path of sectionPaths) {
    const candidateRaw = getPathValue(next, path)
    const draftRaw = getPathValue(draftSections, path)
    if (typeof candidateRaw !== 'string' || typeof draftRaw !== 'string') continue
    const candidateText = candidateRaw
    const draftText = draftRaw
    if (!candidateText || !draftText) continue

    const ratioFloor = Math.floor(draftText.length * 0.82)
    const staticFloor = Math.max(140, Math.min(minCharsPerSection, draftText.length))
    const floor = Math.max(ratioFloor, staticFloor)
    if (draftText.length >= 180 && candidateText.length < floor) {
      setPathText(next, path, draftText)
      continue
    }

    const hardFloor = Math.max(180, Math.min(minCharsPerSection, 260))
    if (candidateText.length < hardFloor) {
      // Avoid injecting synthetic pad text; keep deterministic draft for stability and encoding safety.
      setPathText(next, path, draftText)
    }
  }
  return next
}

export async function rewriteSectionsWithFallback<T extends object>(args: {
  lang: ReportLang
  userPlan?: AIUserPlan
  draftSections: T
  evidenceRefs: SectionEvidenceRefs
  blocksBySection?: Record<string, DeterministicSectionBlock[]>
  sectionPaths: string[]
  requiredPaths: string[]
  minCharsPerSection: number
}): Promise<{ sections: T; modelUsed: string; tokensUsed: number }> {
  const {
    lang,
    userPlan,
    draftSections,
    evidenceRefs,
    blocksBySection,
    sectionPaths,
    requiredPaths,
    minCharsPerSection,
  } = args
  const mustKeepTokensByPath = buildMustKeepTokensByPath({
    draftSections: draftSections as unknown as Record<string, unknown>,
    blocksBySection,
  })
  const prompt = buildRewriteOnlyPrompt(
    lang,
    draftSections as unknown as Record<string, unknown>,
    evidenceRefs,
    sectionPaths,
    minCharsPerSection,
    blocksBySection
  )
  try {
    const rewritten = await callAIBackendGeneric<T>(prompt, lang, {
      userPlan,
      modelOverride: 'gpt-4o-mini',
    })
    const candidate = rewritten.sections as unknown
    if (!hasRequiredSectionPaths(candidate, requiredPaths)) {
      return {
        sections: draftSections,
        modelUsed: 'rewrite-fallback-required-paths',
        tokensUsed: 0,
      }
    }
    const candidateSections = candidate as Record<string, unknown>
    const check = validateRewriteOnlyOutput(
      draftSections as unknown as Record<string, unknown>,
      candidateSections,
      sectionPaths,
      evidenceRefs,
      mustKeepTokensByPath
    )
    if (!check.pass) {
      const evidenceCheck = validateEvidenceBinding(candidateSections, sectionPaths, evidenceRefs)
      if (evidenceCheck.needsRepair) {
        const repaired = enforceEvidenceBindingFallback(
          candidateSections,
          evidenceCheck.violations,
          evidenceRefs,
          lang
        )
        const repairedCheck = validateRewriteOnlyOutput(
          draftSections as unknown as Record<string, unknown>,
          repaired,
          sectionPaths,
          evidenceRefs,
          mustKeepTokensByPath
        )
        if (repairedCheck.pass) {
          const floored = enforceDraftLengthFloor(
            repaired,
            draftSections as unknown as Record<string, unknown>,
            sectionPaths,
            minCharsPerSection,
            lang
          )
          return {
            sections: floored as unknown as T,
            modelUsed: `${rewritten.model || 'gpt-4o-mini'}-validator-repair`,
            tokensUsed: rewritten.tokensUsed || 0,
          }
        }
      }
      logger.warn('[AI Report] Rewrite-only validator failed; fallback to draft', {
        reasons: check.reasons.slice(0, 6),
      })
      return { sections: draftSections, modelUsed: 'rewrite-fallback-validator', tokensUsed: 0 }
    }
    const floored = enforceDraftLengthFloor(
      candidateSections,
      draftSections as unknown as Record<string, unknown>,
      sectionPaths,
      minCharsPerSection,
      lang
    )
    return {
      sections: floored as unknown as T,
      modelUsed: rewritten.model || 'gpt-4o-mini',
      tokensUsed: rewritten.tokensUsed || 0,
    }
  } catch (error) {
    logger.warn('[AI Report] Rewrite-only call failed; using deterministic draft', {
      error: error instanceof Error ? error.message : String(error),
    })
    return { sections: draftSections, modelUsed: 'rewrite-fallback-error', tokensUsed: 0 }
  }
}
