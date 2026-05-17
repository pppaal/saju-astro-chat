import type { CrossAgreementMatrixRow, CrossSnapshot } from '@/lib/destiny-matrix/types'

export const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export const toOptionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

export const hasObjectKeys = (value: unknown): boolean => {
  const obj = toOptionalRecord(value)
  return !!obj && Object.keys(obj).length > 0
}

export type DerivedCrossDomain = 'career' | 'relationship' | 'wealth' | 'health' | 'move'

export type DerivedDomainScore = {
  domain: DerivedCrossDomain
  score: number
  confidence?: number
  overlapStrength?: number
  sajuComponentScore?: number
  astroComponentScore?: number
  alignmentScore?: number
  drivers: string[]
  cautions: string[]
  peakMonth?: string
}

export const DERIVED_CROSS_DOMAINS: DerivedCrossDomain[] = [
  'career',
  'relationship',
  'wealth',
  'health',
  'move',
]

const CROSS_DOMAIN_ALIASES: Record<DerivedCrossDomain, string[]> = {
  career: ['career'],
  relationship: ['relationship', 'love'],
  wealth: ['wealth', 'money'],
  health: ['health'],
  move: ['move', 'mobility'],
}

const DOMAIN_TO_SUMMARY_KEY: Record<DerivedCrossDomain, string> = {
  career: 'career',
  relationship: 'love',
  wealth: 'money',
  health: 'health',
  move: 'move',
}

const REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS = [
  'solarReturn',
  'lunarReturn',
  'progressions',
  'draconic',
  'harmonics',
  'fixedStars',
  'eclipses',
  'midpoints',
  'asteroids',
  'extraPoints',
] as const

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function normalizeScoreToUnit(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  if (value <= 1) return clamp01(value)
  if (value <= 10) return clamp01(value / 10)
  return clamp01(value / 100)
}

function normalizeDerivedDomain(raw: unknown): DerivedCrossDomain | undefined {
  const normalized = toOptionalString(raw)?.toLowerCase()
  if (!normalized) return undefined
  return DERIVED_CROSS_DOMAINS.find((domain) => CROSS_DOMAIN_ALIASES[domain].includes(normalized))
}

function extractStringList(value: unknown, limit = 4): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const text =
      typeof item === 'string'
        ? item.trim()
        : toOptionalString((item as { title?: unknown; description?: unknown; keyword?: unknown })?.title) ||
          toOptionalString((item as { title?: unknown; description?: unknown; keyword?: unknown })?.description) ||
          toOptionalString((item as { title?: unknown; description?: unknown; keyword?: unknown })?.keyword)
    if (!text) continue
    if (!out.includes(text)) out.push(text)
    if (out.length >= limit) break
  }
  return out
}

export function normalizeMatrixSummaryDomainScores(
  requestBody: Record<string, unknown>
): Partial<Record<DerivedCrossDomain, DerivedDomainScore>> {
  const matrixSummary = toOptionalRecord(requestBody.matrixSummary)
  const rawScores = toOptionalRecord(matrixSummary?.domainScores) || toOptionalRecord(requestBody.domainScores)
  if (!rawScores) return {}

  const out: Partial<Record<DerivedCrossDomain, DerivedDomainScore>> = {}
  for (const domain of DERIVED_CROSS_DOMAINS) {
    const summaryKey = DOMAIN_TO_SUMMARY_KEY[domain]
    const raw = toOptionalRecord(rawScores[summaryKey])
    if (!raw) continue
    out[domain] = {
      domain,
      score:
        normalizeScoreToUnit(raw.finalScoreAdjusted) ||
        normalizeScoreToUnit(raw.baseFinalScore) ||
        normalizeScoreToUnit(raw.score) ||
        0.5,
      confidence: normalizeScoreToUnit(raw.confidenceScore),
      overlapStrength: normalizeScoreToUnit(raw.overlapStrength),
      sajuComponentScore: normalizeScoreToUnit(raw.sajuComponentScore),
      astroComponentScore: normalizeScoreToUnit(raw.astroComponentScore),
      alignmentScore: normalizeScoreToUnit(raw.alignmentScore),
      drivers: extractStringList(raw.drivers),
      cautions: extractStringList(raw.cautions),
    }
  }

  const overlapTimelineByDomain = toOptionalRecord(matrixSummary?.overlapTimelineByDomain)
  for (const domain of DERIVED_CROSS_DOMAINS) {
    const summaryKey = DOMAIN_TO_SUMMARY_KEY[domain]
    const points = overlapTimelineByDomain?.[summaryKey]
    if (!Array.isArray(points) || points.length === 0) continue
    const peakMonth = toOptionalString((points[0] as { month?: unknown })?.month)
    if (out[domain]) {
      out[domain]!.peakMonth = peakMonth
    }
  }

  return out
}

