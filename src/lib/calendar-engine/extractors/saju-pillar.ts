import { STEMS, BRANCHES, FIVE_ELEMENT_RELATIONS } from '@/lib/saju/constants'
import { getYearPillarForDate, getMonthPillarForDate } from '@/lib/saju/datePillars'
import { computeDayBranch, computeDayStem } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity, SignalLayer, SignalKind } from '../types'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'

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

    // ─── 1) 대운 (decadal) ───
    for (const d of natal.saju.daeun) {
      const stemInfo = STEMS.find((s) => s.name === d.stem)
      if (!stemInfo) continue
      const sibsin = getSibsin(dayMaster, stemInfo)
      if (!sibsin) continue

      const startIso = new Date(Date.UTC(d.startYear, 0, 1)).toISOString()
      const endIso = new Date(Date.UTC(d.startYear + 10, 0, 0, 23, 59, 59)).toISOString()
      // range와 겹치는 부분만
      if (new Date(endIso) < start || new Date(startIso) > end) continue
      const peakIso = new Date(Date.UTC(d.startYear + 5, 0, 1)).toISOString()

      signals.push(buildSignal({
        idSuffix: `daeun.${d.startYear}.${d.stem}${d.branch}`,
        layer: 'decadal',
        ganji: `${d.stem}${d.branch}`,
        sibsin,
        element: stemInfo.element as FiveElement,
        yongsin,
        active: { start: startIso, peak: peakIso, end: endIso },
        weight: 1.0,   // 대운은 인생 전체 흐름 — 최대 가중
        natalDayMaster: dayMaster.name,
      }))
    }

    // ─── 2) 세운 (yearly) ───
    const startYear = start.getUTCFullYear()
    const endYear = end.getUTCFullYear()
    for (let year = startYear; year <= endYear; year++) {
      // 입춘(2/4) 기준이지만 datePillars 함수가 알아서 처리
      const midYear = new Date(Date.UTC(year, 6, 1))
      const yp = getYearPillarForDate(midYear)
      const stemInfo = STEMS.find((s) => s.name === yp.stem)
      if (!stemInfo) continue
      const sibsin = getSibsin(dayMaster, stemInfo)
      if (!sibsin) continue

      const yStart = new Date(Date.UTC(year, 1, 4)).toISOString()      // 입춘 근사
      const yEnd = new Date(Date.UTC(year + 1, 1, 3, 23, 59, 59)).toISOString()
      const yPeak = new Date(Date.UTC(year, 6, 1)).toISOString()

      signals.push(buildSignal({
        idSuffix: `seun.${year}.${yp.stem}${yp.branch}`,
        layer: 'yearly',
        ganji: `${yp.stem}${yp.branch}`,
        sibsin,
        element: stemInfo.element as FiveElement,
        yongsin,
        active: { start: yStart, peak: yPeak, end: yEnd },
        weight: 0.85,
        natalDayMaster: dayMaster.name,
      }))
    }

    // ─── 3) 월운 (monthly) ───
    const monthCursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    while (monthCursor <= end) {
      const mp = getMonthPillarForDate(monthCursor)
      const stemInfo = STEMS.find((s) => s.name === mp.stem)
      if (stemInfo) {
        const sibsin = getSibsin(dayMaster, stemInfo)
        if (sibsin) {
          const mStart = new Date(monthCursor).toISOString()
          const mEnd = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 0, 23, 59, 59)).toISOString()
          const mPeak = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 15)).toISOString()
          signals.push(buildSignal({
            idSuffix: `wolun.${monthCursor.getUTCFullYear()}-${monthCursor.getUTCMonth() + 1}.${mp.stem}${mp.branch}`,
            layer: 'monthly',
            ganji: `${mp.stem}${mp.branch}`,
            sibsin,
            element: stemInfo.element as FiveElement,
            yongsin,
            active: { start: mStart, peak: mPeak, end: mEnd },
            weight: 0.7,
            natalDayMaster: dayMaster.name,
          }))
        }
      }
      monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1)
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
      signals.push(buildSignal({
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
      }))
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
}

function buildSignal(args: BuildSignalArgs): ActiveSignal {
  const polarity = polarityFromYongsin(args.element, args.yongsin)
  return {
    id: `saju.pillar-sibsin.${args.idSuffix}`,
    source: 'saju',
    kind: 'pillar-sibsin',
    name: `${args.ganji} (${args.sibsin})`,
    themes: [],   // tagger가 SIBSIN_THEME_MAP + ELEMENT_THEME_MAP으로 채움
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
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] },
): Polarity {
  if (element === yongsin.primary) return 3
  if (element === yongsin.secondary) return 2
  if (yongsin.avoid.includes(element)) return -2
  return 0
}

interface StemInfo { name: string; element: FiveElement; yin_yang: YinYang }

function pillarToStemInfo(stemName: string): StemInfo | null {
  const found = STEMS.find((s) => s.name === stemName)
  if (!found) return null
  return found as StemInfo
}

function getSibsin(dayMaster: StemInfo, target: StemInfo): SibsinKind | null {
  if (dayMaster.element === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '비견' : '겁재'
  }
  if (FIVE_ELEMENT_RELATIONS.생하는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '식신' : '상관'
  }
  if (FIVE_ELEMENT_RELATIONS.극하는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편재' : '정재'
  }
  if (FIVE_ELEMENT_RELATIONS.극받는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편관' : '정관'
  }
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편인' : '정인'
  }
  return null
}

// 미사용 import suppress
void BRANCHES

export default sajuPillarExtractor
