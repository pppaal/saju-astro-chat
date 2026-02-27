// src/lib/destiny-matrix/ai-report/aiReportService.ts
// Destiny Fusion Matrix™ - AI Premium Report Generator
// 유료 기능: AI 기반 상세 내러티브 리포트 생성

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

const SAJU_REGEX = /사주|오행|십신|대운|일간|격국|용신|신살/i
const ASTRO_REGEX =
  /점성|행성|하우스|트랜싯|별자리|상승궁|천궁도|astrology|planet|house|transit|zodiac/i
const CROSS_REGEX = /교차|cross|융합|통합|integrat|synthesize/i
const ACTION_REGEX =
  /해야|하세요|실행|점검|정리|기록|실천|계획|오늘|이번주|이번 달|today|this week|this month|action|plan|step|execute|schedule/i
const TIMING_REGEX =
  /대운|세운|월운|일진|타이밍|시기|전환점|transit|timing|window|period|daeun|seun|wolun|iljin/i

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
    .split(/(?<=다\.)\s+|(?<=[.!?])\s+/u)
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
      '중요: 아래 섹션에서 사주/점성 교차 근거가 누락되었습니다.',
      `누락 섹션: ${list}`,
      '각 누락 섹션에 반드시 포함: 사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장 + 실용 행동 2문장.',
      '문장형 존댓말만 사용하고 리스트/이모지/제목 표기는 금지합니다.',
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
      '중요: 현재 문체가 항목형/불릿형으로 감지되었습니다.',
      listStylePaths.length > 0 ? `서사형으로 재작성할 섹션: ${listStylePaths.join(', ')}` : '',
      '반드시 문단형 서사로 재작성하세요. 번호, 불릿, 기호(1., -, •, ✅ 등)를 사용하지 마세요.',
      '각 섹션은 6문장 이상으로 연결감 있게 작성하고, 실제 상황 예시와 실행 맥락을 함께 넣으세요.',
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
      '중요: 반복 문장이 감지되었습니다.',
      repetitivePaths.length > 0 ? `반복 제거 필요 섹션: ${repetitivePaths.join(', ')}` : '',
      '같은 문장 구조/표현을 반복하지 말고, 각 문단마다 새로운 근거와 다른 사례를 사용하세요.',
      '“이 구간은 …” 같은 템플릿 문장 반복을 금지하고 자연스러운 서술로 다시 작성하세요.',
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
      '당신은 운세 리포트 에디터입니다.',
      '아래 JSON 섹션을 의미는 유지하고 문체만 사람 친화적 서술형으로 리라이트하세요.',
      '중요 규칙:',
      '- 섹션 키는 절대 변경하지 말 것.',
      '- 불릿/번호 목록 금지, 자연 문단형으로 작성.',
      '- 같은 문장 템플릿 반복 금지.',
      `- 각 섹션 최소 ${options.minCharsPerSection}자 유지.`,
      `- 전체 최소 ${options.minTotalChars}자 유지.`,
      `- ${options.requiredTimingSections.join(', ')} 섹션에는 대운·세운·월운·일진·트랜짓 타이밍 문장을 최소 1회 포함.`,
      '- 과장/단정/공포 조장 표현 금지. 현실적이고 구체적인 행동 문장 포함.',
      '아래 JSON만 반환:',
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
      '중요: 리포트가 짧거나 일반론적입니다. 아래 기준을 만족하도록 전체를 다시 작성해 주세요.',
      `필수 섹션: ${allPaths}`,
      `각 섹션 최소 길이: ${minCharsPerSection}자, 전체 최소 길이: ${minTotalChars}자`,
      shortPaths.length > 0 ? `특히 보강이 필요한 섹션: ${shortList}` : '',
      '각 섹션은 반드시 1) 핵심 해석 2) 근거 3) 생활 적용 4) 주의 포인트를 문장형으로 포함해 주세요.',
      '어려운 용어를 쓰면 바로 뒤에 쉬운 한국어 설명을 붙여 주세요.',
      '리스트 대신 서술형 문단으로 작성해 주세요.',
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
      '2차 보강 지시: 여전히 밀도가 부족하면 각 섹션을 최소 6문장으로 확장해 주세요.',
      '각 섹션에 반드시 실전 예시 1개와 실행 순서(오늘-이번주-이번달)를 포함해 주세요.',
      '추상적 미사여구 대신 행동 가능한 문장으로 작성해 주세요.',
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
      `중요: 실행 문장 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `보강 필요 섹션: ${missingPaths.join(', ')}` : '',
      '각 핵심 섹션마다 반드시 오늘-이번주-이번달 순서의 실행 문장(행동 지시) 최소 2개를 넣으세요.',
      '추상적 위로 문장 대신 실제 행동 가능한 문장을 사용하세요.',
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
      `중요: 근거 트리플(사주+점성+교차) 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `보강 필요 섹션: ${missingPaths.join(', ')}` : '',
      '각 핵심 섹션에서 반드시 사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장을 포함하세요.',
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
      `중요: 사주+점성 교차 서술 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      '각 핵심 섹션마다 사주 근거 1문장 + 점성 근거 1문장 + 교차 결론 1문장을 반드시 포함하세요.',
      '단순 일반론을 줄이고, 근거어(사주/점성/하우스/대운/트랜싯)를 문장에 명시하세요.',
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
      `중요: 타이밍 근거(대운/세운/월운/일진/트랜짓) 반영 비율이 낮습니다. 현재=${Math.round(ratio * 100)}%, 목표=${Math.round(targetRatio * 100)}%`,
      missingPaths.length > 0 ? `보강 필요 섹션: ${missingPaths.join(', ')}` : '',
      '각 보강 섹션에서 반드시 다음을 명시하세요: 현재 대운 1문장, 세운/월운/일진 중 2개 이상 1문장, 점성 트랜짓/행성 타이밍 1문장, 실제 실행 시점 1문장.',
      '타이밍은 반드시 절대 표현으로 쓰세요(오늘/이번주/이번달 + 구체 시점).',
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
  /이 구간의 핵심 초점은[^.\n!?]*[.\n!?]?/g,
  /This section focuses on[^.\n!?]*[.\n!?]?/gi,
]
const BANNED_PHRASES = [
  '격국의 결',
  '긴장 신호',
  '상호작용',
  '시사',
  '결이',
  '프레임',
  '검증',
  '근거 세트',
]
const BANNED_PHRASE_PATTERNS = BANNED_PHRASES.map((phrase) => new RegExp(phrase, 'gi'))
const ADVICE_SENTENCE_REGEX = /(좋습니다|유의하셔야 합니다)/

const SECTION_CONCRETE_NOUNS: Record<keyof AIPremiumReport['sections'], string[]> = {
  introduction: ['일정', '우선순위', '대화', '수면', '피로', '마감'],
  personalityDeep: ['말투', '속도', '거리두기', '결정', '수면', '두통'],
  careerPath: ['일정', '우선순위', '협업', '결정 지연', '마감', '회의'],
  relationshipDynamics: ['말이 빨라짐', '단호해짐', '거리두기', '확정 서두름', '대화', '연락'],
  wealthPotential: ['지출', '저축', '계약', '예산', '마감', '우선순위'],
  healthGuidance: ['소화', '수면', '두통', '허리', '관절', '피로'],
  lifeMission: ['일정', '습관', '기록', '대화', '협업', '우선순위'],
  timingAdvice: ['오늘', '이번주', '이번 달', '마감', '대화', '결정'],
  actionPlan: ['일정', '우선순위', '협업', '수면', '대화', '마감'],
  conclusion: ['일정', '대화', '수면', '우선순위', '피로', '결정'],
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

export function sanitizeSectionNarrative(text: string): string {
  if (!text || typeof text !== 'string') return ''
  let cleaned = text
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  cleaned = stripBannedPhrases(cleaned)
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

function sanitizeTimingContradictions(text: string, input: MatrixCalculationInput): string {
  if (!text) return text
  let out = text
  if (input.currentSaeunElement && /세운\s*미입력/gi.test(out)) {
    out = out.replace(/세운\s*미입력/gi, '세운 흐름 반영')
  }
  if (input.currentDaeunElement && /대운\s*미입력/gi.test(out)) {
    out = out.replace(/대운\s*미입력/gi, '대운 흐름 반영')
  }
  return out
}

function toKoreanDomainLabel(domain: string): string {
  const map: Record<string, string> = {
    personality: '성향',
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    spirituality: '사명',
    timing: '시기',
  }
  return map[domain] || '흐름'
}

function humanizeCrossSetFact(set: GraphRAGCrossEvidenceSet): string {
  const pairMatch = set.astrologyEvidence.match(/^([A-Za-z]+)-([a-z]+)-([A-Za-z]+)/i)
  const p1 = pairMatch?.[1] || '행성'
  const aspectRaw = (pairMatch?.[2] || '').toLowerCase()
  const p2 = pairMatch?.[3] || '행성'
  const aspectKoMap: Record<string, string> = {
    conjunction: '합으로 만납니다',
    opposition: '대립으로 충돌 포인트가 생기기 쉽습니다',
    square: '각을 세우며 압박을 줍니다',
    trine: '자연스럽게 조화를 이룹니다',
    sextile: '부드럽게 기회를 엽니다',
    quincunx: '조정이 필요한 구간이 자주 생깁니다',
  }
  const aspectKo = aspectKoMap[aspectRaw] || '영향을 줍니다'
  const domains = set.overlapDomains.map(toKoreanDomainLabel).join(', ')
  return `${p1}과 ${p2} 흐름은 ${aspectKo}. ${domains} 쪽은 방향이 또렷해지기 쉽습니다.`
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
        `${item.title} 흐름이 이어집니다. 지금은 ${toKoreanDomainLabel(item.domain)} 쪽 선택이 더 중요합니다.`
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
      `타고난 구조상 ${input.dayMasterElement} 일간은 방향을 먼저 잡을 때 흔들림이 줄기 쉽습니다.`
    )
  }
  if (input.geokguk) {
    bullets.push(
      `타고난 구조상 ${input.geokguk} 성향은 역할과 책임을 분명히 할수록 성과가 올라가기 쉽습니다.`
    )
  }
  if (input.yongsin) {
    bullets.push(
      `용신이 ${input.yongsin} 쪽이면 생활 리듬을 그쪽으로 맞출 때 체감이 빨라지기 쉽습니다.`
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
      `현재는 ${activeTransits.join(', ')} 영향이 겹쳐 결정 속도를 조절하는 쪽이 낫습니다.`
    )
  }
  if (input.currentDaeunElement || input.currentSaeunElement) {
    bullets.push(
      `대운과 세운이 함께 움직이는 구간이라 단기 감정보다 중기 계획을 우선하는 쪽이 낫습니다.`
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
      '- 쉬운 한국어로 쓰고 설명형으로 풉니다.',
      '- 문장 길이는 15~35자로 맞춥니다.',
      '- 문단마다 4~7문장으로 작성합니다.',
      '- 구체 명사를 최소 2개 넣습니다.',
      `- 이 섹션 명사 후보: ${concreteNouns}`,
      '- 과장, 단정, 공포 조장은 금지합니다.',
      '- 불릿/번호 목록 없이 자연 문단으로만 작성합니다.',
      '- "이 구간의 핵심 초점은" 문장을 절대 쓰지 않습니다.',
      '- 다음 표현을 절대 쓰지 않습니다: 격국의 결, 긴장 신호, 상호작용, 시사, 결이, 프레임, 검증, 근거 세트.',
      '- 일상 표현을 사용합니다: 타고난 구조상, 충돌 포인트, 영향, ~하기 쉽습니다, ~쪽이 낫습니다.',
      '- 조언 문장은 "좋습니다/유의하셔야 합니다" 형태를 최대 2문장만 사용합니다.',
      draftText
        ? '아래 초안을 보강해서 더 정교하게 완성합니다.'
        : '아래 사실 묶음만으로 섹션을 작성합니다.',
      '사실 묶음:',
      facts,
      draftText ? `초안:\n${draftText}` : '',
      'JSON으로만 반환하세요: {"text":"..."}',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    'You are a combined Saju+Astrology counselor.',
    `Section: ${sectionKey}`,
    'Style rules:',
    '- Use short declarative honorific-style sentences.',
    '- Include concrete details and practical tips.',
    '- Avoid hype, absolutes, and fear language.',
    '- No bullet or numbered output; prose paragraphs only.',
    '- Never write "This section focuses on".',
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
    .split(/(?<=다\.)\s+|(?<=[.!?])\s+/u)
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
    /오늘|이번주|이번 달|이번달|이번 해|월간|주간|계약|일정|마감|회의|연락|수면|두통|허리|관절|소화|피로/i
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
    '그리고',
    '하지만',
    '에서',
    '으로',
    '입니다',
    '합니다',
    '흐름',
    '축',
    '현재',
    '기질',
    '성향',
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

// ===========================
// 메인 생성 함수
// ===========================

export async function generateAIPremiumReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {}
): Promise<AIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const detailLevel = options.detailLevel || 'detailed'

  // 1. 프롬프트 빌드
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
      sanitizeSectionNarrative(synthesized.sections?.text || draftText),
      input
    )

    const quality = evaluateSectionGate(sectionText, factPack, sectionKey)
    if (!quality.pass) {
      const repairPrompt = [
        buildSectionPrompt(sectionKey, factPack, lang, sectionText),
        lang === 'ko'
          ? `보강 규칙: 새 포인트를 최소 세 개 넣고, 구체 명사를 최소 두 개 넣고, 사실 묶음 반영 문장을 최소 두 개 넣어 주세요. 평균 문장 길이는 40자 이하로 맞추고 금지 표현은 제거해 주세요. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`
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
          sanitizeSectionNarrative(repaired.sections?.text || sectionText),
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
  const model = [...models].join(' -> ')

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
// 타이밍 리포트 생성 함수
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

  // 1. 매트릭스 요약 빌드
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. 프롬프트 빌드
  const prompt = buildTimingPrompt(
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
  )

  // 3. AI 백엔드 호출 + 품질 게이트(길이/교차 근거)
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

  // 4. 기간 라벨 생성
  const periodLabel = generatePeriodLabel(period, targetDate, lang)

  // 5. 점수 계산
  const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)

  // 6. 리포트 조립
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
// 테마별 리포트 생성 함수
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

  // 1. 매트릭스 요약 빌드
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. 프롬프트 빌드
  const prompt = buildThemedPrompt(
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
  )

  // 3. AI 백엔드 호출 + 품질 게이트(길이/교차 근거)
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

  // 4. 테마 메타데이터
  const themeMeta = THEME_META[theme]

  // 5. 점수 계산
  const themeScore = calculateThemeScore(theme, input.sibsinDistribution)

  // 6. 키워드 추출
  const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)

  // 7. 리포트 조립
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