export function normalizeDomainAnalysisScores(
  requestBody: Record<string, unknown>
): Partial<Record<DerivedCrossDomain, DerivedDomainScore>> {
  const analysis = requestBody.domainAnalysis
  const out: Partial<Record<DerivedCrossDomain, DerivedDomainScore>> = {}

  if (Array.isArray(analysis)) {
    for (const item of analysis) {
      const domain = normalizeDerivedDomain((item as { domain?: unknown }).domain)
      if (!domain) continue
      const score = normalizeScoreToUnit((item as { score?: unknown }).score)
      if (score === undefined) continue
      out[domain] = {
        domain,
        score,
        drivers: [],
        cautions: [],
      }
    }
    return out
  }

  const analysisMap = toOptionalRecord(analysis)
  if (!analysisMap) return out
  for (const [key, value] of Object.entries(analysisMap)) {
    const domain = normalizeDerivedDomain(key)
    if (!domain) continue
    const record = toOptionalRecord(value)
    const score =
      normalizeScoreToUnit(record?.score) ||
      normalizeScoreToUnit(record?.finalScoreAdjusted) ||
      normalizeScoreToUnit(value)
    if (score === undefined) continue
    out[domain] = {
      domain,
      score,
      drivers: extractStringList(record?.drivers),
      cautions: extractStringList(record?.cautions),
    }
  }
  return out
}

export function collectTopInsightHints(
  requestBody: Record<string, unknown>
): Partial<Record<DerivedCrossDomain, Pick<DerivedDomainScore, 'drivers' | 'cautions'>>> {
  const out: Partial<Record<DerivedCrossDomain, Pick<DerivedDomainScore, 'drivers' | 'cautions'>>> = {}
  const topInsights = Array.isArray(requestBody.topInsights) ? requestBody.topInsights : []
  for (const raw of topInsights) {
    const item = raw as { domain?: unknown; category?: unknown; title?: unknown; description?: unknown }
    const domain = normalizeDerivedDomain(item.domain)
    if (!domain) continue
    const text = toOptionalString(item.title) || toOptionalString(item.description)
    if (!text) continue
    const bucket =
      out[domain] ||
      (out[domain] = {
        drivers: [],
        cautions: [],
      })
    if (String(item.category || '').toLowerCase() === 'caution') {
      if (!bucket.cautions.includes(text)) bucket.cautions.push(text)
    } else {
      if (!bucket.drivers.includes(text)) bucket.drivers.push(text)
    }
  }
  return out
}

