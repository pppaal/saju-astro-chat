// @ts-nocheck
/**
 * Phase A 검증 — 1995-02-09 06:40 male Seoul.
 * 5 신호 출력:
 *  1) dayJijanggan (jeonggi/junggi/yeogi)
 *  2) advancedAnalysis.geokguk.statusResult
 *  3) zrCurrent (spirit/fortune L1+L2)
 *  4) almutenFiguris (planet + score + scoresByPlanet)
 *  5) lots (7대 Arabic Parts sign/degree/house)
 */

import { buildNatalContext } from '../src/lib/calendar-engine/context/build'

const INPUT = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  gender: 'male' as const,
  latitude: 37.5665,
  longitude: 126.9780,
  timeZone: 'Asia/Seoul',
  calendarType: 'solar' as const,
}

function dim(s: unknown): string {
  return typeof s === 'number' ? s.toFixed(2) : String(s)
}

async function main(): Promise<void> {
  const ctx = await buildNatalContext(INPUT)

  console.log('===============================================================')
  console.log('PHASE A 5신호 — 1995-02-09 06:40 male Seoul')
  console.log('===============================================================')

  // A-1: dayJijanggan
  console.log('\n[A-1] dayJijanggan (본명 일주', ctx.saju.pillars.day.earthlyBranch.name, '지장간 3층)')
  console.log('  jeonggi:', ctx.saju.dayJijanggan.jeonggi)
  console.log('  junggi :', ctx.saju.dayJijanggan.junggi ?? '(없음)')
  console.log('  yeogi  :', ctx.saju.dayJijanggan.yeogi ?? '(없음)')

  // A-2: geokguk.statusResult
  console.log('\n[A-2] advancedAnalysis.geokguk.statusResult')
  const g = ctx.saju.advancedAnalysis?.geokguk
  if (g) {
    console.log('  primary  :', g.primary)
    console.log('  category :', g.category)
    if (g.statusResult) {
      console.log('  status   :', g.statusResult.status)
      console.log('  positive :', g.statusResult.factors.positive.join(' | '))
      console.log('  negative :', g.statusResult.factors.negative.join(' | '))
      console.log('  desc     :', g.statusResult.description)
    } else {
      console.log('  statusResult: (없음)')
    }
  } else {
    console.log('  (geokguk null)')
  }

  // A-3: zrCurrent
  console.log('\n[A-3] zrCurrent')
  const zc = ctx.astro.zrCurrent
  if (zc) {
    for (const lotName of ['spirit', 'fortune'] as const) {
      const lot = zc[lotName]
      console.log(`  ${lotName}:`)
      if (!lot) {
        console.log('    (null)')
        continue
      }
      console.log('    startSign:', lot.startSign)
      if (lot.l1) {
        console.log(
          `    L1: sign=${lot.l1.sign} ruler=${lot.l1.ruler} dur=${lot.l1.durationYears}yr ` +
          `age[${dim(lot.l1.ageStart)}..${dim(lot.l1.ageEnd)}] remain=${dim(lot.l1.remainYears)}yr`
        )
      } else {
        console.log('    L1: (null)')
      }
      if (lot.l2) {
        console.log(
          `    L2: sign=${lot.l2.sign} ruler=${lot.l2.ruler} dur=${dim(lot.l2.durationYears)}yr ` +
          `age[${dim(lot.l2.ageStart)}..${dim(lot.l2.ageEnd)}] remain=${dim(lot.l2.remainYears)}yr`
        )
      }
    }
  } else {
    console.log('  (null)')
  }

  // A-4: almutenFiguris
  console.log('\n[A-4] almutenFiguris')
  const am = ctx.astro.almutenFiguris
  if (am) {
    console.log('  Almuten winner →', am.winner, '(top score=' + (am.winner ? am.scores[am.winner] : 0) + ')')
    if (am.winners.length > 1) {
      console.log('  tied:', am.winners.join(', '))
    }
    console.log('  scores:')
    for (const [p, s] of Object.entries(am.scores)) {
      console.log(`    ${p.padEnd(8)} ${s}`)
    }
    console.log('  points:')
    for (const b of am.points) {
      const rulers = Object.entries(b.rulers)
        .filter(([, r]) => r !== null)
        .map(([tier, r]) => `${tier}=${r}`)
        .join(' ')
      console.log(`    ${b.point.padEnd(10)} ${b.sign} ${dim(b.degree)}deg => ${rulers}`)
    }
  } else {
    console.log('  (null)')
  }

  // A-5: lots
  console.log('\n[A-5] lots (Arabic Parts 7개)')
  console.log('  sect:', ctx.astro.sect)
  for (const l of ctx.astro.lots) {
    console.log(
      `  ${l.name.padEnd(10)} ${l.sign} ${dim(l.degreeInSign)}deg ` +
      `house=${l.house} formula="${l.formula}"`
    )
  }
}

main().catch((err) => {
  console.error('dump-phase-a-signals failed:', err)
  process.exitCode = 1
})
