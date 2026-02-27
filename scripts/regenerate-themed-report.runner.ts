import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { calculateSajuData } from '../src/lib/Saju/saju'
import { analyzeAdvancedSaju } from '../src/lib/Saju/astrologyengine'
import { analyzeRelations, toAnalyzeInputFromSaju } from '../src/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars } from '../src/lib/Saju/shinsal'
import {
  calculateNatalChart,
  toChart,
  findNatalAspects,
  calculateTransitChart,
  findMajorTransits,
  calculateSecondaryProgressions,
  calculateSolarReturn,
  calculateLunarReturn,
} from '../src/lib/astrology'
import { calculateDestinyMatrix, FusionReportGenerator } from '../src/lib/destiny-matrix'
import { generateAIPremiumReport } from '../src/lib/destiny-matrix/ai-report'
import { mapMajorTransitsToActiveTransits } from '../src/lib/destiny-matrix/ai-report/transitMapping'

type WesternElement = 'fire' | 'earth' | 'air' | 'water'

const PROFILE = {
  birthDate: '1995-02-09',
  birthTime: '06:40',
  birthCity: 'Seoul',
  timezone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
  gender: 'male' as const,
  lang: 'ko' as const,
}

const OUTPUT_JSON = path.resolve('reports/themed_report_1995-02-09_0640_ko.json')
const OUTPUT_MD = path.resolve('reports/themed_report_1995-02-09_0640_ko.md')

const SIGN_ELEMENT_MAP: Record<string, WesternElement> = {
  aries: 'fire',
  taurus: 'earth',
  gemini: 'air',
  cancer: 'water',
  leo: 'fire',
  virgo: 'earth',
  libra: 'air',
  scorpio: 'water',
  sagittarius: 'fire',
  capricorn: 'earth',
  aquarius: 'air',
  pisces: 'water',
}

const BANNED_PHRASES = [
  '격국의 결',
  '긴장 신호',
  '상호작용',
  '시사',
  '결이',
  '프레임',
  '검증',
  '근거 세트',
]

function deriveDominantWesternElement(
  planetSigns: Record<string, string>
): WesternElement | undefined {
  const score: Record<WesternElement, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  const weights: Record<string, number> = {
    sun: 3,
    moon: 3,
    mercury: 2,
    venus: 2,
    mars: 2,
    jupiter: 1,
    saturn: 1,
  }
  for (const [planet, sign] of Object.entries(planetSigns)) {
    const element = SIGN_ELEMENT_MAP[sign.toLowerCase()]
    if (!element) continue
    score[element] += weights[planet.toLowerCase()] || 1
  }
  const sorted = Object.entries(score).sort((a, b) => b[1] - a[1])
  if (!sorted[0] || sorted[0][1] === 0) return undefined
  return sorted[0][0] as WesternElement
}

function extractAllLayerCells(
  matrix: Record<string, unknown>
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {}
  for (let i = 1; i <= 10; i += 1) {
    const key = `layer${i}`
    const src = matrix[key] as Record<string, Record<string, unknown>> | undefined
    if (!src || typeof src !== 'object') continue
    const flat: Record<string, unknown> = {}
    for (const [row, rowValue] of Object.entries(src)) {
      if (!rowValue || typeof rowValue !== 'object') continue
      for (const [col, cell] of Object.entries(rowValue)) {
        flat[`${row}.${col}`] = cell
      }
    }
    out[key] = flat
  }
  return out
}

