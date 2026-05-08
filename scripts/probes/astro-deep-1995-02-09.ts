import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { calculateAllAsteroids } from '@/lib/astrology/foundation/asteroids'
import { calculateExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import { findFixedStarConjunctions } from '@/lib/astrology/foundation/fixedStars'
import { calculateSecondaryProgressions, getProgressionSummary } from '@/lib/astrology/foundation/progressions'

async function main() {
  const input = {
    year: 1995, month: 2, date: 9, hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
  }
  const data = await calculateNatalChart(input)
  const chart = toChart(data)

  console.log('=== 어스펙트 ===')
  const aspects = findNatalAspects(chart, { maxOrb: 6 })
  for (const a of aspects.slice(0, 15)) {
    console.log(JSON.stringify(a))
  }

  console.log('\n=== 항성 (orb 1.5°) ===')
  const stars = findFixedStarConjunctions(chart, 1995, 1.5)
  for (const s of stars.slice(0, 10)) {
    console.log(s)
  }

  console.log('\n=== 2025-11 Secondary Progressions ===')
  try {
    const prog = await calculateSecondaryProgressions(input, new Date('2025-11-15'))
    console.log(getProgressionSummary(prog))
  } catch (e) { console.log('(prog err)', String(e).slice(0, 100)) }

  console.log('\n=== Asteroids (Ceres/Pallas/Juno/Vesta) ===')
  try {
    const ast = await calculateAllAsteroids(input)
    console.log(JSON.stringify(ast, null, 2).slice(0, 600))
  } catch (e) { console.log('(asteroids err)', String(e).slice(0, 150)) }

  console.log('\n=== ExtraPoints ===')
  try {
    const ep = await calculateExtraPoints(input, data)
    console.log(JSON.stringify(ep, null, 2).slice(0, 600))
  } catch (e) { console.log('(extraPoints err)', String(e).slice(0, 150)) }
}
main().catch(e => { console.error(e); process.exit(1) })
