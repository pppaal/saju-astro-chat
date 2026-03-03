import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { calculateSajuData } from '../src/lib/Saju/saju'
import { analyzeAdvancedSaju } from '../src/lib/Saju/astrologyengine'
import { analyzeRelations, toAnalyzeInputFromSaju } from '../src/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars } from '../src/lib/Saju/shinsal'
import { calculateNatalChart, toChart, findNatalAspects } from '../src/lib/astrology'
import { calculateDestinyMatrix } from '../src/lib/destiny-matrix'

type WesternElement = 'fire' | 'earth' | 'air' | 'water'

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

function cellScore(cell: unknown): number {
  if (!cell || typeof cell !== 'object') return 0
  const obj = cell as { value?: unknown; interaction?: { score?: unknown } }
  if (typeof obj.value === 'number') return obj.value
  if (typeof obj.interaction?.score === 'number') return obj.interaction.score
  return 0
}

function analyzeLayer(layer: unknown) {
  if (!layer || typeof layer !== 'object')
    return { totalCells: 0, nonZeroCells: 0, topCells: [] as any[] }
  let totalCells = 0
  let nonZeroCells = 0
  const scored: Array<{ rowKey: string; colKey: string; score: number; keyword?: string }> = []
  for (const [rowKey, row] of Object.entries(layer as Record<string, unknown>)) {
    if (!row || typeof row !== 'object') continue
    for (const [colKey, cell] of Object.entries(row as Record<string, unknown>)) {
      totalCells += 1
      const score = cellScore(cell)
      if (score > 0) {
        nonZeroCells += 1
        const keyword =
          typeof (cell as { interaction?: { keyword?: unknown } }).interaction?.keyword === 'string'
            ? ((cell as { interaction?: { keyword?: string } }).interaction?.keyword ?? undefined)
            : undefined
        scored.push({ rowKey, colKey, score, ...(keyword ? { keyword } : {}) })
      }
    }
  }
  scored.sort((a, b) => b.score - a.score)
  return {
    totalCells,
    nonZeroCells,
    topCells: scored.slice(0, 10),
  }
}

function buildLayerEvidenceFromSummary(summary: any) {
  const rows = [
    ...(Array.isArray(summary?.strengthPoints) ? summary.strengthPoints : []),
    ...(Array.isArray(summary?.balancePoints) ? summary.balancePoints : []),
    ...(Array.isArray(summary?.cautionPoints) ? summary.cautionPoints : []),
  ]
  const grouped: Record<
    string,
    { count: number; samples: Array<{ rowKey: string; colKey: string; score?: number }> }
  > = {}
  for (const item of rows) {
    const layer = Number(item?.layer)
    if (!Number.isFinite(layer)) continue
    const key = `layer${layer}`
    if (!grouped[key]) grouped[key] = { count: 0, samples: [] }
    grouped[key].count += 1
    const score =
      typeof item?.cell?.interaction?.score === 'number' ? item.cell.interaction.score : undefined
    if (grouped[key].samples.length < 5) {
      grouped[key].samples.push({
        rowKey: String(item?.rowKey ?? ''),
        colKey: String(item?.colKey ?? ''),
        ...(typeof score === 'number' ? { score } : {}),
      })
    }
  }
  return grouped
}

function parseArgs() {
  const birthDate = process.argv[2] || '1995-02-09'
  const birthTime = process.argv[3] || '06:40'
  const timezone = process.argv[4] || 'Asia/Seoul'
  const latitude = Number(process.argv[5] || 37.5665)
  const longitude = Number(process.argv[6] || 126.978)
  const gender = (process.argv[7] || 'male') as 'male' | 'female'
  const outPathArg = process.argv[8]
  const safeTime = birthTime.replace(':', '')
  const outPath =
    outPathArg ||
    path.resolve('reports', `matrix-profile-${birthDate}-${safeTime}-${gender}-seoul.json`)
  return { birthDate, birthTime, timezone, latitude, longitude, gender, outPath }
}

