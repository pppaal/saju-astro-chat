import { STEMS, ELEMENT_KO_TO_EN } from '@/lib/saju/constants'
import {
  calendarTimeZone,
  daeunAnniversaryIso,
  daeunWindows,
  monthWindows,
  yearWindows,
} from '../periodPillars'
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
    const signals: ActiveSignal[] = []
    // 창은 periodPillars 하나(재감사 G2 · TP-7) — 대운은 만 나이 생일 경계(예전엔 1/1 이라
    // 생일 전 최대 11개월을 다음 대운으로 불렀다), 세운은 입춘이 든 현지 날(예전엔 2/4
    // 00:00Z 고정), 월운은 절기월(예전엔 양력 달에 15일의 절기월, TP-2).
    const tz = calendarTimeZone(natal)

    // ─── 대운 ───
    for (const w of daeunWindows(natal, range)) {
      const stemInfo = STEMS.find((s) => s.name === w.stem)
      if (!stemInfo) continue
      const element = stemInfo.element as FiveElement
      const verdict = classify(element, yongsin)
      if (!verdict) continue

      signals.push(
        buildSignal({
          idSuffix: `daeun.${w.startYear}.${w.stem}.${verdict.kind}`,
          name: `${verdict.label} — ${w.stem}${w.branch} 대운`,
          polarity: verdict.polarity,
          layer: 'decadal',
          weight: 0.95,
          startIso: w.start,
          peakIso: daeunAnniversaryIso(w, 5),
          endIso: w.end,
          element,
          verdict: verdict.kind,
          yongsinPrimary: yongsin.primary,
        })
      )
    }

    // ─── 세운 ───
    for (const w of yearWindows(range, tz)) {
      const stemInfo = STEMS.find((s) => s.name === w.stem)
      if (!stemInfo) continue
      const element = stemInfo.element as FiveElement
      const verdict = classify(element, yongsin)
      if (!verdict) continue

      signals.push(
        buildSignal({
          idSuffix: `seun.${w.sajuYear}.${w.stem}.${verdict.kind}`,
          name: `${verdict.label} — ${w.stem}${w.branch} 세운`,
          polarity: verdict.polarity,
          layer: 'yearly',
          weight: 0.8,
          startIso: w.start,
          peakIso: w.peak,
          endIso: w.end,
          element,
          verdict: verdict.kind,
          yongsinPrimary: yongsin.primary,
        })
      )
    }

    // ─── 월운 ───
    for (const w of monthWindows(range, tz)) {
      const stemInfo = STEMS.find((s) => s.name === w.stem)
      if (!stemInfo) continue
      const element = stemInfo.element as FiveElement
      const verdict = classify(element, yongsin)
      if (!verdict) continue

      signals.push(
        buildSignal({
          idSuffix: `wolun.${w.startDate}.${w.stem}.${verdict.kind}`,
          name: `${verdict.label} — ${w.stem}${w.branch} 월운`,
          polarity: verdict.polarity,
          layer: 'monthly',
          weight: 0.6,
          startIso: w.start,
          peakIso: w.peak,
          endIso: w.end,
          element,
          verdict: verdict.kind,
          yongsinPrimary: yongsin.primary,
        })
      )
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
// 오행 KO→EN — 공용 SSOT(constants.ELEMENT_KO_TO_EN)에서 파생(복붙 금지).
const ELEMENT_EN = ELEMENT_KO_TO_EN

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
