import { PERSONA_ARCHETYPES, getLocalizedArchetypes } from './archetypes';
import {
  PersonaAnalysis,
  PersonaAxisKey,
  PersonaAxisResult,
  PersonaPole,
  PersonaQuizAnswers,
  PersonalityProfile,
} from './types';

type AxisState = Record<PersonaAxisKey, Record<PersonaPole, number>>;

const AXES: Record<PersonaAxisKey, [PersonaPole, PersonaPole]> = {
  energy: ['radiant', 'grounded'],
  cognition: ['visionary', 'structured'],
  decision: ['logic', 'empathic'],
  rhythm: ['flow', 'anchor'],
};

type Effect = { axis: PersonaAxisKey; pole: PersonaPole; weight: number };
type AnswerEffects = Record<string, Record<string, Effect[]>>;

// Map each answer to axis/pole weights. C = neutral/balanced (small weight to both)
export const EFFECTS: AnswerEffects = {
  // Energy (Radiant vs Grounded) - 10 questions
  q1_energy_network: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q2_energy_weekend: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q3_energy_spontaneous: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q4_energy_transit: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q5_energy_idealday: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q21_energy_focus: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q22_energy_solo_group: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q23_energy_interruptions: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q24_energy_events: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },
  q25_energy_noise: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 0.5 }, { axis: 'energy', pole: 'grounded', weight: 0.5 }],
  },

  // Cognition (Visionary vs Structured) - 10 questions
  q6_cog_problem: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 2 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 2 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q7_cog_explain: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q8_cog_evaluate: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 2 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 2 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q9_cog_basis: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q10_cog_constraints: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q26_cog_detail_bigpicture: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q27_cog_rule_break: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q28_cog_metrics_story: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q29_cog_timehorizon: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },
  q30_cog_changecomfort: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 0.5 }, { axis: 'cognition', pole: 'structured', weight: 0.5 }],
  },

  // Decision (Logic vs Empathic) - 10 questions
  q11_decision_conflict: {
    A: [{ axis: 'decision', pole: 'logic', weight: 2 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 2 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q12_decision_feedback: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q13_decision_resources: {
    A: [{ axis: 'decision', pole: 'logic', weight: 2 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 2 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q14_decision_rules: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q15_decision_delay: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q31_decision_dataemotion: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q32_decision_feedback_tone: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q33_decision_risk: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q34_decision_delegate: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },
  q35_decision_conflict_speed: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 0.5 }, { axis: 'decision', pole: 'empathic', weight: 0.5 }],
  },

  // Rhythm (Flow vs Anchor) - 10 questions
  // Flow = 유동적, 즉흥적, 변화에 유연
  // Anchor = 안정적, 계획적, 일관된 루틴
  q16_rhythm_deadline: {
    // A: 미리 해두고 여유 있게 = anchor (계획적)
    // B: 마감 직전 폭발 = flow (즉흥적)
    // C: 꾸준한 페이스 = anchor (일관됨)
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 2 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 2 }],
    C: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q17_rhythm_change: {
    // A: 빠르게 피벗 = flow
    // B: 신중하게 재계획 = anchor
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q18_rhythm_workstyle: {
    // A: 병렬 처리 = flow (멀티태스킹)
    // B: 하나씩 집중 = anchor (체계적)
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q19_rhythm_holiday: {
    // A: 즉흥적 외출 = flow
    // B: 계획된 일정 = anchor
    // C: 아무 일정 없이 휴식 = flow (자유로움)
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q20_rhythm_feeling: {
    // A: 새로운 옵션에 호기심 = flow
    // B: 예측 가능함 원함 = anchor
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q36_rhythm_morning_evening: {
    // A: 이른 시간 집중 = anchor (규칙적 루틴)
    // B: 늦은 시간 = flow (유연한 시작)
    // C: 날마다 다름 = flow (비규칙적)
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
  },
  q37_rhythm_planslack: {
    // A: 빡빡하게 = anchor (철저한 계획)
    // B: 여유를 둔다 = flow (유연성)
    // C: 많이 계획 안함 = flow
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
  },
  q38_rhythm_batching: {
    // A: 몰아서 집중 후 휴식 = flow (유연한 스프린트)
    // B: 꾸준하고 일정한 페이스 = anchor (일관됨)
    // C: 실시간 처리 = flow
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q39_rhythm_contextswitch: {
    // A: 자극이 됨 = flow (변화를 즐김)
    // B: 최소화 = anchor (일관성 추구)
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q40_rhythm_deadtime: {
    // A: 즉흥적 아이디어 = flow
    // B: 계획된 일 정리 = anchor
    // C: 방향 없이 = flow
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
};

const resolveAxis = (axis: PersonaAxisKey, state: AxisState): PersonaAxisResult => {
  const [p1, p2] = AXES[axis];
  const a = state[axis][p1] ?? 0; // p1 = right side (radiant, visionary, logic, flow)
  const b = state[axis][p2] ?? 0; // p2 = left side (grounded, structured, empathic, anchor)
  const total = a + b || 1;
  const dominant = (a >= b ? p1 : p2) as PersonaPole;
  // score represents position on spectrum: 0% = full p2 (left), 100% = full p1 (right)
  const score = Math.round((a / total) * 100);
  return { pole: dominant, score };
};

const letterForAxis = (axis: PersonaAxisKey, pole: PersonaPole): string => {
  if (axis === 'energy') return pole === 'radiant' ? 'R' : 'G';
  if (axis === 'cognition') return pole === 'visionary' ? 'V' : 'S';
  if (axis === 'decision') return pole === 'logic' ? 'L' : 'H';
  return pole === 'flow' ? 'F' : 'A';
};

const fallbackArchetype = (code: string, locale: string = 'en') => {
  if (locale === 'ko') {
    return {
      code,
      name: '적응형 박학다식',
      summary: '모든 축에서 균형 잡힌 적응력 있는 강점을 가지고 있습니다.',
      strengths: ['유연성', '통합적 사고', '상황 인식'],
      cautions: ['결정을 미룰 수 있음', '불명확한 우선순위 위험'],
      idealRoles: ['제너럴리스트 PM', '운영 하이브리드', '창업자 어소시에이트'],
      growth: ['이번 시즌의 주요 방향 정하기', '작은 것부터 빠르게 실행하기'],
      compatibilityHint: '전문가와 함께하면 더 깊이 갈 수 있습니다; 당신은 접착제 역할을 합니다.',
    };
  }
  return {
    code,
    name: 'Adaptive Polymath',
    summary: 'Balanced across axes with adaptable strengths.',
    strengths: ['Flexible', 'Integrative thinking', 'Situational awareness'],
    cautions: ['May delay decisions', 'Risk of unclear priorities'],
    idealRoles: ['Generalist PM', 'Operations hybrid', 'Founder associate'],
    growth: ['Name a primary lane for this season', 'Ship smaller bets faster'],
    compatibilityHint: 'Pairs with specialists to go deeper; you provide glue.',
  };
};

export function analyzePersona(answers: PersonaQuizAnswers, locale: string = 'en'): PersonaAnalysis {
  const zeroAxis = (a: PersonaPole, b: PersonaPole): Record<PersonaPole, number> =>
    ({
      radiant: 0,
      grounded: 0,
      visionary: 0,
      structured: 0,
      logic: 0,
      empathic: 0,
      flow: 0,
      anchor: 0,
      [a]: 0,
      [b]: 0,
    } as Record<PersonaPole, number>);

  const state: AxisState = {
    energy: zeroAxis('radiant', 'grounded'),
    cognition: zeroAxis('visionary', 'structured'),
    decision: zeroAxis('logic', 'empathic'),
    rhythm: zeroAxis('flow', 'anchor'),
  };

  // Apply answer effects
  Object.entries(answers).forEach(([qId, choice]) => {
    const effects = choice ? EFFECTS[qId]?.[choice] : undefined;
    effects?.forEach(({ axis, pole, weight }) => {
      state[axis][pole] = (state[axis][pole] ?? 0) + weight;
    });
  });

  const axisResults: Record<PersonaAxisKey, PersonaAxisResult> = {
    energy: resolveAxis('energy', state),
    cognition: resolveAxis('cognition', state),
    decision: resolveAxis('decision', state),
    rhythm: resolveAxis('rhythm', state),
  };

  // Simple consistency check using pairs that should lean same pole
const CONSISTENCY_PAIRS: Array<[string, string]> = [
  ['q2_energy_weekend', 'q5_energy_idealday'],
  ['q3_energy_spontaneous', 'q4_energy_transit'],
  ['q21_energy_focus', 'q22_energy_solo_group'],
  ['q23_energy_interruptions', 'q25_energy_noise'],
  ['q16_rhythm_deadline', 'q19_rhythm_holiday'],
  ['q17_rhythm_change', 'q20_rhythm_feeling'],
  ['q36_rhythm_morning_evening', 'q37_rhythm_planslack'],
  ['q38_rhythm_batching', 'q39_rhythm_contextswitch'],
];
  let consistent = 0;
  let considered = 0;
  CONSISTENCY_PAIRS.forEach(([a, b]) => {
    const va = answers[a];
    const vb = answers[b];
    if (!va || !vb) return;
    considered += 1;
    if (va === vb) consistent += 1;
  });
  const consistencyScore = considered > 0 ? Math.round((consistent / considered) * 100) : undefined;
  const consistencyLabel =
    consistencyScore === undefined
      ? undefined
      : consistencyScore >= 75
      ? 'high'
      : consistencyScore >= 50
      ? 'moderate'
      : 'low';

  const typeCode = (
    letterForAxis('energy', axisResults.energy.pole) +
    letterForAxis('cognition', axisResults.cognition.pole) +
    letterForAxis('decision', axisResults.decision.pole) +
    letterForAxis('rhythm', axisResults.rhythm.pole)
  ) as string;

  const localizedArchetypes = getLocalizedArchetypes(locale);
  const archetype = localizedArchetypes[typeCode] ?? fallbackArchetype(typeCode, locale);

  const openness = axisResults.cognition.pole === 'visionary' ? axisResults.cognition.score : 100 - axisResults.cognition.score;
  const conscientiousness = axisResults.rhythm.pole === 'anchor' ? axisResults.rhythm.score : 100 - axisResults.rhythm.score;
  const extraversion = axisResults.energy.pole === 'radiant' ? axisResults.energy.score : 100 - axisResults.energy.score;
  const agreeableness = axisResults.decision.pole === 'empathic' ? axisResults.decision.score : 100 - axisResults.decision.score;

  const profile: PersonalityProfile = {
    openness,
    conscientiousness,
    extraversion,
    agreeableness,
    neuroticism: 50,
    introversion: 100 - extraversion,
    intuition: openness,
    thinking: axisResults.decision.pole === 'logic' ? axisResults.decision.score : 100 - axisResults.decision.score,
    perceiving: axisResults.rhythm.pole === 'flow' ? axisResults.rhythm.score : 100 - axisResults.rhythm.score,
    enneagram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 },
  };

  const primaryColor = `hsl(${180 + openness * 0.8}, 80%, 60%)`;
  const secondaryColor = `hsl(${axisResults.energy.pole === 'radiant' ? 210 : 330}, 75%, 65%)`;

  return {
    title: archetype.name,
    personaName: archetype.name,
    summary: archetype.summary,
    typeCode,
    axes: axisResults,
    consistencyScore,
    consistencyLabel,
    primaryColor,
    secondaryColor,
    strengths: archetype.strengths,
    challenges: archetype.cautions,
    career: archetype.idealRoles.slice(0, 3).join(', '),
    relationships: archetype.compatibilityHint,
    guidance: archetype.growth.join(' '),
    growthTips: archetype.growth,
    keyMotivations: locale === 'ko' ? [
      axisResults.energy.pole === 'radiant' ? '가시성과 추진력' : '깊이와 안정감',
      axisResults.cognition.pole === 'visionary' ? '가능성과 패턴' : '명확성과 증거',
      axisResults.decision.pole === 'empathic' ? '사람에 대한 영향력' : '객관적 정확성',
    ] : [
      axisResults.energy.pole === 'radiant' ? 'Visibility and momentum' : 'Depth and steadiness',
      axisResults.cognition.pole === 'visionary' ? 'Possibility and patterns' : 'Clarity and proof',
      axisResults.decision.pole === 'empathic' ? 'People impact' : 'Objective correctness',
    ],
    recommendedRoles: archetype.idealRoles,
    compatibilityHint: archetype.compatibilityHint,
    profile,
  };
}