async function main() {
  const profile = parseArgs()
  const saju = calculateSajuData(
    profile.birthDate,
    profile.birthTime,
    profile.gender,
    'solar',
    profile.timezone
  )

  const advanced = analyzeAdvancedSaju(
    {
      name: saju.dayPillar.heavenlyStem.name,
      element: saju.dayPillar.heavenlyStem.element,
      yin_yang: saju.dayPillar.heavenlyStem.yin_yang || '양',
    },
    {
      yearPillar: saju.yearPillar,
      monthPillar: saju.monthPillar,
      dayPillar: saju.dayPillar,
      timePillar: saju.timePillar,
    }
  )

  const relations = analyzeRelations(toAnalyzeInputFromSaju(saju.pillars, saju.dayMaster?.name))
  const stageMap = getTwelveStagesForPillars(saju.pillars)
  const twelveStages: Record<string, number> = {}
  for (const stage of Object.values(stageMap)) {
    const key = stage === '건록' ? '임관' : stage === '제왕' ? '왕지' : stage
    twelveStages[key] = (twelveStages[key] || 0) + 1
  }
  const shinsalHits = getShinsalHits(saju.pillars, {
    includeTwelveAll: true,
    includeGeneralShinsal: true,
    includeLuckyDetails: true,
  })
  const shinsalList = [...new Set(shinsalHits.map((h) => h.kind))]

  const [year, month, date] = profile.birthDate.split('-').map(Number)
  const [hour, minute] = profile.birthTime.split(':').map(Number)
  const natal = await calculateNatalChart({
    year,
    month,
    date,
    hour,
    minute,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timeZone: profile.timezone,
  })
  const chart = toChart(natal)
  const aspects = findNatalAspects(chart, { includeMinor: true, maxResults: 80 })

  const planetSigns: Record<string, string> = {}
  const planetHouses: Record<string, number> = {}
  for (const p of natal.planets) {
    planetSigns[p.name] = p.sign
    if (Number.isFinite(p.house)) planetHouses[p.name] = p.house
  }

  const matrixInput: any = {
    dayMasterElement: saju.dayPillar.heavenlyStem.element,
    pillarElements: [
      saju.yearPillar.heavenlyStem.element,
      saju.monthPillar.heavenlyStem.element,
      saju.dayPillar.heavenlyStem.element,
      saju.timePillar.heavenlyStem.element,
    ],
    sibsinDistribution: Object.fromEntries(
      Object.entries(
        [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.timePillar].reduce<
          Record<string, number>
        >((acc, p) => {
          const s1 = p?.heavenlyStem?.sibsin
          const s2 = p?.earthlyBranch?.sibsin
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
    currentDaeunElement: saju.daeWoon?.current?.heavenlyStem
      ? saju.dayPillar.heavenlyStem.element
      : undefined,
    currentSaeunElement: saju.unse?.annual?.[0]?.element,
    shinsalList,
    dominantWesternElement: deriveDominantWesternElement(planetSigns),
    planetHouses,
    planetSigns,
    aspects: aspects.map((a) => ({
      planet1: a.from.name,
      planet2: a.to.name,
      type: a.type,
      orb: a.orb,
      angle: a.angle,
    })),
    activeTransits: [],
    lang: 'ko',
  }

  const matrix: any = calculateDestinyMatrix(matrixInput)
  const output = {
    profile: {
      birthDate: profile.birthDate,
      birthTime: profile.birthTime,
      birthPlace: 'Seoul',
      timezone: profile.timezone,
      latitude: profile.latitude,
      longitude: profile.longitude,
      gender: profile.gender,
    },
    inputSummary: {
      dayMasterElement: matrixInput.dayMasterElement,
      geokguk: matrixInput.geokguk,
      yongsin: matrixInput.yongsin,
      dominantWesternElement: matrixInput.dominantWesternElement,
      aspectCount: matrixInput.aspects.length,
      shinsalCount: matrixInput.shinsalList.length,
      relationCount: matrixInput.relations.length,
      twelveStageKinds: Object.keys(matrixInput.twelveStages),
      hasCurrentDaeun: !!matrixInput.currentDaeunElement,
      hasCurrentSaeun: !!matrixInput.currentSaeunElement,
    },
    layerStats: {
      layer1: analyzeLayer(matrix.layer1),
      layer2: analyzeLayer(matrix.layer2),
      layer3: analyzeLayer(matrix.layer3),
      layer4: analyzeLayer(matrix.layer4),
      layer5: analyzeLayer(matrix.layer5),
      layer6: analyzeLayer(matrix.layer6),
      layer7: analyzeLayer(matrix.layer7),
      layer8: analyzeLayer(matrix.layer8),
      layer9: analyzeLayer(matrix.layer9),
      layer10: analyzeLayer(matrix.layer10),
    },
    layerEvidenceFromSummary: buildLayerEvidenceFromSummary(matrix.summary),
    summary: matrix.summary,
  }

  await mkdir(path.dirname(profile.outPath), { recursive: true })
  await writeFile(profile.outPath, JSON.stringify(output, null, 2), 'utf8')
  console.log(profile.outPath)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
