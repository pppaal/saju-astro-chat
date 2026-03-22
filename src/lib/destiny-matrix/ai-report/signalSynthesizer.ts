import type { FusionReport, InsightDomain } from '../interpreter/types'
import type { MatrixHighlight, MatrixSummary } from '../types'
import type { MatrixCalculationInput } from '../types'
import type { ActivationEngineResult } from '../core/activationEngine'
import type { RuleEngineResult } from '../core/ruleEngine'
import type { StateEngineResult } from '../core/stateEngine'
import { getDomainSemantic, getLayerMeaning } from './matrixOntology'

export type SignalPolarity = 'strength' | 'balance' | 'caution'

export type SignalDomain = InsightDomain | 'relationship' | 'wealth' | 'move'

export interface NormalizedSignal {
  id: string
  layer: number
  rowKey: string
  colKey: string
  family: string
  domainHints: SignalDomain[]
  polarity: SignalPolarity
  score: number
  rankScore: number
  keyword: string
  sajuBasis?: string
  astroBasis?: string
  advice?: string
  tags: string[]
  semantic?: {
    layerMeaningKo: string
    layerMeaningEn: string
    focusKo: string
    focusEn: string
    riskKo: string
    riskEn: string
  }
}

export interface SynthesizedClaim {
  claimId: string
  domain: SignalDomain
  thesis: string
  evidence: string[]
  riskControl: string
  actions: string[]
}

export interface SignalSynthesisResult {
  normalizedSignals: NormalizedSignal[]
  selectedSignals: NormalizedSignal[]
  claims: SynthesizedClaim[]
  signalsById: Record<string, NormalizedSignal>
  leadSignalIds?: string[]
  supportSignalIds?: string[]
  suppressedSignalIds?: string[]
}

interface SynthesisInput {
  lang: 'ko' | 'en'
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
  matrixInput?: MatrixCalculationInput
  resolvedContext?: {
    activation: ActivationEngineResult
    rules: RuleEngineResult
    states: StateEngineResult
  }
}