export function deriveCrossAgreementMatrix(
  domainScores: Partial<Record<DerivedCrossDomain, DerivedDomainScore>>,
  requestBody: Record<string, unknown>,
  astroTimingIndex: CrossSnapshot['astroTimingIndex'],
  currentDateIso: string
): CrossAgreementMatrixRow[] {
  const relationCount = Array.isArray(requestBody.relations) ? requestBody.relations.length : 0
  const aspectCount = Array.isArray(requestBody.aspects) ? requestBody.aspects.length : 0
  const transitCount = Array.isArray(requestBody.activeTransits) ? requestBody.activeTransits.length : 0
  const evidenceCoverage = clamp01(
    Math.min(0.18, relationCount * 0.05) +
      Math.min(0.18, aspectCount * 0.03) +
      Math.min(0.16, transitCount * 0.03) +
      (hasObjectKeys(requestBody.sajuSnapshot) ? 0.12 : 0) +
      (hasObjectKeys(requestBody.astrologySnapshot) ? 0.12 : 0)
  )

  const scoreByDomain = Object.values(domainScores)
  const rows: CrossAgreementMatrixRow[] = []
  for (const item of scoreByDomain) {
    if (!item) continue
    const sajuSupport = item.sajuComponentScore ?? clamp01(item.score * 0.92 + 0.04)
    const astroSupport = item.astroComponentScore ?? clamp01(item.score * 0.88 + 0.06)
    const semanticBridge = clamp01(1 - Math.abs(sajuSupport - astroSupport))
    const alignment = item.alignmentScore ?? clamp01(semanticBridge * 0.75 + item.score * 0.25)
    const overlap = item.overlapStrength ?? clamp01(item.score * 0.8)
    const confidence = item.confidence ?? clamp01(item.score * 0.78 + 0.12)

    const timingByScale = {
      now: clamp01((astroTimingIndex?.daily || 0.5) * 0.68 + (astroTimingIndex?.monthly || 0.5) * 0.32),
      '1-3m': clamp01((astroTimingIndex?.monthly || 0.5) * 0.72 + (astroTimingIndex?.annual || 0.5) * 0.28),
      '3-6m': clamp01((astroTimingIndex?.annual || 0.5) * 0.7 + (astroTimingIndex?.monthly || 0.5) * 0.15 + (astroTimingIndex?.decade || 0.5) * 0.15),
      '6-12m': clamp01((astroTimingIndex?.annual || 0.5) * 0.46 + (astroTimingIndex?.decade || 0.5) * 0.54),
    } as const

    const peakMonth = item.peakMonth
    const monthDelta =
      peakMonth && /^\d{4}-\d{2}$/.test(peakMonth) && /^\d{4}-\d{2}/.test(currentDateIso)
        ? (Number(peakMonth.slice(0, 4)) - Number(currentDateIso.slice(0, 4))) * 12 +
          (Number(peakMonth.slice(5, 7)) - Number(currentDateIso.slice(5, 7)))
        : null

    const proximityByScale = {
      now:
        monthDelta === null ? overlap : clamp01(overlap * 0.7 + (Math.abs(monthDelta) <= 1 ? 0.3 : 0.08)),
      '1-3m':
        monthDelta === null ? overlap : clamp01(overlap * 0.72 + (monthDelta >= 0 && monthDelta <= 3 ? 0.28 : 0.06)),
      '3-6m':
        monthDelta === null ? overlap : clamp01(overlap * 0.74 + (monthDelta >= 2 && monthDelta <= 6 ? 0.26 : 0.05)),
      '6-12m':
        monthDelta === null ? overlap : clamp01(overlap * 0.76 + (monthDelta >= 5 && monthDelta <= 12 ? 0.24 : 0.04)),
    } as const

    const timescales = {
      now: null,
      '1-3m': null,
      '3-6m': null,
      '6-12m': null,
    } as unknown as CrossAgreementMatrixRow['timescales']

    let leadLagSum = 0
    let leadLagCount = 0
    for (const timescale of ['now', '1-3m', '3-6m', '6-12m'] as const) {
      const sajuTiming =
        timescale === 'now'
          ? clamp01((requestBody.currentIljinElement ? 0.74 : 0.42) + (requestBody.currentWolunElement ? 0.1 : 0))
          : timescale === '1-3m'
            ? clamp01((requestBody.currentWolunElement ? 0.72 : 0.48) + (requestBody.currentSaeunElement ? 0.1 : 0))
            : timescale === '3-6m'
              ? clamp01((requestBody.currentSaeunElement ? 0.68 : 0.5) + (requestBody.currentDaeunElement ? 0.1 : 0))
              : clamp01((requestBody.currentDaeunElement ? 0.72 : 0.52) + (requestBody.currentSaeunElement ? 0.08 : 0))
      const astroTiming = timingByScale[timescale]
      const leadLag = round3(Math.max(-1, Math.min(1, astroTiming - sajuTiming)))
      const contradiction = round3(
        clamp01(
          Math.abs(sajuSupport - astroSupport) * 0.52 +
            Math.max(0, 0.62 - semanticBridge) * 0.18 +
            Math.max(0, 0.58 - proximityByScale[timescale]) * 0.12 +
            Math.abs(leadLag) * 0.18
        )
      )
      const agreement = round3(
        clamp01(
          item.score * 0.44 +
            alignment * 0.22 +
            semanticBridge * 0.14 +
            proximityByScale[timescale] * 0.1 +
            confidence * 0.06 +
            evidenceCoverage * 0.06 -
            contradiction * 0.08
        )
      )
      timescales[timescale] = {
        agreement,
        contradiction,
        leadLag,
      }
      leadLagSum += leadLag
      leadLagCount += 1
    }

    rows.push({
      domain: item.domain,
      timescales,
      leadLag: leadLagCount > 0 ? round3(leadLagSum / leadLagCount) : undefined,
    })
  }

  return rows
}

