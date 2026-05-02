/**
 * Couple Timing Analysis
 *
 * Cross-correlate two persons' 세운 (annual) + 월운 (monthly) flows to
 * surface concrete dates: best meeting months, activation windows,
 * caution periods. Uses real saju engine output (calculateSajuData)
 * — no hardcoded calendar suggestions.
 */

const ELEMENT_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'] as const

const ELEMENT_KO: Record<string, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
}

const KO_TO_EN: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

function normalizeEl(el: string | undefined): string {
  if (!el) return 'earth'
  const lower = el.toLowerCase()
  if (ELEMENT_ORDER.includes(lower as (typeof ELEMENT_ORDER)[number])) return lower
  return KO_TO_EN[el] || 'earth'
}

/** 5-element relation. Returns relation FROM `a` TO `b`. */
type ElementRelation = 'same' | 'drain' | 'control' | 'controlled' | 'support'

function elementRelation(a: string, b: string): ElementRelation {
  const ai = ELEMENT_ORDER.indexOf(a as (typeof ELEMENT_ORDER)[number])
  const bi = ELEMENT_ORDER.indexOf(b as (typeof ELEMENT_ORDER)[number])
  if (ai < 0 || bi < 0) return 'same'
  if (ai === bi) return 'same'
  const diff = (bi - ai + 5) % 5
  if (diff === 1) return 'drain' // a generates b → a 설기
  if (diff === 2) return 'control' // a controls b → a가 재
  if (diff === 3) return 'controlled' // b controls a → a 관
  return 'support' // b generates a → a 인 (도움)
}

/** Score a sibsin (10 gods) keyword on 0-100 favorability. */
function sibsinScore(sibsin?: string): number {
  if (!sibsin) return 50
  const s = sibsin.replace(/\s+/g, '')
  if (s === '정인' || s === '편인') return 80 // 인 — 도움, 학습
  if (s === '식신') return 75 // 표현, 풍요
  if (s === '정관') return 70 // 책임, 명예
  if (s === '정재') return 70 // 안정 재물
  if (s === '편재') return 65 // 활동 재물
  if (s === '비견') return 60 // 동료
  if (s === '상관') return 50 // 표현 + 마찰
  if (s === '겁재') return 45 // 경쟁
  if (s === '편관') return 40 // 압박, 시련
  return 50
}

interface MonthlyCycle {
  year: number
  month: number
  ganji?: string
  element?: string
  sibsin?: { cheon?: string; ji?: string }
}

interface AnnualCycle {
  year: number
  ganji?: string
  element?: string
  sibsin?: { cheon?: string; ji?: string }
}

interface SajuLite {
  dayMasterElement: string
  dayPillarBranch?: string
  monthly: MonthlyCycle[]
  annual: AnnualCycle[]
}

/** Pull just what we need from calculateSajuData output. */
function liteSaju(saju: Record<string, unknown> | null | undefined): SajuLite | null {
  if (!saju) return null
  const dm = (saju as { dayMaster?: { element?: string } }).dayMaster
  const dpBranch = (saju as { dayPillar?: { earthlyBranch?: { name?: string } } }).dayPillar
    ?.earthlyBranch?.name
  const unse = (saju as { unse?: { annual?: AnnualCycle[]; monthly?: MonthlyCycle[] } }).unse
  if (!dm?.element || !unse?.monthly || !unse?.annual) return null
  return {
    dayMasterElement: normalizeEl(dm.element),
    dayPillarBranch: dpBranch,
    monthly: unse.monthly,
    annual: unse.annual,
  }
}

interface MonthLabel {
  year: number
  month: number
  label: 'great' | 'good' | 'neutral' | 'caution'
  reason: string
}

export interface CoupleTimingAnalysis {
  bestMeetingMonth: MonthLabel | null
  upcomingMonths: MonthLabel[]
  activationPeriod: { when: string; reason: string } | null
  cautionPeriod: { when: string; reason: string } | null
  primeYearWindow: { startYear: number; endYear: number; reason: string } | null
  monthlyOutlook: string
}