const REQUIRED_CORE_DOMAINS: SignalDomain[] = ['career', 'wealth']
const CLAIM_DOMAIN_PRIORITY: Record<SignalDomain, number> = {
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

const SECTION_DOMAIN_MAP: Record<string, SignalDomain[]> = {
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

function toPolarityFromCategory(category: string): SignalPolarity {
  if (category === 'strength' || category === 'opportunity') return 'strength'
  if (category === 'balance') return 'balance'
  return 'caution'
}

function normalizeFromTopInsights(report: FusionReport): NormalizedSignal[] {
  return (report.topInsights || []).map((insight, index) => {
    const polarity = toPolarityFromCategory(insight.category)
    const score = Number(insight.score || insight.weightedScore || 0)
    const rankScore = computeRankScore(score, polarity)
    const domain = (insight.domain as SignalDomain) || 'personality'
    const semantic = getDomainSemantic(0, domain)
    return {
      id: `I${index}:${insight.id || insight.title}`,
      layer: 0,
      rowKey: insight.domain || 'personality',
      colKey: insight.category,
      family: inferSignalFamily({
        layer: 0,
        rowKey: insight.domain || 'personality',
        colKey: insight.category,
        keyword: insight.title || insight.description || '',
        sajuBasis: insight.sources?.[0]?.sajuFactor,
        astroBasis: insight.sources?.[0]?.astroFactor,
        domainHints: [domain],
        polarity,
        tags: uniq(splitTags(`${insight.title} ${insight.description || ''}`)),
      }),
      domainHints: [domain],
      polarity,
      score,
      rankScore,
      keyword: insight.title || insight.description || '',
      sajuBasis: insight.sources?.[0]?.sajuFactor,
      astroBasis: insight.sources?.[0]?.astroFactor,
      advice: insight.actionItems?.[0]?.text,
      tags: uniq(splitTags(`${insight.title} ${insight.description || ''}`)),
      semantic: {
        layerMeaningKo: getLayerMeaning(0, 'ko'),
        layerMeaningEn: getLayerMeaning(0, 'en'),
        focusKo: semantic.focusKo,
        focusEn: semantic.focusEn,
        riskKo: semantic.riskKo,
        riskEn: semantic.riskEn,
      },
    }
  })
}

function buildSyntheticSignal(input: {
  id: string
  layer: number
  rowKey: string
  colKey: string
  polarity: SignalPolarity
  score: number
  keyword: string
  sajuBasis?: string
  astroBasis?: string
  advice?: string
  tags?: string[]
  domainHints?: SignalDomain[]
  lang: 'ko' | 'en'
}): NormalizedSignal {
  const domainHints = uniq(
    input.domainHints && input.domainHints.length > 0
      ? input.domainHints
      : fallbackDomainsByLayer(input.layer)
  )
  const semanticDomain = (domainHints[0] || 'personality') as SignalDomain
  const semantic = getDomainSemantic(input.layer, semanticDomain)
  const score = clampScore(input.score)
  const rankScore = computeRankScore(score, input.polarity)
  return {
    id: input.id,
    layer: input.layer,
    rowKey: input.rowKey,
    colKey: input.colKey,
    family: inferSignalFamily({
      layer: input.layer,
      rowKey: input.rowKey,
      colKey: input.colKey,
      keyword: input.keyword,
      sajuBasis: input.sajuBasis,
      astroBasis: input.astroBasis,
      domainHints,
      polarity: input.polarity,
      tags: input.tags,
    }),
    domainHints,
    polarity: input.polarity,
    score,
    rankScore,
    keyword: input.keyword,
    sajuBasis: input.sajuBasis,
    astroBasis: input.astroBasis,
    advice: sanitizeFearWords(input.advice || '', input.lang),
    tags: uniq(input.tags || []),
    semantic: {
      layerMeaningKo: getLayerMeaning(input.layer, 'ko'),
      layerMeaningEn: getLayerMeaning(input.layer, 'en'),
      focusKo: semantic.focusKo,
      focusEn: semantic.focusEn,
      riskKo: semantic.riskKo,
      riskEn: semantic.riskEn,
    },
  }
}

function normalizeSnapshotSignals(
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): NormalizedSignal[] {
  const out: NormalizedSignal[] = []
  const snapshotConfigs: Array<{
    key: 'sajuSnapshot' | 'astrologySnapshot' | 'crossSnapshot'
    layer: number
    rowKey: string
    baseDomainHints: SignalDomain[]
  }> = [
    {
      key: 'sajuSnapshot',
      layer: 7,
      rowKey: 'snapshot_saju',
      baseDomainHints: ['personality', 'timing'],
    },
    {
      key: 'astrologySnapshot',
      layer: 10,
      rowKey: 'snapshot_astro',
      baseDomainHints: ['timing', 'career'],
    },
    {
      key: 'crossSnapshot',
      layer: 10,
      rowKey: 'snapshot_cross',
      baseDomainHints: ['timing', 'relationship'],
    },
  ]
  const preferredKeys: Record<'sajuSnapshot' | 'astrologySnapshot' | 'crossSnapshot', string[]> = {
    sajuSnapshot: ['unse', 'sinsal', 'advancedAnalysis', 'facts', 'pillars'],
    astrologySnapshot: ['natalChart', 'natalAspects', 'advancedAstroSignals', 'transits'],
    crossSnapshot: ['crossEvidence', 'crossAgreement', 'source', 'category'],
  }

  for (const config of snapshotConfigs) {
    const snapshot = matrixInput[config.key]
    if (!isNonEmptyRecord(snapshot) || Object.keys(snapshot).length === 0) continue

    const snapshotKeys = Object.keys(snapshot)
    const keyCandidates = [
      ...preferredKeys[config.key].filter((key) => snapshotKeys.includes(key)),
      ...snapshotKeys.filter((key) => !preferredKeys[config.key].includes(key)),
    ].slice(0, 4)

    out.push(
      buildSyntheticSignal({
        id: `COV:L${config.layer}:${config.rowKey}:present`,
        layer: config.layer,
        rowKey: config.rowKey,
        colKey: 'present',
        polarity: 'balance',
        score: clampScore(5 + Math.min(2, Math.floor(snapshotKeys.length / 4))),
        keyword: `${config.rowKey} snapshot`,
        sajuBasis: `${config.key}.keys=${snapshotKeys.slice(0, 8).join(',')}`,
        astroBasis: `${config.key} available`,
        advice:
          lang === 'ko'
            ? '스냅샷 근거는 단일 문장보다 교차 근거 묶음으로 읽을 때 정확도가 올라갑니다.'
            : 'Snapshot evidence is most reliable when interpreted as a cross-evidence bundle.',
        tags: ['coverage', 'snapshot', config.key],
        domainHints: config.baseDomainHints,
        lang,
      })
    )

    for (const key of keyCandidates) {
      const value = snapshot[key]
      if (!hasMeaningfulSignalValue(value)) continue
      out.push(
        buildSyntheticSignal({
          id: `COV:L${config.layer}:${config.rowKey}:${key}`,
          layer: config.layer,
          rowKey: config.rowKey,
          colKey: key,
          polarity: 'balance',
          score: clampScore(5 + scoreBoostFromSignalValue(value)),
          keyword: `${config.rowKey} ${key}`,
          sajuBasis: `${config.key}.${key}=${summarizeSignalValue(value)}`,
          astroBasis: `${config.key}.${key} active`,
          advice:
            lang === 'ko'
              ? '해당 스냅샷 키는 코어 신호를 보강하는 보조 증거로 사용하세요.'
              : 'Use this snapshot key as supporting evidence for core signals.',
          tags: ['coverage', 'snapshot', config.key, key],
          domainHints: uniq([...config.baseDomainHints, ...inferDomainsFromText(key)]),
          lang,
        })
      )
    }
  }

  return out
}

function normalizeFromMatrixInput(
  matrixInput: MatrixCalculationInput | undefined,
  lang: 'ko' | 'en'
): NormalizedSignal[] {
  if (!matrixInput) return []

  const out: NormalizedSignal[] = []

  const resolveAstroTimingIndex = (): MatrixCalculationInput['astroTimingIndex'] | undefined => {
    if (matrixInput.astroTimingIndex) return matrixInput.astroTimingIndex
    const candidate = matrixInput.crossSnapshot?.astroTimingIndex
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return undefined
    const decade = Number(candidate.decade)
    const annual = Number(candidate.annual)
    const monthly = Number(candidate.monthly)
    const daily = Number(candidate.daily)
    const confidence = Number(candidate.confidence)
    const evidenceCount = Number(candidate.evidenceCount)
    if (
      [decade, annual, monthly, daily, confidence, evidenceCount].every((v) => Number.isFinite(v))
    ) {
      return {
        decade,
        annual,
        monthly,
        daily,
        confidence,
        evidenceCount: Math.max(0, Math.floor(evidenceCount)),
      }
    }
    return undefined
  }
  const astroTimingIndex = resolveAstroTimingIndex()

  if (matrixInput.geokguk) {
    out.push(
      buildSyntheticSignal({
        id: `COV:L7:geokguk:${matrixInput.geokguk}`,
        layer: 7,
        rowKey: `geokguk_${matrixInput.geokguk}`,
        colKey: 'profile',
        polarity: 'strength',
        score: 7,
        keyword: `Geokguk ${matrixInput.geokguk}`,
        sajuBasis: `geokguk=${matrixInput.geokguk}`,
        astroBasis: 'advanced profile alignment',
        advice:
          lang === 'ko'
            ? '격국 신호를 실행 기준으로 고정하고, 역할/우선순위 충돌을 먼저 정리하세요.'
            : 'Use geokguk as a stable execution lens and resolve role-priority conflicts first.',
        tags: ['coverage', 'geokguk', String(matrixInput.geokguk)],
        domainHints: ['career', 'personality'],
        lang,
      })
    )
  }

  if (matrixInput.yongsin) {
    out.push(
      buildSyntheticSignal({
        id: `COV:L7:yongsin:${matrixInput.yongsin}`,
        layer: 7,
        rowKey: `yongsin_${matrixInput.yongsin}`,
        colKey: 'core',
        polarity: 'balance',
        score: 6,
        keyword: `Yongsin ${matrixInput.yongsin}`,
        sajuBasis: `yongsin=${matrixInput.yongsin}`,
        astroBasis: 'core element balancing',
        advice:
          lang === 'ko'
            ? '용신 기준으로 과열 영역을 줄이고 보완 루틴을 먼저 배치하세요.'
            : 'Use yongsin as your balancing axis and schedule compensating routines first.',
        tags: ['coverage', 'yongsin', String(matrixInput.yongsin)],
        domainHints: ['personality', 'health', 'wealth'],
        lang,
      })
    )
  }

  if (matrixInput.currentDaeunElement) {
    out.push(
      buildSyntheticSignal({
        id: `COV:L4:daeun:${matrixInput.currentDaeunElement}`,
        layer: 4,
        rowKey: `daeun_${matrixInput.currentDaeunElement}`,
        colKey: 'active',
        polarity: 'balance',
        score: 6,
        keyword: `Daeun ${matrixInput.currentDaeunElement}`,
        sajuBasis: `daeun=${matrixInput.currentDaeunElement}`,
        astroBasis: 'timing cycle active',
        advice:
          lang === 'ko'
            ? '대운 흐름이 작동 중인 영역은 단기 성과보다 중기 누적을 기준으로 운영하세요.'
            : 'With active daeun flow, optimize for medium-term accumulation over short spikes.',
        tags: ['coverage', 'daeun', String(matrixInput.currentDaeunElement)],
        domainHints: ['timing', 'career', 'wealth'],
        lang,
      })
    )
  }

  if (matrixInput.currentSaeunElement) {
    out.push(
      buildSyntheticSignal({
        id: `COV:L4:saeun:${matrixInput.currentSaeunElement}`,
        layer: 4,
        rowKey: `saeun_${matrixInput.currentSaeunElement}`,
        colKey: 'active',
        polarity: 'balance',
        score: 6,
        keyword: `Saeun ${matrixInput.currentSaeunElement}`,
        sajuBasis: `saeun=${matrixInput.currentSaeunElement}`,
        astroBasis: 'annual cycle active',
        advice:
          lang === 'ko'
            ? '세운 신호가 바뀌는 구간은 확정 전 검증 슬롯을 고정하세요.'
            : 'In annual cycle shifts, lock verification windows before final commitment.',
        tags: ['coverage', 'saeun', String(matrixInput.currentSaeunElement)],
        domainHints: ['timing', 'career', 'relationship'],
        lang,
      })
    )
  }

  if (matrixInput.currentWolunElement) {
    out.push(
      buildSyntheticSignal({
        id: `COV:L4:wolun:${matrixInput.currentWolunElement}`,
        layer: 4,
        rowKey: `wolun_${matrixInput.currentWolunElement}`,
        colKey: 'active',
        polarity: 'balance',
        score: 5,
        keyword: `Wolun ${matrixInput.currentWolunElement}`,
        sajuBasis: `wolun=${matrixInput.currentWolunElement}`,
        astroBasis: 'monthly timing cycle active',
        advice:
          lang === 'ko'
            ? '월운 신호는 이번 달의 실행 순서를 다듬는 데 쓰고, 과도한 확정보다 우선순위 재배치에 활용하세요.'
            : "Use wolun signals to refine this month's execution order before making hard commitments.",
        tags: ['coverage', 'wolun', String(matrixInput.currentWolunElement)],
        domainHints: ['timing', 'career', 'move'],
        lang,
      })
    )
  }

  if (matrixInput.currentIljinElement || matrixInput.currentIljinDate) {
    const iljinKey = matrixInput.currentIljinElement || 'active'
    out.push(
      buildSyntheticSignal({
        id: `COV:L4:iljin:${iljinKey}`,
        layer: 4,
        rowKey: `iljin_${iljinKey}`,
        colKey: matrixInput.currentIljinDate || 'today',
        polarity: 'balance',
        score: 4,
        keyword: `Iljin ${iljinKey}`,
        sajuBasis: `iljin=${matrixInput.currentIljinDate || 'today'}${matrixInput.currentIljinElement ? `/${matrixInput.currentIljinElement}` : ''}`,
        astroBasis: 'daily timing cycle active',
        advice:
          lang === 'ko'
            ? '일진 신호는 당일 확정 여부보다 순서와 검증 게이트를 조정하는 용도로 사용하세요.'
            : 'Use iljin signals to tune same-day sequencing and verification gates rather than overcommitting.',
        tags: [
          'coverage',
          'iljin',
          String(iljinKey),
          ...(matrixInput.currentIljinDate ? [matrixInput.currentIljinDate] : []),
        ],
        domainHints: ['timing', 'relationship', 'move'],
        lang,
      })
    )
  }

  if (
    matrixInput.currentDaeunElement &&
    matrixInput.currentSaeunElement &&
    matrixInput.currentDaeunElement === matrixInput.currentSaeunElement
  ) {
    out.push(
      buildSyntheticSignal({
        id: `COV:L4:daeun-saeun-sync:${matrixInput.currentDaeunElement}`,
        layer: 4,
        rowKey: 'daeun_saeun_sync',
        colKey: String(matrixInput.currentDaeunElement),
        polarity: 'strength',
        score: 8,
        keyword: 'Daeun/Saeun sync',
        sajuBasis: `daeun=${matrixInput.currentDaeunElement}, saeun=${matrixInput.currentSaeunElement}`,
        astroBasis: 'timing resonance',
        advice:
          lang === 'ko'
            ? '장기·연간 흐름이 같은 방향이면 핵심 과제 1~2개에 집중도를 높이세요.'
            : 'When long/annual timing aligns, increase focus on 1-2 core priorities.',
        tags: ['coverage', 'timing-sync'],
        domainHints: ['timing', 'career', 'wealth'],
        lang,
      })
    )
  }

  if (astroTimingIndex) {
    const horizons: Array<{
      key: 'decade' | 'annual' | 'monthly' | 'daily'
      label: string
      value: number
      domains: SignalDomain[]
    }> = [
      {
        key: 'decade',
        label: '10Y',
        value: astroTimingIndex.decade,
        domains: ['timing', 'career'],
      },
      { key: 'annual', label: '1Y', value: astroTimingIndex.annual, domains: ['timing', 'wealth'] },
      {
        key: 'monthly',
        label: '1M',
        value: astroTimingIndex.monthly,
        domains: ['timing', 'relationship'],
      },
      { key: 'daily', label: '1D', value: astroTimingIndex.daily, domains: ['timing', 'move'] },
    ]
    for (const horizon of horizons) {
      if (horizon.value <= 0) continue
      const activation = Math.max(0, Math.min(1, horizon.value))
      out.push(
        buildSyntheticSignal({
          id: `COV:L4:astro-timing:${horizon.key}`,
          layer: 4,
          rowKey: `astro_timing_${horizon.key}`,
          colKey: `active_${horizon.label}`,
          polarity: activation >= 0.65 ? 'strength' : activation >= 0.45 ? 'balance' : 'caution',
          score: clampScore(3 + Math.round(activation * 7)),
          keyword: `Astro timing ${horizon.label}`,
          sajuBasis: 'normalized-time-scale',
          astroBasis: `astroTimingIndex.${horizon.key}=${activation.toFixed(2)} (confidence=${astroTimingIndex.confidence.toFixed(2)}, evidence=${astroTimingIndex.evidenceCount})`,
          advice:
            lang === 'ko'
              ? '점성 원형 신호를 시간축으로 정규화한 보조 인덱스입니다. 사주 타이밍과 함께 교차 확인하세요.'
              : 'Normalized astrology timing index. Cross-check with Saju timing before commitment.',
          tags: ['coverage', 'astro-timing', horizon.key],
          domainHints: horizon.domains,
          lang,
        })
      )
    }

    if (matrixInput.currentDaeunElement && astroTimingIndex.decade >= 0.45) {
      out.push(
        buildSyntheticSignal({
          id: 'COV:L4:cross-timing:decade',
          layer: 4,
          rowKey: 'cross_timing_decade',
          colKey: String(matrixInput.currentDaeunElement),
          polarity: 'strength',
          score: 8,
          keyword: 'Decade cross timing sync',
          sajuBasis: `daeun=${matrixInput.currentDaeunElement}`,
          astroBasis: `astroTimingIndex.decade=${astroTimingIndex.decade.toFixed(2)}`,
          advice:
            lang === 'ko'
              ? '장기 방향성은 확장보다 기준 고정에 유리합니다.'
              : 'Long-cycle alignment favors thesis locking before expansion.',
          tags: ['coverage', 'cross-timing', 'decade'],
          domainHints: ['timing', 'career'],
          lang,
        })
      )
    }
    if (matrixInput.currentSaeunElement && astroTimingIndex.annual >= 0.45) {
      out.push(
        buildSyntheticSignal({
          id: 'COV:L4:cross-timing:annual',
          layer: 4,
          rowKey: 'cross_timing_annual',
          colKey: String(matrixInput.currentSaeunElement),
          polarity: 'strength',
          score: 7,
          keyword: 'Annual cross timing sync',
          sajuBasis: `saeun=${matrixInput.currentSaeunElement}`,
          astroBasis: `astroTimingIndex.annual=${astroTimingIndex.annual.toFixed(2)}`,
          advice:
            lang === 'ko'
              ? '연간 결정은 검증-확정 분리를 유지하세요.'
              : 'For annual decisions, keep verify/commit separation.',
          tags: ['coverage', 'cross-timing', 'annual'],
          domainHints: ['timing', 'wealth'],
          lang,
        })
      )
    }
    if (matrixInput.currentWolunElement && astroTimingIndex.monthly >= 0.45) {
      out.push(
        buildSyntheticSignal({
          id: 'COV:L4:cross-timing:monthly',
          layer: 4,
          rowKey: 'cross_timing_monthly',
          colKey: String(matrixInput.currentWolunElement),
          polarity: 'balance',
          score: 6,
          keyword: 'Monthly cross timing sync',
          sajuBasis: `wolun=${matrixInput.currentWolunElement}`,
          astroBasis: `astroTimingIndex.monthly=${astroTimingIndex.monthly.toFixed(2)}`,
          advice:
            lang === 'ko'
              ? '월간 운영은 과업 수를 줄여 완결률을 올리세요.'
              : 'For monthly pacing, reduce active task count and maximize closure.',
          tags: ['coverage', 'cross-timing', 'monthly'],
          domainHints: ['timing', 'relationship'],
          lang,
        })
      )
    }
    if (
      (matrixInput.currentIljinElement || matrixInput.currentIljinDate) &&
      astroTimingIndex.daily >= 0.45
    ) {
      out.push(
        buildSyntheticSignal({
          id: 'COV:L4:cross-timing:daily',
          layer: 4,
          rowKey: 'cross_timing_daily',
          colKey:
            matrixInput.currentIljinDate || String(matrixInput.currentIljinElement || 'today'),
          polarity: 'balance',
          score: 5,
          keyword: 'Daily cross timing sync',
          sajuBasis: `iljin=${matrixInput.currentIljinDate || 'today'}${matrixInput.currentIljinElement ? `/${matrixInput.currentIljinElement}` : ''}`,
          astroBasis: `astroTimingIndex.daily=${astroTimingIndex.daily.toFixed(2)}`,
          advice:
            lang === 'ko'
              ? '당일 의사결정은 실행과 확정을 분리해 리스크를 낮추세요.'
              : 'For same-day decisions, split execution and commitment to reduce risk.',
          tags: ['coverage', 'cross-timing', 'daily'],
          domainHints: ['timing', 'move'],
          lang,
        })
      )
    }
  }

  for (const transit of matrixInput.activeTransits || []) {
    const polarity = inferPolarityFromTransit(transit)
    out.push(
      buildSyntheticSignal({
        id: `COV:L4:transit:${transit}`,
        layer: 4,
        rowKey: 'transit',
        colKey: transit,
        polarity,
        score: scoreFromPolarity(polarity, 6),
        keyword: `Transit ${transit}`,
        sajuBasis: 'timing overlay',
        astroBasis: `activeTransit=${transit}`,
        advice:
          polarity === 'caution'
            ? lang === 'ko'
              ? '변동 트랜짓 구간은 당일 확정보다 24시간 재확인으로 오차를 줄이세요.'
              : 'During volatile transits, prefer a 24h recheck before final commitment.'
            : lang === 'ko'
              ? '트랜짓 상승 구간은 실행 블록을 먼저 확보해 흐름을 선점하세요.'
              : 'In supportive transit windows, lock execution blocks early.',
        tags: ['coverage', 'transit', transit],
        domainHints: ['timing', ...inferDomainsFromText(transit)],
        lang,
      })
    )
  }

  for (const [stage, count] of Object.entries(matrixInput.twelveStages || {})) {
    const numeric = Number(count || 0)
    if (!Number.isFinite(numeric) || numeric <= 0) continue
    const polarity = inferPolarityFromStage(stage)
    out.push(
      buildSyntheticSignal({
        id: `COV:L6:stage:${stage}`,
        layer: 6,
        rowKey: stage,
        colKey: `active_${numeric}`,
        polarity,
        score: scoreFromPolarity(polarity, Math.min(8, 5 + numeric)),
        keyword: `Stage ${stage}`,
        sajuBasis: `twelveStage=${stage}(${numeric})`,
        astroBasis: 'life-force stage overlay',
        advice:
          lang === 'ko'
            ? '운성 신호는 속도보다 리듬 관리에 반영해 손실 구간을 줄이세요.'
            : 'Use stage signals to manage rhythm, not just speed, and reduce loss windows.',
        tags: ['coverage', 'twelve-stage', stage],
        domainHints: ['career', 'relationship', 'timing'],
        lang,
      })
    )
  }

  for (const relation of matrixInput.relations || []) {
    const kind = String(relation.kind || '')
    const polarity = inferPolarityFromRelation(kind)
    out.push(
      buildSyntheticSignal({
        id: `COV:L5:relation:${kind}:${(relation.pillars || []).join('-') || 'na'}`,
        layer: 5,
        rowKey: kind || 'relation',
        colKey: (relation.pillars || []).join('-') || 'active',
        polarity,
        score: scoreFromPolarity(polarity, 6),
        keyword: `Relation ${kind || 'active'}`,
        sajuBasis: `relation=${kind || 'active'}`,
        astroBasis: relation.detail || relation.note || 'relation-aspect bridge',
        advice:
          polarity === 'caution'
            ? lang === 'ko'
              ? '관계 긴장 신호가 있으면 결론보다 조건 확인 문장을 먼저 고정하세요.'
              : 'With relational tension, lock condition-confirmation statements before conclusions.'
            : lang === 'ko'
              ? '관계 시너지는 역할·책임 경계를 먼저 합의할 때 성과로 연결됩니다.'
              : 'Relational synergy converts better when role and ownership boundaries are explicit.',
        tags: ['coverage', 'relation', kind || 'active'],
        domainHints: ['relationship', 'timing'],
        lang,
      })
    )
  }

  for (const shinsal of matrixInput.shinsalList || []) {
    const shinsalKey = String(shinsal)
    const polarity = inferPolarityFromShinsal(shinsalKey)
    const moveHint = /\uC5ED\uB9C8/.test(shinsalKey)
    const relationshipHint = /\uB3C4\uD654|\uD64D\uC5FC/.test(shinsalKey)
    out.push(
      buildSyntheticSignal({
        id: `COV:L8:shinsal:${shinsalKey}`,
        layer: 8,
        rowKey: shinsalKey,
        colKey: 'active',
        polarity,
        score: scoreFromPolarity(polarity, 6),
        keyword: `Shinsal ${shinsalKey}`,
        sajuBasis: `shinsal=${shinsalKey}`,
        astroBasis: 'special pattern overlay',
        advice:
          lang === 'ko'
            ? '신살 신호는 단일 해석보다 교차 근거와 함께 사용해야 정확도가 올라갑니다.'
            : 'Use shinsal as a cross-evidence signal rather than a standalone verdict.',
        tags: ['coverage', 'shinsal', shinsalKey],
        domainHints: moveHint
          ? ['move', 'timing']
          : relationshipHint
            ? ['relationship', 'personality']
            : ['personality', 'spirituality'],
        lang,
      })
    )
  }

  if (matrixInput.dominantWesternElement) {
    out.push(
      buildSyntheticSignal({
        id: `COV:L1:west-element:${matrixInput.dominantWesternElement}`,
        layer: 1,
        rowKey: `west_${matrixInput.dominantWesternElement}`,
        colKey: 'dominant',
        polarity: 'balance',
        score: 6,
        keyword: `Dominant element ${matrixInput.dominantWesternElement}`,
        sajuBasis: `dayMaster=${matrixInput.dayMasterElement}`,
        astroBasis: `dominantWesternElement=${matrixInput.dominantWesternElement}`,
        advice:
          lang === 'ko'
            ? '사주 일간과 서양 원소의 공통 패턴을 운영 원칙으로 고정하세요.'
            : 'Use the shared pattern between day master and dominant western element as operating rules.',
        tags: ['coverage', 'element-core', String(matrixInput.dominantWesternElement)],
        domainHints: ['personality', 'spirituality'],
        lang,
      })
    )
  }

  for (const [planet, house] of Object.entries(matrixInput.planetHouses || {})) {
    const houseNo = Number(house)
    if (!Number.isFinite(houseNo) || houseNo < 1 || houseNo > 12) continue
    out.push(
      buildSyntheticSignal({
        id: `COV:L3:planet-house:${planet}:H${houseNo}`,
        layer: 3,
        rowKey: planet,
        colKey: `H${houseNo}`,
        polarity: 'balance',
        score: 5,
        keyword: `${planet} in H${houseNo}`,
        sajuBasis: 'domain allocation by house',
        astroBasis: `${planet}=H${houseNo}`,
        advice:
          lang === 'ko'
            ? '하우스 배치는 에너지 분배 지도이므로 우선순위 캘린더와 함께 적용하세요.'
            : 'Treat house placement as an energy allocation map and apply it with priority calendars.',
        tags: ['coverage', 'planet-house', planet, `H${houseNo}`],
        domainHints: domainsByHouse(houseNo),
        lang,
      })
    )
  }

  for (const aspect of matrixInput.aspects || []) {
    const type = String(aspect.type || '')
    const polarity = inferPolarityFromAspect(type)
    const pair = `${aspect.planet1 || 'P1'}-${aspect.planet2 || 'P2'}`
    out.push(
      buildSyntheticSignal({
        id: `COV:L5:aspect:${pair}:${type}`,
        layer: 5,
        rowKey: pair,
        colKey: type || 'aspect',
        polarity,
        score: scoreFromPolarity(polarity, 6),
        keyword: `${pair} ${type}`,
        sajuBasis: 'relation bridge',
        astroBasis: `aspect=${pair}:${type}`,
        advice:
          polarity === 'caution'
            ? lang === 'ko'
              ? '긴장 애스펙트는 속도 조절과 검증 루틴을 같이 두어 손실을 줄이세요.'
              : 'For tense aspects, pair execution with pace-control and verification routines.'
            : lang === 'ko'
              ? '우호 애스펙트는 협업·실행을 묶을 때 효율이 올라갑니다.'
              : 'Supportive aspects perform best when collaboration and execution are coupled.',
        tags: ['coverage', 'aspect', pair, type || 'aspect'],
        domainHints: inferDomainsFromText(`${pair} ${type}`),
        lang,
      })
    )
  }

  for (const [asteroid, house] of Object.entries(matrixInput.asteroidHouses || {})) {
    const houseNo = Number(house)
    if (!Number.isFinite(houseNo) || houseNo < 1 || houseNo > 12) continue
    out.push(
      buildSyntheticSignal({
        id: `COV:L9:asteroid-house:${asteroid}:H${houseNo}`,
        layer: 9,
        rowKey: asteroid,
        colKey: `H${houseNo}`,
        polarity: 'balance',
        score: 5,
        keyword: `${asteroid} in H${houseNo}`,
        sajuBasis: 'micro strategy point',
        astroBasis: `${asteroid}=H${houseNo}`,
        advice:
          lang === 'ko'
            ? '소행성 신호는 서브전략 조정에만 쓰고, 최종 확정은 코어 신호로 판단하세요.'
            : 'Use asteroid signals for sub-strategy tuning, while final commits follow core signals.',
        tags: ['coverage', 'asteroid', asteroid, `H${houseNo}`],
        domainHints: domainsByHouse(houseNo),
        lang,
      })
    )
  }

  for (const [point, sign] of Object.entries(matrixInput.extraPointSigns || {})) {
    const pointKey = String(point)
    out.push(
      buildSyntheticSignal({
        id: `COV:L10:extra-point:${pointKey}:${String(sign)}`,
        layer: 10,
        rowKey: pointKey,
        colKey: String(sign),
        polarity: 'balance',
        score: 5,
        keyword: `${pointKey} in ${String(sign)}`,
        sajuBasis: 'deep-point overlay',
        astroBasis: `${pointKey} sign=${String(sign)}`,
        advice:
          lang === 'ko'
            ? '엑스트라 포인트는 장기 방향과 의미 해석 보정에 사용하세요.'
            : 'Use extra points to calibrate long-term direction and meaning interpretation.',
        tags: ['coverage', 'extra-point', pointKey, String(sign)],
        domainHints: inferDomainsFromText(pointKey),
        lang,
      })
    )
  }

  const advancedSignals = (matrixInput.advancedAstroSignals || {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(advancedSignals)) {
    if (!hasMeaningfulSignalValue(value)) continue
    const lowerKey = toLower(key)
    const isCaution = lowerKey.includes('eclipse')
    const polarity: SignalPolarity = isCaution ? 'caution' : 'balance'
    const valueSummary = summarizeSignalValue(value)
    const score = clampScore(scoreFromPolarity(polarity, 5) + scoreBoostFromSignalValue(value))
    out.push(
      buildSyntheticSignal({
        id: `COV:L10:advanced:${lowerKey}`,
        layer: 10,
        rowKey: 'advanced_astro',
        colKey: lowerKey,
        polarity,
        score,
        keyword: `Advanced ${lowerKey}`,
        sajuBasis: 'advanced cross-check enabled',
        astroBasis: `${lowerKey}=${valueSummary}`,
        advice:
          lang === 'ko'
            ? '고급 점성 모듈은 단일 단정이 아니라 교차 검증 신호로 사용하세요.'
            : 'Use advanced astrology modules as cross-verification signals, not standalone verdicts.',
        tags: ['coverage', 'advanced-astro', lowerKey, valueSummary],
        domainHints: uniq([
          ...inferDomainsFromText(lowerKey),
          ...inferDomainsFromText(valueSummary),
        ]),
        lang,
      })
    )
  }

  out.push(...normalizeSnapshotSignals(matrixInput, lang))

  return out
}

function dedupeSignals(list: NormalizedSignal[]): NormalizedSignal[] {
  const seen = new Set<string>()
  const out: NormalizedSignal[] = []
  for (const signal of list) {
    const dedupeKey = `L${signal.layer}:${signal.rowKey}:${signal.colKey}:${signal.polarity}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    out.push(signal)
  }
  return out
}

function primaryDomain(signal: NormalizedSignal): SignalDomain {
  return (signal.domainHints[0] || 'personality') as SignalDomain
}

function hasDomain(signal: NormalizedSignal, domain: SignalDomain): boolean {
  return (signal.domainHints || []).includes(domain)
}

function claimDomains(signal: NormalizedSignal): SignalDomain[] {
  const hints = uniq((signal.domainHints || []).filter(Boolean)) as SignalDomain[]
  if (hints.length === 0) return ['personality']

  const sorted = [...hints].sort(
    (a, b) => (CLAIM_DOMAIN_PRIORITY[a] || 99) - (CLAIM_DOMAIN_PRIORITY[b] || 99)
  )
  const core = sorted.filter(
    (domain) => CLAIM_DOMAIN_PRIORITY[domain] <= CLAIM_DOMAIN_PRIORITY.timing
  )
  if (core.length > 0) return core.slice(0, 2)
  return sorted.slice(0, 1)
}

function isSignalInDomain(signal: NormalizedSignal, domain: SignalDomain): boolean {
  return (signal.domainHints || []).includes(domain)
}

function pickByQuota(
  candidates: NormalizedSignal[],
  quota: number,
  selected: NormalizedSignal[]
): NormalizedSignal[] {
  for (const signal of candidates.sort((a, b) => b.rankScore - a.rankScore)) {
    if (selected.some((s) => s.id === signal.id)) continue
    selected.push(signal)
    if (selected.filter((s) => s.polarity === signal.polarity).length >= quota) break
  }
  return selected
}

function ensureDomainDiversity(
  selected: NormalizedSignal[],
  bench: NormalizedSignal[],
  minDomains = 3,
  protectedDomains: SignalDomain[] = []
): NormalizedSignal[] {
  const result = [...selected]
  const distinct = () => new Set(result.map((s) => primaryDomain(s))).size
  while (distinct() < minDomains) {
    const candidate = bench.find(
      (item) =>
        !result.some((s) => s.id === item.id) &&
        !result.some((s) => primaryDomain(s) === primaryDomain(item))
    )
    if (!candidate) break
    const domainCounts = result.reduce<Record<string, number>>((acc, cur) => {
      const key = primaryDomain(cur)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const removable = result
      .filter(
        (signal) =>
          signal.polarity === candidate.polarity &&
          (domainCounts[primaryDomain(signal)] || 0) > 1 &&
          !protectedDomains.some((domain) => hasDomain(signal, domain))
      )
      .sort((a, b) => a.rankScore - b.rankScore)[0]
    if (!removable) break
    const idx = result.findIndex((s) => s.id === removable.id)
    result[idx] = candidate
  }
  return result
}

function ensureRequiredDomainCoverage(
  selected: NormalizedSignal[],
  bench: NormalizedSignal[],
  requiredDomains: SignalDomain[]
): NormalizedSignal[] {
  const result = [...selected]
  for (const domain of requiredDomains) {
    if (result.some((signal) => hasDomain(signal, domain))) continue
    const candidate = bench.find(
      (signal) => !result.some((picked) => picked.id === signal.id) && hasDomain(signal, domain)
    )
    if (!candidate) continue

    const removable =
      result
        .filter(
          (signal) =>
            signal.polarity === candidate.polarity &&
            !requiredDomains.some((required) => hasDomain(signal, required))
        )
        .sort((a, b) => a.rankScore - b.rankScore)[0] ||
      result
        .filter((signal) => !requiredDomains.some((required) => hasDomain(signal, required)))
        .sort((a, b) => a.rankScore - b.rankScore)[0]

    if (!removable) continue
    const idx = result.findIndex((signal) => signal.id === removable.id)
    if (idx >= 0) result[idx] = candidate
  }
  return result
}

function riskControlByDomain(domain: SignalDomain, lang: 'ko' | 'en'): string {
  const ko: Record<SignalDomain, string> = {
    career:
      '\uACB0\uC815\uC740 \uBD84\uD560\uD558\uACE0 \uC5ED\uD560\u00B7\uAE30\uD55C\u00B7\uCC45\uC784\uC744 \uBB38\uC11C\uB85C \uACE0\uC815\uD558\uC138\uC694.',
    relationship:
      '\uAC10\uC815 \uC18D\uB3C4\uBCF4\uB2E4 \uD655\uC778 \uC9C8\uBB38\uC744 \uBA3C\uC800 \uB193\uACE0 \uD574\uC11D \uC624\uCC28\uB97C \uC904\uC774\uC138\uC694.',
    wealth:
      '\uD655\uC815 \uC804\uC5D0 \uAE08\uC561\u00B7\uAE30\uD55C\u00B7\uCDE8\uC18C \uC870\uAC74\uC744 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uB85C \uC7AC\uD655\uC778\uD558\uC138\uC694.',
    health:
      '\uACFC\uC18D\uBCF4\uB2E4 \uC218\uBA74\u00B7\uC218\uBD84\u00B7\uD68C\uBCF5 \uC2DC\uAC04\uC744 \uBA3C\uC800 \uACE0\uC815\uD558\uC5EC \uC2E4\uC218 \uBE44\uC6A9\uC744 \uC904\uC774\uC138\uC694.',
    move: '\uC774\uB3D9\u00B7\uBCC0\uD654\uB294 \uD55C \uBC88\uC5D0 \uD655\uC815\uD558\uC9C0 \uB9D0\uACE0 \uB2E8\uACC4 \uBCC4\uB85C \uC791\uAC8C \uAC80\uC99D\uD558\uC138\uC694.',
    personality:
      '\uD310\uB2E8 \uC2DC\uC810\uACFC \uC2E4\uD589 \uC2DC\uC810\uC744 \uBD84\uB9AC\uD558\uBA74 \uC624\uD310 \uBC0F \uB204\uB77D \uB9AC\uC2A4\uD06C\uAC00 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.',
    spirituality:
      '\uD070 \uC120\uC5B8\uBCF4\uB2E4 \uC8FC\uAC04 \uAE30\uB85D\uACFC \uBCF5\uAE30 \uB8E8\uD2F4\uC73C\uB85C \uC7A5\uAE30 \uBC29\uD5A5\uC744 \uACE0\uC815\uD558\uC138\uC694.',
    timing:
      '\uC2DC\uAE30 \uC2E0\uD638\uAC00 \uD754\uB4E4\uB9AC\uBA74 \uB2F9\uC77C \uD655\uC815\uC744 \uD53C\uD558\uACE0 24\uC2DC\uAC04 \uC7AC\uD655\uC778 \uC2AC\uB86F\uC744 \uB123\uC73C\uC138\uC694.',
  }
  const en: Record<SignalDomain, string> = {
    career: 'Split decisions and lock scope, deadline, and ownership in writing.',
    relationship: 'Prioritize confirmation questions before emotional conclusions.',
    wealth: 'Validate amount, due date, and cancellation clauses before commitment.',
    health: 'Stabilize sleep, hydration, and recovery blocks before pushing volume.',
    move: 'Handle change in staged checkpoints instead of one-shot commitment.',
    personality: 'Separate decision timing from execution timing to reduce mistakes.',
    spirituality: 'Use weekly logs and reflection routines to ground long-term direction.',
    timing: 'If timing signals are mixed, move commitment to a 24h recheck window.',
  }
  return lang === 'ko' ? ko[domain] : en[domain]
}

function conflictThesisByDomain(domain: SignalDomain, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    const ko: Record<SignalDomain, string> = {
      career:
        '커리어는 기회가 와도 맡을 역할과 책임 범위를 먼저 분명히 해야 손실 없이 커집니다. 지금은 무턱대고 넓히기보다 어떤 일로 평가받을지 먼저 정하는 편이 맞습니다.',
      relationship:
        '관계는 가까워질 여지도 있지만 속도를 잘못 잡으면 오해도 같이 커질 수 있습니다. 진전과 확인을 같은 날에 끝내려 하기보다 단계를 나눠 가는 편이 맞습니다.',
      wealth:
        '재정은 돈이 들어올 여지도 있지만 조건을 대충 보면 다시 새어 나가기 쉽습니다. 지금은 수익 기대보다 금액, 기한, 손실 상한을 먼저 확인하는 편이 맞습니다.',
      health:
        '컨디션은 끌어올릴 수 있지만 무리하면 피로가 한 번에 몰릴 수 있습니다. 성과를 더 내기보다 회복 시간을 먼저 확보하는 편이 오래 갑니다.',
      move: '이동·변화는 기회와 불확실성이 동시에 큽니다. 두 신호는 상충이 아니라 단계별 검증을 요구하는 분기 신호입니다.',
      personality:
        '지금은 추진력도 있지만 과속하면 실수도 같이 커질 수 있습니다. 판단은 빠르게 하되 실행은 단계별로 끊어 가는 편이 안전합니다.',
      spirituality:
        '장기 방향은 넓혀 보고 싶은 마음과 다시 정리해야 한다는 요구가 함께 있습니다. 욕심을 더하기보다 지금 남길 기준을 먼저 정하는 편이 맞습니다.',
      timing:
        '지금은 기회도 보이지만 바로 확정하면 다시 손볼 일도 생기기 쉽습니다. 결정과 확정 사이에 한 번 더 확인 단계를 두는 편이 맞습니다.',
    }
    return ko[domain]
  }

  const en: Record<SignalDomain, string> = {
    career:
      'Career has expansion momentum and reset pressure at the same time. These are conditional branch signals, not contradictions.',
    relationship:
      'Relationship shows progress and tension together. These are conditional branch signals that require pace-control and explicit confirmation.',
    wealth:
      'Wealth shows upside and volatility together. These are conditional branch signals that require term-check before commitment.',
    health:
      'Health shows performance upside with fatigue pressure. These are conditional branch signals that require recovery-first execution.',
    move: 'Move/change has opportunity and uncertainty together. These are branch signals that require staged validation.',
    personality:
      'Personality axis shows drive and overspeed risk together. These are branch signals that require separating decision and execution timing.',
    spirituality:
      'Long-term direction has expansion pull and reset demand together. These are branch signals that require priority redefinition.',
    timing:
      'Timing has opportunity windows and caution windows together. These are branch signals, not contradictions.',
  }
  return en[domain]
}

function buildClaim(domain: SignalDomain, signals: NormalizedSignal[], lang: 'ko' | 'en') {
  const orderedSignals = [...signals].sort((a, b) => b.rankScore - a.rankScore)
  const hasStrength = signals.some((s) => s.polarity === 'strength')
  const hasCaution = signals.some((s) => s.polarity === 'caution')
  const hasBalance = signals.some((s) => s.polarity === 'balance')
  let thesis = ''
  if (lang === 'ko') {
    if (hasStrength && hasCaution) {
      thesis = conflictThesisByDomain(domain, lang)
    } else if (hasStrength) {
      thesis =
        '\uD655\uC7A5 \uC2E0\uD638\uAC00 \uC6B0\uC138\uD558\uC5EC \uC2E4\uD589\uB825\uC744 \uC62C\uB9AC\uAE30 \uC88B\uC740 \uAD6C\uAC04\uC785\uB2C8\uB2E4.'
    } else if (hasCaution) {
      thesis =
        '\uC8FC\uC758 \uC2E0\uD638\uAC00 \uBA3C\uC800 \uB4DC\uB7EC\uB098 \uD655\uC815 \uC804 \uC7AC\uD655\uC778\uC774 \uC131\uD328\uB97C \uAC00\uB985\uB2C8\uB2E4.'
    } else if (hasBalance) {
      thesis =
        '\uADDC\uCE59\uACFC \uB9AC\uB4EC\uC744 \uC9C0\uD0A4\uBA74 \uC548\uC815 \uC218\uC775\uC774 \uC313\uC77C \uAD6C\uAC04\uC785\uB2C8\uB2E4.'
    } else {
      thesis =
        '\uD575\uC2EC \uC2E0\uD638\uAC00 \uC791\uC544 \uAE30\uBCF8\uAE30\uB97C \uC9C0\uD0A4\uB294 \uC6B4\uC601\uC774 \uC720\uB9AC\uD569\uB2C8\uB2E4.'
    }
  } else {
    if (hasStrength && hasCaution) thesis = conflictThesisByDomain(domain, lang)
    else if (hasStrength) thesis = 'Expansion signals dominate and execution leverage is high.'
    else if (hasCaution) thesis = 'Caution signals dominate; verify before commitment.'
    else if (hasBalance) thesis = 'Stable routines are the best path in this window.'
    else thesis = 'Signal density is low; keep baseline discipline.'
  }
  const anchor = orderedSignals[0]
  const semanticAddon =
    lang === 'ko'
      ? [
          anchor?.semantic?.layerMeaningKo,
          hasCaution ? anchor?.semantic?.riskKo : anchor?.semantic?.focusKo,
        ]
          .filter(Boolean)
          .slice(0, 2)
          .join(' ')
      : [
          anchor?.semantic?.layerMeaningEn,
          hasCaution ? anchor?.semantic?.riskEn : anchor?.semantic?.focusEn,
        ]
          .filter(Boolean)
          .slice(0, 2)
          .join(' ')
  const thesisWithSemantic = semanticAddon ? `${thesis} ${semanticAddon}`.trim() : thesis
  const claimId = `${domain}_${hasStrength && hasCaution ? 'growth_with_guardrails' : hasStrength ? 'expansion' : hasCaution ? 'risk_control' : 'stability'}`
  const actions = orderedSignals
    .map((s) => s.advice)
    .filter(Boolean)
    .slice(0, 2) as string[]
  return {
    claimId,
    domain,
    thesis: sanitizeFearWords(thesisWithSemantic, lang),
    evidence: orderedSignals.map((s) => s.id),
    riskControl: riskControlByDomain(domain, lang),
    actions: actions.length > 0 ? actions : [riskControlByDomain(domain, lang)],
  } satisfies SynthesizedClaim
}

function buildClaimSourceSignals(
  domain: SignalDomain,
  selectedSignals: NormalizedSignal[],
  normalizedSignals: NormalizedSignal[]
): NormalizedSignal[] {
  const selectedDomainSignals = selectedSignals.filter((signal) => isSignalInDomain(signal, domain))
  const supplementalSignals = normalizedSignals
    .filter(
      (signal) =>
        isSignalInDomain(signal, domain) &&
        !selectedDomainSignals.some((selected) => selected.id === signal.id)
    )
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 3)

  return [...selectedDomainSignals, ...supplementalSignals]
    .filter((signal, index, array) => array.findIndex((item) => item.id === signal.id) === index)
    .sort((a, b) => b.rankScore - a.rankScore)
}

function buildClaims(
  selectedSignals: NormalizedSignal[],
  normalizedSignals: NormalizedSignal[],
  lang: 'ko' | 'en'
): SynthesizedClaim[] {
  const grouped = selectedSignals.reduce<Record<string, NormalizedSignal[]>>((acc, signal) => {
    for (const domain of claimDomains(signal)) {
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(signal)
    }
    return acc
  }, {})
  return Object.entries(grouped)
    .map(([domain]) =>
      buildClaim(
        domain as SignalDomain,
        buildClaimSourceSignals(domain as SignalDomain, selectedSignals, normalizedSignals),
        lang
      )
    )
    .sort((a, b) => {
      if (b.evidence.length !== a.evidence.length) return b.evidence.length - a.evidence.length
      return (CLAIM_DOMAIN_PRIORITY[a.domain] || 99) - (CLAIM_DOMAIN_PRIORITY[b.domain] || 99)
    })
}

function toSignalsById(signals: NormalizedSignal[]): Record<string, NormalizedSignal> {
  return signals.reduce<Record<string, NormalizedSignal>>((acc, signal) => {
    acc[signal.id] = signal
    return acc
  }, {})
}

function selectSevenSignals(signals: NormalizedSignal[]): NormalizedSignal[] {
  const selected: NormalizedSignal[] = []
  const strengths = signals.filter((s) => s.polarity === 'strength')
  const cautions = signals.filter((s) => s.polarity === 'caution')
  const balances = signals.filter((s) => s.polarity === 'balance')
  pickByQuota(strengths, 3, selected)
  pickByQuota(cautions, 2, selected)
  pickByQuota(balances, 2, selected)
  const bench = [...strengths, ...cautions, ...balances].sort((a, b) => b.rankScore - a.rankScore)
  const withDiversity = ensureDomainDiversity(selected, bench, 3, REQUIRED_CORE_DOMAINS)
  const withRequiredDomains = ensureRequiredDomainCoverage(
    withDiversity,
    bench,
    REQUIRED_CORE_DOMAINS
  )
  return ensureFamilyDiversity(
    ensureDomainDiversity(withRequiredDomains, bench, 3, REQUIRED_CORE_DOMAINS),
    bench
  )
}

function ensureFamilyDiversity(
  selected: NormalizedSignal[],
  bench: NormalizedSignal[],
  minFamilies = 4
): NormalizedSignal[] {
  const result = [...selected]
  const familyCount = () => new Set(result.map((s) => s.family)).size

  while (familyCount() < minFamilies) {
    const candidate = bench.find(
      (item) =>
        !result.some((s) => s.id === item.id) &&
        !result.some((s) => s.family === item.family)
    )
    if (!candidate) break

    const removable = [...result]
      .filter((signal) => signal.polarity === candidate.polarity)
      .sort((a, b) => {
        const familyDupA = result.filter((item) => item.family === a.family).length
        const familyDupB = result.filter((item) => item.family === b.family).length
        if (familyDupB !== familyDupA) return familyDupB - familyDupA
        return a.rankScore - b.rankScore
      })[0]

    if (!removable) break
    const idx = result.findIndex((signal) => signal.id === removable.id)
    if (idx >= 0) result[idx] = candidate
  }

  return result
}

function buildLeadSignalIds(selectedSignals: NormalizedSignal[]): string[] {
  return [...selectedSignals]
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 3)
    .map((signal) => signal.id)
}

function buildSupportSignalIds(selectedSignals: NormalizedSignal[]): string[] {
  return [...selectedSignals]
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(3, 7)
    .map((signal) => signal.id)
}

function buildSuppressedSignalIds(
  normalizedSignals: NormalizedSignal[],
  selectedSignals: NormalizedSignal[]
): string[] {
  const selectedIds = new Set(selectedSignals.map((signal) => signal.id))
  return normalizedSignals
    .filter((signal) => !selectedIds.has(signal.id))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 6)
    .map((signal) => signal.id)
}

function applyResolvedContextBoosts(
  signals: NormalizedSignal[],
  resolvedContext: SynthesisInput['resolvedContext']
): NormalizedSignal[] {
  if (!resolvedContext) return signals

  return signals.map((signal) => {
    const relevantDomains = signal.domainHints
    const activationHits = resolvedContext.activation.domains.filter((domain) =>
      relevantDomains.includes(domain.domain)
    )
    const ruleHits = resolvedContext.rules.domains.filter((domain) =>
      relevantDomains.includes(domain.domain)
    )
    const stateHits = resolvedContext.states.domains.filter((domain) =>
      relevantDomains.includes(domain.domain)
    )

    const activationBoost =
      activationHits.reduce((sum, domain) => sum + Math.min(domain.activationScore, 4) * 0.08, 0) /
      Math.max(1, activationHits.length)
    const priorityBoost =
      ruleHits.reduce((sum, domain) => sum + domain.priorityScore * 0.06, 0) /
      Math.max(1, ruleHits.length)
    const contradictionPenalty =
      ruleHits.reduce((sum, domain) => sum + domain.contradictionPenalty * 0.18, 0) /
      Math.max(1, ruleHits.length)
    const gatingPenalty =
      signal.polarity === 'strength' && ruleHits.some((domain) => domain.gate.includes('commit_now'))
        ? 0.18
        : 0
    const recoveryPenalty =
      stateHits.some((domain) => domain.state === 'consolidation' || domain.state === 'residue') &&
      signal.polarity === 'strength'
        ? 0.12
        : 0
    const stateBoost =
      stateHits.some((domain) => domain.state === 'peak')
        ? 0.16
        : stateHits.some((domain) => domain.state === 'active')
          ? 0.1
          : stateHits.some((domain) => domain.state === 'opening')
            ? 0.05
            : 0

    return {
      ...signal,
      rankScore: Math.round((signal.rankScore + activationBoost + priorityBoost + stateBoost - contradictionPenalty - gatingPenalty - recoveryPenalty) * 100) / 100,
      tags: uniq([
        ...signal.tags,
        ...activationHits.map((domain) => `activation:${domain.domain}`),
        ...ruleHits.map((domain) => `rule:${domain.resolvedMode}`),
        ...stateHits.map((domain) => `state:${domain.state}`),
      ]),
    }
  })
}

export function getDomainsForSection(sectionKey: string): SignalDomain[] {
  return SECTION_DOMAIN_MAP[sectionKey] || ['personality']
}

export function synthesizeMatrixSignals(input: SynthesisInput): SignalSynthesisResult {
  const summary = input.matrixSummary
  const fromSummary: NormalizedSignal[] = [
    ...((summary?.strengthPoints || []).map((point) =>
      normalizeHighlight(point, 'strength', input.lang)
    ) || []),
    ...((summary?.cautionPoints || []).map((point) =>
      normalizeHighlight(point, 'caution', input.lang)
    ) || []),
    ...((summary?.balancePoints || []).map((point) =>
      normalizeHighlight(point, 'balance', input.lang)
    ) || []),
  ]
  const fromTopInsights = normalizeFromTopInsights(input.matrixReport)
  const fromMatrixInput = normalizeFromMatrixInput(input.matrixInput, input.lang)
  const normalizedSignals = applyResolvedContextBoosts(
    dedupeSignals(
      fromSummary.length > 0
        ? [...fromSummary, ...fromTopInsights, ...fromMatrixInput]
        : [...fromTopInsights, ...fromMatrixInput]
    ),
    input.resolvedContext
  )
  const selectedSignals = selectSevenSignals(normalizedSignals)
  const claims = buildClaims(selectedSignals, normalizedSignals, input.lang)
  return {
    normalizedSignals,
    selectedSignals,
    claims,
    signalsById: toSignalsById(normalizedSignals),
    leadSignalIds: buildLeadSignalIds(selectedSignals),
    supportSignalIds: buildSupportSignalIds(selectedSignals),
    suppressedSignalIds: buildSuppressedSignalIds(normalizedSignals, selectedSignals),
  }
}

export function buildSynthesisFactsForSection(
  synthesis: SignalSynthesisResult | undefined,
  sectionKey: string,
  lang: 'ko' | 'en'
): string[] {
  if (!synthesis || synthesis.claims.length === 0) return []
  const domains = getDomainsForSection(sectionKey)
  const claims = synthesis.claims.filter((claim) => domains.includes(claim.domain)).slice(0, 2)
  if (claims.length === 0) return []

  const lines: string[] = []
  for (const claim of claims) {
    lines.push(claim.thesis)
    lines.push(claim.riskControl)
    const evidenceSignals = claim.evidence
      .map((id) => synthesis.signalsById[id])
      .filter(Boolean)
      .slice(0, 2)
    for (const signal of evidenceSignals) {
      if (lang === 'ko') {
        lines.push(
          `\uADFC\uAC70 ${signal.id}: ${signal.keyword || signal.rowKey} (${signal.sajuBasis || 'saju basis pending'} / ${signal.astroBasis || 'astro basis pending'})`
        )
      } else {
        lines.push(
          `Evidence ${signal.id}: ${signal.keyword || signal.rowKey} (${signal.sajuBasis || 'saju basis pending'} / ${signal.astroBasis || 'astro basis pending'})`
        )
      }
    }
  }
  return uniq(lines)
}
