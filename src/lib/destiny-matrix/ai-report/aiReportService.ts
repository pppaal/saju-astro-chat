// src/lib/destiny-matrix/ai-report/aiReportService.ts
// Destiny Fusion Matrixâ„¢ - AI Premium Report Generator
// ìœ ë£Œ ê¸°ëŠ¥: AI ê¸°ë°˜ ìƒì„¸ ë‚´ëŸ¬í‹°ë¸Œ ë¦¬í¬íŠ¸ ìƒì„±

'use server'

import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput } from '../types'
import type {
  ReportPeriod,
  ReportTheme,
  TimingData,
  TimingAIPremiumReport,
  ThemedAIPremiumReport,
  TimingReportSections,
  ThemedReportSections,
} from './types'
import { THEME_META } from './types'
import { logger } from '@/lib/logger'
import { buildTimingPrompt } from './prompts/timingPrompts'
import { buildThemedPrompt } from './prompts/themedPrompts'
import { buildGraphRAGEvidence, formatGraphRAGEvidenceForPrompt } from './graphRagEvidence'
import { renderSectionsAsMarkdown, renderSectionsAsText } from './reportRendering'
import { buildDeterministicCore } from './deterministicCore'
import type { DeterministicProfile } from './deterministicCoreConfig'
import { getThemedSectionKeys } from './themeSchema'

// Extracted modules
import type { AIPremiumReport, AIReportGenerationOptions, AIUserPlan } from './reportTypes'

import { buildMatrixSummary } from './promptBuilders'
import { callAIBackendGeneric } from './aiBackend'
import {
  generatePeriodLabel,
  calculatePeriodScore,
  calculateThemeScore,
  extractKeywords,
} from './scoreCalculators'
import type { GraphRAGEvidenceAnchor, GraphRAGCrossEvidenceSet } from './graphRagEvidence'

const SAJU_REGEX = /ì‚¬ì£¼|ì˜¤í–‰|ì‹­ì‹ |ëŒ€ìš´|ì¼ê°„|ê²©êµ­|ìš©ì‹ |ì‹ ì‚´/i
const ASTRO_REGEX =
  /ì ì„±|í–‰ì„±|í•˜ìš°ìŠ¤|íŠ¸ëžœì‹¯|ë³„ìžë¦¬|ìƒìŠ¹ê¶|ì²œê¶ë„|astrology|planet|house|transit|zodiac/i
const CROSS_REGEX = /êµì°¨|cross|ìœµí•©|í†µí•©|integrat|synthesize/i
const ACTION_REGEX =
  /í•´ì•¼|í•˜ì„¸ìš”|ì‹¤í–‰|ì ê²€|ì •ë¦¬|ê¸°ë¡|ì‹¤ì²œ|ê³„íš|ì˜¤ëŠ˜|ì´ë²ˆì£¼|ì´ë²ˆ ë‹¬|today|this week|this month|action|plan|step|execute|schedule/i
const TIMING_REGEX =
  /ëŒ€ìš´|ì„¸ìš´|ì›”ìš´|ì¼ì§„|íƒ€ì´ë°|ì‹œê¸°|ì „í™˜ì |transit|timing|window|period|daeun|seun|wolun|iljin/i

function buildDirectToneOverride(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '## ë§íˆ¬ ê°•ì œ ê·œì¹™',
      '- ì¹œêµ¬ì‹ ìœ„ë¡œì²´ ëŒ€ì‹  ì „ë¬¸ê°€ ì»¨ì„¤íŒ… í†¤ìœ¼ë¡œ ìž‘ì„±í•©ë‹ˆë‹¤.',
      '- ê° ë‹¨ë½ ì²« ë¬¸ìž¥ì€ ê²°ë¡ í˜•ìœ¼ë¡œ ì‹œìž‘í•©ë‹ˆë‹¤.',
      '- ë‘ë£¨ë­‰ìˆ í•œ í‘œí˜„ ëŒ€ì‹  ëª…í™•í•œ íŒë‹¨ ë¬¸ìž¥ì„ ì‚¬ìš©í•©ë‹ˆë‹¤.',
      '- ê·¼ê±°(ì‚¬ì£¼/ì ì„±) -> í•´ì„ -> í–‰ë™ ìˆœì„œë¥¼ ìœ ì§€í•©ë‹ˆë‹¤.',
      '- ë¶ˆë¦¿ì´ ì•„ë‹ˆë¼ ë¬¸ë‹¨í˜•ìœ¼ë¡œ ìž‘ì„±í•˜ë˜, ë¬¸ìž¥ì€ ì§§ê³  ë‹¨ì •í•˜ê²Œ ì”ë‹ˆë‹¤.',
    ].join('\n')
  }
  return [
    '## Tone Override',
    '- Use a professional consultant tone, not friendly consolation.',
    '- Start each paragraph with a conclusion sentence.',
    '- Prefer clear judgments over vague hedging.',
    '- Keep the flow: evidence (Saju/Astrology) -> interpretation -> action.',
    '- Keep short, assertive paragraph sentences.',
  ].join('\n')
}

function hasCrossInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return SAJU_REGEX.test(text) && ASTRO_REGEX.test(text)
}

function hasActionInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return ACTION_REGEX.test(text)
}

function hasEvidenceTriplet(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return SAJU_REGEX.test(text) && ASTRO_REGEX.test(text) && CROSS_REGEX.test(text)
}

function hasTimingInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  return TIMING_REGEX.test(text)
}

function hasRepetitiveSentences(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length >= 2) {
    const lineCounts = new Map<string, number>()
    for (const line of lines) {
      const key = line.replace(/\s+/g, ' ')
      lineCounts.set(key, (lineCounts.get(key) || 0) + 1)
    }
    if ([...lineCounts.values()].some((count) => count >= 2)) return true
  }

  const sentenceSplit = text
    .split(/(?<=ë‹¤\.)\s+|(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 24)
  if (sentenceSplit.length < 3) return false
  const sentenceCounts = new Map<string, number>()
  for (const sentence of sentenceSplit) {
    const key = sentence.replace(/\s+/g, '').replace(/[^\p{L}\p{N}]/gu, '')
    if (!key) continue
    sentenceCounts.set(key, (sentenceCounts.get(key) || 0) + 1)
  }
  return [...sentenceCounts.values()].some((count) => count >= 2)
}

const LIST_LINE_REGEX = /^\s*(?:[-*•]|\d+[.)]|[A-Za-z][.)]|[\uAC00-\uD7A3][.)])\s+/m

function hasListLikeStyle(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  const lines = text.split(/\r?\n/).map((line) => line.trim())
  const nonEmpty = lines.filter(Boolean)
  if (nonEmpty.length === 0) return false
  const listLike = nonEmpty.filter((line) => LIST_LINE_REGEX.test(line)).length
  return listLike / nonEmpty.length >= 0.25 || listLike >= 3
}

function countSectionChars(sections: Record<string, unknown>): number {
  const values = Object.values(sections || {}) as unknown[]
  return values.reduce<number>((acc, value) => {
    if (typeof value === 'string') {
      return acc + value.length
    }
    if (Array.isArray(value)) {
      return acc + value.join(' ').length
    }
    if (value && typeof value === 'object') {
      return acc + countSectionChars(value as Record<string, unknown>)
    }
    return acc
  }, 0)
}

function getMissingCrossKeys(sections: Record<string, unknown>, keys: string[]): string[] {
  const missing: string[] = []
  for (const key of keys) {
    const value = sections[key]
    if (typeof value === 'string') {
      if (!hasCrossInText(value)) missing.push(key)
    }
  }
  return missing
}

function buildCrossRepairInstruction(lang: 'ko' | 'en', missing: string[]): string {
  const list = missing.join(', ')
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: ì•„ëž˜ ì„¹ì…˜ì—ì„œ ì‚¬ì£¼/ì ì„± êµì°¨ ê·¼ê±°ê°€ ëˆ„ë½ë˜ì—ˆìŠµë‹ˆë‹¤.',
      `ëˆ„ë½ ì„¹ì…˜: ${list}`,
      'ê° ëˆ„ë½ ì„¹ì…˜ì— ë°˜ë“œì‹œ í¬í•¨: ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ + ì‹¤ìš© í–‰ë™ 2ë¬¸ìž¥.',
      'ë¬¸ìž¥í˜• ì¡´ëŒ“ë§ë§Œ ì‚¬ìš©í•˜ê³  ë¦¬ìŠ¤íŠ¸/ì´ëª¨ì§€/ì œëª© í‘œê¸°ëŠ” ê¸ˆì§€í•©ë‹ˆë‹¤.',
    ].join('\n')
  }
  return [
    '',
    'IMPORTANT: Cross-basis is missing in the following sections.',
    `Missing sections: ${list}`,
    'Each missing section must include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence + 2 practical action sentences.',
    'Use sentence-form only. No lists, emojis, or headings.',
  ].join('\n')
}

function getPathText(sections: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cur: unknown = sections
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[part]
  }
  if (typeof cur === 'string') return cur
  if (Array.isArray(cur)) return cur.map((v) => String(v)).join(' ')
  return ''
}

function getShortSectionPaths(
  sections: Record<string, unknown>,
  paths: string[],
  minCharsPerSection: number
): string[] {
  const short: string[] = []
  for (const path of paths) {
    const text = getPathText(sections, path)
    if (text && text.length < minCharsPerSection) short.push(path)
  }
  return short
}

