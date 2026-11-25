/**
 * 시간별 사주 × 점성 교차 — Day tier 의 '시(時) 교차' 원료.
 *
 * 사주 측: 그 날 12 시진 중 의미 있는(용신 부합/기피) 시진 — 일진 cell 안에
 *   이미 들어있는 hourly pillar-sibsin 신호(sajuHourExtractor)에서 그대로 뽑는다.
 *   (polarity 0 중립은 extractor 가 미리 걸러냄 → '켜지는 시간'만 남음.)
 * 점성 측: 하루 안에서 진짜로 빠르게 움직이는 단 하나의 요소 = 상승점(Ascendant).
 *   상승궁은 ~2시간에 한 별자리씩 바뀌어 12 시진과 결이 맞는다. 그 시진 한가운데
 *   시각의 상승궁을 swe_houses(행성 ephemeris 없이) 로 싸게 구해 교차 파트너로.
 *
 * '교차'의 정직성: 시진 십신 × 상승궁 룰러가 *의미 매핑 사전*(saju-astro-mapping)
 * 에 있고, 방향(길흉)이 시진 폴라리티와 모순되지 않을 때만 진짜 교차
 * (matched=true, crossMeaning 에 사전 해석). 그 밖엔 같은 시각의 두 사실 병치 —
 * UI 는 '×' 대신 '·' 로 구분해 과장하지 않는다. (엔진 cross-activation 이
 * hourly 를 지원하지 않아 어댑터에서 같은 사전으로 게이팅.)
 */

import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import { calcHouses } from '@/lib/astrology/foundation/houses'
import { natalToJD } from '@/lib/astrology/foundation/shared'
import { formatLongitude } from '@/lib/astrology/foundation/utils'
import { lookupCrossMapping } from '@/lib/calendar-engine/data/saju-astro-mapping'
import {
  HOUR_BRANCH_NARRATIVE,
  pickHourNarrative,
} from '@/lib/calendar-engine/data/hourBranchNarrative'
import { SIGN_KO, PLANET_KO } from './shared'

// HOUR_BRANCH_NARRATIVE 키(한글 시지) — 원본 Branch 타입이 미노출이라 동형 재정의.
type HangulBranch =
  | '자'
  | '축'
  | '인'
  | '묘'
  | '진'
  | '사'
  | '오'
  | '미'
  | '신'
  | '유'
  | '술'
  | '해'

/** 한자 시지 → 한글 (HOUR_BRANCH_NARRATIVE 키). */
const HANJA_TO_HANGUL: Record<string, HangulBranch> = {
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

export interface HourCrossItem {
  /** 시진 시간 라벨 — '5-7시 (묘시)'. */
  when: string
  /** 시진 시간 라벨(en) — '5-7am (Rabbit hour)'. */
  whenEn: string
  /** 시주 천간의 일간 기준 십신. */
  sibsin: string
  /** 용신 부합(길) / 기피(주의). */
  tone: 'good' | 'caution'
  /** 그 시각 상승궁 한글 — '게자리'. */
  risingSignKo: string
  /** 그 시각 상승궁 영문 — 'Cancer'. */
  risingSignEn: string
  /** 상승궁 룰러 한글 — '달'. */
  ruler: string
  /** 상승궁 룰러 영문 — 'Moon'. */
  rulerEn: string
  /** 시진 흐름 한 줄(사주 narrative, ko). */
  narrative?: string
  /** 시진 흐름 한 줄(en). */
  narrativeEn?: string
  /** |polarity| — 메인에 가장 센 시진만 추리는 용. */
  strength: number
  /** 십신 × 상승궁 룰러가 의미사전에 매칭되는 진짜 교차인지. */
  matched: boolean
  /** matched 일 때 사전 해석 한 줄 (mapping.meaning.ko). */
  crossMeaning?: string
  /** matched 일 때 사전 해석 한 줄 (mapping.meaning.en). */
  crossMeaningEn?: string
}

/** 전통(헬레니즘) sign ruler — 상승궁 룰러 룩업. */
const SIGN_RULER: Record<ZodiacKo, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
}

interface HourSignalDetail {
  startHour?: number
  windowLabel?: string
  hourBranch?: string
}

