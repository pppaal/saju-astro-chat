import { STEMS, BRANCHES, TIME_STEM_LOOKUP } from '@/lib/saju/constants'
import { solarTimeCorrectionMinutes } from '@/lib/saju/timezone'
import { normalizeTimeZone } from '@/lib/datetime/timezone'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'
import { computeDayStem } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'
import { HOUR_BRANCH_NARRATIVE, pickHourNarrative } from '../data/hourBranchNarrative'
import { getSibsinFromStemInfo as getSibsin } from './shared/sibsin'

/**
 * 사주 시주(時柱) 추출기 — 24시간 변별력 확보.
 *
 * 매일 12 시진(2시간 단위)별로 시주 간지를 계산하고, 본명 일간 기준 십신·
 * 용신 부합 여부로 폴라리티 결정. 매일 ~12개 신호 → 24h chart의
 * BEST/WORST 시간 변별력 핵심 데이터.
 *
 * 활성 윈도우: 그 시진 2시간 — *민용일(civil day) 안에서만*.
 *
 * ── 자시(子時) = CONVENTIONS §1 ──
 * 일주는 자정(민용일)에 바뀌고 時干은 *그날* 일간에서 五鼠遁으로 나온다. 그래서 민용일 D
 * 의 子 시진은 두 조각이다 — [D 00:00, 子 끝) 과 [子 시작, D+1 00:00). 두 조각 모두 D 의
 * 일간에서 나온 같은 時柱(골든: 1991-01-01 00:01 → 戊子, 1990-12-31 23:59 → 丙子).
 * 예전엔 D 의 子 를 D 23:32 → D+1 01:32 한 창으로 내보내, D+1 새벽 00:00–01:32 이 *전날*
 * 천간을 달고(甲子 vs 정답 丙子) D+1 셀의 교차 부모가 됐다(엔진 감사 X3·F1). 이제 어느
 * 창도 자정을 넘지 않는다. 경도에 따라 자정을 감싸는 지지가 子 가 아닐 수도 있어(카슈가르
 * 처럼 보정 −2시간이면 亥) 일반식으로 나눈다 — 본명 saju.ts 의 시주와 같은 결과.
 *
 * 한 시진이 두 조각이면 weight(0.4)를 조각 길이(분) 비율로 나눈다 — 하루 hourly 층에서
 * 그 時柱의 몫은 다른 시진과 같은 0.4 그대로(두 조각이 이중 계상되지 않게, 감사 C2).
 *
 * 너무 많은 신호 생성 방지를 위해 polarity 0 (중립)은 emit 안 함.
 */

/** 시진 하나의 평균태양시 구간(분) — 子 = 23:00–25:00, 나머지 (2i−1)·60 ~ (2i+1)·60. */
function solarRangeOfBranch(branchIdx: number): { start: number; end: number } {
  const start = branchIdx === 0 ? -60 : (branchIdx * 2 - 1) * 60
  return { start, end: start + 120 }
}

const DAY_MIN = 24 * 60
const BRANCH_MIN = 120

export interface HourSegment {
  branchIdx: number
  /** 민용일 자정 기준 시계 분 [startMin, endMin) — 0 ≤ startMin < endMin ≤ 1440. */
  startMin: number
  endMin: number
  /** 'whole' = 한 조각, 'early' = 자정 직후 조각, 'late' = 자정 직전 조각. */
  part: 'whole' | 'early' | 'late'
}

/**
 * 민용일 하루의 시진 조각들 — 시계 분 [0, 1440) 를 빈틈·겹침 없이 덮는다.
 * 시계분 = 평균태양시분 − correctionMin (saju.ts 와 같은 보정). 순수 함수.
 */
