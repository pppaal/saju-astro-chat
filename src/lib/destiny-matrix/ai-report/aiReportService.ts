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
import { buildLifeCyclePromptBlock, buildThemeSchemaPromptBlock } from '../interpretationSchema'

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

function inferAgeFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null
  const parsed = new Date(birthDate)
  if (Number.isNaN(parsed.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - parsed.getFullYear()
  const m = now.getMonth() - parsed.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) age -= 1
  return Number.isFinite(age) && age >= 0 ? age : null
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

const LIST_LINE_REGEX = /^\s*(?:[-*•]|\d+[.)]|[A-Za-z][.)]|[가-힣][.)])\s+/m

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
  draftText?: string,
  targetMinChars?: number
): string {
  const facts = factPack.map((fact) => `- ${fact}`).join('\n')
  const concreteNouns = SECTION_CONCRETE_NOUNS[sectionKey].join(', ')
  const minChars = Math.max(220, Math.floor(targetMinChars || (lang === 'ko' ? 420 : 320)))
  const longForm = minChars >= (lang === 'ko' ? 600 : 450)
  if (lang === 'ko') {
    return [
      '당신은 사주+점성 통합 상담가입니다.',
      `섹션 이름: ${sectionKey}`,
      '스타일 규칙:',
      '- 첫 문장은 결론형으로 시작하되, 시작 표현을 섹션마다 다르게 씁니다.',
      '- 쉬운 한국어 설명문으로 씁니다.',
      longForm ? '- 문장 길이는 22~60자로 맞춥니다.' : '- 문장 길이는 15~35자로 맞춥니다.',
      longForm ? '- 문단마다 8~14문장으로 작성합니다.' : '- 문단마다 4~7문장으로 작성합니다.',
      `- 이 섹션은 최소 ${minChars}자 이상으로 작성합니다.`,
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
    longForm
      ? '- Use medium-length declarative sentences with concrete detail and context.'
      : '- Use concise declarative sentences with concrete details.',
    longForm
      ? '- Write 8-14 connected sentences for this section.'
      : '- Write 4-7 connected sentences for this section.',
    `- This section must be at least ${minChars} characters.`,
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
      ? '핵심 신호 정리 중'
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
      introduction: `현재 리포트는 규칙 기반 안전 모드로 생성되었습니다. 사주 일간 ${input.dayMasterElement}과 점성 핵심 배치의 공통 분모를 우선 정리해, 오늘 실행 가능한 결론만 남겼습니다. 강점 신호는 ${strengths}, 주의 신호는 ${cautions}로 요약됩니다.`,
      personalityDeep: `기본 성향은 일간 ${input.dayMasterElement}의 의사결정 리듬과 점성의 사고·감정 축이 함께 작동하는 구조입니다. 강점은 빠른 판단과 구조화 능력이고, 약점은 과속 결론과 확인 누락입니다. 중요한 선택일수록 판단 시점과 실행 시점을 분리하면 안정성이 올라갑니다.`,
      careerPath: `커리어 관점의 상위 지표는 ${topDomains || 'career(평가 중)'}입니다. 실행 방식은 한 번에 넓히기보다 핵심 과업 1~2개를 완결하고 다음 단계로 확장하는 전개가 유리합니다. 외부 협업은 역할과 마감 정의를 먼저 고정해야 성과 변동을 줄일 수 있습니다.`,
      relationshipDynamics: `관계 영역에서는 의도 전달보다 해석 오차 관리가 핵심입니다. 표현을 짧게 하고 확인 질문을 추가하면 불필요한 감정 소모를 줄일 수 있습니다. 가까운 관계일수록 결론을 서두르기보다 맥락을 먼저 맞추는 대화 구조가 안정적입니다.`,
      wealthPotential: `재정에서는 기회 신호와 보수 신호가 동시에 존재하므로 수익 기대만으로 확정하지 않는 원칙이 필요합니다. 이번 사이클은 지출 통제·현금흐름 가시화·조건 검증의 3축이 우선입니다. 큰 의사결정은 당일 확정보다 24시간 재검토가 손실 방지에 유리합니다.`,
      healthGuidance: `에너지 패턴은 단기 집중 후 회복이 늦어지는 형태가 반복될 수 있습니다. 무리한 확장보다 수면·수분·리듬 고정이 결과를 지켜줍니다. 일정이 밀리는 날일수록 강도 높은 작업보다 오류 비용이 큰 작업의 검수 우선순위를 올리는 것이 좋습니다.`,
      lifeMission: `장기 방향성은 단기 성과보다 누적 신뢰를 만드는 구조에 맞춰져 있습니다. 본인의 기준을 명확히 설명하고 실행 기록을 남기는 습관이 영향력을 키웁니다. 즉흥적 승부보다 일관된 품질이 운의 변동폭을 줄이는 핵심 레버리지입니다.`,
      timingAdvice: `결정 코어 판정은 ${deterministicCore.decision.enabled ? `${deterministicCore.decision.verdict}(${deterministicCore.decision.score}점)` : '일반 모드'}입니다. 실행 창을 열 때는 강점 신호(${strengths})를 우선 사용하고, 주의 신호(${cautions})가 걸리는 영역은 확정 전에 이중 확인을 넣어야 합니다. 특히 문서·합의·대외 커뮤니케이션은 체크리스트 기반으로 진행하세요.`,
      actionPlan: `오늘 실행안은 세 단계로 고정하세요. 첫째, 반드시 끝낼 결과물 1개를 정의합니다. 둘째, 외부 전달 전 조건·기한·책임을 한 줄로 재확인합니다. 셋째, 당일 확정이 필요한 안건만 처리하고 나머지는 재검토 슬롯으로 넘겨 리스크를 분리합니다.`,
      conclusion: `이 리포트는 데이터 해석의 일관성을 우선한 안전 모드 결과입니다. 핵심은 강점 구간에서 속도를 내고, 주의 구간에서는 확인 단계를 생략하지 않는 것입니다. 같은 패턴을 2주만 유지해도 성과의 재현성이 분명히 올라갑니다.`,
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
  const sectionMinChars =
    detailLevel === 'comprehensive'
      ? lang === 'ko'
        ? 850
        : 650
      : detailLevel === 'detailed'
        ? lang === 'ko'
          ? 600
          : 450
        : lang === 'ko'
          ? 380
          : 300

  const sectionAnchors = new Map(
    (graphRagEvidence.anchors || []).map((anchor) => [anchor.section, anchor])
  )
  let sections: Record<string, unknown> = {}
  let tokensUsed = 0
  const models = new Set<string>()
  let usedDeterministicFallback = false

  try {
    for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
      const anchor = sectionAnchors.get(sectionKey)
      const factPack = buildSectionFactPack(sectionKey, anchor, matrixReport, input)
      const draftPrompt = buildSectionPrompt(sectionKey, factPack, lang, undefined, sectionMinChars)

      const draft = await callAIBackendGeneric<{ text: string }>(draftPrompt, lang, {
        userPlan: options.userPlan,
        maxTokensOverride: sectionTokenBudget,
        modelOverride: 'gpt-4o-mini',
      })
      tokensUsed += draft.tokensUsed || 0
      models.add(draft.model)
      const draftText = sanitizeSectionNarrative(draft.sections?.text || '')

      const synthesisPrompt = buildSectionPrompt(
        sectionKey,
        factPack,
        lang,
        draftText,
        sectionMinChars
      )
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
          buildSectionPrompt(sectionKey, factPack, lang, sectionText, sectionMinChars),
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

  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)
  if (!usedDeterministicFallback && maxRepairPasses > 0) {
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const crossPaths = sectionPaths.filter((path) => path !== 'conclusion')
    const timingPaths = ['timingAdvice', 'actionPlan', 'careerPath', 'wealthPotential']
    const minCharsPerSection =
      detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 600
          : 450
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 420
            : 300
          : lang === 'ko'
            ? 280
            : 220
    const minTotalChars =
      detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 9000
          : 7000
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 6200
            : 4600
          : lang === 'ko'
            ? 4200
            : 3200
    const minCrossCoverage = 0.75
    const minActionCoverage = 0.7
    const minEvidenceTripletCoverage = 0.68
    const minTimingCoverage = 0.55

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
    const missingTimingPaths = getMissingPathsByPredicate(sections, timingPaths, hasTimingInText)
    const timingCoverageRatio = getCoverageRatioByPredicate(sections, timingPaths, hasTimingInText)
    const listStylePaths = getListStylePaths(sections, sectionPaths)
    const repetitivePaths = getRepetitivePaths(sections, sectionPaths)
    const totalChars = countSectionChars(sections)
    const needsRepair =
      shortPaths.length > 0 ||
      missingCross.length > 0 ||
      totalChars < minTotalChars ||
      crossCoverageRatio < minCrossCoverage ||
      actionCoverageRatio < minActionCoverage ||
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
      timingCoverageRatio < minTimingCoverage ||
      listStylePaths.length > 0 ||
      repetitivePaths.length > 0

    if (needsRepair) {
      const rewritePrompt = buildNarrativeRewritePrompt(lang, sections, {
        minCharsPerSection,
        minTotalChars,
        requiredTimingSections: timingPaths,
      })
      const repairPrompt = [
        rewritePrompt,
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
        timingCoverageRatio < minTimingCoverage
          ? buildTimingRepairInstruction(
              lang,
              timingCoverageRatio,
              minTimingCoverage,
              missingTimingPaths
            )
          : '',
        listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
        repetitivePaths.length > 0 ? buildAntiRepetitionInstruction(lang, repetitivePaths) : '',
      ]
        .filter(Boolean)
        .join('\n')

      try {
        const repaired = await callAIBackendGeneric<AIPremiumReport['sections']>(
          repairPrompt,
          lang,
          {
            userPlan: options.userPlan,
            maxTokensOverride,
            modelOverride: 'gpt-4o',
          }
        )
        sections = repaired.sections as unknown as Record<string, unknown>
        tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
        models.add(repaired.model)

        const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
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
        const secondTimingCoverageRatio = getCoverageRatioByPredicate(
          sections,
          timingPaths,
          hasTimingInText
        )
        const secondTotalChars = countSectionChars(sections)
        if (
          maxRepairPasses > 1 &&
          (secondShortPaths.length > 0 ||
            secondTotalChars < minTotalChars ||
            secondCrossCoverageRatio < minCrossCoverage ||
            secondActionCoverageRatio < minActionCoverage ||
            secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
            secondTimingCoverageRatio < minTimingCoverage)
        ) {
          const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
          try {
            const second = await callAIBackendGeneric<AIPremiumReport['sections']>(
              secondPrompt,
              lang,
              {
                userPlan: options.userPlan,
                maxTokensOverride,
                modelOverride: 'gpt-4o',
              }
            )
            sections = second.sections as unknown as Record<string, unknown>
            tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
            models.add(second.model)
          } catch (error) {
            logger.warn(
              '[AI Report] Second global repair pass failed; keeping first repaired result',
              {
                error: error instanceof Error ? error.message : String(error),
                plan: options.userPlan || 'free',
              }
            )
          }
        }
      } catch (error) {
        logger.warn('[AI Report] Global narrative repair failed; keeping section-wise result', {
          error: error instanceof Error ? error.message : String(error),
          plan: options.userPlan || 'free',
        })
      }
    }
  }

  const model = usedDeterministicFallback ? 'deterministic-fallback' : [...models].join(' -> ')
  const topInsights = (matrixReport.topInsights || []).slice(0, 3).map((i) => i.title)
  const keyStrengths = (matrixReport.topInsights || [])
    .filter((i) => i.category === 'strength')
    .slice(0, 3)
    .map((i) => i.title)
  const keyChallenges = (matrixReport.topInsights || [])
    .filter((i) => i.category === 'challenge' || i.category === 'caution')
    .slice(0, 3)
    .map((i) => i.title)
  const domainFallback = [...(matrixReport.domainAnalysis || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) =>
      lang === 'ko' ? `${d.domain} 강점(${d.score})` : `${d.domain} strength (${d.score})`
    )
  const anchorFallback = (graphRagEvidence.anchors || [])
    .slice(0, 3)
    .map((a) =>
      lang === 'ko' ? `${a.section} 섹션 근거 정렬` : `${a.section} section evidence alignment`
    )
  const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
  const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
  const safeKeyChallenges =
    keyChallenges.length > 0
      ? keyChallenges
      : lang === 'ko'
        ? ['주의 신호 검토 필요', '확정 전 재확인 필요', '커뮤니케이션 리스크 점검']
        : [
            'Caution signals require review',
            'Recheck before final commitment',
            'Communication risk check',
          ]

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
      topInsights: safeTopInsights,
      keyStrengths: safeKeyStrengths,
      keyChallenges: safeKeyChallenges,
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
  const inferredAge = inferAgeFromBirthDate(options.birthDate)
  const lifecyclePrompt = inferredAge !== null ? buildLifeCyclePromptBlock(inferredAge, lang) : ''
  const themeSchemaPrompt = buildThemeSchemaPromptBlock('comprehensive', lang)

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
  )}\n\n${themeSchemaPrompt}\n\n${lifecyclePrompt}\n\n${buildDirectToneOverride(lang)}`

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
  const inferredAge = inferAgeFromBirthDate(options.birthDate)
  const lifecyclePrompt = inferredAge !== null ? buildLifeCyclePromptBlock(inferredAge, lang) : ''
  const themeSchemaPrompt = buildThemeSchemaPromptBlock(theme, lang)

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
  )}\n\n${themeSchemaPrompt}\n\n${lifecyclePrompt}\n\n${buildDirectToneOverride(lang)}`

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
