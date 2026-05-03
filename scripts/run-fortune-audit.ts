import { runFortune } from '@/lib/fortune/cross-rules'
import { renderToText } from '@/lib/fortune/cross-rules/renderer'
import type { CrossMatch } from '@/lib/fortune/cross-rules/types'

async function main() {
  const report = await runFortune({
    birth: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      gender: 'male',
      calendarType: 'solar',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      astroTimezone: 'Asia/Seoul',
    },
    queryDate: new Date('2026-04-28T12:00:00+09:00'),
    skipReturns: false,
  })

  // Flatten all matches
  const all: CrossMatch[] = []
  for (const d of Object.values(report.byDomain)) {
    all.push(...d.confirms, ...d.conflicts, ...d.silents)
  }

  const byLayer = {
    state: all.filter((m) => m.rule.layer === 'state'),
    relation: all.filter((m) => m.rule.layer === 'relation'),
    timing: all.filter((m) => m.rule.layer === 'timing'),
  }

  const printBucket = (label: string, ms: CrossMatch[]) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`${label}  (${ms.length}개 룰)`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    const polarities: Record<string, CrossMatch[]> = { confirm: [], conflict: [], silent: [] }
    for (const m of ms) polarities[m.polarity].push(m)
    for (const polKey of ['confirm', 'conflict', 'silent'] as const) {
      const list = polarities[polKey]
      if (list.length === 0) continue
      const polLabel = polKey === 'confirm' ? '✓ CONFIRM (양쪽 동의)' : polKey === 'conflict' ? '⚠ CONFLICT (양면)' : '· SILENT (단편 단서)'
      console.log(`\n  [${polLabel}]  ${list.length}개`)
      for (const m of list) {
        const scaleStr = m.rule.scale ? ` ${m.rule.scale}` : ''
        const intensity = m.intensity === 'strong' ? '●●●' : m.intensity === 'moderate' ? '●●○' : '●○○'
        console.log(`    ${intensity} [${m.rule.domain}${scaleStr}] ${m.rule.meaning}`)
        console.log(`         사주: ${summarize(m.saju.evidence)}`)
        console.log(`         점성: ${summarize(m.astro.evidence)}`)
      }
    }
  }

  printBucket('STATE 레이어 (정적 — 평생 골격, 비-타이밍)', byLayer.state)
  printBucket('RELATION 레이어 (정적 — 합/충/형/aspects, 비-타이밍)', byLayer.relation)
  printBucket('TIMING 레이어 (시점 — 대운/세운/transit/event)', byLayer.timing)

  console.log(`\n\n═════════════════════════════════════════════`)
  console.log(`해석 (deterministic 렌더러 — LLM 없이)`)
  console.log(`═════════════════════════════════════════════`)
  console.log(renderToText(report))
}

function summarize(ev: Record<string, unknown>): string {
  const keys = Object.keys(ev)
  if (keys.length === 0) return '(none)'
  return keys
    .slice(0, 3)
    .map((k) => {
      const v = ev[k]
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') return `${k}=${JSON.stringify(v).slice(0, 60)}`
      return `${k}=${String(v).slice(0, 60)}`
    })
    .filter(Boolean)
    .join(' · ')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
