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
 * 즉 한 줄 = "이 시각엔 [십신] 기운이 켜지고, 하늘엔 [상승궁]이 떠요."
 * 엔진 cross-activation(현재 hourly 미지원) 대신, 이미 있는 시진 신호 + 값싼
 * 상승점 계산을 어댑터에서 직접 합성한다.
 */

import type { CalendarCell } from '@/lib/calendar-engine/types'
import type { ZodiacKo } from '@/lib/astrology/foundation/types'
import { calcHouses } from '@/lib/astrology/foundation/houses'
import { natalToJD } from '@/lib/astrology/foundation/shared'
import { formatLongitude } from '@/lib/astrology/foundation/utils'
import { SIGN_KO, PLANET_KO } from './shared'

export interface HourCrossItem {
  /** 시진 시간 라벨 — '5-7시 (묘시)'. */
  when: string
  /** 시주 천간의 일간 기준 십신. */
  sibsin: string
  /** 용신 부합(길) / 기피(주의). */
  tone: 'good' | 'caution'
  /** 그 시각 상승궁 한글 — '게자리'. */
  risingSignKo: string
  /** 상승궁 룰러 한글 — '달'. */
  ruler: string
  /** 시진 흐름 한 줄(사주 narrative). */
  narrative?: string
  /** |polarity| — 메인에 가장 센 시진만 추리는 용. */
  strength: number
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

    // 시진 한가운데 시각(시계 기준) 의 상승궁. 2시간 창이라 start+1 이 대표.
    const repHour = (startHour + 1) % 24
    let risingSignKo = ''
    let ruler = ''
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
      ruler = PLANET_KO[SIGN_RULER[sign]] ?? SIGN_RULER[sign]
    } catch {
      // 상승점 계산 실패(고위도·ephemeris) 시 사주만으로 한 줄은 유지.
    }

    rows.push({
      when,
      sibsin,
      tone: s.polarity > 0 ? 'good' : 'caution',
      risingSignKo,
      ruler,
      narrative: s.korean,
      strength: Math.abs(s.polarity),
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
