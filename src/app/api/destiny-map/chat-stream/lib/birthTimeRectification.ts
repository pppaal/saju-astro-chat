import type { NatalChartData } from '@/lib/astrology'
import type { SajuDataStructure } from './types'
import { computeAstroData, computeSajuData } from './chart-calculator'

type RectificationDomain = 'career' | 'relationship' | 'wealth' | 'health' | 'move'

export type BirthTimeRectificationCandidate = {
  birthTime: string
  label?: string
  status: 'current-best' | 'plausible' | 'low-fit'
  fitScore: number
  confidence: number
  summary: string
  timePillarLabel?: string
  ascendantSign?: string
  changedDomains: string[]
  supportSignals: string[]
  cautionSignals: string[]
}

type BirthTimeRectificationParams = {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  locale: 'ko' | 'en'
  timeZone?: string
  focusDomain?: string
  currentSaju?: SajuDataStructure
  currentNatalChart?: NatalChartData
}

type ComparedBirthTimeCandidate = Omit<BirthTimeRectificationCandidate, 'status'>

const KEY_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

const DOMAIN_HOUSES: Record<RectificationDomain, number[]> = {
  career: [6, 10],
  relationship: [5, 7],
  wealth: [2, 8, 11],
  health: [6, 12],
  move: [3, 4, 9],
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function round2(value: number): number {
  return Math.round(clamp01(value) * 100) / 100
}

function avg(values: number[]): number {
  const valid = values.filter((value) => Number.isFinite(value))
  if (!valid.length) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function parseTimeParts(birthTime: string): { hour: number; minute: number } {
  const [hour, minute] = birthTime.split(':').map((value) => Number(value) || 0)
  return { hour, minute }
}

function normalizeHour(hour: number): number {
  const normalized = hour % 24
  return normalized < 0 ? normalized + 24 : normalized
}

function formatBirthTime(hour: number, minute: number): string {
  const normalizedHour = normalizeHour(hour)
  const hh = String(normalizedHour).padStart(2, '0')
  const mm = String(Math.max(0, Math.min(59, minute))).padStart(2, '0')
  return `${hh}:${mm}`
}

function buildCandidateTimes(birthTime: string): string[] {
  const { hour, minute } = parseTimeParts(birthTime)
  return uniq([
    formatBirthTime(hour, minute),
    formatBirthTime(hour - 2, minute),
    formatBirthTime(hour + 2, minute),
  ])
}

function getTimePillarLabel(saju?: SajuDataStructure): string | undefined {
  const stem = String(saju?.pillars?.time?.heavenlyStem?.name || '').trim()
  const branch = String(saju?.pillars?.time?.earthlyBranch?.name || '').trim()
  const label = `${stem}${branch}`.trim()
  return label || undefined
}

function getAscendantSign(chart?: NatalChartData): string | undefined {
  return String(chart?.ascendant?.sign || '').trim() || undefined
}

function getPlanetHouseMap(chart?: NatalChartData): Record<string, number> {
  const out: Record<string, number> = {}
  for (const planet of chart?.planets || []) {
    if (!KEY_PLANETS.includes(String(planet.name))) continue
    if (typeof planet.house !== 'number' || !Number.isFinite(planet.house)) continue
    out[String(planet.name)] = planet.house
  }
  return out
}

function buildDomainScores(chart?: NatalChartData): Record<RectificationDomain, number> {
  const houses = getPlanetHouseMap(chart)
  const scores = {
    career: 0,
    relationship: 0,
    wealth: 0,
    health: 0,
    move: 0,
  }

  for (const house of Object.values(houses)) {
    for (const [domain, targetHouses] of Object.entries(DOMAIN_HOUSES) as Array<
      [RectificationDomain, number[]]
    >) {
      if (targetHouses.includes(house)) {
        scores[domain] += 1
      }
    }
  }

  return scores
}

function diffDomains(
  currentChart?: NatalChartData,
  candidateChart?: NatalChartData
): RectificationDomain[] {
  const current = buildDomainScores(currentChart)
  const candidate = buildDomainScores(candidateChart)
  return (Object.keys(DOMAIN_HOUSES) as RectificationDomain[]).filter(
    (domain) => current[domain] !== candidate[domain]
  )
}

function diffMovedPlanets(
  currentChart?: NatalChartData,
  candidateChart?: NatalChartData
): string[] {
  const current = getPlanetHouseMap(currentChart)
  const candidate = getPlanetHouseMap(candidateChart)
  return KEY_PLANETS.filter((planet) => current[planet] !== candidate[planet])
}

function localizeDomain(domain: RectificationDomain, locale: 'ko' | 'en'): string {
  if (locale !== 'ko') return domain
  if (domain === 'career') return '커리어'
  if (domain === 'relationship') return '관계'
  if (domain === 'wealth') return '재정'
  if (domain === 'health') return '건강'
  return '이동'
}

function summarizeChangedDomains(domains: RectificationDomain[], locale: 'ko' | 'en'): string {
  if (!domains.length) {
    return locale === 'ko'
      ? '핵심 도메인 강조는 크게 바뀌지 않습니다.'
      : 'Core domain emphasis stays broadly stable.'
  }

  const labels = domains.map((domain) => localizeDomain(domain, locale))
  return locale === 'ko'
    ? `${labels.join(', ')} 축의 강조가 민감하게 움직입니다.`
    : `${labels.join(', ')} emphasis shifts more noticeably.`
}

function buildSupportSignals(params: {
  locale: 'ko' | 'en'
  sameTimePillar: boolean
  currentTimePillar?: string
  candidateTimePillar?: string
  sameAscendant: boolean
  currentAscendant?: string
  candidateAscendant?: string
  changedDomains: RectificationDomain[]
}): string[] {
  const { locale } = params
  const signals: string[] = []

  if (params.sameTimePillar && params.candidateTimePillar) {
    signals.push(
      locale === 'ko'
        ? `시주 축은 ${params.candidateTimePillar}로 유지됩니다.`
        : `The time pillar stays at ${params.candidateTimePillar}.`
    )
  } else if (params.currentTimePillar && params.candidateTimePillar) {
    signals.push(
      locale === 'ko'
        ? `시주 축이 ${params.currentTimePillar}에서 ${params.candidateTimePillar}로 바뀝니다.`
        : `The time pillar changes from ${params.currentTimePillar} to ${params.candidateTimePillar}.`
    )
  }

  if (params.sameAscendant && params.candidateAscendant) {
    signals.push(
      locale === 'ko'
        ? `상승궁은 ${params.candidateAscendant}로 유지됩니다.`
        : `The ascendant stays in ${params.candidateAscendant}.`
    )
  } else if (params.currentAscendant && params.candidateAscendant) {
    signals.push(
      locale === 'ko'
        ? `상승궁이 ${params.currentAscendant}에서 ${params.candidateAscendant}로 이동합니다.`
        : `The ascendant shifts from ${params.currentAscendant} to ${params.candidateAscendant}.`
    )
  }

  signals.push(summarizeChangedDomains(params.changedDomains, locale))
  return signals.filter(Boolean).slice(0, 3)
}

function buildCautionSignals(params: {
  locale: 'ko' | 'en'
  focusDomain?: string
  changedDomains: RectificationDomain[]
  movedPlanets: string[]
}): string[] {
  const signals: string[] = []

  if (
    params.focusDomain &&
    params.changedDomains.includes(params.focusDomain as RectificationDomain)
  ) {
    signals.push(
      params.locale === 'ko'
        ? '현재 질문 도메인의 해석 민감도가 올라갑니다.'
        : 'The current question domain becomes more sensitive.'
    )
  }

  if (params.movedPlanets.length) {
    signals.push(
      params.locale === 'ko'
        ? `하우스 재배치가 생기는 행성: ${params.movedPlanets.slice(0, 3).join(', ')}`
        : `Planets changing house emphasis: ${params.movedPlanets.slice(0, 3).join(', ')}`
    )
  }

  if (!signals.length) {
    signals.push(
      params.locale === 'ko'
        ? '큰 해석 축은 비교적 안정적입니다.'
        : 'The larger interpretation frame stays relatively stable.'
    )
  }

  return signals.slice(0, 3)
}

export function compareBirthTimeCandidate(params: {
  locale: 'ko' | 'en'
  currentBirthTime: string
  candidateBirthTime: string
  focusDomain?: string
  currentSaju?: SajuDataStructure
  candidateSaju?: SajuDataStructure
  currentNatalChart?: NatalChartData
  candidateNatalChart?: NatalChartData
}): ComparedBirthTimeCandidate {
  const currentTimePillar = getTimePillarLabel(params.currentSaju)
  const candidateTimePillar = getTimePillarLabel(params.candidateSaju)
  const currentAscendant = getAscendantSign(params.currentNatalChart)
  const candidateAscendant = getAscendantSign(params.candidateNatalChart)
  const changedDomains = diffDomains(params.currentNatalChart, params.candidateNatalChart)
  const movedPlanets = diffMovedPlanets(params.currentNatalChart, params.candidateNatalChart)
  const sameTimePillar =
    Boolean(currentTimePillar) &&
    Boolean(candidateTimePillar) &&
    currentTimePillar === candidateTimePillar
  const sameAscendant =
    Boolean(currentAscendant) &&
    Boolean(candidateAscendant) &&
    currentAscendant === candidateAscendant
  const houseStability = 1 - Math.min(movedPlanets.length / 6, 0.7)
  const domainStability = 1 - Math.min(changedDomains.length / 5, 0.7)
  const focusPenalty =
    params.focusDomain && changedDomains.includes(params.focusDomain as RectificationDomain)
      ? 0.14
      : 0
  const fitScore = round2(
    avg([
      sameTimePillar ? 1 : 0.44,
      sameAscendant ? 1 : 0.52,
      houseStability,
      Math.max(0, domainStability - focusPenalty),
    ])
  )
  const confidence = round2(
    fitScore * (params.candidateBirthTime === params.currentBirthTime ? 0.94 : 0.78)
  )
  const summary =
    params.locale === 'ko'
      ? `${params.candidateBirthTime}로 읽으면 ${candidateTimePillar ? `시주는 ${candidateTimePillar}` : '시주 정보는 제한적이고'}, ${candidateAscendant ? `상승궁은 ${candidateAscendant}` : '상승궁 변화는 제한적이며'} ${summarizeChangedDomains(changedDomains, params.locale)}`
      : `At ${params.candidateBirthTime}, ${candidateTimePillar ? `the time pillar reads as ${candidateTimePillar}` : 'the time pillar remains limited'}, ${candidateAscendant ? `the ascendant reads as ${candidateAscendant}` : 'ascendant change stays limited'}, and ${summarizeChangedDomains(changedDomains, params.locale).toLowerCase()}`

  return {
    birthTime: params.candidateBirthTime,
    label:
      params.locale === 'ko'
        ? params.candidateBirthTime === params.currentBirthTime
          ? '기록된 생시'
          : '비교 생시'
        : params.candidateBirthTime === params.currentBirthTime
          ? 'Recorded time'
          : 'Comparison time',
    fitScore,
    confidence,
    summary,
    timePillarLabel: candidateTimePillar,
    ascendantSign: candidateAscendant,
    changedDomains,
    supportSignals: buildSupportSignals({
      locale: params.locale,
      sameTimePillar,
      currentTimePillar,
      candidateTimePillar,
      sameAscendant,
      currentAscendant,
      candidateAscendant,
      changedDomains,
    }),
    cautionSignals: buildCautionSignals({
      locale: params.locale,
      focusDomain: params.focusDomain,
      changedDomains,
      movedPlanets,
    }),
  }
}

export async function buildBirthTimeRectificationCandidates(
  params: BirthTimeRectificationParams
): Promise<BirthTimeRectificationCandidate[]> {
  const candidateTimes = buildCandidateTimes(params.birthTime)
  const currentChart =
    params.currentNatalChart ||
    (await (async () => {
      const astroResult = await computeAstroData(
        params.birthDate,
        params.birthTime,
        params.latitude,
        params.longitude,
        params.timeZone || 'Asia/Seoul'
      )
      return astroResult.natalChartData
    })())
  const currentSaju =
    params.currentSaju ||
    ((await computeSajuData(
      params.birthDate,
      params.birthTime,
      params.gender,
      params.timeZone || 'Asia/Seoul'
    )) as SajuDataStructure | undefined)

  const compared = await Promise.all(
    candidateTimes.map(async (candidateBirthTime) => {
      const astroResult = await computeAstroData(
        params.birthDate,
        candidateBirthTime,
        params.latitude,
        params.longitude,
        params.timeZone || 'Asia/Seoul'
      )
      const candidateSaju = (await computeSajuData(
        params.birthDate,
        candidateBirthTime,
        params.gender,
        params.timeZone || 'Asia/Seoul'
      )) as SajuDataStructure | undefined

      return compareBirthTimeCandidate({
        locale: params.locale,
        currentBirthTime: params.birthTime,
        candidateBirthTime,
        focusDomain: params.focusDomain,
        currentSaju,
        candidateSaju,
        currentNatalChart: currentChart,
        candidateNatalChart: astroResult.natalChartData,
      })
    })
  )

  const topFit = Math.max(...compared.map((item) => item.fitScore), 0)
  return compared
    .sort((left, right) => right.fitScore - left.fitScore)
    .map((item) => ({
      ...item,
      status:
        item.birthTime === params.birthTime
          ? 'current-best'
          : item.fitScore >= topFit - 0.08
            ? 'plausible'
            : 'low-fit',
    }))
}
