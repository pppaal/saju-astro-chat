// src/lib/aura/analysis.ts
import { AuraQuizAnswers, PersonalityProfile, AuraAnalysis } from '@/lib/aura/types';

const clampPct = (v: number, max: number) =>
  Math.max(0, Math.min(100, Math.round((v / max) * 100)));

export function analyzeAura(answers: AuraQuizAnswers): AuraAnalysis {
  let extraversion = 0,
    introversion = 0,
    sensing = 0,
    intuition = 0,
    thinking = 0,
    feeling = 0,
    judging = 0,
    perceiving = 0;

  let openness = 0,
    conscientiousness = 0,
    agreeableness = 0,
    neuroticism = 0;

  const enneagram: Record<string, number> = {
    '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0,
  };

  if (answers.q1_energy === 'A') extraversion++; else introversion++;
  if (answers.q2_focus === 'A') intuition++; else sensing++;
  if (answers.q3_decision === 'A') thinking++; else feeling++;
  if (answers.q4_planning === 'A') { judging++; conscientiousness += 2; } else { perceiving++; conscientiousness--; }
  if (answers.q5_new_ideas === 'A') openness += 2; else openness--;
  if (answers.q6_chores === 'A') conscientiousness += 2; else conscientiousness--;
  if (answers.q7_conflict === 'A') agreeableness += 2; else agreeableness--;
  if (answers.q8_stress === 'A') neuroticism += 2; else neuroticism--;

  switch (answers.q9_motivation) {
    case 'A': enneagram['6']++; break;
    case 'B': enneagram['1']++; break;
    case 'C': enneagram['4']++; break;
    case 'D': enneagram['3']++; break;
  }
  switch (answers.q10_fear) {
    case 'A': enneagram['8']++; break;
    case 'B': enneagram['7']++; break;
    case 'C': enneagram['9']++; break;
    case 'D': { enneagram['2']++; enneagram['3']++; break; }
  }

  const profile: PersonalityProfile = {
    extraversion: clampPct(extraversion, 1),
    introversion: clampPct(introversion, 1),
    intuition: clampPct(intuition, 1),
    thinking: clampPct(thinking, 1),
    perceiving: clampPct(perceiving, 1),
    openness: clampPct(openness, 2),
    conscientiousness: clampPct(conscientiousness, 4),
    agreeableness: clampPct(agreeableness, 2),
    neuroticism: clampPct(neuroticism, 2),
    enneagram,
  };

  let title = 'The Balanced Soul';
  let summary = 'You navigate the world with a rare balance of logic and emotion, planning and spontaneity.';
  let strengths = ['Adaptable', 'Well-rounded', 'Resilient'];
  let challenges = ['Can be indecisive', 'May lack a single-minded focus'];
  let career = 'Great fit for roles that blend technical skill and people focus.';
  let relationships = 'Stable and understanding partner.';
  let guidance = 'Embrace your multifaceted nature.';

  if (profile.intuition > 60 && profile.thinking > 60 && profile.conscientiousness > 70) {
    title = 'The Visionary Architect';
    summary = 'You don\'t just dream of the future; you build the blueprints for it.';
    strengths = ['Strategic Thinking', 'Long-range Planning', 'Intellectual Rigor'];
    challenges = ['Can seem detached', 'Perfectionistic', 'Impatient with inefficiency'];
    career = 'CEO, systems architect, research scientist, strategist.';
    guidance = 'Share your why to inspire others to join your cause.';
  }

  if (profile.extraversion > 60 && profile.agreeableness > 70 && (profile.enneagram['2'] > 0 || profile.enneagram['9'] > 0)) {
    title = 'The Compassionate Catalyst';
    summary = 'A natural connector driven by empathy and harmony.';
    strengths = ['High Empathy', 'Team Building', 'Inspirational Communication'];
    challenges = ['Neglects own needs', 'Avoids necessary conflict'];
    career = 'HR leader, non-profit director, therapist, teacher, community manager.';
    guidance = 'Schedule time for your own needs; your well-being fuels your gift.';
  }

  if (profile.openness > 70 && profile.perceiving > 60 && profile.enneagram['7'] > 0) {
    title = 'The Creative Adventurer';
    summary = 'Curious, spontaneous, and imaginative.';
    strengths = ['Divergent Thinking', 'Spontaneity', 'Optimism', 'Adaptability'];
    challenges = ['Follow-through', 'Boredom with routine'];
    career = 'Entrepreneur, artist, brand strategist, R&D.';
    guidance = 'Pick a few meaningful projects and commit to them.';
  }

  return {
    title,
    summary,
    strengths,
    challenges,
    career,
    relationships,
    guidance,
    profile,
    primaryColor: `hsl(${180 + profile.openness * 1.5}, 80%, 60%)`,
    secondaryColor: `hsl(${300 + profile.agreeableness}, 85%, 65%)`,
  };
}