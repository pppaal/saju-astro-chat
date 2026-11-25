import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { pointPrinciple } from '../data/astroFlow'
import { planetaryDayFrame, planetaryHourInFrame } from '@/lib/astrology/foundation/electional'
import { resolveBirthInstant } from '@/lib/datetime/resolveBirthInstant'

/**
 * 점성 행성시(Planetary Hours) 추출기 — 24시간 변별력(사주 시주의 점성 짝).
 *
 * 행성일은 현지 일출에 시작한다. 일출~일몰 12등분 + 일몰~다음 일출 12등분 = 24 행성시,
 * 칼데안 순서(Saturn→Jupiter→Mars→Sun→Venus→Mercury→Moon)로 돌고 첫 칸(일출)은 그 요일의
 * 지배성이다. 일출 *전* 시각은 전날 행성일의 밤이라 지배성도 전날 요일의 것이다.
 * 시계 시각(0~23)마다 그 시각 30분의 행성시를 매핑해 길흉 polarity 를 준다.
 *
 * 일출·일몰은 swe_rise_trans 의 실제 값(실제 위도·경도, 태양 윗가장자리 + 대기차). 예전엔
 * 남중을 12:00 으로 고정한 적위 근사라 서울 실제 남중(12:18~12:46)만큼 경계가 밀렸고, 일출
 * 전 시각을 *다음* 밤으로 감아 오늘 요일 지배성으로 세서 칼데안 순서가 3칸 틀렸다(엔진 감사
 * ASTRO-5). 태양이 뜨거나 지지 않는 극지 날은 행성시가 정의되지 않아 내지 않는다.
 *
 * 시각 키는 캘린더의 떠 있는 현지 키(YYYY-MM-DDTHH:00Z = 현지 벽시계 HH시). id 에 시각을
 * 박아(astro.planetary-hour.YYYY-MM-DD.H{hh}.{planet}) 24h 차트가 active 필드 없이도 시각을
 * 복원하게 한다.
 *
 * 노이즈 방지: 중립(Mercury, polarity 0)은 emit 안 함.
 */

type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn'

const PLANET_POLARITY: Record<Planet, Polarity> = {
  Sun: 2,
  Jupiter: 2,
  Venus: 1,
  Moon: 1,
  Mercury: 0, // 중립 — emit 안 함
  Mars: -1,
  Saturn: -1,
}

const PLANET_KO: Record<Planet, string> = {
  Sun: '태양시',
  Moon: '달시',
  Mars: '화성시',
  Mercury: '수성시',
  Jupiter: '목성시',
  Venus: '금성시',
  Saturn: '토성시',
}

const astroPlanetaryHourExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'planetary-hour',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const { latitude, longitude, timeZone } = natal.astro.location
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const dayIso = date.toISOString().slice(0, 10)
      const frame = planetaryDayFrame(dayIso, latitude, longitude, timeZone)
      if (!frame) continue // 극지 날(일출·일몰 없음) — 행성시 미정의

      /** 현지 벽시계 hh:mm 의 UT ms (출생 instant 와 같은 RFC 5545 resolver), 없는 날짜면 null. */
      const wallMs = (dayStartMs: number, hour: number, minute: number): number | null => {
        const d = new Date(dayStartMs)
        try {
          return resolveBirthInstant(
            {
              year: d.getUTCFullYear(),
              month: d.getUTCMonth() + 1,
              day: d.getUTCDate(),
              hour,
              minute,
            },
            timeZone
          ).utc.getTime()
        } catch {
          return null
        }
      }
      // 서머타임 전환이 없는 날(자정~다음 자정 = 24h)은 자정 + (h + 0.5)h 로 바로 —
      // 시각마다 resolver 를 부르면 월 빌드가 수십 ms 늘었다. 전환일만 시각마다 푼다.
      const midnight = wallMs(t, 0, 0)
      const nextMidnight = wallMs(t + 86_400_000, 0, 0)
      const uniform =
        midnight !== null && nextMidnight !== null && nextMidnight - midnight === 86_400_000

      /** 현지 벽시계 HH:30 의 행성시. */
      const planetAt = (clockHour: number): Planet | null => {
        const ms = uniform ? midnight! + (clockHour + 0.5) * 3600_000 : wallMs(t, clockHour, 30)
        if (ms === null) return null
        return (planetaryHourInFrame(ms, frame)?.planet as Planet | undefined) ?? null
      }

      for (let h = 0; h < 24; h++) {
        const planet = planetAt(h)
        if (!planet) continue
        const polarity = PLANET_POLARITY[planet]
        if (polarity === 0) continue // 중립 — 노이즈 방지

        const hh = String(h).padStart(2, '0')
        signals.push({
          id: `astro.planetary-hour.${dayIso}.H${hh}.${planet}`,
          source: 'astro',
          kind: 'planetary-hour',
          name: `${planet} hour`,
          korean: `${PLANET_KO[planet]} — ${pointPrinciple(planet, 'ko') || PLANET_KO[planet]} 기운이 강조되는 시간대`,
          english: `${planet} hour — a window emphasising ${pointPrinciple(planet, 'en') || planet}`,
          polarity,
          layer: 'hourly',
          active: {
            start: `${dayIso}T${hh}:00:00.000Z`,
            peak: `${dayIso}T${hh}:30:00.000Z`,
            // 23시 창은 그날 23:59:59.999 에서 닫는다 — `(h+1)%24` 는 같은 날 00:00 이라
            // end < start 가 돼 교차·시간 셀에서 빠졌다(엔진 감사 X10). 다음 날 00:00 으로
            // 열어 두면 day 셀 버킷이 다음 날까지 걸리므로 하루 끝 관례(…T23:59:59.999Z)를 쓴다.
            end:
              h === 23
                ? `${dayIso}T23:59:59.999Z`
                : `${dayIso}T${String(h + 1).padStart(2, '0')}:00:00.000Z`,
          },
          weight: 0.4,
          evidence: {
            module: 'astro-planetary-hour',
            planets: [planet],
            detail: {
              planet,
              clockHour: h,
              quality: polarity > 0 ? (polarity >= 2 ? 'excellent' : 'good') : 'caution',
            },
          },
        })
      }
    }

    return signals
  },
}

export default astroPlanetaryHourExtractor