const SEASON_KO = (month: number): string => {
  if (month >= 3 && month <= 5) return '봄'
  if (month >= 6 && month <= 8) return '여름'
  if (month >= 9 && month <= 11) return '가을'
  return '겨울'
}

function scoreMonthForCouple(
  el: string,
  p1Dm: string,
  p2Dm: string,
  p1Sibsin?: string,
  p2Sibsin?: string
): { score: number; tone: 'positive' | 'neutral' | 'negative'; brief: string } {
  const r1 = elementRelation(p1Dm, el)
  const r2 = elementRelation(p2Dm, el)
  const sibsinAvg = (sibsinScore(p1Sibsin) + sibsinScore(p2Sibsin)) / 2

  // Element relation score
  const relScore = (rel: ElementRelation): number => {
    if (rel === 'support') return 80 // 인 — 도움
    if (rel === 'same') return 65 // 비겁 — 동기
    if (rel === 'drain') return 60 // 식상 — 표현
    if (rel === 'control') return 55 // 재 — 활동
    return 30 // controlled — 관, 도전
  }

  const elScore = (relScore(r1) + relScore(r2)) / 2
  const finalScore = Math.round(elScore * 0.6 + sibsinAvg * 0.4)

  let tone: 'positive' | 'neutral' | 'negative' = 'neutral'
  if (finalScore >= 70) tone = 'positive'
  else if (finalScore < 45) tone = 'negative'

  // Brief reason — pick the most expressive signal
  const elKo = ELEMENT_KO[el] || el
  let brief = ''
  if (r1 === 'support' && r2 === 'support') {
    brief = `${elKo} 기운이 둘 다 도와주는 흐름`
  } else if (r1 === 'controlled' && r2 === 'controlled') {
    brief = `${elKo} 기운이 둘 다 압박하는 흐름`
  } else if (r1 === 'drain' && r2 === 'drain') {
    brief = `${elKo} — 둘 다 표현·활동 활성`
  } else if (r1 === 'support' || r2 === 'support') {
    brief = `${elKo} — 한쪽 도움 + ${tone === 'negative' ? '한쪽 부담' : '한쪽 평이'}`
  } else if (r1 === 'controlled' || r2 === 'controlled') {
    brief = `${elKo} — 한쪽 압박, 속도 조절 필요`
  } else {
    brief = `${elKo} 기운 흐름`
  }

  return { score: finalScore, tone, brief }
}

