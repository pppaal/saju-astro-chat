import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../../types'
import { pointPrinciple } from '../../data/astroFlow'

/**
 * 점성 행성시(Planetary Hours) 추출기 — 24시간 변별력(사주 시주의 점성 짝).
 *
 * 칼데안 순서(Saturn→Jupiter→Mars→Sun→Venus→Mercury→Moon)로 하루를 일출~일몰
 * 12등분 + 일몰~일출 12등분 = 24 행성시로 나눈다. 각 날의 첫 행성시(일출)는 그
 * 요일의 지배 행성. 시계 시각(0~23)별로 지배 행성을 매핑해 길흉 polarity 부여.
 *
 * 일출·일몰은 위도 기반 태양 적위 근사(±30분 내외) — 정밀 천체계산 없이 가볍게.
 * id 에 시각을 박아(astro.planetary-hour.YYYY-MM-DD.H{hh}.{planet}) 24h 차트가
 * active 필드 없이도 시각을 복원하게 한다.
 *
 * 노이즈 방지: 중립(Mercury, polarity 0)은 emit 안 함.
 */

type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn'

// 칼데안 순서 (느린 → 빠른). 행성시는 이 순서로 순환.
const CHALDEAN: Planet[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']

// 요일별 지배 행성 (일=0 … 토=6) — 그 날 첫 행성시(일출)의 행성.
const DAY_RULER: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

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

/**
 * 위도 기반 일출/일몰(로컬 시계 시각, 시간 단위). 태양 적위 근사.
 * 태양남중을 12:00으로 단순화(경도 보정·균시차 생략 → ±30분 내외). 극지방은
 * cosH 클램프로 백야/극야 처리.
 */
function sunTimes(dayOfYear: number, latDeg: number): { sunrise: number; sunset: number } {
  const decl = 23.44 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365) // 태양 적위(deg)
  const latRad = (latDeg * Math.PI) / 180
  const declRad = (decl * Math.PI) / 180
  let cosH = -Math.tan(latRad) * Math.tan(declRad)
  cosH = Math.max(-1, Math.min(1, cosH))
  const halfDayHours = (Math.acos(cosH) * 180) / Math.PI / 15 // 반일 길이(시간)
  return { sunrise: 12 - halfDayHours, sunset: 12 + halfDayHours }
}

const astroPlanetaryHourExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'planetary-hour',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const lat = natal.astro.location.latitude
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const dayIso = date.toISOString().slice(0, 10)
      const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0)
      const dayOfYear = Math.floor(
        (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - yearStart) /
          86_400_000
      )
      const { sunrise, sunset } = sunTimes(dayOfYear, lat)
      const dayLen = sunset - sunrise
      const dayHourLen = dayLen / 12
      const nightHourLen = (24 - dayLen) / 12

      const rulerIdx = CHALDEAN.indexOf(DAY_RULER[date.getUTCDay()])

      // 24 행성시 구간 [start,end) (일출 기준 절대 시각, 야간은 24 넘김).
      const intervals: Array<{ start: number; end: number; planet: Planet }> = []
      for (let i = 0; i < 24; i++) {
        const planet = CHALDEAN[(rulerIdx + i) % 7]
        const s = i < 12 ? sunrise + i * dayHourLen : sunset + (i - 12) * nightHourLen
        intervals.push({ start: s, end: 0, planet })
      }
      for (let i = 0; i < 24; i++) {
        intervals[i].end = i < 23 ? intervals[i + 1].start : sunrise + 24
      }

      const planetAt = (clockHour: number): Planet => {
        let m = clockHour + 0.5
        if (m < sunrise) m += 24
        for (const iv of intervals) if (m >= iv.start && m < iv.end) return iv.planet
        return intervals[intervals.length - 1].planet
      }

      for (let h = 0; h < 24; h++) {
        const planet = planetAt(h)
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
            end: `${dayIso}T${String((h + 1) % 24).padStart(2, '0')}:00:00.000Z`,
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
