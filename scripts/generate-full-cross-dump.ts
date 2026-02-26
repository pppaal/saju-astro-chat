// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'

import {
  calculateDestinyMatrix,
  FusionReportGenerator,
  buildGraphRAGEvidence,
  summarizeGraphRAGEvidence,
} from '@/lib/destiny-matrix'

const INPUT_JSON = path.join(process.cwd(), 'reports', '1995-02-09_0640_seoul_gpt_input.json')
const OUT_MD = path.join(process.cwd(), 'reports', '1995-02-09_0640_seoul_FULL_CROSS_DUMP.md')
const OUT_JSON = path.join(process.cwd(), 'reports', '1995-02-09_0640_seoul_FULL_CROSS_DUMP.json')

const GEOKGUK_ALIASES: Record<string, string> = {
  정관격: 'jeonggwan',
  편관격: 'pyeongwan',
  정인격: 'jeongin',
  편인격: 'pyeongin',
  식신격: 'siksin',
  상관격: 'sanggwan',
  정재격: 'jeongjae',
  편재격: 'pyeonjae',
  건록격: 'geonrok',
  양인격: 'yangin',
  종아격: 'jonga',
  종재격: 'jongjae',
  종살격: 'jongsal',
  종강격: 'jonggang',
}

const ZODIAC_EN_TO_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

const WESTERN_ELEMENT_EN_TO_LOWER: Record<string, string> = {
  Fire: 'fire',
  Earth: 'earth',
  Air: 'air',
  Water: 'water',
}

const ASPECT_ANGLE_BY_TYPE: Record<string, number> = {
  conjunction: 0,
  opposition: 180,
  trine: 120,
  square: 90,
  sextile: 60,
  quincunx: 150,
  semisextile: 30,
  quintile: 72,
  biquintile: 144,
}

const SIGN_TO_WESTERN_ELEMENT: Record<string, string> = {
  Aries: 'fire',
  Taurus: 'earth',
  Gemini: 'air',
  Cancer: 'water',
  Leo: 'fire',
  Virgo: 'earth',
  Libra: 'air',
  Scorpio: 'water',
  Sagittarius: 'fire',
  Capricorn: 'earth',
  Aquarius: 'air',
  Pisces: 'water',
}

