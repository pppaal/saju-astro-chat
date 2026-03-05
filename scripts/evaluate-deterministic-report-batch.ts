import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { generateAIPremiumReport } from '../src/lib/destiny-matrix/ai-report/aiReportService'
import type { MatrixCalculationInput, MatrixSummary } from '../src/lib/destiny-matrix/types'
import type { FusionReport } from '../src/lib/destiny-matrix/interpreter/types'
import type { FiveElement } from '../src/lib/Saju/types'

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx < 0) return undefined
  return process.argv[idx + 1]
}

function parseNum(value: string | undefined, fallback: number): number {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return fallback
  return Math.floor(num)
}

function mkInput(seed: number): MatrixCalculationInput {
  const dm: FiveElement[] = ['목', '화', '토', '금', '수'] as FiveElement[]
  return {
    dayMasterElement: dm[seed % dm.length],
    pillarElements: [
      dm[(seed + 1) % 5],
      dm[(seed + 2) % 5],
      dm[(seed + 3) % 5],
      dm[(seed + 4) % 5],
    ],
    sibsinDistribution: { 편재: (seed % 3) + 1, 상관: (seed % 2) + 1 } as any,
    twelveStages: { year: '건록', month: '제왕', day: '쇠', hour: '양' } as any,
    relations: ['충', '합', '형'].slice(0, (seed % 3) + 1) as any,
    dominantWesternElement: seed % 2 === 0 ? 'air' : 'earth',
    planetHouses: { Sun: 1, Moon: 4, Mars: 7, Jupiter: 10 } as any,
    planetSigns: { Sun: 'Aquarius', Moon: 'Gemini', Mars: 'Leo' } as any,
    aspects: [
      { planet1: 'Sun', planet2: 'Mars', type: 'opposition', orb: 2.1 },
      { planet1: 'Moon', planet2: 'Saturn', type: 'square', orb: 1.2 },
    ],
    activeTransits: seed % 2 === 0 ? ['saturnReturn', 'jupiterReturn'] : ['mercuryRetrograde'],
    geokguk: '정관격',
    yongsin: dm[(seed + 2) % 5],
    currentDaeunElement: dm[(seed + 3) % 5],
    currentSaeunElement: dm[(seed + 4) % 5],
    shinsalList: ['천을귀인', '문창귀인', '역마'] as any,
    lang: 'ko',
  } as MatrixCalculationInput
}

function mkReport(seed: number): FusionReport {
  return {
    id: `batch_${seed}`,
    generatedAt: new Date(),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '목' as FiveElement,
      dayMasterDescription: 'wood',
      dominantSibsin: [],
      keyShinsals: [],
    },
    overallScore: {
      total: 65 + (seed % 30),
      grade: seed % 3 === 0 ? 'A' : 'B',
      gradeDescription: 'stable',
      gradeDescriptionEn: 'stable',
      categoryScores: { strength: 76, opportunity: 74, balance: 70, caution: 48, challenge: 42 },
    },
    topInsights: [
      {
        id: `career_${seed}`,
        domain: 'career',
        category: 'strength',
        title: `Career momentum ${seed}`,
        titleEn: `Career momentum ${seed}`,
        description: 'career focus',
        descriptionEn: 'career focus',
        score: 78 + (seed % 10),
        rawScore: 78 + (seed % 10),
        weightedScore: 78 + (seed % 10),
        confidence: 0.8,
        priority: 'high',
        actionItems: [],
        icon: 'briefcase',
        colorCode: 'blue',
        sources: [],
      } as any,
      {
        id: `rel_${seed}`,
        domain: 'relationship',
        category: seed % 2 === 0 ? 'caution' : 'balance',
        title: `Relationship pattern ${seed}`,
        titleEn: `Relationship pattern ${seed}`,
        description: 'relationship flow',
        descriptionEn: 'relationship flow',
        score: 68 + (seed % 8),
        rawScore: 68 + (seed % 8),
        weightedScore: 68 + (seed % 8),
        confidence: 0.75,
        priority: 'medium',
        actionItems: [],
        icon: 'heart',
        colorCode: 'rose',
        sources: [],
      } as any,
    ],
    domainAnalysis: [],
    timingAnalysis: {
      currentPeriod: {
        name: 'now',
        nameEn: 'now',
        score: 70 + (seed % 12),
        description: 'timing',
        descriptionEn: 'timing',
      },
      activeTransits: [],
      upcomingPeriods: [],
      retrogradeAlerts: [],
    },
    visualizations: {
      radarChart: { labels: [], labelsEn: [], values: [], maxValue: 100 },
      heatmap: { rows: [], cols: [], values: [], colorScale: [] },
      synergyNetwork: { nodes: [], edges: [] },
      timeline: { events: [] },
    },
  }
}

