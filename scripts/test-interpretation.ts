import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildInterpretation } from '@/lib/calendar-engine/interpretation'

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
  }, { includeEvidence: true })

  const interp = buildInterpretation({ natal, cells, scope: 'monthly' })

  console.log('=== 매칭된 룰 ===')
  console.log(interp.matchedRuleIds)

  console.log('\n=== 섹션별 분해 ===')
  for (const s of interp.sections) {
    console.log(`\n[${s.title}] (${s.section})`)
    console.log(s.text)
  }

  console.log('\n\n=== 합성 narrative ===\n')
  console.log(interp.narrative)
}

main().catch(console.error)
