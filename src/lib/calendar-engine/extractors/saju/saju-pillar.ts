import { STEMS, BRANCHES, JIJANGGAN, getSolarTermKST } from '@/lib/saju/constants'
import { getYearPillarForDate, getMonthPillarForDate } from '@/lib/saju/datePillars'
import { computeDayBranch, computeDayStem } from './saju-shinsal'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalLayer,
  SignalKind,
} from '../../types'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'
import { getSibsinFromStemInfo as getSibsin } from '../shared/sibsin'
import { pillarFlowLine, type GanjiTransitLayer } from '../../data/ganjiTransitNarrative'

/**
 * 사주 4시간축 — 대운/세운/월운/일주의 십신 활성 추출기.
 *
 * 4 sub-signal 생성:
 *  - decadal: 대운 (10년) 천간의 십신 → NatalContext.saju.daeun에서
 *  - yearly:  세운 (1년) 천간의 십신
 *  - monthly: 월운 (1달) 천간의 십신
 *  - daily:   일주 (1일) 천간의 십신
 *
 * 길흉 polarity는 십신 종류 + 본명 강약·용신과의 조화로 결정.
 * (용신 부합 = +, 기신·구신 = -)
 */
const sajuPillarExtractor: SignalExtractor = {
  source: 'saju',
  kind: ['pillar-sibsin'] as SignalKind[],
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const dayMaster = pillarToStemInfo(natal.saju.pillars.day.heavenlyStem.name)
    if (!dayMaster) return []
    const yongsin = natal.saju.yongsin

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    // 입춘(立春, 절기 2) 실제 시각 — 세운 경계. null 이면 2/4 근사 폴백.
    const ipchun = (y: number): Date => getSolarTermKST(y, 2) ?? new Date(Date.UTC(y, 1, 4))
    // 대운 전환은 생일 기준 (대운수 기반). Jan-1 고정은 연초~생일 사이를
    // 다음 대운으로 잘못 표기 ("갑오대운 2025냐 2026냐" 논쟁 지점).
    const bMonth = natal.input.month - 1
    const bDate = natal.input.date

    // ─── 1) 대운 (decadal) — 정통 자평: 천간 5년 / 지지 5년 분리 ───
    // 한 대운 10년은 "천간 5년 + 지지 5년" 으로 운영함이 정통. 한 마디 앞 5년은
    // 천간의 십신·통근이, 뒤 5년은 지지의 12운성·지장간 십신이 주도한다.
    // 기존엔 10년 통째로 천간 십신 1개만 emit돼서 지지 운기가 통째로 손실됐다.
    for (const d of natal.saju.daeun) {
      const stemInfo = STEMS.find((s) => s.name === d.stem)
      if (!stemInfo) continue
      const stemSibsin = getSibsin(dayMaster, stemInfo)

      const baseStart = Date.UTC(d.startYear, bMonth, bDate)
      const midPoint = Date.UTC(d.startYear + 5, bMonth, bDate)
      const endPoint = Date.UTC(d.startYear + 10, bMonth, bDate) - 1

      // ── 1a) 천간 5년 ──
      if (stemSibsin && new Date(endPoint) >= start && new Date(baseStart) <= end) {
        const stemStartIso = new Date(baseStart).toISOString()
        const stemEndIso = new Date(midPoint - 1).toISOString()
        const stemPeakIso = new Date(
          Date.UTC(d.startYear + 2, bMonth, Math.max(1, bDate))
        ).toISOString()
        if (new Date(stemEndIso) >= start && new Date(stemStartIso) <= end) {
          signals.push(
            buildSignal({
              idSuffix: `daeun-stem.${d.startYear}.${d.stem}`,
              layer: 'decadal',
              ganji: `${d.stem}${d.branch}`,
              sibsin: stemSibsin,
              element: stemInfo.element as FiveElement,
              yongsin,
              active: { start: stemStartIso, peak: stemPeakIso, end: stemEndIso },
              weight: 1.0, // 대운 천간 — 인생 전체 흐름 핵심
              natalDayMaster: dayMaster.name,
              detailExtra: {
                phase: 'stem-half',
                phaseLabel: '대운 천간 5년',
              },
            })
          )
        }
      }

      // ── 1b) 지지 5년 ──
      // 지지의 십신은 지장간 본기(정기)로 잡는다. 본기 = 그 지지의 대표 오행/천간.
      const branchInfo = BRANCHES.find((b) => b.name === d.branch)
      const branchJijanggan = JIJANGGAN[d.branch]
      const jeonggiStem = branchJijanggan?.['정기']
      const jeonggiStemInfo = jeonggiStem ? STEMS.find((s) => s.name === jeonggiStem) : null
      const branchSibsin = jeonggiStemInfo ? getSibsin(dayMaster, jeonggiStemInfo) : null
      const branchElement = (branchInfo?.element ??
        jeonggiStemInfo?.element ??
        stemInfo.element) as FiveElement

      if (branchSibsin && new Date(endPoint) >= start && new Date(midPoint) <= end) {
        const branchStartIso = new Date(midPoint).toISOString()
        const branchEndIso = new Date(endPoint).toISOString()
        const branchPeakIso = new Date(
          Date.UTC(d.startYear + 7, bMonth, Math.max(1, bDate))
        ).toISOString()
        if (new Date(branchEndIso) >= start && new Date(branchStartIso) <= end) {
          signals.push(
            buildSignal({
              idSuffix: `daeun-branch.${d.startYear}.${d.branch}`,
              layer: 'decadal',
              ganji: `${d.stem}${d.branch}`,
              sibsin: branchSibsin,
              element: branchElement,
              yongsin,
              active: { start: branchStartIso, peak: branchPeakIso, end: branchEndIso },
              weight: 0.95, // 대운 지지 — 천간보다 약간 낮으나 본기 십신이 강하게 작동
              natalDayMaster: dayMaster.name,
              detailExtra: {
                phase: 'branch-half',
                phaseLabel: '대운 지지 5년',
                branchJeonggi: jeonggiStem,
                branchName: d.branch,
              },
            })
          )
        }
      }
    }

    // ─── 2) 세운 (yearly) — 입춘 경계 ───
    // startYear-1 부터 돌려 1월(입춘 전) 셀이 직전 해 세운으로 잡히게 함.
    const startYear = start.getUTCFullYear()
    const endYear = end.getUTCFullYear()
    for (let year = startYear - 1; year <= endYear; year++) {
      const yStartDate = ipchun(year)
      const yEndDate = new Date(ipchun(year + 1).getTime() - 1)
      // range 미겹침 스킵
      if (yEndDate < start || yStartDate > end) continue
      // 세운 ganji 는 그 해 입춘 직후 날짜 기준 (datePillars 가 입춘 처리)
      const refDate = new Date(yStartDate.getTime() + 86_400_000)
      const yp = getYearPillarForDate(refDate)
      const stemInfo = STEMS.find((s) => s.name === yp.stem)
      if (!stemInfo) continue
      const sibsin = getSibsin(dayMaster, stemInfo)
      if (!sibsin) continue

      const yStart = yStartDate.toISOString()
      const yEnd = yEndDate.toISOString()
      const yPeak = new Date((yStartDate.getTime() + yEndDate.getTime()) / 2).toISOString()

      signals.push(
        buildSignal({
          idSuffix: `seun.${year}.${yp.stem}${yp.branch}`,
          layer: 'yearly',
          ganji: `${yp.stem}${yp.branch}`,
          sibsin,
          element: stemInfo.element as FiveElement,
          yongsin,
          active: { start: yStart, peak: yPeak, end: yEnd },
          weight: 0.85,
          natalDayMaster: dayMaster.name,
        })
      )
    }

    // ─── 3) 월운 (monthly) — *절기월* 기준 ───
    // 옛 버그: 달력 월(1일~말일)로 묶고 1일의 간지를 한 달 통째 적용 → 절입(節)을
    // 무시해 4월 전체가 卯월(辛卯)로 잘못 잡혔다(청명 4/4 이후는 辰월 壬辰이 맞음).
    // getMonthPillarForDate 는 날짜→절기월 간지를 정확히 주므로, 같은 간지인 연속
    // 구간을 한 절기월 윈도우로 묶어 emit. 윈도우는 실제 절입~절입 경계까지 잡도록
    // range 밖으로도 탐색(절기월 ~30일이라 루프 유한).
    const DAY_MS = 86_400_000
    const sameMp = (
      a: { stem: string; branch: string },
      b: { stem: string; branch: string }
    ): boolean => a.stem === b.stem && a.branch === b.branch
    let monthCursor = new Date(start)
    while (monthCursor <= end) {
      const mp = getMonthPillarForDate(monthCursor)
      // 이 절기월 윈도우의 실제 시작(절입) — cursor 에서 뒤로 같은 간지 끝까지
      let winStart = new Date(monthCursor)
      for (;;) {
        const prev = new Date(winStart.getTime() - DAY_MS)
        if (!sameMp(getMonthPillarForDate(prev), mp)) break
        winStart = prev
      }
      // 실제 끝(다음 절입 직전) — 앞으로 같은 간지 끝까지
      let winEnd = new Date(monthCursor)
      for (;;) {
        const next = new Date(winEnd.getTime() + DAY_MS)
        if (!sameMp(getMonthPillarForDate(next), mp)) break
        winEnd = next
      }
      const stemInfo = STEMS.find((s) => s.name === mp.stem)
      if (stemInfo) {
        const sibsin = getSibsin(dayMaster, stemInfo)
        if (sibsin) {
          const dayUTC = (d: Date, h = 0, mi = 0, s = 0) =>
            new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, mi, s))
          const mStart = dayUTC(winStart).toISOString()
          const mEnd = dayUTC(winEnd, 23, 59, 59).toISOString()
          const mPeak = new Date(
            winStart.getTime() + (winEnd.getTime() - winStart.getTime()) / 2
          ).toISOString()
          signals.push(
            buildSignal({
              idSuffix: `wolun.${mp.stem}${mp.branch}.${mStart.slice(0, 10)}`,
              layer: 'monthly',
              ganji: `${mp.stem}${mp.branch}`,
              sibsin,
              element: stemInfo.element as FiveElement,
              yongsin,
              active: { start: mStart, peak: mPeak, end: mEnd },
              weight: 0.7,
              natalDayMaster: dayMaster.name,
            })
          )
        }
      }
      monthCursor = new Date(winEnd.getTime() + DAY_MS)
    }

    // ─── 4) 일주 (daily) ───
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const d = new Date(t)
      const stemName = computeDayStem(d)
      const branchName = computeDayBranch(d)
      if (!stemName || !branchName) continue
      const stemInfo = STEMS.find((s) => s.name === stemName)
      if (!stemInfo) continue
      const sibsin = getSibsin(dayMaster, stemInfo)
      if (!sibsin) continue

      const dayIso = d.toISOString().slice(0, 10)
      signals.push(
        buildSignal({
          idSuffix: `iljin.${dayIso}.${stemName}${branchName}`,
          layer: 'daily',
          ganji: `${stemName}${branchName}`,
          sibsin,
          element: stemInfo.element as FiveElement,
          yongsin,
          active: {
            start: `${dayIso}T00:00:00.000Z`,
            peak: `${dayIso}T12:00:00.000Z`,
            end: `${dayIso}T23:59:59.999Z`,
          },
          weight: 0.55,
          natalDayMaster: dayMaster.name,
        })
      )
    }

    return signals
  },
}

