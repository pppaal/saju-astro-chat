/**
 * NatalContext + lifetimeFlow / lifetimePivots → destinypal `lifetime` 객체 adapter.
 *
 * destinypal LifetimeTier 가 받는 prop shape (`DestinyLifetime`):
 *   { birthYear, currentYear, daewoon[], lifeStages[], milestones[],
 *     zrSpiritChapters[], zrFortuneChapters[] }
 *
 * 본 adapter 는 toDaewoon / toLifeStages / toMilestones 를 한 번에 호출하고,
 * NatalContext.astro.zodiacalReleasing.{spirit, fortune}.periods 에서 ZR L1
 * 챕터를 자동으로 평탄화해 `DestinyZRChapter[]` 로 변환한다.
 *
 * 입력:
 *  - natal: NatalContext  (zr periods 원천)
 *  - lifetimeFlow / lifetimePivots (deriver 결과)
 *  - currentYear (UI 기준 연도)
 *
 * 출력: DestinyLifetime
 */

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import type { LifetimeFlow } from '@/lib/calendar-engine/derivers/lifetimeFlow'
import type { LifetimePivots } from '@/lib/calendar-engine/derivers/lifetimePivots'
import type { ZRPeriod, ZRStartLot } from '@/lib/astrology/foundation/zodiacalReleasing'
import type {
  DestinyLifetime,
  DestinyZRChapter,
  DestinyDaewoon,
  DestinyLifeStage,
  DestinyMilestone,
  DestinyLifeStageDetail,
} from '@/types/calendar'

import { deriveLifePattern } from '@/lib/calendar-engine/derivers/lifePattern'
import { toDaewoon } from './toDaewoon'
import { toLifeStages } from './toLifeStages'
import { toMilestones } from './toMilestones'

export interface ToLifetimeOptions {
  /** 본명 출생 연도. */
  birthYear: number
  /** UI 기준 (현재) 연도. */
  currentYear: number
  /** lifetimeFlow deriver 결과 (선택 — 없으면 lifeStages 가 빈 4-슬롯). */
  lifetimeFlow?: LifetimeFlow
  /** lifetimePivots deriver 결과 (선택 — 없으면 milestones 가 빈 배열). */
  lifetimePivots?: LifetimePivots
  /** ZR 챕터 projection 범위 (만 나이). 기본 0..90. */
  zrAgeFrom?: number
  zrAgeTo?: number
}

/**
 * ZR L1 period → DestinyZRChapter projection.
 *
 * Hellenistic ZR L1 sequence (sign-walk by Spirit / Fortune lot) 를 본명
 * 출생연도 기준 서기 연도로 캘린더 매핑 + `now` flag (currentYear 가 챕터 안인가).
 */
function zrPeriodsToChapters(
  periods: ZRPeriod[],
  startLot: ZRStartLot,
  birthYear: number,
  currentYear: number,
  ageFrom: number,
  ageTo: number
): DestinyZRChapter[] {
  const chapters: DestinyZRChapter[] = []
  for (const p of periods) {
    // 챕터가 ageRange 와 겹치는지
    if (p.endYear <= ageFrom) continue
    if (p.startYear >= ageTo) break
    const calStart = birthYear + Math.round(p.startYear)
    const calEnd = birthYear + Math.round(p.endYear)
    const now = currentYear >= calStart && currentYear < calEnd
    chapters.push({
      ...p,
      startLot,
      calendarStartYear: calStart,
      calendarEndYear: calEnd,
      now,
      label: `${p.sign} / ${p.ruler} / ${p.durationYears}년`,
    })
  }
  return chapters
}

/**
 * NatalContext + derivers → DestinyLifetime.
 *
 * 모든 5 필드 (daewoon / lifeStages / milestones / zrSpirit / zrFortune) 가
 * 입력만 주어지면 자동으로 채워진다. caller 는 `as unknown as` 없이 그대로
 * DestinyLifetime 으로 LifetimeTier 에 넘기면 됨.
 */
