import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'

async function main() {
  const chart = await calculateNatalChart({
    year: 1995,
    month: 2,
    date: 9,
    hour: 6,
    minute: 40,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })
  console.log('=== Planets ===')
  for (const p of chart.planets) {
    console.log(
      `${(p.name || '').padEnd(10)} ${(p.sign || '').padEnd(15)} ${p.longitude.toFixed(2).padStart(6)}°  house ${p.house}`
    )
  }
  console.log()
  console.log('=== Ascendant ===')
  console.log(JSON.stringify(chart.ascendant, null, 2))
  console.log()
  console.log('=== Houses ===')
  if (chart.houses) {
    for (const h of chart.houses) {
      console.log(`H${String(h.index).padStart(2)} ${(h.sign || '').padEnd(15)} ${h.cusp.toFixed(2)}°`)
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
