import { analyzeICP } from '@/lib/icp/analysis'
import { icpQuestions } from '@/lib/icp/questions'
import type { ICPAnalysis, ICPQuizAnswers } from '@/lib/icp/types'
import { analyzePersona } from '@/lib/persona/analysis'
import { questions as personaQuestions } from '@/lib/persona/questions'
import type { PersonaAnalysis, PersonaQuizAnswers } from '@/lib/persona/types'
import { generateCombinedInsights } from '@/app/personality/combined/insightGenerators'
import { scoreIcpTest } from '@/lib/icpTest/scoring'
import { resolveHybridArchetype } from '@/lib/icpTest/hybrid'

type DemoQuestion = {
  id: string
  text: string
  dimension: string
  choices: Array<{ id: string; text: string }>
}

const DEMO_PROFILE = {
  user_name: 'Paul',
  locale: 'en' as const,
}

export interface DemoIcpPayload {
  user_name: string
  locale: 'en'
  questions: DemoQuestion[]
  questionsByDimension: Record<string, DemoQuestion[]>
  scores: {
    primary_style: string
    secondary_style: string | null
    dominance: number
    affiliation: number
    boundary: number
    resilience: number
    confidence: number
  }
  narrative: {
    main_text: string
    bullet_takeaways: string[]
  }
  explainability: ICPAnalysis['explainability'] | null
  raw: ICPAnalysis
}

export interface DemoPersonaPayload {
  user_name: string
  locale: 'en'
  questions: DemoQuestion[]
  questionsByDimension: Record<string, DemoQuestion[]>
  traits: {
    type_code: string
    persona_name: string
    axes: PersonaAnalysis['axes']
    consistency_score: number | null | undefined
  }
  narrative: {
    main_text: string
    bullet_takeaways: string[]
  }
  explainability: {
    reasoning: string[]
  }
  raw: PersonaAnalysis
}

export interface DemoCombinedPayload {
  user_name: string
  locale: 'en'
  icp: DemoIcpPayload
  personality: DemoPersonaPayload
  hybrid: {
    id: string
    name: string
    description: string
  }
  combined_summary: Array<{ insight: string; based_on: string[] }>
  strengths: string[]
  risks: string[]
  best_fit: {
    roles: string[]
    markets: string[]
  }
  recommended_icp_segments: Array<{
    segment: string
    reason: string
    messaging_style: string
  }>
  action_plan: {
    seven_day: string[]
    thirty_day: string[]
  }
}

export interface DemoTarotPayload {
  input: {
    user_name: string
    locale: 'en'
    birth: { date: string; time: string; city: string }
    topic: string
    spread: string
    question: string
  }
  main_text: string
  bullet_takeaways: string[]
  evidence: Array<{ id: string; title: string; reason: string }>
  cards: Array<{ id: number; name: string; isReversed: boolean; keywords: string[] }>
}

export interface DemoDestinyMapPayload {
  input: {
    user_name: string
    locale: 'en'
    birth: { date: string; time: string; city: string }
    theme: string
  }
  main_text: string
  top_themes: string[]
  cross_insights: string[]
  evidence: Array<{ id: string; title: string; reason: string }>
  action_plan: string[]
}

export interface DemoCalendarPayload {
  input: {
    user_name: string
    locale: 'en'
    birth: { date: string; time: string; city: string }
    timezone: string
  }
  month: string
  main_text: string
  highlights: Array<{
    date: string
    label: string
    score: number
    reason: string
    evidence: Array<{ id: string; title: string }>
  }>
  timeline: Array<{ month: string; keyword: string }>
}

function buildIcpSampleAnswers(): ICPQuizAnswers {
  return {
    ag_01: '4',
    ag_02: '4',
    ag_03: '5',
    ag_04: '2',
    ag_05: '4',
    wa_01: '4',
    wa_02: '4',
    wa_03: '5',
    wa_04: '2',
    wa_05: '4',
    bo_01: '4',
    bo_02: '3',
    bo_03: '4',
    bo_04: '2',
    bo_05: '3',
    re_01: '4',
    re_02: '4',
    re_03: '4',
    re_04: '2',
    re_05: '4',
  }
}