function buildMarkdown(report: any, debug: Record<string, unknown>): string {
  const sectionOrder: Array<[string, string]> = [
    ['introduction', '1. Introduction'],
    ['personalityDeep', '2. Personality'],
    ['careerPath', '3. Career'],
    ['relationshipDynamics', '4. Relationship'],
    ['wealthPotential', '5. Wealth'],
    ['healthGuidance', '6. Health'],
    ['lifeMission', '7. Life Mission'],
    ['timingAdvice', '8. Timing'],
    ['actionPlan', '9. Action Plan'],
    ['conclusion', '10. Conclusion'],
  ]

  const chunks: string[] = ['# Themed Report (1995-02-09 06:40, Seoul, ko)']
  for (const [key, title] of sectionOrder) {
    chunks.push(`\n## ${title}\n`)
    chunks.push(String(report?.sections?.[key] || ''))
  }

  chunks.push('\n## Debug Appendix\n')
  chunks.push(`- overallScore: ${String(debug.overallScore ?? '')}`)
  chunks.push(`- grade: ${String(debug.grade ?? '')}`)
  chunks.push(
    `- topInsights: ${Array.isArray(debug.topInsights) ? debug.topInsights.join(', ') : ''}`
  )
  chunks.push(`- timing.daeun: ${String(debug.daeun ?? '')}`)
  chunks.push(`- timing.seun: ${String(debug.seun ?? '')}`)
  chunks.push(`- timing.wolun: ${String(debug.wolun ?? '')}`)
  chunks.push(`- timing.iljin: ${String(debug.iljin ?? '')}`)
  chunks.push(`- dominantWesternElement: ${String(debug.dominantWesternElement ?? '')}`)
  chunks.push(`- activeTransitsNonEmpty: ${String(debug.activeTransitsNonEmpty ?? false)}`)

  return chunks.join('\n')
}

function summarizeTiming(sajuData: any) {
  const annual = sajuData?.unse?.annual?.[0]
  const monthly = sajuData?.unse?.monthly?.[0]
  const daeun = sajuData?.daeWoon?.current
  const today = new Date().toISOString().slice(0, 10)
  return {
    daeun: daeun
      ? {
          heavenlyStem: daeun.heavenlyStem || '',
          earthlyBranch: daeun.earthlyBranch || '',
          element: daeun?.heavenlyStem?.element || '',
          startAge: Number(daeun.age || 0),
          endAge: Number(daeun.age || 0) + 9,
          isCurrent: true,
        }
      : undefined,
    seun: annual
      ? {
          year: annual.year,
          heavenlyStem: annual.heavenlyStem || '',
          earthlyBranch: annual.earthlyBranch || '',
          element: annual.element || '',
        }
      : undefined,
    wolun: monthly
      ? {
          month: monthly.month,
          heavenlyStem: monthly.heavenlyStem || '',
          earthlyBranch: monthly.earthlyBranch || '',
          element: monthly.element || '',
        }
      : undefined,
    iljin: { date: today, heavenlyStem: '', earthlyBranch: '', element: '' },
  }
}