export function deriveCrossAgreement(matrix: CrossAgreementMatrixRow[]): number | undefined {
  const cells = matrix.flatMap((row) => Object.values(row.timescales || {}))
  if (cells.length === 0) return undefined
  const total = cells.reduce((sum, cell) => {
    const agreement = typeof cell?.agreement === 'number' ? cell.agreement : 0
    const contradiction = typeof cell?.contradiction === 'number' ? cell.contradiction : 0
    const leadLag = typeof cell?.leadLag === 'number' ? Math.abs(cell.leadLag) : 0
    return sum + clamp01(agreement * (1 - contradiction * 0.5 - leadLag * 0.2))
  }, 0)
  return round3(total / cells.length)
}

function localizeTimescale(timescale: string, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    if (timescale === 'now') return '지금'
    if (timescale === '1-3m') return '1-3개월'
    if (timescale === '3-6m') return '3-6개월'
    if (timescale === '6-12m') return '6-12개월'
  }
  return timescale
}

function pickTopCrossCell(row: CrossAgreementMatrixRow): {
  timescale: string
  agreement?: number
  contradiction?: number
  leadLag?: number
} {
  const entries = Object.entries(row.timescales || {})
    .filter(([, cell]) => typeof cell?.agreement === 'number')
    .sort((a, b) => (b[1]?.agreement || 0) - (a[1]?.agreement || 0))
  const [timescale, cell] = entries[0] || ['now', undefined]
  return {
    timescale,
    agreement: cell?.agreement,
    contradiction: cell?.contradiction,
    leadLag: cell?.leadLag,
  }
}

