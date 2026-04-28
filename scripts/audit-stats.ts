import { runFortune } from '@/lib/fortune/cross-rules'
import { normalizeSaju } from '@/lib/fortune/cross-rules/normalizer/saju'
import { normalizeAstro } from '@/lib/fortune/cross-rules/normalizer/astro'
import { buildSajuNormalizerInput } from '@/lib/fortune/cross-rules/adapters/saju'
import { buildAstroNormalizerInput } from '@/lib/fortune/cross-rules/adapters/astro'

async function main() {
  const sajuInput = buildSajuNormalizerInput({
    birthDate: '1995-02-09', birthTime: '06:40', gender: 'male',
    timezone: 'Asia/Seoul', queryDate: new Date('2026-04-28T12:00:00+09:00'),
  })
  const astroInput = await buildAstroNormalizerInput({
    year: 1995, month: 2, date: 9, hour: 6, minute: 40,
    latitude: 37.5665, longitude: 126.978, timeZone: 'Asia/Seoul',
    queryDate: new Date('2026-04-28T12:00:00+09:00'),
  })
  const sajuSig = normalizeSaju(sajuInput)
  const astroSig = normalizeAstro(astroInput)
  console.log('saju signals total:', sajuSig.length, '/ fired:', sajuSig.filter((s) => s.fired).length)
  console.log('astro signals total:', astroSig.length, '/ fired:', astroSig.filter((s) => s.fired).length)

  const t0 = Date.now()
  const r = await runFortune({
    birth: {
      birthDate: '1995-02-09', birthTime: '06:40', gender: 'male',
      latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul',
    },
    queryDate: new Date('2026-04-28T12:00:00+09:00'),
  })
  const t1 = Date.now()
  console.log('full pipeline ms:', t1 - t0)
  console.log('confirms:', Object.values(r.byDomain).reduce((a, d) => a + d.confirms.length, 0))
  console.log('conflicts:', Object.values(r.byDomain).reduce((a, d) => a + d.conflicts.length, 0))
  console.log('silents:', Object.values(r.byDomain).reduce((a, d) => a + d.silents.length, 0))
  console.log('themes:', r.themes.length)
}
main().catch((e) => { console.error(e); process.exit(1) })