/**
 * 일진 cell 의 hourly 시진 신호 + 그 시각 상승궁 → 시간별 교차 리스트.
 *
 * @param dayCell      포커스 일자의 CalendarCell (signals 에 hourly 시진 포함)
 * @param focusDayIso  'YYYY-MM-DD'
 * @param loc          본명 위치(상승점은 위·경도·tz 의존) — natal.astro.location
 */
export function buildHourCrossings(
  dayCell: CalendarCell,
  focusDayIso: string,
  loc: { latitude: number; longitude: number; timeZone: string }
): HourCrossItem[] {
  const [year, month, date] = focusDayIso.split('-').map(Number)
  if (!year || !month || !date) return []

  const hourSigs = dayCell.signals.filter((s) => s.kind === 'pillar-sibsin' && s.layer === 'hourly')

  const rows: Array<HourCrossItem & { startHour: number }> = []
  for (const s of hourSigs) {
    const det = (s.evidence?.detail ?? {}) as HourSignalDetail
    const startHour = typeof det.startHour === 'number' ? det.startHour : 0
    const when = det.windowLabel ?? `${startHour}시`
    const sibsin = s.evidence?.sibsin ?? ''

    // en 시진 라벨 + en narrative — 한자 시지 → 한글 키로 HOUR_BRANCH_NARRATIVE 룩업.
    const branchHangul = det.hourBranch ? HANJA_TO_HANGUL[det.hourBranch] : undefined
    const nar = branchHangul ? HOUR_BRANCH_NARRATIVE[branchHangul] : undefined
    const whenEn = nar?.windowEn ?? when
    // 시지가 사전에 매핑되면 시진 narrative 를, 아니면(미매핑 한자) KO 가 s.korean 을
    // 쓰는 것과 대칭으로 s.english 로 폴백 — EN narrative 가 비지 않게 한다.
    const narrativeEn = branchHangul ? pickHourNarrative(branchHangul, s.polarity, 'en') : s.english

    // 시진 한가운데 시각(시계 기준) 의 상승궁. 2시간 창이라 start+1 이 대표.
    const repHour = (startHour + 1) % 24
    let risingSignKo = ''
    let risingSignEn = ''
    let ruler = ''
    let rulerEn = ''
    try {
      const jd = natalToJD({
        year,
        month,
        date,
        hour: repHour,
        minute: 0,
        latitude: loc.latitude,
        longitude: loc.longitude,
        timeZone: loc.timeZone,
      })
      const houses = calcHouses(jd, loc.latitude, loc.longitude)
      const sign = formatLongitude(houses.ascendant).sign as ZodiacKo
      risingSignKo = SIGN_KO[sign] ?? sign
      risingSignEn = sign // formatLongitude.sign 은 영문('Cancer')
      rulerEn = SIGN_RULER[sign]
      ruler = PLANET_KO[rulerEn] ?? rulerEn
    } catch {
      // 상승점 계산 실패(고위도·ephemeris) 시 사주만으로 한 줄은 유지.
    }

    // 의미사전 게이팅 — 십신 × 룰러 매핑이 있고, 매핑 길흉 방향이 시진 폴라리티와
    // 모순(한쪽 길·한쪽 흉)이 아니면 진짜 교차. 엔진 combinePolarity 와 같은 원칙.
    const mapping = lookupCrossMapping(sibsin, rulerEn)
    const matched = !!mapping && (mapping.polarity === 0 || mapping.polarity > 0 === s.polarity > 0)

    rows.push({
      when,
      whenEn,
      sibsin,
      tone: s.polarity > 0 ? 'good' : 'caution',
      risingSignKo,
      risingSignEn,
      ruler,
      rulerEn,
      narrative: s.korean,
      narrativeEn,
      strength: Math.abs(s.polarity),
      matched,
      crossMeaning: matched ? mapping?.meaning.ko : undefined,
      crossMeaningEn: matched ? mapping?.meaning.en : undefined,
      startHour,
    })
  }

  return rows
    .sort((a, b) => a.startHour - b.startHour)
    .map(({ startHour, ...rest }) => {
      void startHour
      return rest
    })
}
