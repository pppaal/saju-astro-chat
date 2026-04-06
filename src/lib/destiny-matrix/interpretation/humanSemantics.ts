import {
  cleanTimingDetail,
  describeDomainTimingAngle,
  describeSajuAstroConflictByDomainDetailed,
  formatTimingCondition,
  joinNaturalList,
  renderTimingAbortSentence,
  renderTimingEntrySentence,
  withTopicParticle,
} from '@/lib/destiny-matrix/interpretation/humanSemanticsSupport'

export type HumanSemanticsLang = 'ko' | 'en'

export type HumanTimingWindow = 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'

function describeProbeWindowBucket(probeDay: number, lang: HumanSemanticsLang): string {
  if (lang === 'ko') {
    if (probeDay <= 8) return '월초'
    if (probeDay <= 22) return '월중'
    return '월후반'
  }
  if (probeDay <= 8) return 'the early-month window'
  if (probeDay <= 22) return 'the mid-month window'
  return 'the late-month window'
}

export {
  describeCrossAgreement,
  describeCrossEvidenceBridge,
  describeDataTrustSummary,
  describeEvidenceConfidence,
  describeExecutionStance,
  describeGraphEvidenceWhy,
  describePhaseFlow,
  describeProvenanceSummary,
  describeSajuAstroConflict,
  describeSajuAstroConflictByDomain,
  describeSajuAstroRole,
  describeWhyStack,
} from './humanSemanticsNarrativeSupport'

export function describeTimingWindowLabel(
  window: HumanTimingWindow | string | undefined,
  lang: HumanSemanticsLang = 'ko'
): string {
  const value = String(window || '').trim()
  if (lang === 'ko') {
    switch (value) {
      case 'now':
        return '지금 바로 움직임을 걸 수 있는 구간'
      case '1-3m':
        return '앞으로 1~3개월 안에 흐름이 붙기 쉬운 구간'
      case '3-6m':
        return '3~6개월 안에 조건을 갖춰야 힘이 붙는 구간'
      case '6-12m':
        return '반년 안쪽에서 천천히 열리는 구간'
      case '12m+':
        return '1년 이상 보고 준비해야 하는 구간'
      default:
        return '시기를 나눠서 보는 편이 좋은 구간'
    }
  }

  switch (value) {
    case 'now':
      return 'a window that can be acted on now'
    case '1-3m':
      return 'a window likely to open within the next one to three months'
    case '3-6m':
      return 'a window that strengthens once conditions are built over three to six months'
    case '6-12m':
      return 'a slower window that opens within the next half year'
    case '12m+':
      return 'a long-range window that needs preparation over a year or more'
    default:
      return 'a window that benefits from staged timing'
  }
}

export function describeTimingWindowTakeaways(input: {
  domainLabel?: string
  window: HumanTimingWindow | string | undefined
  whyNow?: string | null
  entryConditions?: string[]
  abortConditions?: string[]
  timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
  precisionReason?: string | null
  timingConflictNarrative?: string | null
  lang?: HumanSemanticsLang
}): string[] {
  const {
    domainLabel = '',
    window,
    whyNow,
    entryConditions = [],
    abortConditions = [],
    precisionReason,
    timingConflictNarrative,
    lang = 'ko',
  } = input

  const label = describeTimingWindowLabel(window, lang)
  const cleanedWhyNow = cleanTimingDetail(whyNow, lang)
  const cleanedConflict = cleanTimingDetail(timingConflictNarrative, lang)
  const cleanedPrecision = cleanTimingDetail(precisionReason, lang)
  const cleanedEntry = entryConditions
    .map((item) => formatTimingCondition(cleanTimingDetail(item, lang), 'entry', lang))
    .filter(Boolean)
  const cleanedAbort = abortConditions
    .map((item) => formatTimingCondition(cleanTimingDetail(item, lang), 'abort', lang))
    .filter(Boolean)
  const angle = describeDomainTimingAngle(domainLabel, lang)

  if (lang === 'ko') {
    const opening = [
      domainLabel ? `${withTopicParticle(domainLabel)} ${label}입니다.` : `${label}입니다.`,
      cleanedWhyNow,
    ]
      .filter(Boolean)
      .join(' ')

    const entryLine =
      cleanedEntry.length > 0
        ? `실제로 움직이려면 ${joinNaturalList(cleanedEntry.slice(0, 2), lang)}가 먼저 맞아야 합니다.`
        : ''
    const abortLine =
      cleanedAbort.length > 0
        ? `반대로 ${joinNaturalList(cleanedAbort.slice(0, 2), lang)} 조짐이 보이면 범위를 줄이고 확정을 늦추는 편이 안전합니다.`
        : ''

    return [opening, cleanedConflict, entryLine, abortLine, cleanedPrecision, angle].filter(Boolean)
  }

  const opening = [domainLabel ? `In ${domainLabel}, this is ${label}.` : label, cleanedWhyNow]
    .filter(Boolean)
    .join(' ')
  const entryLine =
    cleanedEntry.length > 0
      ? `This tends to open when ${joinNaturalList(cleanedEntry.slice(0, 2), lang)} are in place.`
      : ''
  const abortLine =
    cleanedAbort.length > 0
      ? `Slow down and narrow the move if ${joinNaturalList(cleanedAbort.slice(0, 2), lang)} start to show up.`
      : ''
  return [opening, cleanedConflict, entryLine, abortLine, cleanedPrecision, angle].filter(Boolean)
}

