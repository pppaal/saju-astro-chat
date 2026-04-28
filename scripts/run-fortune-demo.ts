import { runFortune } from '@/lib/fortune/cross-rules'
import { renderToText } from '@/lib/fortune/cross-rules/renderer'

async function main() {
  const report = await runFortune({
    birth: {
      birthDate: '1990-05-15',
      birthTime: '14:30',
      gender: 'male',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      astroTimezone: 'Asia/Seoul',
    },
    queryDate: new Date('2026-04-28T12:00:00Z'),
    skipReturns: false,
  })
  console.log(renderToText(report))
  console.log('\n--- meta themes:', report.themes.map((t) => t.rule.id))
  console.log(
    '--- domain tones:',
    Object.fromEntries(Object.entries(report.byDomain).map(([k, v]) => [k, v.tone])),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