interface BuildSignalArgs {
  idSuffix: string
  layer: SignalLayer
  ganji: string
  sibsin: SibsinKind
  element: FiveElement
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] }
  active: { start: string; peak: string; end: string }
  weight: number
  natalDayMaster: string
  detailExtra?: Record<string, unknown>
}

function buildSignal(args: BuildSignalArgs): ActiveSignal {
  const polarity = polarityFromYongsin(args.element, args.yongsin)
  // 운으로 들어오는 십신의 흐름 한 줄 — 캘린더 voice. (없으면 name 폴백)
  // 같은 십신이라도 그 갑자의 결을 더해 인접 갑자가 다르게 읽히게 한다(additive).
  const korean = pillarFlowLine(args.ganji, args.sibsin, args.layer as GanjiTransitLayer, 'ko')
  const english = pillarFlowLine(args.ganji, args.sibsin, args.layer as GanjiTransitLayer, 'en')
  return {
    id: `saju.pillar-sibsin.${args.idSuffix}`,
    source: 'saju',
    kind: 'pillar-sibsin',
    name: `${args.ganji} (${args.sibsin})`,
    ...(korean ? { korean } : {}),
    ...(english ? { english } : {}),
    polarity,
    layer: args.layer,
    active: args.active,
    weight: args.weight,
    evidence: {
      module: 'saju-pillar',
      sibsin: args.sibsin,
      element: args.element,
      pillars: [args.ganji],
      detail: {
        natalDayMaster: args.natalDayMaster,
        yongsin: args.yongsin.primary,
        avoid: args.yongsin.avoid,
        ...(args.detailExtra ?? {}),
      },
    },
  }
}

/**
 * 용신과의 부합 여부로 polarity 결정.
 * - 용신 = +2~+3
 * - 보조용신 = +1~+2
 * - 기신·구신 (avoid) = -2~-3
 * - 그 외 중립 = 0
 */
function polarityFromYongsin(
  element: FiveElement,
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] }
): Polarity {
  if (element === yongsin.primary) return 3
  if (element === yongsin.secondary) return 2
  if (yongsin.avoid.includes(element)) return -2
  return 0
}

interface StemInfo {
  name: string
  element: FiveElement
  yin_yang: YinYang
}

function pillarToStemInfo(stemName: string): StemInfo | null {
  const found = STEMS.find((s) => s.name === stemName)
  if (!found) return null
  return found as StemInfo
}

export default sajuPillarExtractor
