/**
 * Demo: produce the [Birth Snapshot] + [Cross Signals] block that the
 * realtime counselor will hand to the LLM.
 *
 * Usage:
 *   DATABASE_URL=postgresql://x:x@localhost/x npx tsx scripts/demo-birth-snapshot.ts
 */

import {
  runFortuneWithRaw,
  serializeBirthSnapshot,
  renderToText,
} from '../src/lib/fortune/cross-rules'

async function main() {
  const { saju, astro, report } = await runFortuneWithRaw({
    birth: {
      birthDate: '1995-03-15',
      birthTime: '14:30',
      gender: 'male',
      timezone: 'Asia/Seoul',
      astroTimezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
    },
    queryDate: new Date('2026-05-09T00:00:00Z'),
  })

  const snapshot = serializeBirthSnapshot(saju, astro)
  const crossText = renderToText(report)
  const fullBlock = `${snapshot}\n\n[Cross Signals]\n${crossText}`

  console.log(fullBlock)
  console.log('\n===')
  console.log(`Total characters: ${fullBlock.length}`)
  console.log(`Approx tokens (~chars/3.5): ${Math.round(fullBlock.length / 3.5)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