export function toLifetime(natal: NatalContext, opts: ToLifetimeOptions): DestinyLifetime {
  const ageFrom = opts.zrAgeFrom ?? 0
  const ageTo = opts.zrAgeTo ?? 90

  const daewoon: DestinyDaewoon[] = toDaewoon(natal).map((d) => ({
    gz: d.gz,
    start: d.start,
    end: d.end,
    startAge: d.startAge,
    endAge: d.startAge + 10,
    sibsin: d.sibsin,
    known: d.known,
    now: opts.currentYear >= d.start && opts.currentYear < d.end,
  }))

  const lifeStagesRaw = toLifeStages(opts.lifetimeFlow, { birthYear: opts.birthYear })
  // adapter 의 DestinypalLifeStage 와 DestinyLifeStage 는 detail 만 살짝 다름:
  //  - adapter detail.daeunText?: string
  //  - public  detail.daeunText:  string  (필수)
  // 비어있으면 빈 문자열로 normalize.
  const lifeStages: DestinyLifeStage[] = lifeStagesRaw.map((s) => {
    if (!s.detail) {
      return {
        id: s.id,
        name: s.name,
        ageFrom: s.ageFrom,
        ageTo: s.ageTo,
        yearFrom: s.yearFrom,
        yearTo: s.yearTo,
        now: s.now,
        tone: s.tone,
        detail: null,
      }
    }
    const detail: DestinyLifeStageDetail = {
      daewoonText: s.detail.daeunText ?? '',
      body: s.detail.body,
      outer: s.detail.outer.map((o) => ({
        label: o.label,
        date: o.date,
        body: o.body,
        kind: o.kind ?? 'astro',
      })),
      hapchung: s.detail.hapchung,
      shinsal: s.detail.shinsal,
      unseong: s.detail.unseong,
    }
    return {
      id: s.id,
      name: s.name,
      ageFrom: s.ageFrom,
      ageTo: s.ageTo,
      yearFrom: s.yearFrom,
      yearTo: s.yearTo,
      now: s.now,
      tone: s.tone,
      detail,
    }
  })

  const milestones: DestinyMilestone[] = toMilestones(opts.lifetimePivots).map((m) => ({
    year: m.year,
    age: m.age,
    label: m.label,
    labelEn: m.labelEn,
    // toMilestones 는 'chiron' / 'astro' 도 반환 — DestinyMilestoneKind 와 정합.
    kind: (m.kind === 'chiron' || m.kind === 'astro' ? 'saju' : m.kind) as DestinyMilestone['kind'],
    now: m.now,
  }))

  // ── ZR L1 챕터: Spirit / Fortune 자동 펼침 ──
  const zr = natal.astro.zodiacalReleasing
  const zrSpiritChapters: DestinyZRChapter[] = zr.spirit
    ? zrPeriodsToChapters(
        zr.spirit.periods,
        'Spirit',
        opts.birthYear,
        opts.currentYear,
        ageFrom,
        ageTo
      )
    : []
  const zrFortuneChapters: DestinyZRChapter[] = zr.fortune
    ? zrPeriodsToChapters(
        zr.fortune.periods,
        'Fortune',
        opts.birthYear,
        opts.currentYear,
        ageFrom,
        ageTo
      )
    : []

  // 인생 유형 — 신강약 기준 대운 흐름(대기만성/초년발복/…).
  const lp = deriveLifePattern(natal.saju as never)
  const lifePattern = lp
    ? {
        key: lp.key,
        ko: lp.ko,
        en: lp.en,
        line: lp.line,
        lineEn: lp.lineEn,
        daeun: lp.daeun.map((d) => ({ startAge: d.startAge, gz: d.gz, favor: d.favor })),
      }
    : undefined

  return {
    birthYear: opts.birthYear,
    currentYear: opts.currentYear,
    daewoon,
    lifeStages,
    milestones,
    zrSpiritChapters,
    zrFortuneChapters,
    lifePattern,
  }
}
