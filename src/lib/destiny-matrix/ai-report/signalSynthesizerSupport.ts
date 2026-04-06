import type { FusionReport, InsightDomain } from '../interpreter/types'
import type { MatrixHighlight, MatrixSummary, MatrixCalculationInput } from '../types'
import { getDomainSemantic, getLayerMeaning } from './matrixOntology'
import type { NormalizedSignal, SignalDomain, SignalPolarity } from './signalSynthesizer'

export const REQUIRED_CORE_DOMAINS: SignalDomain[] = ['career', 'wealth']
export const CLAIM_DOMAIN_PRIORITY: Record<SignalDomain, number> = {
  career: 1,
  wealth: 2,
  relationship: 3,
  health: 4,
  timing: 5,
  personality: 6,
  spirituality: 7,
  move: 8,
}

const K_WORD_PYEONJAE = '\uD3B8\uC7AC'
const K_WORD_JEONGJAE = '\uC815\uC7AC'
const K_WORD_MONEY = '\uC7AC\uBB3C'
const K_WORD_JONGGYEOL = '\uC885\uACB0'
const K_WORD_PAGOE = '\uD30C\uAD34'
const K_WORD_IBYEOL = '\uC774\uBCC4'
const K_WORD_PAMYEOL = '\uD30C\uBA78'

const FEAR_WORD_REPLACEMENTS: Array<[RegExp, string, string]> = [
  [new RegExp(K_WORD_JONGGYEOL, 'gi'), '\uC7AC\uC815\uC758', 'redefinition'],
  [new RegExp(K_WORD_PAGOE, 'gi'), '\uAD6C\uC870 \uC870\uC815', 'structural adjustment'],
  [new RegExp(K_WORD_IBYEOL, 'gi'), '\uAC70\uB9AC \uC870\uC808', 'distance tuning'],
  [new RegExp(K_WORD_PAMYEOL, 'gi'), '\uB9AC\uC14B', 'reset'],
  [/catastrophe|doom|collapse|destroy/gi, '\uB9AC\uC2A4\uD06C \uAD00\uB9AC', 'risk control'],
]