function buildPersonaSampleAnswers(): PersonaQuizAnswers {
  const answers: PersonaQuizAnswers = {}

  for (const q of personaQuestions) {
    if (q.id.includes('_energy_')) {
      answers[q.id] = q.id.endsWith('noise') ? 'B' : 'A'
      continue
    }
    if (q.id.includes('_cog_')) {
      answers[q.id] = q.id.endsWith('metrics_story') ? 'B' : 'A'
      continue
    }
    if (q.id.includes('_decision_')) {
      answers[q.id] = q.id.endsWith('risk') ? 'A' : 'B'
      continue
    }
    if (q.id.includes('_rhythm_')) {
      answers[q.id] = q.id.endsWith('change') ? 'C' : 'B'
      continue
    }
    answers[q.id] = 'B'
  }

  return answers
}

function groupByDimension(questions: DemoQuestion[]): Record<string, DemoQuestion[]> {
  return questions.reduce<Record<string, DemoQuestion[]>>((acc, item) => {
    if (!acc[item.dimension]) {
      acc[item.dimension] = []
    }
    acc[item.dimension].push(item)
    return acc
  }, {})
}

function icpDimensionName(axis: string): string {
  if (axis === 'dominance') return 'Dominance'
  if (axis === 'affiliation') return 'Affiliation'
  if (axis === 'boundary') return 'Boundary'
  if (axis === 'resilience') return 'Resilience'
  return 'General'
}

function personaDimensionName(id: string): string {
  if (id.includes('_energy_')) return 'Energy'
  if (id.includes('_cog_')) return 'Cognition'
  if (id.includes('_decision_')) return 'Decision'
  if (id.includes('_rhythm_')) return 'Rhythm'
  return 'General'
}

export function getDemoIcpPayload(): DemoIcpPayload {
  const sampleAnswers = buildIcpSampleAnswers()
  const analysis = analyzeICP(sampleAnswers, 'en')
  const questionRows: DemoQuestion[] = icpQuestions.map((q) => ({
    id: q.id,
    text: q.text,
    dimension: icpDimensionName(q.axis),
    choices: q.options.map((option) => ({ id: option.id, text: option.text })),
  }))

  return {
    user_name: DEMO_PROFILE.user_name,
    locale: DEMO_PROFILE.locale,
    questions: questionRows,
    questionsByDimension: groupByDimension(questionRows),
    scores: {
      primary_style: analysis.primaryStyle,
      secondary_style: analysis.secondaryStyle,
      dominance: analysis.dominanceScore,
      affiliation: analysis.affiliationScore,
      boundary: analysis.boundaryScore ?? 50,
      resilience: analysis.resilienceScore ?? 50,
      confidence: analysis.confidence ?? analysis.consistencyScore,
    },
    narrative: {
      main_text: analysis.summary,
      bullet_takeaways: [
        `Primary style: ${analysis.primaryOctant.name} (${analysis.primaryStyle})`,
        `Strength signals: ${analysis.primaryOctant.traits.slice(0, 2).join(', ')}`,
        `Growth focus: ${analysis.primaryOctant.growthRecommendations.slice(0, 1).join('')}`,
      ],
    },
    explainability: analysis.explainability ?? null,
    raw: analysis,
  }
}

export function getDemoPersonaPayload(): DemoPersonaPayload {
  const sampleAnswers = buildPersonaSampleAnswers()
  const analysis = analyzePersona(sampleAnswers, 'en')
  const questionRows: DemoQuestion[] = personaQuestions.map((q) => ({
    id: q.id,
    text: q.text,
    dimension: personaDimensionName(q.id),
    choices: q.options.map((option) => ({ id: option.id, text: option.text })),
  }))

  return {
    user_name: DEMO_PROFILE.user_name,
    locale: DEMO_PROFILE.locale,
    questions: questionRows,
    questionsByDimension: groupByDimension(questionRows),
    traits: {
      type_code: analysis.typeCode,
      persona_name: analysis.personaName,
      axes: analysis.axes,
      consistency_score: analysis.consistencyScore,
    },
    narrative: {
      main_text: analysis.summary,
      bullet_takeaways: [
        `Core strengths: ${analysis.strengths.slice(0, 2).join(', ')}`,
        `Main caution: ${analysis.challenges.slice(0, 1).join('')}`,
        `Best-fit role direction: ${analysis.recommendedRoles.slice(0, 2).join(', ')}`,
      ],
    },
    explainability: {
      reasoning: [
        `Type code ${analysis.typeCode} is derived from axis poles: ${Object.entries(analysis.axes)
          .map(([axis, data]) => `${axis}=${data.pole}`)
          .join(', ')}`,
      ],
    },
    raw: analysis,
  }
}

