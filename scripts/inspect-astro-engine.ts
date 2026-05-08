/**
 * 천기력 엔진 raw output — 1995-02-09 06:40 Seoul (37.5665, 126.978).
 *
 * Run: npx tsx scripts/inspect-astro-engine.ts
 */
import { runAstroEngine } from '../src/lib/astro/engine'

async function main() {
  const out = await runAstroEngine({
    birthDate: '1995-02-09',
    birthTime: '06:40',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  })

  console.log('='.repeat(72))
  console.log(`  ${out.engine.name} 엔진 v${out.engine.version} — ${out.engine.tagline}`)
  console.log(`  (${out.engine.tradition} · ${out.engine.dimensions}차원)`)
  console.log('  대상: 1995-02-09 06:40 서울 (37.5665, 126.978)')
  console.log('='.repeat(72))

  console.log('\n## 1. Big Three')
  const b = out.bigThree
  console.log(`  태양 (정체성): ${b.sun.sign} ${Math.round(b.sun.degree)}° (${b.sun.house}H)`)
  console.log(`  달   (감정):   ${b.moon.sign} ${Math.round(b.moon.degree)}° (${b.moon.house}H)`)
  console.log(`  ASC  (외모):   ${b.ascendant.sign} ${Math.round(b.ascendant.degree)}°`)
  console.log(`  MC   (직업):   ${b.mc.sign} ${Math.round(b.mc.degree)}°`)

  console.log('\n## 2. 행성 위치 (10행성)')
  for (const p of out.natal.planets) {
    const r = p.retrograde ? ' R' : ''
    console.log(`  ${p.name.padEnd(8)}: ${p.sign} ${Math.round(p.degree)}° (${p.house}H)${r}`)
  }

  console.log('\n## 3. 4원소 분포')
  const eb = out.elementBalance
  console.log(`  불 ${eb.fire}% / 흙 ${eb.earth}% / 바람 ${eb.air}% / 물 ${eb.water}%`)
  console.log(`  ⭐ 우세: ${eb.dominant} / 약점: ${eb.weakest}`)

  console.log('\n## 4. 3양태 분포')
  const mb = out.modalityBalance
  console.log(`  활동 ${mb.cardinal}% / 고정 ${mb.fixed}% / 변통 ${mb.mutable}%`)
  console.log(`  ⭐ 우세: ${mb.dominant}`)

  console.log('\n## 5. 본명 어스펙트 (top 8)')
  for (const a of out.natalAspects.slice(0, 8)) {
    console.log(`  ${a.from.name} ${a.type} ${a.to.name}  (orb ${a.orb.toFixed(1)}°)`)
  }

  console.log('\n## 6. 현재 트랜짓 (본명 영향, top 10)')
  for (const t of out.current.transitToNatal.slice(0, 10)) {
    console.log(`  T.${t.transitPlanet} ${t.type} N.${t.natalPoint}  (orb ${t.orb.toFixed(1)}°)`)
  }

  console.log('\n## 7. 주요 트랜짓 (외행성)')
  for (const t of out.current.majorTransits.slice(0, 8)) {
    console.log(`  T.${t.transitPlanet} ${t.type} N.${t.natalPoint}  (orb ${t.orb.toFixed(1)}°)`)
  }

  console.log('\n## 8. 프로그레션')
  if (out.progressions) {
    const psun = out.progressions.progressedChart.planets.find((p) => p.name === 'Sun')
    const pmoon = out.progressions.progressedChart.planets.find((p) => p.name === 'Moon')
    console.log(`  Progressed Sun:  ${psun?.sign} ${Math.round(psun?.degree ?? 0)}°`)
    console.log(`  Progressed Moon: ${pmoon?.sign} ${Math.round(pmoon?.degree ?? 0)}°`)
    if (out.progressions.progressedMoonPhase) {
      console.log(`  Progressed Moon Phase: ${JSON.stringify(out.progressions.progressedMoonPhase)}`)
    }
    console.log(`  P→N aspects: ${out.progressions.progressedToNatal.length}건`)
  } else {
    console.log('  (프로그레션 계산 실패)')
  }

  console.log('\n## 9. Solar Return')
  if (out.solarReturn) {
    console.log(`  요약: ${JSON.stringify(out.solarReturn.summary, null, 2).slice(0, 400)}`)
  } else {
    console.log('  (Solar Return 계산 실패)')
  }

  console.log('\n' + '='.repeat(72))
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
