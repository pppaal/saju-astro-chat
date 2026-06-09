import { STEMS } from '@/lib/saju/constants'
import { getYearPillarForDate, getMonthPillarForDate } from '@/lib/saju/datePillars'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { FiveElement } from '@/lib/saju/types'

/**
 * 용신 (用神) 활성 추출기 — 명시적 길흉 신호.
 *
 * 본명의 용신·기신·구신이 대운/세운/월운/일주에 들어올 때 명시 신호 생성.
 * (saju-pillar 추출기에 polarity로 녹아 있지만, 별도 "용신 진입" 신호로 한 번 더 띄워
 *  사용자가 캘린더에서 "내 용신 시기" 필터링하기 좋게 함.)
 *
 * 활성 윈도우: 해당 기둥의 활성 기간.
 */

const sajuYongsinExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'pillar-sibsin',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const yongsin = natal.saju.yongsin
    const rangeStart = new Date(range.start)
    const rangeEnd = new Date(range.end)
    const signals: ActiveSignal[] = []

    // ─── 대운 ───
    for (const d of natal.saju.daeun) {
      const stemInfo = STEMS.find((s) => s.name === d.stem)
      if (!stemInfo) continue
      const element = stemInfo.element as FiveElement
      const verdict = classify(element, yongsin)
      if (!verdict) continue

      const startIso = new Date(Date.UTC(d.startYear, 0, 1)).toISOString()
      const endIso = new Date(Date.UTC(d.startYear + 10, 0, 0, 23, 59, 59)).toISOString()
      if (new Date(endIso) < rangeStart || new Date(startIso) > rangeEnd) continue
      const peakIso = new Date(Date.UTC(d.startYear + 5, 0, 1)).toISOString()

      signals.push(
        buildSignal({
          idSuffix: `daeun.${d.startYear}.${d.stem}.${verdict.kind}`,
          name: `${verdict.label} — ${d.stem}${d.branch} 대운`,
          polarity: verdict.polarity,
          layer: 'decadal',
          weight: 0.95,
          startIso,
          peakIso,
          endIso,
          element,
          verdict: verdict.kind,
          yongsinPrimary: yongsin.primary,
        })
      )
    }

    // ─── 세운 ───
    const startYear = rangeStart.getUTCFullYear()
    const endYear = rangeEnd.getUTCFullYear()
    for (let year = startYear; year <= endYear; year++) {
      const yp = getYearPillarForDate(new Date(Date.UTC(year, 6, 1)))
      const stemInfo = STEMS.find((s) => s.name === yp.stem)
      if (!stemInfo) continue
      const element = stemInfo.element as FiveElement
      const verdict = classify(element, yongsin)
      if (!verdict) continue

      const yStart = new Date(Date.UTC(year, 1, 4)).toISOString()
      const yEnd = new Date(Date.UTC(year + 1, 1, 3, 23, 59, 59)).toISOString()
      const yPeak = new Date(Date.UTC(year, 6, 1)).toISOString()

      signals.push(
        buildSignal({
          idSuffix: `seun.${year}.${yp.stem}.${verdict.kind}`,
          name: `${verdict.label} — ${yp.stem}${yp.branch} 세운`,
          polarity: verdict.polarity,
          layer: 'yearly',
          weight: 0.8,
          startIso: yStart,
          peakIso: yPeak,
          endIso: yEnd,
          element,
          verdict: verdict.kind,
          yongsinPrimary: yongsin.primary,
        })
      )
    }

    // ─── 월운 ───
    const monthCursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1))
    while (monthCursor <= rangeEnd) {
      const mp = getMonthPillarForDate(monthCursor)
      const stemInfo = STEMS.find((s) => s.name === mp.stem)
      if (stemInfo) {
        const element = stemInfo.element as FiveElement
        const verdict = classify(element, yongsin)
        if (verdict) {
          const mStart = monthCursor.toISOString()
          const mEnd = new Date(
            Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0, 23, 59, 59)
          ).toISOString()
          const mPeak = new Date(
            Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 15)
          ).toISOString()

          signals.push(
            buildSignal({
              idSuffix: `wolun.${monthCursor.getUTCFullYear()}-${monthCursor.getUTCMonth() + 1}.${mp.stem}.${verdict.kind}`,
              name: `${verdict.label} — ${mp.stem}${mp.branch} 월운`,
              polarity: verdict.polarity,
              layer: 'monthly',
              weight: 0.6,
              startIso: mStart,
              peakIso: mPeak,
              endIso: mEnd,
              element,
              verdict: verdict.kind,
              yongsinPrimary: yongsin.primary,
            })
          )
        }
      }
      monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1)
    }

    return signals
  },
}