export function describeTimingWindowBrief(input: {
  domainLabel?: string
  window: HumanTimingWindow | string | undefined
  whyNow?: string | null
  entryConditions?: string[]
  abortConditions?: string[]
  timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
  precisionReason?: string | null
  timingConflictNarrative?: string | null
  lang?: HumanSemanticsLang
}): string {
  const {
    domainLabel = '',
    window,
    whyNow,
    entryConditions = [],
    abortConditions = [],
    timingGranularity,
    precisionReason,
    timingConflictNarrative,
    lang = 'ko',
  } = input

  const takeaways = describeTimingWindowTakeaways({
    domainLabel,
    window,
    whyNow,
    entryConditions,
    abortConditions,
    timingGranularity,
    precisionReason,
    timingConflictNarrative,
    lang,
  })

  if (lang === 'ko') {
    const [opening = '', entry = '', abort = ''] = takeaways
    return [opening, entry || abort].filter(Boolean).join(' ')
  }

  const [opening = '', entry = '', abort = ''] = takeaways
  return [opening, entry || abort].filter(Boolean).join(' ')
}

export function describeTimingWindowNarrative(input: {
  domainLabel?: string
  window: HumanTimingWindow | string | undefined
  whyNow?: string | null
  entryConditions?: string[]
  abortConditions?: string[]
  timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
  precisionReason?: string | null
  timingConflictNarrative?: string | null
  lang?: HumanSemanticsLang
}): string {
  const {
    domainLabel = '',
    window,
    whyNow,
    entryConditions = [],
    abortConditions = [],
    timingGranularity,
    precisionReason,
    timingConflictNarrative,
    lang = 'ko',
  } = input

  return describeTimingWindowTakeaways({
    domainLabel,
    window,
    whyNow,
    entryConditions,
    abortConditions,
    timingGranularity,
    precisionReason,
    timingConflictNarrative,
    lang,
  }).join(' ')
}

