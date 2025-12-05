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

// Map each answer to axis/pole weights (custom, copyright-safe “Nova” model).
const EFFECTS: AnswerEffects = {
  q1_energy: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
  },
  q2_strategy: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 2 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 2 }],
  },
  q3_planning: {
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 2 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 2 }],
  },
  q4_conflict: {
    A: [{ axis: 'decision', pole: 'logic', weight: 2 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 2 }],
  },
  q5_risk: {
    A: [
      { axis: 'energy', pole: 'radiant', weight: 1 },
      { axis: 'rhythm', pole: 'flow', weight: 1 },
    ],
    B: [
      { axis: 'energy', pole: 'grounded', weight: 1 },
      { axis: 'rhythm', pole: 'anchor', weight: 1 },
    ],
  },
  q6_learning: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q7_deadlines: {
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
  },
  q8_team_role: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q9_decision: {
    A: [{ axis: 'decision', pole: 'logic', weight: 2 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 2 }],
  },
  q10_recharge: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
  },
  q11_change: {
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q12_expression: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
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
