// src/lib/aura/questions.ts
export type AuraOption = { id: string; text: string };
export type AuraQuestion = { id: string; text: string; options: AuraOption[] };

export const questions: AuraQuestion[] = [
  {
    id: 'q1_energy',
    text: 'After a busy week of social activities, you feel:',
    options: [
      { id: 'A', text: 'Energized and ready for more.' },
      { id: 'B', text: 'Drained and in need of solitude to recharge.' },
    ],
  },
  {
    id: 'q2_focus',
    text: 'When learning something new, you prefer:',
    options: [
      { id: 'A', text: 'To understand the underlying concepts and theories first.' },
      { id: 'B', text: 'To get hands-on experience with practical applications.' },
    ],
  },
  {
    id: 'q3_decision',
    text: 'You are asked to make a difficult decision at work. Your primary consideration is:',
    options: [
      { id: 'A', text: 'The logical and objective consequences for the company.' },
      { id: 'B', text: 'The impact on the people involved and team harmony.' },
    ],
  },
  {
    id: 'q4_planning',
    text: 'When it comes to a vacation:',
    options: [
      { id: 'A', text: 'You prefer a detailed itinerary to make the most of your time.' },
      { id: 'B', text: 'You prefer to leave your options open and go with the flow.' },
    ],
  },
  {
    id: 'q5_new_ideas',
    text: 'You are most drawn to ideas that are:',
    options: [
      { id: 'A', text: 'Abstract, novel, and challenge your perspective.' },
      { id: 'B', text: 'Traditional, proven, and grounded in reality.' },
    ],
  },
  {
    id: 'q6_chores',
    text: 'When faced with a tedious but necessary task, you tend to:',
    options: [
      { id: 'A', text: 'Do it immediately to get it out of the way.' },
      { id: 'B', text: 'Procrastinate and wait until the last minute.' },
    ],
  },
  {
    id: 'q7_conflict',
    text: 'In a disagreement, your priority is:',
    options: [
      { id: 'A', text: 'To find a compromise that makes everyone feel heard.' },
      { id: 'B', text: 'To defend your position and win the argument.' },
    ],
  },
  {
    id: 'q8_stress',
    text: 'When something unexpected goes wrong, you are more likely to feel:',
    options: [
      { id: 'A', text: 'Anxious and worried about the potential outcomes.' },
      { id: 'B', text: 'Calm and confident in your ability to handle it.' },
    ],
  },
  {
    id: 'q9_motivation',
    text: 'At your core, you are most driven by a need for:',
    options: [
      { id: 'A', text: 'Security and support.' },
      { id: 'B', text: 'Perfection and improvement.' },
      { id: 'C', text: 'Uniqueness and self-expression.' },
      { id: 'D', text: 'Success and admiration.' },
    ],
  },
  {
    id: 'q10_fear',
    text: 'Your greatest fear is:',
    options: [
      { id: 'A', text: 'Being controlled or limited by others.' },
      { id: 'B', text: 'Missing out on exciting experiences.' },
      { id: 'C', text: 'Being in conflict with those you care about.' },
      { id: 'D', text: 'Being seen as incapable or worthless.' },
    ],
  },
];

export const TOTAL_QUESTIONS = questions.length;    