export function describeTimingCalibrationSummary(input: {
  reliabilityBand?: 'low' | 'medium' | 'high' | null
  reliabilityScore?: number | null
  pastStability?: number | null
  futureStability?: number | null
  backtestConsistency?: number | null
  calibratedFromHistory?: boolean | null
  calibrationSampleSize?: number | null
  calibrationMatchedRate?: number | null
  lang?: HumanSemanticsLang
}): string {
  const {
    reliabilityBand,
    reliabilityScore,
    pastStability,
    futureStability,
    backtestConsistency,
    calibratedFromHistory,
    calibrationSampleSize,
    calibrationMatchedRate,
    lang = 'ko',
  } = input

  if (!reliabilityBand) return ''

  const score =
    typeof reliabilityScore === 'number' && Number.isFinite(reliabilityScore)
      ? Math.round(Math.max(0, Math.min(1, reliabilityScore)) * 100)
      : null
  const past =
    typeof pastStability === 'number' && Number.isFinite(pastStability)
      ? Math.round(Math.max(0, Math.min(1, pastStability)) * 100)
      : null
  const future =
    typeof futureStability === 'number' && Number.isFinite(futureStability)
      ? Math.round(Math.max(0, Math.min(1, futureStability)) * 100)
      : null
  const consistency =
    typeof backtestConsistency === 'number' && Number.isFinite(backtestConsistency)
      ? Math.round(Math.max(0, Math.min(1, backtestConsistency)) * 100)
      : null
  const matchedRate =
    typeof calibrationMatchedRate === 'number' && Number.isFinite(calibrationMatchedRate)
      ? Math.round(Math.max(0, Math.min(1, calibrationMatchedRate)) * 100)
      : null
  const sampleSize =
    typeof calibrationSampleSize === 'number' && Number.isFinite(calibrationSampleSize)
      ? Math.max(0, Math.round(calibrationSampleSize))
      : null

  if (lang === 'ko') {
    if (reliabilityBand === 'high') {
      return `과거·미래 월별 재계산과 월중 강한 창 비교 기준으로 타이밍 신뢰도는 높은 편입니다${
        score !== null ? ` (${score}%)` : ''
      }${calibratedFromHistory && sampleSize ? ` 실제 피드백 ${sampleSize}건 기준 보정이 적용됐습니다${matchedRate !== null ? ` (${matchedRate}%)` : ''}.` : '.'}`
    }
    if (reliabilityBand === 'medium') {
      return `과거·미래 월별 재계산과 월중 강한 창 비교 기준으로 타이밍 신뢰도는 중간 수준입니다${
        past !== null || future !== null || consistency !== null
          ? ` (과거 안정성 ${past ?? '-'}%, 미래 안정성 ${future ?? '-'}%, 일관성 ${consistency ?? '-'}%)`
          : ''
      }${calibratedFromHistory && sampleSize ? ` 실제 피드백 ${sampleSize}건 기준 보정이 적용됐습니다${matchedRate !== null ? ` (${matchedRate}%)` : ''}.` : '.'}`
    }
    return `과거·미래 월별 재계산과 월중 강한 창 비교 기준으로 타이밍 신뢰도는 낮은 편이므로, 월 전체 평균보다 월중 강한 구간 해석에 무게를 두는 편이 맞습니다.`
  }

  if (reliabilityBand === 'high') {
    return `Month-by-month backtesting, anchored to the stronger intra-month window, puts timing reliability in the high band${
      score !== null ? ` (${score}%)` : ''
    }${calibratedFromHistory && sampleSize ? ` Historical feedback calibration is applied from ${sampleSize} cases${matchedRate !== null ? ` (${matchedRate}%)` : ''}.` : '.'}`
  }
  if (reliabilityBand === 'medium') {
    return `Month-by-month backtesting, anchored to the stronger intra-month window, puts timing reliability in the medium band${
      past !== null || future !== null || consistency !== null
        ? ` (past stability ${past ?? '-'}%, future stability ${future ?? '-'}%, consistency ${consistency ?? '-'}%)`
        : ''
    }${calibratedFromHistory && sampleSize ? ` Historical feedback calibration is applied from ${sampleSize} cases${matchedRate !== null ? ` (${matchedRate}%)` : ''}.` : '.'}`
  }
  return 'Month-by-month backtesting, anchored to the stronger intra-month window, puts timing reliability in the low band, so this should be read as a window rather than a precise date call.'
}

export function describeIntraMonthPeakWindow(input: {
  domainLabel?: string
  points?: Array<{ probeDay?: number; peakLevel?: 'peak' | 'high' | 'normal' }> | null
  lang?: HumanSemanticsLang
}): string {
  const { domainLabel = '', points = [], lang = 'ko' } = input
  const point = (points || [])[0]
  if (!point?.probeDay) return ''

  const bucket = describeProbeWindowBucket(point.probeDay, lang)

  if (lang === 'ko') {
    const prefix = domainLabel ? `${withTopicParticle(domainLabel)} ` : ''
    if (point.peakLevel === 'peak') {
      return `${prefix}월 전체 평균보다 ${bucket} 창이 특히 강하게 잡힙니다.`
    }
    return `${prefix}월 전체 평균보다 ${bucket} 창을 더 눈여겨보는 편이 맞습니다.`
  }

  const prefix = domainLabel ? `For ${domainLabel}, ` : ''
  if (point.peakLevel === 'peak') {
    return `${prefix}the timing runs stronger through ${bucket} than through a flat month average.`
  }
  return `${prefix}${bucket} matters more than a flat month average here.`
}
