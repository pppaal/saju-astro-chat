// 3개월 audit — 4월/5월/6월 점수·해석 변화 패턴 + 문제점 찾기.
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { buildInterpretation } from '../src/lib/calendar-engine/interpretation/matcher'

const BIRTH = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
}

const MONTHS = ['2026-04', '2026-05', '2026-06']

async function auditMonth(natal: any, monthStr: string) {
  const start = `${monthStr}-01T00:00:00.000Z`
  const end = `${monthStr}-31T23:59:59.000Z`
  const cells = await buildCalendar(natal, { start, end, granularity: 'day' }, { includeEvidence: true })
  const interp = buildInterpretation({ natal, cells, scope: 'monthly' })

  // overwrite cell themeScores like API does
  if (interp.themeScores) {
    for (const c of cells) c.themeScores = { ...c.themeScores, ...interp.themeScores }
  }

  const ranked = [...cells].sort((a, b) => b.derivedScore - a.derivedScore)
  const scores = cells.map((c) => c.derivedScore)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const top100 = scores.filter((s) => s === 100).length

  console.log(`\n━━━ ${monthStr} (${cells.length}일) ━━━`)
  console.log(`점수 분포: min ${min} / avg ${avg} / max ${max} (100점 동률: ${top100}일)`)
  console.log(`themeScores: love ${interp.themeScores?.love} / money ${interp.themeScores?.money} / career ${interp.themeScores?.career} / health ${interp.themeScores?.health} / growth ${interp.themeScores?.growth}`)

  console.log('🌟 좋은 날 TOP 3:')
  for (const c of ranked.slice(0, 3)) {
    const top = c.topReasons?.slice(0, 2).join(' · ') ?? ''
    console.log(`  ${c.datetime.slice(0, 10)}  ${c.derivedScore}점  ${top}`)
  }

  console.log('⚠️ 주의 날 TOP 3:')
  for (const c of ranked.slice(-3).reverse()) {
    const cau = c.cautions?.slice(0, 2).join(' · ') ?? '(cautions 비어있음)'
    console.log(`  ${c.datetime.slice(0, 10)}  ${c.derivedScore}점  ${cau}`)
  }

  // narrative 첫 부분 (대운/세운/월운만)
  const monthNarr = interp.sections.filter((s) =>
    ['daeun', 'seun', 'wolun'].includes(s.section)
  )
  console.log('📝 narrative 헤더:')
  for (const s of monthNarr) {
    console.log(`  [${s.title}] ${s.text.slice(0, 80)}...`)
  }

  return { monthStr, interp, cells, top100, min, max, avg }
}

async function main() {
  const sajuResult = calculateSajuData(
    BIRTH.birthDate, BIRTH.birthTime, BIRTH.gender, 'solar', BIRTH.timeZone,
  )
  const natal = await buildNatalContext(BIRTH, { saju: sajuResult })

  console.log('===== 1995-02-09 06:40 男 — 4·5·6월 audit =====')
  console.log(`일간: ${natal.saju.dayMaster.name} | 신약 | 용신: ${natal.saju.yongsin.primary}`)

  const results = []
  for (const m of MONTHS) {
    results.push(await auditMonth(natal, m))
  }

  // 월별 비교
  console.log('\n━━━ 월별 비교 ━━━')
  console.log('월별 themeScores:')
  for (const r of results) {
    const ts = r.interp.themeScores ?? {}
    console.log(`  ${r.monthStr}: love ${ts.love} | money ${ts.money} | career ${ts.career} | health ${ts.health} | growth ${ts.growth}`)
  }

  console.log('\nnarrative 동일성 검사:')
  const seunTexts = results.map((r) => r.interp.sections.find((s) => s.section === 'seun')?.text ?? '')
  const wolunTexts = results.map((r) => r.interp.sections.find((s) => s.section === 'wolun')?.text ?? '')
  console.log(`  세운(올해) 텍스트 같은지: ${seunTexts.every((t) => t === seunTexts[0]) ? '✓ 모두 동일 (당연 — 같은 해)' : '✗ 달마다 다름!'}`)
  console.log(`  월운 텍스트 같은지: ${wolunTexts.every((t) => t === wolunTexts[0]) ? '⚠ 모두 동일 (다른 달인데 같은 텍스트)' : '✓ 달마다 다름'}`)

  console.log('\n점수 분포 비교:')
  for (const r of results) {
    console.log(`  ${r.monthStr}: min ${r.min} / max ${r.max} / 100점 ${r.top100}일`)
  }
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1) })