function safe(v: unknown, fallback = '-'): string {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function readInput(): any {
  return JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8'))
}

function buildMatrixInput(d: any): any {
  const saju = d.saju || {}
  const astro = d.astrology || {}
  const natal = astro.natalData || {}

  const pillarElements = [
    saju?.yearPillar?.heavenlyStem?.element,
    saju?.yearPillar?.earthlyBranch?.element,
    saju?.monthPillar?.heavenlyStem?.element,
    saju?.monthPillar?.earthlyBranch?.element,
    saju?.dayPillar?.heavenlyStem?.element,
    saju?.dayPillar?.earthlyBranch?.element,
    saju?.timePillar?.heavenlyStem?.element,
    saju?.timePillar?.earthlyBranch?.element,
  ].filter(Boolean)

  const relations = Array.isArray(saju?.relations)
    ? saju.relations.map((r: any) => ({
        kind: r.kind,
        pillars: Array.isArray(r.pillars) ? r.pillars : [],
        detail: r.detail,
      }))
    : []

  const inferredSibsinDistribution: Record<string, number> = {}
  for (const pillar of [saju?.yearPillar, saju?.monthPillar, saju?.dayPillar, saju?.timePillar]) {
    const cheon = pillar?.heavenlyStem?.sibsin
    const ji = pillar?.earthlyBranch?.sibsin
    if (cheon) inferredSibsinDistribution[cheon] = (inferredSibsinDistribution[cheon] || 0) + 1
    if (ji) inferredSibsinDistribution[ji] = (inferredSibsinDistribution[ji] || 0) + 1
  }
  const baseSibsin = saju?.sibsinDistribution || {}
  const baseSibsinKeys = Object.keys(baseSibsin)
  const baseSibsinTotal = baseSibsinKeys.reduce((s, k) => s + (Number(baseSibsin[k]) || 0), 0)
  const sibsinDistribution =
    baseSibsinKeys.length >= 2 && baseSibsinTotal >= 3 ? baseSibsin : inferredSibsinDistribution

  const planetHouses = Object.fromEntries(
    (Array.isArray(natal?.planets) ? natal.planets : [])
      .filter((p: any) => typeof p.name === 'string' && typeof p.house === 'number')
      .map((p: any) => [p.name, p.house])
  )

  const planetSigns = Object.fromEntries(
    (Array.isArray(natal?.planets) ? natal.planets : [])
      .filter((p: any) => typeof p.name === 'string' && typeof p.sign === 'string')
      .map((p: any) => [p.name, ZODIAC_EN_TO_KO[p.sign] || p.sign])
  )

  const aspects = (Array.isArray(astro?.natalAspects) ? astro.natalAspects : [])
    .map((a: any) => ({
      planet1: a?.from?.name,
      planet2: a?.to?.name,
      type: a?.type,
      orb: typeof a?.orb === 'number' ? a.orb : undefined,
      angle:
        typeof a?.angle === 'number'
          ? a.angle
          : typeof a?.type === 'string'
            ? ASPECT_ANGLE_BY_TYPE[a.type.toLowerCase()]
            : undefined,
    }))
    .filter(
      (a: any) =>
        typeof a.planet1 === 'string' &&
        typeof a.planet2 === 'string' &&
        typeof a.type === 'string' &&
        [
          'conjunction',
          'opposition',
          'trine',
          'square',
          'sextile',
          'quincunx',
          'semisextile',
          'quintile',
          'biquintile',
        ].includes(a.type)
    )

  const shinsalList = Array.from(
    new Set(
      (Array.isArray(saju?.shinsalHits) ? saju.shinsalHits : [])
        .map((x: any) => x?.kind)
        .filter(Boolean)
    )
  )

  const asteroids = astro?.asteroids || []
  const asteroidHouses = Object.fromEntries(
    (Array.isArray(asteroids) ? asteroids : [])
      .filter((a: any) => typeof a.name === 'string' && typeof a.house === 'number')
      .map((a: any) => [a.name, a.house])
  )

  const extraPointsObj = astro?.extraPoints || {}
  const extraPoints = Array.isArray(extraPointsObj)
    ? extraPointsObj
    : ['chiron', 'lilith', 'partOfFortune', 'vertex', 'northNode', 'southNode']
        .map((k) => extraPointsObj[k])
        .filter(Boolean)
  const extraPointNameMap: Record<string, string> = {
    Chiron: 'Chiron',
    Lilith: 'Lilith',
    'Part of Fortune': 'PartOfFortune',
    Vertex: 'Vertex',
    'True Node': 'NorthNode',
    'South Node': 'SouthNode',
    NorthNode: 'NorthNode',
    SouthNode: 'SouthNode',
  }
  const extraPointSigns = Object.fromEntries(
    extraPoints
      .filter((p: any) => p?.name && p?.sign)
      .map((p: any) => [extraPointNameMap[p.name] || p.name, ZODIAC_EN_TO_KO[p.sign] || p.sign])
      .filter(([k]: any) =>
        ['Chiron', 'Lilith', 'PartOfFortune', 'Vertex', 'NorthNode', 'SouthNode'].includes(k)
      )
  )

  const dominantWesternElementFromSigns = (() => {
    const counts: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 }
    for (const p of Array.isArray(natal?.planets) ? natal.planets : []) {
      const e = SIGN_TO_WESTERN_ELEMENT[p?.sign]
      if (e) counts[e] += 1
    }
    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [undefined])[0]
  })()

  return {
    dayMasterElement: saju?.dayMaster?.element || '금',
    pillarElements,
    sibsinDistribution,
    twelveStages: {},
    relations,
    geokguk: GEOKGUK_ALIASES[saju?.advanced?.geokguk?.type] || undefined,
    yongsin: saju?.advanced?.yongsin?.primary || undefined,
    currentDaeunElement: saju?.daeWoon?.current?.element || undefined,
    currentSaeunElement: saju?.unse?.annual?.[0]?.element || undefined,
    shinsalList,

    dominantWesternElement:
      WESTERN_ELEMENT_EN_TO_LOWER[astro?.elementSummary?.dominantElement] ||
      dominantWesternElementFromSigns ||
      undefined,
    planetHouses,
    planetSigns,
    aspects,
    activeTransits: [],
    asteroidHouses,
    extraPointSigns,

    lang: 'ko',
    profileContext: d.profile || {},
  }
}

