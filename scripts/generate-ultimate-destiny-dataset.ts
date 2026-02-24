// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const OUT_JSON = path.join(process.cwd(), 'reports', '1995-02-09_0640_seoul_ultimate_dataset.json')
const OUT_MD = path.join(process.cwd(), 'reports', '1995-02-09_0640_seoul_ultimate_dataset.md')

function safe(v: unknown, fallback = '-'): string {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function table(headers: string[], rows: string[][]): string {
  const h = `| ${headers.join(' | ')} |`
  const s = `| ${headers.map(() => '---').join(' | ')} |`
  const b = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
  return [h, s, b].join('\n')
}

async function main() {
  const computeModulePath = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'precompute-chart',
    'compute.ts'
  )
  const computeModule = await import(pathToFileURL(computeModulePath).href)
  const computePrecomputedChart = computeModule.computePrecomputedChart as (
    input: any
  ) => Promise<any>

  const input = {
    birthDate: '1995-02-09',
    birthTime: '06:40',
    latitude: 37.5665,
    longitude: 126.978,
    gender: 'male',
    timezone: 'Asia/Seoul',
  }

  const result = await computePrecomputedChart(input as any)
  const now = new Date().toISOString()

  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: now,
        profile: input,
        dataset: result,
      },
      null,
      2
    ),
    'utf8'
  )

  const saju = (result.saju || {}) as any
  const astro = (result.astro || {}) as any
  const adv = (result.advancedAstro || {}) as any
  const planets = Array.isArray(astro.planets) ? astro.planets : []
  const majorTransits = adv?.currentTransits?.majorTransits || []
  const draconicSummary = adv?.draconic?.comparison?.summary || {}
  const harmonicProfile = adv?.harmonics?.profile || {}
  const extraPoints = adv?.extraPoints || {}

  const lines: string[] = []
  lines.push('# Ultimate Destiny Dataset (Implemented-Max)')
  lines.push('')
  lines.push('- GeneratedAt: ' + now)
  lines.push('- Profile: 1995-02-09 06:40 / Seoul / male')
  lines.push('- Source: precompute-chart engine (saju + astrology + advancedAstro)')
  lines.push('')

  lines.push('## 1) Saju Core + Advanced')
  lines.push('')
  lines.push(
    `- DayMaster: ${safe(saju?.dayMaster?.name)} (${safe(saju?.dayMaster?.element)}, ${safe(saju?.dayMaster?.yin_yang)})`
  )
  lines.push(
    `- Current Daeun: ${safe(saju?.unse?.daeun?.[2]?.heavenlyStem)}${safe(saju?.unse?.daeun?.[2]?.earthlyBranch)} (age ${safe(saju?.unse?.daeun?.[2]?.age)})`
  )
  lines.push(
    `- Geokguk: ${safe(saju?.advancedAnalysis?.geokguk?.primary || saju?.advancedAnalysis?.geokguk?.type)}`
  )
  lines.push(
    `- Yongsin: ${safe(saju?.advancedAnalysis?.yongsin?.primary || saju?.advancedAnalysis?.extended?.yongsin?.primary)}`
  )
  lines.push(
    `- Strength: ${safe(saju?.advancedAnalysis?.extended?.strength?.level)} / ${safe(saju?.advancedAnalysis?.extended?.strength?.score)}`
  )
  lines.push('')
  lines.push(
    table(
      ['Pillar', 'Stem', 'Branch'],
      [
        [
          'Year',
          safe(saju?.pillars?.year?.heavenlyStem?.name),
          safe(saju?.pillars?.year?.earthlyBranch?.name),
        ],
        [
          'Month',
          safe(saju?.pillars?.month?.heavenlyStem?.name),
          safe(saju?.pillars?.month?.earthlyBranch?.name),
        ],
        [
          'Day',
          safe(saju?.pillars?.day?.heavenlyStem?.name),
          safe(saju?.pillars?.day?.earthlyBranch?.name),
        ],
        [
          'Time',
          safe(saju?.pillars?.time?.heavenlyStem?.name),
          safe(saju?.pillars?.time?.earthlyBranch?.name),
        ],
      ]
    )
  )
  lines.push('')

  lines.push('## 2) Astrology Core')
  lines.push('')
  lines.push(`- ASC: ${safe(astro?.ascendant?.formatted)}`)
  lines.push(`- MC: ${safe(astro?.mc?.formatted)}`)
  lines.push(
    table(
      ['Planet', 'Position', 'House', 'Rx'],
      planets.map((p: any) => [
        safe(p.name),
        safe(p.formatted),
        safe(p.house),
        p.retrograde ? 'R' : '-',
      ])
    )
  )
  lines.push('')

  lines.push('## 3) Advanced Astrology (Implemented)')
  lines.push('')
  lines.push(
    `- ExtraPoints: Chiron=${safe(extraPoints?.chiron?.formatted)}, Lilith=${safe(extraPoints?.lilith?.formatted)}, POF=${safe(extraPoints?.partOfFortune?.formatted)}, Vertex=${safe(extraPoints?.vertex?.formatted)}`
  )
  lines.push(
    `- Progressions Secondary Summary: ${JSON.stringify(adv?.progressions?.secondary?.summary || {})}`
  )
  lines.push(
    `- Progressions SolarArc Summary: ${JSON.stringify(adv?.progressions?.solarArc?.summary || {})}`
  )
  lines.push(`- SolarReturn Summary: ${JSON.stringify(adv?.solarReturn?.summary || {})}`)
  lines.push(`- LunarReturn Summary: ${JSON.stringify(adv?.lunarReturn?.summary || {})}`)
  lines.push(`- Draconic Summary: ${JSON.stringify(draconicSummary)}`)
  lines.push(`- Harmonics Profile: ${JSON.stringify(harmonicProfile)}`)
  lines.push(
    `- Midpoints Summary: ${JSON.stringify({ sunMoon: adv?.midpoints?.sunMoon, ascMc: adv?.midpoints?.ascMc })}`
  )
  lines.push(`- Electional Summary: ${JSON.stringify(adv?.electional || {})}`)
  lines.push(`- Eclipses Summary: ${JSON.stringify(adv?.eclipses || {})}`)
  lines.push(`- FixedStars Count: ${Array.isArray(adv?.fixedStars) ? adv.fixedStars.length : 0}`)
  lines.push(
    `- Asteroids Aspects Count: ${Array.isArray(adv?.asteroids?.aspects) ? adv.asteroids.aspects.length : 0}`
  )
  lines.push('')

  lines.push('## 4) Current Transits')
  lines.push('')
  lines.push(
    table(
      ['TransitPlanet', 'Aspect', 'NatalPoint', 'Orb', 'Applying'],
      majorTransits.map((t: any) => [
        safe(t.transitPlanet),
        safe(t.type),
        safe(t.natalPoint),
        safe(t.orb),
        t.isApplying ? 'Y' : 'N',
      ])
    )
  )
  lines.push('')

  lines.push('## 5) Cross Data (Saju x Astrology)')
  lines.push('')
  lines.push('- X1 부족보정축: fire 부족 + yongsin 화 + 화 세운 구간')
  lines.push('- X2 정체성축: 辛일간 + Aquarius ASC/Sun/Mercury + 10H Jupiter/Pluto')
  lines.push('- X3 전환축: 현재 대운(편재/상관) + 관계축(7H Mars) + Moon-Pluto 대립')
  lines.push('')

  lines.push('## 6) Raw JSON Pointer')
  lines.push('')
  lines.push('- Full raw dataset: `reports/1995-02-09_0640_seoul_ultimate_dataset.json`')
  lines.push('- This markdown is summary-only. Raw JSON contains all implemented fields.')
  lines.push('')

  fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`, 'utf8')

  console.log(`Saved: ${OUT_JSON}`)
  console.log(`Saved: ${OUT_MD}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