interface Verdict {
  kind: 'primary' | 'secondary' | 'avoid'
  label: string
  polarity: Polarity
}

function classify(
  element: FiveElement,
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] }
): Verdict | null {
  if (element === yongsin.primary) return { kind: 'primary', label: '용신 활성', polarity: 3 }
  if (element === yongsin.secondary) return { kind: 'secondary', label: '희신 활성', polarity: 2 }
  if (yongsin.avoid.includes(element))
    return { kind: 'avoid', label: '기신/구신 활성', polarity: -2 }
  return null
}

interface BuildArgs {
  idSuffix: string
  name: string
  polarity: Polarity
  layer: 'decadal' | 'yearly' | 'monthly'
  weight: number
  startIso: string
  peakIso: string
  endIso: string
  element: FiveElement
  verdict: 'primary' | 'secondary' | 'avoid'
  yongsinPrimary: FiveElement
}

// 용신/희신/기신이 운으로 들어올 때의 흐름(flow) 한 줄. 기간 라벨로 감싼다.
const PERIOD_LABEL: Record<BuildArgs['layer'], string> = {
  decadal: '대운이에요',
  yearly: '한 해예요',
  monthly: '한 달이에요',
}
const PERIOD_LABEL_EN: Record<BuildArgs['layer'], string> = {
  decadal: 'decade',
  yearly: 'year',
  monthly: 'month',
}
const ELEMENT_EN: Record<FiveElement, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}

function verdictFlowLine(
  verdict: BuildArgs['verdict'],
  element: FiveElement,
  layer: BuildArgs['layer']
): string {
  const period = PERIOD_LABEL[layer]
  if (verdict === 'primary')
    return `내게 가장 필요한 ${element} 기운이 들어와 흐름이 트이는 ${period}`
  if (verdict === 'secondary') return `나를 돕는 ${element} 기운이 더해져 한결 수월한 ${period}`
  return `나를 흔드는 ${element} 기운이 들어와 조심해야 할 ${period}`
}

function verdictFlowLineEn(
  verdict: BuildArgs['verdict'],
  element: FiveElement,
  layer: BuildArgs['layer']
): string {
  const el = ELEMENT_EN[element]
  const period = PERIOD_LABEL_EN[layer]
  if (verdict === 'primary')
    return `the ${el} energy you most need flows in — a ${period} when your path opens up`
  if (verdict === 'secondary') return `supportive ${el} energy is added — a smoother ${period}`
  return `unsettling ${el} energy flows in — a ${period} to stay careful`
}

function buildSignal(a: BuildArgs): ActiveSignal {
  return {
    id: `saju.yongsin.${a.idSuffix}`,
    source: 'saju',
    kind: 'pillar-sibsin',
    name: a.name,
    korean: verdictFlowLine(a.verdict, a.element, a.layer),
    english: verdictFlowLineEn(a.verdict, a.element, a.layer),
    polarity: a.polarity,
    layer: a.layer,
    active: { start: a.startIso, peak: a.peakIso, end: a.endIso },
    weight: a.weight,
    evidence: {
      module: 'saju-yongsin',
      element: a.element,
      detail: { verdict: a.verdict, yongsinPrimary: a.yongsinPrimary },
    },
  }
}

export default sajuYongsinExtractor
