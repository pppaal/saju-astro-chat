import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { calculateSajuData } from '../src/lib/Saju/saju'
import { analyzeAdvancedSaju } from '../src/lib/Saju/astrologyengine'
import { analyzeRelations, toAnalyzeInputFromSaju } from '../src/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars } from '../src/lib/Saju/shinsal'
import {
  calculateNatalChart,
  calculateTransitChart,
  findMajorTransits,
  findNatalAspects,
  toChart,
} from '../src/lib/astrology'
import { calculateDestinyMatrix, FusionReportGenerator } from '../src/lib/destiny-matrix'
import {
  buildPhaseStrategyEngine,
  synthesizeMatrixSignals,
  STRATEGY_ENGINE_TUNING,
  type StrategyPhaseCode,
} from '../src/lib/destiny-matrix/ai-report'
import { mapMajorTransitsToActiveTransits } from '../src/lib/destiny-matrix/ai-report/transitMapping'

type WesternElement = 'fire' | 'earth' | 'air' | 'water'

type BatchProfile = {
  birthDate: string
  birthTime: string
  timezone: string
  latitude: number
  longitude: number
  gender: 'male' | 'female'
}

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

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(name)
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]
  return fallback
}

function parseIntArg(name: string, fallback: number): number {
  const raw = parseArg(name, String(fallback))
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function buildProfiles(samples: number, seed: number): BatchProfile[] {
  const rand = mulberry32(seed)
  const out: BatchProfile[] = []
  for (let i = 0; i < samples; i += 1) {
    const year = 1970 + Math.floor(rand() * 36) // 1970~2005
    const month = 1 + Math.floor(rand() * 12)
    const day = 1 + Math.floor(rand() * daysInMonth(year, month))
    const hour = Math.floor(rand() * 24)
    const minute = Math.floor(rand() * 60)
    out.push({
      birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      birthTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      gender: rand() > 0.5 ? 'male' : 'female',
    })
  }
  return out
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

function toPercentMap(counts: Record<string, number>, total: number) {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(counts)) {
    out[k] = total > 0 ? Math.round((v / total) * 1000) / 10 : 0
  }
  return out
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))
  return Math.round(sorted[idx] * 100) / 100
}

function summarize(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, p50: 0, p90: 0 }
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    p50: percentile(values, 0.5),
    p90: percentile(values, 0.9),
  }
}

type TuningSuggestion = {
  expansionMinExpansion: number
  expansionGuardedMinExpansion: number
  defensiveResetMaxExpansion: number
  defensiveResetMinVolatility: number
}

function suggestOnePassTuning(
  phaseCounts: Record<string, number>,
  vectorStats: any
): TuningSuggestion {
  const total = Object.values(phaseCounts).reduce((a, b) => a + b, 0) || 1
  const expansionRatio = (phaseCounts.expansion || 0) / total
  const resetRatio = (phaseCounts.defensive_reset || 0) / total
  const highTensionRatio = (phaseCounts.high_tension_expansion || 0) / total

  let expansionMinExpansion = STRATEGY_ENGINE_TUNING.vectorPhaseRules.expansion.minExpansion
  let expansionGuardedMinExpansion =
    STRATEGY_ENGINE_TUNING.vectorPhaseRules.expansionGuarded.minExpansion
  let defensiveResetMaxExpansion =
    STRATEGY_ENGINE_TUNING.vectorPhaseRules.defensiveReset.maxExpansion
  let defensiveResetMinVolatility =
    STRATEGY_ENGINE_TUNING.vectorPhaseRules.defensiveReset.minVolatility

  if (expansionRatio > 0.42) {
    expansionMinExpansion += 3
    expansionGuardedMinExpansion += 2
  } else if (expansionRatio < 0.22) {
    expansionMinExpansion -= 2
    expansionGuardedMinExpansion -= 1
  }

  if (resetRatio < 0.08 && vectorStats.volatility.mean >= 12) {
    defensiveResetMaxExpansion += 2
    defensiveResetMinVolatility -= 2
  } else if (resetRatio > 0.26) {
    defensiveResetMaxExpansion -= 2
    defensiveResetMinVolatility += 2
  }

  if (highTensionRatio > 0.18) {
    expansionMinExpansion += 1
  }

  return {
    expansionMinExpansion: Math.max(45, Math.min(75, expansionMinExpansion)),
    expansionGuardedMinExpansion: Math.max(35, Math.min(65, expansionGuardedMinExpansion)),
    defensiveResetMaxExpansion: Math.max(20, Math.min(50, defensiveResetMaxExpansion)),
    defensiveResetMinVolatility: Math.max(45, Math.min(80, defensiveResetMinVolatility)),
  }
}

