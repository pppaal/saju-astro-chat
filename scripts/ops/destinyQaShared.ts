import type {
  MatrixCalculationInput,
  MatrixHighlight,
  MatrixSummary,
} from '../../src/lib/destiny-matrix/types'
import type { FusionReport, InsightDomain } from '../../src/lib/destiny-matrix/interpreter/types'
import type { TimingData } from '../../src/lib/destiny-matrix/ai-report/types'
import type { FiveElement } from '../../src/lib/Saju/types'

export type QALang = 'ko' | 'en'
export type CaseTheme = 'love' | 'career' | 'wealth' | 'health' | 'life'
export type QAStatus = 'PASS' | 'WARN' | 'FAIL'

export type LocalizedText = {
  ko: string
  en: string
}

export type QuestionCase = {
  id: string
  theme: CaseTheme
  question: LocalizedText
  expectedDomains: string[]
  expectedActionHints: LocalizedText[]
}

export function getLocalizedText(text: LocalizedText, lang: QALang): string {
  return lang === 'ko' ? text.ko : text.en
}

export function trimText(text: string | undefined, limit = 160): string {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}...`
}

export function toStatus(results: Array<{ status: QAStatus }>): QAStatus {
  if (results.some((item) => item.status === 'FAIL')) return 'FAIL'
  if (results.some((item) => item.status === 'WARN')) return 'WARN'
  return 'PASS'
}

function mkHighlight(
  layer: number,
  rowKey: string,
  colKey: string,
  score: number,
  keyword: string
): MatrixHighlight {
  return {
    layer,
    rowKey,
    colKey,
    cell: {
      interaction: {
        level: 'amplify',
        score,
        icon: '*',
        colorCode: 'green',
        keyword,
        keywordEn: keyword,
      },
      sajuBasis: `${rowKey} saju`,
      astroBasis: `${colKey} astro`,
      advice: `${keyword} action`,
    },
  }
}

export function createInput(
  lang: QALang,
  overrides: Partial<MatrixCalculationInput> = {}
): MatrixCalculationInput {
  return {
    dayMasterElement: '금' as FiveElement,
    pillarElements: ['목', '화', '토', '금'] as FiveElement[],
    sibsinDistribution: { 편재: 2, 비견: 2, 상관: 1, 정관: 1 } as any,
    twelveStages: { 양: 1, 관대: 1, 사: 1, 병: 1 } as any,
    relations: [
      { kind: 'clash', pillars: ['year', 'month'], detail: 'tension', note: 'watch communication' },
      { kind: 'harmony', pillars: ['day', 'hour'], detail: 'support', note: 'joint execution' },
    ] as any,
    geokguk: 'jeongjae' as any,
    yongsin: '화' as FiveElement,
    currentDaeunElement: '금' as FiveElement,
    currentSaeunElement: '화' as FiveElement,
    shinsalList: ['천을귀인', '역마', '망신', '괴강', '공망'] as any,
    dominantWesternElement: 'air',
    planetHouses: {
      Sun: 1,
      Moon: 4,
      Mercury: 1,
      Venus: 11,
      Mars: 7,
      Jupiter: 10,
      Saturn: 1,
      Uranus: 12,
      Neptune: 12,
      Pluto: 10,
    } as any,
    planetSigns: {
      Sun: 'Aquarius',
      Moon: 'Gemini',
      Mercury: 'Aquarius',
      Venus: 'Capricorn',
      Mars: 'Leo',
      Jupiter: 'Sagittarius',
      Saturn: 'Pisces',
      Uranus: 'Capricorn',
      Neptune: 'Capricorn',
      Pluto: 'Scorpio',
    } as any,
    aspects: [
      { planet1: 'Jupiter', planet2: 'Saturn', type: 'square', orb: 0.47, angle: 90 },
      { planet1: 'Mercury', planet2: 'Jupiter', type: 'sextile', orb: 2.46, angle: 60 },
      { planet1: 'Moon', planet2: 'Pluto', type: 'opposition', orb: 3.95, angle: 180 },
      { planet1: 'Sun', planet2: 'Mars', type: 'opposition', orb: 4.52, angle: 180 },
      { planet1: 'Moon', planet2: 'Mercury', type: 'trine', orb: 4.65, angle: 120 },
    ],
    activeTransits: ['saturnRetrograde', 'eclipse'] as any,
    asteroidHouses: { Ceres: 7, Pallas: 10, Juno: 7, Vesta: 6 } as any,
    extraPointSigns: {
      Chiron: 'Aries',
      Lilith: 'Scorpio',
      Vertex: 'Gemini',
      PartOfFortune: 'Libra',
    } as any,
    advancedAstroSignals: {
      solarReturn: true,
      lunarReturn: true,
      progressions: true,
      draconic: true,
      harmonics: true,
      fixedStars: true,
      eclipses: true,
      midpoints: true,
      asteroids: true,
      extraPoints: true,
    },
    sajuSnapshot: {
      pillars: true,
      unse: { daeun: [{ age: 31, heavenlyStem: '乙', earthlyBranch: '亥' }] },
      advancedAnalysis: true,
    } as any,
    astrologySnapshot: {
      natalChart: { planets: [{ name: 'Sun' }] },
      transits: { active: 2 },
      natalAspects: true,
    } as any,
    crossSnapshot: {
      source: 'three-services-qa',
      crossAgreement: 0.62,
      crossEvidence: 'career',
    } as any,
    currentDateIso: '2026-03-16',
    profileContext: {
      birthDate: '1995-02-09',
      birthTime: '06:40',
      birthCity: 'Seoul',
      timezone: 'Asia/Seoul',
      latitude: 37.5665,
      longitude: 126.978,
      houseSystem: 'placidus',
      analysisAt: '2026-03-16T03:15:23.929Z',
    },
    lang,
    startYearMonth: '2026-01',
    ...overrides,
  }
}

export function createSummary(overrides: Partial<MatrixSummary> = {}): MatrixSummary {
  return {
    totalScore: 78,
    confidenceScore: 0.66,
    strengthPoints: [
      mkHighlight(6, '임관', 'H10', 10, 'career peak'),
      mkHighlight(2, '편재', 'Jupiter', 9, 'money expansion'),
      mkHighlight(5, 'samhap', 'trine', 8, 'relationship momentum'),
    ],
    cautionPoints: [
      mkHighlight(5, 'chung', 'opposition', 4, 'communication caution'),
      mkHighlight(4, 'daeunTransition', 'saturnRetrograde', 3, 'timing caution'),
    ],
    balancePoints: [
      mkHighlight(3, '정인', 'H6', 7, 'health routine'),
      mkHighlight(7, 'geokguk', 'solarReturn', 6, 'long-cycle balance'),
    ],
    topSynergies: [],
    overlapTimeline: [
      { month: '2026-04', overlapStrength: 0.78, timeOverlapWeight: 1.2, peakLevel: 'peak' },
      { month: '2026-07', overlapStrength: 0.65, timeOverlapWeight: 1.1, peakLevel: 'high' },
    ],
    ...overrides,
  } as MatrixSummary
}

export function createReport(
  lang: QALang,
  overrides: Partial<FusionReport> = {}
): FusionReport {
  return {
    id: 'three-services-qa',
    generatedAt: new Date('2026-03-16T03:15:23.929Z'),
    version: '2.0.0',
    lang,
    profile: {
      dayMasterElement: '금' as FiveElement,
      dayMasterDescription: 'metal',
      dominantSibsin: [] as any,
      keyShinsals: [] as any,
    },
    overallScore: {
      total: 84,
      grade: 'A',
      gradeDescription: 'good',
      gradeDescriptionEn: 'good',
      categoryScores: { strength: 84, opportunity: 80, balance: 76, caution: 66, challenge: 61 },
    },
    topInsights: [
      {
        id: 'ti1',
        domain: 'career',
        category: 'strength',
        title: 'career expansion',
        description: 'career momentum',
        score: 88,
        weightedScore: 88,
        actionItems: [],
        sources: [],
      },
      {
        id: 'ti2',
        domain: 'relationship',
        category: 'caution',
        title: 'relationship caution',
        description: 'communication caution',
        score: 72,
        weightedScore: 72,
        actionItems: [],
        sources: [],
      },
      {
        id: 'ti3',
        domain: 'wealth',
        category: 'strength',
        title: 'wealth window',
        description: 'cashflow opportunity',
        score: 79,
        weightedScore: 79,
        actionItems: [],
        sources: [],
      },
    ] as any,
    domainAnalysis: [
      { domain: 'career', score: 82 },
      { domain: 'relationship', score: 70 },
      { domain: 'wealth', score: 75 },
      { domain: 'health', score: 66 },
      { domain: 'timing', score: 68 },
      { domain: 'move', score: 69 },
    ] as any,
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
    ...overrides,
  } as any
}

export function createTimingData(): TimingData {
  return {
    daeun: {
      heavenlyStem: '乙',
      earthlyBranch: '亥',
      element: '목',
      startAge: 31,
      endAge: 40,
      isCurrent: true,
    },
    seun: { year: 2026, heavenlyStem: '丙', earthlyBranch: '午', element: '화' },
    wolun: { month: 3, heavenlyStem: '甲', earthlyBranch: '寅', element: '목' },
    iljin: { date: '2026-03-16', heavenlyStem: '辛', earthlyBranch: '卯', element: '금' },
  }
}

export function mapThemeToFocus(theme: CaseTheme): InsightDomain | undefined {
  switch (theme) {
    case 'love':
      return 'relationship'
    case 'career':
      return 'career'
    case 'wealth':
      return 'wealth'
    case 'health':
      return 'health'
    default:
      return undefined
  }
}

export function createServiceQaCases(): QuestionCase[] {
  return [
    {
      id: 'relationship_push',
      theme: 'love',
      question: {
        ko: '요즘 관계가 애매한데 밀어붙여도 돼?',
        en: 'Things feel ambiguous in this relationship. Should I push it forward now?',
      },
      expectedDomains: ['relationship', 'timing'],
      expectedActionHints: [
        { ko: '경계', en: 'boundary' },
        { ko: '거리', en: 'distance' },
        { ko: '기대치', en: 'expectation' },
        { ko: '검토', en: 'review' },
      ],
    },
    {
      id: 'job_offer',
      theme: 'career',
      question: {
        ko: '이직 제안이 왔는데 바로 받아도 돼?',
        en: 'I got a job offer. Is it okay to accept it right away?',
      },
      expectedDomains: ['career', 'timing'],
      expectedActionHints: [
        { ko: '검토', en: 'review' },
        { ko: '조건', en: 'terms' },
        { ko: '협의', en: 'negotiate' },
        { ko: '단계', en: 'staged' },
      ],
    },
    {
      id: 'money_leak',
      theme: 'wealth',
      question: {
        ko: '돈이 새는 느낌인데 지금 뭘 막아야 해?',
        en: 'Money feels leaky right now. What should I stop first?',
      },
      expectedDomains: ['wealth', 'timing'],
      expectedActionHints: [
        { ko: '지출', en: 'spending' },
        { ko: '보호', en: 'protect' },
        { ko: '검토', en: 'review' },
        { ko: '조건', en: 'terms' },
      ],
    },
    {
      id: 'burnout',
      theme: 'health',
      question: {
        ko: '요즘 너무 지치는데 버텨야 돼 아니면 쉬어야 돼?',
        en: 'I am exhausted lately. Should I keep pushing or pull back and recover?',
      },
      expectedDomains: ['health', 'timing'],
      expectedActionHints: [
        { ko: '회복', en: 'recovery' },
        { ko: '루틴', en: 'routine' },
        { ko: '부하', en: 'load' },
        { ko: '경계', en: 'boundary' },
      ],
    },
    {
      id: 'relocation',
      theme: 'life',
      question: {
        ko: '이사나 생활 거점을 옮기는 게 맞아?',
        en: 'Is this the right time to relocate or reset my living base?',
      },
      expectedDomains: ['move', 'timing', 'relationship'],
      expectedActionHints: [
        { ko: '경로', en: 'route' },
        { ko: '거점', en: 'base' },
        { ko: '재확인', en: 'recheck' },
        { ko: '단계', en: 'staged' },
      ],
    },
  ]
}

export function createCounselorRegressionCases(): QuestionCase[] {
  return [
    ...createServiceQaCases(),
    {
      id: 'relationship_define',
      theme: 'love',
      question: {
        ko: '지금 관계 이름을 붙여도 돼?',
        en: 'Is it the right time to define this relationship?',
      },
      expectedDomains: ['relationship', 'timing'],
      expectedActionHints: [
        { ko: '명확화', en: 'clarify' },
        { ko: '기대치', en: 'expectation' },
        { ko: '검토', en: 'review' },
      ],
    },
    {
      id: 'relationship_reconcile',
      theme: 'love',
      question: {
        ko: '다시 연락해도 될까?',
        en: 'Should I reach out again and try to reconnect?',
      },
      expectedDomains: ['relationship', 'timing'],
      expectedActionHints: [
        { ko: '거리', en: 'distance' },
        { ko: '재확인', en: 'recheck' },
        { ko: '준비', en: 'prepare' },
      ],
    },
    {
      id: 'relationship_commitment',
      theme: 'love',
      question: {
        ko: '결혼 얘기 꺼내도 되는 타이밍이야?',
        en: 'Is this a good time to bring up marriage seriously?',
      },
      expectedDomains: ['relationship', 'timing'],
      expectedActionHints: [
        { ko: '준비', en: 'prepare' },
        { ko: '기대치', en: 'expectation' },
        { ko: '검토', en: 'review' },
      ],
    },
    {
      id: 'career_promotion',
      theme: 'career',
      question: {
        ko: '승진 얘기 지금 꺼내도 괜찮아?',
        en: 'Is this a good moment to raise the promotion conversation?',
      },
      expectedDomains: ['career', 'timing'],
      expectedActionHints: [
        { ko: '검토', en: 'review' },
        { ko: '협의', en: 'negotiate' },
        { ko: '조건', en: 'terms' },
      ],
    },
    {
      id: 'career_role_shift',
      theme: 'career',
      question: {
        ko: '직무를 바꾸는 게 맞아?',
        en: 'Should I move into a different role now?',
      },
      expectedDomains: ['career', 'timing'],
      expectedActionHints: [
        { ko: '파일럿', en: 'pilot' },
        { ko: '검토', en: 'review' },
        { ko: '단계', en: 'staged' },
      ],
    },
    {
      id: 'career_contract',
      theme: 'career',
      question: {
        ko: '계약 조건 다시 협상해도 될까?',
        en: 'Should I reopen the contract terms and negotiate again?',
      },
      expectedDomains: ['career', 'wealth', 'timing'],
      expectedActionHints: [
        { ko: '협의', en: 'negotiate' },
        { ko: '조건', en: 'terms' },
        { ko: '검토', en: 'review' },
      ],
    },
    {
      id: 'wealth_invest',
      theme: 'wealth',
      question: {
        ko: '지금 투자 비중을 늘려도 돼?',
        en: 'Is it a good time to increase my investment exposure?',
      },
      expectedDomains: ['wealth', 'timing'],
      expectedActionHints: [
        { ko: '배분', en: 'allocation' },
        { ko: '검토', en: 'review' },
        { ko: '보호', en: 'protect' },
      ],
    },
    {
      id: 'wealth_debt',
      theme: 'wealth',
      question: {
        ko: '빚 구조를 다시 짜야 할까?',
        en: 'Do I need to restructure debt right now?',
      },
      expectedDomains: ['wealth', 'timing'],
      expectedActionHints: [
        { ko: '재구조화', en: 'restructure' },
        { ko: '조건', en: 'terms' },
        { ko: '검토', en: 'review' },
      ],
    },
    {
      id: 'wealth_pricing',
      theme: 'wealth',
      question: {
        ko: '가격을 올리거나 수익 구조를 바꿔도 될까?',
        en: 'Can I raise my pricing or change how I monetize now?',
      },
      expectedDomains: ['wealth', 'career'],
      expectedActionHints: [
        { ko: '가격', en: 'pricing' },
        { ko: '협의', en: 'negotiate' },
        { ko: '검토', en: 'review' },
      ],
    },
    {
      id: 'health_sleep',
      theme: 'health',
      question: {
        ko: '수면이 무너졌는데 지금 제일 먼저 뭘 고쳐야 해?',
        en: 'My sleep is falling apart. What should I correct first?',
      },
      expectedDomains: ['health', 'timing'],
      expectedActionHints: [
        { ko: '회복', en: 'recovery' },
        { ko: '루틴', en: 'routine' },
        { ko: '부하', en: 'load' },
      ],
    },
    {
      id: 'health_load',
      theme: 'health',
      question: {
        ko: '지금 운동 강도를 올려도 돼?',
        en: 'Can I safely increase training intensity right now?',
      },
      expectedDomains: ['health', 'timing'],
      expectedActionHints: [
        { ko: '회복', en: 'recovery' },
        { ko: '검토', en: 'review' },
        { ko: '부하', en: 'load' },
      ],
    },
    {
      id: 'health_reset',
      theme: 'health',
      question: {
        ko: '루틴을 완전히 다시 짜야 할까?',
        en: 'Do I need to rebuild my routine from the ground up?',
      },
      expectedDomains: ['health', 'timing'],
      expectedActionHints: [
        { ko: '루틴', en: 'routine' },
        { ko: '회복', en: 'recovery' },
        { ko: '준비', en: 'prepare' },
      ],
    },
    {
      id: 'life_commute',
      theme: 'life',
      question: {
        ko: '출퇴근 동선을 바꾸는 게 맞아?',
        en: 'Should I change my commute pattern now?',
      },
      expectedDomains: ['move', 'timing'],
      expectedActionHints: [
        { ko: '경로', en: 'route' },
        { ko: '재확인', en: 'recheck' },
        { ko: '파일럿', en: 'pilot' },
      ],
    },
    {
      id: 'life_route',
      theme: 'life',
      question: {
        ko: '지금은 이동보다 경로 재점검이 먼저야?',
        en: 'Is this more about rechecking the route than moving immediately?',
      },
      expectedDomains: ['move', 'timing'],
      expectedActionHints: [
        { ko: '경로', en: 'route' },
        { ko: '재확인', en: 'recheck' },
        { ko: '검토', en: 'review' },
      ],
    },
    {
      id: 'life_lease',
      theme: 'life',
      question: {
        ko: '집 계약을 지금 확정해도 돼?',
        en: 'Is it safe to finalize a housing lease right now?',
      },
      expectedDomains: ['move', 'timing', 'wealth'],
      expectedActionHints: [
        { ko: '협의', en: 'negotiate' },
        { ko: '조건', en: 'terms' },
        { ko: '재확인', en: 'recheck' },
      ],
    },
    {
      id: 'life_basecamp',
      theme: 'life',
      question: {
        ko: '생활 거점을 다시 잡는 게 먼저일까?',
        en: 'Should I reset my base of life before making bigger moves?',
      },
      expectedDomains: ['move', 'timing', 'relationship'],
      expectedActionHints: [
        { ko: '거점', en: 'base' },
        { ko: '단계', en: 'staged' },
        { ko: '재확인', en: 'recheck' },
      ],
    },
  ]
}

export function createCaseFixture(
  theme: CaseTheme,
  lang: QALang
): {
  input: MatrixCalculationInput
  matrixSummary: MatrixSummary
  matrixReport: FusionReport
} {
  switch (theme) {
    case 'love':
      return {
        input: createInput(lang, {
          geokguk: 'jeonggwan' as any,
          currentDaeunElement: '수' as FiveElement,
          currentSaeunElement: '목' as FiveElement,
          shinsalList: ['도화', '홍염', '천을귀인', '화개'] as any,
          planetHouses: {
            Sun: 5,
            Moon: 7,
            Mercury: 5,
            Venus: 7,
            Mars: 5,
            Jupiter: 7,
            Saturn: 7,
            Uranus: 11,
            Neptune: 5,
            Pluto: 7,
          } as any,
          activeTransits: ['venusRetrograde', 'eclipse'] as any,
          crossSnapshot: {
            source: 'three-services-qa',
            crossAgreement: 0.71,
            crossEvidence: 'relationship',
          } as any,
        }),
        matrixSummary: createSummary({
          strengthPoints: [
            mkHighlight(5, '도화', 'Venus', 10, 'relationship opening'),
            mkHighlight(6, '정관', 'H7', 9, 'commitment frame'),
          ],
        }),
        matrixReport: createReport(lang, {
          topInsights: [
            {
              id: 'love1',
              domain: 'relationship',
              category: 'strength',
              title: 'relationship timing',
              description: 'bond timing',
              score: 89,
              weightedScore: 89,
              actionItems: [],
              sources: [],
            },
          ] as any,
          domainAnalysis: [
            { domain: 'relationship', score: 88 },
            { domain: 'timing', score: 82 },
            { domain: 'career', score: 62 },
            { domain: 'wealth', score: 60 },
            { domain: 'health', score: 58 },
            { domain: 'move', score: 54 },
          ] as any,
        }),
      }
    case 'career':
      return {
        input: createInput(lang, {
          geokguk: 'jeonggwan' as any,
          currentDaeunElement: '금' as FiveElement,
          currentSaeunElement: '토' as FiveElement,
          planetHouses: {
            Sun: 10,
            Moon: 6,
            Mercury: 10,
            Venus: 11,
            Mars: 10,
            Jupiter: 10,
            Saturn: 10,
            Uranus: 6,
            Neptune: 10,
            Pluto: 10,
          } as any,
          activeTransits: ['jupiterReturn', 'saturnReturn'] as any,
          crossSnapshot: {
            source: 'three-services-qa',
            crossAgreement: 0.74,
            crossEvidence: 'career',
          } as any,
        }),
        matrixSummary: createSummary({
          strengthPoints: [
            mkHighlight(6, '정관', 'H10', 10, 'career authority'),
            mkHighlight(2, '편재', 'Jupiter', 8, 'opportunity leverage'),
          ],
        }),
        matrixReport: createReport(lang, {
          topInsights: [
            {
              id: 'car1',
              domain: 'career',
              category: 'strength',
              title: 'career expansion',
              description: 'role growth',
              score: 91,
              weightedScore: 91,
              actionItems: [],
              sources: [],
            },
          ] as any,
          domainAnalysis: [
            { domain: 'career', score: 90 },
            { domain: 'timing', score: 83 },
            { domain: 'wealth', score: 74 },
            { domain: 'relationship', score: 60 },
            { domain: 'health', score: 58 },
            { domain: 'move', score: 57 },
          ] as any,
        }),
      }
    case 'health':
      return {
        input: createInput(lang, {
          geokguk: 'jeongin' as any,
          currentDaeunElement: '수' as FiveElement,
          currentSaeunElement: '토' as FiveElement,
          shinsalList: ['백호', '천을귀인', '공망'] as any,
          planetHouses: {
            Sun: 6,
            Moon: 6,
            Mercury: 6,
            Venus: 12,
            Mars: 6,
            Jupiter: 6,
            Saturn: 6,
            Uranus: 12,
            Neptune: 12,
            Pluto: 8,
          } as any,
          activeTransits: ['saturnRetrograde', 'lunarReturn'] as any,
          crossSnapshot: {
            source: 'three-services-qa',
            crossAgreement: 0.68,
            crossEvidence: 'health',
          } as any,
        }),
        matrixSummary: createSummary({
          cautionPoints: [
            mkHighlight(6, '백호', 'H6', 9, 'health caution'),
            mkHighlight(4, 'saturn', 'retrograde', 8, 'recovery delay'),
          ],
        }),
        matrixReport: createReport(lang, {
          topInsights: [
            {
              id: 'hea1',
              domain: 'health',
              category: 'caution',
              title: 'recovery priority',
              description: 'reduce load',
              score: 87,
              weightedScore: 87,
              actionItems: [],
              sources: [],
            },
          ] as any,
          domainAnalysis: [
            { domain: 'health', score: 89 },
            { domain: 'timing', score: 84 },
            { domain: 'career', score: 61 },
            { domain: 'relationship', score: 59 },
            { domain: 'wealth', score: 58 },
            { domain: 'move', score: 55 },
          ] as any,
        }),
      }
    case 'life':
      return {
        input: createInput(lang, {
          currentDaeunElement: '목' as FiveElement,
          currentSaeunElement: '수' as FiveElement,
          currentWolunElement: '금' as FiveElement,
          shinsalList: ['역마', '천을귀인'] as any,
          planetHouses: {
            Sun: 4,
            Moon: 3,
            Mercury: 3,
            Venus: 4,
            Mars: 3,
            Jupiter: 9,
            Saturn: 4,
            Uranus: 4,
            Neptune: 3,
            Pluto: 3,
          } as any,
          activeTransits: ['uranusTransit', 'mercuryRetrograde', 'nodeReturn'] as any,
          crossSnapshot: {
            source: 'three-services-qa',
            crossAgreement: 0.78,
            crossEvidence: 'move',
          } as any,
        }),
        matrixSummary: createSummary({
          strengthPoints: [
            mkHighlight(5, '역마', 'Uranus', 10, 'movement window'),
            mkHighlight(4, '이동', 'Mercury', 9, 'route recheck'),
            mkHighlight(4, '거점', 'Saturn', 8, 'basecamp reset'),
          ],
        }),
        matrixReport: createReport(lang, {
          topInsights: [
            {
              id: 'mov1',
              domain: 'move',
              category: 'strength',
              title: 'move reset',
              description: 'route recheck and basecamp reset',
              score: 91,
              weightedScore: 91,
              actionItems: [],
              sources: [],
            },
          ] as any,
          domainAnalysis: [
            { domain: 'move', score: 92 },
            { domain: 'timing', score: 86 },
            { domain: 'relationship', score: 62 },
            { domain: 'career', score: 60 },
            { domain: 'wealth', score: 59 },
            { domain: 'health', score: 57 },
          ] as any,
        }),
      }
    case 'wealth':
    default:
      return {
        input: createInput(lang),
        matrixSummary: createSummary(),
        matrixReport: createReport(lang),
      }
  }
}

export function questionDirectnessHit(text: string, lang: QALang): boolean {
  const value = String(text || '')
  if (lang === 'ko') {
    return /우선|지금은|맞습니다|아닙니다|검토|정리|회복|경계|재확인|단계/.test(value)
  }
  return /right now|priority|review|recheck|boundary|recover|stage|negotiate|prepare/i.test(
    value
  )
}
