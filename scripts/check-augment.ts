import { buildCalendarCrossAugment } from '@/lib/destiny-map/destinyCalendar'

async function main() {
  const aug = await buildCalendarCrossAugment(
    {
      birthDate: '1995-02-09', birthTime: '06:40', gender: 'male',
      timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978,
    },
    new Date('2026-04-28T12:00:00+09:00'),
  )
  console.log('=== Calendar Cross Augment ===')
  console.log('통합 테마:', aug.themes.map((t) => t.meaning).join(', ') || '(없음)')
  console.log()
  console.log('도메인:')
  for (const d of aug.domains) {
    console.log(`  ${d.domain.padEnd(8)} : ${d.tone}${d.hasConflict ? ' (양면 있음)' : ''} — top: ${d.topConfirms.map((c) => c.meaning).join(' / ')}`)
  }
  console.log()
  console.log('Context:', JSON.stringify(aug.context, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
