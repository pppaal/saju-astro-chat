import { AURA_ARCHETYPES } from './archetypes';
import {
  AuraAnalysis,
  AuraAxisKey,
  AuraAxisResult,
  AuraPole,
  AuraQuizAnswers,
  PersonalityProfile,
} from './types';

type AxisState = Record<AuraAxisKey, Record<AuraPole, number>>;

const AXES: Record<AuraAxisKey, [AuraPole, AuraPole]> = {
  energy: ['radiant', 'grounded'],
  cognition: ['visionary', 'structured'],
  decision: ['logic', 'empathic'],
  rhythm: ['flow', 'anchor'],
};

type Effect = { axis: AuraAxisKey; pole: AuraPole; weight: number };
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
  q16_rhythm_deadline: {
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 2 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 2 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q17_rhythm_change: {
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q18_rhythm_workstyle: {
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q19_rhythm_holiday: {
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q20_rhythm_feeling: {
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q36_rhythm_morning_evening: {
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q37_rhythm_planslack: {
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q38_rhythm_batching: {
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q39_rhythm_contextswitch: {
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q40_rhythm_deadtime: {
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 0.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
};

const resolveAxis = (axis: AuraAxisKey, state: AxisState): AuraAxisResult => {
  const [p1, p2] = AXES[axis];
  const a = state[axis][p1] ?? 0;
  const b = state[axis][p2] ?? 0;
  const total = a + b || 1;
  const dominant = (a >= b ? p1 : p2) as AuraPole;
  const dominantScore = Math.round(((a >= b ? a : b) / total) * 100);
  return { pole: dominant, score: dominantScore };
};

const letterForAxis = (axis: AuraAxisKey, pole: AuraPole): string => {
  if (axis === 'energy') return pole === 'radiant' ? 'R' : 'G';
  if (axis === 'cognition') return pole === 'visionary' ? 'V' : 'S';
  if (axis === 'decision') return pole === 'logic' ? 'L' : 'H';
  return pole === 'flow' ? 'F' : 'A';
};

const fallbackArchetype = (code: string) => ({
  code,
  name: 'Adaptive Polymath',
  summary: 'Balanced across axes with adaptable strengths.',
  strengths: ['Flexible', 'Integrative thinking', 'Situational awareness'],
  cautions: ['May delay decisions', 'Risk of unclear priorities'],
  idealRoles: ['Generalist PM', 'Operations hybrid', 'Founder associate'],
  growth: ['Name a primary lane for this season', 'Ship smaller bets faster'],
  compatibilityHint: 'Pairs with specialists to go deeper; you provide glue.',
});

export function analyzeAura(answers: AuraQuizAnswers): AuraAnalysis {
  const zeroAxis = (a: AuraPole, b: AuraPole): Record<AuraPole, number> =>
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
    } as Record<AuraPole, number>);

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

  const axisResults: Record<AuraAxisKey, AuraAxisResult> = {
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

  const archetype = AURA_ARCHETYPES[typeCode] ?? fallbackArchetype(typeCode);

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
    keyMotivations: [
      axisResults.energy.pole === 'radiant' ? 'Visibility and momentum' : 'Depth and steadiness',
      axisResults.cognition.pole === 'visionary' ? 'Possibility and patterns' : 'Clarity and proof',
      axisResults.decision.pole === 'empathic' ? 'People impact' : 'Objective correctness',
    ],
    recommendedRoles: archetype.idealRoles,
    compatibilityHint: archetype.compatibilityHint,
    profile,
  };
}