function getMissingCrossPaths(sections: Record<string, unknown>, crossPaths: string[]): string[] {
  return crossPaths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && !hasCrossInText(text)
  })
}

function getCrossCoverageRatio(sections: Record<string, unknown>, crossPaths: string[]): number {
  const texts = crossPaths.map((path) => getPathText(sections, path)).filter((t) => t.length > 0)
  if (texts.length === 0) return 0
  const hit = texts.filter((t) => hasCrossInText(t)).length
  return hit / texts.length
}

function getCoverageRatioByPredicate(
  sections: Record<string, unknown>,
  paths: string[],
  predicate: (text: string) => boolean
): number {
  const texts = paths.map((path) => getPathText(sections, path)).filter((t) => t.length > 0)
  if (texts.length === 0) return 0
  const hit = texts.filter((t) => predicate(t)).length
  return hit / texts.length
}

function getMissingPathsByPredicate(
  sections: Record<string, unknown>,
  paths: string[],
  predicate: (text: string) => boolean
): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && !predicate(text)
  })
}

function getListStylePaths(sections: Record<string, unknown>, paths: string[]): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && hasListLikeStyle(text)
  })
}

function getRepetitivePaths(sections: Record<string, unknown>, paths: string[]): string[] {
  return paths.filter((path) => {
    const text = getPathText(sections, path)
    return !!text && hasRepetitiveSentences(text)
  })
}

function buildNarrativeStyleRepairInstruction(lang: 'ko' | 'en', listStylePaths: string[]): string {
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: í˜„ìž¬ ë¬¸ì²´ê°€ í•­ëª©í˜•/ë¶ˆë¦¿í˜•ìœ¼ë¡œ ê°ì§€ë˜ì—ˆìŠµë‹ˆë‹¤.',
      listStylePaths.length > 0
        ? `ì„œì‚¬í˜•ìœ¼ë¡œ ìž¬ìž‘ì„±í•  ì„¹ì…˜: ${listStylePaths.join(', ')}`
        : '',
      'ë°˜ë“œì‹œ ë¬¸ë‹¨í˜• ì„œì‚¬ë¡œ ìž¬ìž‘ì„±í•˜ì„¸ìš”. ë²ˆí˜¸, ë¶ˆë¦¿, ê¸°í˜¸(1., -, â€¢, âœ… ë“±)ë¥¼ ì‚¬ìš©í•˜ì§€ ë§ˆì„¸ìš”.',
      'ê° ì„¹ì…˜ì€ 6ë¬¸ìž¥ ì´ìƒìœ¼ë¡œ ì—°ê²°ê° ìžˆê²Œ ìž‘ì„±í•˜ê³ , ì‹¤ì œ ìƒí™© ì˜ˆì‹œì™€ ì‹¤í–‰ ë§¥ë½ì„ í•¨ê»˜ ë„£ìœ¼ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    'IMPORTANT: List-like style detected.',
    listStylePaths.length > 0
      ? `Rewrite these sections in narrative prose: ${listStylePaths.join(', ')}`
      : '',
    'Rewrite using paragraph narrative only. Do not use bullets, numbering, or checklist style.',
    'Each section should be at least 6 connected sentences with realistic context and actionable framing.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildAntiRepetitionInstruction(lang: 'ko' | 'en', repetitivePaths: string[]): string {
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: ë°˜ë³µ ë¬¸ìž¥ì´ ê°ì§€ë˜ì—ˆìŠµë‹ˆë‹¤.',
      repetitivePaths.length > 0
        ? `ë°˜ë³µ ì œê±° í•„ìš” ì„¹ì…˜: ${repetitivePaths.join(', ')}`
        : '',
      'ê°™ì€ ë¬¸ìž¥ êµ¬ì¡°/í‘œí˜„ì„ ë°˜ë³µí•˜ì§€ ë§ê³ , ê° ë¬¸ë‹¨ë§ˆë‹¤ ìƒˆë¡œìš´ ê·¼ê±°ì™€ ë‹¤ë¥¸ ì‚¬ë¡€ë¥¼ ì‚¬ìš©í•˜ì„¸ìš”.',
      'â€œì´ êµ¬ê°„ì€ â€¦â€ ê°™ì€ í…œí”Œë¦¿ ë¬¸ìž¥ ë°˜ë³µì„ ê¸ˆì§€í•˜ê³  ìžì—°ìŠ¤ëŸ¬ìš´ ì„œìˆ ë¡œ ë‹¤ì‹œ ìž‘ì„±í•˜ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    'IMPORTANT: Repetitive sentences detected.',
    repetitivePaths.length > 0
      ? `Sections needing dedup rewrite: ${repetitivePaths.join(', ')}`
      : '',
    'Do not repeat sentence templates. Rewrite in natural narrative with new evidence and varied phrasing.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildNarrativeRewritePrompt(
  lang: 'ko' | 'en',
  sections: Record<string, unknown>,
  options: {
    minCharsPerSection: number
    minTotalChars: number
    requiredTimingSections: string[]
  }
): string {
  const json = JSON.stringify(sections, null, 2)
  if (lang === 'ko') {
    return [
      'ë‹¹ì‹ ì€ ìš´ì„¸ ë¦¬í¬íŠ¸ ì—ë””í„°ìž…ë‹ˆë‹¤.',
      'ì•„ëž˜ JSON ì„¹ì…˜ì„ ì˜ë¯¸ëŠ” ìœ ì§€í•˜ê³  ë¬¸ì²´ë§Œ ì‚¬ëžŒ ì¹œí™”ì  ì„œìˆ í˜•ìœ¼ë¡œ ë¦¬ë¼ì´íŠ¸í•˜ì„¸ìš”.',
      'ì¤‘ìš” ê·œì¹™:',
      '- ì„¹ì…˜ í‚¤ëŠ” ì ˆëŒ€ ë³€ê²½í•˜ì§€ ë§ ê²ƒ.',
      '- ë¶ˆë¦¿/ë²ˆí˜¸ ëª©ë¡ ê¸ˆì§€, ìžì—° ë¬¸ë‹¨í˜•ìœ¼ë¡œ ìž‘ì„±.',
      '- ê°™ì€ ë¬¸ìž¥ í…œí”Œë¦¿ ë°˜ë³µ ê¸ˆì§€.',
      `- ê° ì„¹ì…˜ ìµœì†Œ ${options.minCharsPerSection}ìž ìœ ì§€.`,
      `- ì „ì²´ ìµœì†Œ ${options.minTotalChars}ìž ìœ ì§€.`,
      `- ${options.requiredTimingSections.join(', ')} ì„¹ì…˜ì—ëŠ” ëŒ€ìš´Â·ì„¸ìš´Â·ì›”ìš´Â·ì¼ì§„Â·íŠ¸ëžœì§“ íƒ€ì´ë° ë¬¸ìž¥ì„ ìµœì†Œ 1íšŒ í¬í•¨.`,
      '- ê³¼ìž¥/ë‹¨ì •/ê³µí¬ ì¡°ìž¥ í‘œí˜„ ê¸ˆì§€. í˜„ì‹¤ì ì´ê³  êµ¬ì²´ì ì¸ í–‰ë™ ë¬¸ìž¥ í¬í•¨.',
      'ì•„ëž˜ JSONë§Œ ë°˜í™˜:',
      '```json',
      json,
      '```',
    ].join('\n')
  }
  return [
    'You are a narrative editor for astrology reports.',
    'Rewrite the JSON sections below with human-friendly prose while preserving meaning.',
    'Rules:',
    '- Do not change section keys.',
    '- No bullets/numbering; paragraph narrative only.',
    '- Avoid repeated sentence templates.',
    `- Keep at least ${options.minCharsPerSection} chars per section.`,
    `- Keep at least ${options.minTotalChars} chars total.`,
    `- In ${options.requiredTimingSections.join(', ')}, include timing grounding with Daeun/Seun/Wolun/Iljin/transit at least once.`,
    '- Avoid hype and absolute claims; include practical actions.',
    'Return JSON only:',
    '```json',
    json,
    '```',
  ].join('\n')
}

