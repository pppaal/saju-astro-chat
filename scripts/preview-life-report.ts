import { runMainSaju } from '../src/lib/saju/main'
import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService'
import { buildLifeReport } from '../src/lib/fusion/lifeReport'

interface BirthCase {
  label: string
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  date: { year: number; month: number; day: number; hour: number; minute: number }
}

const cases: BirthCase[] = [
  {
    label: '1990-01-01 12:00 (대조)',
    birthDate: '1990-01-01',
    birthTime: '12:00',
    gender: 'male',
    date: { year: 1990, month: 1, day: 1, hour: 12, minute: 0 },
  },
  {
    label: '1985-06-15 18:30 (중년 여)',
    birthDate: '1985-06-15',
    birthTime: '18:30',
    gender: 'female',
    date: { year: 1985, month: 6, day: 15, hour: 18, minute: 30 },
  },
  {
    label: '2000-12-25 03:00 (밤)',
    birthDate: '2000-12-25',
    birthTime: '03:00',
    gender: 'male',
    date: { year: 2000, month: 12, day: 25, hour: 3, minute: 0 },
  },
]

async function main() {
  for (const c of cases) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`  ${c.label}`)
    console.log(`${'═'.repeat(60)}\n`)

    const saju = runMainSaju({
      birthDate: c.birthDate,
      birthTime: c.birthTime,
      gender: c.gender,
      timezone: 'Asia/Seoul',
    })

    const astro = await calculateNatalChart({
      year: c.date.year,
      month: c.date.month,
      date: c.date.day,
      hour: c.date.hour,
      minute: c.date.minute,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })

    const report = buildLifeReport({ saju, astro: astro as never })

    console.log('■ Headline\n')
    console.log(report.headline.ko)
    console.log('\n■ Career P1\n')
    console.log(report.domains.find((d) => d.id === 'career')?.paragraphs[0]?.ko)
    console.log('\n■ Love P1\n')
    console.log(report.domains.find((d) => d.id === 'love')?.paragraphs[0]?.ko)
    console.log('\n■ Karma P2\n')
    console.log(report.karma.paragraphs[1]?.ko)
  }
}

main().catch((e) => {
  console.error('Error:', e.message)
  console.error(e.stack)
})