export function analyzeCoupleTiming(
  p1Raw: Record<string, unknown> | null | undefined,
  p2Raw: Record<string, unknown> | null | undefined
): CoupleTimingAnalysis | null {
  const p1 = liteSaju(p1Raw)
  const p2 = liteSaju(p2Raw)
  if (!p1 || !p2) return null

  // ── Monthly outlook (next 12 months) ──
  const minLen = Math.min(p1.monthly.length, p2.monthly.length, 12)
  const months: Array<{ data: MonthLabel; score: number }> = []

  for (let i = 0; i < minLen; i++) {
    const m1 = p1.monthly[i]
    const m2 = p2.monthly[i]
    if (!m1?.element || !m2?.element) continue

    // Use month element as primary signal (same calendar month for both)
    const el = normalizeEl(m1.element)
    const r = scoreMonthForCouple(
      el,
      p1.dayMasterElement,
      p2.dayMasterElement,
      m1.sibsin?.cheon,
      m2.sibsin?.cheon
    )

    let label: MonthLabel['label'] = 'neutral'
    if (r.score >= 75) label = 'great'
    else if (r.score >= 60) label = 'good'
    else if (r.score < 45) label = 'caution'

    months.push({
      data: {
        year: m1.year,
        month: m1.month,
        label,
        reason: r.brief,
      },
      score: r.score,
    })
  }

  const upcomingMonths = months.map((m) => m.data)

  // ── Best meeting month ──
  const bestSorted = [...months].sort((a, b) => b.score - a.score)
  const bestMeetingMonth = bestSorted[0]?.data || null

  // ── Activation period — longest run of consecutive good/great months ──
  let activationPeriod: CoupleTimingAnalysis['activationPeriod'] = null
  let curStart = -1
  let curEnd = -1
  let bestRunLen = 0
  let bestRunStart = -1
  let bestRunEnd = -1
  for (let i = 0; i < months.length; i++) {
    const m = months[i]
    if (m.score >= 60) {
      if (curStart < 0) curStart = i
      curEnd = i
      const runLen = curEnd - curStart + 1
      if (runLen > bestRunLen) {
        bestRunLen = runLen
        bestRunStart = curStart
        bestRunEnd = curEnd
      }
    } else {
      curStart = -1
      curEnd = -1
    }
  }
  if (bestRunLen >= 2) {
    const startM = months[bestRunStart].data
    const endM = months[bestRunEnd].data
    const startStr = `${startM.year}년 ${startM.month}월`
    const endStr =
      bestRunStart === bestRunEnd ? '' : ` ~ ${endM.year}년 ${endM.month}월`
    activationPeriod = {
      when: `${startStr}${endStr}`,
      reason: `연속 ${bestRunLen}개월 동안 ${SEASON_KO(startM.month)} 기운이 두 분의 일간을 받쳐줘 표현·결정·만남에 가속이 붙는 시기`,
    }
  }

  // ── Caution period — first month with score < 45, with run length ──
  let cautionPeriod: CoupleTimingAnalysis['cautionPeriod'] = null
  for (let i = 0; i < months.length; i++) {
    if (months[i].score < 45) {
      const m = months[i].data
      let runLen = 1
      while (i + runLen < months.length && months[i + runLen].score < 50) runLen += 1
      cautionPeriod = {
        when: `${m.year}년 ${m.month}월${runLen > 1 ? ` (~${runLen}개월)` : ''}`,
        reason: `${m.reason} — 큰 결정·정리는 다음 활성기로 미루는 편이 안전`,
      }
      break
    }
  }

  // ── Prime year window from 6-year annual cycles ──
  const yearCount = Math.min(p1.annual.length, p2.annual.length, 6)
  const yearScores: Array<{ year: number; score: number; tone: string }> = []
  for (let i = 0; i < yearCount; i++) {
    const a1 = p1.annual[i]
    const a2 = p2.annual[i]
    if (!a1?.element || !a2?.element) continue
    const el = normalizeEl(a1.element)
    const r = scoreMonthForCouple(
      el,
      p1.dayMasterElement,
      p2.dayMasterElement,
      a1.sibsin?.cheon,
      a2.sibsin?.cheon
    )
    yearScores.push({ year: a1.year, score: r.score, tone: r.tone })
  }
  const primeYear = [...yearScores].sort((a, b) => b.score - a.score)[0]
  let primeYearWindow: CoupleTimingAnalysis['primeYearWindow'] = null
  if (primeYear && primeYear.score >= 60) {
    primeYearWindow = {
      startYear: primeYear.year,
      endYear: primeYear.year,
      reason: `${primeYear.year}년이 두 분 사주 기운에 가장 잘 받쳐지는 해 — 큰 결정·약속·동거·결혼 등 장기 약속을 단단히 만들기 좋아요.`,
    }
  }

  // ── Overall narrative ──
  const greatCount = months.filter((m) => m.score >= 75).length
  const cautionCount = months.filter((m) => m.score < 45).length
  let monthlyOutlook = ''
  if (greatCount >= 4) {
    monthlyOutlook = `앞으로 1년 중 ${greatCount}개월이 두 분에게 활성기 — 흐름이 굵게 흘러가는 한 해`
  } else if (greatCount >= 2) {
    monthlyOutlook = `앞으로 1년 중 ${greatCount}개월이 활성기 — 큰 결정은 그 시기에 모아서 처리하면 좋아요`
  } else if (cautionCount >= 4) {
    monthlyOutlook = `앞으로 1년에 조심 시기가 ${cautionCount}개월 — 조용히 다지면서 다음 활성기를 기다리는 한 해`
  } else {
    monthlyOutlook = `앞으로 1년 흐름이 비교적 평이 — 일상의 리듬을 단단히 쌓는 시기`
  }

  return {
    bestMeetingMonth,
    upcomingMonths,
    activationPeriod,
    cautionPeriod,
    primeYearWindow,
    monthlyOutlook,
  }
}
