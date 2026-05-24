import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'

const BIRTH = {
  birthDate: '1995-02-09', birthTime: '06:40', gender: 'male' as const,
  latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
}

async function main() {
  const saju = calculateSajuData(BIRTH.birthDate, BIRTH.birthTime, BIRTH.gender, 'solar', BIRTH.timeZone)
  const natal = await buildNatalContext(BIRTH, { saju })
  for (const m of ['2026-04', '2026-05', '2026-06']) {
    const cells = await buildCalendar(natal, {
      start: `${m}-01T00:00:00.000Z`, end: `${m}-28T23:59:59.000Z`, granularity: 'day',
    }, { includeEvidence: true })
    const sibsins = new Set<string>()
    const polarities = new Map<string, number[]>()
    for (const c of cells) {
      for (const s of c.signals) {
        if (s.layer === 'monthly' && s.evidence?.sibsin) {
          const sib = s.evidence.sibsin as string
          sibsins.add(sib)
          if (!polarities.has(sib)) polarities.set(sib, [])
          polarities.get(sib)!.push(s.polarity)
        }
      }
    }
    console.log(`${m} monthly sibsins:`, [...sibsins])
    for (const [sib, pols] of polarities) {
      const avg = pols.reduce((a, b) => a + b, 0) / pols.length
      console.log(`  ${sib}: ${pols.length}회, polarity avg ${avg.toFixed(1)}`)
    }
  }
}
main().catch(console.error)
