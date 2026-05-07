/**
 * Personal cross inspection — runs the project's actual advanced
 * analyzers (free-report engine) for one concrete birth and prints
 * raw output. Default: 1995-02-09 06:40 Seoul (남).
 *
 * Run: npx tsx scripts/inspect-personal-cross.ts
 */
import { calculateSajuData } from '../src/lib/Saju/saju'
import { STEM_TO_ELEMENT } from '../src/lib/Saju/constants'
import { calculateNatalChart } from '../src/lib/astrology/foundation/astrologyService'

function divider(title: string) {
  console.log('\n' + '='.repeat(64))
  console.log(`  ${title}`)
  console.log('='.repeat(64))
}

function section(title: string) {
  console.log('\n--- ' + title + ' ---')
}

async function main() {
  const birthDate = '1995-02-09'
  const birthTime = '06:40'
  const gender = 'male'
  const tz = 'Asia/Seoul'

  divider('PERSONAL CROSS INSPECTION — full engine pass')
  console.log(`  birth: ${birthDate} ${birthTime} (Seoul, ${gender})`)

  // ---------------------- 1. SAJU base ----------------------
  section('1. 사주 명식 (calculateSajuData)')
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
  console.log(`  日柱: ${ds}${db}  ← 일주`)
  console.log(`  時柱: ${hs}${hb}`)

  const dayMaster = ds
  const dayElement = STEM_TO_ELEMENT[dayMaster as keyof typeof STEM_TO_ELEMENT]

  // ---------------------- 2. Advanced saju ----------------------
  section('2. 고급 사주 (analyzeAdvancedSaju)')
  let advanced: ReturnType<typeof import('../src/lib/Saju/astrologyengine').analyzeAdvancedSaju> | null = null
  try {
    const { analyzeAdvancedSaju } = await import('../src/lib/Saju/astrologyengine')
    advanced = analyzeAdvancedSaju(
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
    console.log(`  강약: ${advanced.strength.level}`)
    console.log(`  격국: ${advanced.geokguk.type}`)
    console.log(`  용신(주): ${advanced.yongsin.primary}`)
    if (advanced.yongsin.secondary) console.log(`  용신(보): ${advanced.yongsin.secondary}`)
    if (advanced.yongsin.unfavorable?.length) {
      console.log(`  기신: ${advanced.yongsin.unfavorable.join('·')}`)
    }
  } catch (err) {
    console.log('  실패:', err instanceof Error ? err.message : err)
  }

  // ---------------------- 3. Natal chart ----------------------
  section('3. 점성 본명 차트 (calculateNatalChart)')
  let natal: Awaited<ReturnType<typeof calculateNatalChart>> | null = null
  try {
    natal = await calculateNatalChart({
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
    console.log(`  Sun:  ${sun?.sign} ${Math.round(sun?.degree ?? 0)}°  (${sun?.house}H)`)
    console.log(`  Moon: ${moon?.sign} ${Math.round(moon?.degree ?? 0)}°  (${moon?.house}H)`)
    console.log(`  ASC:  ${natal.ascendant.sign} ${Math.round(natal.ascendant.degree)}°`)
    console.log(`  MC:   ${natal.mc.sign} ${Math.round(natal.mc.degree)}°`)
    for (const name of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
      const pl = natal.planets.find((x) => x.name === name)
      if (pl) {
        console.log(
          `  ${name.padEnd(8)}: ${pl.sign} ${Math.round(pl.degree)}°  (${pl.house}H)${pl.retrograde ? ' R' : ''}`,
        )
      }
    }
  } catch (err) {
    console.log('  실패:', err instanceof Error ? err.message : err)
  }

  // ---------------------- 4. Build SajuData / AstroData for analyzers ----------------------
  section('4. 분석기 입력 빌드')
  // SajuData shape needed by free-report analyzers.
  // calculateSajuData returns nested objects — flatten to the analyzer's SajuData shape.
  const sajuData: Record<string, unknown> = {
    dayMaster: {
      name: dayMaster,
      heavenlyStem: dayMaster,
      element: p.day.heavenlyStem.element,
      yinYang: p.day.heavenlyStem.yin_yang,
    },
    pillars: {
      year: { stem: ys, branch: yb, sibsin: p.year.heavenlyStem.sibsin },
      month: { stem: ms, branch: mb, sibsin: p.month.heavenlyStem.sibsin },
      day: { stem: ds, branch: db, sibsin: p.day.heavenlyStem.sibsin },
      time: { stem: hs, branch: hb, sibsin: p.time.heavenlyStem.sibsin },
    },
    yearPillar: { stem: ys, branch: yb },
    monthPillar: { stem: ms, branch: mb },
    dayPillar: { stem: ds, branch: db },
    timePillar: { stem: hs, branch: hb },
    fiveElements: sajuResult.fiveElementCounts,
    advancedAnalysis: advanced
      ? {
          geokguk: { name: advanced.geokguk.type, type: advanced.geokguk.type },
          yongsin: {
            element: advanced.yongsin.primary,
            name: advanced.yongsin.primary,
            type: advanced.yongsin.basis,
          },
          extended: { strength: { level: advanced.strength.level } },
        }
      : undefined,
    birthDate,
  }

  const astroData: Record<string, unknown> = natal
    ? {
        planets: natal.planets,
        ascendant: natal.ascendant,
        mc: natal.mc,
        houses: natal.houses,
      }
    : {}

  console.log(`  fiveElements: ${JSON.stringify(sajuResult.fiveElementCounts)}`)

  // ---------------------- 5. RUN ANALYZERS ----------------------
  divider('5. 엔진 분석기 RAW OUTPUT')

  const runners: Array<{ name: string; run: () => Promise<unknown> }> = [
    {
      name: 'getCrossAnalysis (사주↔점성 cross)',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/crossAnalyzer')).getCrossAnalysis(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
    {
      name: 'getStrengthsAndWeaknesses',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/strengthsAnalyzer')).getStrengthsAndWeaknesses(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
    {
      name: 'getPersonalityAnalysis',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/personalityAnalyzer')).getPersonalityAnalysis(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
    {
      name: 'getCareerAnalysis',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/careerAnalyzer')).getCareerAnalysis(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
    {
      name: 'getLoveAnalysis',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/loveAnalyzer')).getLoveAnalysis(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
    {
      name: 'getKarmaAnalysis',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/karmaAnalyzer')).getKarmaAnalysis(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
    {
      name: 'getDestinyAnalysis',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/destinyAnalyzer')).getDestinyAnalysis(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
    {
      name: 'getYongsinAnalysis',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/yongsinAnalyzer')).getYongsinAnalysis(
          sajuData as never,
          'ko',
        ),
    },
    {
      name: 'getSibsinAnalysis',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/sibsinAnalyzer')).getSibsinAnalysis(
          sajuData as never,
          'ko',
        ),
    },
    {
      name: 'getMatrixAnalysis (cross synergy/fusion)',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/matrixAnalyzer')).getMatrixAnalysis(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
    {
      name: 'getCurrentTimingAnalysis',
      run: async () =>
        (await import('../src/components/destiny-map/free-report/analyzers/currentTimingAnalyzer')).getCurrentTimingAnalysis(
          sajuData as never,
          astroData as never,
          'ko',
        ),
    },
  ]

  for (const r of runners) {
    section(r.name)
    try {
      const result = await r.run()
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      console.log('  실패:', err instanceof Error ? err.message : err)
    }
  }

  console.log('\n' + '='.repeat(64))
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