function buildDepthRepairInstruction(
  lang: 'ko' | 'en',
  sectionPaths: string[],
  shortPaths: string[],
  minCharsPerSection: number,
  minTotalChars: number
): string {
  const allPaths = sectionPaths.join(', ')
  const shortList = shortPaths.join(', ')
  if (lang === 'ko') {
    return [
      '',
      'ì¤‘ìš”: ë¦¬í¬íŠ¸ê°€ ì§§ê±°ë‚˜ ì¼ë°˜ë¡ ì ìž…ë‹ˆë‹¤. ì•„ëž˜ ê¸°ì¤€ì„ ë§Œì¡±í•˜ë„ë¡ ì „ì²´ë¥¼ ë‹¤ì‹œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
      `í•„ìˆ˜ ì„¹ì…˜: ${allPaths}`,
      `ê° ì„¹ì…˜ ìµœì†Œ ê¸¸ì´: ${minCharsPerSection}ìž, ì „ì²´ ìµœì†Œ ê¸¸ì´: ${minTotalChars}ìž`,
      shortPaths.length > 0 ? `íŠ¹ížˆ ë³´ê°•ì´ í•„ìš”í•œ ì„¹ì…˜: ${shortList}` : '',
      'ê° ì„¹ì…˜ì€ ë°˜ë“œì‹œ 1) í•µì‹¬ í•´ì„ 2) ê·¼ê±° 3) ìƒí™œ ì ìš© 4) ì£¼ì˜ í¬ì¸íŠ¸ë¥¼ ë¬¸ìž¥í˜•ìœ¼ë¡œ í¬í•¨í•´ ì£¼ì„¸ìš”.',
      'ì–´ë ¤ìš´ ìš©ì–´ë¥¼ ì“°ë©´ ë°”ë¡œ ë’¤ì— ì‰¬ìš´ í•œêµ­ì–´ ì„¤ëª…ì„ ë¶™ì—¬ ì£¼ì„¸ìš”.',
      'ë¦¬ìŠ¤íŠ¸ ëŒ€ì‹  ì„œìˆ í˜• ë¬¸ë‹¨ìœ¼ë¡œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    '',
    'IMPORTANT: The report is too short or generic. Rewrite all sections with stronger depth.',
    `Required sections: ${allPaths}`,
    `Minimum length: ${minCharsPerSection} chars per section, ${minTotalChars} chars total`,
    shortPaths.length > 0 ? `Sections needing expansion: ${shortList}` : '',
    'Each section must include: key interpretation, evidence, practical application, and caution point.',
    'If technical terms are used, add plain-language explanations right after them.',
    'Use paragraph-style narrative, not bullet points.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildSecondPassInstruction(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '',
      '2ì°¨ ë³´ê°• ì§€ì‹œ: ì—¬ì „ížˆ ë°€ë„ê°€ ë¶€ì¡±í•˜ë©´ ê° ì„¹ì…˜ì„ ìµœì†Œ 6ë¬¸ìž¥ìœ¼ë¡œ í™•ìž¥í•´ ì£¼ì„¸ìš”.',
      'ê° ì„¹ì…˜ì— ë°˜ë“œì‹œ ì‹¤ì „ ì˜ˆì‹œ 1ê°œì™€ ì‹¤í–‰ ìˆœì„œ(ì˜¤ëŠ˜-ì´ë²ˆì£¼-ì´ë²ˆë‹¬)ë¥¼ í¬í•¨í•´ ì£¼ì„¸ìš”.',
      'ì¶”ìƒì  ë¯¸ì‚¬ì—¬êµ¬ ëŒ€ì‹  í–‰ë™ ê°€ëŠ¥í•œ ë¬¸ìž¥ìœ¼ë¡œ ìž‘ì„±í•´ ì£¼ì„¸ìš”.',
    ].join('\n')
  }
  return [
    '',
    'Second-pass rewrite: if depth is still weak, expand each section to at least 6 sentences.',
    'Include one practical example and execution sequence (today-this week-this month) in each section.',
    'Prefer concrete action-oriented language over abstract filler.',
  ].join('\n')
}

function buildActionRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `ì¤‘ìš”: ì‹¤í–‰ ë¬¸ìž¥ ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°• í•„ìš” ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° í•µì‹¬ ì„¹ì…˜ë§ˆë‹¤ ë°˜ë“œì‹œ ì˜¤ëŠ˜-ì´ë²ˆì£¼-ì´ë²ˆë‹¬ ìˆœì„œì˜ ì‹¤í–‰ ë¬¸ìž¥(í–‰ë™ ì§€ì‹œ) ìµœì†Œ 2ê°œë¥¼ ë„£ìœ¼ì„¸ìš”.',
      'ì¶”ìƒì  ìœ„ë¡œ ë¬¸ìž¥ ëŒ€ì‹  ì‹¤ì œ í–‰ë™ ê°€ëŠ¥í•œ ë¬¸ìž¥ì„ ì‚¬ìš©í•˜ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Actionable sentence coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing action steps: ${missingPaths.join(', ')}` : '',
    'Each core section must include at least 2 concrete action sentences using a today-this week-this month sequence.',
    'Replace abstract comfort with executable guidance.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildEvidenceRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `ì¤‘ìš”: ê·¼ê±° íŠ¸ë¦¬í”Œ(ì‚¬ì£¼+ì ì„±+êµì°¨) ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°• í•„ìš” ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° í•µì‹¬ ì„¹ì…˜ì—ì„œ ë°˜ë“œì‹œ ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ì„ í¬í•¨í•˜ì„¸ìš”.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Evidence triplet coverage (Saju+Astrology+Cross) is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing evidence triplet: ${missingPaths.join(', ')}` : '',
    'For each core section include 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildCrossCoverageRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number
): string {
  if (lang === 'ko') {
    return [
      '',
      `ì¤‘ìš”: ì‚¬ì£¼+ì ì„± êµì°¨ ì„œìˆ  ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      'ê° í•µì‹¬ ì„¹ì…˜ë§ˆë‹¤ ì‚¬ì£¼ ê·¼ê±° 1ë¬¸ìž¥ + ì ì„± ê·¼ê±° 1ë¬¸ìž¥ + êµì°¨ ê²°ë¡  1ë¬¸ìž¥ì„ ë°˜ë“œì‹œ í¬í•¨í•˜ì„¸ìš”.',
      'ë‹¨ìˆœ ì¼ë°˜ë¡ ì„ ì¤„ì´ê³ , ê·¼ê±°ì–´(ì‚¬ì£¼/ì ì„±/í•˜ìš°ìŠ¤/ëŒ€ìš´/íŠ¸ëžœì‹¯)ë¥¼ ë¬¸ìž¥ì— ëª…ì‹œí•˜ì„¸ìš”.',
    ].join('\n')
  }
  return [
    '',
    `IMPORTANT: Cross-basis narrative coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    'For each core section include: 1 Saju basis sentence + 1 Astrology basis sentence + 1 cross conclusion sentence.',
    'Avoid generic filler and explicitly mention grounding terms (saju/astrology/house/daeun/transit).',
  ].join('\n')
}

function buildTimingRepairInstruction(
  lang: 'ko' | 'en',
  ratio: number,
  targetRatio: number,
  missingPaths: string[]
): string {
  if (lang === 'ko') {
    return [
      '',
      `ì¤‘ìš”: íƒ€ì´ë° ê·¼ê±°(ëŒ€ìš´/ì„¸ìš´/ì›”ìš´/ì¼ì§„/íŠ¸ëžœì§“) ë°˜ì˜ ë¹„ìœ¨ì´ ë‚®ìŠµë‹ˆë‹¤. í˜„ìž¬=${Math.round(ratio * 100)}%, ëª©í‘œ=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `ë³´ê°• í•„ìš” ì„¹ì…˜: ${missingPaths.join(', ')}` : '',
      'ê° ë³´ê°• ì„¹ì…˜ì—ì„œ ë°˜ë“œì‹œ ë‹¤ìŒì„ ëª…ì‹œí•˜ì„¸ìš”: í˜„ìž¬ ëŒ€ìš´ 1ë¬¸ìž¥, ì„¸ìš´/ì›”ìš´/ì¼ì§„ ì¤‘ 2ê°œ ì´ìƒ 1ë¬¸ìž¥, ì ì„± íŠ¸ëžœì§“/í–‰ì„± íƒ€ì´ë° 1ë¬¸ìž¥, ì‹¤ì œ ì‹¤í–‰ ì‹œì  1ë¬¸ìž¥.',
      'íƒ€ì´ë°ì€ ë°˜ë“œì‹œ ì ˆëŒ€ í‘œí˜„ìœ¼ë¡œ ì“°ì„¸ìš”(ì˜¤ëŠ˜/ì´ë²ˆì£¼/ì´ë²ˆë‹¬ + êµ¬ì²´ ì‹œì ).',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    '',
    `IMPORTANT: Timing grounding coverage is low. current=${Math.round(ratio * 100)}%, target=${Math.round(targetRatio * 100)}%`,
    missingPaths.length > 0 ? `Sections needing timing grounding: ${missingPaths.join(', ')}` : '',
    'For each missing section include: 1 current Daeun sentence, 1 sentence using at least two of Seun/Wolun/Iljin, 1 transit timing sentence, and 1 execution timing sentence.',
    'Use explicit timing language (today/this week/this month + concrete windows).',
  ]
    .filter(Boolean)
    .join('\n')
}

function getMaxRepairPassesByPlan(plan?: AIUserPlan): number {
  switch (plan) {
    case 'premium':
      return 3
    case 'pro':
      return 3
    case 'starter':
      return 2
    case 'free':
    default:
      return 2
  }
}

const COMPREHENSIVE_SECTION_KEYS: Array<keyof AIPremiumReport['sections']> = [
  'introduction',
  'personalityDeep',
  'careerPath',
  'relationshipDynamics',
  'wealthPotential',
  'healthGuidance',
  'lifeMission',
  'timingAdvice',
  'actionPlan',
  'conclusion',
]

const BOILERPLATE_PATTERNS = [
  /ì´ êµ¬ê°„ì˜ í•µì‹¬ ì´ˆì ì€[^.\n!?]*[.\n!?]?/g,
  /This section focuses on[^.\n!?]*[.\n!?]?/gi,
]
const BANNED_PHRASES = [
  'ê²©êµ­ì˜ ê²°',
  'ê¸´ìž¥ ì‹ í˜¸',
  'ìƒí˜¸ìž‘ìš©',
  'ì‹œì‚¬',
  'ê²°ì´',
  'í”„ë ˆìž„',
  'ê²€ì¦',
  'ê·¼ê±° ì„¸íŠ¸',
]
const BANNED_PHRASE_PATTERNS = BANNED_PHRASES.map((phrase) => new RegExp(phrase, 'gi'))
const ADVICE_SENTENCE_REGEX = /(ì¢‹ìŠµë‹ˆë‹¤|ìœ ì˜í•˜ì…”ì•¼ í•©ë‹ˆë‹¤)/

const SECTION_CONCRETE_NOUNS: Record<keyof AIPremiumReport['sections'], string[]> = {
  introduction: ['ì¼ì •', 'ìš°ì„ ìˆœìœ„', 'ëŒ€í™”', 'ìˆ˜ë©´', 'í”¼ë¡œ', 'ë§ˆê°'],
  personalityDeep: ['ë§íˆ¬', 'ì†ë„', 'ê±°ë¦¬ë‘ê¸°', 'ê²°ì •', 'ìˆ˜ë©´', 'ë‘í†µ'],
  careerPath: ['ì¼ì •', 'ìš°ì„ ìˆœìœ„', 'í˜‘ì—…', 'ê²°ì • ì§€ì—°', 'ë§ˆê°', 'íšŒì˜'],
  relationshipDynamics: [
    'ë§ì´ ë¹¨ë¼ì§',
    'ë‹¨í˜¸í•´ì§',
    'ê±°ë¦¬ë‘ê¸°',
    'í™•ì • ì„œë‘ë¦„',
    'ëŒ€í™”',
    'ì—°ë½',
  ],
  wealthPotential: ['ì§€ì¶œ', 'ì €ì¶•', 'ê³„ì•½', 'ì˜ˆì‚°', 'ë§ˆê°', 'ìš°ì„ ìˆœìœ„'],
  healthGuidance: ['ì†Œí™”', 'ìˆ˜ë©´', 'ë‘í†µ', 'í—ˆë¦¬', 'ê´€ì ˆ', 'í”¼ë¡œ'],
  lifeMission: ['ì¼ì •', 'ìŠµê´€', 'ê¸°ë¡', 'ëŒ€í™”', 'í˜‘ì—…', 'ìš°ì„ ìˆœìœ„'],
  timingAdvice: ['ì˜¤ëŠ˜', 'ì´ë²ˆì£¼', 'ì´ë²ˆ ë‹¬', 'ë§ˆê°', 'ëŒ€í™”', 'ê²°ì •'],
  actionPlan: ['ì¼ì •', 'ìš°ì„ ìˆœìœ„', 'í˜‘ì—…', 'ìˆ˜ë©´', 'ëŒ€í™”', 'ë§ˆê°'],
  conclusion: ['ì¼ì •', 'ëŒ€í™”', 'ìˆ˜ë©´', 'ìš°ì„ ìˆœìœ„', 'í”¼ë¡œ', 'ê²°ì •'],
}

function stripBannedPhrases(text: string): string {
  let result = text
  for (const pattern of BANNED_PHRASE_PATTERNS) {
    result = result.replace(pattern, '')
  }
  return result
}

function containsBannedPhrase(text: string): boolean {
  return BANNED_PHRASE_PATTERNS.some((pattern) => pattern.test(text))
}

function sanitizeSectionNarrative(text: string): string {
  if (!text || typeof text !== 'string') return ''
  let cleaned = text
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  cleaned = stripBannedPhrases(cleaned)
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}
const REPETITIVE_OPENER_REGEX =
  /^(?:\uACB0\uB860\uBD80\uD130 \uB9D0\uD558\uBA74|\uC694\uC57D\uD558\uBA74|\uD575\uC2EC\uC740)\b/
const SECTION_OPENERS_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '지금 국면의 핵심은 방향 설정입니다',
  personalityDeep: '성향의 중심축은 판단과 리듬 조절입니다',
  careerPath: '커리어에서는 우선순위 설계가 성과를 가릅니다',
  relationshipDynamics: '관계에서는 해석 오차 관리가 먼저입니다',
  wealthPotential: '재정에서는 기대수익보다 조건 검증이 우선입니다',
  healthGuidance: '건강은 회복 리듬 관리가 핵심입니다',
  lifeMission: '장기 성장은 일관된 실행 기록에서 나옵니다',
  timingAdvice: '타이밍은 속도보다 순서가 중요합니다',
  actionPlan: '실행은 단계를 분리할수록 재현성이 높아집니다',
  conclusion: '이번 흐름의 결론은 속도와 검증의 균형입니다',
}
function normalizeSentenceKey(sentence: string): string {
  return sentence
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}
function postProcessSectionNarrative(
  text: string,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  const base = sanitizeSectionNarrative(text)
  if (!base) return base
  const sentences = splitSentences(base)
  if (sentences.length === 0) return base
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const sentence of sentences) {
    const key = normalizeSentenceKey(sentence)
    if (key.length < 12 || !seen.has(key)) {
      deduped.push(sentence)
      if (key.length >= 12) seen.add(key)
    }
  }
  if (lang === 'ko' && deduped[0] && REPETITIVE_OPENER_REGEX.test(deduped[0])) {
    deduped[0] = SECTION_OPENERS_KO[sectionKey]
  }
  return deduped
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function sanitizeTimingContradictions(text: string, input: MatrixCalculationInput): string {
  if (!text) return text
  let out = text
  if (input.currentSaeunElement && /ì„¸ìš´\s*ë¯¸ìž…ë ¥/gi.test(out)) {
    out = out.replace(/ì„¸ìš´\s*ë¯¸ìž…ë ¥/gi, 'ì„¸ìš´ íë¦„ ë°˜ì˜')
  }
  if (input.currentDaeunElement && /ëŒ€ìš´\s*ë¯¸ìž…ë ¥/gi.test(out)) {
    out = out.replace(/ëŒ€ìš´\s*ë¯¸ìž…ë ¥/gi, 'ëŒ€ìš´ íë¦„ ë°˜ì˜')
  }
  return out
}

function toKoreanDomainLabel(domain: string): string {
  const map: Record<string, string> = {
    personality: 'ì„±í–¥',
    career: 'ì»¤ë¦¬ì–´',
    relationship: 'ê´€ê³„',
    wealth: 'ìž¬ì •',
    health: 'ê±´ê°•',
    spirituality: 'ì‚¬ëª…',
    timing: 'ì‹œê¸°',
  }
  return map[domain] || 'íë¦„'
}

function humanizeCrossSetFact(set: GraphRAGCrossEvidenceSet): string {
  const pairMatch = set.astrologyEvidence.match(/^([A-Za-z]+)-([a-z]+)-([A-Za-z]+)/i)
  const p1 = pairMatch?.[1] || 'í–‰ì„±'
  const aspectRaw = (pairMatch?.[2] || '').toLowerCase()
  const p2 = pairMatch?.[3] || 'í–‰ì„±'
  const aspectKoMap: Record<string, string> = {
    conjunction: 'í•©ìœ¼ë¡œ ë§Œë‚©ë‹ˆë‹¤',
    opposition: 'ëŒ€ë¦½ìœ¼ë¡œ ì¶©ëŒ í¬ì¸íŠ¸ê°€ ìƒê¸°ê¸° ì‰½ìŠµë‹ˆë‹¤',
    square: 'ê°ì„ ì„¸ìš°ë©° ì••ë°•ì„ ì¤ë‹ˆë‹¤',
    trine: 'ìžì—°ìŠ¤ëŸ½ê²Œ ì¡°í™”ë¥¼ ì´ë£¹ë‹ˆë‹¤',
    sextile: 'ë¶€ë“œëŸ½ê²Œ ê¸°íšŒë¥¼ ì—½ë‹ˆë‹¤',
    quincunx: 'ì¡°ì •ì´ í•„ìš”í•œ êµ¬ê°„ì´ ìžì£¼ ìƒê¹ë‹ˆë‹¤',
  }
  const aspectKo = aspectKoMap[aspectRaw] || 'ì˜í–¥ì„ ì¤ë‹ˆë‹¤'
  const domains = set.overlapDomains.map(toKoreanDomainLabel).join(', ')
  return `${p1}ê³¼ ${p2} íë¦„ì€ ${aspectKo}. ${domains} ìª½ì€ ë°©í–¥ì´ ë˜ë ·í•´ì§€ê¸° ì‰½ìŠµë‹ˆë‹¤.`
}

function extractTopMatrixFacts(matrixReport: FusionReport, sectionKey: string): string[] {
  const domainBySection: Record<string, string[]> = {
    introduction: ['personality', 'timing'],
    personalityDeep: ['personality'],
    careerPath: ['career', 'wealth'],
    relationshipDynamics: ['relationship'],
    wealthPotential: ['wealth', 'career'],
    healthGuidance: ['health'],
    lifeMission: ['spirituality', 'personality'],
    timingAdvice: ['timing'],
    actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
    conclusion: ['personality', 'timing'],
  }
  const targets = new Set(domainBySection[sectionKey] || ['personality'])
  return matrixReport.topInsights
    .filter((item) => targets.has(item.domain))
    .slice(0, 3)
    .map(
      (item) =>
        `${item.title} íë¦„ì´ ì´ì–´ì§‘ë‹ˆë‹¤. ì§€ê¸ˆì€ ${toKoreanDomainLabel(item.domain)} ìª½ ì„ íƒì´ ë” ì¤‘ìš”í•©ë‹ˆë‹¤.`
    )
}

function buildSectionFactPack(
  sectionKey: keyof AIPremiumReport['sections'],
  anchor: GraphRAGEvidenceAnchor | undefined,
  matrixReport: FusionReport,
  input: MatrixCalculationInput
): string[] {
  const bullets: string[] = []
  if (input.dayMasterElement) {
    bullets.push(
      `íƒ€ê³ ë‚œ êµ¬ì¡°ìƒ ${input.dayMasterElement} ì¼ê°„ì€ ë°©í–¥ì„ ë¨¼ì € ìž¡ì„ ë•Œ í”ë“¤ë¦¼ì´ ì¤„ê¸° ì‰½ìŠµë‹ˆë‹¤.`
    )
  }
  if (input.geokguk) {
    bullets.push(
      `íƒ€ê³ ë‚œ êµ¬ì¡°ìƒ ${input.geokguk} ì„±í–¥ì€ ì—­í• ê³¼ ì±…ìž„ì„ ë¶„ëª…ížˆ í• ìˆ˜ë¡ ì„±ê³¼ê°€ ì˜¬ë¼ê°€ê¸° ì‰½ìŠµë‹ˆë‹¤.`
    )
  }
  if (input.yongsin) {
    bullets.push(
      `ìš©ì‹ ì´ ${input.yongsin} ìª½ì´ë©´ ìƒí™œ ë¦¬ë“¬ì„ ê·¸ìª½ìœ¼ë¡œ ë§žì¶œ ë•Œ ì²´ê°ì´ ë¹¨ë¼ì§€ê¸° ì‰½ìŠµë‹ˆë‹¤.`
    )
  }

  const topSets = [...(anchor?.crossEvidenceSets || [])]
    .sort((a, b) => b.overlapScore - a.overlapScore)
    .slice(0, 2)
  for (const set of topSets) {
    bullets.push(humanizeCrossSetFact(set))
  }

  bullets.push(...extractTopMatrixFacts(matrixReport, sectionKey))

  const activeTransits = (input.activeTransits || []).slice(0, 2)
  if (activeTransits.length > 0) {
    bullets.push(
      `í˜„ìž¬ëŠ” ${activeTransits.join(', ')} ì˜í–¥ì´ ê²¹ì³ ê²°ì • ì†ë„ë¥¼ ì¡°ì ˆí•˜ëŠ” ìª½ì´ ë‚«ìŠµë‹ˆë‹¤.`
    )
  }
  if (input.currentDaeunElement || input.currentSaeunElement) {
    bullets.push(
      `ëŒ€ìš´ê³¼ ì„¸ìš´ì´ í•¨ê»˜ ì›€ì§ì´ëŠ” êµ¬ê°„ì´ë¼ ë‹¨ê¸° ê°ì •ë³´ë‹¤ ì¤‘ê¸° ê³„íšì„ ìš°ì„ í•˜ëŠ” ìª½ì´ ë‚«ìŠµë‹ˆë‹¤.`
    )
  }

  return bullets
    .map((line) => line.trim())
    .filter((line, idx, arr) => line.length > 0 && arr.indexOf(line) === idx)
    .slice(0, 12)
}

function buildSectionPrompt(
  sectionKey: keyof AIPremiumReport['sections'],
  factPack: string[],
  lang: 'ko' | 'en',
  draftText?: string
): string {
  const facts = factPack.map((fact) => `- ${fact}`).join('\n')
  const concreteNouns = SECTION_CONCRETE_NOUNS[sectionKey].join(', ')
  if (lang === 'ko') {
    return [
      '당신은 사주+점성 통합 상담가입니다.',
      `섹션 이름: ${sectionKey}`,
      '스타일 규칙:',
      '- 첫 문장은 결론형으로 시작하되, 시작 표현을 섹션마다 다르게 씁니다.',
      '- 쉬운 한국어 설명문으로 씁니다.',
      '- 문장 길이는 15~35자로 맞춥니다.',
      '- 문단마다 4~7문장으로 작성합니다.',
      '- 구체 명사를 최소 2개 포함합니다.',
      `- 이 섹션 명사 후보: ${concreteNouns}`,
      '- 과장/공포 조장 금지. 근거가 있을 때만 단정합니다.',
      '- 불릿/번호 목록 없이 자연 문단으로 작성합니다.',
      '- 같은 의미 문장을 반복하지 말고, 각 문장은 새 정보 1개 이상 포함합니다.',
      '- 조언형 문장(좋습니다/유의하셔야 합니다)은 최대 2문장만 사용합니다.',
      draftText
        ? '아래 초안을 보강해 더 정교하게 완성합니다.'
        : '아래 사실 묶음만으로 섹션을 작성합니다.',
      '사실 묶음:',
      facts,
      draftText ? `초안:\n${draftText}` : '',
      'JSON으로만 반환: {"text":"..."}',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    'You are a combined Saju+Astrology counselor.',
    `Section: ${sectionKey}`,
    'Style rules:',
    '- Start with a direct conclusion, but vary opening expressions by section.',
    '- Use concise declarative sentences with concrete details.',
    '- No hype, no absolutes, and no fear language.',
    '- No bullet or numbered output; prose paragraphs only.',
    '- Avoid repeating semantically equivalent sentences.',
    draftText
      ? 'Refine the draft with stronger depth and precision.'
      : 'Write only from the fact pack below.',
    'Fact pack:',
    facts,
    draftText ? `Draft:\n${draftText}` : '',
    'Return JSON only: {"text":"..."}',
  ]
    .filter(Boolean)
    .join('\n')
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=ë‹¤\.)\s+|(?<=[.!?])\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

function measureSectionNovelty(text: string): number {
  const sentences = splitSentences(text).filter((s) => s.length >= 16)
  const unique = new Set(
    sentences.map((s) =>
      s
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim()
    )
  )
  return unique.size
}

function measureSectionSpecificity(text: string): number {
  const concreteRegex =
    /ì˜¤ëŠ˜|ì´ë²ˆì£¼|ì´ë²ˆ ë‹¬|ì´ë²ˆë‹¬|ì´ë²ˆ í•´|ì›”ê°„|ì£¼ê°„|ê³„ì•½|ì¼ì •|ë§ˆê°|íšŒì˜|ì—°ë½|ìˆ˜ë©´|ë‘í†µ|í—ˆë¦¬|ê´€ì ˆ|ì†Œí™”|í”¼ë¡œ/i
  return splitSentences(text).filter((s) => concreteRegex.test(s)).length
}

function countConcreteNounsBySection(
  text: string,
  sectionKey: keyof AIPremiumReport['sections']
): number {
  const nouns = SECTION_CONCRETE_NOUNS[sectionKey] || []
  const lowered = text.toLowerCase()
  const matched = new Set<string>()
  for (const noun of nouns) {
    if (lowered.includes(noun.toLowerCase())) {
      matched.add(noun)
    }
  }
  return matched.size
}

function measureAverageSentenceLength(text: string): number {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return 0
  const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0)
  return total / sentences.length
}

function countAdviceSentences(text: string): number {
  const sentences = splitSentences(text)
  return sentences.filter((sentence) => ADVICE_SENTENCE_REGEX.test(sentence)).length
}

function normalizeFactKeywords(fact: string): string[] {
  const stopWords = new Set([
    'ê·¸ë¦¬ê³ ',
    'í•˜ì§€ë§Œ',
    'ì—ì„œ',
    'ìœ¼ë¡œ',
    'ìž…ë‹ˆë‹¤',
    'í•©ë‹ˆë‹¤',
    'íë¦„',
    'ì¶•',
    'í˜„ìž¬',
    'ê¸°ì§ˆ',
    'ì„±í–¥',
  ])
  return fact
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t))
    .slice(0, 4)
}

function measureEvidenceDensity(text: string, factPack: string[]): number {
  const lowered = text.toLowerCase()
  let reflected = 0
  for (const fact of factPack) {
    const keywords = normalizeFactKeywords(fact)
    if (keywords.some((kw) => lowered.includes(kw.toLowerCase()))) {
      reflected += 1
    }
  }
  return reflected
}

function evaluateSectionGate(
  text: string,
  factPack: string[],
  sectionKey: keyof AIPremiumReport['sections']
) {
  const novelty = measureSectionNovelty(text)
  const specificity = countConcreteNounsBySection(text, sectionKey)
  const genericSpecificity = measureSectionSpecificity(text)
  const evidenceDensity = measureEvidenceDensity(text, factPack)
  const avgSentenceLength = measureAverageSentenceLength(text)
  const banned = containsBannedPhrase(text)
  const adviceCount = countAdviceSentences(text)
  return {
    novelty,
    specificity,
    genericSpecificity,
    evidenceDensity,
    avgSentenceLength,
    banned,
    adviceCount,
    repetitive: hasRepetitiveSentences(text),
    pass:
      novelty >= 3 &&
      specificity >= 2 &&
      evidenceDensity >= 2 &&
      avgSentenceLength <= 40 &&
      !banned &&
      adviceCount <= 2 &&
      !hasRepetitiveSentences(text),
  }
}

function summarizeTopInsightsByCategory(
  report: FusionReport,
  categories: Array<'strength' | 'opportunity' | 'balance' | 'caution' | 'challenge'>,
  lang: 'ko' | 'en',
  limit = 3
): string {
  const rows = (report.topInsights || [])
    .filter((item) => categories.includes(item.category))
    .slice(0, limit)
    .map((item) => (lang === 'ko' ? item.title : item.titleEn || item.title))
    .filter(Boolean)
  return rows.length > 0
    ? rows.join(', ')
    : lang === 'ko'
      ? 'í•µì‹¬ ì‹ í˜¸ ì •ë¦¬ ì¤‘'
      : 'Core signals in review'
}

function buildComprehensiveFallbackSections(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  deterministicCore: ReturnType<typeof buildDeterministicCore>,
  lang: 'ko' | 'en'
): AIPremiumReport['sections'] {
  const strengths = summarizeTopInsightsByCategory(
    matrixReport,
    ['strength', 'opportunity'],
    lang,
    3
  )
  const cautions = summarizeTopInsightsByCategory(matrixReport, ['caution', 'challenge'], lang, 3)
  const topDomains = [...(matrixReport.domainAnalysis || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((d) => `${d.domain}(${d.score})`)
    .join(', ')

  if (lang === 'ko') {
    return {
      introduction: `í˜„ìž¬ ë¦¬í¬íŠ¸ëŠ” ê·œì¹™ ê¸°ë°˜ ì•ˆì „ ëª¨ë“œë¡œ ìƒì„±ë˜ì—ˆìŠµë‹ˆë‹¤. ì‚¬ì£¼ ì¼ê°„ ${input.dayMasterElement}ê³¼ ì ì„± í•µì‹¬ ë°°ì¹˜ì˜ ê³µí†µ ë¶„ëª¨ë¥¼ ìš°ì„  ì •ë¦¬í•´, ì˜¤ëŠ˜ ì‹¤í–‰ ê°€ëŠ¥í•œ ê²°ë¡ ë§Œ ë‚¨ê²¼ìŠµë‹ˆë‹¤. ê°•ì  ì‹ í˜¸ëŠ” ${strengths}ë¡œ ìš”ì•½ë˜ê³ , ì£¼ì˜ ì‹ í˜¸ëŠ” ${cautions}ë¡œ ì§‘ì•½ë©ë‹ˆë‹¤.`,
      personalityDeep: `ê¸°ë³¸ ì„±í–¥ì€ ì¼ê°„ ${input.dayMasterElement}ì˜ ì˜ì‚¬ê²°ì • ë¦¬ë“¬ê³¼ ì ì„±ì˜ ì‚¬ê³ Â·ê°ì • ì¶•ì´ í•¨ê»˜ ìž‘ë™í•˜ëŠ” êµ¬ì¡°ìž…ë‹ˆë‹¤. ê°•ì ì€ ë¹ ë¥¸ íŒë‹¨ê³¼ êµ¬ì¡°í™” ëŠ¥ë ¥ì´ê³ , ì•½ì ì€ ê³¼ì† ê²°ë¡ ê³¼ í™•ì¸ ëˆ„ë½ìž…ë‹ˆë‹¤. ì¤‘ìš”í•œ ì„ íƒì¼ìˆ˜ë¡ íŒë‹¨ê³¼ ì‹¤í–‰ ì‹œì ì„ ë¶„ë¦¬í•˜ëŠ” ë°©ì‹ì´ ì•ˆì •ì ìž…ë‹ˆë‹¤.`,
      careerPath: `ì»¤ë¦¬ì–´ ê´€ì ì˜ ìƒìœ„ ì§€í‘œëŠ” ${topDomains || 'career(í‰ê°€ ì¤‘)'}ìž…ë‹ˆë‹¤. ì‹¤í–‰ ë°©ì‹ì€ í•œ ë²ˆì— ë„“ížˆê¸°ë³´ë‹¤ í•µì‹¬ ê³¼ì—… 1~2ê°œë¥¼ ì™„ê²°í•˜ê³  ë‹¤ìŒ ë‹¨ê³„ë¡œ í™•ìž¥í•˜ëŠ” ì „ê°œê°€ ìœ ë¦¬í•©ë‹ˆë‹¤. ì™¸ë¶€ í˜‘ì—…ì€ ì—­í• ê³¼ ë§ˆê° ì •ì˜ë¥¼ ë¨¼ì € ê³ ì •í•´ì•¼ ì„±ê³¼ ë³€ë™ì„ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤.`,
      relationshipDynamics: `ê´€ê³„ ì˜ì—­ì—ì„œëŠ” ì˜ë„ ì „ë‹¬ë³´ë‹¤ í•´ì„ ì˜¤ì°¨ ê´€ë¦¬ê°€ í•µì‹¬ìž…ë‹ˆë‹¤. í‘œí˜„ì„ ì§§ê²Œ í•˜ê³  í™•ì¸ ì§ˆë¬¸ì„ ì¶”ê°€í•˜ë©´ ë¶ˆí•„ìš”í•œ ê°ì • ì†Œëª¨ë¥¼ ì¤„ì¼ ìˆ˜ ìžˆìŠµë‹ˆë‹¤. ê°€ê¹Œìš´ ê´€ê³„ì¼ìˆ˜ë¡ ê²°ë¡ ì„ ì„œë‘ë¥´ê¸°ë³´ë‹¤ ë§¥ë½ì„ ë¨¼ì € ë§žì¶”ëŠ” ëŒ€í™” êµ¬ì¡°ê°€ ì•ˆì •ì„±ì„ ë†’ìž…ë‹ˆë‹¤.`,
      wealthPotential: `ìž¬ì •ì—ì„œëŠ” ê¸°íšŒ ì‹ í˜¸ì™€ ë³´ìˆ˜ ì‹ í˜¸ê°€ ë™ì‹œì— ì¡´ìž¬í•˜ë¯€ë¡œ ìˆ˜ìµ ê¸°ëŒ€ë§Œìœ¼ë¡œ í™•ì •í•˜ì§€ ì•ŠëŠ” ì›ì¹™ì´ í•„ìš”í•©ë‹ˆë‹¤. ì´ë²ˆ ì‚¬ì´í´ì€ ì§€ì¶œ í†µì œÂ·í˜„ê¸ˆíë¦„ ê°€ì‹œí™”Â·ì¡°ê±´ ê²€ì¦ì˜ 3ì¶•ì´ ìš°ì„ ìž…ë‹ˆë‹¤. í° ì˜ì‚¬ê²°ì •ì€ ë‹¹ì¼ í™•ì •ë³´ë‹¤ 24ì‹œê°„ ìž¬ê²€í† ê°€ ì†ì‹¤ ë°©ì§€ì— ìœ ë¦¬í•©ë‹ˆë‹¤.`,
      healthGuidance: `ì—ë„ˆì§€ íŒ¨í„´ì€ ë‹¨ê¸° ì§‘ì¤‘ í›„ íšŒë³µì´ ëŠ¦ì–´ì§€ëŠ” í˜•íƒœê°€ ë°˜ë³µë  ìˆ˜ ìžˆìŠµë‹ˆë‹¤. ë¬´ë¦¬í•œ í™•ìž¥ë³´ë‹¤ ìˆ˜ë©´Â·ìˆ˜ë¶„Â·ë¦¬ë“¬ ê³ ì •ì´ ê²°ê³¼ë¥¼ ì§€ì¼œì¤ë‹ˆë‹¤. ì¼ì •ì´ ë°€ë¦¬ëŠ” ë‚ ì¼ìˆ˜ë¡ ê°•ë„ ë†’ì€ ìž‘ì—…ë³´ë‹¤ ì˜¤ë¥˜ ë¹„ìš©ì´ í° ìž‘ì—…ì˜ ê²€ìˆ˜ ìš°ì„ ìˆœìœ„ë¥¼ ì˜¬ë¦¬ëŠ” ê²ƒì´ ì¢‹ìŠµë‹ˆë‹¤.`,
      lifeMission: `ìž¥ê¸° ë°©í–¥ì„±ì€ ë‹¨ê¸° ì„±ê³¼ë³´ë‹¤ ëˆ„ì  ì‹ ë¢°ë¥¼ ë§Œë“œëŠ” êµ¬ì¡°ì— ë§žì¶°ì ¸ ìžˆìŠµë‹ˆë‹¤. ë³¸ì¸ì˜ ê¸°ì¤€ì„ ëª…í™•ížˆ ì„¤ëª…í•˜ê³  ì‹¤í–‰ ê¸°ë¡ì„ ë‚¨ê¸°ëŠ” ìŠµê´€ì´ ì˜í–¥ë ¥ì„ í‚¤ì›ë‹ˆë‹¤. ì¦‰í¥ì  ìŠ¹ë¶€ë³´ë‹¤ ì¼ê´€ëœ í’ˆì§ˆì´ ìš´ì˜ ë³€ë™í­ì„ ì¤„ì´ëŠ” í•µì‹¬ ë ˆë²„ë¦¬ì§€ìž…ë‹ˆë‹¤.`,
      timingAdvice: `ê²°ì • ì½”ì–´ íŒì •ì€ ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict}(${deterministicCore.decision.score}ì )` : 'ì¼ë°˜ ëª¨ë“œ'}ìž…ë‹ˆë‹¤. ì‹¤í–‰ ì°½ì„ ì—´ ë•ŒëŠ” ê°•ì  ì‹ í˜¸(${strengths})ë¥¼ ìš°ì„  ì‚¬ìš©í•˜ê³ , ì£¼ì˜ ì‹ í˜¸(${cautions})ê°€ ê±¸ë¦¬ëŠ” ì˜ì—­ì€ í™•ì • ì „ì— ì´ì¤‘ í™•ì¸ì„ ë„£ì–´ì•¼ í•©ë‹ˆë‹¤. íŠ¹ížˆ ë¬¸ì„œÂ·í•©ì˜Â·ëŒ€ì™¸ ì»¤ë®¤ë‹ˆì¼€ì´ì…˜ì€ ì²´í¬ë¦¬ìŠ¤íŠ¸ ê¸°ë°˜ìœ¼ë¡œ ì§„í–‰í•˜ì‹­ì‹œì˜¤.`,
      actionPlan: `ì˜¤ëŠ˜ ì‹¤í–‰ì•ˆì€ ì„¸ ë‹¨ê³„ë¡œ ê³ ì •í•˜ì‹­ì‹œì˜¤. ì²«ì§¸, ë°˜ë“œì‹œ ëë‚¼ ê²°ê³¼ë¬¼ 1ê°œë¥¼ ì •ì˜í•©ë‹ˆë‹¤. ë‘˜ì§¸, ì™¸ë¶€ ì „ë‹¬ ì „ ì¡°ê±´Â·ê¸°í•œÂ·ì±…ìž„ì„ í•œ ì¤„ë¡œ ìž¬í™•ì¸í•©ë‹ˆë‹¤. ì…‹ì§¸, ë‹¹ì¼ í™•ì •ì´ í•„ìš”í•œ ì•ˆê±´ë§Œ ì²˜ë¦¬í•˜ê³  ë‚˜ë¨¸ì§€ëŠ” ìž¬ê²€í†  ìŠ¬ë¡¯ìœ¼ë¡œ ë„˜ê²¨ ë¦¬ìŠ¤í¬ë¥¼ ë¶„ë¦¬í•©ë‹ˆë‹¤.`,
      conclusion: `ì´ ë¦¬í¬íŠ¸ëŠ” ë°ì´í„° í•´ì„ì˜ ì¼ê´€ì„±ì„ ìš°ì„ í•œ ì•ˆì • ëª¨ë“œ ê²°ê³¼ìž…ë‹ˆë‹¤. í•µì‹¬ì€ ê°•ì  êµ¬ê°„ì—ì„œ ì†ë„ë¥¼ ë‚´ê³ , ì£¼ì˜ êµ¬ê°„ì—ì„œëŠ” í™•ì¸ ë‹¨ê³„ë¥¼ ìƒëžµí•˜ì§€ ì•ŠëŠ” ê²ƒìž…ë‹ˆë‹¤. ê°™ì€ íŒ¨í„´ì„ 2ì£¼ë§Œ ìœ ì§€í•´ë„ ì„±ê³¼ì˜ ìž¬í˜„ì„±ì´ ë¶„ëª…ížˆ ì˜¬ë¼ê°‘ë‹ˆë‹¤.`,
    }
  }

  return {
    introduction: `This report was generated in deterministic safety mode. It prioritizes actionable overlap between your Saju day master ${input.dayMasterElement} and core astrology signals. Strength signals are summarized as ${strengths}, while caution signals are summarized as ${cautions}.`,
    personalityDeep: `Your baseline pattern combines fast decision rhythm with analytical framing. The upside is decisive execution; the downside is premature commitment without verification. Separate decision timing from commitment timing to keep quality high under pressure.`,
    careerPath: `Top domain indicators are ${topDomains || 'career(under review)'}. Your best pattern is narrow-and-finish execution: complete one or two core deliverables before expansion. In collaboration, lock scope and deadline first to reduce variance.`,
    relationshipDynamics: `In relationships, alignment quality matters more than intensity. Keep statements concise and add one confirmation question to reduce interpretation drift. In close ties, context-first dialogue is safer than fast conclusions.`,
    wealthPotential: `Financially, opportunity and caution signals coexist, so avoid commitment based on upside alone. Prioritize spend control, cashflow visibility, and term verification. For large decisions, a 24-hour recheck window is usually protective.`,
    healthGuidance: `Your energy pattern tends to run in bursts with delayed recovery. Stabilize sleep, hydration, and routine before scaling workload. On overloaded days, prioritize review tasks with high error cost over raw volume.`,
    lifeMission: `Your long-term leverage comes from compounding trust, not short spikes. Explain your criteria clearly and keep execution logs. Consistent quality beats impulsive wins and narrows outcome volatility.`,
    timingAdvice: `Deterministic decision status is ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict} (${deterministicCore.decision.score})` : 'general mode'}. Use high-signal windows (${strengths}) for execution, and route caution zones (${cautions}) through verification before commitment.`,
    actionPlan: `Use a three-step execution loop today. First, define one must-finish deliverable. Second, verify terms, deadline, and ownership in one line before external communication. Third, commit only what must close today and move the rest into a recheck slot.`,
    conclusion: `This output is an intentionally conservative, consistency-first report. Move fast in strength zones and never skip verification in caution zones. Keeping this pattern for two weeks will materially improve result repeatability.`,
  }
}

// ===========================
// ë©”ì¸ ìƒì„± í•¨ìˆ˜
// ===========================

export async function generateAIPremiumReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {}
): Promise<AIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const detailLevel = options.detailLevel || 'detailed'

  // 1. í”„ë¡¬í”„íŠ¸ ë¹Œë“œ
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, {
    mode: 'comprehensive',
    focusDomain: options.focusDomain,
  })
  const deterministicCore = buildDeterministicCore({
    matrixInput: input,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })

  const requestedChars =
    typeof options.targetChars === 'number' && Number.isFinite(options.targetChars)
      ? Math.max(3500, Math.min(32000, Math.floor(options.targetChars)))
      : detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 18000
          : 14000
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 11000
            : 8500
          : undefined
  const maxTokensOverride = requestedChars ? Math.ceil(requestedChars / 2) + 1200 : undefined
  const sectionTokenBudget = maxTokensOverride
    ? Math.max(850, Math.min(2400, Math.floor(maxTokensOverride / 4)))
    : undefined

  const sectionAnchors = new Map(
    (graphRagEvidence.anchors || []).map((anchor) => [anchor.section, anchor])
  )
  const sections: Record<string, unknown> = {}
  let tokensUsed = 0
  const models = new Set<string>()
  let usedDeterministicFallback = false

  try {
    for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
      const anchor = sectionAnchors.get(sectionKey)
      const factPack = buildSectionFactPack(sectionKey, anchor, matrixReport, input)
      const draftPrompt = buildSectionPrompt(sectionKey, factPack, lang)

      const draft = await callAIBackendGeneric<{ text: string }>(draftPrompt, lang, {
        userPlan: options.userPlan,
        maxTokensOverride: sectionTokenBudget,
        modelOverride: 'gpt-4o-mini',
      })
      tokensUsed += draft.tokensUsed || 0
      models.add(draft.model)
      const draftText = sanitizeSectionNarrative(draft.sections?.text || '')

      const synthesisPrompt = buildSectionPrompt(sectionKey, factPack, lang, draftText)
      const synthesized = await callAIBackendGeneric<{ text: string }>(synthesisPrompt, lang, {
        userPlan: options.userPlan,
        maxTokensOverride: sectionTokenBudget,
        modelOverride: 'gpt-4o',
      })
      tokensUsed += synthesized.tokensUsed || 0
      models.add(synthesized.model)
      let sectionText = sanitizeTimingContradictions(
        postProcessSectionNarrative(synthesized.sections?.text || draftText, sectionKey, lang),
        input
      )

      const quality = evaluateSectionGate(sectionText, factPack, sectionKey)
      if (!quality.pass) {
        const repairPrompt = [
          buildSectionPrompt(sectionKey, factPack, lang, sectionText),
          lang === 'ko'
            ? `ë³´ê°• ê·œì¹™: ìƒˆ í¬ì¸íŠ¸ë¥¼ ìµœì†Œ ì„¸ ê°œ ë„£ê³ , êµ¬ì²´ ëª…ì‚¬ë¥¼ ìµœì†Œ ë‘ ê°œ ë„£ê³ , ì‚¬ì‹¤ ë¬¶ìŒ ë°˜ì˜ ë¬¸ìž¥ì„ ìµœì†Œ ë‘ ê°œ ë„£ì–´ ì£¼ì„¸ìš”. í‰ê·  ë¬¸ìž¥ ê¸¸ì´ëŠ” 40ìž ì´í•˜ë¡œ ë§žì¶”ê³  ê¸ˆì§€ í‘œí˜„ì€ ì œê±°í•´ ì£¼ì„¸ìš”. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`
            : `Repair rules: add at least 3 new points, include at least 2 concrete nouns, and reflect at least 2 fact-pack points. Keep average sentence length under 40 chars and remove banned phrases. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`,
        ].join('\n')
        try {
          const repaired = await callAIBackendGeneric<{ text: string }>(repairPrompt, lang, {
            userPlan: options.userPlan,
            maxTokensOverride: sectionTokenBudget,
            modelOverride: 'gpt-4o',
          })
          tokensUsed += repaired.tokensUsed || 0
          models.add(repaired.model)
          sectionText = sanitizeTimingContradictions(
            postProcessSectionNarrative(repaired.sections?.text || sectionText, sectionKey, lang),
            input
          )
        } catch (error) {
          logger.warn('[AI Report] Section repair failed; keeping synthesized text', {
            section: sectionKey,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      sections[sectionKey] = sectionText
    }
  } catch (error) {
    usedDeterministicFallback = true
    const fallbackSections = buildComprehensiveFallbackSections(
      input,
      matrixReport,
      deterministicCore,
      lang
    )
    for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
      sections[sectionKey] = fallbackSections[sectionKey]
    }
    logger.warn('[AI Report] Falling back to deterministic narrative sections', {
      error: error instanceof Error ? error.message : String(error),
      lang,
    })
  }
  const model = usedDeterministicFallback ? 'deterministic-fallback' : [...models].join(' -> ')

  // 3. ??? ??
  const report: AIPremiumReport = {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
      geokguk: input.geokguk,
    },

    sections: sections as AIPremiumReport['sections'],
    graphRagEvidence,
    deterministicCore,
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      [
        'introduction',
        'personalityDeep',
        'careerPath',
        'relationshipDynamics',
        'wealthPotential',
        'healthGuidance',
        'lifeMission',
        'timingAdvice',
        'actionPlan',
        'conclusion',
      ],
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, [
      'introduction',
      'personalityDeep',
      'careerPath',
      'relationshipDynamics',
      'wealthPotential',
      'healthGuidance',
      'lifeMission',
      'timingAdvice',
      'actionPlan',
      'conclusion',
    ]),

    matrixSummary: {
      overallScore: matrixReport.overallScore.total,
      grade: matrixReport.overallScore.grade,
      topInsights: matrixReport.topInsights.slice(0, 3).map((i) => i.title),
      keyStrengths: matrixReport.topInsights
        .filter((i) => i.category === 'strength')
        .slice(0, 3)
        .map((i) => i.title),
      keyChallenges: matrixReport.topInsights
        .filter((i) => i.category === 'challenge' || i.category === 'caution')
        .slice(0, 3)
        .map((i) => i.title),
    },

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
    },
  }

  return report
}

// ===========================
// íƒ€ì´ë° ë¦¬í¬íŠ¸ ìƒì„± í•¨ìˆ˜
// ===========================

export async function generateTimingReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  period: ReportPeriod,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    targetDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
  } = {}
): Promise<TimingAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const targetDate = options.targetDate || new Date().toISOString().split('T')[0]
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, { mode: 'timing', period })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: input,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })

  // 1. ë§¤íŠ¸ë¦­ìŠ¤ ìš”ì•½ ë¹Œë“œ
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. í”„ë¡¬í”„íŠ¸ ë¹Œë“œ
  const prompt = `${buildTimingPrompt(
    period,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
    },
    timingData,
    targetDate,
    matrixSummary,
    graphRagEvidencePrompt,
    options.userQuestion,
    deterministicCore.promptBlock
  )}\n\n${buildDirectToneOverride(lang)}`

  // 3. AI ë°±ì—”ë“œ í˜¸ì¶œ + í’ˆì§ˆ ê²Œì´íŠ¸(ê¸¸ì´/êµì°¨ ê·¼ê±°)
  const base = await callAIBackendGeneric<TimingReportSections>(prompt, lang, {
    userPlan: options.userPlan,
  })
  let sections = base.sections as unknown as Record<string, unknown>
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

  const sectionPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
    'luckyElements',
  ]
  const crossPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
  ]
  const minCharsPerSection = lang === 'ko' ? 300 : 230
  const minTotalChars = lang === 'ko' ? 5200 : 4000
  const minCrossCoverage = 0.72
  const minActionCoverage = 0.65
  const minEvidenceTripletCoverage = 0.65

  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
  const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
  const missingEvidenceTripletPaths = getMissingPathsByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const listStylePaths = getListStylePaths(sections, sectionPaths)
  const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage ||
    actionCoverageRatio < minActionCoverage ||
    evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
    listStylePaths.length > 0

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
      actionCoverageRatio < minActionCoverage
        ? buildActionRepairInstruction(
            lang,
            actionCoverageRatio,
            minActionCoverage,
            missingActionPaths
          )
        : '',
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage
        ? buildEvidenceRepairInstruction(
            lang,
            evidenceTripletCoverageRatio,
            minEvidenceTripletCoverage,
            missingEvidenceTripletPaths
          )
        : '',
      listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<TimingReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
      })
      sections = repaired.sections as unknown as Record<string, unknown>
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondActionCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasActionInText
      )
      const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasEvidenceTriplet
      )
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage ||
          secondActionCoverageRatio < minActionCoverage ||
          secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<TimingReportSections>(secondPrompt, lang, {
            userPlan: options.userPlan,
          })
          sections = second.sections as unknown as Record<string, unknown>
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Timing Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Timing Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  // 4. ê¸°ê°„ ë¼ë²¨ ìƒì„±
  const periodLabel = generatePeriodLabel(period, targetDate, lang)

  // 5. ì ìˆ˜ ê³„ì‚°
  const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)

  // 6. ë¦¬í¬íŠ¸ ì¡°ë¦½
  const report: TimingAIPremiumReport = {
    id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    period,
    targetDate,
    periodLabel,

    timingData,
    sections: sections as unknown as TimingReportSections,
    graphRagEvidence,
    deterministicCore,
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      [
        'overview',
        'energy',
        'opportunities',
        'cautions',
        'domains.career',
        'domains.love',
        'domains.wealth',
        'domains.health',
        'actionPlan',
        'luckyElements',
      ],
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]),
    periodScore,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
    },
  }

  return report
}

// ===========================
// í…Œë§ˆë³„ ë¦¬í¬íŠ¸ ìƒì„± í•¨ìˆ˜
// ===========================

export async function generateThemedReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  theme: ReportTheme,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
  } = {}
): Promise<ThemedAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const graphRagEvidence = buildGraphRAGEvidence(input, matrixReport, { mode: 'themed', theme })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: input,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })

  // 1. ë§¤íŠ¸ë¦­ìŠ¤ ìš”ì•½ ë¹Œë“œ
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. í”„ë¡¬í”„íŠ¸ ë¹Œë“œ
  const prompt = `${buildThemedPrompt(
    theme,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
      sibsinDistribution: input.sibsinDistribution,
    },
    timingData,
    matrixSummary,
    undefined,
    graphRagEvidencePrompt,
    options.userQuestion,
    deterministicCore.promptBlock
  )}\n\n${buildDirectToneOverride(lang)}`

  // 3. AI ë°±ì—”ë“œ í˜¸ì¶œ + í’ˆì§ˆ ê²Œì´íŠ¸(ê¸¸ì´/êµì°¨ ê·¼ê±°)
  const base = await callAIBackendGeneric<ThemedReportSections>(prompt, lang, {
    userPlan: options.userPlan,
  })
  let sections = base.sections as unknown as Record<string, unknown>
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

  const sectionPaths = [...getThemedSectionKeys(theme)]
  const crossPaths = sectionPaths.filter((path) => path !== 'recommendations')
  const minCharsPerSection = lang === 'ko' ? 320 : 240
  const minTotalChars = lang === 'ko' ? 5600 : 4200
  const minCrossCoverage = 0.72
  const minActionCoverage = 0.65
  const minEvidenceTripletCoverage = 0.65
  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
  const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
  const missingEvidenceTripletPaths = getMissingPathsByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const listStylePaths = getListStylePaths(sections, sectionPaths)
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage ||
    actionCoverageRatio < minActionCoverage ||
    evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
    listStylePaths.length > 0

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
      actionCoverageRatio < minActionCoverage
        ? buildActionRepairInstruction(
            lang,
            actionCoverageRatio,
            minActionCoverage,
            missingActionPaths
          )
        : '',
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage
        ? buildEvidenceRepairInstruction(
            lang,
            evidenceTripletCoverageRatio,
            minEvidenceTripletCoverage,
            missingEvidenceTripletPaths
          )
        : '',
      listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<ThemedReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
      })
      sections = repaired.sections as unknown as Record<string, unknown>
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondActionCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasActionInText
      )
      const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasEvidenceTriplet
      )
      const secondListStylePaths = getListStylePaths(sections, sectionPaths)
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage ||
          secondActionCoverageRatio < minActionCoverage ||
          secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
          secondListStylePaths.length > 0)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<ThemedReportSections>(secondPrompt, lang, {
            userPlan: options.userPlan,
          })
          sections = second.sections as unknown as Record<string, unknown>
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Themed Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Themed Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  // 4. í…Œë§ˆ ë©”íƒ€ë°ì´í„°
  const themeMeta = THEME_META[theme]

  // 5. ì ìˆ˜ ê³„ì‚°
  const themeScore = calculateThemeScore(theme, input.sibsinDistribution)

  // 6. í‚¤ì›Œë“œ ì¶”ì¶œ
  const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)

  // 7. ë¦¬í¬íŠ¸ ì¡°ë¦½
  const report: ThemedAIPremiumReport = {
    id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    lang,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    theme,
    themeLabel: themeMeta.label[lang],
    themeEmoji: themeMeta.emoji,

    sections: sections as unknown as ThemedReportSections,
    graphRagEvidence,
    deterministicCore,
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      sectionPaths,
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, sectionPaths),
    themeScore,
    keywords,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
    },
  }

  return report
}