function marketsForIcpStyle(style: string): string[] {
  if (style === 'PA' || style === 'BC') return ['B2B sales', 'Leadership coaching', 'Go-to-market']
  if (style === 'LM' || style === 'NO')
    return ['Community products', 'Customer success', 'Education']
  if (style === 'DE' || style === 'FG') return ['Research', 'Data products', 'Operations']
  return ['Product strategy', 'Consulting', 'Service design']
}

export function getDemoCombinedPayload(): DemoCombinedPayload {
  const icp = getDemoIcpPayload()
  const personality = getDemoPersonaPayload()
  const combinedInsights = generateCombinedInsights(icp.raw, personality.raw, false)
  const icpV2 = scoreIcpTest(buildIcpSampleAnswers())
  const hybrid = resolveHybridArchetype(icpV2, personality.raw)

  const topInsights = combinedInsights.slice(0, 5).map((item) => ({
    insight: `${item.title}: ${item.content}`,
    based_on: [`ICP:${icp.raw.primaryStyle}`, `Persona:${personality.raw.typeCode}`],
  }))

  return {
    user_name: DEMO_PROFILE.user_name,
    locale: DEMO_PROFILE.locale,
    icp,
    personality,
    hybrid: {
      id: hybrid.id,
      name: hybrid.nameKo,
      description: hybrid.descriptionKo,
    },
    combined_summary: topInsights,
    strengths: [
      ...icp.raw.primaryOctant.traits.slice(0, 2),
      ...personality.raw.strengths.slice(0, 2),
    ],
    risks: [
      ...icp.raw.primaryOctant.shadow.split(' / ').slice(0, 2),
      ...personality.raw.challenges.slice(0, 2),
    ],
    best_fit: {
      roles: personality.raw.recommendedRoles.slice(0, 4),
      markets: marketsForIcpStyle(icp.raw.primaryStyle),
    },
    recommended_icp_segments: [
      {
        segment: `Primary ${icp.raw.primaryStyle} (${icp.raw.primaryOctant.name})`,
        reason: 'Highest octant score and consistent axis profile.',
        messaging_style: `Lead with ${personality.raw.axes.decision.pole === 'empathic' ? 'empathetic framing' : 'logic and clarity'}.`,
      },
      {
        segment:
          personality.raw.axes.energy.pole === 'radiant'
            ? 'High-touch interaction'
            : 'Depth-first interaction',
        reason: `Energy pole is ${personality.raw.axes.energy.pole}.`,
        messaging_style:
          personality.raw.axes.energy.pole === 'radiant'
            ? 'Use energetic, social, momentum-based copy.'
            : 'Use concise, calm, and depth-oriented copy.',
      },
    ],
    action_plan: {
      seven_day: [
        'Capture one recurring relationship pattern and test one alternate response.',
        'Hold one feedback conversation using clear boundary statements.',
        'Track one daily behavior that improves trust momentum.',
      ],
      thirty_day: [
        'Run a weekly reflection on ICP axis shifts and decision outcomes.',
        'Design one role/workflow aligned with your persona strengths.',
        'Create a messaging playbook for your key audience segments.',
      ],
    },
  }
}

