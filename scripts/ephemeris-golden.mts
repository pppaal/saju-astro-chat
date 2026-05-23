/**
 * Swiss Ephemeris 골든 회귀 가드 (standalone — vitest 목킹 우회).
 *
 * 왜 standalone 인가:
 *   tests/setup.ts 가 swisseph 와 ephe 모듈을 전역 목킹(행성 고정)해서,
 *   vitest 안에선 "코드가 안 깨지나"만 보고 "천체 계산이 맞나"는 검증 못 함.
 *   이 스크립트는 *실제* swisseph 로 고정 날짜의 행성 황경을 재계산해
 *   박아둔 골든 값과 대조 → ephemeris 라이브러리/플래그가 바뀌면 즉시 실패.
 *
 * 실행: npm run test:ephemeris-golden  (CI 스텝 권장)
 * 골든 재생성: 아래 GOLDEN 을 지우고 PRINT_MODE=1 로 실행한 출력으로 교체.
 */

// 고정 기준: lat=0, lon=0, UTC, 정오. (위치 무관한 황경 — angles 아님)
const FIXED = { latitude: 0, longitude: 0, timeZone: 'UTC' } as const
const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const

// 실제 Swiss Ephemeris 로 캡처한 황경(도). 라이브러리/데이터 변경 시 깨짐.
const GOLDEN: Record<string, Record<string, number>> = {
  '2020-01-01': { Sun: 280.519, Moon: 352.085, Mercury: 275.171, Venus: 315.022, Mars: 238.721, Jupiter: 276.786, Saturn: 291.453, Uranus: 32.69, Neptune: 346.274, Pluto: 292.402 },
  '2024-06-15': { Sun: 84.876, Moon: 188.765, Mercury: 85.884, Venus: 87.833, Mars: 34.669, Jupiter: 64.767, Saturn: 349.258, Uranus: 54.961, Neptune: 359.854, Pluto: 301.688 },
  '2026-12-31': { Sun: 279.811, Moon: 198.25, Mercury: 279.101, Venus: 232.991, Mars: 159.812, Jupiter: 146.472, Saturn: 8.313, Uranus: 62.318, Neptune: 1.713, Pluto: 304.337 },
}

// 결정적 계산이라 매우 타이트하게. 라이브러리 교체 시 보통 도 단위로 틀어짐.
const TOLERANCE_DEG = 0.05

async function main() {
  // tsx 정적 named-import 가 이 모듈 export 를 못 잡아 dynamic import 사용.
  const transit = await import('../src/lib/astrology/foundation/transit')
  const calculateTransitChart = (
    transit as unknown as {
      calculateTransitChart: (a: {
        iso: string
        latitude: number
        longitude: number
        timeZone: string
      }) => Promise<{ planets: Array<{ name: string; longitude: number }> }>
    }
  ).calculateTransitChart

  const printMode = process.env.PRINT_MODE === '1'
  let failures = 0

  for (const date of Object.keys(GOLDEN)) {
    const chart = await calculateTransitChart({ iso: `${date}T12:00:00`, ...FIXED })
    const row: Record<string, number> = {}
    for (const p of PLANETS) {
      const pl = chart.planets.find((x) => x.name === p)
      if (pl) row[p] = Math.round(pl.longitude * 1000) / 1000
    }
    if (printMode) {
      console.log(`  '${date}': ${JSON.stringify(row)},`)
      continue
    }
    for (const p of PLANETS) {
      const expected = GOLDEN[date][p]
      const actual = row[p]
      if (typeof expected !== 'number') continue
      if (typeof actual !== 'number') {
        console.error(`❌ ${date} ${p}: 계산값 없음`)
        failures++
        continue
      }
      // 황경 wrap(0/360) 고려한 최소 각거리
      let diff = Math.abs(actual - expected) % 360
      if (diff > 180) diff = 360 - diff
      if (diff > TOLERANCE_DEG) {
        console.error(`❌ ${date} ${p}: expected ${expected}°, got ${actual}° (Δ${diff.toFixed(3)}°)`)
        failures++
      }
    }
  }

  if (printMode) return
  if (failures > 0) {
    console.error(`\n천체력 골든 ${failures}건 불일치 — ephemeris 라이브러리/데이터가 바뀌었을 수 있음.`)
    process.exit(1)
  }
  console.log(`✅ ephemeris golden 통과 (${Object.keys(GOLDEN).length} 날짜 × ${PLANETS.length} 행성, tol ${TOLERANCE_DEG}°)`)
}

main().catch((e) => {
  console.error('ephemeris-golden 실행 실패:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
