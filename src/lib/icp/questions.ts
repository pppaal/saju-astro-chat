// src/lib/icp/questions.ts
/**
 * ICP (Interpersonal Circumplex) 설문 질문
 * 두 축 기반: Dominance (지배-복종) & Affiliation (친밀-적대)
 * 32개 질문 (각 축 16개)
 */

export type ICPOption = { id: string; text: string; textKo: string };
export type ICPQuestion = {
  id: string;
  axis: 'dominance' | 'affiliation';
  text: string;
  textKo: string;
  options: ICPOption[];
};

export const TOTAL_ICP_QUESTIONS = 32;

export const icpQuestions: ICPQuestion[] = [
  // ========== DOMINANCE AXIS (지배-복종) - 16 questions ==========
  {
    id: 'dom_1',
    axis: 'dominance',
    text: 'In group discussions, I usually:',
    textKo: '여러 사람이 모여 이야기할 때 나는 보통:',
    options: [
      { id: 'A', text: 'Take the lead and direct the conversation', textKo: '대화를 이끌고 주도한다' },
      { id: 'B', text: 'Share ideas when asked', textKo: '물어보면 내 생각을 말한다' },
      { id: 'C', text: 'Listen and follow the discussion', textKo: '주로 듣고 따라간다' },
    ],
  },
  {
    id: 'dom_2',
    axis: 'dominance',
    text: 'When making decisions with friends, I:',
    textKo: '친구들과 무언가를 결정할 때 나는:',
    options: [
      { id: 'A', text: 'Suggest my preference strongly', textKo: '내가 원하는 것을 적극적으로 제안한다' },
      { id: 'B', text: 'Propose options and let others choose', textKo: '여러 선택지를 제시하고 다른 사람이 고르게 한다' },
      { id: 'C', text: 'Go along with what others want', textKo: '다른 사람들이 원하는 대로 따른다' },
    ],
  },
  {
    id: 'dom_3',
    axis: 'dominance',
    text: 'In conflicts, my approach is to:',
    textKo: '의견 충돌이 있을 때 나는:',
    options: [
      { id: 'A', text: 'Assert my position firmly', textKo: '내 입장을 확실히 주장한다' },
      { id: 'B', text: 'Seek compromise', textKo: '서로 타협점을 찾는다' },
      { id: 'C', text: 'Avoid confrontation', textKo: '충돌을 피하려 한다' },
    ],
  },
  {
    id: 'dom_4',
    axis: 'dominance',
    text: 'When someone disagrees with me, I:',
    textKo: '누군가 나와 의견이 다를 때 나는:',
    options: [
      { id: 'A', text: 'Defend my view confidently', textKo: '자신 있게 내 입장을 고수한다' },
      { id: 'B', text: 'Consider their perspective', textKo: '상대방 의견도 고려한다' },
      { id: 'C', text: 'Often defer to them', textKo: '주로 상대방 의견에 따른다' },
    ],
  },
  {
    id: 'dom_5',
    axis: 'dominance',
    text: 'At work or school, I prefer to:',
    textKo: '일하거나 공부할 때 나는:',
    options: [
      { id: 'A', text: 'Lead projects and delegate tasks', textKo: '프로젝트를 주도하고 역할을 나눈다' },
      { id: 'B', text: 'Collaborate as an equal partner', textKo: '동등한 입장에서 협력한다' },
      { id: 'C', text: 'Follow instructions and support others', textKo: '지시를 따르고 다른 사람을 돕는다' },
    ],
  },
  {
    id: 'dom_6',
    axis: 'dominance',
    text: 'I feel most comfortable when:',
    textKo: '나는 이럴 때 가장 편안하다:',
    options: [
      { id: 'A', text: 'I am in control of the situation', textKo: '내가 상황을 주도할 때' },
      { id: 'B', text: 'Responsibilities are shared', textKo: '책임을 함께 나눠 가질 때' },
      { id: 'C', text: 'Someone else is in charge', textKo: '다른 사람이 이끌어줄 때' },
    ],
  },
  {
    id: 'dom_7',
    axis: 'dominance',
    text: 'When giving my opinion, I:',
    textKo: '내 의견을 말할 때 나는:',
    options: [
      { id: 'A', text: 'Speak up quickly and directly', textKo: '바로 직설적으로 말한다' },
      { id: 'B', text: 'Wait for the right moment', textKo: '적절한 타이밍을 기다린다' },
      { id: 'C', text: 'Often keep it to myself', textKo: '주로 마음속에만 담아둔다' },
    ],
  },
  {
    id: 'dom_8',
    axis: 'dominance',
    text: 'In new social situations, I:',
    textKo: '처음 보는 사람들과 있을 때 나는:',
    options: [
      { id: 'A', text: 'Introduce myself and start conversations', textKo: '먼저 다가가서 대화를 시작한다' },
      { id: 'B', text: 'Wait to be introduced', textKo: '소개받기를 기다린다' },
      { id: 'C', text: 'Stay quiet until I feel comfortable', textKo: '편해질 때까지 조용히 있는다' },
    ],
  },
  {
    id: 'dom_9',
    axis: 'dominance',
    text: 'When organizing events or plans, I:',
    textKo: '모임이나 행사를 준비할 때 나는:',
    options: [
      { id: 'A', text: 'Take charge and coordinate everything', textKo: '앞장서서 모든 것을 챙긴다' },
      { id: 'B', text: 'Help with specific tasks', textKo: '맡은 일을 도와준다' },
      { id: 'C', text: 'Let others organize and just participate', textKo: '다른 사람이 준비하면 따라간다' },
    ],
  },
  {
    id: 'dom_10',
    axis: 'dominance',
    text: 'I see myself as someone who:',
    textKo: '나는 스스로를 이런 사람으로 본다:',
    options: [
      { id: 'A', text: 'Influences and guides others', textKo: '다른 사람에게 영향을 주고 이끄는' },
      { id: 'B', text: 'Works alongside others equally', textKo: '다른 사람과 동등하게 협력하는' },
      { id: 'C', text: 'Supports and assists others', textKo: '다른 사람을 돕고 지원하는' },
    ],
  },
  {
    id: 'dom_11',
    axis: 'dominance',
    text: 'When I have a strong opinion, I:',
    textKo: '확고한 의견이 있을 때 나는:',
    options: [
      { id: 'A', text: 'Make sure others hear it', textKo: '적극적으로 의견을 표현한다' },
      { id: 'B', text: 'Share if the moment feels right', textKo: '때를 봐서 공유한다' },
      { id: 'C', text: 'Keep it to myself unless asked', textKo: '물어보지 않으면 말하지 않는다' },
    ],
  },
  {
    id: 'dom_12',
    axis: 'dominance',
    text: 'My communication style is usually:',
    textKo: '나의 의사소통 스타일은 보통:',
    options: [
      { id: 'A', text: 'Direct and assertive', textKo: '직접적이고 단호하다' },
      { id: 'B', text: 'Balanced and diplomatic', textKo: '균형 잡히고 외교적이다' },
      { id: 'C', text: 'Soft and accommodating', textKo: '부드럽고 수용적이다' },
    ],
  },
  {
    id: 'dom_13',
    axis: 'dominance',
    text: 'When things go wrong, I tend to:',
    textKo: '문제가 생겼을 때 나는:',
    options: [
      { id: 'A', text: 'Take charge and fix it', textKo: '내가 나서서 해결한다' },
      { id: 'B', text: 'Work with others to solve it', textKo: '다른 사람들과 함께 해결한다' },
      { id: 'C', text: 'Wait for guidance on what to do', textKo: '누군가 방향을 정해주길 기다린다' },
    ],
  },
  {
    id: 'dom_14',
    axis: 'dominance',
    text: 'In competitive situations, I:',
    textKo: '경쟁 상황에서 나는:',
    options: [
      { id: 'A', text: 'Strive to win and be the best', textKo: '이기고 최고가 되려고 노력한다' },
      { id: 'B', text: 'Do my best but accept any outcome', textKo: '최선을 다하지만 결과는 수용한다' },
      { id: 'C', text: 'Prefer not to compete', textKo: '경쟁하지 않는 것을 선호한다' },
    ],
  },
  {
    id: 'dom_15',
    axis: 'dominance',
    text: 'People would describe me as:',
    textKo: '사람들 눈에 나는:',
    options: [
      { id: 'A', text: 'Confident and commanding', textKo: '자신감 있고 주도적인' },
      { id: 'B', text: 'Flexible and cooperative', textKo: '유연하고 협조적인' },
      { id: 'C', text: 'Quiet and agreeable', textKo: '조용하고 순응하는' },
    ],
  },
  {
    id: 'dom_16',
    axis: 'dominance',
    text: 'When making requests, I:',
    textKo: '다른 사람에게 부탁할 때 나는:',
    options: [
      { id: 'A', text: 'State what I need clearly', textKo: '필요한 것을 분명하게 말한다' },
      { id: 'B', text: 'Ask politely and explain why', textKo: '정중하게 이유를 설명하며 부탁한다' },
      { id: 'C', text: 'Hesitate or hint instead of asking directly', textKo: '직접 말하기보다 눈치를 보거나 돌려 말한다' },
    ],
  },

  // ========== AFFILIATION AXIS (친밀-적대) - 16 questions ==========
  {
    id: 'aff_1',
    axis: 'affiliation',
    text: 'When a friend is upset, I:',
    textKo: '친구가 힘들어할 때 나는:',
    options: [
      { id: 'A', text: 'Immediately offer support and comfort', textKo: '바로 다가가서 위로해준다' },
      { id: 'B', text: 'Check in but give them space', textKo: '안부는 물어보되 거리를 둔다' },
      { id: 'C', text: 'Let them work it out themselves', textKo: '혼자 해결할 시간을 준다' },
    ],
  },
  {
    id: 'aff_2',
    axis: 'affiliation',
    text: 'I prefer relationships that are:',
    textKo: '나는 이런 관계를 선호한다:',
    options: [
      { id: 'A', text: 'Close and emotionally deep', textKo: '가깝고 정서적으로 깊은' },
      { id: 'B', text: 'Friendly but with boundaries', textKo: '친근하지만 경계가 있는' },
      { id: 'C', text: 'More independent and distant', textKo: '더 독립적이고 거리가 있는' },
    ],
  },
  {
    id: 'aff_3',
    axis: 'affiliation',
    text: 'Sharing personal feelings with others is:',
    textKo: '내 감정을 다른 사람과 나누는 것은:',
    options: [
      { id: 'A', text: 'Natural and important to me', textKo: '자연스럽고 중요하다' },
      { id: 'B', text: 'Okay with close friends only', textKo: '아주 친한 사람에게만 가능하다' },
      { id: 'C', text: 'Uncomfortable; I keep things private', textKo: '불편해서 혼자 간직한다' },
    ],
  },
  {
    id: 'aff_4',
    axis: 'affiliation',
    text: 'When meeting new people, I am:',
    textKo: '처음 보는 사람을 만날 때 나는:',
    options: [
      { id: 'A', text: 'Warm and open immediately', textKo: '바로 따뜻하게 마음을 연다' },
      { id: 'B', text: 'Friendly but cautious at first', textKo: '친절하지만 처음엔 조심스럽다' },
      { id: 'C', text: 'Reserved and skeptical', textKo: '거리를 두고 경계한다' },
    ],
  },
  {
    id: 'aff_5',
    axis: 'affiliation',
    text: 'I show appreciation for others:',
    textKo: '다른 사람에게 고마움을 표현할 때 나는:',
    options: [
      { id: 'A', text: 'Openly and frequently', textKo: '자주 솔직하게 표현한다' },
      { id: 'B', text: 'When they deserve it', textKo: '정말 고마울 때만 한다' },
      { id: 'C', text: 'Rarely; actions speak louder than words', textKo: '거의 안 한다; 말보다 행동이 중요하다' },
    ],
  },
  {
    id: 'aff_6',
    axis: 'affiliation',
    text: 'Helping others without being asked:',
    textKo: '부탁받지 않아도 먼저 도와주는 것은:',
    options: [
      { id: 'A', text: 'Is something I do naturally', textKo: '내가 자연스럽게 하는 일이다' },
      { id: 'B', text: 'Depends on the situation', textKo: '상황을 보고 결정한다' },
      { id: 'C', text: 'Is not really my style', textKo: '내 스타일이 아니다' },
    ],
  },
  {
    id: 'aff_7',
    axis: 'affiliation',
    text: 'When someone criticizes me, I:',
    textKo: '누군가 나를 비판할 때 나는:',
    options: [
      { id: 'A', text: 'Try to understand and improve', textKo: '받아들이고 고치려고 노력한다' },
      { id: 'B', text: 'Consider if it is valid', textKo: '맞는 말인지 생각해본다' },
      { id: 'C', text: 'Feel defensive or dismissive', textKo: '방어적으로 되거나 무시하게 된다' },
    ],
  },
  {
    id: 'aff_8',
    axis: 'affiliation',
    text: 'Trust in relationships is something I:',
    textKo: '사람을 신뢰하는 것은:',
    options: [
      { id: 'A', text: 'Give freely until proven otherwise', textKo: '먼저 믿고 시작한다' },
      { id: 'B', text: 'Build gradually over time', textKo: '시간을 두고 천천히 쌓아간다' },
      { id: 'C', text: 'Give very cautiously', textKo: '매우 신중하게 한다' },
    ],
  },
  {
    id: 'aff_9',
    axis: 'affiliation',
    text: 'In social gatherings, I tend to:',
    textKo: '여러 사람이 모인 자리에서 나는:',
    options: [
      { id: 'A', text: 'Engage warmly with many people', textKo: '여러 사람들과 친근하게 어울린다' },
      { id: 'B', text: 'Stick with people I know well', textKo: '아는 사람들과만 주로 지낸다' },
      { id: 'C', text: 'Keep to myself mostly', textKo: '혼자 있는 편이다' },
    ],
  },
  {
    id: 'aff_10',
    axis: 'affiliation',
    text: 'Expressing affection physically (hugs, etc.) is:',
    textKo: '신체적인 스킨십(포옹 등)은:',
    options: [
      { id: 'A', text: 'Natural and I do it often', textKo: '자연스럽고 자주 한다' },
      { id: 'B', text: 'Fine with close people only', textKo: '친한 사람에게만 괜찮다' },
      { id: 'C', text: 'Uncomfortable for me', textKo: '불편하고 어색하다' },
    ],
  },
  {
    id: 'aff_11',
    axis: 'affiliation',
    text: 'When someone needs help, I:',
    textKo: '누군가 도움이 필요할 때 나는:',
    options: [
      { id: 'A', text: 'Drop everything to help', textKo: '하던 일을 제쳐두고 돕는다' },
      { id: 'B', text: 'Help if I can manage it', textKo: '내가 할 수 있으면 돕는다' },
      { id: 'C', text: 'Suggest they find someone else', textKo: '다른 사람을 찾아보라고 한다' },
    ],
  },
  {
    id: 'aff_12',
    axis: 'affiliation',
    text: 'My ideal friendship involves:',
    textKo: '내가 생각하는 이상적인 우정은:',
    options: [
      { id: 'A', text: 'Daily contact and deep sharing', textKo: '자주 연락하고 깊은 이야기를 나누는 것' },
      { id: 'B', text: 'Regular catch-ups with mutual support', textKo: '가끔 만나서 서로 응원하는 것' },
      { id: 'C', text: 'Independence with occasional contact', textKo: '각자 지내다 필요할 때만 연락하는 것' },
    ],
  },
  {
    id: 'aff_13',
    axis: 'affiliation',
    text: 'When others make mistakes, I:',
    textKo: '다른 사람이 실수했을 때 나는:',
    options: [
      { id: 'A', text: 'Forgive easily and offer support', textKo: '금방 이해하고 격려해준다' },
      { id: 'B', text: 'Forgive but remember', textKo: '용서는 하지만 기억은 한다' },
      { id: 'C', text: 'Have trouble letting it go', textKo: '쉽게 넘기기 어렵다' },
    ],
  },
  {
    id: 'aff_14',
    axis: 'affiliation',
    text: 'Cooperation vs competition: I lean toward:',
    textKo: '협력과 경쟁 중에서 나는:',
    options: [
      { id: 'A', text: 'Cooperation and harmony', textKo: '협력하고 화합하는 것을 선호한다' },
      { id: 'B', text: 'Balance of both', textKo: '상황에 따라 균형을 맞춘다' },
      { id: 'C', text: 'Competition and independence', textKo: '경쟁하고 독립적으로 하는 것을 선호한다' },
    ],
  },
  {
    id: 'aff_15',
    axis: 'affiliation',
    text: 'I believe people are generally:',
    textKo: '사람들은 대체로:',
    options: [
      { id: 'A', text: 'Good and trustworthy', textKo: '착하고 믿을 만하다' },
      { id: 'B', text: 'Mixed; depends on the person', textKo: '사람마다 다르다' },
      { id: 'C', text: 'Self-interested; trust must be earned', textKo: '이기적이고 신뢰는 증명되어야 한다' },
    ],
  },
  {
    id: 'aff_16',
    axis: 'affiliation',
    text: 'When ending a relationship or friendship:',
    textKo: '관계나 우정을 정리할 때 나는:',
    options: [
      { id: 'A', text: 'I struggle and try to maintain it', textKo: '많이 힘들어하고 붙잡으려 한다' },
      { id: 'B', text: 'I accept it if necessary', textKo: '필요하다면 받아들인다' },
      { id: 'C', text: 'I can move on without much difficulty', textKo: '큰 어려움 없이 정리할 수 있다' },
    ],
  },
];
