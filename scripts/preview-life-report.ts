import { runMainSaju } from '../src/lib/saju/main'
import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService'
import { buildLifeReport } from '../src/lib/fusion/lifeReport'

async function main() {
  // 1995-02-09 06:40 AM Seoul
  const saju = runMainSaju({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    gender: 'male',
    timezone: 'Asia/Seoul',
  })

  const astro = await calculateNatalChart({
    year: 1995, month: 2, date: 9,
    hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })

  const report = buildLifeReport({ saju, astro: astro as never })

  console.log('═══════════════════════════════════════════════════════')
  console.log('  1995-02-09 06:40 AM Seoul — 실제 엔진 출력')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('■ 한 줄 정의\n')
  console.log(report.headline.ko)
  console.log('')

  console.log('■ 4 생애 단계\n')
  for (const k of ['early', 'young', 'middle', 'late'] as const) {
    const s = report.lifeStages[k]
    console.log(`── ${s.title.ko} ──`)
    s.paragraphs.forEach((p) => console.log(p.ko))
    console.log('')
  }

  console.log('■ 결정적 타이밍\n')
  report.decisiveTiming.paragraphs.forEach((p) => {
    console.log(p.ko); console.log()
  })
  if (report.decisiveTiming.decisiveYears.length > 0) {
    console.log('  결정적 해:')
    report.decisiveTiming.decisiveYears.slice(0, 5).forEach((y) => {
      console.log(`    ${y.age}세 (${y.year}) [${y.domain}] — ${y.description.ko}`)
    })
  }
  console.log('')

  console.log('■ 카르마/잠재력\n')
  report.karma.paragraphs.forEach((p) => {
    console.log(p.ko); console.log()
  })

  console.log('■ 9 도메인\n')
  for (const d of report.domains) {
    console.log(`── ${d.title.ko} ──`)
    d.paragraphs.forEach((p) => console.log(p.ko))
    if (d.estimatedChildCount) {
      const e = d.estimatedChildCount
      console.log(`  → 추정 자녀: ${e.min}-${e.max}명 (${e.confidence})`)
    }
    console.log('')
  }
}

main().catch((e) => {
  console.error('Error:', e.message)
  console.error(e.stack)
})
