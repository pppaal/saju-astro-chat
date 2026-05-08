import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { calculateAllAsteroids } from '@/lib/astrology/foundation/asteroids'
import { calculateExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import { findFixedStarConjunctions } from '@/lib/astrology/foundation/fixedStars'
import { calculateSecondaryProgressions, getProgressionSummary } from '@/lib/astrology/foundation/progressions'
import { getSwisseph } from '@/lib/astrology/foundation/ephe'

async function main() {
  const input = {
    year: 1995, month: 2, date: 9, hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  }
  const data = await calculateNatalChart(input)
  const chart = toChart(data)
  const sw = getSwisseph()
  const utHour = 6 + 40/60 - 9
  const jdUT = sw.swe_julday(input.year, input.month, input.date, utHour, sw.SE_GREG_CAL)
  const sun = chart.planets.find(p => p.name === 'Sun')!
  const moon = chart.planets.find(p => p.name === 'Moon')!
  const houseCusps = data.houses?.map(h => h.cusp) || []

  console.log('=== 본명 (full) ===')
  for (const p of chart.planets) {
    const r = (p as { retrograde?: boolean }).retrograde ? ' R' : ''
    console.log(`  ${p.name?.padEnd(11)} ${(p.sign || '').padEnd(13)} ${(p as { degree?: number }).degree?.toFixed(1).padStart(5)}° H${(p as { house?: number }).house}${r}`)
  }

  console.log('\n=== ASTEROIDS ===')
  const ast = calculateAllAsteroids(jdUT)
  for (const k of ['Ceres', 'Pallas', 'Juno', 'Vesta'] as const) {
    const a = ast[k]
    if (a) console.log(`  ${k.padEnd(8)} ${a.sign?.padEnd(13)} ${a.degree?.toFixed(1).padStart(5)}° H${a.house}`)
  }

  console.log('\n=== EXTRA POINTS ===')
  const ep = await calculateExtraPoints(jdUT, input.latitude, input.longitude, chart.ascendant!.longitude, sun.longitude, moon.longitude, sun.house || 1, houseCusps)
  for (const [k, v] of Object.entries(ep)) {
    if (v && typeof v === 'object' && 'sign' in v) {
      const o = v as { name?: string; sign?: string; degree?: number; house?: number }
      console.log(`  ${(o.name || k).padEnd(15)} ${o.sign?.padEnd(13)} ${o.degree?.toFixed(1).padStart(5)}° H${o.house}`)
    }
  }

  console.log('\n=== ASPECTS (orb 6°, 상위 12) ===')
  const aspects = findNatalAspects(chart, { maxOrb: 6 })
  for (const a of aspects.slice(0, 12)) {
    const f = (a.from as { name?: string })?.name || a.from
    const t = (a.to as { name?: string })?.name || a.to
    console.log(`  ${String(f).padEnd(10)} ${String(a.type).padEnd(14)} ${String(t).padEnd(10)} ${a.orb?.toFixed(1)}° ${a.applying ? 'applying' : 'separating'}`)
  }

  console.log('\n=== FIXED STARS (orb 1.5°) ===')
  const stars = findFixedStarConjunctions(chart, 1995, 1.5)
  for (const s of stars) console.log(`  ${s.star.name_ko?.padEnd(28)} conj ${s.planet?.padEnd(11)} ${s.orb?.toFixed(2)}°`)

  console.log('\n=== SECONDARY PROGRESSIONS (2025-11-15) ===')
  const prog = await calculateSecondaryProgressions(input, new Date('2025-11-15'))
  console.log(getProgressionSummary(prog))
}
main().catch(e => { console.error(e); process.exit(1) })
