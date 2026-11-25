import { STEMS, BRANCHES, JIJANGGAN } from '@/lib/saju/constants'
import {
  calendarTimeZone,
  daeunAnniversaryIso,
  daeunWindows,
  monthWindows,
  rangeDates,
  yearWindows,
} from '../periodPillars'
import { computeDayBranch, computeDayStem } from './saju-shinsal'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalLayer,
  SignalKind,
} from '../types'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'
import { getSibsinFromStemInfo as getSibsin } from './shared/sibsin'
import { pillarFlowLine, type GanjiTransitLayer } from '../data/ganjiTransitNarrative'

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
    // 세운·월운·대운 창은 periodPillars 하나(재감사 G2) — 셀 = 출생지 시간대의 민용 날짜,
    // 절입이 든 현지 날이 새 기둥을 받는다. 대운은 만 나이 생일 경계(daeunAge SSOT).
    const tz = calendarTimeZone(natal)
    const { from, to } = rangeDates(range)

    // ─── 1) 대운 (decadal) — 정통 자평: 천간 5년 / 지지 5년 분리 ───
    // 한 대운 10년은 "천간 5년 + 지지 5년" 으로 운영함이 정통. 한 마디 앞 5년은
    // 천간의 십신·통근이, 뒤 5년은 지지의 12운성·지장간 십신이 주도한다.
    // 기존엔 10년 통째로 천간 십신 1개만 emit돼서 지지 운기가 통째로 손실됐다.
    for (const w of daeunWindows(natal, range)) {
      const stemInfo = STEMS.find((s) => s.name === w.stem)
      if (!stemInfo) continue
      const stemSibsin = getSibsin(dayMaster, stemInfo)

      // ── 1a) 천간 5년 ──
      if (stemSibsin && w.stemEnd.slice(0, 10) >= from && w.startDate <= to) {
        signals.push(
          buildSignal({
            idSuffix: `daeun-stem.${w.startYear}.${w.stem}`,
            layer: 'decadal',
            ganji: `${w.stem}${w.branch}`,
            sibsin: stemSibsin,
            element: stemInfo.element as FiveElement,
            yongsin,
            active: { start: w.start, peak: daeunAnniversaryIso(w, 2), end: w.stemEnd },
            weight: 1.0, // 대운 천간 — 인생 전체 흐름 핵심
            natalDayMaster: dayMaster.name,
            detailExtra: {
              phase: 'stem-half',
              phaseLabel: '대운 천간 5년',
            },
          })
        )
      }

      // ── 1b) 지지 5년 ──
      // 지지의 십신은 지장간 본기(정기)로 잡는다. 본기 = 그 지지의 대표 오행/천간.
      const branchInfo = BRANCHES.find((b) => b.name === w.branch)
      const branchJijanggan = JIJANGGAN[w.branch]
      const jeonggiStem = branchJijanggan?.['정기']
      const jeonggiStemInfo = jeonggiStem ? STEMS.find((s) => s.name === jeonggiStem) : null
      const branchSibsin = jeonggiStemInfo ? getSibsin(dayMaster, jeonggiStemInfo) : null
      const branchElement = (branchInfo?.element ??
        jeonggiStemInfo?.element ??
        stemInfo.element) as FiveElement

      if (branchSibsin && w.endDate >= from && w.midDate <= to) {
        signals.push(
          buildSignal({
            idSuffix: `daeun-branch.${w.startYear}.${w.branch}`,
            layer: 'decadal',
            ganji: `${w.stem}${w.branch}`,
            sibsin: branchSibsin,
            element: branchElement,
            yongsin,
            active: { start: w.mid, peak: daeunAnniversaryIso(w, 7), end: w.end },
            weight: 0.95, // 대운 지지 — 천간보다 약간 낮으나 본기 십신이 강하게 작동
            natalDayMaster: dayMaster.name,
            detailExtra: {
              phase: 'branch-half',
              phaseLabel: '대운 지지 5년',
              branchJeonggi: jeonggiStem,
              branchName: w.branch,
            },
          })
        )
      }
    }

    // ─── 2) 세운 (yearly) — 입춘이 든 현지 날부터 ───
    for (const w of yearWindows(range, tz)) {
      const stemInfo = STEMS.find((s) => s.name === w.stem)
      if (!stemInfo) continue
      const sibsin = getSibsin(dayMaster, stemInfo)
      if (!sibsin) continue
      signals.push(
        buildSignal({
          idSuffix: `seun.${w.sajuYear}.${w.stem}${w.branch}`,
          layer: 'yearly',
          ganji: `${w.stem}${w.branch}`,
          sibsin,
          element: stemInfo.element as FiveElement,
          yongsin,
          active: { start: w.start, peak: w.peak, end: w.end },
          weight: 0.85,
          natalDayMaster: dayMaster.name,
        })
      )
    }

    // ─── 3) 월운 (monthly) — *절기월* 기준 ───
    // 옛 버그: 달력 월(1일~말일)로 묶고 1일의 간지를 한 달 통째 적용 → 절입(節)을
    // 무시해 4월 전체가 卯월(辛卯)로 잘못 잡혔다(청명 4/4 이후는 辰월 壬辰이 맞음).
    // 그다음엔 00:00Z 표본 + UTC 날짜 창이라 서반구에선 절입 다음 현지 하루가 옛 달로
    // 남았다(재감사 TP-3). 이제 절입이 든 현지 날부터 다음 절입 전날까지 한 창.
    for (const w of monthWindows(range, tz)) {
      const stemInfo = STEMS.find((s) => s.name === w.stem)
      if (!stemInfo) continue
      const sibsin = getSibsin(dayMaster, stemInfo)
      if (!sibsin) continue
      signals.push(
        buildSignal({
          idSuffix: `wolun.${w.stem}${w.branch}.${w.startDate}`,
          layer: 'monthly',
          ganji: `${w.stem}${w.branch}`,
          sibsin,
          element: stemInfo.element as FiveElement,
          yongsin,
          active: { start: w.start, peak: w.peak, end: w.end },
          weight: 0.7,
          natalDayMaster: dayMaster.name,
        })
      )
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
