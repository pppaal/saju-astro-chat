// 종합 진단: 1995-02-09 06:40 서울 男 / query 2026-04-28
// 사주 + 점성 모든 계산 단계 검증
import { calculateSajuData } from '@/lib/Saju/saju'
import { buildSajuNormalizerInput } from '@/lib/fortune/cross-rules/adapters/saju'
import { buildAstroNormalizerInput, dignityOf } from '@/lib/fortune/cross-rules/adapters/astro'

async function main() {
  const queryDate = new Date('2026-04-28T12:00:00+09:00')
  const r = calculateSajuData('1995-02-09', '06:40', 'male', 'solar', 'Asia/Seoul')

  // ── 사주 8자 검증 ────────────────────────────────────────
  const pillars = `${r.pillars.year.heavenlyStem.name}${r.pillars.year.earthlyBranch.name} ${r.pillars.month.heavenlyStem.name}${r.pillars.month.earthlyBranch.name} ${r.pillars.day.heavenlyStem.name}${r.pillars.day.earthlyBranch.name} ${r.pillars.time.heavenlyStem.name}${r.pillars.time.earthlyBranch.name}`
  console.log('[8자]', pillars)
  console.log('   (참고: 만세력 표준 = 乙亥 戊寅 辛未 辛卯)')
  console.log()

  // ── 세운 ────────────────────────────────────────────────
  const annualThis = (r.unse.annual ?? []).find((a) => a.year === 2026)
  console.log('[세운] 2026년:', annualThis ? `${annualThis.heavenlyStem}${annualThis.earthlyBranch}` : '(missing)', '/ 십성:', annualThis?.sibsin)
  console.log('   (참고: 2026 = 60갑자 32 = 丙午)')
  console.log()

  // ── 월운 ────────────────────────────────────────────────
  const monthlyApr = (r.unse.monthly ?? []).find((m: { year?: number; month?: number; heavenlyStem?: string; earthlyBranch?: string; sibsin?: { cheon: string } }) => m.year === 2026 && m.month === 4)
  console.log('[월운] 2026-04:', monthlyApr ? `${monthlyApr.heavenlyStem}${monthlyApr.earthlyBranch}` : '(missing)', '/ 십성:', monthlyApr?.sibsin)
  console.log()

  // ── 일진 (2026-04-28) ───────────────────────────────────
  const sajuInput = buildSajuNormalizerInput({
    birthDate: '1995-02-09', birthTime: '06:40', gender: 'male',
    timezone: 'Asia/Seoul', queryDate,
  })
  console.log('[일진] 2026-04-28:', sajuInput.currentIljin
    ? `${sajuInput.currentIljin.heavenlyStem}${sajuInput.currentIljin.earthlyBranch} / 십성=${sajuInput.currentIljin.sibsin?.cheon}`
    : '(missing)')
  console.log()

  // ── 자연관계 (natal relations) ──────────────────────────
  console.log('[원국 합·충·형 관계]')
  for (const rel of (sajuInput.natalRelations ?? []).slice(0, 12)) {
    console.log(`   ${rel.kind}: ${rel.detail ?? '-'} (${rel.pillars.join(',')})`)
  }
  console.log()

  // ── 점성 차트 ───────────────────────────────────────────
  const astroInput = await buildAstroNormalizerInput({
    year: 1995, month: 2, date: 9, hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
    queryDate, includeSolarReturn: false, includeLunarReturn: false, includeProgression: false, includeFixedStars: false,
  })
  console.log('[점성] natal positions:')
  for (const p of astroInput.natal.planets) {
    if (['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].includes(p.name)) {
      const dig = dignityOf(p.name, p.sign)
      console.log(`   ${p.name.padEnd(8)}: ${p.sign} ${p.house}H · ${dig}`)
    }
  }
  console.log(`   ASC: ${astroInput.natal.ascendant.sign}  / MC: ${astroInput.natal.mc.sign}`)
  console.log()

  // ── Sect ────────────────────────────────────────────────
  const sun = astroInput.natal.planets.find((p) => p.name === 'Sun')
  console.log('[Sect]', astroInput.extras?.sect, '/ Sun house:', sun?.house, '(낮 = Sun in 7-12, 밤 = 1-6)')
  // Birth 06:40 — should be 밤차트 (Sun below horizon yet — depends on latitude/season)
  console.log('   1995-02-09 06:40 서울에서 일출은 ~07:25. Sun이 horizon 아래 → 밤차트 expected')
  console.log()

  // ── Lot of Fortune / Spirit ────────────────────────────
  console.log('[Lots]')
  console.log('   Fortune:', astroInput.extras?.lotOfFortune, '(formula: ASC + Moon - Sun [day] / ASC + Sun - Moon [night])')
  console.log('   Spirit :', astroInput.extras?.lotOfSpirit)
  console.log()

  // ── ZR ──────────────────────────────────────────────────
  console.log('[ZR]', astroInput.extras?.zodiacalReleasing)
  console.log()

  // ── Profection ──────────────────────────────────────────
  console.log('[Profection] house:', astroInput.profectionHouse, '/ ruler:', astroInput.extras?.profectionRuler)
  console.log('   (1995-02-09 → 2026-04-28: 만 31세 → 31 % 12 + 1 = 8궁)')
  console.log()

  // ── Accidental dignity ─────────────────────────────────
  console.log('[Accidental dignity]')
  for (const a of (astroInput.extras?.accidentals ?? []).slice(0, 7)) {
    console.log(`   ${a.planet.padEnd(8)}: ${a.tier} (score ${a.score}) — ${a.reasons.join(', ')}`)
  }
  console.log()

  // ── Combust ─────────────────────────────────────────────
  console.log('[Combust state]')
  for (const c of astroInput.extras?.combustState ?? []) {
    if (c.state !== 'free') console.log(`   ${c.planet.padEnd(8)}: ${c.state} (orb ${c.orb.toFixed(2)}°)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
