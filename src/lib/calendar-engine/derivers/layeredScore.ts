/**
 * 층별 점수 — "각 시간대를 자기 층 신호로만" 판단한다.
 *
 * 10년은 대운(decadal) 신호로, 년은 세운(yearly), 월은 월운(monthly), 일/시는
 * 일진(daily)+시진(hourly) 신호로. 전층을 섞어 평균내면(옛 derivedScore) 일 신호가
 * 수적으로 지배해 월·년 점수가 사실상 일 평균이 됐다 — 시간대 고유 에너지가 묻힘.
 *
 * 점수 함수는 하나: signed-surprise = 지배 top-k 신호의 (희소도×중요도)에 *부호*를
 * 실어 합산. 큰(드문·강한) 길신호는 +로, 흉신호는 −로 크게 기여하고, 늘 켜진 배경은
 * 희소도 0 으로 자동 제외. 이 한 함수를 층 슬라이스마다 적용.
 *
 * 표시:
 *  - 다(多)기간 층(일 365·월 12): 그 층 분포로 0~100 정규화 + grade (분포를 *맞추지*
 *    않음 — 평균/표준편차 선형 매핑이라 모양은 신호가 정함).
 *  - 단(單)기간 층(대운·세운): 단일값이라 가짜 0~100 대신 부호·크기로 톤 라벨.
 */
import type { CalendarCell, ActiveSignal, SignalLayer } from '../types'
import { computeBaseRates, signalImportance, type BaseRateTable } from './surprise'
import { scoreToGrade, type CalendarGrade } from './grade'

export type LayerTone = 'favorable' | 'neutral' | 'caution'

export interface LayerCellScore {
  score: number // 0~100
  grade: CalendarGrade
  signed: number // 원 signed-surprise (디버그)
}
export interface LayerToneScore {
  signed: number
  tone: LayerTone
}

export interface LayeredScores {
  /** 일진+시진 신호 → 날짜별. key: YYYY-MM-DD */
  daily: Map<string, LayerCellScore>
  /** 월운 신호 → 월별. key: 1~12 */
  monthly: Map<number, LayerCellScore>
  /** 세운 신호 → 올해 한 값. */
  yearly: LayerToneScore
  /** 대운 신호 → 이 10년 한 값. */
  decadal: LayerToneScore
}

const DAY_LAYERS: ReadonlySet<SignalLayer> = new Set(['daily', 'hourly', 'instant'])

/** 지배 top-k 신호의 부호 실은 희소×중요 합. */
function signedSurprise(signals: ActiveSignal[], rates: BaseRateTable, topK = 8): number {
  const scored = signals
    .map((s) => ({ imp: signalImportance(s, rates), pol: s.polarity }))
    .filter((x) => x.imp > 0)
    .sort((a, b) => b.imp - a.imp)
    .slice(0, topK)
  return scored.reduce((acc, x) => acc + Math.sign(x.pol) * x.imp, 0)
}

/** signed 배열 → (v) => 0~100 점수. 평균 중심 + 표준편차 스케일(분포 강제 아님). */
function linearMapper(values: number[]): (v: number) => number {
  const n = values.length
  if (n === 0) return () => 50
  const mean = values.reduce((a, b) => a + b, 0) / n
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1
  // 기본 scale 16 (표준편차 ~1.5 가 점수 74=grade0 에 닿음 — 자연 분포에서 등급이
  // 골고루 발화). 분포를 *맞추는* 게 아니라 선형. 단 폭이 좁은 구간이라도 그 안의
  // 최고/최저 날은 최고/지킴 으로 또렷이 — 양 극단 z 가 등급 경계(±24점)에 닿도록
  // scale 을 하한 보정(중간은 그대로 z-형, 극단만 앵커).
  const zs = values.map((v) => (v - mean) / sd)
  const zMax = Math.max(0.5, ...zs)
  const zMin = Math.min(-0.5, ...zs)
  const K = Math.min(40, Math.max(16, 24 / zMax, 24 / -zMin))
  return (v) => Math.max(0, Math.min(100, Math.round(50 + ((v - mean) / sd) * K)))
}

/** 단일 signed → 톤. 0 부근 중립, 뚜렷한 +/− 면 순조/주의. */
function toneOf(signed: number): LayerTone {
  if (signed > 4) return 'favorable'
  if (signed < -4) return 'caution'
  return 'neutral'
}

/** 같은 id 신호 dedup (연중 같은 배경이 매일 반복 등장하므로). */
function dedupById(signals: ActiveSignal[]): ActiveSignal[] {
  const seen = new Map<string, ActiveSignal>()
  for (const s of signals) if (!seen.has(s.id)) seen.set(s.id, s)
  return [...seen.values()]
}

export function deriveLayeredScores(cells: CalendarCell[]): LayeredScores {
  const rates = computeBaseRates(cells)

  // ── 일진+시진: 날짜별 signed → 분포 정규화 ──
  const dailySigned: Array<{ date: string; signed: number }> = []
  for (const c of cells) {
    const date = c.datetime.slice(0, 10)
    const sigs = c.signals.filter((s) => DAY_LAYERS.has(s.layer))
    dailySigned.push({ date, signed: signedSurprise(sigs, rates) })
  }
  const dayMap = linearMapper(dailySigned.map((d) => d.signed))
  const daily = new Map<string, LayerCellScore>()
  for (const d of dailySigned) {
    const score = dayMap(d.signed)
    daily.set(d.date, { score, grade: scoreToGrade(score), signed: d.signed })
  }

  // ── 월운: 월별 dedup 신호 signed → 12개 분포 정규화 ──
  const monthSigned: Array<{ month: number; signed: number }> = []
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0')
    const sigs = dedupById(
      cells
        .filter((c) => c.datetime.slice(5, 7) === mm)
        .flatMap((c) => c.signals.filter((s) => s.layer === 'monthly'))
    )
    monthSigned.push({ month: m, signed: signedSurprise(sigs, rates) })
  }
  const monMap = linearMapper(monthSigned.map((m) => m.signed))
  const monthly = new Map<number, LayerCellScore>()
  for (const m of monthSigned) {
    const score = monMap(m.signed)
    monthly.set(m.month, { score, grade: scoreToGrade(score), signed: m.signed })
  }

  // ── 세운(yearly) / 대운(decadal): 단일값 톤 ──
  const yearlySigned = signedSurprise(
    dedupById(cells.flatMap((c) => c.signals.filter((s) => s.layer === 'yearly'))),
    rates
  )
  const decadalSigned = signedSurprise(
    dedupById(cells.flatMap((c) => c.signals.filter((s) => s.layer === 'decadal'))),
    rates
  )

  return {
    daily,
    monthly,
    yearly: { signed: yearlySigned, tone: toneOf(yearlySigned) },
    decadal: { signed: decadalSigned, tone: toneOf(decadalSigned) },
  }
}
