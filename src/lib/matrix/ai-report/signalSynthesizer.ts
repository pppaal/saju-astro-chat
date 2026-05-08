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

import {
  REQUIRED_CORE_DOMAINS,
  CLAIM_DOMAIN_PRIORITY,
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
  toPolarityFromCategory,
  scoreFromPolarity,
  inferPolarityFromTransit,
  inferPolarityFromAspect,
  inferPolarityFromStage,
  inferPolarityFromRelation,
  inferPolarityFromShinsal,
  computeRankScore,
  clampScore,
  SECTION_DOMAIN_MAP,
  uniq,
  toLower,
} from './signalSynthesizerSupport'
import {
  applyResolvedContextBoosts,
  buildClaims,
  buildLeadSignalIds,
  buildSupportSignalIds,
  buildSuppressedSignalIds,
  selectSevenSignals,
  toSignalsById,
} from './signalSynthesizerClaimsSupport'

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
              ? '변동 구간은 당일 확정보다 24시간 재확인으로 오차를 줄이세요.'
              : 'During volatile transits, prefer a 24h recheck before final commitment.'
            : lang === 'ko'
              ? '상승 구간은 실행 블록을 먼저 확보해 흐름을 선점하세요.'
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

