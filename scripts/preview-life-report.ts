import { runMainSaju } from '../src/lib/saju/main'
import { buildLifeReport } from '../src/lib/fusion/lifeReport'

const saju = runMainSaju({
  birthDate: '1990-05-15',
  birthTime: '14:30',
  gender: 'male',
  timezone: 'Asia/Seoul',
})

const astro = {
  planets: [
    { name: 'Sun', sign: 'Taurus', house: 10, longitude: 54, degree: 24 },
    { name: 'Moon', sign: 'Pisces', house: 8, longitude: 350, degree: 20 },
    { name: 'Mercury', sign: 'Gemini', house: 11, longitude: 75, degree: 15 },
    { name: 'Venus', sign: 'Aries', house: 9, longitude: 15, degree: 15 },
    { name: 'Mars', sign: 'Aquarius', house: 7, longitude: 320, degree: 20 },
    { name: 'Jupiter', sign: 'Cancer', house: 12, longitude: 95, degree: 5 },
    { name: 'Saturn', sign: 'Capricorn', house: 6, longitude: 285, degree: 15 },
    { name: 'Uranus', sign: 'Capricorn', house: 6, longitude: 278, degree: 8 },
    { name: 'Neptune', sign: 'Capricorn', house: 6, longitude: 284, degree: 14 },
    { name: 'Pluto', sign: 'Scorpio', house: 4, longitude: 226, degree: 16 },
    { name: 'True Node', sign: 'Aquarius', house: 7, longitude: 315, degree: 15 },
  ] as never,
  ascendant: { sign: 'Leo', degree: 15, longitude: 135 } as never,
  mc: { sign: 'Taurus', degree: 24, longitude: 54 } as never,
  houses: [
    { index: 1, sign: 'Leo', cusp: 135 }, { index: 2, sign: 'Virgo', cusp: 165 },
    { index: 3, sign: 'Libra', cusp: 195 }, { index: 4, sign: 'Scorpio', cusp: 225 },
    { index: 5, sign: 'Sagittarius', cusp: 255 }, { index: 6, sign: 'Capricorn', cusp: 285 },
    { index: 7, sign: 'Aquarius', cusp: 315 }, { index: 8, sign: 'Pisces', cusp: 345 },
    { index: 9, sign: 'Aries', cusp: 15 }, { index: 10, sign: 'Taurus', cusp: 45 },
    { index: 11, sign: 'Gemini', cusp: 75 }, { index: 12, sign: 'Cancer', cusp: 105 },
  ] as never,
}

const report = buildLifeReport({ saju, astro: astro as never })

// ── Print summary stats first
console.log('Generator:', report.generator)
console.log('Headline (ko):', report.headline.ko)
console.log('Decisive timing paragraphs:', report.decisiveTiming.paragraphs.length)
console.log('Karma paragraphs:', report.karma.paragraphs.length)
console.log('Domain count:', report.domains.length)
console.log('Domain ids:', report.domains.map((d) => d.id).join(', '))
console.log('')

// ── Print each domain header + first paragraph
for (const domain of report.domains) {
  const headerKo = domain.title.ko
  const firstKo = domain.paragraphs[0]?.ko ?? ''
  console.log(`── ${domain.id.toUpperCase()} — ${headerKo} (${domain.paragraphs.length} paragraphs) ──`)
  console.log(firstKo.slice(0, 280))
  console.log('Signals — saju:', domain.signals.saju.length, '| astro:', domain.signals.astro.length, '| fusion:', domain.signals.fusion.length)
  console.log('')
}

// ── Print full report JSON last (useful for piping/inspection)
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2))
}
