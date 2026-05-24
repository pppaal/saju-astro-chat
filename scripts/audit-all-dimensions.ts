// 년·월·일·시 변화에 따라 점수·해석이 동적인지 audit.
import { calculateSajuData } from '../src/lib/saju/saju'
import { buildNatalContext } from '../src/lib/calendar-engine/context/build'
import { buildCalendar } from '../src/lib/calendar-engine'
import { buildInterpretation } from '../src/lib/calendar-engine/interpretation/matcher'

const BIRTH = {
  birthDate: '1995-02-09', birthTime: '06:40', gender: 'male' as const,
  latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
}

function narrSection(interp: any, section: string): string {
  return interp.sections.find((s: any) => s.section === section)?.text ?? ''
}

async function buildAt(natal: any, date: string) {
  const cells = await buildCalendar(natal, {
    start: `${date}T00:00:00.000Z`,
    end: `${date}T23:59:59.000Z`,
    granularity: 'day',
  }, { includeEvidence: true })
  const interp = buildInterpretation({ natal, cells, scope: 'monthly' })
  if (interp.themeScores) {
    for (const c of cells) c.themeScores = { ...c.themeScores, ...interp.themeScores }
  }
  return { cells, interp }
}

async function main() {
  const saju = calculateSajuData(BIRTH.birthDate, BIRTH.birthTime, BIRTH.gender, 'solar', BIRTH.timeZone)
  const natal = await buildNatalContext(BIRTH, { saju })
  console.log(`사주: ${natal.saju.dayMaster.name} 신약 / 용신 화\n`)

  // ─── 1. 년 변화 (3년) ───
  console.log('━━━ 년도 변화 (2024/2025/2026/2027 각 5/15) ━━━')
  for (const y of [2024, 2025, 2026, 2027]) {
    const { cells, interp } = await buildAt(natal, `${y}-05-15`)
    const score = cells[0].derivedScore
    const seun = narrSection(interp, 'seun').slice(0, 80)
    console.log(`  ${y}-05-15: ${score}점 / 세운: ${seun}`)
  }

  // ─── 2. 월 변화 (1년 12개월, 매월 15일) ───
  console.log('\n━━━ 월 변화 (2026년 1-12월 15일) ━━━')
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0')
    const { cells, interp } = await buildAt(natal, `2026-${mm}-15`)
    const score = cells[0].derivedScore
    const wolun = narrSection(interp, 'wolun').slice(0, 60)
    console.log(`  2026-${mm}-15: ${score}점 / 월운: ${wolun}`)
  }

  // ─── 3. 일 변화 (2026-05, 1·5·10·15·20·25·30일) ───
  console.log('\n━━━ 일 변화 (2026-05의 7일) ━━━')
  for (const d of [1, 5, 10, 15, 20, 25, 30]) {
    const dd = String(d).padStart(2, '0')
    const { cells, interp } = await buildAt(natal, `2026-05-${dd}`)
    const score = cells[0].derivedScore
    const ts = interp.themeScores ?? {}
    console.log(`  2026-05-${dd}: ${score}점 / love ${ts.love} money ${ts.money} career ${ts.career} health ${ts.health} growth ${ts.growth}`)
  }

  // ─── 4. 시 변화 (오늘 4시간 단위) ───
  console.log('\n━━━ 시 변화 (2026-05-18, 시간대별 시진 신호) ━━━')
  const { cells: dayCells } = await buildAt(natal, '2026-05-18')
  if (dayCells[0]) {
    const hourly = dayCells[0].signals.filter((s: any) => s.layer === 'hourly')
    const seen = new Set<string>()
    for (const s of hourly) {
      const hb = s.evidence?.detail?.hourBranch as string
      if (!hb || seen.has(hb)) continue
      seen.add(hb)
      const window = s.evidence?.detail?.windowLabel ?? ''
      const narr = s.evidence?.detail?.narrative ?? ''
      console.log(`  ${window} polarity=${s.polarity} / ${narr.slice(0, 50)}`)
    }
  }
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1) })