function buildDomainCrossConclusion(input: {
  lang: 'ko' | 'en'
  domain: DerivedCrossDomain
  score?: DerivedDomainScore
  topCell: ReturnType<typeof pickTopCrossCell>
}): string {
  const { lang, domain, score, topCell } = input
  const agreement = typeof topCell.agreement === 'number' ? topCell.agreement : score?.score || 0.5
  const contradiction = typeof topCell.contradiction === 'number' ? topCell.contradiction : 0
  const timingLabel = localizeTimescale(topCell.timescale, lang)
  const driver = score?.drivers?.[0]
  const caution = score?.cautions?.[0]
  const peakMonth = score?.peakMonth

  const state =
    agreement >= 0.76 && contradiction <= 0.24
      ? 'aligned'
      : contradiction >= 0.36
        ? 'guarded'
        : 'mixed'

  if (lang === 'ko') {
    if (domain === 'career') {
      if (state === 'aligned') {
        return `커리어는 ${driver || '역할 정렬'}을 중심으로 사주와 점성이 같은 방향을 가리키며, ${timingLabel}${peakMonth ? `(${peakMonth})` : ''}부터 실행 압력이 붙습니다.`
      }
      if (state === 'guarded') {
        return `커리어는 ${driver || '기회 신호'}가 있으나 ${caution || '조건 불일치'}가 같이 보여, ${timingLabel}에는 확장보다 역할·승인 조건 확인이 우선입니다.`
      }
      return `커리어는 ${driver || '역할 이슈'}를 밀어주지만 속도는 아직 엇갈려, ${timingLabel}에는 실행과 검증을 함께 가져가는 편이 맞습니다.`
    }
    if (domain === 'relationship') {
      if (state === 'aligned') {
        return `관계는 ${driver || '연락 리듬'}을 축으로 교차 합의가 살아 있고, ${timingLabel}${peakMonth ? `(${peakMonth})` : ''}에는 기대치 조율이 실제 진전으로 이어질 가능성이 큽니다.`
      }
      if (state === 'guarded') {
        return `관계는 ${driver || '감정 신호'}가 살아 있어도 ${caution || '속도 차이'}가 남아 있어, ${timingLabel}에는 결론보다 페이스 확인이 더 중요합니다.`
      }
      return `관계는 호감과 경계가 함께 움직이는 상태라, ${timingLabel}에는 표현보다 속도와 기대치 정렬을 먼저 봐야 합니다.`
    }
    if (domain === 'wealth') {
      if (state === 'aligned') {
        return `재정은 ${driver || '현금흐름 정렬'}이 교차 근거의 중심에 있고, ${timingLabel}${peakMonth ? `(${peakMonth})` : ''}에는 조건이 맞으면 집행 효율이 올라갈 수 있습니다.`
      }
      if (state === 'guarded') {
        return `재정은 ${driver || '수익 기회'}가 보여도 ${caution || '손실 상한 미확정'}이 남아 있어, ${timingLabel}에는 공격보다 조건 점검이 먼저입니다.`
      }
      return `재정은 기회와 경계가 같이 들어와 있어, ${timingLabel}에는 금액보다 기한·취소 조건을 먼저 고정하는 편이 안전합니다.`
    }
    if (domain === 'health') {
      if (state === 'aligned') {
        return `건강은 ${driver || '회복 리듬'}이 교차 근거의 중심에 있고, ${timingLabel}${peakMonth ? `(${peakMonth})` : ''}에는 루틴 조정 효과가 더 분명하게 드러날 수 있습니다.`
      }
      if (state === 'guarded') {
        return `건강은 ${driver || '회복 필요 신호'}가 분명하지만 ${caution || '과부하'}가 같이 보여, ${timingLabel}에는 강도보다 회복 슬롯 확보가 우선입니다.`
      }
      return `건강은 버티는 힘과 회복 신호가 엇갈리는 상태라, ${timingLabel}에는 큰 결론보다 짧은 간격 점검이 더 맞습니다.`
    }
    if (domain === 'move') {
      if (state === 'aligned') {
        return `이동은 ${driver || '경로 정렬'}이 교차 근거의 중심에 있고, ${timingLabel}${peakMonth ? `(${peakMonth})` : ''}에는 동선과 거점 재배치가 실제 선택지로 올라옵니다.`
      }
      if (state === 'guarded') {
        return `이동은 ${driver || '변화 압력'}이 있어도 ${caution || '비용·경로 리스크'}가 남아 있어, ${timingLabel}에는 확정보다 검증이 먼저입니다.`
      }
      return `이동은 바꾸고 싶은 압력과 유지해야 할 조건이 같이 움직여, ${timingLabel}에는 경로와 생활 비용을 먼저 다시 계산해야 합니다.`
    }
  }

  if (domain === 'career') {
    return state === 'aligned'
      ? `Career shows cross-system alignment around ${driver || 'role definition'}, and ${timingLabel} is where execution pressure starts to hold.`
      : state === 'guarded'
        ? `Career has real opportunity, but ${caution || 'conditions are still uneven'}, so ${timingLabel} should be used for validation before expansion.`
        : `Career support is present, but timing is still mixed, so ${timingLabel} should combine execution with review.`
  }
  if (domain === 'relationship') {
    return state === 'aligned'
      ? `Relationship alignment is strongest around ${driver || 'cadence and expectation matching'}, and ${timingLabel} is where progress can become real.`
      : state === 'guarded'
        ? `Relationship pressure is active, but ${caution || 'pace mismatch'} remains, so ${timingLabel} should focus on confirming pace before commitment.`
        : `Relationship timing is mixed, so ${timingLabel} is better for alignment than for forcing conclusions.`
  }
  if (domain === 'wealth') {
    return state === 'aligned'
      ? `Wealth alignment centers on ${driver || 'cash-flow structure'}, and ${timingLabel} is where terms can convert into usable momentum.`
      : state === 'guarded'
        ? `Wealth opportunity is visible, but ${caution || 'downside terms are still loose'}, so ${timingLabel} should stay defensive first.`
        : `Wealth timing is mixed, so ${timingLabel} should lock terms before chasing upside.`
  }
  if (domain === 'health') {
    return state === 'aligned'
      ? `Health alignment centers on ${driver || 'recovery rhythm'}, and ${timingLabel} is where routine adjustments can show clear effect.`
      : state === 'guarded'
        ? `Health caution is active around ${caution || 'overload risk'}, so ${timingLabel} should protect recovery before intensity.`
        : `Health timing is mixed, so ${timingLabel} is better for shorter monitoring loops than one big judgment.`
  }
  return state === 'aligned'
    ? `Movement alignment centers on ${driver || 'route validation'}, and ${timingLabel} is where relocation or route change becomes actionable.`
    : state === 'guarded'
      ? `Movement pressure is active, but ${caution || 'logistics risk'} remains, so ${timingLabel} should verify costs and route first.`
      : `Movement timing is mixed, so ${timingLabel} should recheck logistics before commitment.`
}

