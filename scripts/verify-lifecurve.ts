/**
 * buildLifeCurve 프로토타입 검증 — 50개 차트에서 곡선이 실제로 출렁이는지 수치로.
 *   npx tsx scripts/verify-lifecurve.ts
 */
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import {
  buildLifeCurve,
  computeTransitAstroSeries,
} from '../src/lib/calendar-engine/derivers/lifeCurve'
import { deriveLifePattern } from '../src/lib/calendar-engine/derivers/lifePattern'

const REAL_TRANSIT_N = 15 // 실 ephemeris 트랜짓으로 비교할 차트 수(나머지는 벨 근사)

const PLACES = [
  { lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
  { lat: 35.1796, lon: 129.0756, tz: 'Asia/Seoul' },
  { lat: 33.4996, lon: 126.5312, tz: 'Asia/Seoul' },
  { lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
]
const NOW = new Date('2026-06-15T00:00:00Z')

function spark(xs: number[]): string {
  const bars = '▁▂▃▄▅▆▇█'
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  const r = hi - lo || 1
  return xs.map((x) => bars[Math.min(7, Math.max(0, Math.round(((x - lo) / r) * 7)))]).join('')
}
function turningPoints(xs: number[]): number {
  let t = 0
  for (let i = 1; i < xs.length - 1; i++) {
    const d1 = Math.sign(xs[i] - xs[i - 1])
    const d2 = Math.sign(xs[i + 1] - xs[i])
    if (d1 !== 0 && d2 !== 0 && d1 !== d2) t++
  }
  return t
}

async function main() {
  const curveStats: Array<{ range: number; std: number; tp: number; peaks: number; troughs: number }> =
    []
  const stepStats: Array<{ range: number; tp: number }> = []
  const samples: string[] = []

  for (let i = 0; i < 50; i++) {
    const year = 1942 + Math.round((i * 75) / 49)
    const month = ((i * 7) % 12) + 1
    const day = ((i * 13) % 27) + 1
    const hour = (i * 5) % 24
    const minute = (i * 17) % 60
    const gender = i % 2 === 0 ? 'male' : 'female'
    const loc = PLACES[i % PLACES.length]
    const BIRTH = {
      birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      birthTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      gender: gender as 'male',
      latitude: loc.lat,
      longitude: loc.lon,
      timeZone: loc.tz,
    }
    const saju = calculateSajuData(BIRTH.birthDate, BIRTH.birthTime, BIRTH.gender, 'solar', BIRTH.timeZone)
    const natal = await buildNatalContext(BIRTH, { saju })

    // 점성층: 앞 N개는 실 트랜짓 ephemeris, 나머지는 벨 근사.
    const astroSeries =
      i < REAL_TRANSIT_N ? await computeTransitAstroSeries(natal, { span: 90 }) : undefined
    const curve = buildLifeCurve(natal, { now: NOW, astroSeries })
    const pattern = deriveLifePattern(natal.saju as never)
    if (!curve || !pattern) continue

    const sm = curve.points.map((p) => p.macro)
    const range = Math.max(...sm) - Math.min(...sm)
    const mean = sm.reduce((a, b) => a + b, 0) / sm.length
    const std = Math.sqrt(sm.reduce((a, b) => a + (b - mean) ** 2, 0) / sm.length)
    curveStats.push({
      range,
      std,
      tp: turningPoints(sm),
      peaks: curve.peaks.length,
      troughs: curve.troughs.length,
    })

    // 현재 10스텝 favor (대운별)
    const favs = pattern.daeun.map((d) => d.favor)
    stepStats.push({ range: Math.max(...favs) - Math.min(...favs), tp: turningPoints(favs) })

    if ([0, 5, 10].includes(i)) {
      // 0~84세 구간만(샘플), 매 3년
      const seg = curve.points.filter((p) => p.age <= 84 && p.age % 2 === 0).map((p) => p.macro)
      samples.push(
        `p${String(i + 1).padStart(2, '0')} ${pattern.ko} [실트랜짓]  곡선: ${spark(
          seg
        )}  (peaks ${curve.peaks.map((x) => x.age).join(',')} | troughs ${curve.troughs
          .map((x) => x.age)
          .join(',')})`
      )
    }
  }

  const avg = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)
  console.log('=== 곡선(프로토타입) vs 현재 10스텝 favor — 50개 차트 평균 ===')
  console.log(
    `곡선  : range ${avg(curveStats.map((s) => s.range))}  std ${avg(
      curveStats.map((s) => s.std)
    )}  turning-points ${avg(curveStats.map((s) => s.tp))}  peaks ${avg(
      curveStats.map((s) => s.peaks)
    )}  troughs ${avg(curveStats.map((s) => s.troughs))}`
  )
  console.log(
    `현재  : range ${avg(stepStats.map((s) => s.range))}  turning-points ${avg(
      stepStats.map((s) => s.tp)
    )}   (10스텝 계단, 마디 라벨 없음)`
  )
  console.log('\n=== 샘플 곡선 (0~84세, 2년 간격, smooth) ===')
  samples.forEach((s) => console.log(s))
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
