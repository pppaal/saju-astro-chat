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

  const ranked = [...cells].sort((a, b) => b.derivedScore - a.derivedScore)

  console.log('=== 길일 TOP 5 ===')
  for (const c of ranked.slice(0, 5)) {
    const reason = pickReason(c)
    console.log(`  ${c.datetime.slice(5,10)}  score=${c.derivedScore}  → ${reason}`)
  }

  console.log('\n=== 흉일 TOP 5 ===')
  for (const c of ranked.slice(-5).reverse()) {
    const reason = pickReason(c)
    console.log(`  ${c.datetime.slice(5,10)}  score=${c.derivedScore}  → ${reason}`)
  }
}
function pickReason(c: { matchedPatterns: { name: string }[]; signals: { layer: string; polarity: number; weight: number; korean?: string; name: string }[] }): string {
  if (c.matchedPatterns[0]) return `★ ${c.matchedPatterns[0].name}`
  const transient = c.signals.filter(s => s.layer === 'daily' || s.layer === 'monthly' || s.layer === 'hourly')
  const pool = transient.length > 0 ? transient : c.signals
  const top = [...pool].sort((a,b) => Math.abs(b.polarity)*b.weight - Math.abs(a.polarity)*a.weight)[0]
  if (!top) return ''
  const arrow = top.polarity > 0 ? '↑' : top.polarity < 0 ? '↓' : '·'
  return `${arrow} ${top.korean ?? top.name}`
}

main().catch(console.error)
