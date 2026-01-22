import { PERSONA_ARCHETYPES, getLocalizedArchetypes } from './archetypes';
import {
  PersonaAnalysis,
  PersonaAxisKey,
  PersonaAxisResult,
  PersonaPole,
  PersonaQuizAnswers,
  PersonalityProfile,
  PersonaCompatibilityResult,
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

// Map each answer to axis/pole weights. C = neutral/balanced (equal weight to both)
export const EFFECTS: AnswerEffects = {
  // Energy (Radiant vs Grounded) - 10 questions
  q1_energy_network: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q2_energy_weekend: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q3_energy_spontaneous: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q4_energy_transit: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q5_energy_idealday: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 2 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 2 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q21_energy_focus: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q22_energy_solo_group: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q23_energy_interruptions: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q24_energy_events: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },
  q25_energy_noise: {
    A: [{ axis: 'energy', pole: 'radiant', weight: 1 }],
    B: [{ axis: 'energy', pole: 'grounded', weight: 1 }],
    C: [{ axis: 'energy', pole: 'radiant', weight: 1 }, { axis: 'energy', pole: 'grounded', weight: 1 }],
  },

  // Cognition (Visionary vs Structured) - 10 questions
  q6_cog_problem: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 2 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 2 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q7_cog_explain: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q8_cog_evaluate: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 2 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 2 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q9_cog_basis: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q10_cog_constraints: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q26_cog_detail_bigpicture: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q27_cog_rule_break: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q28_cog_metrics_story: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q29_cog_timehorizon: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },
  q30_cog_changecomfort: {
    A: [{ axis: 'cognition', pole: 'visionary', weight: 1 }],
    B: [{ axis: 'cognition', pole: 'structured', weight: 1 }],
    C: [{ axis: 'cognition', pole: 'visionary', weight: 1 }, { axis: 'cognition', pole: 'structured', weight: 1 }],
  },

  // Decision (Logic vs Empathic) - 10 questions
  q11_decision_conflict: {
    A: [{ axis: 'decision', pole: 'logic', weight: 2 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 2 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q12_decision_feedback: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q13_decision_resources: {
    A: [{ axis: 'decision', pole: 'logic', weight: 2 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 2 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q14_decision_rules: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q15_decision_delay: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q31_decision_dataemotion: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q32_decision_feedback_tone: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q33_decision_risk: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q34_decision_delegate: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
  },
  q35_decision_conflict_speed: {
    A: [{ axis: 'decision', pole: 'logic', weight: 1 }],
    B: [{ axis: 'decision', pole: 'empathic', weight: 1 }],
    C: [{ axis: 'decision', pole: 'logic', weight: 1 }, { axis: 'decision', pole: 'empathic', weight: 1 }],
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
    C: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }, { axis: 'rhythm', pole: 'flow', weight: 1 }],
  },
  q17_rhythm_change: {
    // A: 빠르게 피벗 = flow
    // B: 신중하게 재계획 = anchor
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1 }, { axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q18_rhythm_workstyle: {
    // A: 병렬 처리 = flow (멀티태스킹)
    // B: 하나씩 집중 = anchor (체계적)
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1 }, { axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q19_rhythm_holiday: {
    // A: 즉흥적 외출 = flow
    // B: 계획된 일정 = anchor
    // C: 아무 일정 없이 휴식 = neutral
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1 }, { axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q20_rhythm_feeling: {
    // A: 새로운 옵션에 호기심 = flow
    // B: 예측 가능함 원함 = anchor
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1 }, { axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q36_rhythm_morning_evening: {
    // A: 이른 시간 집중 = anchor (규칙적 루틴)
    // B: 늦은 시간 = flow (유연한 시작)
    // C: 날마다 다름 = flow (비규칙적)
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q37_rhythm_planslack: {
    // A: 빡빡하게 = anchor (철저한 계획)
    // B: 여유를 둔다 = 균형
    // C: 많이 계획 안함 = flow
    A: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'flow', weight: 1 }, { axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
  },
  q38_rhythm_batching: {
    // A: 몰아서 집중 후 휴식 = flow (유연한 스프린트)
    // B: 꾸준하고 일정한 페이스 = anchor (일관됨)
    // C: 실시간 처리 = neutral
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1 }, { axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q39_rhythm_contextswitch: {
    // A: 자극이 됨 = flow (변화를 즐김)
    // B: 최소화 = anchor (일관성 추구)
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1 }, { axis: 'rhythm', pole: 'anchor', weight: 1 }],
  },
  q40_rhythm_deadtime: {
    // A: 즉흥적 아이디어 = flow
    // B: 계획된 일 정리 = anchor
    // C: 방향 없이 = flow-leaning
    A: [{ axis: 'rhythm', pole: 'flow', weight: 1 }],
    B: [{ axis: 'rhythm', pole: 'anchor', weight: 1 }],
    C: [{ axis: 'rhythm', pole: 'flow', weight: 1.5 }, { axis: 'rhythm', pole: 'anchor', weight: 0.5 }],
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
  // Energy axis (4 pairs)
  ['q1_energy_network', 'q24_energy_events'],       // 대인 에너지 - 대규모 행사
  ['q2_energy_weekend', 'q5_energy_idealday'],      // 주말 계획 - 이상적인 하루
  ['q3_energy_spontaneous', 'q4_energy_transit'],   // 즉흥성 - 대기 시간
  ['q21_energy_focus', 'q22_energy_solo_group'],    // 재충전 - 사고 방식

  // Cognition axis (4 pairs)
  ['q6_cog_problem', 'q8_cog_evaluate'],            // 문제 접근 - 아이디어 평가
  ['q7_cog_explain', 'q26_cog_detail_bigpicture'],  // 학습 방식 - 작업 결과물
  ['q9_cog_basis', 'q29_cog_timehorizon'],          // 결정 기반 - 시간 지평
  ['q27_cog_rule_break', 'q30_cog_changecomfort'],  // 프로세스 - 변화 수용

  // Decision axis (4 pairs)
  ['q11_decision_conflict', 'q35_decision_conflict_speed'], // 갈등 접근
  ['q12_decision_feedback', 'q32_decision_feedback_tone'],  // 피드백 스타일
  ['q13_decision_resources', 'q31_decision_dataemotion'],   // 자원 배분 - 데이터 vs 감정
  ['q33_decision_risk', 'q34_decision_delegate'],           // 위험 수용 - 위임

  // Rhythm axis (4 pairs)
  ['q16_rhythm_deadline', 'q38_rhythm_batching'],   // 마감 - 작업 처리
  ['q17_rhythm_change', 'q20_rhythm_feeling'],      // 변화 대응 - 계획 변경 감정
  ['q18_rhythm_workstyle', 'q39_rhythm_contextswitch'], // 작업 스타일 - 컨텍스트 스위칭
  ['q19_rhythm_holiday', 'q37_rhythm_planslack'],   // 휴일 - 계획 여유
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

/**
 * Get compatibility between two Nova Persona archetypes
 */
export function getPersonaCompatibility(
  code1: string,
  code2: string,
  axes1: Record<PersonaAxisKey, PersonaAxisResult>,
  axes2: Record<PersonaAxisKey, PersonaAxisResult>,
  locale: string = 'en'
): PersonaCompatibilityResult {
  let score = 50; // Start at neutral
  const synergies: string[] = [];
  const synergiesKo: string[] = [];
  const tensions: string[] = [];
  const tensionsKo: string[] = [];

  // Energy axis compatibility
  const energyDiff = Math.abs(axes1.energy.score - axes2.energy.score);
  if (energyDiff < 20) {
    // Similar energy levels = good match
    score += 10;
    synergies.push('Similar energy levels create natural understanding');
    synergiesKo.push('비슷한 에너지 레벨로 자연스러운 이해 형성');
  } else if (energyDiff > 60) {
    // Very different energy levels = potential friction
    score -= 5;
    tensions.push('Different social energy needs may require compromise');
    tensionsKo.push('다른 사회적 에너지 요구로 타협 필요');
  }

  // Cognition axis compatibility
  const cognitionDiff = Math.abs(axes1.cognition.score - axes2.cognition.score);
  if (cognitionDiff > 40) {
    // Complementary: visionary + structured = powerful combo
    score += 15;
    synergies.push('Complementary thinking styles create balanced perspectives');
    synergiesKo.push('상호보완적 사고 방식으로 균형잡힌 관점 형성');
  } else if (cognitionDiff < 15) {
    // Same thinking style = easy communication but less growth
    score += 5;
    synergies.push('Shared cognitive approach enables smooth communication');
    synergiesKo.push('공유된 인지 방식으로 원활한 소통');
  }

  // Decision axis compatibility
  const decisionDiff = Math.abs(axes1.decision.score - axes2.decision.score);
  if (decisionDiff > 50) {
    // Logic + Empathic = potential conflict in decision-making
    score -= 5;
    tensions.push('Different decision-making values may cause friction');
    tensionsKo.push('다른 의사결정 가치관으로 마찰 가능');
  } else if (decisionDiff < 20) {
    // Similar decision style = aligned values
    score += 10;
    synergies.push('Aligned values create harmony in tough choices');
    synergiesKo.push('일치된 가치관으로 어려운 선택에서 조화');
  }

  // Rhythm axis compatibility
  const rhythmDiff = Math.abs(axes1.rhythm.score - axes2.rhythm.score);
  if (rhythmDiff > 40 && rhythmDiff < 70) {
    // Moderate difference = complementary pacing
    score += 10;
    synergies.push('Different work rhythms create balanced productivity');
    synergiesKo.push('다른 작업 리듬으로 균형잡힌 생산성');
  } else if (rhythmDiff > 70) {
    // Extreme difference = lifestyle clash
    score -= 10;
    tensions.push('Very different pacing styles may require adjustment');
    tensionsKo.push('매우 다른 페이스 스타일로 조정 필요');
  } else {
    // Similar rhythm = easy coordination
    score += 5;
    synergies.push('Similar work rhythms enable easy coordination');
    synergiesKo.push('비슷한 작업 리듬으로 쉬운 조율');
  }

  // Same archetype bonus
  if (code1 === code2) {
    score += 10;
    synergies.push('Deep mutual understanding from shared archetype');
    synergiesKo.push('같은 원형에서 깊은 상호 이해');
  }

  // Special synergy combinations
  const isVisionary1 = axes1.cognition.pole === 'visionary';
  const isVisionary2 = axes2.cognition.pole === 'visionary';
  const isStructured1 = axes1.cognition.pole === 'structured';
  const isStructured2 = axes2.cognition.pole === 'structured';

  if ((isVisionary1 && isStructured2) || (isVisionary2 && isStructured1)) {
    score += 10;
    synergies.push('Visionary ideas meet structured execution');
    synergiesKo.push('비전적 아이디어와 체계적 실행의 만남');
  }

  const isRadiant1 = axes1.energy.pole === 'radiant';
  const isRadiant2 = axes2.energy.pole === 'radiant';
  const isGrounded1 = axes1.energy.pole === 'grounded';
  const isGrounded2 = axes2.energy.pole === 'grounded';

  if ((isRadiant1 && isGrounded2) || (isRadiant2 && isGrounded1)) {
    score += 5;
    synergies.push('Energizer and stabilizer balance each other');
    synergiesKo.push('활력자와 안정자의 균형');
  }

  // Ensure score is in valid range
  score = Math.max(30, Math.min(95, score));

  let level: string;
  let levelKo: string;
  let description: string;
  let descriptionKo: string;

  if (score >= 80) {
    level = 'Excellent Match';
    levelKo = '탁월한 궁합';
    description = 'Your personas create powerful synergy. You bring out the best in each other.';
    descriptionKo = '당신의 인격들이 강력한 시너지를 만듭니다. 서로의 최고를 끌어냅니다.';
  } else if (score >= 65) {
    level = 'Good Match';
    levelKo = '좋은 궁합';
    description = 'Your personas complement each other well with natural harmony.';
    descriptionKo = '당신의 인격이 자연스러운 조화로 잘 보완합니다.';
  } else if (score >= 50) {
    level = 'Moderate Match';
    levelKo = '보통 궁합';
    description = 'Your personas can work together with mutual understanding and effort.';
    descriptionKo = '상호 이해와 노력으로 함께 작동할 수 있습니다.';
  } else {
    level = 'Challenging Match';
    levelKo = '도전적 궁합';
    description = 'Your personas have different approaches that require conscious bridging.';
    descriptionKo = '의식적인 연결이 필요한 다른 접근 방식을 가집니다.';
  }

  return {
    score,
    level,
    levelKo,
    description,
    descriptionKo,
    synergies,
    synergiesKo,
    tensions,
    tensionsKo,
  };
}