export function hourSegmentsForCivilDay(correctionMin: number): HourSegment[] {
  const out: HourSegment[] = []
  for (let b = 0; b < 12; b++) {
    const { start, end } = solarRangeOfBranch(b)
    const pieces: Array<{ s: number; e: number }> = []
    for (const shift of [-DAY_MIN, 0, DAY_MIN]) {
      const s = Math.max(0, start - correctionMin + shift)
      const e = Math.min(DAY_MIN, end - correctionMin + shift)
      if (e > s) pieces.push({ s, e })
    }
    pieces.sort((x, y) => x.s - y.s)
    if (pieces.length === 1) {
      out.push({ branchIdx: b, startMin: pieces[0].s, endMin: pieces[0].e, part: 'whole' })
    } else {
      // 자정을 감싸는 지지 — 앞 조각은 00:00 에서 시작, 뒤 조각은 24:00 에서 끝난다.
      pieces.forEach((p, i) =>
        out.push({
          branchIdx: b,
          startMin: p.s,
          endMin: p.e,
          part: i === 0 ? 'early' : 'late',
        })
      )
    }
  }
  return out.sort((x, y) => x.startMin - y.startMin)
}

const sajuHourExtractor: SignalExtractor = {
  source: 'saju',
  kind: ['pillar-sibsin'] as never,
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const dayMaster = pillarToStemInfo(natal.saju.pillars.day.heavenlyStem.name)
    if (!dayMaster) return []
    const yongsin = natal.saju.yongsin

    // 진태양시(眞太陽時) 보정용 출생지 경도·타임존. 본명 시주(build.ts/saju.ts)와
    // *동일 공식*으로 forecast 시진 경계도 시계↔태양 차를 반영한다(전세계 일관).
    // 경도 미상이면 solarTimeCorrectionMinutes 가 존 기준 경도(Asia/Seoul = 126.978)를
    // 쓰고, 타임존 미상이면 본명 사주와 같은 기본 존(CALCULATION_STANDARDS.saju.baseTimezone) —
    // 본명 시주와 같은 기본값(OD-2). 예전엔 둘 중 하나라도 없으면 보정 0(시계 시각)이었다.
    const loc = natal.astro?.location
    const longitude = typeof loc?.longitude === 'number' ? loc.longitude : undefined
    const timeZone = normalizeTimeZone(loc?.timeZone, CALCULATION_STANDARDS.saju.baseTimezone)

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const dayStemName = computeDayStem(date)
      if (!dayStemName) continue

      // 그 날의 평균태양시 보정분 — 본명 사주(saju.ts)와 *같은 SSOT 함수*를 쓴다.
      const correctionMin = solarTimeCorrectionMinutes(date, longitude, timeZone)

      // 時干 = 그 *민용일* 일간에서 五鼠遁 (자정 직전·직후 子 조각 모두).
      const firstHourStemName = TIME_STEM_LOOKUP[dayStemName]
      if (!firstHourStemName) continue
      const firstHourStemIdx = STEMS.findIndex((s) => s.name === firstHourStemName)

      const dayIso = date.toISOString().slice(0, 10)
      // baseMs = dayIso 의 '부동(floating) 벽시계' 자정 — 창 문자열은 현지 벽시계에 Z 를 붙인 형식.
      const baseMs = Date.parse(`${dayIso}T00:00:00.000Z`)
      const minToIso = (clockMin: number) =>
        // 하루 끝(24:00)은 다음 날 셀에 걸리지 않게 그날 23:59:59.999 로 닫는다.
        clockMin >= DAY_MIN
          ? `${dayIso}T23:59:59.999Z`
          : new Date(baseMs + clockMin * 60_000).toISOString()

      // 시진 조각별 신호 생성 (자정을 감싸는 지지는 두 조각)
      for (const seg of hourSegmentsForCivilDay(correctionMin)) {
        const branchIdx = seg.branchIdx
        const stemIdx = (firstHourStemIdx + branchIdx) % 10
        const stem = STEMS[stemIdx]
        const branch = BRANCHES[branchIdx]
        if (!stem || !branch) continue

        const sibsin = getSibsin(dayMaster, stem as StemInfo)
        if (!sibsin) continue

        const polarity = polarityFromYongsin(stem.element as FiveElement, yongsin)
        if (polarity === 0) continue // 중립 — 노이즈 방지

        // startHour/endHour 는 명목 라벨(5~7시 등) — evidence 표시·정렬용. 자정 직후 조각은
        // 0시에서, 자정 직전 조각은 24시에서 끊는다.
        const nominalStart = branchIdx === 0 ? 23 : branchIdx * 2 - 1
        const nominalEnd = branchIdx === 0 ? 1 : branchIdx * 2 + 1
        const startHour = seg.part === 'early' ? 0 : nominalStart
        const endHour = seg.part === 'late' ? 24 : nominalEnd
        const startIso = minToIso(seg.startMin)
        const endIso = minToIso(seg.endMin)
        const peakIso = minToIso((seg.startMin + seg.endMin) / 2)
        const share = (seg.endMin - seg.startMin) / BRANCH_MIN

        // 12 시진 narrative DB에서 baseline + polarity 매칭 텍스트 가져오기.
        // polarity 부호에 따라 baseline/positive/caution 분기.
        // BRANCHES.name은 한자(子, 丑, 寅...)인데 HOUR_BRANCH_NARRATIVE
        // 키는 한글(자, 축, 인...)이라 직접 매칭 안 됨 — 한자→한글 변환.
        const branchKo = (HANJA_TO_HANGUL[branch.name] ??
          branch.name) as keyof typeof HOUR_BRANCH_NARRATIVE
        const branchNarrative = HOUR_BRANCH_NARRATIVE[branchKo]
        const headline = branchNarrative ? pickHourNarrative(branchKo, polarity, 'ko') : undefined
        const windowLabel = branchNarrative?.windowKo

        signals.push({
          // 조각이 둘이면 접미사로 구분 — id 는 셀 안에서 유일해야 한다.
          id: `saju.hour.${dayIso}.${branch.name}.${stem.name}${seg.part === 'whole' ? '' : `.${seg.part}`}`,
          source: 'saju',
          kind: 'pillar-sibsin',
          name: `${stem.name}${branch.name} (${sibsin}) 시진`,
          // 12 시진 narrative — 그 시진의 흐름 한 줄(이미 계산된 headline 재사용).
          ...(headline ? { korean: headline } : {}),
          polarity,
          layer: 'hourly',
          active: { start: startIso, peak: peakIso, end: endIso },
          // 시진은 짧고 미세 영향(0.4). 자정에서 나뉜 조각은 길이 비율만큼 — 합은 0.4.
          weight: seg.part === 'whole' ? 0.4 : Math.round(0.4 * share * 1e6) / 1e6,
          evidence: {
            module: 'saju-hour',
            sibsin,
            element: stem.element as FiveElement,
            pillars: [`${stem.name}${branch.name}`],
            detail: {
              hourBranch: branch.name,
              hourStem: stem.name,
              startHour,
              endHour,
              ...(seg.part === 'whole' ? {} : { segment: seg.part }),
              natalDayMaster: dayMaster.name,
              yongsin: yongsin.primary,
              // 12 시진 narrative DB에서 polarity 매칭 텍스트 + 윈도우 라벨
              windowLabel,
              narrative: headline,
            },
          },
        })
      }
    }

    return signals
  },
}

const HANJA_TO_HANGUL: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}

interface StemInfo {
  name: string
  element: FiveElement
  yin_yang: YinYang
}

function pillarToStemInfo(stemName: string): StemInfo | null {
  const found = STEMS.find((s) => s.name === stemName)
  return found ? (found as StemInfo) : null
}

function polarityFromYongsin(
  element: FiveElement,
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] }
): Polarity {
  if (element === yongsin.primary) return 2
  if (element === yongsin.secondary) return 1
  if (yongsin.avoid.includes(element)) return -2
  return 0
}

export default sajuHourExtractor
