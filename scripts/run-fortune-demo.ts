import { runFortune } from '@/lib/fortune/cross-rules'
import { renderToText } from '@/lib/fortune/cross-rules/renderer'

async function main() {
  // 1995.02.09 06:40 (서울, 양력 가정 / 성별 미지정 — 남성으로 가정)
  const report = await runFortune({
    birth: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      astroTimezone: 'Asia/Seoul',
    },
    queryDate: new Date('2026-04-28T12:00:00+09:00'),
    skipReturns: false,
  })

  console.log(renderToText(report))
  console.log('\n──────────────────────────────────────────────────')
  console.log('통합 테마:', report.themes.map((t) => `[${t.rule.meaning}]`).join(' ') || '(없음)')
  console.log('도메인 톤:',
    Object.fromEntries(Object.entries(report.byDomain).map(([k, v]) => [k, v.tone])))
  console.log('전체 confirm 룰:',
    Object.values(report.byDomain).reduce((acc, b) => acc + b.confirms.length, 0))
  console.log('전체 conflict 룰:',
    Object.values(report.byDomain).reduce((acc, b) => acc + b.conflicts.length, 0))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
