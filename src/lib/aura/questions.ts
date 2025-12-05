// src/lib/aura/questions.ts
export type AuraOption = { id: string; text: string };
export type AuraQuestion = { id: string; text: string; options: AuraOption[] };

// Custom “Nova” personality battery (MBTI-tier depth, copyright-safe).
export const questions: AuraQuestion[] = [
  {
    id: 'q1_energy',
    text: 'After a day full of people and meetings, you:',
    options: [
      { id: 'A', text: 'Feel charged and want to keep the momentum going.' },
      { id: 'B', text: 'Need quiet space to reset before engaging again.' },
    ],
  },
  {
    id: 'q2_strategy',
    text: 'Starting a new project, you first:',
    options: [
      { id: 'A', text: 'Map possibilities and future scenarios.' },
      { id: 'B', text: 'Define concrete steps and resources.' },
    ],
  },
  {
    id: 'q3_planning',
    text: 'For trips or big milestones, you prefer:',
    options: [
      { id: 'A', text: 'A structured plan with checkpoints.' },
      { id: 'B', text: 'A light outline and freedom to improvise.' },
    ],
  },
  {
    id: 'q4_conflict',
    text: 'In tension with someone you value, you lean toward:',
    options: [
      { id: 'A', text: 'Stating the facts and clarifying principles.' },
      { id: 'B', text: 'Reading the room and protecting the relationship.' },
    ],
  },
  {
    id: 'q5_risk',
    text: 'When an unexpected opportunity appears, you:',
    options: [
      { id: 'A', text: 'Say yes and figure it out en route.' },
      { id: 'B', text: 'Pause to confirm stability and fit.' },
    ],
  },
  {
    id: 'q6_learning',
    text: 'You grasp ideas fastest when they are:',
    options: [
      { id: 'A', text: 'Presented as patterns, models, or metaphors.' },
      { id: 'B', text: 'Broken into examples and step-by-step proof.' },
    ],
  },
  {
    id: 'q7_deadlines',
    text: 'On deadlines you typically:',
    options: [
      { id: 'A', text: 'Start early and track progress steadily.' },
      { id: 'B', text: 'Surge near the end when pressure is highest.' },
    ],
  },
  {
    id: 'q8_team_role',
    text: 'In a team setting you naturally:',
    options: [
      { id: 'A', text: 'Spark ideas and rally energy.' },
      { id: 'B', text: 'Coordinate tasks and keep execution on track.' },
    ],
  },
  {
    id: 'q9_decision',
    text: 'Important choices are settled by:',
    options: [
      { id: 'A', text: 'Evidence, structure, and clear trade-offs.' },
      { id: 'B', text: 'Values, people impact, and gut coherence.' },
    ],
  },
  {
    id: 'q10_recharge',
    text: 'Your ideal recharge day is:',
    options: [
      { id: 'A', text: 'Spontaneous hangs or events with others.' },
      { id: 'B', text: 'Solo time, deep focus, or a quiet ritual.' },
    ],
  },
  {
    id: 'q11_change',
    text: 'When plans change last-minute, you:',
    options: [
      { id: 'A', text: 'See options and pivot quickly.' },
      { id: 'B', text: 'Prefer to stabilize and minimize surprises.' },
    ],
  },
  {
    id: 'q12_expression',
    text: 'Sharing your work, you tend to:',
    options: [
      { id: 'A', text: 'Show early drafts to gather reactions.' },
      { id: 'B', text: 'Refine privately before unveiling.' },
    ],
  },
];

export const TOTAL_QUESTIONS = questions.length;