export const SECTION_DOMAIN_MAP: Record<string, SignalDomain[]> = {
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

const POSITIVE_SHINSAL_KEYS = [
  '귀인',
  '문창',
  '학당',
  '암록',
  '금여록',
  '건록',
  '제왕',
  '화개',
  '장성',
  '반안',
]
const NEGATIVE_SHINSAL_KEYS = [
  '살',
  '백호',
  '망신',
  '고신',
  '괴강',
  '현침',
  '귀문관',
  '병부',
  '공망',
  '원진',
]

function toLower(value: string): string {
  return String(value || '').toLowerCase()
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

const SHINSAL_POSITIVE_RE =
  /\uADC0\uC778|\uBB38\uCC3D|\uD559\uB2F9|\uC554\uB85D|\uAE08\uC5EC\uB85D|\uAC74\uB85D|\uC81C\uC655|\uD654\uAC1C|\uC7A5\uC131|\uBC18\uC548/
const SHINSAL_NEGATIVE_RE =
  /\uC0B4|\uBC31\uD638|\uB9DD\uC2E0|\uACE0\uC2E0|\uAD34\uAC15|\uD604\uCE68|\uADC0\uBB38\uAD00|\uBCD1\uBD80|\uACF5\uB9DD|\uC6D0\uC9C4/
const RELATION_STRENGTH_RE = /\uD569/
const RELATION_CAUTION_RE = /\uCDA9|\uD615|\uD30C|\uD574|\uC6D0\uC9C4|\uACF5\uB9DD/
const STAGE_STRENGTH_RE = /\uC784\uAD00|\uC655\uC9C0|\uC7A5\uC0DD|\uAC74\uB85D|\uC81C\uC655/
const STAGE_CAUTION_RE = /\uC1E0|\uBCD1|\uC0AC|\uBB18|\uC808/
const TRANSIT_STRENGTH_SET = new Set<NonNullable<MatrixCalculationInput['activeTransits']>[number]>(
  ['jupiterReturn', 'nodeReturn']
)
const TRANSIT_CAUTION_SET = new Set<NonNullable<MatrixCalculationInput['activeTransits']>[number]>([
  'saturnReturn',
  'uranusSquare',
  'neptuneSquare',
  'plutoTransit',
  'eclipse',
  'mercuryRetrograde',
  'venusRetrograde',
  'marsRetrograde',
  'jupiterRetrograde',
  'saturnRetrograde',
])
const ASPECT_STRENGTH_SET = new Set(['trine', 'sextile', 'conjunction'])
const ASPECT_CAUTION_SET = new Set(['square', 'opposition'])

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 5
  return Math.max(1, Math.min(10, Math.round(value)))
}

function computeRankScore(score: number, polarity: SignalPolarity): number {
  if (polarity === 'caution') return score + 0.25
  if (polarity === 'strength') return score + 0.15
  return score
}

function domainsByHouse(house: number): SignalDomain[] {
  if (house === 1) return ['personality']
  if (house === 2) return ['wealth']
  if (house === 3) return ['career', 'personality']
  if (house === 4) return ['relationship', 'move']
  if (house === 5) return ['relationship', 'personality']
  if (house === 6) return ['health', 'career']
  if (house === 7) return ['relationship']
  if (house === 8) return ['wealth', 'relationship']
  if (house === 9) return ['move', 'spirituality']
  if (house === 10) return ['career']
  if (house === 11) return ['relationship', 'personality']
  if (house === 12) return ['spirituality', 'health', 'move']
  return ['personality']
}

function inferPolarityFromShinsal(shinsal: string): SignalPolarity {
  if (SHINSAL_NEGATIVE_RE.test(shinsal)) return 'caution'
  if (SHINSAL_POSITIVE_RE.test(shinsal)) return 'strength'
  return 'balance'
}

function inferPolarityFromRelation(kind: string): SignalPolarity {
  if (RELATION_CAUTION_RE.test(kind)) return 'caution'
  if (RELATION_STRENGTH_RE.test(kind)) return 'strength'
  return 'balance'
}

function inferPolarityFromStage(stage: string): SignalPolarity {
  if (STAGE_CAUTION_RE.test(stage)) return 'caution'
  if (STAGE_STRENGTH_RE.test(stage)) return 'strength'
  return 'balance'
}

function inferPolarityFromAspect(type: string): SignalPolarity {
  const normalized = toLower(type)
  if (ASPECT_CAUTION_SET.has(normalized)) return 'caution'
  if (ASPECT_STRENGTH_SET.has(normalized)) return 'strength'
  return 'balance'
}

function inferPolarityFromTransit(
  transit: NonNullable<MatrixCalculationInput['activeTransits']>[number]
): SignalPolarity {
  if (TRANSIT_CAUTION_SET.has(transit)) return 'caution'
  if (TRANSIT_STRENGTH_SET.has(transit)) return 'strength'
  return 'balance'
}

function scoreFromPolarity(polarity: SignalPolarity, base = 6): number {
  if (polarity === 'strength') return clampScore(base + 1)
  if (polarity === 'caution') return clampScore(base)
  return clampScore(base - 1)
}

function splitTags(source: string): string[] {
  return source
    .split(/[^\p{L}\p{N}_:+-]+/u)
    .map((v) => v.trim())
    .filter(Boolean)
}

function inferDomainsFromText(raw: string): SignalDomain[] {
  const text = toLower(raw)
  const domains = new Set<SignalDomain>()
  if (/h10|jupiter|mc|career|work|job|promotion/.test(text)) domains.add('career')
  if (/h7|venus|mars|love|romance|relationship|partner/.test(text)) domains.add('relationship')
  if (/h6|health|stress|saturn|moon|routine|fatigue/.test(text)) domains.add('health')
  if (/h4|h9|h12|move|travel|relocat|foreign|abroad/.test(text)) domains.add('move')
  if (new RegExp(`${K_WORD_PYEONJAE}|${K_WORD_JEONGJAE}|${K_WORD_MONEY}`).test(raw)) {
    domains.add('wealth')
  }
  if (/wealth|money|finance|budget|cash|asset|saturn|jupiter/.test(text)) {
    if (/wealth|money|finance|budget|cash|asset/.test(text)) domains.add('wealth')
  }
  if (/timing|transit|daeun|seun|wolun|ilun|iljin/.test(text)) domains.add('timing')
  if (/personality|identity|self|h1|saturn/.test(text)) domains.add('personality')
  if (/spiritual|mission|purpose|node|chiron/.test(text)) domains.add('spirituality')
  return [...domains]
}

function inferSignalFamily(
  input: {
    layer: number
    rowKey: string
    colKey: string
    keyword?: string
    sajuBasis?: string
    astroBasis?: string
    domainHints: SignalDomain[]
    polarity: SignalPolarity
    tags?: string[]
  }
): string {
  const text = [
    input.rowKey,
    input.colKey,
    input.keyword || '',
    input.sajuBasis || '',
    input.astroBasis || '',
    ...(input.tags || []),
  ]
    .join(' ')
    .toLowerCase()

  if (/h10|mc|career|promotion|public|visibility|lead|jupiter/.test(text)) {
    return input.polarity === 'caution' ? 'career_guardrail' : 'career_growth'
  }
  if (/h7|relationship|partner|love|venus|mars|reconciliation|boundary/.test(text)) {
    return input.polarity === 'caution' ? 'relationship_guardrail' : 'relationship_growth'
  }
  if (new RegExp(`${K_WORD_PYEONJAE}|${K_WORD_JEONGJAE}|${K_WORD_MONEY}`).test(text) || /wealth|money|finance|budget|asset|cash/.test(text)) {
    return input.polarity === 'caution' ? 'wealth_guardrail' : 'wealth_growth'
  }
  if (/health|stress|fatigue|routine|recovery|h6|moon|saturn/.test(text)) {
    return input.polarity === 'caution' ? 'health_guardrail' : 'health_recovery'
  }
  if (/move|travel|foreign|relocat|h9|h12/.test(text)) {
    return input.polarity === 'caution' ? 'movement_guardrail' : 'movement_window'
  }
  if (/node|chiron|purpose|mission|spiritual/.test(text)) {
    return input.polarity === 'caution' ? 'mission_reframing' : 'mission_alignment'
  }
  if (/timing|transit|daeun|seun|wolun|iljin|retrograde|return/.test(text) || input.layer === 4) {
    return input.polarity === 'caution' ? 'timing_guardrail' : 'timing_window'
  }
  if (/support|helper|mentor|network|samhap|sextile/.test(text)) {
    return 'support_bridge'
  }
  if (/conflict|square|opposition|chung|reset/.test(text)) {
    return 'transformation_guardrail'
  }

  const leadDomain = input.domainHints[0] || 'personality'
  if (leadDomain === 'career') return input.polarity === 'caution' ? 'career_guardrail' : 'career_growth'
  if (leadDomain === 'relationship') return input.polarity === 'caution' ? 'relationship_guardrail' : 'relationship_growth'
  if (leadDomain === 'wealth') return input.polarity === 'caution' ? 'wealth_guardrail' : 'wealth_growth'
  if (leadDomain === 'health') return input.polarity === 'caution' ? 'health_guardrail' : 'health_recovery'
  if (leadDomain === 'move') return input.polarity === 'caution' ? 'movement_guardrail' : 'movement_window'
  if (leadDomain === 'timing') return input.polarity === 'caution' ? 'timing_guardrail' : 'timing_window'
  if (leadDomain === 'spirituality') return input.polarity === 'caution' ? 'mission_reframing' : 'mission_alignment'
  return input.polarity === 'caution' ? 'identity_guardrail' : 'identity_drive'
}

function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasMeaningfulSignalValue(value: unknown): boolean {
  if (value === true) return true
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false
    if (['false', '0', 'none', 'null', 'undefined', 'off', 'no'].includes(normalized)) return false
    return true
  }
  if (Array.isArray(value)) return value.length > 0
  if (isNonEmptyRecord(value)) return Object.keys(value).length > 0
  return false
}