function mkSummary(seed: number): MatrixSummary {
  const n = seed % 5
  return {
    totalScore: 68 + (seed % 24),
    strengthPoints: [
      {
        layer: 6,
        rowKey: `임관_${seed}`,
        colKey: 'H10',
        cell: {
          interaction: {
            level: 'amplify',
            score: 10 - (n % 2),
            icon: 'x',
            colorCode: 'green',
            keyword: `career peak ${seed}`,
            keywordEn: `career peak ${seed}`,
          },
          sajuBasis: '십이운성 임관',
          astroBasis: 'Jupiter in H10',
          advice: '핵심 과제를 먼저 완결하세요.',
        },
      },
      {
        layer: 2,
        rowKey: `편재_${seed}`,
        colKey: 'Jupiter',
        cell: {
          interaction: {
            level: 'amplify',
            score: 8 - (n % 2),
            icon: 'x',
            colorCode: 'green',
            keyword: `wealth gate ${seed}`,
            keywordEn: `wealth gate ${seed}`,
          },
          sajuBasis: '십신 편재',
          astroBasis: 'Jupiter support',
          advice: '현금흐름 점검 후 확정하세요.',
        },
      },
      {
        layer: 3,
        rowKey: `식신_${seed}`,
        colKey: 'H7',
        cell: {
          interaction: {
            level: 'amplify',
            score: 8,
            icon: 'x',
            colorCode: 'green',
            keyword: `relationship drive ${seed}`,
            keywordEn: `relationship drive ${seed}`,
          },
          sajuBasis: '십신 식신',
          astroBasis: 'Mars in H7',
          advice: '대화 속도를 조절하세요.',
        },
      },
    ] as any,
    cautionPoints: [
      {
        layer: 5,
        rowKey: `충_${seed}`,
        colKey: 'square',
        cell: {
          interaction: {
            level: 'caution',
            score: 2 + (n % 3),
            icon: 'x',
            colorCode: 'red',
            keyword: `friction ${seed}`,
            keywordEn: `friction ${seed}`,
          },
          sajuBasis: '천간충',
          astroBasis: 'Moon-Pluto opposition',
          advice: '확정 전 재확인하세요.',
        },
      },
      {
        layer: 1,
        rowKey: `상관_${seed}`,
        colKey: 'Saturn',
        cell: {
          interaction: {
            level: 'caution',
            score: 3 + (n % 2),
            icon: 'x',
            colorCode: 'red',
            keyword: `pressure ${seed}`,
            keywordEn: `pressure ${seed}`,
          },
          sajuBasis: '십신 상관',
          astroBasis: 'Saturn in H1',
          advice: '속도보다 순서를 지키세요.',
        },
      },
    ] as any,
    balancePoints: [
      {
        layer: 4,
        rowKey: `대운_${seed}`,
        colKey: 'transit',
        cell: {
          interaction: {
            level: 'balance',
            score: 6,
            icon: 'x',
            colorCode: 'blue',
            keyword: `timing ${seed}`,
            keywordEn: `timing ${seed}`,
          },
          sajuBasis: '대운 전환',
          astroBasis: 'current transit',
          advice: '결정과 확정을 분리하세요.',
        },
      },
      {
        layer: 3,
        rowKey: `정인_${seed}`,
        colKey: 'H6',
        cell: {
          interaction: {
            level: 'balance',
            score: 6,
            icon: 'x',
            colorCode: 'blue',
            keyword: `health routine ${seed}`,
            keywordEn: `health routine ${seed}`,
          },
          sajuBasis: '십신 정인',
          astroBasis: 'Moon in H6',
          advice: '회복 루틴을 고정하세요.',
        },
      },
    ] as any,
    topSynergies: [],
  }
}

async function run() {
  const samples = parseNum(argValue('--samples'), 240)
  const out = resolve(
    process.cwd(),
    argValue('--out') || 'reports/quality/deterministic_batch_eval.json'
  )
  const rows: Array<{
    seed: number
    modelUsed: string
    quality: any
  }> = []

  for (let seed = 0; seed < samples; seed += 1) {
    const report = await generateAIPremiumReport(mkInput(seed), mkReport(seed), {
      lang: 'ko',
      deterministicOnly: true,
      matrixSummary: mkSummary(seed),
      name: `batch-${seed}`,
      birthDate: `199${seed % 10}-02-09`,
    })
    rows.push({
      seed,
      modelUsed: report.meta.modelUsed,
      quality: report.meta.qualityMetrics || null,
    })
  }

  const valid = rows.filter((row) => row.quality)
  const avg = (key: keyof NonNullable<(typeof valid)[number]['quality']>) =>
    valid.length === 0
      ? 0
      : Number(
          (
            valid.reduce((acc, row) => acc + Number(row.quality?.[key] || 0), 0) / valid.length
          ).toFixed(4)
        )
  const summary = {
    samples,
    evaluated: valid.length,
    averages: {
      avgSectionChars: avg('avgSectionChars'),
      evidenceCoverageRatio: avg('evidenceCoverageRatio'),
      minEvidenceSatisfiedRatio: avg('minEvidenceSatisfiedRatio'),
      recheckGuidanceRatio: avg('recheckGuidanceRatio'),
      contradictionCount: avg('contradictionCount'),
      overclaimCount: avg('overclaimCount'),
    },
    thresholds: {
      evidenceCoverageRatio: 0.8,
      minEvidenceSatisfiedRatio: 0.95,
      contradictionCountMax: 0.0,
      overclaimCountMax: 0.0,
    },
  }

  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(
    out,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        rows,
      },
      null,
      2
    ),
    'utf-8'
  )

  console.log(JSON.stringify({ out, summary }, null, 2))
}

run().catch((error) => {
  console.error('[eval:deterministic:batch] failed', error)
  process.exit(1)
})