export function buildCrossEvidence(
  domainScores: Partial<Record<DerivedCrossDomain, DerivedDomainScore>>,
  matrix: CrossAgreementMatrixRow[],
  lang: 'ko' | 'en'
): CrossSnapshot['crossEvidence'] {
  const supportedDomains = new Set<DerivedCrossDomain>([
    'career',
    'relationship',
    'wealth',
    'health',
    'move',
  ])
  const supportedMatrixRows = matrix.filter(
    (row): row is CrossAgreementMatrixRow & { domain: DerivedCrossDomain } =>
      supportedDomains.has(row.domain as DerivedCrossDomain)
  )
  return {
    summary: supportedMatrixRows
      .map((row) => {
        const score = domainScores[row.domain]
        const topCell = pickTopCrossCell(row)
        return {
          domain: row.domain,
          agreement: topCell?.agreement,
          drivers: score?.drivers || [],
          cautions: score?.cautions || [],
          text: buildDomainCrossConclusion({
            lang,
            domain: row.domain,
            score,
            topCell,
          }),
        }
      })
      .slice(0, 5),
    domains: Object.fromEntries(
      Object.entries(domainScores).map(([domain, score]) => [
        domain,
        {
          drivers: score?.drivers || [],
          cautions: score?.cautions || [],
          crossConclusion: buildDomainCrossConclusion({
            lang,
            domain: domain as DerivedCrossDomain,
            score,
            topCell:
              pickTopCrossCell(
                supportedMatrixRows.find((row) => row.domain === domain) || {
                  domain: domain as DerivedCrossDomain,
                  timescales: {},
                }
              ),
          }),
        },
      ])
    ),
  }
}

export function hasFullAdvancedAstroSignals(value: unknown): boolean {
  const signals = toOptionalRecord(value)
  if (!signals) return false
  return REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS.every((key) => signals[key] === true)
}

export function normalizeGenderForSaju(value: unknown): 'male' | 'female' {
  const normalized = toOptionalString(value)?.toLowerCase()
  if (normalized === 'f' || normalized === 'female') {
    return 'female'
  }
  return 'male'
}