async function main() {
  const reviewToken = process.env.REVIEW_TOKEN || ''
  void reviewToken

  const sajuData = calculateSajuData(
    PROFILE.birthDate,
    PROFILE.birthTime,
    PROFILE.gender,
    'solar',
    PROFILE.timezone
  )
  const advanced = analyzeAdvancedSaju(
    {
      name: sajuData.dayPillar.heavenlyStem.name,
      element: sajuData.dayPillar.heavenlyStem.element,
      yin_yang: sajuData.dayPillar.heavenlyStem.yin_yang || '양',
    },
    {
      yearPillar: sajuData.yearPillar,
      monthPillar: sajuData.monthPillar,
      dayPillar: sajuData.dayPillar,
      timePillar: sajuData.timePillar,
    }
  )

  const relations = analyzeRelations(
    toAnalyzeInputFromSaju(sajuData.pillars, sajuData.dayMaster?.name)
  )
  const twelveStagesByPillar = getTwelveStagesForPillars(sajuData.pillars)
  const twelveStages: Record<string, number> = {}
  for (const stage of Object.values(twelveStagesByPillar)) {
    const key = stage === '건록' ? '임관' : stage === '제왕' ? '왕지' : stage
    twelveStages[key] = (twelveStages[key] || 0) + 1
  }
  const shinsalHits = getShinsalHits(sajuData.pillars, {
    includeTwelveAll: true,
    includeGeneralShinsal: true,
    includeLuckyDetails: true,
  })
  const shinsalList = [...new Set(shinsalHits.map((hit) => hit.kind))]

  const [year, month, date] = PROFILE.birthDate.split('-').map((v) => Number(v))
  const [hour, minute] = PROFILE.birthTime.split(':').map((v) => Number(v))
  const natal = await calculateNatalChart({
    year,
    month,
    date,
    hour,
    minute,
    latitude: PROFILE.latitude,
    longitude: PROFILE.longitude,
    timeZone: PROFILE.timezone,
  })
  const natalChart = toChart(natal)
  const natalAspects = findNatalAspects(natalChart, { includeMinor: true, maxResults: 80 })
  const nowIso = new Date().toISOString()
  const transit = await calculateTransitChart({
    iso: nowIso,
    latitude: PROFILE.latitude,
    longitude: PROFILE.longitude,
    timeZone: PROFILE.timezone,
  })
  const majorTransits = findMajorTransits(transit, natalChart, 1.0).slice(0, 40)
  const activeTransits = mapMajorTransitsToActiveTransits(majorTransits, 8)
  const natalInput = {
    year,
    month,
    date,
    hour,
    minute,
    latitude: PROFILE.latitude,
    longitude: PROFILE.longitude,
    timeZone: PROFILE.timezone,
  }
  const progressions = await calculateSecondaryProgressions({
    natal: natalInput,
    targetDate: nowIso.slice(0, 10),
  })
  const solarReturn = await calculateSolarReturn({
    natal: natalInput,
    year: new Date().getFullYear(),
  })
  const lunarReturn = await calculateLunarReturn({
    natal: natalInput,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  })

  const planetSigns: Record<string, string> = {}
  const planetHouses: Record<string, number> = {}
  for (const p of natal.planets) {
    planetSigns[p.name] = p.sign
    if (Number.isFinite(p.house)) planetHouses[p.name] = p.house
  }
  const dominantWesternElement = deriveDominantWesternElement(planetSigns)
  const timingData = summarizeTiming(sajuData)

  const matrixInput: any = {
    dayMasterElement: sajuData.dayPillar.heavenlyStem.element,
    pillarElements: [
      sajuData.yearPillar.heavenlyStem.element,
      sajuData.monthPillar.heavenlyStem.element,
      sajuData.dayPillar.heavenlyStem.element,
      sajuData.timePillar.heavenlyStem.element,
    ],
    sibsinDistribution: Object.fromEntries(
      Object.entries(
        [sajuData.yearPillar, sajuData.monthPillar, sajuData.dayPillar, sajuData.timePillar].reduce<
          Record<string, number>
        >((acc, pillar) => {
          const s1 = pillar?.heavenlyStem?.sibsin
          const s2 = pillar?.earthlyBranch?.sibsin
          if (s1) acc[s1] = (acc[s1] || 0) + 1
          if (s2) acc[s2] = (acc[s2] || 0) + 1
          return acc
        }, {})
      )
    ),
    twelveStages,
    relations,
    geokguk: advanced.geokguk.type,
    yongsin: advanced.yongsin.primary,
    currentDaeunElement: sajuData.daeWoon?.current?.heavenlyStem
      ? sajuData.dayPillar.heavenlyStem.element
      : undefined,
    currentSaeunElement: sajuData.unse?.annual?.[0]?.element,
    shinsalList,
    dominantWesternElement,
    planetHouses,
    planetSigns,
    aspects: natalAspects.map((a) => ({
      planet1: a.from.name,
      planet2: a.to.name,
      type: a.type,
      orb: a.orb,
      angle: a.angle,
    })),
    activeTransits,
    lang: PROFILE.lang,
    sajuSnapshot: {
      dayMaster: sajuData.dayMaster,
      pillars: sajuData.pillars,
      fiveElements: sajuData.fiveElements,
      daeWoon: sajuData.daeWoon,
      unse: sajuData.unse,
    },
    astrologySnapshot: {
      natalChart: natal,
      natalAspects,
      currentTransits: { asOfIso: nowIso, majorTransits },
      progressions,
      returns: { solarReturn, lunarReturn },
    },
    crossSnapshot: {
      source: 'script-regenerated',
      currentDateIso: nowIso.slice(0, 10),
    },
    currentDateIso: nowIso.slice(0, 10),
    profileContext: {
      birthDate: PROFILE.birthDate,
      birthTime: PROFILE.birthTime,
      birthCity: PROFILE.birthCity,
      timezone: PROFILE.timezone,
      latitude: PROFILE.latitude,
      longitude: PROFILE.longitude,
      analysisAt: nowIso,
    },
  }

  const matrix = calculateDestinyMatrix(matrixInput)
  const layerResults = extractAllLayerCells(matrix as Record<string, unknown>)
  const generator = new FusionReportGenerator({
    lang: 'ko',
    maxTopInsights: 20,
    includeVisualizations: false,
    includeDetailedData: true,
    narrativeStyle: 'friendly',
  })
  const baseReport = generator.generateReport(matrixInput, layerResults as any, undefined)

  const report = await generateAIPremiumReport(matrixInput, baseReport, {
    name: 'fixture-1995-02-09-0640',
    birthDate: PROFILE.birthDate,
    lang: 'ko',
    detailLevel: 'comprehensive',
    timingData,
    userPlan: 'premium',
  })

  await mkdir(path.dirname(OUTPUT_JSON), { recursive: true })
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8')

  const markdown = buildMarkdown(report, {
    overallScore: report.matrixSummary?.overallScore,
    grade: report.matrixSummary?.grade,
    topInsights: report.matrixSummary?.topInsights || [],
    daeun: timingData.daeun
      ? `${timingData.daeun.heavenlyStem}${timingData.daeun.earthlyBranch} (${timingData.daeun.element})`
      : 'N/A',
    seun: timingData.seun
      ? `${timingData.seun.year} ${timingData.seun.heavenlyStem}${timingData.seun.earthlyBranch} (${timingData.seun.element})`
      : 'N/A',
    wolun: timingData.wolun
      ? `${timingData.wolun.month} ${timingData.wolun.heavenlyStem}${timingData.wolun.earthlyBranch} (${timingData.wolun.element})`
      : 'N/A',
    iljin: timingData.iljin
      ? `${timingData.iljin.date} ${timingData.iljin.heavenlyStem}${timingData.iljin.earthlyBranch} (${timingData.iljin.element})`
      : 'N/A',
    dominantWesternElement: dominantWesternElement || '',
    activeTransitsNonEmpty: activeTransits.length > 0,
  })
  await writeFile(OUTPUT_MD, markdown, 'utf8')

  const hasDaeun = !!matrixInput.currentDaeunElement
  const hasSaeun = !!matrixInput.currentSaeunElement
  const bannedFound = BANNED_PHRASES.filter((phrase) => markdown.includes(phrase))
  const contradiction = hasSaeun && markdown.includes('세운 미입력')

  console.log('[regen:themed] JSON:', OUTPUT_JSON)
  console.log('[regen:themed] MD:', OUTPUT_MD)
  console.log(
    '[regen:themed] checks:',
    JSON.stringify(
      {
        hasDaeun,
        hasSaeun,
        activeTransitsCount: activeTransits.length,
        dominantWesternElement: dominantWesternElement || null,
        shinsalListLength: shinsalList.length,
        twelveStagesLength: Object.keys(twelveStages).length,
        relationsLength: relations.length,
      },
      null,
      2
    )
  )

  const snip = (t: string | undefined) => (t || '').slice(0, 300).replace(/\s+/g, ' ').trim()
  console.log('[regen:themed] healthGuidance:', snip(report.sections?.healthGuidance))
  console.log('[regen:themed] relationshipDynamics:', snip(report.sections?.relationshipDynamics))
  console.log('[regen:themed] careerPath:', snip(report.sections?.careerPath))
  console.log(
    '[regen:themed] bannedPhrasesFound:',
    bannedFound.length ? bannedFound.join(', ') : 'none'
  )
  console.log('[regen:themed] contradiction(hasSaeun && 세운 미입력):', contradiction)
}

main().catch((error) => {
  console.error('[regen:themed] failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
