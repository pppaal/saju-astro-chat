import { STEMS, BRANCHES, TIME_STEM_LOOKUP } from '@/lib/saju/constants'
import { solarTimeCorrectionMinutes } from '@/lib/saju/timezone'
import { normalizeTimeZone } from '@/lib/datetime/timezone'
import { resolveBirthInstant, utcOffsetMinutesAt } from '@/lib/datetime/resolveBirthInstant'
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
 * ── 서머타임 전환일 (재감사 TP-9) ──
 * 시진 경계는 *절대 instant* 다 — 평균태양시(UT + 경도×4분)가 홀수 정시를 지나는 순간. 그
 * instant 를 *그 순간의* UTC offset 으로 벽시계에 옮긴다. 예전엔 보정분 하나(UTC 자정의
 * offset)를 하루 전체에 써서, 전환일엔 전환 한쪽의 창이 10~11시간 동안 60분 밀렸다(LA
 * 2026-03-08 03:00 PDT 가 己丑 이 아니라 庚寅). 전환이 없는 날은 예전과 같은 한 보정분 경로다.
 * 겹치는 벽시계(서머타임 해제)는 첫 번째 instant 로 읽는다 — 본명 시주(resolveBirthInstant,
 * OD-3)와 같아, 어느 벽시계 분이든 캘린더 시진 = calculateSajuData 의 시주.
 *
 * ── 표시 창 (재감사 TP-8) ──
 * evidence.detail 의 clockStart·clockEnd 는 그 시진 한 번(2시간)의 *실제* 시계 시각이다
 * (서울 子 = '23:32'–'01:32', 마드리드 여름 卯 = '07:15'–'09:15'). 자정에서 나뉜 지지는
 * 두 조각이 같은 창·같은 centerUtc(평균태양시 한가운데 instant, Day 화면 상승궁의 시각)를
 * 싣는다 — 그 한가운데가 그날 안에 드는 쪽.
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

const MIN_MS = 60_000
const HOUR_MS = 60 * MIN_MS
const BRANCH_MS = BRANCH_MIN * MIN_MS
const DAY_MS = DAY_MIN * MIN_MS

const mod = (a: number, n: number) => ((a % n) + n) % n

/** 시진 조각 + 실제 instant — hourSegmentsForLocalDay 의 출력. */
export interface LocalHourSegment extends HourSegment {
  /** 조각의 실제 시작·끝 instant(UTC ms). 시계분과 달리 서머타임 전환을 그대로 담는다. */
  startUtc: number
  endUtc: number
  /** 조각 한가운데 instant 의 시계분 — 신호 active.peak. */
  peakMin: number
  /** 조각의 실제 길이(분) — 전환 공백을 걸친 조각은 시계분 차보다 짧다. */
  durationMin: number
  /**
   * 하루 hourly 층에서 이 조각이 가지는 시진 몫(0~1) — 실제 길이 ÷ max(120분, 그 지지의 그날
   * 총 길이). 자정에서 나뉜 두 조각의 합은 1(25시간 날 子 가 3시간이어도 1, 감사 C2).
   */
  share: number
  /**
   * 이 지지의 *대표* 시진 한 번(2시간)의 실제 instant [시작, 끝) — 자정에서 나뉜 지지는
   * 전날 밤 또는 다음 날 새벽으로 이어진 한 번 전체이고, 두 조각이 같은 값을 갖는다(한가운데가
   * 그날 안에 드는 쪽). 표시 창·상승궁 시각의 원천.
   */
  occStartUtc: number
  occEndUtc: number
  /** 대표 시진의 실제 시계 시각 'HH:MM' — 그 instant 의 offset 으로(서울 子 '23:32'–'01:32'). */
  clockStart: string
  clockEnd: string
}

type RawPiece = {
  branchIdx: number
  startMin: number
  endMin: number
  peakMin: number
  startUtc: number
  endUtc: number
}

