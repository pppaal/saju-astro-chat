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
    start: '2026-05-01T00:00:00.000Z',
    end: '2026-05-31T23:59:59.999Z',
    granularity: 'day',
  })

  const c = cells.find((x) => x.datetime.startsWith('2026-05-09'))
  if (!c) { console.log('not found'); return }

  console.log('=== 2026-05-09 (full month context) ===\n')
  console.log('derivedScore:', c.derivedScore)
  console.log('matchedPatterns:')
  for (const p of c.matchedPatterns) {
    console.log(`  ★ ${p.name}  strength=${p.strength}  themes=${p.themes.join(',')}  desc="${p.description ?? ''}"`)
  }
  console.log('\nthemeScores (top 8 by score):')
  const ts = Object.entries(c.themeScores).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8)
  for (const [k, v] of ts) console.log(`  ${k.padEnd(15)} ${v}`)

  console.log('\ntopReasons:')
  for (const r of c.topReasons) console.log(' ', r)

  const sigs = [...c.signals].sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)
  console.log(`\nTop 15 signals (전체 ${c.signals.length}, saju ${c.signals.filter(s=>s.source==='saju').length} / astro ${c.signals.filter(s=>s.source==='astro').length})`)
  for (const s of sigs.slice(0, 15)) {
    const arrow = s.polarity > 1 ? '↑↑' : s.polarity > 0 ? '↑' : s.polarity < -1 ? '↓↓' : s.polarity < 0 ? '↓' : '·'
    console.log(`  ${arrow} [${s.layer.padEnd(8)}] [${s.source}] ${(s.korean ?? s.name).slice(0,50)}  pol=${s.polarity} w=${s.weight.toFixed(2)}`)
  }
}

main().catch(console.error)