function extractLayerCells(layerData: Record<string, unknown>) {
  const cells: Record<string, unknown> = {}
  for (const [cellKey, cellData] of Object.entries(layerData || {})) {
    if (cellData && typeof cellData === 'object') {
      if ((cellData as any).interaction) {
        cells[cellKey] = cellData
      } else {
        for (const [colKey, interaction] of Object.entries(cellData as Record<string, unknown>)) {
          if (interaction && typeof interaction === 'object' && (interaction as any).level) {
            cells[`${cellKey}_${colKey}`] = { interaction }
          }
        }
      }
    }
  }
  return cells
}

function run(): void {
  const source = readInput()
  const matrixInput = buildMatrixInput(source)
  const matrix = calculateDestinyMatrix(matrixInput)

  const layerResults = {
    layer1: extractLayerCells(matrix.layer1_elementCore as any),
    layer2: extractLayerCells(matrix.layer2_sibsinPlanet as any),
    layer3: extractLayerCells(matrix.layer3_sibsinHouse as any),
    layer4: extractLayerCells(matrix.layer4_timing as any),
    layer5: extractLayerCells(matrix.layer5_relationAspect as any),
    layer6: extractLayerCells(matrix.layer6_stageHouse as any),
    layer7: extractLayerCells(matrix.layer7_advanced as any),
    layer8: extractLayerCells(matrix.layer8_shinsalPlanet as any),
    layer9: extractLayerCells(matrix.layer9_asteroidHouse as any),
    layer10: extractLayerCells(matrix.layer10_extraPointElement as any),
  }

  const generator = new FusionReportGenerator({
    lang: 'ko',
    maxTopInsights: 10,
    includeVisualizations: false,
    includeDetailedData: true,
    narrativeStyle: 'friendly',
  })
  const baseReport = generator.generateReport(matrixInput, layerResults as any)
  const graph = buildGraphRAGEvidence(matrixInput, baseReport, { mode: 'comprehensive' })

  const dump = {
    generatedAt: new Date().toISOString(),
    profile: source.profile,
    matrixInput,
    matrixSummary: matrix.summary,
    layerResults,
    topInsights: baseReport.topInsights,
    graphRagEvidence: graph,
    graphRagEvidenceSummary: summarizeGraphRAGEvidence(graph),
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2), 'utf8')

  const lines: string[] = []
  lines.push('# FULL CROSS DUMP (사주 + 점성 + 교차 전체)')
  lines.push('')
  lines.push(`- Generated: ${dump.generatedAt}`)
  lines.push(
    `- Source profile: ${safe(source?.profile?.birthDate)} ${safe(source?.profile?.birthTime)} ${safe(source?.profile?.birthCity)}`
  )
  lines.push('')
  lines.push('## 1) 사주 원본')
  lines.push('```json')
  lines.push(JSON.stringify(source.saju || {}, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('## 2) 점성 원본')
  lines.push('```json')
  lines.push(JSON.stringify(source.astrology || {}, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('## 3) 교차 매트릭스 입력')
  lines.push('```json')
  lines.push(JSON.stringify(matrixInput, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('## 4) 교차 매트릭스 요약')
  lines.push('```json')
  lines.push(JSON.stringify(matrix.summary || {}, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('## 5) 레이어별 교차 셀 전체')
  lines.push('```json')
  lines.push(JSON.stringify(layerResults, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('## 6) GraphRAG 교차 근거 전체 (X1~Xn)')
  lines.push('```json')
  lines.push(JSON.stringify(graph, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('## 7) 파일 포인터')
  lines.push(`- JSON full dump: \`${path.relative(process.cwd(), OUT_JSON)}\``)
  lines.push(`- MD full dump: \`${path.relative(process.cwd(), OUT_MD)}\``)
  lines.push('')

  fs.writeFileSync(OUT_MD, lines.join('\n') + '\n', 'utf8')
  console.log(`Saved: ${OUT_JSON}`)
  console.log(`Saved: ${OUT_MD}`)
}

run()
