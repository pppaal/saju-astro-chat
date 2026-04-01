import { buildAstroTimingIndex } from '@/lib/destiny-matrix/astroTimingIndex'
import type {
  AstrologySnapshot,
  CrossSnapshot,
  CrossAgreementMatrixRow,
  MatrixCalculationInput,
  SajuSnapshot,
} from '@/lib/destiny-matrix/types'
import type { TimingData } from '@/lib/destiny-matrix/ai-report/types'
import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/Saju/saju'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars } from '@/lib/Saju/shinsal'
import { STEMS as SAJU_STEMS } from '@/lib/Saju/constants'
import type { FiveElement } from '@/lib/Saju/types'
import {
  calculateAllAsteroids,
  calculateExtraPoints,
  calculateLunarReturn,
  calculateMidpoints,
  calculateNatalChart,
  calculateSecondaryProgressions,
  calculateSolarReturn,
  calculateTransitChart,
  compareDraconicToNatal,
  findEclipseImpact,
  findFixedStarConjunctions,
  findMajorTransits,
  findMidpointActivations,
  findNatalAspects,
  generateHarmonicProfile,
  getUpcomingEclipses,
  toChart,
} from '@/lib/astrology'

const ELEMENT_MAP: Record<string, FiveElement> = {
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

const GEOKGUK_ALIASES: Partial<Record<string, MatrixCalculationInput['geokguk']>> = {
  정관격: 'jeonggwan',
  편관격: 'pyeongwan',
  정인격: 'jeongin',
  편인격: 'pyeongin',
  식신격: 'siksin',
  상관격: 'sanggwan',
  정재격: 'jeongjae',
  편재격: 'pyeonjae',
  건록격: 'geonrok',
  양인격: 'yangin',
  종아격: 'jonga',
  종재격: 'jongjae',
  종살격: 'jongsal',
  종강격: 'jonggang',
  종왕격: 'jonggang',
}

const DERIVED_SAJU_KEY = '__derivedSajuData'
const STEM_ELEMENT_BY_NAME: Record<string, FiveElement> = SAJU_STEMS.reduce(
  (acc, item) => {
    acc[item.name] = item.element
    return acc
  },
  {} as Record<string, FiveElement>
)

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

const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const EARTHLY_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const STEM_ELEMENTS: Record<string, string> = {
  갑: '목',
  을: '목',
  병: '화',
  정: '화',
  무: '토',
  기: '토',
  경: '금',
  신: '금',
  임: '수',
  계: '수',
}

const WESTERN_SIGN_ELEMENT_MAP: Record<string, MatrixCalculationInput['dominantWesternElement']> = {
  aries: 'fire',
  taurus: 'earth',
  gemini: 'air',
  cancer: 'water',
  leo: 'fire',
  virgo: 'earth',
  libra: 'air',
  scorpio: 'water',
  sagittarius: 'fire',
  capricorn: 'earth',
  aquarius: 'air',
  pisces: 'water',
  양: 'fire',
  황소: 'earth',
  쌍둥이: 'air',
  게: 'water',
  사자: 'fire',
  처녀: 'earth',
  천칭: 'air',
  전갈: 'water',
  사수: 'fire',
  염소: 'earth',
  물병: 'air',
  물고기: 'water',
}

const SHINSAL_WHITELIST = new Set<string>([
  '천을귀인',
  '태극귀인',
  '천덕귀인',
  '월덕귀인',
  '문창귀인',
  '학당귀인',
  '금여록',
  '천주귀인',
  '암록',
  '건록',
  '제왕',
  '도화',
  '홍염살',
  '양인',
  '백호',
  '겁살',
  '재살',
  '천살',
  '지살',
  '년살',
  '월살',
  '망신',
  '고신',
  '괴강',
  '현침',
  '귀문관',
  '병부',
  '효신살',
  '상문살',
  '역마',
  '화개',
  '장성',
  '반안',
  '천라지망',
  '공망',
  '삼재',
  '원진',
])

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const toOptionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

const hasObjectKeys = (value: unknown): boolean => {
  const obj = toOptionalRecord(value)
  return !!obj && Object.keys(obj).length > 0
}

type DerivedCrossDomain = 'career' | 'relationship' | 'wealth' | 'health' | 'move'

type DerivedDomainScore = {
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

const DERIVED_CROSS_DOMAINS: DerivedCrossDomain[] = [
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

function normalizeMatrixSummaryDomainScores(
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

function normalizeDomainAnalysisScores(
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

function collectTopInsightHints(
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

function deriveCrossAgreementMatrix(
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

function deriveCrossAgreement(matrix: CrossAgreementMatrixRow[]): number | undefined {
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

function localizeDerivedDomain(domain: DerivedCrossDomain, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    switch (domain) {
      case 'career':
        return '커리어'
      case 'relationship':
        return '관계'
      case 'wealth':
        return '재정'
      case 'health':
        return '건강'
      case 'move':
        return '이동'
    }
  }
  return domain
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

function buildCrossEvidence(
  domainScores: Partial<Record<DerivedCrossDomain, DerivedDomainScore>>,
  matrix: CrossAgreementMatrixRow[],
  lang: 'ko' | 'en'
): CrossSnapshot['crossEvidence'] {
  return {
    summary: matrix
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
                matrix.find((row) => row.domain === domain) || {
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

function hasFullAdvancedAstroSignals(value: unknown): boolean {
  const signals = toOptionalRecord(value)
  if (!signals) return false
  return REQUIRED_ADVANCED_ASTRO_SIGNAL_KEYS.every((key) => signals[key] === true)
}

function normalizeGenderForSaju(value: unknown): 'male' | 'female' {
  const normalized = toOptionalString(value)?.toLowerCase()
  if (normalized === 'f' || normalized === 'female') {
    return 'female'
  }
  return 'male'
}

function normalizeWesternSignName(raw: string): string {
  return raw.trim().toLowerCase()
}

export function deriveDominantWesternElementFromPlanetSigns(
  planetSigns?: Record<string, unknown>
): MatrixCalculationInput['dominantWesternElement'] | undefined {
  if (!planetSigns) return undefined
  const score: Record<'fire' | 'earth' | 'air' | 'water', number> = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0,
  }
  const coreWeights: Record<string, number> = {
    sun: 3,
    moon: 3,
    mercury: 2,
    venus: 2,
    mars: 2,
    jupiter: 1,
    saturn: 1,
  }
  for (const [planet, signValue] of Object.entries(planetSigns)) {
    if (typeof signValue !== 'string') continue
    const sign = normalizeWesternSignName(signValue)
    const element = WESTERN_SIGN_ELEMENT_MAP[sign]
    if (!element) continue
    const weight = coreWeights[planet.trim().toLowerCase()] || 1
    score[element] += weight
  }
  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1])
  if (!sorted[0] || sorted[0][1] <= 0) return undefined
  return sorted[0][0] as MatrixCalculationInput['dominantWesternElement']
}

function normalizeTwelveStageKey(stage: string): string {
  if (stage === '건록') return '임관'
  if (stage === '제왕') return '왕지'
  return stage
}

function deriveAdvancedSajuMatrixFields(
  sajuData: ReturnType<typeof calculateSajuData>
): Pick<MatrixCalculationInput, 'twelveStages' | 'relations' | 'shinsalList'> {
  const stagesByPillar = getTwelveStagesForPillars(sajuData.pillars)
  const stageCount: Record<string, number> = {}
  for (const stage of Object.values(stagesByPillar)) {
    const key = normalizeTwelveStageKey(stage)
    stageCount[key] = (stageCount[key] || 0) + 1
  }

  const relations = analyzeRelations(
    toAnalyzeInputFromSaju(sajuData.pillars, sajuData.dayMaster?.name)
  )

  const shinsalHits = getShinsalHits(sajuData.pillars, {
    includeTwelveAll: true,
    includeGeneralShinsal: true,
    includeLuckyDetails: true,
  })
  const shinsalList = [
    ...new Set(shinsalHits.map((hit) => hit.kind).filter((k) => SHINSAL_WHITELIST.has(k))),
  ]

  return {
    twelveStages: stageCount as MatrixCalculationInput['twelveStages'],
    relations,
    shinsalList: shinsalList as MatrixCalculationInput['shinsalList'],
  }
}

function deriveSibsinDistributionFromSaju(sajuData: ReturnType<typeof calculateSajuData>) {
  const distribution: Record<string, number> = {}
  const pillars = [
    sajuData.yearPillar,
    sajuData.monthPillar,
    sajuData.dayPillar,
    sajuData.timePillar,
  ]
  for (const pillar of pillars) {
    if (pillar?.heavenlyStem?.sibsin) {
      distribution[pillar.heavenlyStem.sibsin] = (distribution[pillar.heavenlyStem.sibsin] || 0) + 1
    }
    if (pillar?.earthlyBranch?.sibsin) {
      distribution[pillar.earthlyBranch.sibsin] =
        (distribution[pillar.earthlyBranch.sibsin] || 0) + 1
    }
  }
  return distribution
}

function getDerivedSajuData(
  requestBody: Record<string, unknown>
): ReturnType<typeof calculateSajuData> | undefined {
  const candidate = requestBody[DERIVED_SAJU_KEY]
  if (!candidate || typeof candidate !== 'object') return undefined
  return candidate as ReturnType<typeof calculateSajuData>
}

function parseYearFromBirthDate(birthDate?: string): number | undefined {
  if (!birthDate) return undefined
  const year = Number(birthDate.slice(0, 4))
  return Number.isFinite(year) ? year : undefined
}

function buildDerivedSajuSnapshot(
  requestBody: Record<string, unknown>,
  sajuData: ReturnType<typeof calculateSajuData>
): SajuSnapshot {
  return {
    source: 'auto-derived-from-birth',
    birthDate: toOptionalString(requestBody.birthDate),
    birthTime: toOptionalString(requestBody.birthTime),
    timezone: toOptionalString(requestBody.timezone) || 'Asia/Seoul',
    dayMaster: sajuData.dayMaster,
    pillars: sajuData.pillars,
    fiveElements: sajuData.fiveElements,
    daeWoon: sajuData.daeWoon,
    unse: sajuData.unse,
    derivedAt: new Date().toISOString(),
  }
}

export function buildDerivedCrossSnapshot(
  requestBody: Record<string, unknown>,
  existing?: Partial<CrossSnapshot> | null
): CrossSnapshot {
  const relationCount = Array.isArray(requestBody.relations) ? requestBody.relations.length : 0
  const aspectCount = Array.isArray(requestBody.aspects) ? requestBody.aspects.length : 0
  const domainScoreMap =
    toOptionalRecord(requestBody.domainScores) || toOptionalRecord(requestBody.domainAnalysis)
  const domainScoreCount = domainScoreMap ? Object.keys(domainScoreMap).length : 0
  const currentDateIso =
    toOptionalString(requestBody.currentDateIso) ||
    toOptionalString(requestBody.targetDate) ||
    new Date().toISOString().slice(0, 10)
  const astroTimingIndex = buildAstroTimingIndex({
    activeTransits: Array.isArray(requestBody.activeTransits)
      ? (requestBody.activeTransits as MatrixCalculationInput['activeTransits'])
      : undefined,
    advancedAstroSignals: toOptionalRecord(
      requestBody.advancedAstroSignals
    ) as MatrixCalculationInput['advancedAstroSignals'],
  })
  const fromSummary = normalizeMatrixSummaryDomainScores(requestBody)
  const fromAnalysis = normalizeDomainAnalysisScores(requestBody)
  const fromInsights = collectTopInsightHints(requestBody)
  const mergedDomainScores: Partial<Record<DerivedCrossDomain, DerivedDomainScore>> = {}
  for (const domain of DERIVED_CROSS_DOMAINS) {
    const summaryScore = fromSummary[domain]
    const analysisScore = fromAnalysis[domain]
    const insightHints = fromInsights[domain]
    const base = summaryScore || analysisScore
    if (!base && !insightHints) continue
    mergedDomainScores[domain] = {
      domain,
      score: base?.score ?? 0.5,
      confidence: base?.confidence,
      overlapStrength: base?.overlapStrength,
      sajuComponentScore: base?.sajuComponentScore,
      astroComponentScore: base?.astroComponentScore,
      alignmentScore: base?.alignmentScore,
      peakMonth: base?.peakMonth,
      drivers: [...new Set([...(base?.drivers || []), ...(insightHints?.drivers || [])])].slice(0, 4),
      cautions: [...new Set([...(base?.cautions || []), ...(insightHints?.cautions || [])])].slice(0, 4),
    }
  }
  const crossAgreementMatrix = deriveCrossAgreementMatrix(
    mergedDomainScores,
    requestBody,
    astroTimingIndex,
    currentDateIso
  )
  const crossAgreement = deriveCrossAgreement(crossAgreementMatrix)
  const crossEvidence = buildCrossEvidence(
    mergedDomainScores,
    crossAgreementMatrix,
    toOptionalString(requestBody.lang) === 'en' ? 'en' : 'ko'
  )
  const existingAnchors = toOptionalRecord(existing?.anchors)
  const existingCoverage = toOptionalRecord(existing?.coverage)
  const existingDomainScores = toOptionalRecord(existing?.domainScores)
  const existingCrossEvidence = toOptionalRecord(existing?.crossEvidence)

  return {
    ...(existing || {}),
    source: toOptionalString(existing?.source) || 'auto-derived-from-input',
    theme: toOptionalString(existing?.theme) || toOptionalString(requestBody.theme) || null,
    category: toOptionalString(existing?.category) || toOptionalString(requestBody.category) || null,
    currentDateIso,
    anchors: {
      ...(existingAnchors || {}),
      dayMasterElement: toOptionalString(requestBody.dayMasterElement),
      geokguk: toOptionalString(requestBody.geokguk),
      yongsin: toOptionalString(requestBody.yongsin),
      currentDaeunElement: toOptionalString(requestBody.currentDaeunElement),
      currentSaeunElement: toOptionalString(requestBody.currentSaeunElement),
      currentWolunElement: toOptionalString(requestBody.currentWolunElement),
      currentIljinElement: toOptionalString(requestBody.currentIljinElement),
      currentIljinDate: toOptionalString(requestBody.currentIljinDate),
    },
    coverage: {
      ...(existingCoverage || {}),
      relationCount,
      aspectCount,
      domainScoreCount,
      hasAstrologySnapshot: !!toOptionalRecord(requestBody.astrologySnapshot),
      hasSajuSnapshot: !!toOptionalRecord(requestBody.sajuSnapshot),
    },
    astroTimingIndex: existing?.astroTimingIndex || astroTimingIndex,
    crossAgreement:
      typeof existing?.crossAgreement === 'number' && Number.isFinite(existing.crossAgreement)
        ? existing.crossAgreement
        : crossAgreement,
    crossAgreementMatrix:
      Array.isArray(existing?.crossAgreementMatrix) && existing.crossAgreementMatrix.length > 0
        ? existing.crossAgreementMatrix
        : crossAgreementMatrix,
    domainScores:
      existingDomainScores && Object.keys(existingDomainScores).length > 0
        ? existingDomainScores
        : Object.fromEntries(
            Object.entries(mergedDomainScores).map(([domain, score]) => [
              domain,
              {
                score: score?.score,
                confidence: score?.confidence,
                overlapStrength: score?.overlapStrength,
                sajuComponentScore: score?.sajuComponentScore,
                astroComponentScore: score?.astroComponentScore,
                alignmentScore: score?.alignmentScore,
                drivers: score?.drivers || [],
                cautions: score?.cautions || [],
                peakMonth: score?.peakMonth,
              },
            ])
          ),
    crossEvidence:
      existingCrossEvidence && Object.keys(existingCrossEvidence).length > 0
        ? existingCrossEvidence
        : crossEvidence,
    derivedAt: new Date().toISOString(),
  }
}

export function ensureDerivedSnapshots(
  requestBody: Record<string, unknown>
): Record<string, unknown> {
  const hasSajuSnapshot =
    !!toOptionalRecord(requestBody.sajuSnapshot) || !!toOptionalRecord(requestBody.saju)
  const hasCrossSnapshot =
    !!toOptionalRecord(requestBody.crossSnapshot) ||
    !!toOptionalRecord(requestBody.graphRagEvidence) ||
    !!toOptionalRecord(requestBody.matrixSummary)

  const derivedSaju = getDerivedSajuData(requestBody)
  if (!hasSajuSnapshot && derivedSaju) {
    requestBody.sajuSnapshot = buildDerivedSajuSnapshot(requestBody, derivedSaju)
  }
  const existingCrossSnapshot = toOptionalRecord(requestBody.crossSnapshot)
  if (!hasCrossSnapshot) {
    requestBody.crossSnapshot = buildDerivedCrossSnapshot(requestBody)
  } else if (existingCrossSnapshot) {
    requestBody.crossSnapshot = buildDerivedCrossSnapshot(
      requestBody,
      existingCrossSnapshot as Partial<CrossSnapshot>
    )
  }
  return requestBody
}

export function buildAutoDaeunTiming(
  requestBody: Record<string, unknown>,
  targetDate?: string
): TimingData['daeun'] {
  const derivedSaju = getDerivedSajuData(requestBody)
  const target = targetDate ? new Date(targetDate) : new Date()
  const targetYear = target.getFullYear()
  const birthYear = parseYearFromBirthDate(toOptionalString(requestBody.birthDate))
  const age = birthYear ? Math.max(0, targetYear - birthYear) : 0
  const startAge = Math.floor(age / 10) * 10
  const fallbackCycleIdx = Math.floor(age / 10)
  const fallbackStem = HEAVENLY_STEMS[((fallbackCycleIdx % 10) + 10) % 10]
  const fallbackBranch = EARTHLY_BRANCHES[((fallbackCycleIdx % 12) + 12) % 12]

  const derivedCurrent = derivedSaju?.daeWoon?.current
  const heavenlyStem = toOptionalString(derivedCurrent?.heavenlyStem) || fallbackStem
  const earthlyBranch = toOptionalString(derivedCurrent?.earthlyBranch) || fallbackBranch
  const derivedStartAge = toOptionalNumber(derivedCurrent?.age)
  const resolvedStartAge =
    derivedStartAge !== undefined && Number.isFinite(derivedStartAge)
      ? Math.max(0, Math.floor(derivedStartAge))
      : startAge
  const element =
    STEM_ELEMENT_BY_NAME[heavenlyStem] ||
    (STEM_ELEMENTS[heavenlyStem] as string | undefined) ||
    toOptionalString(requestBody.currentDaeunElement) ||
    toOptionalString(requestBody.currentSaeunElement) ||
    '토'

  return {
    heavenlyStem,
    earthlyBranch,
    element,
    startAge: resolvedStartAge,
    endAge: resolvedStartAge + 9,
    isCurrent: true,
  }
}

export function enrichRequestWithDerivedSaju(
  requestBody: Record<string, unknown>
): Record<string, unknown> {
  const birthDate = toOptionalString(requestBody.birthDate)
  if (!birthDate) {
    return requestBody
  }

  const birthTime = toOptionalString(requestBody.birthTime) || '12:00'
  const timezone = toOptionalString(requestBody.timezone) || 'Asia/Seoul'
  const gender = normalizeGenderForSaju(requestBody.gender)

  try {
    const sajuData = calculateSajuData(birthDate, birthTime, gender, 'solar', timezone)
    requestBody[DERIVED_SAJU_KEY] = sajuData as unknown as Record<string, unknown>
    const dayElement = toOptionalString(sajuData.dayPillar?.heavenlyStem?.element)
    const derivedDayMaster = dayElement ? ELEMENT_MAP[dayElement] : undefined

    if (derivedDayMaster) {
      requestBody.dayMasterElement = derivedDayMaster
    }

    const hasSibsinDistribution =
      !!requestBody.sibsinDistribution &&
      typeof requestBody.sibsinDistribution === 'object' &&
      !Array.isArray(requestBody.sibsinDistribution) &&
      Object.keys(requestBody.sibsinDistribution as Record<string, unknown>).length > 0
    if (!hasSibsinDistribution) {
      requestBody.sibsinDistribution = deriveSibsinDistributionFromSaju(sajuData)
    }

    const hasRelations = Array.isArray(requestBody.relations) && requestBody.relations.length > 0
    const hasTwelveStages =
      !!requestBody.twelveStages &&
      typeof requestBody.twelveStages === 'object' &&
      !Array.isArray(requestBody.twelveStages) &&
      Object.keys(requestBody.twelveStages as Record<string, unknown>).length > 0
    const hasShinsalList =
      Array.isArray(requestBody.shinsalList) && requestBody.shinsalList.length > 0
    if (!hasRelations || !hasTwelveStages || !hasShinsalList) {
      const derivedAdvanced = deriveAdvancedSajuMatrixFields(sajuData)
      if (!hasRelations && derivedAdvanced.relations.length > 0) {
        requestBody.relations = derivedAdvanced.relations
      }
      if (!hasTwelveStages && Object.keys(derivedAdvanced.twelveStages || {}).length > 0) {
        requestBody.twelveStages = derivedAdvanced.twelveStages
      }
      if (!hasShinsalList && (derivedAdvanced.shinsalList || []).length > 0) {
        requestBody.shinsalList = derivedAdvanced.shinsalList
      }
    }

    const geokguk = toOptionalString(requestBody.geokguk)
    const yongsin = toOptionalString(requestBody.yongsin)
    if (!geokguk || !yongsin) {
      const advanced = analyzeAdvancedSaju(
        {
          name: sajuData.dayPillar.heavenlyStem.name,
          element: sajuData.dayPillar.heavenlyStem.element,
          yin_yang: sajuData.dayPillar.heavenlyStem.yin_yang || '양',
        },
        {
          yearPillar: sajuData.yearPillar,
          monthPillar: sajuData.monthPillar,
          dayPillar: sajuData.dayPillar,
          timePillar: sajuData.timePillar,
        }
      )
      if (!geokguk) {
        requestBody.geokguk = GEOKGUK_ALIASES[advanced.geokguk.type] || advanced.geokguk.type
      }
      if (!yongsin) {
        requestBody.yongsin = advanced.yongsin.primary
      }
    }

    const targetDateIsoForAnnual =
      toOptionalString(requestBody.targetDate) ||
      toOptionalString(requestBody.currentDateIso) ||
      new Date().toISOString().slice(0, 10)
    const targetForAnnual = new Date(targetDateIsoForAnnual)
    const annualCurrent = (sajuData.unse?.annual || []).find(
      (row) => row.year === targetForAnnual.getFullYear()
    )
    const annualFallback = (sajuData.unse?.annual || [])[0]
    const annualElement = toOptionalString((annualCurrent || annualFallback)?.element)
    if (!requestBody.currentSaeunElement && annualElement && ELEMENT_MAP[annualElement]) {
      requestBody.currentSaeunElement = ELEMENT_MAP[annualElement]
    }

    const currentDaeunStem = toOptionalString(sajuData.daeWoon?.current?.heavenlyStem)
    if (
      !requestBody.currentDaeunElement &&
      currentDaeunStem &&
      STEM_ELEMENT_BY_NAME[currentDaeunStem]
    ) {
      requestBody.currentDaeunElement = STEM_ELEMENT_BY_NAME[currentDaeunStem]
    }

    const targetDateIso =
      toOptionalString(requestBody.targetDate) ||
      toOptionalString(requestBody.currentDateIso) ||
      new Date().toISOString().slice(0, 10)
    const target = new Date(targetDateIso)
    const targetYear = target.getFullYear()
    const targetMonth = target.getMonth() + 1
    const monthlyCurrent = (sajuData.unse?.monthly || []).find(
      (row) => row.year === targetYear && row.month === targetMonth
    )
    const monthlyFallback = (sajuData.unse?.monthly || [])[0]
    const monthlyElement = toOptionalString((monthlyCurrent || monthlyFallback)?.element)
    if (!requestBody.currentWolunElement && monthlyElement && ELEMENT_MAP[monthlyElement]) {
      requestBody.currentWolunElement = ELEMENT_MAP[monthlyElement]
    }

    const autoShortTermTiming = buildTimingData(targetDateIso)
    const iljinElement = toOptionalString(autoShortTermTiming.iljin?.element)
    if (!requestBody.currentIljinElement && iljinElement && ELEMENT_MAP[iljinElement]) {
      requestBody.currentIljinElement = ELEMENT_MAP[iljinElement]
    }
    if (!requestBody.currentIljinDate && autoShortTermTiming.iljin?.date) {
      requestBody.currentIljinDate = autoShortTermTiming.iljin.date
    }

    if (!toOptionalRecord(requestBody.sajuSnapshot)) {
      requestBody.sajuSnapshot = buildDerivedSajuSnapshot(requestBody, sajuData)
    }
  } catch (error) {
    logger.warn('[destiny-matrix/ai-report] Failed to derive saju from birth profile', {
      error: error instanceof Error ? error.message : String(error),
      birthDate,
    })
  }

  return requestBody
}

export async function enrichRequestWithDerivedAstrology(
  requestBody: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const hasAstroSnapshot =
    !!requestBody.astrologySnapshot &&
    typeof requestBody.astrologySnapshot === 'object' &&
    !Array.isArray(requestBody.astrologySnapshot)
  const hasAdvancedCoverage =
    hasObjectKeys(requestBody.asteroidHouses) &&
    hasObjectKeys(requestBody.extraPointSigns) &&
    hasFullAdvancedAstroSignals(requestBody.advancedAstroSignals)
  if (hasAstroSnapshot && hasAdvancedCoverage) {
    return requestBody
  }

  const birthDate = toOptionalString(requestBody.birthDate)
  const birthTime = toOptionalString(requestBody.birthTime)
  if (!birthDate || !birthTime) return requestBody

  const [year, month, date] = birthDate.split('-').map((v) => Number(v))
  const [hour, minute] = birthTime.split(':').map((v) => Number(v))
  if ([year, month, date, hour, minute].some((v) => !Number.isFinite(v))) return requestBody

  const latitude = toOptionalNumber(requestBody.latitude) ?? 37.5665
  const longitude = toOptionalNumber(requestBody.longitude) ?? 126.978
  const timeZone = toOptionalString(requestBody.timezone) || 'Asia/Seoul'

  try {
    const natal = await calculateNatalChart({
      year,
      month,
      date,
      hour,
      minute,
      latitude,
      longitude,
      timeZone,
    })
    const natalChart = toChart(natal)
    const natalAspects = findNatalAspects(natalChart, { includeMinor: true, maxResults: 80 })
    const nowIso = new Date().toISOString()
    const transit = await calculateTransitChart({
      iso: nowIso,
      latitude,
      longitude,
      timeZone,
    })
    const majorTransits = findMajorTransits(transit, natalChart, 1.0).slice(0, 40)

    const natalInput = { year, month, date, hour, minute, latitude, longitude, timeZone }
    const progressions = await calculateSecondaryProgressions({
      natal: natalInput,
      targetDate: nowIso.slice(0, 10),
    })
    const solarReturn = await calculateSolarReturn({
      natal: natalInput,
      year: new Date().getFullYear(),
    })
    const lunarReturn = await calculateLunarReturn({
      natal: natalInput,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    })

    const planetSigns: Record<string, string> = {}
    const planetHouses: Record<string, number> = {}
    for (const p of natal.planets) {
      if (typeof p.name === 'string' && typeof p.sign === 'string') {
        planetSigns[p.name] = p.sign
      }
      if (typeof p.name === 'string' && Number.isFinite(p.house)) {
        planetHouses[p.name] = p.house
      }
    }

    const houseCusps = Array.isArray(natal.houses) ? natal.houses.map((h) => h.cusp) : []
    const asteroidHouses: Record<string, number> = {}
    if (natal.meta?.jdUT && houseCusps.length > 0) {
      try {
        const asteroids = calculateAllAsteroids(natal.meta.jdUT, houseCusps)
        for (const key of ['Ceres', 'Pallas', 'Juno', 'Vesta'] as const) {
          const house = asteroids[key]?.house
          if (typeof house === 'number' && house >= 1 && house <= 12) {
            asteroidHouses[key] = house
          }
        }
      } catch (error) {
        logger.warn('[destiny-matrix/ai-report] Failed to derive asteroid houses', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const extraPointSigns: Record<string, string> = {}
    if (natal.meta?.jdUT && houseCusps.length > 0) {
      const sun = natal.planets.find((p) => p.name === 'Sun')
      const moon = natal.planets.find((p) => p.name === 'Moon')
      if (sun && moon && natal.ascendant) {
        try {
          const extras = await calculateExtraPoints(
            natal.meta.jdUT,
            latitude,
            longitude,
            natal.ascendant.longitude,
            sun.longitude,
            moon.longitude,
            sun.house,
            houseCusps
          )
          extraPointSigns.Chiron = extras.chiron.sign
          extraPointSigns.Lilith = extras.lilith.sign
          extraPointSigns.PartOfFortune = extras.partOfFortune.sign
          extraPointSigns.Vertex = extras.vertex.sign
        } catch (error) {
          logger.warn('[destiny-matrix/ai-report] Failed to derive extra-point signs', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    const birthYear = Number(birthDate.slice(0, 4))
    const currentYear = new Date().getFullYear()
    const currentAge = Number.isFinite(birthYear) ? Math.max(0, currentYear - birthYear) : undefined
    const draconic = compareDraconicToNatal(natalChart)
    const harmonics = generateHarmonicProfile(natalChart, currentAge)
    const fixedStars = findFixedStarConjunctions(natalChart, currentYear, 1.0).slice(0, 20)
    const eclipseImpact = findEclipseImpact(natalChart).slice(0, 20)
    const upcomingEclipses = getUpcomingEclipses(new Date(nowIso), 6)
    const midpoints = calculateMidpoints(natalChart)
    const midpointActivations = findMidpointActivations(natalChart, 1.5).slice(0, 30)

    const existingAdvancedSignals = toOptionalRecord(requestBody.advancedAstroSignals) || {}
    const advancedAstroSignals = {
      ...existingAdvancedSignals,
      solarReturn: true,
      lunarReturn: true,
      progressions: true,
      draconic: true,
      harmonics: true,
      fixedStars: fixedStars.length > 0,
      eclipses: eclipseImpact.length > 0 || upcomingEclipses.length > 0,
      midpoints: midpoints.length > 0,
      asteroids: Object.keys(asteroidHouses).length > 0,
      extraPoints: Object.keys(extraPointSigns).length > 0,
    }

    requestBody.astrologySnapshot = {
      natalChart: natal,
      natalAspects,
      currentTransits: {
        asOfIso: nowIso,
        majorTransits,
      },
      progressions,
      returns: {
        solarReturn,
        lunarReturn,
      },
      advanced: {
        draconic,
        harmonics,
        fixedStars,
        eclipses: {
          impact: eclipseImpact,
          upcoming: upcomingEclipses,
        },
        midpoints: {
          all: midpoints,
          activations: midpointActivations,
        },
      },
    } satisfies AstrologySnapshot
    if (!requestBody.planetSigns || typeof requestBody.planetSigns !== 'object') {
      requestBody.planetSigns = planetSigns
    }
    if (!requestBody.planetHouses || typeof requestBody.planetHouses !== 'object') {
      requestBody.planetHouses = planetHouses
    }
    if (!requestBody.dominantWesternElement) {
      const derivedDominant = deriveDominantWesternElementFromPlanetSigns(
        (requestBody.planetSigns as Record<string, unknown>) || planetSigns
      )
      if (derivedDominant) {
        requestBody.dominantWesternElement = derivedDominant
      }
    }
    if (!Array.isArray(requestBody.aspects)) {
      requestBody.aspects = natalAspects.map((a) => ({
        planet1: a.from.name,
        planet2: a.to.name,
        type: a.type,
        orb: a.orb,
      }))
    }
    if (!hasObjectKeys(requestBody.asteroidHouses) && Object.keys(asteroidHouses).length > 0) {
      requestBody.asteroidHouses = asteroidHouses
    }
    if (!hasObjectKeys(requestBody.extraPointSigns) && Object.keys(extraPointSigns).length > 0) {
      requestBody.extraPointSigns = extraPointSigns
    }
    requestBody.advancedAstroSignals = advancedAstroSignals
    logger.debug('[destiny-matrix/ai-report] Derived advanced astrology coverage', {
      asteroidCount: Object.keys(asteroidHouses).length,
      extraPointCount: Object.keys(extraPointSigns).length,
      advancedSignals: advancedAstroSignals,
    })
  } catch (error) {
    logger.warn('[destiny-matrix/ai-report] Failed to derive astrology from birth profile', {
      error: error instanceof Error ? error.message : String(error),
      birthDate,
    })
  }

  return requestBody
}

export function ensureDerivedDominantWesternElement(
  requestBody: Record<string, unknown>
): Record<string, unknown> {
  if (requestBody.dominantWesternElement) return requestBody
  const derived = deriveDominantWesternElementFromPlanetSigns(
    toOptionalRecord(requestBody.planetSigns)
  )
  if (derived) {
    requestBody.dominantWesternElement = derived
  }
  return requestBody
}

export function buildTimingDataFromDerivedSaju(
  requestBody: Record<string, unknown>,
  targetDate?: string
): Partial<TimingData> {
  const derivedSaju = getDerivedSajuData(requestBody)
  if (!derivedSaju) return {}

  const target = targetDate ? new Date(targetDate) : new Date()
  const baseTiming = buildTimingData(targetDate)
  const targetYear = target.getFullYear()
  const targetMonth = target.getMonth() + 1

  const currentDaeun = derivedSaju.daeWoon?.current
  const annualCurrent = (derivedSaju.unse?.annual || []).find((row) => row.year === targetYear)
  const annualFallback = (derivedSaju.unse?.annual || [])[0]
  const monthlyCurrent = (derivedSaju.unse?.monthly || []).find(
    (row) => row.year === targetYear && row.month === targetMonth
  )
  const monthlyFallback = (derivedSaju.unse?.monthly || [])[0]

  const daeun =
    currentDaeun && currentDaeun.heavenlyStem && currentDaeun.earthlyBranch
      ? {
          heavenlyStem: currentDaeun.heavenlyStem,
          earthlyBranch: currentDaeun.earthlyBranch,
          element:
            STEM_ELEMENT_BY_NAME[currentDaeun.heavenlyStem] ||
            toOptionalString(requestBody.currentDaeunElement) ||
            '토',
          startAge: Math.max(0, Math.floor(currentDaeun.age || 0)),
          endAge: Math.max(9, Math.floor((currentDaeun.age || 0) + 9)),
          isCurrent: true,
        }
      : undefined

  const seunSource = annualCurrent || annualFallback
  const seun =
    seunSource && seunSource.year
      ? {
          year: seunSource.year,
          heavenlyStem: seunSource.heavenlyStem || '',
          earthlyBranch: seunSource.earthlyBranch || '',
          element: seunSource.element || '토',
        }
      : undefined

  const wolunSource = monthlyCurrent || monthlyFallback
  const wolun =
    wolunSource && wolunSource.month
      ? {
          month: wolunSource.month,
          heavenlyStem: wolunSource.heavenlyStem || '',
          earthlyBranch: wolunSource.earthlyBranch || '',
          element: wolunSource.element || '토',
        }
      : undefined

  return { daeun, seun, wolun, iljin: baseTiming.iljin }
}

export function buildTimingData(targetDate?: string): TimingData {
  const date = targetDate ? new Date(targetDate) : new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const yearStemIdx = (year - 4) % 10
  const yearBranchIdx = (year - 4) % 12
  const monthStemIdx = (((year - 4) % 5) * 2 + month + 1) % 10
  const monthBranchIdx = (month + 1) % 12

  const baseDate = new Date(1900, 0, 1)
  const dayDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
  const dayStemIdx = (dayDiff + 10) % 10
  const dayBranchIdx = dayDiff % 12

  return {
    seun: {
      year,
      heavenlyStem: HEAVENLY_STEMS[yearStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[yearBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[yearStemIdx]],
    },
    wolun: {
      month,
      heavenlyStem: HEAVENLY_STEMS[monthStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[monthBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[monthStemIdx]],
    },
    iljin: {
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      heavenlyStem: HEAVENLY_STEMS[dayStemIdx],
      earthlyBranch: EARTHLY_BRANCHES[dayBranchIdx],
      element: STEM_ELEMENTS[HEAVENLY_STEMS[dayStemIdx]],
    },
  }
}
