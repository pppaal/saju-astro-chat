import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'

async function main() {
  const natal = await buildNatalContext({
    birthDate: '1993-08-15',
    birthTime: '14:30',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })

  const cells = await buildCalendar(natal, {
    start: '2026-05-09T00:00:00.000Z',
    end: '2026-05-09T23:59:59.999Z',
    granularity: 'day',
  })

  const c = cells[0]
  console.log('=== 2026-05-09 실제 엔진 출력 ===\n')
  console.log('derivedScore:', c.derivedScore)
  console.log('themeScores:', JSON.stringify(c.themeScores, null, 2))
  console.log('\nmatchedPatterns:')
  for (const p of c.matchedPatterns) {
    console.log(`  ★ ${p.name}  strength=${p.strength}  themes=${p.themes.join(',')}`)
  }
  console.log('\ntopReasons:')
  for (const r of c.topReasons) console.log(' ', r)

  // 정렬: source, polarity desc
  const sigs = [...c.signals].sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)
  console.log(`\nTop 20 signals (전체 ${c.signals.length})`)
  for (const s of sigs.slice(0, 20)) {
    const arrow = s.polarity > 1 ? '↑↑' : s.polarity > 0 ? '↑' : s.polarity < -1 ? '↓↓' : s.polarity < 0 ? '↓' : '·'
    console.log(`  ${arrow} [${s.layer}] [${s.source}] ${s.korean ?? s.name} (pol=${s.polarity}, w=${s.weight.toFixed(2)})`)
  }
}

main().catch(console.error)