/** 'YYYY-MM-DD' (+addDays) 현지 자정 — 본명과 같은 RFC 5545 resolver(공백이면 직전 offset). */
function localMidnight(dayIso: string, addDays: number, timeZone: string) {
  const d = new Date(Date.parse(`${dayIso}T00:00:00.000Z`) + addDays * DAY_MS)
  return resolveBirthInstant(
    {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: 0,
      minute: 0,
    },
    timeZone
  )
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * 민용일 dayIso(timeZone 의 달력 날짜) 하루의 시진 조각 — 경계는 절대 instant, 시계분은 그
 * instant 의 실제 offset 으로(재감사 TP-9). 서머타임 전환이 없는 날은 hourSegmentsForCivilDay
 * (한 보정분)와 똑같다. 전환일은
 *  - 경계 instant = 평균태양시가 홀수 정시(子 23:00, 丑 01:00 …)를 지나는 순간,
 *  - 시계분 = 그 instant 의 벽시계. 겹치는 시간(해제)의 *두 번째* 벽시계에 떨어진 경계는 겹침이
 *    끝나는 시각으로 민다 — 겹치는 벽시계 분은 첫 번째 instant 로 읽는 본명 규칙(OD-3)과 같게,
 *  - 공백(시작)을 걸친 조각은 시계로 3시간처럼 보여도 실제 길이(durationMin)는 2시간이다.
 * 시계분 [0, 1440) 를 빈틈·겹침 없이 덮는다. 순수 함수(시계를 읽지 않는다).
 */
export function hourSegmentsForLocalDay(
  dayIso: string,
  longitude: number | undefined,
  timeZone: string
): LocalHourSegment[] {
  const r0 = localMidnight(dayIso, 0, timeZone)
  const r1 = localMidnight(dayIso, 1, timeZone)
  const dayStart = r0.utc.getTime()
  const dayEnd = r1.utc.getTime()
  const base = Date.parse(`${dayIso}T00:00:00.000Z`) // 떠 있는 벽시계 자정
  // r1.offsetMinutes = 다음 자정 *직전* offset (그 자정이 공백이어도 직전 offset 으로 읽는다).
  const uniform = r0.offsetMinutes === r1.offsetMinutes && dayEnd - dayStart === DAY_MS

  let raw: RawPiece[]
  if (uniform) {
    // 전환 없는 날 — 보정분 하나(예전과 같은 경로·같은 출력).
    const corr = solarTimeCorrectionMinutes(new Date(dayStart), longitude, timeZone)
    raw = hourSegmentsForCivilDay(corr).map((sg) => ({
      branchIdx: sg.branchIdx,
      startMin: sg.startMin,
      endMin: sg.endMin,
      peakMin: (sg.startMin + sg.endMin) / 2,
      startUtc: dayStart + sg.startMin * MIN_MS,
      endUtc: dayStart + sg.endMin * MIN_MS,
    }))
  } else {
    raw = transitionDayPieces(dayStart, dayEnd, base, longitude, timeZone)
  }

  // 대표 시진의 시계 시각 — 하루 안 instant 는 (전환 없는 날) 자정 offset 그대로, 그 밖은 실제 offset.
  const hhmm = (ms: number) => {
    const off =
      uniform && ms >= dayStart && ms < dayEnd ? r0.offsetMinutes : utcOffsetMinutesAt(ms, timeZone)
    const w = mod(Math.round(ms / MIN_MS + off), DAY_MIN)
    return `${pad2(Math.floor(w / 60))}:${pad2(w % 60)}`
  }

  const total = new Map<number, number>()
  const count = new Map<number, number>()
  for (const p of raw) {
    total.set(p.branchIdx, (total.get(p.branchIdx) ?? 0) + (p.endUtc - p.startUtc) / MIN_MS)
    count.set(p.branchIdx, (count.get(p.branchIdx) ?? 0) + 1)
  }
  const seen = new Set<number>()
  const out = raw.map((p, i) => {
    const durationMin = (p.endUtc - p.startUtc) / MIN_MS
    let part: HourSegment['part']
    if ((count.get(p.branchIdx) ?? 0) > 1) part = seen.has(p.branchIdx) ? 'late' : 'early'
    else if (i === 0 && durationMin < BRANCH_MIN) part = 'early'
    else if (i === raw.length - 1 && durationMin < BRANCH_MIN) part = 'late'
    else part = 'whole'
    seen.add(p.branchIdx)
    const share = durationMin / Math.max(BRANCH_MIN, total.get(p.branchIdx) ?? BRANCH_MIN)
    // 이 조각의 시진 한 번 — 앞 조각(자정 직후)은 전날 밤에서, 뒤 조각은 다음 날 새벽까지.
    const occStartUtc = part === 'early' ? p.endUtc - BRANCH_MS : p.startUtc
    return { ...p, part, durationMin, share, occStartUtc }
  })
  // 자정에서 나뉜 지지 — 두 조각이 같은 대표 시진(한가운데가 그날 안에 드는 쪽)을 싣는다.
  const centerInDay = (occStart: number) =>
    occStart + HOUR_MS >= dayStart && occStart + HOUR_MS < dayEnd
  const occOf = new Map<number, number>()
  for (const x of out) {
    const prev = occOf.get(x.branchIdx)
    if (prev === undefined || (!centerInDay(prev) && centerInDay(x.occStartUtc)))
      occOf.set(x.branchIdx, x.occStartUtc)
  }
  return out.map((x) => {
    const occStartUtc = occOf.get(x.branchIdx)!
    const occEndUtc = occStartUtc + BRANCH_MS
    return {
      ...x,
      occStartUtc,
      occEndUtc,
      clockStart: hhmm(occStartUtc),
      clockEnd: hhmm(occEndUtc),
    }
  })
}

/**
 * 전환일의 시진 조각 — 경계 instant 를 평균태양시로 직접 구하고 시계분으로 옮긴다.
 * 하루 안의 offset 전환은 많아야 하나다(tzdata 에 하루 두 번 바뀌는 존은 없다).
 */
function transitionDayPieces(
  dayStart: number,
  dayEnd: number,
  base: number,
  longitude: number | undefined,
  timeZone: string
): RawPiece[] {
  const offAt = (ms: number) => utcOffsetMinutesAt(ms, timeZone)
  // 전환 instant(분 해상도) — 하루 끝 직전 offset 이 자정 offset 과 다를 때만.
  // (자정 자체가 공백이면 자정 instant 가 곧 전환 뒤라 전환이 하루 안에 없다.)
  let transition: number | null = null
  const minutes = Math.floor((dayEnd - dayStart) / MIN_MS)
  const offBefore = offAt(dayStart)
  const offAfter = offAt(dayStart + (minutes - 1) * MIN_MS)
  if (offAfter !== offBefore) {
    let lo = 0
    let hi = minutes - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (offAt(dayStart + mid * MIN_MS) === offBefore) lo = mid
      else hi = mid
    }
    transition = dayStart + hi * MIN_MS
  }
  // 평균태양시(ms) = UT + (보정분 + offset) — offset 이 바뀌어도 합(≈ 경도×4분)은 그대로다.
  const kOf = (ms: number) =>
    solarTimeCorrectionMinutes(new Date(ms), longitude, timeZone) + offAt(ms)
  const kBefore = kOf(dayStart)
  const kAfter = transition === null ? kBefore : kOf(transition)
  const solarMs = (ms: number) =>
    ms + (transition !== null && ms >= transition ? kAfter : kBefore) * MIN_MS

  // 경계 instant — 평균태양시 홀수 정시(子 23:00, 丑 01:00, …).
  const cuts = [dayStart]
  for (let t = dayStart; ; ) {
    const next = t + (BRANCH_MS - mod(solarMs(t) - HOUR_MS, BRANCH_MS))
    if (next >= dayEnd) break
    cuts.push(next)
    t = next
  }
  cuts.push(dayEnd)

  // 시계분 — 그 instant 의 벽시계. 겹침(해제)의 두 번째 벽시계는 겹침 끝으로(첫 instant 규칙).
  const fallBackEnd =
    transition !== null && offAfter < offBefore
      ? (transition + offBefore * MIN_MS - base) / MIN_MS
      : null
  const clockMin = (ms: number) => {
    let w = (ms + offAt(ms) * MIN_MS - base) / MIN_MS
    if (fallBackEnd !== null && ms >= transition!) w = Math.max(w, fallBackEnd)
    return Math.min(DAY_MIN, Math.max(0, w))
  }

  const out: RawPiece[] = []
  for (let i = 0; i + 1 < cuts.length; i++) {
    const startUtc = cuts[i]
    const endUtc = cuts[i + 1]
    const startMin = i === 0 ? 0 : clockMin(startUtc)
    const endMin = i + 2 === cuts.length ? DAY_MIN : clockMin(endUtc)
    if (endMin <= startMin) continue // 겹침 두 번째 구간에 통째로 든 조각 — 벽시계 분이 없다
    const peakMin = Math.min(endMin, Math.max(startMin, clockMin((startUtc + endUtc) / 2)))
    const branchIdx = Math.floor(mod(solarMs(startUtc) + HOUR_MS, DAY_MS) / BRANCH_MS)
    out.push({ branchIdx, startMin, endMin, peakMin, startUtc, endUtc })
  }
  return out
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

      // 시진 조각별 신호 생성 (자정을 감싸는 지지는 두 조각). 경계는 절대 instant — 보정분은
      // 본명 사주(saju.ts)와 같은 SSOT(solarTimeCorrectionMinutes)를 그 instant 의 offset 으로.
      for (const seg of hourSegmentsForLocalDay(dayIso, longitude, timeZone)) {
        const branchIdx = seg.branchIdx
        const stemIdx = (firstHourStemIdx + branchIdx) % 10
        const stem = STEMS[stemIdx]
        const branch = BRANCHES[branchIdx]
        if (!stem || !branch) continue

        const sibsin = getSibsin(dayMaster, stem as StemInfo)
        if (!sibsin) continue

        const polarity = polarityFromYongsin(stem.element as FiveElement, yongsin)
        if (polarity === 0) continue // 중립 — 노이즈 방지

        const startIso = minToIso(seg.startMin)
        const endIso = minToIso(seg.endMin)
        const peakIso = minToIso(seg.peakMin)

        // 12 시진 narrative DB에서 baseline + polarity 매칭 텍스트 가져오기.
        // polarity 부호에 따라 baseline/positive/caution 분기.
        // BRANCHES.name은 한자(子, 丑, 寅...)인데 HOUR_BRANCH_NARRATIVE
        // 키는 한글(자, 축, 인...)이라 직접 매칭 안 됨 — 한자→한글 변환.
        const branchKo = (HANJA_TO_HANGUL[branch.name] ??
          branch.name) as keyof typeof HOUR_BRANCH_NARRATIVE
        const branchNarrative = HOUR_BRANCH_NARRATIVE[branchKo]
        const headline = branchNarrative ? pickHourNarrative(branchKo, polarity, 'ko') : undefined
        // 표시 창 = 그 시진의 *실제* 시계 시각(TP-8) — '23:32–01:32 (자시)'. 명목 '23-1시' 아님.
        const windowLabel = `${seg.clockStart}–${seg.clockEnd}${branchNarrative ? ` (${branchNarrative.nameKo})` : ''}`

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
          weight: seg.part === 'whole' ? 0.4 : Math.round(0.4 * seg.share * 1e6) / 1e6,
          evidence: {
            module: 'saju-hour',
            sibsin,
            element: stem.element as FiveElement,
            pillars: [`${stem.name}${branch.name}`],
            detail: {
              hourBranch: branch.name,
              hourStem: stem.name,
              // 그 시진 한 번의 실제 시계 창 'HH:MM' 과 평균태양시 한가운데 instant(UTC ISO) —
              // Day 화면 시진 줄의 시각·상승궁 시각(TP-8). 자정에서 나뉜 두 조각은 같은 값.
              clockStart: seg.clockStart,
              clockEnd: seg.clockEnd,
              centerUtc: new Date(seg.occStartUtc + 60 * 60_000).toISOString(),
              ...(seg.part === 'whole' ? {} : { segment: seg.part }),
              natalDayMaster: dayMaster.name,
              yongsin: yongsin.primary,
              // 12 시진 narrative DB에서 polarity 매칭 텍스트 + 실제 창 라벨
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
