// src/lib/persona/questions.ts
export type PersonaOption = { id: string; text: string };
export type PersonaQuestion = { id: string; text: string; options: PersonaOption[] };

// Custom "Nova" personality battery - 3 options per question
export const questions: PersonaQuestion[] = [
  // Energy (Radiant vs Grounded) - 10 questions
  {
    id: 'q1_energy_network',
    text: 'After a day full of people and meetings, you:',
    options: [
      { id: 'A', text: 'Feel charged and want to keep going.' },
      { id: 'B', text: 'Need quiet space to reset.' },
      { id: 'C', text: 'Depends on my mood that day.' },
    ],
  },
  {
    id: 'q2_energy_weekend',
    text: 'On a long weekend, you prefer to:',
    options: [
      { id: 'A', text: 'Pack the calendar with plans.' },
      { id: 'B', text: 'Leave generous open blocks.' },
      { id: 'C', text: 'Mix of both - some plans, some free time.' },
    ],
  },
  {
    id: 'q3_energy_spontaneous',
    text: 'When invited to a sudden gathering, you usually:',
    options: [
      { id: 'A', text: "Say 'let's go' without much hesitation." },
      { id: 'B', text: 'Pause and decide after some thought.' },
      { id: 'C', text: 'Check who else is going first.' },
    ],
  },
  {
    id: 'q4_energy_transit',
    text: 'During travel/wait times, you tend to:',
    options: [
      { id: 'A', text: 'Chat and engage with people around you.' },
      { id: 'B', text: 'Use headphones and stay in your own zone.' },
      { id: 'C', text: 'Read or browse casually.' },
    ],
  },
  {
    id: 'q5_energy_idealday',
    text: 'Your ideal day looks like:',
    options: [
      { id: 'A', text: 'Many activities/people in one day.' },
      { id: 'B', text: 'A few set activities + ample solo time.' },
      { id: 'C', text: 'Flexible flow without strict plans.' },
    ],
  },
  {
    id: 'q21_energy_focus',
    text: 'In long work sessions, you recharge more by:',
    options: [
      { id: 'A', text: 'Quick chats/interaction between tasks.' },
      { id: 'B', text: 'Staying in your own lane with minimal breaks.' },
      { id: 'C', text: 'Taking walks or physical breaks.' },
    ],
  },
  {
    id: 'q22_energy_solo_group',
    text: 'You do your best thinking:',
    options: [
      { id: 'A', text: 'In group brainstorming energy.' },
      { id: 'B', text: 'Alone, refining quietly.' },
      { id: 'C', text: 'Writing or journaling ideas.' },
    ],
  },
  {
    id: 'q23_energy_interruptions',
    text: 'Frequent pings/interruptions feel:',
    options: [
      { id: 'A', text: 'Invigorating; you like the buzz.' },
      { id: 'B', text: 'Draining; you prefer uninterrupted blocks.' },
      { id: 'C', text: 'Fine if scheduled, annoying if random.' },
    ],
  },
  {
    id: 'q24_energy_events',
    text: 'At large events, you tend to:',
    options: [
      { id: 'A', text: 'Work the room and meet many.' },
      { id: 'B', text: 'Stay with a few or observe quietly.' },
      { id: 'C', text: 'Focus on the event content itself.' },
    ],
  },
  {
    id: 'q25_energy_noise',
    text: 'Background noise while working:',
    options: [
      { id: 'A', text: 'Helps—music/cafe hum boosts you.' },
      { id: 'B', text: 'Hurts—you need quiet to focus.' },
      { id: 'C', text: 'White noise or instrumental only.' },
    ],
  },

  // Cognition (Visionary vs Structured) - 10 questions
  {
    id: 'q6_cog_problem',
    text: 'Facing a new problem, you first:',
    options: [
      { id: 'A', text: 'Spot patterns and possible models.' },
      { id: 'B', text: 'List requirements and a checklist.' },
      { id: 'C', text: 'Research what others have done.' },
    ],
  },
  {
    id: 'q7_cog_explain',
    text: 'When learning, you prefer explanations that start with:',
    options: [
      { id: 'A', text: 'The big picture then examples.' },
      { id: 'B', text: 'Concrete examples then the principle.' },
      { id: 'C', text: 'Hands-on practice first.' },
    ],
  },
  {
    id: 'q8_cog_evaluate',
    text: 'Evaluating an idea, you lean toward:',
    options: [
      { id: 'A', text: 'Novelty and potential impact.' },
      { id: 'B', text: 'Feasibility and risks.' },
      { id: 'C', text: 'Team alignment and buy-in.' },
    ],
  },
  {
    id: 'q9_cog_basis',
    text: 'Decisions feel solid when they are built on:',
    options: [
      { id: 'A', text: '"Why" and future scenarios.' },
      { id: 'B', text: '"What/when/who" and process.' },
      { id: 'C', text: 'Gut feeling backed by experience.' },
    ],
  },
  {
    id: 'q10_cog_constraints',
    text: 'When new constraints appear, you:',
    options: [
      { id: 'A', text: 'Retool the concept to fit the future.' },
      { id: 'B', text: 'Re-sequence the plan to fit realities.' },
      { id: 'C', text: 'Negotiate to remove the constraint.' },
    ],
  },
  {
    id: 'q26_cog_detail_bigpicture',
    text: 'You are more satisfied when work outputs are:',
    options: [
      { id: 'A', text: 'Visionary narratives or prototypes.' },
      { id: 'B', text: 'Detailed specs or checklists.' },
      { id: 'C', text: 'Working demos users can try.' },
    ],
  },
  {
    id: 'q27_cog_rule_break',
    text: 'If a process slows you down, you:',
    options: [
      { id: 'A', text: 'Find a new pattern or shortcut.' },
      { id: 'B', text: 'Refine existing steps within the rules.' },
      { id: 'C', text: 'Propose changes to the process officially.' },
    ],
  },
  {
    id: 'q28_cog_metrics_story',
    text: 'Persuasion works best on you via:',
    options: [
      { id: 'A', text: 'Story/analogy of future possibilities.' },
      { id: 'B', text: 'Metrics and viability evidence.' },
      { id: 'C', text: 'Social proof and testimonials.' },
    ],
  },
  {
    id: 'q29_cog_timehorizon',
    text: 'You naturally think more about:',
    options: [
      { id: 'A', text: 'Long-term arcs and emerging trends.' },
      { id: 'B', text: 'Near-term execution and milestones.' },
      { id: 'C', text: 'Present moment opportunities.' },
    ],
  },
  {
    id: 'q30_cog_changecomfort',
    text: 'When requirements change midstream, you feel:',
    options: [
      { id: 'A', text: 'Energized by reimagining the solution.' },
      { id: 'B', text: 'Prefer to lock scope and avoid churn.' },
      { id: 'C', text: 'Accept it as part of the process.' },
    ],
  },

  // Decision (Logic vs Empathic) - 10 questions
  {
    id: 'q11_decision_conflict',
    text: 'In a team conflict, you focus first on:',
    options: [
      { id: 'A', text: 'Principles and performance.' },
      { id: 'B', text: 'Relationships and emotions.' },
      { id: 'C', text: 'Finding a compromise everyone accepts.' },
    ],
  },
  {
    id: 'q12_decision_feedback',
    text: 'Your feedback style is usually:',
    options: [
      { id: 'A', text: 'Direct and fact-focused.' },
      { id: 'B', text: 'Contextual with cushioning.' },
      { id: 'C', text: 'Written to allow processing time.' },
    ],
  },
  {
    id: 'q13_decision_resources',
    text: 'When allocating resources, you prioritize:',
    options: [
      { id: 'A', text: 'ROI and clear priorities.' },
      { id: 'B', text: 'Team morale and learning.' },
      { id: 'C', text: 'Fairness and equal distribution.' },
    ],
  },
  {
    id: 'q14_decision_rules',
    text: 'Catching a rule break, you believe:',
    options: [
      { id: 'A', text: 'Consistency is fairness.' },
      { id: 'B', text: 'Contextual flexibility is fairness.' },
      { id: 'C', text: 'Depends on intent behind the action.' },
    ],
  },
  {
    id: 'q15_decision_delay',
    text: 'If you postpone a decision, it is usually because:',
    options: [
      { id: 'A', text: 'Data/arguments feel insufficient.' },
      { id: 'B', text: 'People/feelings need more alignment.' },
      { id: 'C', text: 'Waiting for external factors to clarify.' },
    ],
  },
  {
    id: 'q31_decision_dataemotion',
    text: 'To reach a decision, you weigh more:',
    options: [
      { id: 'A', text: 'Data, trade-offs, objective impact.' },
      { id: 'B', text: 'Team pulse, stakeholder emotions.' },
      { id: 'C', text: 'Past precedents and patterns.' },
    ],
  },
  {
    id: 'q32_decision_feedback_tone',
    text: 'When receiving blunt feedback, you:',
    options: [
      { id: 'A', text: 'Appreciate the directness.' },
      { id: 'B', text: 'Prefer it softened with context.' },
      { id: 'C', text: 'Need time to process privately.' },
    ],
  },
  {
    id: 'q33_decision_risk',
    text: 'Faced with a bold bet:',
    options: [
      { id: 'A', text: 'Take it if logic checks out.' },
      { id: 'B', text: 'Consider people impact first.' },
      { id: 'C', text: 'Sleep on it before deciding.' },
    ],
  },
  {
    id: 'q34_decision_delegate',
    text: 'Delegating tough calls, you:',
    options: [
      { id: 'A', text: 'Seek the most competent owner.' },
      { id: 'B', text: 'Consider who is most affected.' },
      { id: 'C', text: 'Keep it yourself if stakes are high.' },
    ],
  },
  {
    id: 'q35_decision_conflict_speed',
    text: 'In heated debates, you:',
    options: [
      { id: 'A', text: 'Drive to a fast, logical resolution.' },
      { id: 'B', text: 'Slow down to cool emotions and align.' },
      { id: 'C', text: 'Step back and revisit later.' },
    ],
  },

  // Rhythm (Flow vs Anchor) - 10 questions
  {
    id: 'q16_rhythm_deadline',
    text: 'On deadlines, you tend to:',
    options: [
      { id: 'A', text: 'Front-load work and finish early.' },
      { id: 'B', text: 'Surge near the end under pressure.' },
      { id: 'C', text: 'Work steadily at consistent pace.' },
    ],
  },
  {
    id: 'q17_rhythm_change',
    text: 'When plans change last-minute, you:',
    options: [
      { id: 'A', text: 'Pivot and adjust quickly.' },
      { id: 'B', text: 'Stabilize and replan deliberately.' },
      { id: 'C', text: 'Go with the flow, see what happens.' },
    ],
  },
  {
    id: 'q18_rhythm_workstyle',
    text: 'Your workstyle is more:',
    options: [
      { id: 'A', text: 'Multi-track in parallel.' },
      { id: 'B', text: 'One track at a time.' },
      { id: 'C', text: 'Switching based on energy levels.' },
    ],
  },
  {
    id: 'q19_rhythm_holiday',
    text: 'On holidays, you prefer:',
    options: [
      { id: 'A', text: 'Spontaneous outings/activities.' },
      { id: 'B', text: 'Planned routines/reservations.' },
      { id: 'C', text: 'Relaxing without any agenda.' },
    ],
  },
  {
    id: 'q20_rhythm_feeling',
    text: 'When plans break, you mostly feel:',
    options: [
      { id: 'A', text: 'Curious/energized by new options.' },
      { id: 'B', text: 'Unsettled and wanting predictability.' },
      { id: 'C', text: 'Neutral - adapt and move on.' },
    ],
  },
  {
    id: 'q36_rhythm_morning_evening',
    text: 'Your natural peak focus is:',
    options: [
      { id: 'A', text: 'Early day; you like to start strong.' },
      { id: 'B', text: 'Later day; you ramp up gradually.' },
      { id: 'C', text: 'Varies by day, no fixed pattern.' },
    ],
  },
  {
    id: 'q37_rhythm_planslack',
    text: 'On daily planning, you:',
    options: [
      { id: 'A', text: 'Overbook slightly; momentum matters.' },
      { id: 'B', text: 'Leave slack; adaptability matters.' },
      { id: 'C', text: "Don't plan much, react to priorities." },
    ],
  },
  {
    id: 'q38_rhythm_batching',
    text: 'You prefer to handle tasks:',
    options: [
      { id: 'A', text: 'In batches/sprints, then rest.' },
      { id: 'B', text: 'In steady, even pacing.' },
      { id: 'C', text: 'As they come, real-time.' },
    ],
  },
  {
    id: 'q39_rhythm_contextswitch',
    text: 'Context switching often feels:',
    options: [
      { id: 'A', text: 'Stimulating; keeps you engaged.' },
      { id: 'B', text: 'Costly; you minimize switches.' },
      { id: 'C', text: 'Unavoidable, just deal with it.' },
    ],
  },
  {
    id: 'q40_rhythm_deadtime',
    text: 'With unexpected downtime, you:',
    options: [
      { id: 'A', text: 'Jump into spontaneous tasks/ideas.' },
      { id: 'B', text: 'Use it to rest or tidy planned work.' },
      { id: 'C', text: 'Scroll or browse without direction.' },
    ],
  },
];

export const TOTAL_QUESTIONS = questions.length;
