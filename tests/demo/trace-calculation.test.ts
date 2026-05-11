import { it } from 'vitest'
import { calculateSajuData } from '@/lib/saju/saju'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { getSajuLayersForDate } from '@/lib/saju/sajuLayers'
import { getAstroLayersForDate } from '@/lib/astrology/astroLayers'
import { SAJU_THEME_FN, ASTRO_THEME_FN } from '@/lib/fusion/crosses/themeFunctions'
import type { SimpleSajuPillars } from '@/lib/saju/themes/types'
import type { NatalInput } from '@/lib/astrology/foundation/types'

it('계산 추적: 2026-05-15 연애 한 칸', async () => {
  // 1. natal
  const sajuRes = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')
  const p = sajuRes.pillars
  const pillars: SimpleSajuPillars = {
    year:  { stem: p.year.heavenlyStem.name,  branch: p.year.earthlyBranch.name },
    month: { stem: p.month.heavenlyStem.name, branch: p.month.earthlyBranch.name },
    day:   { stem: p.day.heavenlyStem.name,   branch: p.day.earthlyBranch.name },
    hour:  { stem: p.time.heavenlyStem.name,  branch: p.time.earthlyBranch.name },
  }
  const natalInput: NatalInput = {
    year: 1995, month: 2, date: 9, hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  }
  const natalData = await calculateNatalChart(natalInput)
  const natal = toChart(natalData)

  console.log('\n================================================')
  console.log('대상: 1995-02-09 06:40 출생 + 2026-05-15 연애')
  console.log('================================================')

  console.log('\n[STEP 1] natal 4기둥')
  console.log(`  ${pillars.year.stem}${pillars.year.branch} / ${pillars.month.stem}${pillars.month.branch} / ${pillars.day.stem}${pillars.day.branch} / ${pillars.hour.stem}${pillars.hour.branch}`)

  // 2. 그 날 사주 layer
  const sajuLayers = getSajuLayersForDate({
    dayMaster: pillars.day.stem,
    daeunList: sajuRes.daeWoon.list.map(d => ({ stem: d.heavenlyStem, branch: d.earthlyBranch, startAge: d.age })),
    birthYear: 1995, age: 31,
    year: 2026, month: 5, day: 15, hour: 12,
  })

  console.log('\n[STEP 2] 사주 timing layers (그 날)')
  console.log(`  대운: ${sajuLayers.decadal?.summary ?? '(없음)'}`)
  console.log(`  세운: ${sajuLayers.yearly?.summary ?? '(없음)'}`)
  console.log(`  월운: ${sajuLayers.monthly?.summary ?? '(없음)'}`)
  console.log(`  일진: ${sajuLayers.daily?.summary ?? '(없음)'}`)
  console.log(`  시진: ${sajuLayers.hourly?.summary ?? '(없음)'}`)

  // 3. 그 날 점성 layer (natalInput 없이 → daily transit 없이 빠르게)
  const astroLayers = await getAstroLayersForDate({
    natal, age: 31, year: 2026, month: 5, day: 15, hour: 12,
  })

  console.log('\n[STEP 3] 점성 timing layers (그 날, daily transit 제외)')
  console.log(`  decadal (ZR): ${astroLayers.decadal?.summary ?? '(없음)'}`)
  console.log(`  yearly: ${astroLayers.yearly?.map(y => y.summary).join(' | ') ?? '(없음)'}`)
  console.log(`  monthly: ${astroLayers.monthly?.map(m => m.summary).join(' | ') ?? '(없음)'}`)
  console.log(`  hourly: ${astroLayers.hourly?.summary ?? '(없음)'}`)
  console.log(`  lots: ${astroLayers.lots?.summary ?? '(없음)'}`)

  // 4. 연애 테마 분석
  const sajuLove = SAJU_THEME_FN.love(pillars)
  const astroLove = ASTRO_THEME_FN.love(natal)

  console.log('\n[STEP 4] 연애 테마 factor 들 + tone')
  console.log('\n  사주 love analyzer:')
  console.log(`    summary: ${sajuLove.summary}`)
  for (const f of sajuLove.factors) {
    console.log(`    [${f.tone.padEnd(10)}] ${f.source}: ${f.meaning.slice(0, 60)}`)
  }
  console.log('\n  점성 love analyzer:')
  console.log(`    summary: ${astroLove.summary}`)
  for (const f of astroLove.factors) {
    console.log(`    [${f.tone.padEnd(10)}] ${f.source}: ${f.meaning.slice(0, 60)}`)
  }

  // 5. timing layer 의 highlights 들 (tone 들)
  console.log('\n[STEP 5] 사주 timing highlights tone 분포')
  const sajuTimings = [sajuLayers.decadal, sajuLayers.yearly, sajuLayers.monthly, sajuLayers.daily, sajuLayers.hourly].filter(Boolean) as NonNullable<typeof sajuLayers.decadal>[]
  const sajuToneCounts: Record<string, number> = {}
  for (const t of sajuTimings) {
    for (const h of t.highlights) {
      sajuToneCounts[h.tone] = (sajuToneCounts[h.tone] ?? 0) + 1
    }
  }
  console.log(`  ${JSON.stringify(sajuToneCounts)}`)

  console.log('\n  점성 timing highlights tone 분포')
  const astroTimings = [astroLayers.decadal, astroLayers.lifetime, astroLayers.lots, ...(astroLayers.yearly ?? []), ...(astroLayers.monthly ?? []), ...(astroLayers.daily ?? []), astroLayers.hourly].filter(Boolean) as NonNullable<typeof astroLayers.decadal>[]
  const astroToneCounts: Record<string, number> = {}
  for (const t of astroTimings) {
    for (const h of t.highlights) {
      astroToneCounts[h.tone] = (astroToneCounts[h.tone] ?? 0) + 1
    }
  }
  console.log(`  ${JSON.stringify(astroToneCounts)}`)

  // 6. 다수결
  console.log('\n[STEP 6] 다수결 합산')
  const sajuFactorTones = [...sajuLove.factors.map(f => f.tone), ...sajuTimings.flatMap(t => t.highlights.map(h => h.tone))]
  const astroFactorTones = [...astroLove.factors.map(f => f.tone), ...astroTimings.flatMap(t => t.highlights.map(h => h.tone))]
  const countTones = (arr: string[]) => {
    const c: Record<string, number> = {}
    for (const x of arr) c[x] = (c[x] ?? 0) + 1
    return c
  }
  const sajuCounts = countTones(sajuFactorTones)
  const astroCounts = countTones(astroFactorTones)
  console.log(`  사주 합산: ${JSON.stringify(sajuCounts)}  (총 ${sajuFactorTones.length}개)`)
  console.log(`  점성 합산: ${JSON.stringify(astroCounts)}  (총 ${astroFactorTones.length}개)`)

  // 7. 최다 tone
  const winner = (c: Record<string, number>) => Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]
  const sajuTone = winner(sajuCounts)
  const astroTone = winner(astroCounts)
  console.log(`\n  사주 dominantTone = ${sajuTone}`)
  console.log(`  점성 dominantTone = ${astroTone}`)

  // 8. combineTones 룰
  console.log('\n[STEP 7] combineTones 룰 적용')
  console.log(`  사주(${sajuTone}) × 점성(${astroTone}) → ?`)
  console.log(`  룰:`)
  console.log(`    p+p → strong-positive (1.00)`)
  console.log(`    c+c → strong-negative (0.00)`)
  console.log(`    p+c 또는 c+p → mixed   (0.50)`)
  console.log(`    p+n 또는 n+p → positive(0.70)`)
  console.log(`    c+n 또는 n+c → cautious(0.25)`)
  console.log(`    n+n → neutral         (0.40)`)

  let final: string
  if (sajuTone === astroTone && sajuTone === 'positive') final = 'strong-positive (1.00)'
  else if (sajuTone === astroTone && sajuTone === 'cautious') final = 'strong-negative (0.00)'
  else if ((sajuTone === 'positive' && astroTone === 'cautious') || (sajuTone === 'cautious' && astroTone === 'positive')) final = 'mixed (0.50)'
  else if (sajuTone === 'positive' || astroTone === 'positive') final = 'positive (0.70)'
  else if (sajuTone === 'cautious' || astroTone === 'cautious') final = 'cautious (0.25)'
  else if (sajuTone === 'mixed' || astroTone === 'mixed') final = 'mixed (0.50)'
  else final = 'neutral (0.40)'

  console.log(`\n  → 최종 결과: ${final}`)
  console.log('\n================================================')
}, 30000)
