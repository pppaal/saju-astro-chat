import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { calculateSajuData } from '../src/lib/Saju/saju'
import { analyzeAdvancedSaju } from '../src/lib/Saju/astrologyengine'
import { analyzeRelations, toAnalyzeInputFromSaju } from '../src/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars } from '../src/lib/Saju/shinsal'
import { calculateNatalChart, toChart, findNatalAspects } from '../src/lib/astrology'
import { buildCoreEnvelope } from '../src/lib/destiny-matrix/core/buildCoreEnvelope'
import { adaptCoreToCounselor } from '../src/lib/destiny-matrix/core/adapters'
import { sanitizeCounselorFreeText } from '../src/lib/destiny-matrix/counselorEvidenceSanitizer'

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
  const entries = Object.entries(layer as Record<string, unknown>)
  const looksLikeFlatCellMap = entries.some(
    ([, value]) => cellScore(value) > 0 || !!(value as any)?.interaction
  )
  if (looksLikeFlatCellMap) {
    let totalCells = 0
    let nonZeroCells = 0
    const scored: Array<{ rowKey: string; colKey: string; score: number; keyword?: string }> = []
    for (const [cellKey, cell] of entries) {
      totalCells += 1
      const score = cellScore(cell)
      if (score > 0) {
        nonZeroCells += 1
        const [rowKey, ...rest] = cellKey.split('_')
        const colKey = rest.join('_') || cellKey
        const keyword =
          typeof (cell as { interaction?: { keyword?: unknown } }).interaction?.keyword === 'string'
            ? ((cell as { interaction?: { keyword?: string } }).interaction?.keyword ?? undefined)
            : undefined
        scored.push({ rowKey, colKey, score, ...(keyword ? { keyword } : {}) })
      }
    }
    scored.sort((a, b) => b.score - a.score)
    return {
      totalCells,
      nonZeroCells,
      topCells: scored.slice(0, 10),
    }
  }
  let totalCells = 0
  let nonZeroCells = 0
  const scored: Array<{ rowKey: string; colKey: string; score: number; keyword?: string }> = []
  for (const [rowKey, row] of entries) {
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

function pickComputedLayer(matrix: any, ...keys: string[]) {
  for (const key of keys) {
    if (matrix && matrix[key] && typeof matrix[key] === 'object') {
      return matrix[key]
    }
  }
  return undefined
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

function mergeLayerStatsWithSummaryEvidence(
  layerStats: Record<string, { totalCells: number; nonZeroCells: number; topCells: any[] }>,
  layerEvidenceFromSummary: Record<
    string,
    { count: number; samples: Array<{ rowKey: string; colKey: string; score?: number }> }
  >
) {
  const merged: typeof layerStats = { ...layerStats }
  for (const [layerKey, evidence] of Object.entries(layerEvidenceFromSummary)) {
    const current = merged[layerKey]
    if (!current) continue
    if (current.nonZeroCells > 0) continue
    merged[layerKey] = {
      totalCells: Math.max(current.totalCells, evidence.count),
      nonZeroCells: evidence.count,
      topCells: evidence.samples.map((sample) => ({
        rowKey: sample.rowKey,
        colKey: sample.colKey,
        score: sample.score ?? 0,
      })),
    }
  }
  return merged
}

function mapSummaryDomainKey(domain: string): string {
  if (domain === 'love') return 'relationship'
  if (domain === 'money') return 'wealth'
  return domain
}

function deriveFocusDomainFromSummary(summary: any): string | null {
  const domainScores = summary?.domainScores
  if (!domainScores || typeof domainScores !== 'object') return null
  const ranked = Object.values(domainScores)
    .filter((item): item is any => !!item && typeof item === 'object')
    .sort((a, b) => (Number(b.finalScoreAdjusted) || 0) - (Number(a.finalScoreAdjusted) || 0))
  if (!ranked[0]?.domain) return null
  return mapSummaryDomainKey(String(ranked[0].domain))
}

function deriveActionFocusDomainFromSummary(summary: any): string | null {
  const timelineByDomain = summary?.overlapTimelineByDomain
  if (!timelineByDomain || typeof timelineByDomain !== 'object') return null
  const ranked = Object.entries(timelineByDomain)
    .map(([domain, points]) => {
      const top = Array.isArray(points)
        ? points.slice(0, 4).reduce((best, item) => {
            const score = Number(item?.overlapStrength || 0)
            return score > best ? score : best
          }, 0)
        : 0
      return { domain: mapSummaryDomainKey(domain), score: top }
    })
    .sort((a, b) => b.score - a.score)
  return ranked[0]?.domain || null
}

function deriveTopScenarios(summary: any): string[] {
  const signals = Array.isArray(summary?.calendarSignals) ? summary.calendarSignals : []
  return signals
    .map((item) => String(item?.trigger || '').trim())
    .filter(Boolean)
    .slice(0, 5)
}

function sanitizeSingleSubjectView(view: any) {
  if (!view || typeof view !== 'object') return view
  const polish = (text: string) =>
    sanitizeCounselorFreeText(text, 'ko')
      .split('첫 단계 이후에도 흐름이 꺾이지 않을 것')
      .join('첫 단계 이후에도 흐름이 꺾이지 않는지 확인해야 합니다.')
      .replace(
        /첫 단계 이후에도 흐름이 꺾이지 않을 것/g,
        '첫 단계 이후에도 흐름이 꺾이지 않는지 확인해야 합니다.'
      )
      .replace(
        /첫 단계 이후에도 흐름이 꺾이지 않는지 확인할 것/g,
        '첫 단계 이후에도 흐름이 꺾이지 않는지 확인해야 합니다.'
      )
      .replace(/핵심 근거가 계속 살아 있을 것/g, '핵심 근거가 계속 살아 있어야 합니다.')
      .replace(
        /핵심 근거가 계속 살아 있을 것,?\s*시나리오 확률/gi,
        '핵심 근거가 계속 살아 있고, 시나리오 확률'
      )
      .replace(/대운,\s*세운가 겹치며/g, '대운과 세운 흐름이 겹치며')
      .replace(/대운,\s*세운,\s*이 겹치며/g, '대운과 세운 흐름이 겹치며')
      .trim()
  return {
    ...view,
    directAnswer: polish(view.directAnswer || ''),
    nextMove: polish(view.nextMove || ''),
    entryConditions: Array.isArray(view.entryConditions)
      ? view.entryConditions.map((item: string) => polish(item))
      : [],
    abortConditions: Array.isArray(view.abortConditions)
      ? view.abortConditions.map((item: string) => polish(item))
      : [],
    actionAxis: view.actionAxis
      ? {
          ...view.actionAxis,
          nowAction: polish(view.actionAxis.nowAction || ''),
          whyThisFirst: polish(view.actionAxis.whyThisFirst || ''),
        }
      : view.actionAxis,
    riskAxis: view.riskAxis
      ? {
          ...view.riskAxis,
          warning: polish(view.riskAxis.warning || ''),
          hardStops: Array.isArray(view.riskAxis.hardStops)
            ? view.riskAxis.hardStops.map((item: string) => polish(item))
            : [],
        }
      : view.riskAxis,
    timingState: view.timingState
      ? {
          ...view.timingState,
          whyNow: polish(view.timingState.whyNow || ''),
          whyNotYet: polish(view.timingState.whyNotYet || ''),
          windows: Array.isArray(view.timingState.windows)
            ? view.timingState.windows.map((item: any) => ({
                ...item,
                summary: polish(item.summary || ''),
              }))
            : [],
        }
      : view.timingState,
    branches: Array.isArray(view.branches)
      ? view.branches.map((branch: any) => ({
          ...branch,
          summary: polish(branch.summary || ''),
          entryConditions: Array.isArray(branch.entryConditions)
            ? branch.entryConditions.map((item: string) => polish(item))
            : [],
          abortConditions: Array.isArray(branch.abortConditions)
            ? branch.abortConditions.map((item: string) => polish(item))
            : [],
          nextMove: polish(branch.nextMove || ''),
        }))
      : [],
  }
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

  const envelope = buildCoreEnvelope({
    mode: 'themed',
    lang: 'ko',
    matrixInput,
  })
  const matrix: any = envelope.matrix
  const counselorCore = adaptCoreToCounselor(envelope.coreSeed, 'ko')
  const layerEvidenceFromSummary = buildLayerEvidenceFromSummary(matrix.summary)
  const layerStats = mergeLayerStatsWithSummaryEvidence(
    {
      layer1: analyzeLayer(pickComputedLayer(matrix, 'layer1', 'layer1_elementCore')),
      layer2: analyzeLayer(pickComputedLayer(matrix, 'layer2', 'layer2_sibsinPlanet')),
      layer3: analyzeLayer(pickComputedLayer(matrix, 'layer3', 'layer3_sibsinHouse')),
      layer4: analyzeLayer(pickComputedLayer(matrix, 'layer4', 'layer4_timing')),
      layer5: analyzeLayer(pickComputedLayer(matrix, 'layer5', 'layer5_relationAspect')),
      layer6: analyzeLayer(pickComputedLayer(matrix, 'layer6', 'layer6_stageHouse')),
      layer7: analyzeLayer(pickComputedLayer(matrix, 'layer7', 'layer7_advanced')),
      layer8: analyzeLayer(pickComputedLayer(matrix, 'layer8', 'layer8_shinsalPlanet')),
      layer9: analyzeLayer(pickComputedLayer(matrix, 'layer9', 'layer9_asteroidHouse')),
      layer10: analyzeLayer(pickComputedLayer(matrix, 'layer10', 'layer10_extraPointElement')),
    },
    layerEvidenceFromSummary
  )

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
    alignmentScore: matrix.summary?.alignmentScore ?? null,
    confidenceScore: matrix.summary?.confidenceScore ?? null,
    crossAgreement:
      counselorCore.singleSubjectView?.reliability?.crossAgreement ??
      matrix.summary?.alignmentScore ??
      null,
    focusDomain:
      counselorCore.focusDomain ||
      counselorCore.singleSubjectView?.structureAxis?.domain ||
      deriveFocusDomainFromSummary(matrix.summary),
    actionFocusDomain:
      counselorCore.actionFocusDomain ||
      counselorCore.singleSubjectView?.actionAxis?.domain ||
      deriveActionFocusDomainFromSummary(matrix.summary),
    topDecision: counselorCore.topDecisionLabel || null,
    topDecisionAction: counselorCore.topDecisionAction || null,
    topScenarios: deriveTopScenarios(matrix.summary),
    sajuSummary: {
      dayMaster: saju.dayPillar?.heavenlyStem?.name || null,
      dayMasterElement: saju.dayPillar?.heavenlyStem?.element || null,
      dayPillar:
        `${saju.dayPillar?.heavenlyStem?.name || ''}${saju.dayPillar?.earthlyBranch?.name || ''}` ||
        null,
      geokguk: advanced.geokguk?.type || null,
      yongsin: advanced.yongsin?.primary || null,
    },
    westernSummary: {
      dominantElement: matrixInput.dominantWesternElement || null,
      sunSign: planetSigns.Sun || null,
      moonSign: planetSigns.Moon || null,
      jupiterHouse: planetHouses.Jupiter || null,
    },
    singleSubjectView: sanitizeSingleSubjectView(counselorCore.singleSubjectView) || null,
    personModel: counselorCore.personModel || null,
    layerStats,
    layerEvidenceFromSummary,
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
