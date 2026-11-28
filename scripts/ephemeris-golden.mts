/**
 * Swiss Ephemeris 골든 회귀 가드 (standalone — vitest 목킹 우회).
 *
 * 왜 standalone 인가:
 *   tests/setup.ts 가 swisseph 와 ephe 모듈을 전역 목킹(행성 고정)해서, vitest 안에선
 *   목을 푼 파일(tests/golden/astro.golden.node.test.ts 등)만 천체 계산을 본다. 이
 *   스크립트는 vitest 없이 *실제* swisseph 로 본명 차트를 계산해, 독립 천체력 골든과
 *   대조 → ephemeris 라이브러리/데이터/플래그나 시간대 변환이 바뀌면 즉시 실패.
 *
 * 기준값: tests/golden/engine-golden.json 의 astro.charts — scripts/golden/build-engine-golden.mts
 *   가 astronomy-engine(진황도·겉보기 위치)·접촉 교점·GAST 앵글·독립 Placidus 로 만든 값이다
 *   (엔진 출력 아님). 예전 이 스크립트는 swisseph 자신이 낸 값 3날짜 × 10행성을 위도·경도 0,
 *   UTC 로만 고정해 시간대 변환·ASC/MC·커스프·하우스·교점·역행을 전혀 안 봤다(엔진 감사 F10).
 *   이제 서머타임·KMT·남반구·극권 WholeSign 폴백 차트까지 행성·교점·ASC/MC·커스프·하우스·
 *   역행을 골든 허용오차(행성·교점·앵글 0.02°, 커스프 0.03°)로 본다.
 *
 * 실행: npm run test:ephemeris-golden  (CI pr-checks build-check)
 * 골든 갱신: npm run golden:build (생성기) — 이 파일에 값을 손으로 적지 않는다.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Body = { lon: number; sign: string; house?: number; retrograde?: boolean }
type GoldenChart = {
  id: string
  input: { date: string; time: string; tz: string; lat: number; lon: number }
  houseSystem: string
  planets: Record<string, Body>
  trueNode: Body
  ascendant: Body
  mc: Body
  cusps: number[]
}
type Golden = {
  astro: {
    tolerance: { planetDeg: number; nodeDeg: number; angleDeg: number; cuspDeg: number }
    charts: GoldenChart[]
  }
}
type NatalPlanet = {
  name: string
  longitude: number
  sign: string
  house: number
  retrograde?: boolean
}
type Natal = {
  planets: NatalPlanet[]
  ascendant: { longitude: number; sign: string }
  mc: { longitude: number; sign: string }
  houses: Array<{ cusp: number }>
  meta?: { houseSystem?: string }
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const golden = JSON.parse(
  readFileSync(resolve(ROOT, 'tests/golden/engine-golden.json'), 'utf8')
) as Golden
const TOL = golden.astro.tolerance

const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

async function main() {
  // tsx 정적 named-import 가 이 모듈 export 를 못 잡아 dynamic import 사용.
  const service = (await import('../src/lib/astrology/foundation/astrologyService')) as unknown as {
    calculateNatalChart: (a: {
      year: number
      month: number
      date: number
      hour: number
      minute: number
      latitude: number
      longitude: number
      timeZone: string
    }) => Promise<Natal>
  }

  const failures: string[] = []
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg)
  }
  let checks = 0

  for (const c of golden.astro.charts) {
    const [year, month, date] = c.input.date.split('-').map(Number)
    const [hour, minute] = c.input.time.split(':').map(Number)
    const n = await service.calculateNatalChart({
      year,
      month,
      date,
      hour,
      minute,
      latitude: c.input.lat,
      longitude: c.input.lon,
      timeZone: c.input.tz,
    })
    const tag = `${c.id} ${c.input.date} ${c.input.time} ${c.input.tz}`

    for (const [name, ref] of Object.entries(c.planets)) {
      const p = n.planets.find((x) => x.name === name)
      checks++
      if (!p) {
        failures.push(`${tag} ${name}: 계산값 없음`)
        continue
      }
      const d = angDiff(p.longitude, ref.lon)
      check(
        d <= TOL.planetDeg,
        `${tag} ${name}: ${p.longitude.toFixed(4)}° vs ${ref.lon}° (Δ${d.toFixed(4)}°)`
      )
      check(p.sign === ref.sign, `${tag} ${name} sign: ${p.sign} vs ${ref.sign}`)
      check(p.house === ref.house, `${tag} ${name} house: ${p.house} vs ${ref.house}`)
      check(
        !!p.retrograde === !!ref.retrograde,
        `${tag} ${name} retrograde: ${!!p.retrograde} vs ${!!ref.retrograde}`
      )
    }

    const node = n.planets.find((x) => x.name === 'True Node')
    checks++
    check(
      !!node &&
        angDiff(node.longitude, c.trueNode.lon) <= TOL.nodeDeg &&
        node.sign === c.trueNode.sign,
      `${tag} True Node: ${node?.longitude.toFixed(4)}° ${node?.sign} vs ${c.trueNode.lon}° ${c.trueNode.sign}`
    )

    checks += 2
    for (const [label, got, ref] of [
      ['ASC', n.ascendant, c.ascendant],
      ['MC', n.mc, c.mc],
    ] as const) {
      check(
        angDiff(got.longitude, ref.lon) <= TOL.angleDeg && got.sign === ref.sign,
        `${tag} ${label}: ${got.longitude.toFixed(4)}° ${got.sign} vs ${ref.lon}° ${ref.sign}`
      )
    }

    checks++
    check(
      n.meta?.houseSystem === c.houseSystem,
      `${tag} house system: ${n.meta?.houseSystem} vs ${c.houseSystem}`
    )
    check(n.houses.length === 12, `${tag} houses: ${n.houses.length}`)
    n.houses.forEach((h, i) => {
      checks++
      const d = angDiff(h.cusp, c.cusps[i])
      check(
        d <= TOL.cuspDeg,
        `${tag} cusp ${i + 1}: ${h.cusp.toFixed(4)}° vs ${c.cusps[i]}° (Δ${d.toFixed(4)}°)`
      )
    })
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`❌ ${f}`)
    console.error(
      `\n천체력 골든 ${failures.length}건 불일치 — ephemeris 라이브러리/데이터/시간대 변환이 바뀌었을 수 있음.`
    )
    process.exit(1)
  }
  console.log(
    `✅ ephemeris golden 통과 (${golden.astro.charts.length} 차트, ${checks} 항목: 행성·교점·ASC/MC·커스프·하우스·역행, tol 행성 ${TOL.planetDeg}° / 커스프 ${TOL.cuspDeg}°)`
  )
}

main().catch((e) => {
  console.error('ephemeris-golden 실행 실패:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