function summarizeSignalValue(value: unknown): string {
  if (value === true) return 'true'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value.trim().slice(0, 48)
  if (Array.isArray(value)) return `array(${value.length})`
  if (isNonEmptyRecord(value)) return `object(${Object.keys(value).slice(0, 6).join(',')})`
  return String(value)
}

function scoreBoostFromSignalValue(value: unknown): number {
  if (Array.isArray(value)) return Math.min(2, Math.floor(value.length / 2))
  if (isNonEmptyRecord(value)) return Math.min(2, Math.floor(Object.keys(value).length / 3))
  if (typeof value === 'number') return Math.min(2, Math.max(0, Math.floor(Math.abs(value) / 20)))
  if (typeof value === 'string') return value.length > 24 ? 1 : 0
  return 0
}

function fallbackDomainsByLayer(layer: number): SignalDomain[] {
  if (layer === 4) return ['timing']
  if (layer === 6) return ['career', 'relationship']
  if (layer === 3) return ['career', 'relationship', 'wealth']
  if (layer === 5) return ['relationship']
  if (layer === 7 || layer === 10) return ['spirituality', 'personality']
  return ['personality']
}

function sanitizeFearWords(text: string, lang: 'ko' | 'en'): string {
  let out = text || ''
  for (const [regex, koValue, enValue] of FEAR_WORD_REPLACEMENTS) {
    out = out.replace(regex, lang === 'ko' ? koValue : enValue)
  }
  return out
}