export function getDemoTarotPayload(): DemoTarotPayload {
  return {
    input: {
      user_name: DEMO_PROFILE.user_name,
      locale: DEMO_PROFILE.locale,
      birth: { date: '1995-02-09', time: '06:40', city: 'Seoul' },
      topic: 'career',
      spread: 'Three-card',
      question: 'What should I focus on in the next 4 weeks to grow my career?',
    },
    main_text:
      'You are entering a momentum-building phase. Keep one strategic priority visible and reduce reactive pivots.',
    bullet_takeaways: [
      'Focus on one strategic deliverable.',
      'Keep milestone updates short and consistent.',
      'Avoid overcommitment in high-pressure weeks.',
    ],
    evidence: [
      { id: 'tarot-card-1', title: 'The Magician', reason: 'Initiation and agency' },
      { id: 'tarot-card-14', title: 'Temperance', reason: 'Pacing and adjustment' },
      { id: 'tarot-card-67', title: 'Knight of Pentacles', reason: 'Steady execution' },
    ],
    cards: [
      { id: 1, name: 'The Magician', isReversed: false, keywords: ['initiative', 'skill'] },
      { id: 14, name: 'Temperance', isReversed: true, keywords: ['imbalance', 'recalibrate'] },
      {
        id: 67,
        name: 'Knight of Pentacles',
        isReversed: false,
        keywords: ['consistency', 'discipline'],
      },
    ],
  }
}

export function getDemoDestinyMapPayload(): DemoDestinyMapPayload {
  return {
    input: {
      user_name: DEMO_PROFILE.user_name,
      locale: DEMO_PROFILE.locale,
      birth: { date: '1995-02-09', time: '06:40', city: 'Seoul' },
      theme: 'life',
    },
    main_text:
      'Your long-cycle pattern favors steady growth and deliberate communication. Progress compounds when boundaries and pacing are explicit.',
    top_themes: [
      'Long-cycle growth',
      'Communication clarity',
      'Boundary management',
      'Execution discipline',
      'Strategic timing',
    ],
    cross_insights: [
      'Career momentum increases when priorities are narrowed.',
      'Relationship friction decreases with explicit expectations.',
      'Risk exposure falls when decision cadence is predefined.',
    ],
    evidence: [
      { id: 'dm-1', title: 'Core Pattern', reason: 'High consistency in deliberate execution' },
      { id: 'dm-2', title: 'Timing Window', reason: 'Better outcomes on planned milestones' },
      { id: 'dm-3', title: 'Relational Lens', reason: 'Trust gains from transparent boundaries' },
    ],
    action_plan: [
      'Set one monthly objective with one score metric.',
      'Review high-friction interactions weekly.',
      'Use concise decision notes for all major commitments.',
    ],
  }
}

export function getDemoCalendarPayload(): DemoCalendarPayload {
  return {
    input: {
      user_name: DEMO_PROFILE.user_name,
      locale: DEMO_PROFILE.locale,
      birth: { date: '1995-02-09', time: '06:40', city: 'Seoul' },
      timezone: 'Asia/Seoul',
    },
    month: '2026-02',
    main_text:
      'This month favors deliberate launches and scheduled communication. Keep low-score days for planning and recovery.',
    highlights: [
      {
        date: '2026-02-06',
        label: 'Focus Window',
        score: 86,
        reason: 'High alignment for deep work and structured planning',
        evidence: [
          { id: 'saju', title: 'resource balance' },
          { id: 'astro', title: 'supportive transit' },
        ],
      },
      {
        date: '2026-02-14',
        label: 'Partnership Day',
        score: 79,
        reason: 'Good signal for collaborative decisions and agreement setting',
        evidence: [
          { id: 'saju', title: 'relationship harmony' },
          { id: 'astro', title: 'communication support' },
        ],
      },
      {
        date: '2026-02-25',
        label: 'Caution Day',
        score: 41,
        reason: 'Avoid hard commitments, prioritize review and buffer',
        evidence: [
          { id: 'saju', title: 'conflict risk' },
          { id: 'astro', title: 'volatile transit' },
        ],
      },
    ],
    timeline: [
      { month: '2026-01', keyword: 'Reset' },
      { month: '2026-02', keyword: 'Consolidate' },
      { month: '2026-03', keyword: 'Launch' },
      { month: '2026-04', keyword: 'Refine' },
      { month: '2026-05', keyword: 'Scale' },
      { month: '2026-06', keyword: 'Partnership' },
      { month: '2026-07', keyword: 'Stabilize' },
      { month: '2026-08', keyword: 'Optimize' },
      { month: '2026-09', keyword: 'Expand' },
      { month: '2026-10', keyword: 'Evaluate' },
      { month: '2026-11', keyword: 'Harvest' },
      { month: '2026-12', keyword: 'Reset' },
    ],
  }
}
