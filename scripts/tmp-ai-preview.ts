import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

function createMockInput() {
  return {
    dayMasterElement: '목',
    pillarElements: ['목', '화', '토', '금'],
    sibsinDistribution: { 비견: 2, 편재: 3, 정관: 1 },
    twelveStages: {},
    relations: [],
    dominantWesternElement: 'earth',
    planetHouses: { Sun: 1, Moon: 4, Mars: 7, Jupiter: 10 },
    planetSigns: { Sun: 'Aquarius', Moon: 'Gemini', Mars: 'Gemini', Jupiter: 'Leo' },
    aspects: [
      { planet1: 'Sun', planet2: 'Mars', type: 'opposition', orb: 2.1 },
      { planet1: 'Moon', planet2: 'Saturn', type: 'square', orb: 1.2 },
    ],
    activeTransits: ['saturnReturn', 'jupiterReturn'],
    geokguk: 'jeonggwan',
    yongsin: '화',
    currentDaeunElement: '화',
    currentSaeunElement: '목',
    lang: 'ko',
    profileContext: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      birthCity: 'Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      timezone: 'Asia/Seoul',
      houseSystem: 'placidus',
    },
  }
}

function createMockReport() {
  return {
    id: 'report_live_preview',
    generatedAt: new Date(),
    version: '2.0.0',
    lang: 'ko',
    profile: {
      dayMasterElement: '목',
      dayMasterDescription: 'wood',
      dominantSibsin: [],
      keyShinsals: [],
    },
    overallScore: {
      total: 82,
      grade: 'A',
      gradeDescription: 'good',
      gradeDescriptionEn: 'good',
      categoryScores: { strength: 84, opportunity: 81, balance: 80, caution: 70, challenge: 65 },
    },
    topInsights: [
      {
        id: 'i1',
        domain: 'career',
        category: 'strength',
        title: 'Career Expansion',
        description: 'growth momentum',
        score: 88,
        weightedScore: 88,
        confidence: 0.8,
        actionItems: [],
        sources: [
          {
            layer: 4,
            row: 'daeunTransition',
            col: 'saturnReturn',
            contribution: 0.4,
            sajuFactor: 'pattern',
            astroFactor: 'Saturn',
          },
        ],
      },
      {
        id: 'i2',
        domain: 'relationship',
        category: 'caution',
        title: 'Relationship Adjustment',
        description: 'communication reset',
        score: 74,
        weightedScore: 74,
        confidence: 0.7,
        actionItems: [],
        sources: [],
      },
      {
        id: 'i3',
        domain: 'wealth',
        category: 'strength',
        title: 'Wealth Timing Window',
        description: 'cashflow optimization',
        score: 79,
        weightedScore: 79,
        confidence: 0.72,
        actionItems: [],
        sources: [],
      },
    ],
    domainAnalysis: [
      { domain: 'career', score: 83 },
      { domain: 'relationship', score: 71 },
      { domain: 'wealth', score: 77 },
      { domain: 'health', score: 68 },
      { domain: 'timing', score: 74 },
    ],
    timingAnalysis: {
      currentPeriod: {
        name: 'now',
        nameEn: 'now',
        score: 78,
        description: 'flow',
        descriptionEn: 'flow',
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

async function main() {
  const mod = await import('../src/lib/destiny-matrix/ai-report/aiReportService')
  const { generateAIPremiumReport } = mod

  const result = await generateAIPremiumReport(
    createMockInput() as any,
    createMockReport() as any,
    {
      lang: 'ko',
      detailLevel: 'comprehensive',
      userPlan: 'premium',
      birthDate: '1995-02-09',
      name: 'Jun Young Rhee',
      deterministicOnly: false,
    }
  )

  const preview = {
    meta: {
      modelUsed: result.meta.modelUsed,
      tokensUsed: result.meta.tokensUsed,
      reportVersion: result.meta.reportVersion,
      processingTime: result.meta.processingTime,
    },
    scope: result.timeWindow.scope,
    timelinePriority: (result as any).timelinePriority,
    artifacts: {
      hasMappingRulebook: Boolean(result.deterministicCore?.artifacts?.mappingRulebook),
      hasBlocksBySection: Boolean(result.deterministicCore?.artifacts?.blocksBySection),
      hasScenarioBundles: Boolean(
        (result.deterministicCore?.artifacts?.scenarioBundles || []).length
      ),
      timelinePriority: result.deterministicCore?.artifacts?.timelinePriority,
    },
    sections: result.sections,
  }

  console.log(JSON.stringify(preview, null, 2))
}

main().catch((err) => {
  console.error('RUN_FAILED', err?.message || err)
  process.exit(1)
})
