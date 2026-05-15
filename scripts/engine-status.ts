// 엔진 풀 점검 — 한 사용자 / 한 달 / 끝까지 무엇이 만들어지는가
import { buildCalendar } from '@/lib/calendar-engine'
import { buildNatalContext } from '@/lib/calendar-engine/context/build'
import { buildInterpretation } from '@/lib/calendar-engine/interpretation'
import { computeGradeThresholds, getGrade } from '@/components/calendar/scoreGrade'

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  CALENDAR ENGINE 전체 점검')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const input = {
    birthDate: '1993-08-15',
    birthTime: '14:30',
    gender: 'male' as const,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  }
  console.log('\n[INPUT]')
  console.log('  생년월일:', input.birthDate, input.birthTime)
  console.log('  도시:    서울 (37.5665, 126.978)')

  // ───────────────────────────────────
  // STEP 1: 본명 컨텍스트
  // ───────────────────────────────────
  const t1 = Date.now()
  const natal = await buildNatalContext(input)
  console.log('\n[STEP 1] 본명 컨텍스트 빌드  ' + (Date.now() - t1) + 'ms')
  console.log('  사주 일간:    ', natal.saju.dayMaster.name, '(' + natal.saju.dayMaster.element + ')')
  console.log('  강약:         ', natal.saju.strength)
  console.log('  용신:         ', natal.saju.yongsin.primary, '(보조:', natal.saju.yongsin.secondary, ')')
  console.log('  대운 list:    ', natal.saju.daeun.length + '개')
  console.log('  점성 sect:    ', natal.astro.sect)
  console.log('  natalShinsal: ', natal.saju.natalShinsal.length + '개')
  console.log('  natalRelations:', natal.saju.natalRelations.length + '개')

  // ───────────────────────────────────
  // STEP 2: Calendar build (한 달)
  // ───────────────────────────────────
  const t2 = Date.now()
  const cells = await buildCalendar(
    natal,
    { start: '2026-05-01T00:00:00.000Z', end: '2026-05-31T23:59:59.999Z', granularity: 'day' },
    { includeEvidence: true },
  )
  console.log('\n[STEP 2] 캘린더 빌드 (5월 한 달)  ' + (Date.now() - t2) + 'ms')

  // 신호 분포
  const allSig = cells.flatMap((c) => c.signals)
  const bySource = allSig.reduce((a, s) => { a[s.source] = (a[s.source] || 0) + 1; return a }, {} as Record<string, number>)
  const byKind = allSig.reduce((a, s) => { a[s.kind] = (a[s.kind] || 0) + 1; return a }, {} as Record<string, number>)
  console.log('  셀:           ', cells.length + '개')
  console.log('  활성 신호 총:  ', allSig.length + '개')
  console.log('  source 분포:   ', bySource)
  console.log('  kind 분포:')
  for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log('    ', k.padEnd(22), v)
  }

  // 매칭 패턴 통계
  const allPat = cells.flatMap((c) => c.matchedPatterns)
  const patCount = allPat.reduce((a, p) => { a[p.name] = (a[p.name] || 0) + 1; return a }, {} as Record<string, number>)
  console.log('  매칭 패턴 총:  ', allPat.length + '개')
  for (const [n, c] of Object.entries(patCount)) console.log('    ', n.padEnd(22), c)

  // ───────────────────────────────────
  // STEP 3: 점수 분포 + 등급 임계값
  // ───────────────────────────────────
  const scores = cells.map((c) => c.derivedScore)
  const thresholds = computeGradeThresholds(scores)
  const buckets = { lucky: 0, neutral: 0, unlucky: 0 }
  for (const s of scores) buckets[getGrade(s, thresholds).key]++

  console.log('\n[STEP 3] 점수·등급')
  console.log('  점수 분포:    min ' + Math.min(...scores) + ' / avg ' + Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + ' / max ' + Math.max(...scores))
  console.log('  임계값:       길 ≥ ' + thresholds.luckyMin + ' / 흉 ≤ ' + thresholds.unluckyMax)
  console.log('  등급 분포:    길 ' + buckets.lucky + '일 / 평 ' + buckets.neutral + '일 / 흉 ' + buckets.unlucky + '일')

  // ───────────────────────────────────
  // STEP 4: 길일 / 흉일 TOP 3
  // ───────────────────────────────────
  const ranked = [...cells].sort((a, b) => b.derivedScore - a.derivedScore)
  console.log('\n[STEP 4] 길일·흉일 TOP 3')
  console.log('  길일:')
  for (const c of ranked.slice(0, 3)) {
    const date = c.datetime.slice(5, 10)
    const top = [...c.signals].sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)[0]
    console.log(`    ${date}  score=${c.derivedScore}  ${getGrade(c.derivedScore, thresholds).label}  → ${top?.korean ?? top?.name ?? ''}`)
  }
  console.log('  흉일:')
  for (const c of ranked.slice(-3).reverse()) {
    const date = c.datetime.slice(5, 10)
    const top = [...c.signals].sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)[0]
    console.log(`    ${date}  score=${c.derivedScore}  ${getGrade(c.derivedScore, thresholds).label}  → ${top?.korean ?? top?.name ?? ''}`)
  }

  // ───────────────────────────────────
  // STEP 5: Narrative 해석
  // ───────────────────────────────────
  const t5 = Date.now()
  const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
  console.log('\n[STEP 5] Narrative 해석  ' + (Date.now() - t5) + 'ms')
  console.log('  매칭 룰:      ', interp.matchedRuleIds.length + '개')
  console.log('  Sections:     ', interp.sections.map((s) => s.section).join(', '))
  console.log('  Narrative 길이:', interp.narrative.length + ' chars')

  console.log('\n  ─── 생성된 narrative ───')
  console.log(interp.narrative.split('\n').map((l) => '    ' + l).join('\n'))

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  요약: 총 ' + (Date.now() - t1) + 'ms 로 1 사용자 5월치 완성')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