function applySuggestedTuningToConfig(source: string, suggestion: TuningSuggestion): string {
  let next = source
  next = next.replace(
    /(expansion:\s*\{\s*minExpansion:\s*)[0-9.]+/m,
    `$1${suggestion.expansionMinExpansion}`
  )
  next = next.replace(
    /(expansionGuarded:\s*\{\s*minExpansion:\s*)[0-9.]+/m,
    `$1${suggestion.expansionGuardedMinExpansion}`
  )
  next = next.replace(
    /(defensiveReset:\s*\{\s*maxExpansion:\s*)[0-9.]+/m,
    `$1${suggestion.defensiveResetMaxExpansion}`
  )
  next = next.replace(
    /(defensiveReset:\s*\{\s*maxExpansion:\s*[0-9.]+,\s*minVolatility:\s*)[0-9.]+/m,
    `$1${suggestion.defensiveResetMinVolatility}`
  )
  return next
}

function readReportModelStatsFromReports(reportDir: string) {
  return readFile(path.join(reportDir, 'themed_report_1995-02-09_0640_ko.json'), 'utf8')
    .then((raw) => {
      const j = JSON.parse(raw)
      const model = String(j?.meta?.modelUsed || 'unknown')
      const fallback = model.includes('rewrite-fallback')
      return {
        sampleCount: 1,
        fallbackCount: fallback ? 1 : 0,
        fallbackRatePercent: fallback ? 100 : 0,
        models: { [model]: 1 },
      }
    })
    .catch(() => ({
      sampleCount: 0,
      fallbackCount: 0,
      fallbackRatePercent: 0,
      models: {},
    }))
}

async function main() {
  const samples = parseIntArg('--samples', 100)
  const seed = parseIntArg('--seed', 20260304)
  const apply = process.argv.includes('--apply')
  const outPath = parseArg('--out', 'reports/strategy_batch_eval_latest.json')

  const nowIso = new Date().toISOString()
  const profiles = buildProfiles(samples, seed)
  const transitChart = await calculateTransitChart({
    iso: nowIso,
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  })
  const generator = new FusionReportGenerator({
    lang: 'ko',
    maxTopInsights: 20,
    includeVisualizations: false,
    includeDetailedData: true,
    narrativeStyle: 'friendly',
  })

  const phaseCounts: Record<string, number> = {}
  const domainPhaseCounts: Record<string, Record<string, number>> = {}
  const overallAttack: number[] = []
  const overallExpansion: number[] = []
  const overallVolatility: number[] = []
  const overallStructure: number[] = []
  let processed = 0

  for (const profile of profiles) {
    try {
      const sajuData = calculateSajuData(
        profile.birthDate,
        profile.birthTime,
        profile.gender,
        'solar',
        profile.timezone
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

      const [year, month, date] = profile.birthDate.split('-').map((v) => Number(v))
      const [hour, minute] = profile.birthTime.split(':').map((v) => Number(v))
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
      const natalChart = toChart(natal)
      const natalAspects = findNatalAspects(natalChart, { includeMinor: true, maxResults: 80 })
      const majorTransits = findMajorTransits(transitChart, natalChart, 1.0).slice(0, 40)
      const activeTransits = mapMajorTransitsToActiveTransits(majorTransits, 8)

      const planetSigns: Record<string, string> = {}
      const planetHouses: Record<string, number> = {}
      for (const p of natal.planets) {
        planetSigns[p.name] = p.sign
        if (Number.isFinite(p.house)) planetHouses[p.name] = p.house
      }
      const dominantWesternElement = deriveDominantWesternElement(planetSigns)

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
            [
              sajuData.yearPillar,
              sajuData.monthPillar,
              sajuData.dayPillar,
              sajuData.timePillar,
            ].reduce<Record<string, number>>((acc, pillar) => {
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
        lang: 'ko',
        currentDateIso: nowIso.slice(0, 10),
      }

      const matrix = calculateDestinyMatrix(matrixInput)
      const layerResults = matrix.layers || matrix
      const baseReport = generator.generateReport(matrixInput, layerResults as any, undefined)
      const synthesis = synthesizeMatrixSignals({
        lang: 'ko',
        matrixReport: baseReport,
        matrixSummary: matrix.summary,
      })
      const strategy = buildPhaseStrategyEngine(synthesis, 'ko', {
        daeunActive: Boolean(matrixInput.currentDaeunElement),
        seunActive: Boolean(matrixInput.currentSaeunElement),
        activeTransitCount: activeTransits.length,
      })
      if (!strategy) continue

      phaseCounts[strategy.overallPhase] = (phaseCounts[strategy.overallPhase] || 0) + 1
      overallAttack.push(strategy.attackPercent)
      overallExpansion.push(strategy.vector.expansion)
      overallVolatility.push(strategy.vector.volatility)
      overallStructure.push(strategy.vector.structure)
      for (const d of strategy.domainStrategies) {
        if (!domainPhaseCounts[d.domain]) domainPhaseCounts[d.domain] = {}
        domainPhaseCounts[d.domain][d.phase] = (domainPhaseCounts[d.domain][d.phase] || 0) + 1
      }
      processed += 1
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn('[batch-eval] skipped profile due to error:', msg)
    }
  }

  const vectorStats = {
    expansion: summarize(overallExpansion),
    volatility: summarize(overallVolatility),
    structure: summarize(overallStructure),
  }
  const attackStats = summarize(overallAttack)
  const tuningSuggestion = suggestOnePassTuning(phaseCounts, vectorStats)

  const reportDir = path.dirname(path.resolve(outPath))
  const rewriteStats = await readReportModelStatsFromReports(path.resolve(reportDir))
  const result = {
    generatedAt: new Date().toISOString(),
    samplesRequested: samples,
    samplesProcessed: processed,
    seed,
    phaseCounts,
    phasePercent: toPercentMap(phaseCounts, processed),
    domainPhaseCounts,
    attackStats,
    vectorStats,
    rewriteModelStatsFromReports: rewriteStats,
    currentTuning: {
      expansionMinExpansion: STRATEGY_ENGINE_TUNING.vectorPhaseRules.expansion.minExpansion,
      expansionGuardedMinExpansion:
        STRATEGY_ENGINE_TUNING.vectorPhaseRules.expansionGuarded.minExpansion,
      defensiveResetMaxExpansion:
        STRATEGY_ENGINE_TUNING.vectorPhaseRules.defensiveReset.maxExpansion,
      defensiveResetMinVolatility:
        STRATEGY_ENGINE_TUNING.vectorPhaseRules.defensiveReset.minVolatility,
    },
    suggestedTuning: tuningSuggestion,
    applyRequested: apply,
  }

  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true })
  await writeFile(path.resolve(outPath), JSON.stringify(result, null, 2), 'utf8')
  console.log('[batch-eval] report:', path.resolve(outPath))
  console.log('[batch-eval] processed:', processed, '/', samples)
  console.log('[batch-eval] phasePercent:', JSON.stringify(result.phasePercent))
  console.log('[batch-eval] vectorStats:', JSON.stringify(vectorStats))
  console.log('[batch-eval] suggestedTuning:', JSON.stringify(tuningSuggestion))

  if (apply) {
    const cfgPath = path.resolve('src/lib/destiny-matrix/ai-report/strategyEngineConfig.ts')
    const source = await readFile(cfgPath, 'utf8')
    const next = applySuggestedTuningToConfig(source, tuningSuggestion)
    if (next !== source) {
      await writeFile(cfgPath, next, 'utf8')
      console.log('[batch-eval] applied suggested tuning to:', cfgPath)
    } else {
      console.log('[batch-eval] no config changes needed')
    }
  }
}

main().catch((error) => {
  console.error('[batch-eval] failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