function normalizeHighlight(
  point: MatrixHighlight,
  polarity: SignalPolarity,
  lang: 'ko' | 'en'
): NormalizedSignal {
  const keyword = point.cell.interaction.keyword || point.cell.interaction.keywordEn || ''
  const tags = uniq(
    [
      ...splitTags(point.rowKey),
      ...splitTags(point.colKey),
      ...splitTags(keyword),
      ...splitTags(point.cell.sajuBasis || ''),
      ...splitTags(point.cell.astroBasis || ''),
    ].filter(Boolean)
  )
  const domainHints = uniq([
    ...inferDomainsFromText(
      [point.rowKey, point.colKey, keyword, point.cell.sajuBasis, point.cell.astroBasis]
        .filter(Boolean)
        .join(' ')
    ),
    ...fallbackDomainsByLayer(point.layer),
  ])
  const semanticDomain = (domainHints[0] || 'personality') as SignalDomain
  const semantic = getDomainSemantic(point.layer, semanticDomain)
  const score = Number(point.cell.interaction.score || 0)
  const rankScore = computeRankScore(score, polarity)
  return {
    id: `L${point.layer}:${point.rowKey}:${point.colKey}`,
    layer: point.layer,
    rowKey: point.rowKey,
    colKey: point.colKey,
    family: inferSignalFamily({
      layer: point.layer,
      rowKey: point.rowKey,
      colKey: point.colKey,
      keyword,
      sajuBasis: point.cell.sajuBasis,
      astroBasis: point.cell.astroBasis,
      domainHints,
      polarity,
      tags,
    }),
    domainHints,
    polarity,
    score,
    rankScore,
    keyword,
    sajuBasis: point.cell.sajuBasis,
    astroBasis: point.cell.astroBasis,
    advice: sanitizeFearWords(point.cell.advice || '', lang),
    tags,
    semantic: {
      layerMeaningKo: getLayerMeaning(point.layer, 'ko'),
      layerMeaningEn: getLayerMeaning(point.layer, 'en'),
      focusKo: semantic.focusKo,
      focusEn: semantic.focusEn,
      riskKo: semantic.riskKo,
      riskEn: semantic.riskEn,
    },
  }
}

export function toPolarityFromCategory(category: string): SignalPolarity {
  if (category === 'strength' || category === 'opportunity') return 'strength'
  if (category === 'balance') return 'balance'
  return 'caution'
}


export {
  normalizeHighlight,
  inferSignalFamily,
  inferDomainsFromText,
  domainsByHouse,
  scoreBoostFromSignalValue,
  summarizeSignalValue,
  hasMeaningfulSignalValue,
  isNonEmptyRecord,
  fallbackDomainsByLayer,
  sanitizeFearWords,
  splitTags,
  scoreFromPolarity,
  inferPolarityFromTransit,
  inferPolarityFromAspect,
  inferPolarityFromStage,
  inferPolarityFromRelation,
  inferPolarityFromShinsal,
  computeRankScore,
  clampScore,
  uniq,
  toLower,
}
