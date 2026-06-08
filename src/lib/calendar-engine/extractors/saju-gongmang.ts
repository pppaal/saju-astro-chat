import { getGongmang } from '@/lib/saju/shinsal'
import { getYearPillarForDate, getMonthPillarForDate } from '@/lib/saju/datePillars'
import { getSolarTermKST } from '@/lib/saju/constants'
import { computeDayBranch } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, SignalLayer } from '../types'

/**
 * 공망(空亡) 시기 활성 추출기.
 *
 * 자평명리(子平命理)에서 공망은 본명 일주(日柱)가 속한 60갑자 순(旬)에서
 * 빠진 두 지지를 말한다. 갑자순(甲子~癸酉)이라면 戌·亥가 공망지(空亡支)다.
 * 본명 공망지는 차트에 정적으로 박혀 있지만, 그 지지가 시기(대운/세운/월운/
 * 일진) 지지와 닿을 때만 "공망 발동"으로 실제 길흉이 드러난다 — 단지 본명에
 * 공망지가 있다는 사실만으로는 매일의 일진이 영향을 받지 않는다.
 *
 * 본 추출기는 본명 일주 → 공망 2지지를 산출하고, range 안의 모든 layer
 * (decadal/yearly/monthly/daily)에서 시기 지지가 본명 공망지에 닿는 순간을
 * 신호로 emit 한다.
 *
 * ── 산출 방식 ──
 *   1. 본명 일간·일지 → `getGongmang()` (src/lib/saju/shinsal.ts) 로 2개 지지.
 *      e.g.  甲子순 → ['戌','亥'],   甲戌순 → ['申','酉'], …
 *   2. 대운 지지 → branch 가 공망지면 그 대운 10년 전체 활성.
 *   3. 세운 지지 → 입춘 기준 1년 활성.
 *   4. 월운 지지 → 그 달 전체 활성.
 *   5. 일진 지지 → 그 1일 활성.
 *
 * ── doctrine notes ──
 *  - 공망은 정통 자평에서 "속명 흉살(common)" 등급 — saju-shinsal.ts 의
 *    grade weight 0.35 와 동률로 base 0.30 을 채택.
 *  - polarity = -1. 공망은 명백한 -2 흉(예: 백호·괴강)보다 약하고, 도화·홍염
 *    같은 -1/+1 중립살과 비슷한 강도다. 단독으로 큰 사건을 만들진 않지만
 *    재성·관성 위에 닿으면 "허(虛)" 의 신호로 격국 성패 카드에 보조 근거로
 *    들어가는 정도.
 *  - kind 는 별도 'gongmang' — 'shinsal' 과 분리해 derivers/UI 가 공망만
 *    따로 집계할 수 있게 한다 (예: monthly 카드에서 공망 발동일 강조).
 */

const GONGMANG_BASE_WEIGHT = 0.3
const GONGMANG_POLARITY = -1

// layer 별 weight 멀티플라이어 — 일진(좁은 윈도우) ↔ 대운(긴 윈도우) 균형.
// 정통은 대운 공망을 더 무겁게 본다(평생 영향) — daily 보다 0.6 vs 0.45 비율.
const LAYER_WEIGHT_FACTOR: Record<SignalLayer, number> = {
  decadal: 1.0,
  yearly: 0.85,
  monthly: 0.7,
  daily: 0.55,
  hourly: 0.4,
  instant: 0.4,
}

const sajuGongmangExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'gongmang',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const dayPillar = natal.saju?.pillars?.day
    const natalDayStem = dayPillar?.heavenlyStem?.name ?? ''
    const natalDayBranch = dayPillar?.earthlyBranch?.name ?? ''
    if (!natalDayStem || !natalDayBranch) return []

    // 본명 공망 2지지 — getGongmang() 단일 소스 (src/lib/saju/shinsal.ts).
    const gongmangBranches = getGongmang(natalDayStem, natalDayBranch)
    if (gongmangBranches.length === 0) return []
    const gongmangSet = new Set(gongmangBranches)

    const signals: ActiveSignal[] = []
    const rangeStart = new Date(range.start)
    const rangeEnd = new Date(range.end)

    // 입춘(절기) — 세운 경계.
    const ipchun = (y: number): Date => getSolarTermKST(y, 2) ?? new Date(Date.UTC(y, 1, 4))

    // 본명 출생 월/일 — 대운 경계 anchor.
    const bMonth = natal.input.month - 1
    const bDate = natal.input.date

    // ─── 1) 대운 지지 (decadal) ───
    for (const d of natal.saju.daeun) {
      if (!gongmangSet.has(d.branch)) continue
      const startMs = Date.UTC(d.startYear, bMonth, bDate)
      const endMs = Date.UTC(d.startYear + 10, bMonth, bDate) - 1
      if (new Date(endMs) < rangeStart || new Date(startMs) > rangeEnd) continue
      const peakMs = Date.UTC(d.startYear + 5, bMonth, Math.max(1, bDate))
      signals.push(
        makeGongmangSignal({
          idTail: `daeun.${d.startYear}.${d.branch}`,
          layer: 'decadal',
          cyclicalBranch: d.branch,
          cyclicalLabel: `대운 ${d.stem}${d.branch}`,
          cyclicalPillar: `${d.stem}${d.branch}`,
          cyclicalYear: d.startYear,
          natalGongmang: gongmangBranches,
          natalDayStem,
          natalDayBranch,
          startIso: new Date(startMs).toISOString(),
          peakIso: new Date(peakMs).toISOString(),
          endIso: new Date(endMs).toISOString(),
        })
      )
    }

    // ─── 2) 세운 지지 (yearly) — 입춘 경계 ───
    const startYear = rangeStart.getUTCFullYear()
    const endYear = rangeEnd.getUTCFullYear()
    for (let year = startYear - 1; year <= endYear; year++) {
      const yStart = ipchun(year)
      const yEnd = new Date(ipchun(year + 1).getTime() - 1)
      if (yEnd < rangeStart || yStart > rangeEnd) continue
      // 입춘 이후 안정 시점에 세운 천간지지 조회 (입춘 당일 경계 회피).
      const refDate = new Date(yStart.getTime() + 86_400_000)
      const yp = getYearPillarForDate(refDate)
      if (!gongmangSet.has(yp.branch)) continue
      const peakMs = (yStart.getTime() + yEnd.getTime()) / 2
      signals.push(
        makeGongmangSignal({
          idTail: `seun.${year}.${yp.branch}`,
          layer: 'yearly',
          cyclicalBranch: yp.branch,
          cyclicalLabel: `${year}년 세운 ${yp.stem}${yp.branch}`,
          cyclicalPillar: `${yp.stem}${yp.branch}`,
          cyclicalYear: year,
          natalGongmang: gongmangBranches,
          natalDayStem,
          natalDayBranch,
          startIso: yStart.toISOString(),
          peakIso: new Date(peakMs).toISOString(),
          endIso: yEnd.toISOString(),
        })
      )
    }

    // ─── 3) 월운 지지 (monthly) ───
    const monthCursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1))
    while (monthCursor <= rangeEnd) {
      const mp = getMonthPillarForDate(monthCursor)
      if (gongmangSet.has(mp.branch)) {
        const y = monthCursor.getUTCFullYear()
        const m = monthCursor.getUTCMonth()
        const mStartIso = new Date(Date.UTC(y, m, 1)).toISOString()
        const mEndIso = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)).toISOString()
        const mPeakIso = new Date(Date.UTC(y, m, 15)).toISOString()
        signals.push(
          makeGongmangSignal({
            idTail: `wolun.${y}-${String(m + 1).padStart(2, '0')}.${mp.branch}`,
            layer: 'monthly',
            cyclicalBranch: mp.branch,
            cyclicalLabel: `${y}-${String(m + 1).padStart(2, '0')} 월운 ${mp.stem}${mp.branch}`,
            cyclicalPillar: `${mp.stem}${mp.branch}`,
            cyclicalYear: y,
            natalGongmang: gongmangBranches,
            natalDayStem,
            natalDayBranch,
            startIso: mStartIso,
            peakIso: mPeakIso,
            endIso: mEndIso,
          })
        )
      }
      monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1)
    }

    // ─── 4) 일진 지지 (daily) ───
    for (let t = rangeStart.getTime(); t <= rangeEnd.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const branch = computeDayBranch(date)
      if (!branch || !gongmangSet.has(branch)) continue
      const dayIso = date.toISOString().slice(0, 10)
      signals.push(
        makeGongmangSignal({
          idTail: `iljin.${dayIso}.${branch}`,
          layer: 'daily',
          cyclicalBranch: branch,
          cyclicalLabel: `일진 ${branch}`,
          cyclicalPillar: branch,
          cyclicalYear: date.getUTCFullYear(),
          natalGongmang: gongmangBranches,
          natalDayStem,
          natalDayBranch,
          startIso: `${dayIso}T00:00:00.000Z`,
          peakIso: `${dayIso}T12:00:00.000Z`,
          endIso: `${dayIso}T23:59:59.999Z`,
        })
      )
    }

    return signals
  },
}

interface MakeArgs {
  idTail: string
  layer: SignalLayer
  cyclicalBranch: string
  cyclicalLabel: string
  cyclicalPillar: string
  cyclicalYear: number
  natalGongmang: string[]
  natalDayStem: string
  natalDayBranch: string
  startIso: string
  peakIso: string
  endIso: string
}

function makeGongmangSignal(args: MakeArgs): ActiveSignal {
  const weight = Math.min(GONGMANG_BASE_WEIGHT + LAYER_WEIGHT_FACTOR[args.layer] * 0.2, 0.55)
  return {
    id: `saju.gongmang.${args.idTail}`,
    source: 'saju',
    kind: 'gongmang',
    name: `공망 활성 — 시기 지지 ${args.cyclicalBranch} 가 본명 공망 (${args.natalGongmang.join('·')})`,
    korean: `${args.cyclicalLabel} 의 ${args.cyclicalBranch} 가 본명 일주(${args.natalDayStem}${args.natalDayBranch}) 공망지 ${args.natalGongmang.join('·')} 에 닿음 — 허(虛)·이탈·결여 신호`,
    english: `the period branch ${args.cyclicalBranch} lands on your natal Void (空亡 ${args.natalGongmang.join('·')}) — a signal of emptiness, drift, and lack`,
    polarity: GONGMANG_POLARITY,
    layer: args.layer,
    active: { start: args.startIso, peak: args.peakIso, end: args.endIso },
    weight,
    evidence: {
      module: 'saju-gongmang',
      pillars: [args.cyclicalPillar],
      detail: {
        natalGongmang: args.natalGongmang,
        natalDayStem: args.natalDayStem,
        natalDayBranch: args.natalDayBranch,
        cyclicalBranch: args.cyclicalBranch,
        cyclicalLayer: args.layer,
        cyclicalYear: args.cyclicalYear,
      },
    },
  }
}

export default sajuGongmangExtractor
