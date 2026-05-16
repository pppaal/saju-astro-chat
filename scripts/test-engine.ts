import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'

async function main() {
  console.log('=== Calendar Engine — Live Run ===\n')

  const natal = await buildNatalContext({
    birthDate: '1993-08-15',
    birthTime: '14:30',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })

  console.log('Natal context:')
  console.log('  사주 일간:', natal.saju.dayMaster.name)
  console.log('  강약:', natal.saju.strength)
  console.log('  용신:', natal.saju.yongsin.primary, '(보조:', natal.saju.yongsin.secondary ?? '-', ')')
  console.log('  대운 list:', natal.saju.daeun.length, '개')
  console.log('  점성 sect:', natal.astro.sect, '\n')

  const cells = await buildCalendar(natal, {
    start: '2026-05-01T00:00:00.000Z',
    end: '2026-05-31T23:59:59.999Z',
    granularity: 'day',
  })

  console.log('=== Calendar 빌드 결과 ===')
  console.log('  총 셀:', cells.length)
  console.log('  총 활성 신호:', cells.reduce((s, c) => s + c.signals.length, 0))
  console.log('  매칭 패턴 총:', cells.reduce((s, c) => s + c.matchedPatterns.length, 0))

  const scores = cells.map((c) => c.derivedScore)
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  console.log('  점수 분포: min', Math.min(...scores), '· avg', avg, '· max', Math.max(...scores))

  console.log('\n=== 매칭 패턴 검출된 날 ===')
  const withPatterns = cells.filter((c) => c.matchedPatterns.length > 0)
  if (withPatterns.length === 0) console.log('  (없음)')
  for (const c of withPatterns) {
    const date = c.datetime.slice(0, 10)
    const patterns = c.matchedPatterns.map((p) => `${p.name}(${p.strength})`).join(', ')
    console.log(`  ${date}  score=${c.derivedScore}  ★ ${patterns}`)
  }

  // 신호 source/kind 분포
  console.log('\n=== 신호 분포 ===')
  const allSig = cells.flatMap((c) => c.signals)
  const bySource = allSig.reduce((a, s) => { a[s.source] = (a[s.source] || 0) + 1; return a }, {} as Record<string, number>)
  const byKind = allSig.reduce((a, s) => { a[s.kind] = (a[s.kind] || 0) + 1; return a }, {} as Record<string, number>)
  console.log('  source:', bySource)
  console.log('  kind:', byKind)

  console.log('\n=== TOP 3 점수 셀 상세 ===')
  const top = [...cells].sort((a, b) => b.derivedScore - a.derivedScore).slice(0, 3)
  for (const c of top) {
    console.log(`\n${c.datetime.slice(0, 10)} — score ${c.derivedScore}`)
    console.log('  themeScores:', JSON.stringify(c.themeScores))
    console.log('  topReasons:')
    for (const r of c.topReasons.slice(0, 5)) console.log('   ', r)
    console.log(`  signals (${c.signals.length}):`)
    for (const s of c.signals.slice(0, 10)) {
      const arrow = s.polarity > 0 ? '↑' : s.polarity < 0 ? '↓' : '·'
      console.log(`    ${arrow} [${s.layer}] [${s.source}] ${s.korean ?? s.name} (pol=${s.polarity}, w=${s.weight.toFixed(2)})`)
    }
  }
}

main().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})
