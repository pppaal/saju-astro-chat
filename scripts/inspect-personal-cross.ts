/**
 * Personal cross inspection — show the actual engine output for one
 * concrete birth (1995-02-09 06:40 Seoul) so we can compare what each
 * engine path computes for the same person.
 *
 * Run: npx tsx scripts/inspect-personal-cross.ts
 */
import { calculateSajuData } from '../src/lib/Saju/saju'
import { STEM_TO_ELEMENT } from '../src/lib/Saju/constants'

async function main() {
  const birthDate = '1995-02-09'
  const birthTime = '06:40'
  const gender = 'male'
  const tz = 'Asia/Seoul'

  console.log('='.repeat(60))
  console.log('  PERSONAL CROSS INSPECTION')
  console.log('  birth:', birthDate, birthTime, '(Seoul,', gender + ')')
  console.log('='.repeat(60))

  // ------------------------------------------------------------------
  // 1) Saju pillars
  // ------------------------------------------------------------------
  console.log('\n--- 1. SAJU PILLARS ---')
  const sajuResult = calculateSajuData(birthDate, birthTime, gender, 'solar', tz)
  const p = sajuResult.pillars
  const ys = p.year.heavenlyStem.name
  const yb = p.year.earthlyBranch.name
  const ms = p.month.heavenlyStem.name
  const mb = p.month.earthlyBranch.name
  const ds = p.day.heavenlyStem.name
  const db = p.day.earthlyBranch.name
  const hs = p.time.heavenlyStem.name
  const hb = p.time.earthlyBranch.name
  console.log(`  年柱: ${ys}${yb}`)
  console.log(`  月柱: ${ms}${mb}`)
  console.log(`  日柱: ${ds}${db}  ← 일주 (본명 정체성)`)
  console.log(`  時柱: ${hs}${hb}`)
  const dayMaster = ds
  const dayElement = STEM_TO_ELEMENT[dayMaster as keyof typeof STEM_TO_ELEMENT]
  console.log(`  → 일간: ${dayMaster} (${dayElement}, ${p.day.heavenlyStem.yin_yang}, 십신=${p.day.heavenlyStem.sibsin})`)
  console.log(`  → 일지: ${db} (${p.day.earthlyBranch.element}, 십신=${p.day.earthlyBranch.sibsin})`)

  // ------------------------------------------------------------------
  // 2) Advanced saju — 강약/격국/용신/기신
  // ------------------------------------------------------------------
  console.log('\n--- 2. ADVANCED SAJU (강약 / 격국 / 용신) ---')
  try {
    const { analyzeAdvancedSaju } = await import('../src/lib/Saju/astrologyengine')
    const adv = analyzeAdvancedSaju(
      {
        name: dayMaster,
        element: dayElement || 'earth',
        yin_yang: ['甲', '丙', '戊', '庚', '壬'].includes(dayMaster) ? '양' : '음',
      } as Parameters<typeof analyzeAdvancedSaju>[0],
      {
        yearPillar: sajuResult.yearPillar,
        monthPillar: sajuResult.monthPillar,
        dayPillar: sajuResult.dayPillar,
        timePillar: sajuResult.timePillar,
      } as Parameters<typeof analyzeAdvancedSaju>[1],
    )
    console.log(`  강약: ${adv.strength.level}`)
    console.log(`  격국: ${adv.geokguk.type}`)
    console.log(`  용신(primary): ${adv.yongsin.primary}`)
    if (adv.yongsin.secondary) console.log(`  용신(secondary): ${adv.yongsin.secondary}`)
    if (adv.yongsin.unfavorable) console.log(`  기신: ${adv.yongsin.unfavorable.join(', ')}`)
  } catch (err) {
    console.log('  (advanced saju 실패:', err instanceof Error ? err.message : err, ')')
  }

  // ------------------------------------------------------------------
  // 3) Astrology — natal chart
  // ------------------------------------------------------------------
  console.log('\n--- 3. NATAL CHART (점성) ---')
  try {
    const { calculateNatalChart } = await import('../src/lib/astrology/foundation/astrologyService')
    const natal = await calculateNatalChart({
      year: 1995,
      month: 2,
      date: 9,
      hour: 6,
      minute: 40,
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: tz,
    })
    const sun = natal.planets.find((pl) => pl.name === 'Sun')
    const moon = natal.planets.find((pl) => pl.name === 'Moon')
    const asc = natal.ascendant
    const mc = natal.mc
    console.log(`  Sun:  ${sun?.sign} ${Math.round(sun?.degree ?? 0)}°  (${sun?.house}H)`)
    console.log(`  Moon: ${moon?.sign} ${Math.round(moon?.degree ?? 0)}°  (${moon?.house}H)`)
    console.log(`  ASC:  ${asc?.sign} ${Math.round(asc?.degree ?? 0)}°  ← 외형/페르소나`)
    console.log(`  MC:   ${mc?.sign} ${Math.round(mc?.degree ?? 0)}°  ← 커리어 정점`)

    // Major planets summary
    const majors = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
    for (const name of majors) {
      const pl = natal.planets.find((x) => x.name === name)
      if (pl) {
        console.log(
          `  ${name.padEnd(8)}: ${pl.sign} ${Math.round(pl.degree)}°  (${pl.house}H)${pl.retrograde ? ' R' : ''}`,
        )
      }
    }
  } catch (err) {
    console.log('  (natal chart 실패:', err instanceof Error ? err.message : err, ')')
  }

  // ------------------------------------------------------------------
  // 4) TODAY's saju×astro CROSS — using calendar yearly engine
  // ------------------------------------------------------------------
  console.log('\n--- 4. 오늘의 CROSS (yearlyDates 캘린더 엔진) ---')
  try {
    const { calculateYearlyImportantDates } = await import('../src/app/api/calendar/lib/yearlyDates')
    const today = new Date()
    const targetKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Build minimal profiles for the engine
    type SajuProfile = Parameters<typeof calculateYearlyImportantDates>[1]
    type AstroProfile = Parameters<typeof calculateYearlyImportantDates>[2]

    const sajuProfile: SajuProfile = {
      dayMaster,
      dayMasterElement: dayElement || 'earth',
      dayBranch: db,
      yearBranch: yb,
      birthYear: 1995,
      daeunCycles: sajuResult.daeWoon?.cycles ?? [],
      pillars: {
        year: { stem: ys, branch: yb },
        month: { stem: ms, branch: mb },
        day: { stem: ds, branch: db },
        time: { stem: hs, branch: hb },
      },
    } as unknown as SajuProfile

    const astroProfile: AstroProfile = {
      sunSign: 'Aquarius',
      sunElement: 'air',
    } as unknown as AstroProfile

    const dates = calculateYearlyImportantDates(today.getFullYear(), sajuProfile, astroProfile, {
      locale: 'ko',
      birthDate,
    })
    const todayDate = dates.find((d) => d.date === targetKey)
    if (todayDate) {
      console.log(`  날짜: ${todayDate.date}`)
      console.log(`  총점: ${todayDate.score}/100  (등급 ${todayDate.grade})`)
      const sb = (todayDate as unknown as { scoreBreakdown?: Record<string, number> }).scoreBreakdown
      if (sb) {
        console.log(`  사주축: ${sb.sajuAxis}/100`)
        console.log(`  점성축: ${sb.astroAxis}/100`)
        console.log(`  axis 합치: ${sb.axisAgreement}`)
        console.log('  세부 (가중치 순):')
        console.log(`    engine     : ${sb.engine}`)
        console.log(`    cycle      : ${sb.cycle}`)
        console.log(`    transit    : ${sb.transit}`)
        console.log(`    cross      : ${sb.cross}`)
        console.log(`    yongsin    : ${sb.yongsin}`)
        console.log(`    matrix     : ${sb.matrix}`)
        console.log(`    lunarRetro : ${sb.lunarRetro}`)
      }
      console.log(`  카테고리: ${todayDate.categories.join(', ')}`)
      console.log(`  요약: ${todayDate.summary || todayDate.description?.slice(0, 100)}`)
    } else {
      console.log('  오늘 데이터 못 찾음 (year out of range?)')
    }
  } catch (err) {
    console.log('  (yearly engine 실패:', err instanceof Error ? err.message : err, ')')
    if (err instanceof Error && err.stack) console.log(err.stack.split('\n').slice(0, 5).join('\n'))
  }

  console.log('\n' + '='.repeat(60))
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
