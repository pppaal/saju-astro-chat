// src/lib/persona/questions.ts
export type PersonaOption = { id: string; text: string; textKo: string }
export type PersonaQuestion = { id: string; text: string; textKo: string; options: PersonaOption[] }

// Custom "Nova" personality battery - 3 options per question
export const questions: PersonaQuestion[] = [
  // Energy (Radiant vs Grounded) - 10 questions
  {
    id: 'q1_energy_network',
    text: 'After a day full of people and meetings, you:',
    textKo: '사람들과 미팅이 많은 하루를 보낸 뒤일 때',
    options: [
      {
        id: 'A',
        text: 'Feel charged and want to keep going.',
        textKo: '에너지가 올라 더 움직이고 싶다.',
      },
      {
        id: 'B',
        text: 'Need quiet space to reset.',
        textKo: '조용히 쉬며 에너지를 회복하고 싶다.',
      },
      {
        id: 'C',
        text: 'Depends on my mood that day.',
        textKo: '그날 컨디션에 맞춰 선택하고 싶다.',
      },
    ],
  },
  {
    id: 'q2_energy_weekend',
    text: 'On a long weekend, you prefer to:',
    textKo: '긴 주말 계획을 세울 때',
    options: [
      { id: 'A', text: 'Pack the calendar with plans.', textKo: '일정을 가득 채워 약속을 잡는다.' },
      { id: 'B', text: 'Leave generous open blocks.', textKo: '여유로운 빈 시간을 많이 둔다.' },
      {
        id: 'C',
        text: 'Mix of both - some plans, some free time.',
        textKo: '약속과 자유시간을 적절히 섞는다.',
      },
    ],
  },
  {
    id: 'q3_energy_spontaneous',
    text: 'When invited to a sudden gathering, you usually:',
    textKo: '갑작스러운 모임 초대를 받았을 때',
    options: [
      {
        id: 'A',
        text: "Say 'let's go' without much hesitation.",
        textKo: '일정을 확인하고 바로 수락한다.',
      },
      { id: 'B', text: 'Pause and decide after some thought.', textKo: '잠시 생각한 후 결정한다.' },
      { id: 'C', text: 'Check who else is going first.', textKo: '누가 가는지 먼저 확인한다.' },
    ],
  },
  {
    id: 'q4_energy_transit',
    text: 'During travel/wait times, you tend to:',
    textKo: '이동하거나 대기하는 시간일 때',
    options: [
      {
        id: 'A',
        text: 'Chat and engage with people around you.',
        textKo: '주변 사람들과 대화를 나눈다.',
      },
      {
        id: 'B',
        text: 'Use headphones and stay in your own zone.',
        textKo: '이어폰을 끼고 나만의 세계에 빠진다.',
      },
      { id: 'C', text: 'Read or browse casually.', textKo: '가볍게 책이나 폰을 본다.' },
    ],
  },
  {
    id: 'q5_energy_idealday',
    text: 'Your ideal day looks like:',
    textKo: '이상적인 하루를 떠올릴 때',
    options: [
      {
        id: 'A',
        text: 'Many activities/people in one day.',
        textKo: '약속과 활동으로 하루를 촘촘히 채운다.',
      },
      {
        id: 'B',
        text: 'A few set activities + ample solo time.',
        textKo: '몇 가지 일정만 두고 혼자 쉬는 시간을 둔다.',
      },
      {
        id: 'C',
        text: 'Flexible flow without strict plans.',
        textKo: '그날 상황을 보며 유연하게 일정을 정한다.',
      },
    ],
  },
  {
    id: 'q21_energy_focus',
    text: 'In long work sessions, you recharge more by:',
    textKo: '긴 작업 중 잠시 재충전할 때',
    options: [
      {
        id: 'A',
        text: 'Quick chats/interaction between tasks.',
        textKo: '업무 사이에 짧은 대화나 소통을 한다.',
      },
      {
        id: 'B',
        text: 'Staying in your own lane with minimal breaks.',
        textKo: '최소한의 휴식으로 집중 상태를 유지한다.',
      },
      { id: 'C', text: 'Taking walks or physical breaks.', textKo: '산책이나 신체 활동으로 쉰다.' },
    ],
  },
  {
    id: 'q22_energy_solo_group',
    text: 'You do your best thinking:',
    textKo: '아이디어가 가장 잘 떠오를 때',
    options: [
      { id: 'A', text: 'In group brainstorming energy.', textKo: '그룹 브레인스토밍을 할 때.' },
      { id: 'B', text: 'Alone, refining quietly.', textKo: '혼자 조용히 정리할 때.' },
      { id: 'C', text: 'Writing or journaling ideas.', textKo: '글을 쓰거나 메모할 때.' },
    ],
  },
  {
    id: 'q23_energy_interruptions',
    text: 'Frequent pings/interruptions feel:',
    textKo: '알림이나 방해가 자주 들어올 때',
    options: [
      {
        id: 'A',
        text: 'Invigorating; you like the buzz.',
        textKo: '알림이 많을수록 오히려 리듬이 오른다.',
      },
      {
        id: 'B',
        text: 'Draining; you prefer uninterrupted blocks.',
        textKo: '알림이 많으면 집중이 쉽게 끊긴다.',
      },
      {
        id: 'C',
        text: 'Fine if scheduled, annoying if random.',
        textKo: '중요한 알림만 오면 크게 신경 쓰지 않는다.',
      },
    ],
  },
  {
    id: 'q24_energy_events',
    text: 'At large events, you tend to:',
    textKo: '대규모 행사에 참여했을 때',
    options: [
      { id: 'A', text: 'Work the room and meet many.', textKo: '돌아다니며 여러 사람을 만난다.' },
      {
        id: 'B',
        text: 'Stay with a few or observe quietly.',
        textKo: '소수와 함께 있거나 조용히 관찰한다.',
      },
      { id: 'C', text: 'Focus on the event content itself.', textKo: '행사 내용 자체에 집중한다.' },
    ],
  },
  {
    id: 'q25_energy_noise',
    text: 'Background noise while working:',
    textKo: '작업 중 배경 소음을 마주할 때',
    options: [
      {
        id: 'A',
        text: 'Helps—music/cafe hum boosts you.',
        textKo: '음악이나 생활 소음이 있으면 집중이 된다.',
      },
      { id: 'B', text: 'Hurts—you need quiet to focus.', textKo: '조용한 환경이어야 집중이 된다.' },
      {
        id: 'C',
        text: 'White noise or instrumental only.',
        textKo: '가사 없는 소리 정도면 집중이 된다.',
      },
    ],
  },

  // Cognition (Visionary vs Structured) - 10 questions
  {
    id: 'q6_cog_problem',
    text: 'Facing a new problem, you first:',
    textKo: '새로운 문제를 처음 마주했을 때',
    options: [
      {
        id: 'A',
        text: 'Spot patterns and possible models.',
        textKo: '패턴을 찾고 가능한 모델을 떠올린다.',
      },
      {
        id: 'B',
        text: 'List requirements and a checklist.',
        textKo: '요구사항을 정리하고 체크리스트를 만든다.',
      },
      {
        id: 'C',
        text: 'Research what others have done.',
        textKo: '다른 사람들이 어떻게 했는지 조사한다.',
      },
    ],
  },
  {
    id: 'q7_cog_explain',
    text: 'When learning, you prefer explanations that start with:',
    textKo: '새로운 내용을 배울 때',
    options: [
      {
        id: 'A',
        text: 'The big picture then examples.',
        textKo: '큰 흐름부터 듣고 예시로 이해한다.',
      },
      {
        id: 'B',
        text: 'Concrete examples then the principle.',
        textKo: '구체적 예시부터 보고 원리를 정리한다.',
      },
      { id: 'C', text: 'Hands-on practice first.', textKo: '직접 해본 뒤 개념을 정리한다.' },
    ],
  },
  {
    id: 'q8_cog_evaluate',
    text: 'Evaluating an idea, you lean toward:',
    textKo: '아이디어를 평가할 때',
    options: [
      { id: 'A', text: 'Novelty and potential impact.', textKo: '새로움과 잠재적 영향력.' },
      { id: 'B', text: 'Feasibility and risks.', textKo: '실현 가능성과 리스크.' },
      { id: 'C', text: 'Team alignment and buy-in.', textKo: '팀의 합의와 동의.' },
    ],
  },
  {
    id: 'q9_cog_basis',
    text: 'Decisions feel solid when they are built on:',
    textKo: '결정의 근거를 정할 때',
    options: [
      {
        id: 'A',
        text: 'Vision and future scenarios.',
        textKo: '비전과 미래 시나리오를 기준으로 삼는다.',
      },
      {
        id: 'B',
        text: 'Clear process and defined steps.',
        textKo: '절차와 실행 단계를 기준으로 삼는다.',
      },
      {
        id: 'C',
        text: 'Gut feeling backed by experience.',
        textKo: '경험에서 나온 직감을 기준으로 삼는다.',
      },
    ],
  },
  {
    id: 'q10_cog_constraints',
    text: 'When new constraints appear, you:',
    textKo: '예상치 못한 제약이 생겼을 때',
    options: [
      {
        id: 'A',
        text: 'Reimagine the approach to find new possibilities.',
        textKo: '접근법을 바꿔 새로운 가능성을 찾는다.',
      },
      {
        id: 'B',
        text: 'Adjust the plan to work within the limits.',
        textKo: '제약에 맞춰 계획 순서를 다시 짠다.',
      },
      {
        id: 'C',
        text: 'Negotiate to remove the constraint.',
        textKo: '핵심 제약을 줄일 방법을 먼저 찾는다.',
      },
    ],
  },
  {
    id: 'q26_cog_detail_bigpicture',
    text: 'You are more satisfied when work outputs are:',
    textKo: '작업 결과물을 평가할 때',
    options: [
      {
        id: 'A',
        text: 'Visionary narratives or prototypes.',
        textKo: '비전을 담은 스토리나 프로토타입.',
      },
      { id: 'B', text: 'Detailed specs or checklists.', textKo: '상세한 스펙이나 체크리스트.' },
      { id: 'C', text: 'Working demos users can try.', textKo: '사용자가 직접 써볼 수 있는 데모.' },
    ],
  },
  {
    id: 'q27_cog_rule_break',
    text: 'If a process slows you down, you:',
    textKo: '프로세스가 속도를 늦출 때',
    options: [
      {
        id: 'A',
        text: 'Find a creative workaround or shortcut.',
        textKo: '창의적인 우회로나 지름길을 찾는다.',
      },
      {
        id: 'B',
        text: 'Refine existing steps within the rules.',
        textKo: '규칙 내에서 기존 단계를 개선한다.',
      },
      {
        id: 'C',
        text: 'Propose changes to the process officially.',
        textKo: '공식적으로 프로세스 변경을 제안한다.',
      },
    ],
  },
  {
    id: 'q28_cog_metrics_story',
    text: 'Persuasion works best on you via:',
    textKo: '다른 사람의 설득을 판단할 때',
    options: [
      {
        id: 'A',
        text: 'Story/analogy of future possibilities.',
        textKo: '미래 가능성을 보여주는 이야기.',
      },
      { id: 'B', text: 'Metrics and viability evidence.', textKo: '실행 근거를 보여주는 데이터.' },
      { id: 'C', text: 'Social proof and testimonials.', textKo: '현실 사례를 보여주는 레퍼런스.' },
    ],
  },
  {
    id: 'q29_cog_timehorizon',
    text: 'You naturally think more about:',
    textKo: '미래를 계획할 때',
    options: [
      {
        id: 'A',
        text: 'Long-term arcs and emerging trends.',
        textKo: '장기 흐름과 변화 신호를 본다.',
      },
      {
        id: 'B',
        text: 'Near-term execution and milestones.',
        textKo: '단기 실행과 마일스톤을 본다.',
      },
      { id: 'C', text: 'Present moment opportunities.', textKo: '지금 가능한 선택지를 본다.' },
    ],
  },
  {
    id: 'q30_cog_changecomfort',
    text: 'When requirements change midstream, you feel:',
    textKo: '요구사항이 중간에 바뀌었을 때',
    options: [
      {
        id: 'A',
        text: 'Energized by reimagining the solution.',
        textKo: '새로운 해결책을 구상하며 활력을 얻는다.',
      },
      {
        id: 'B',
        text: 'Prefer to lock scope and avoid churn.',
        textKo: '범위를 확정하고 변경을 최소화하고 싶다.',
      },
      {
        id: 'C',
        text: 'Accept it as part of the process.',
        textKo: '프로세스의 일부로 받아들인다.',
      },
    ],
  },

  // Decision (Logic vs Empathic) - 10 questions
  {
    id: 'q11_decision_conflict',
    text: 'In a team conflict, you focus first on:',
    textKo: '팀 갈등을 다룰 때',
    options: [
      { id: 'A', text: 'Principles and performance.', textKo: '원칙과 기준을 먼저 정리한다.' },
      { id: 'B', text: 'Relationships and emotions.', textKo: '관계와 감정을 먼저 살핀다.' },
      {
        id: 'C',
        text: 'Finding a compromise everyone accepts.',
        textKo: '수용 가능한 합의점을 먼저 찾는다.',
      },
    ],
  },
  {
    id: 'q12_decision_feedback',
    text: 'Your feedback style is usually:',
    textKo: '피드백을 전달할 때',
    options: [
      { id: 'A', text: 'Direct and fact-focused.', textKo: '핵심 사실을 먼저 분명하게 말한다.' },
      { id: 'B', text: 'Contextual with cushioning.', textKo: '맥락을 설명하며 완곡하게 말한다.' },
      {
        id: 'C',
        text: 'Written to allow processing time.',
        textKo: '정리한 문장으로 차분하게 전달한다.',
      },
    ],
  },
  {
    id: 'q13_decision_resources',
    text: 'When allocating resources, you prioritize:',
    textKo: '자원을 배분할 때',
    options: [
      { id: 'A', text: 'ROI and clear priorities.', textKo: '효율과 우선순위를 중심에 둔다.' },
      { id: 'B', text: 'Team morale and learning.', textKo: '성장과 협업 경험을 중심에 둔다.' },
      {
        id: 'C',
        text: 'Fairness and equal distribution.',
        textKo: '공정성과 균형 분배를 중심에 둔다.',
      },
    ],
  },
  {
    id: 'q14_decision_rules',
    text: 'Catching a rule break, you believe:',
    textKo: '규칙 위반을 발견했을 때',
    options: [
      { id: 'A', text: 'Consistency is fairness.', textKo: '같은 기준을 지켜야 공정하다고 본다.' },
      {
        id: 'B',
        text: 'Contextual flexibility is fairness.',
        textKo: '상황을 반영해야 공정하다고 본다.',
      },
      {
        id: 'C',
        text: 'Depends on intent behind the action.',
        textKo: '의도까지 살펴야 공정하다고 본다.',
      },
    ],
  },
  {
    id: 'q15_decision_delay',
    text: 'If you postpone a decision, it is usually because:',
    textKo: '결정을 잠시 미룰 때',
    options: [
      {
        id: 'A',
        text: 'Data/arguments feel insufficient.',
        textKo: '데이터나 논거가 부족하다고 느껴서.',
      },
      {
        id: 'B',
        text: 'People/feelings need more alignment.',
        textKo: '사람들의 감정이 더 맞춰져야 해서.',
      },
      {
        id: 'C',
        text: 'Waiting for external factors to clarify.',
        textKo: '외부 요인이 명확해지길 기다려서.',
      },
    ],
  },
  {
    id: 'q31_decision_dataemotion',
    text: 'To reach a decision, you weigh more:',
    textKo: '결정을 최종 판단할 때',
    options: [
      {
        id: 'A',
        text: 'Data, trade-offs, objective impact.',
        textKo: '데이터와 영향도를 더 크게 본다.',
      },
      {
        id: 'B',
        text: 'Team pulse, stakeholder emotions.',
        textKo: '사람 반응과 분위기를 더 크게 본다.',
      },
      {
        id: 'C',
        text: 'Past precedents and patterns.',
        textKo: '비슷한 선례와 패턴을 더 크게 본다.',
      },
    ],
  },
  {
    id: 'q32_decision_feedback_tone',
    text: 'When receiving blunt feedback, you:',
    textKo: '직설적인 피드백을 받았을 때',
    options: [
      { id: 'A', text: 'Appreciate the directness.', textKo: '직설적인 표현이 더 편하다.' },
      {
        id: 'B',
        text: 'Prefer it softened with context.',
        textKo: '맥락을 덧붙인 표현이 더 편하다.',
      },
      {
        id: 'C',
        text: 'Need time to process privately.',
        textKo: '혼자 정리할 시간이 더 필요하다.',
      },
    ],
  },
  {
    id: 'q33_decision_risk',
    text: 'Faced with a bold bet:',
    textKo: '과감한 선택을 앞두었을 때',
    options: [
      {
        id: 'A',
        text: 'Take it if logic checks out.',
        textKo: '논리적 근거가 맞으면 바로 움직인다.',
      },
      {
        id: 'B',
        text: 'Consider people impact first.',
        textKo: '주변 사람에게 미칠 영향을 먼저 본다.',
      },
      { id: 'C', text: 'Sleep on it before deciding.', textKo: '하루 정도 두고 판단을 정리한다.' },
    ],
  },
  {
    id: 'q34_decision_delegate',
    text: 'Delegating tough calls, you:',
    textKo: '어려운 결정을 위임할 때',
    options: [
      {
        id: 'A',
        text: 'Seek the most competent owner.',
        textKo: '가장 역량이 맞는 담당자를 선택한다.',
      },
      {
        id: 'B',
        text: 'Consider who is most affected.',
        textKo: '영향이 큰 이해관계자를 우선 고려한다.',
      },
      {
        id: 'C',
        text: 'Keep it yourself if stakes are high.',
        textKo: '책임이 크면 직접 판단해 마무리한다.',
      },
    ],
  },
  {
    id: 'q35_decision_conflict_speed',
    text: 'In heated debates, you:',
    textKo: '토론이 과열되었을 때',
    options: [
      {
        id: 'A',
        text: 'Drive to a fast, logical resolution.',
        textKo: '빠르고 논리적인 결론을 추구한다.',
      },
      {
        id: 'B',
        text: 'Slow down to cool emotions and align.',
        textKo: '속도를 늦춰 감정을 가라앉히고 조율한다.',
      },
      {
        id: 'C',
        text: 'Step back and revisit later.',
        textKo: '한발 물러나 나중에 다시 논의한다.',
      },
    ],
  },

  // Rhythm (Flow vs Anchor) - 10 questions
  {
    id: 'q16_rhythm_deadline',
    text: 'On deadlines, you tend to:',
    textKo: '마감을 앞두고 일할 때',
    options: [
      { id: 'A', text: 'Front-load work and finish early.', textKo: '미리 끝내고 여유를 갖는다.' },
      {
        id: 'B',
        text: 'Surge near the end under pressure.',
        textKo: '마감 직전 압박 속에서 폭발력을 낸다.',
      },
      {
        id: 'C',
        text: 'Work steadily at consistent pace.',
        textKo: '꾸준히 일정한 속도로 작업한다.',
      },
    ],
  },
  {
    id: 'q17_rhythm_change',
    text: 'When plans change last-minute, you:',
    textKo: '계획이 막판에 바뀌었을 때',
    options: [
      { id: 'A', text: 'Pivot and adjust quickly.', textKo: '빠르게 방향을 틀고 적응한다.' },
      {
        id: 'B',
        text: 'Stabilize and replan deliberately.',
        textKo: '안정을 찾고 신중하게 재계획한다.',
      },
      {
        id: 'C',
        text: 'Go with the flow, see what happens.',
        textKo: '흐름에 맡기고 어떻게 되는지 본다.',
      },
    ],
  },
  {
    id: 'q18_rhythm_workstyle',
    text: 'Your workstyle is more:',
    textKo: '여러 업무를 처리할 때',
    options: [
      { id: 'A', text: 'Multi-track in parallel.', textKo: '여러 일을 동시에 병행한다.' },
      { id: 'B', text: 'One track at a time.', textKo: '한 번에 한 가지에 집중한다.' },
      {
        id: 'C',
        text: 'Switching based on energy levels.',
        textKo: '에너지 레벨에 따라 전환한다.',
      },
    ],
  },
  {
    id: 'q19_rhythm_holiday',
    text: 'On holidays, you prefer:',
    textKo: '휴일 일정을 정할 때',
    options: [
      {
        id: 'A',
        text: 'Spontaneous outings/activities.',
        textKo: '즉흥적인 외출이나 활동을 선호한다.',
      },
      {
        id: 'B',
        text: 'Planned routines/reservations.',
        textKo: '계획된 일정이나 예약을 선호한다.',
      },
      {
        id: 'C',
        text: 'Relaxing without any agenda.',
        textKo: '아무 계획 없이 쉬는 것을 선호한다.',
      },
    ],
  },
  {
    id: 'q20_rhythm_feeling',
    text: 'When plans break, you mostly feel:',
    textKo: '계획이 틀어졌을 때',
    options: [
      {
        id: 'A',
        text: 'Curious/energized by new options.',
        textKo: '새로운 옵션에 호기심과 활력을 느낀다.',
      },
      {
        id: 'B',
        text: 'Unsettled and wanting predictability.',
        textKo: '불안하고 예측 가능함을 원한다.',
      },
      { id: 'C', text: 'Neutral - adapt and move on.', textKo: '담담하게 적응하고 넘어간다.' },
    ],
  },
  {
    id: 'q36_rhythm_morning_evening',
    text: 'Your natural peak focus is:',
    textKo: '하루 집중 시간을 고를 때',
    options: [
      {
        id: 'A',
        text: 'Early day; you like to start strong.',
        textKo: '이른 시간에 집중력이 가장 잘 올라온다.',
      },
      {
        id: 'B',
        text: 'Later day; you ramp up gradually.',
        textKo: '늦은 시간에 집중력이 더 안정적으로 올라온다.',
      },
      {
        id: 'C',
        text: 'Varies by day, no fixed pattern.',
        textKo: '날마다 달라 고정된 집중 시간이 없다.',
      },
    ],
  },
  {
    id: 'q37_rhythm_planslack',
    text: 'On daily planning, you:',
    textKo: '하루 일정을 짤 때',
    options: [
      {
        id: 'A',
        text: 'Pack it tight; productivity drives you.',
        textKo: '일정을 촘촘히 채워 실행 속도를 유지한다.',
      },
      {
        id: 'B',
        text: 'Leave buffer time; flexibility matters.',
        textKo: '중간 여유를 남겨 변수를 흡수한다.',
      },
      {
        id: 'C',
        text: "Don't plan much, react as needed.",
        textKo: '큰 틀만 정하고 상황에 맞춰 조정한다.',
      },
    ],
  },
  {
    id: 'q38_rhythm_batching',
    text: 'You prefer to handle tasks:',
    textKo: '업무 묶음을 처리할 때',
    options: [
      { id: 'A', text: 'In intense sprints, then rest.', textKo: '집중적으로 몰아서 하고 쉰다.' },
      { id: 'B', text: 'In steady, even pacing.', textKo: '꾸준하고 일정한 속도로 한다.' },
      { id: 'C', text: 'As they come, real-time.', textKo: '오는 대로 실시간으로 처리한다.' },
    ],
  },
  {
    id: 'q39_rhythm_contextswitch',
    text: 'Context switching often feels:',
    textKo: '작업 간 전환이 생길 때',
    options: [
      {
        id: 'A',
        text: 'Stimulating; keeps you engaged.',
        textKo: '전환이 잦을수록 자극을 받아 집중이 오른다.',
      },
      {
        id: 'B',
        text: 'Costly; you minimize switches.',
        textKo: '전환이 잦으면 비용이 커서 최소화한다.',
      },
      {
        id: 'C',
        text: 'Unavoidable, just deal with it.',
        textKo: '전환은 불가피하니 순서대로 처리한다.',
      },
    ],
  },
  {
    id: 'q40_rhythm_deadtime',
    text: 'With unexpected downtime, you:',
    textKo: '예상치 못한 빈 시간이 생길 때',
    options: [
      {
        id: 'A',
        text: 'Jump into spontaneous tasks/ideas.',
        textKo: '즉흥적인 일이나 아이디어에 뛰어든다.',
      },
      {
        id: 'B',
        text: 'Use it to rest or organize planned work.',
        textKo: '쉬거나 계획된 일을 정리하는 데 쓴다.',
      },
      {
        id: 'C',
        text: 'Scroll or browse without direction.',
        textKo: '방향 없이 폰이나 웹을 본다.',
      },
    ],
  },
]

export const TOTAL_QUESTIONS = questions.length
