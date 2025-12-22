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
    textKo: '그룹 토론에서 나는 보통:',
    options: [
      { id: 'A', text: 'Take the lead and direct the conversation', textKo: '주도적으로 대화를 이끈다' },
      { id: 'B', text: 'Share ideas when asked', textKo: '물어보면 의견을 말한다' },
      { id: 'C', text: 'Listen and follow the discussion', textKo: '듣고 따라간다' },
    ],
  },
  {
    id: 'dom_2',
    axis: 'dominance',
    text: 'When making decisions with friends, I:',
    textKo: '친구들과 결정을 내릴 때 나는:',
    options: [
      { id: 'A', text: 'Suggest my preference strongly', textKo: '내 선호를 강하게 제안한다' },
      { id: 'B', text: 'Propose options and let others choose', textKo: '옵션을 제시하고 다른 사람이 선택하게 한다' },
      { id: 'C', text: 'Go along with what others want', textKo: '다른 사람들이 원하는 대로 따른다' },
    ],
  },
  {
    id: 'dom_3',
    axis: 'dominance',
    text: 'In conflicts, my approach is to:',
    textKo: '갈등 상황에서 나의 접근 방식은:',
    options: [
      { id: 'A', text: 'Assert my position firmly', textKo: '내 입장을 확고히 주장한다' },
      { id: 'B', text: 'Seek compromise', textKo: '타협점을 찾는다' },
      { id: 'C', text: 'Avoid confrontation', textKo: '대립을 피한다' },
    ],
  },
  {
    id: 'dom_4',
    axis: 'dominance',
    text: 'When someone disagrees with me, I:',
    textKo: '누군가 나와 의견이 다를 때 나는:',
    options: [
      { id: 'A', text: 'Defend my view confidently', textKo: '자신 있게 내 의견을 방어한다' },
      { id: 'B', text: 'Consider their perspective', textKo: '그들의 관점을 고려한다' },
      { id: 'C', text: 'Often defer to them', textKo: '종종 그들에게 양보한다' },
    ],
  },
  {
    id: 'dom_5',
    axis: 'dominance',
    text: 'At work or school, I prefer to:',
    textKo: '직장이나 학교에서 나는:',
    options: [
      { id: 'A', text: 'Lead projects and delegate tasks', textKo: '프로젝트를 이끌고 업무를 배분한다' },
      { id: 'B', text: 'Collaborate as an equal partner', textKo: '동등한 파트너로서 협력한다' },
      { id: 'C', text: 'Follow instructions and support others', textKo: '지시를 따르고 다른 사람을 지원한다' },
    ],
  },
  {
    id: 'dom_6',
    axis: 'dominance',
    text: 'I feel most comfortable when:',
    textKo: '나는 이럴 때 가장 편안하다:',
    options: [
      { id: 'A', text: 'I am in control of the situation', textKo: '상황을 내가 통제할 때' },
      { id: 'B', text: 'Responsibilities are shared', textKo: '책임이 분담될 때' },
      { id: 'C', text: 'Someone else is in charge', textKo: '다른 사람이 책임질 때' },
    ],
  },
  {
    id: 'dom_7',
    axis: 'dominance',
    text: 'When giving my opinion, I:',
    textKo: '내 의견을 말할 때 나는:',
    options: [
      { id: 'A', text: 'Speak up quickly and directly', textKo: '빠르고 직접적으로 말한다' },
      { id: 'B', text: 'Wait for the right moment', textKo: '적절한 순간을 기다린다' },
      { id: 'C', text: 'Often keep it to myself', textKo: '종종 속으로만 생각한다' },
    ],
  },
  {
    id: 'dom_8',
    axis: 'dominance',
    text: 'In new social situations, I:',
    textKo: '새로운 사회적 상황에서 나는:',
    options: [
      { id: 'A', text: 'Introduce myself and start conversations', textKo: '먼저 자기소개하고 대화를 시작한다' },
      { id: 'B', text: 'Wait to be introduced', textKo: '소개받기를 기다린다' },
      { id: 'C', text: 'Stay quiet until I feel comfortable', textKo: '편안해질 때까지 조용히 있는다' },
    ],
  },
  {
    id: 'dom_9',
    axis: 'dominance',
    text: 'When organizing events or plans, I:',
    textKo: '이벤트나 계획을 세울 때 나는:',
    options: [
      { id: 'A', text: 'Take charge and coordinate everything', textKo: '책임지고 모든 것을 조율한다' },
      { id: 'B', text: 'Help with specific tasks', textKo: '특정 업무를 돕는다' },
      { id: 'C', text: 'Let others organize and just participate', textKo: '다른 사람이 조직하게 하고 참여만 한다' },
    ],
  },
  {
    id: 'dom_10',
    axis: 'dominance',
    text: 'I see myself as someone who:',
    textKo: '나는 스스로를 이런 사람이라고 생각한다:',
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
    textKo: '강한 의견이 있을 때 나는:',
    options: [
      { id: 'A', text: 'Make sure others hear it', textKo: '다른 사람들이 들을 수 있게 한다' },
      { id: 'B', text: 'Share if the moment feels right', textKo: '적절한 순간이면 공유한다' },
      { id: 'C', text: 'Keep it to myself unless asked', textKo: '물어보지 않으면 혼자 간직한다' },
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
    textKo: '일이 잘못됐을 때 나는:',
    options: [
      { id: 'A', text: 'Take charge and fix it', textKo: '책임지고 해결한다' },
      { id: 'B', text: 'Work with others to solve it', textKo: '다른 사람들과 함께 해결한다' },
      { id: 'C', text: 'Wait for guidance on what to do', textKo: '어떻게 해야 할지 지시를 기다린다' },
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
    textKo: '사람들은 나를 이렇게 묘사할 것이다:',
    options: [
      { id: 'A', text: 'Confident and commanding', textKo: '자신감 있고 지휘하는' },
      { id: 'B', text: 'Flexible and cooperative', textKo: '유연하고 협조적인' },
      { id: 'C', text: 'Quiet and agreeable', textKo: '조용하고 순응하는' },
    ],
  },
  {
    id: 'dom_16',
    axis: 'dominance',
    text: 'When making requests, I:',
    textKo: '요청을 할 때 나는:',
    options: [
      { id: 'A', text: 'State what I need clearly', textKo: '필요한 것을 명확히 말한다' },
      { id: 'B', text: 'Ask politely and explain why', textKo: '정중히 부탁하고 이유를 설명한다' },
      { id: 'C', text: 'Hesitate or hint instead of asking directly', textKo: '직접 요청하기보다 망설이거나 암시한다' },
    ],
  },

  // ========== AFFILIATION AXIS (친밀-적대) - 16 questions ==========
  {
    id: 'aff_1',
    axis: 'affiliation',
    text: 'When a friend is upset, I:',
    textKo: '친구가 속상해할 때 나는:',
    options: [
      { id: 'A', text: 'Immediately offer support and comfort', textKo: '즉시 위로와 지지를 제공한다' },
      { id: 'B', text: 'Check in but give them space', textKo: '안부를 묻지만 공간을 준다' },
      { id: 'C', text: 'Let them work it out themselves', textKo: '스스로 해결하게 둔다' },
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
    textKo: '다른 사람과 개인적인 감정을 나누는 것은:',
    options: [
      { id: 'A', text: 'Natural and important to me', textKo: '자연스럽고 나에게 중요하다' },
      { id: 'B', text: 'Okay with close friends only', textKo: '친한 친구에게만 괜찮다' },
      { id: 'C', text: 'Uncomfortable; I keep things private', textKo: '불편하다; 나는 사적인 것을 지킨다' },
    ],
  },
  {
    id: 'aff_4',
    axis: 'affiliation',
    text: 'When meeting new people, I am:',
    textKo: '새로운 사람을 만날 때 나는:',
    options: [
      { id: 'A', text: 'Warm and open immediately', textKo: '즉시 따뜻하고 열린 태도이다' },
      { id: 'B', text: 'Friendly but cautious at first', textKo: '친근하지만 처음엔 조심스럽다' },
      { id: 'C', text: 'Reserved and skeptical', textKo: '내성적이고 회의적이다' },
    ],
  },
  {
    id: 'aff_5',
    axis: 'affiliation',
    text: 'I show appreciation for others:',
    textKo: '나는 다른 사람에게 감사를 표현할 때:',
    options: [
      { id: 'A', text: 'Openly and frequently', textKo: '공개적으로 자주 한다' },
      { id: 'B', text: 'When they deserve it', textKo: '그들이 그럴 자격이 있을 때 한다' },
      { id: 'C', text: 'Rarely; actions speak louder than words', textKo: '드물게; 행동이 말보다 중요하다' },
    ],
  },
  {
    id: 'aff_6',
    axis: 'affiliation',
    text: 'Helping others without being asked:',
    textKo: '요청받지 않고 다른 사람을 돕는 것은:',
    options: [
      { id: 'A', text: 'Is something I do naturally', textKo: '자연스럽게 하는 일이다' },
      { id: 'B', text: 'Depends on the situation', textKo: '상황에 따라 다르다' },
      { id: 'C', text: 'Is not really my style', textKo: '내 스타일이 아니다' },
    ],
  },
  {
    id: 'aff_7',
    axis: 'affiliation',
    text: 'When someone criticizes me, I:',
    textKo: '누군가 나를 비판할 때 나는:',
    options: [
      { id: 'A', text: 'Try to understand and improve', textKo: '이해하고 개선하려고 노력한다' },
      { id: 'B', text: 'Consider if it is valid', textKo: '타당한지 고려한다' },
      { id: 'C', text: 'Feel defensive or dismissive', textKo: '방어적이거나 무시하는 느낌이 든다' },
    ],
  },
  {
    id: 'aff_8',
    axis: 'affiliation',
    text: 'Trust in relationships is something I:',
    textKo: '관계에서 신뢰는 나에게:',
    options: [
      { id: 'A', text: 'Give freely until proven otherwise', textKo: '반증될 때까지 자유롭게 준다' },
      { id: 'B', text: 'Build gradually over time', textKo: '시간이 지나면서 점진적으로 쌓는다' },
      { id: 'C', text: 'Give very cautiously', textKo: '매우 조심스럽게 준다' },
    ],
  },
  {
    id: 'aff_9',
    axis: 'affiliation',
    text: 'In social gatherings, I tend to:',
    textKo: '사교 모임에서 나는:',
    options: [
      { id: 'A', text: 'Engage warmly with many people', textKo: '많은 사람들과 따뜻하게 교류한다' },
      { id: 'B', text: 'Stick with people I know well', textKo: '잘 아는 사람들과 함께한다' },
      { id: 'C', text: 'Keep to myself mostly', textKo: '대부분 혼자 있는다' },
    ],
  },
  {
    id: 'aff_10',
    axis: 'affiliation',
    text: 'Expressing affection physically (hugs, etc.) is:',
    textKo: '신체적 애정 표현(포옹 등)은:',
    options: [
      { id: 'A', text: 'Natural and I do it often', textKo: '자연스럽고 자주 한다' },
      { id: 'B', text: 'Fine with close people only', textKo: '친한 사람에게만 괜찮다' },
      { id: 'C', text: 'Uncomfortable for me', textKo: '나에게 불편하다' },
    ],
  },
  {
    id: 'aff_11',
    axis: 'affiliation',
    text: 'When someone needs help, I:',
    textKo: '누군가 도움이 필요할 때 나는:',
    options: [
      { id: 'A', text: 'Drop everything to help', textKo: '모든 것을 제쳐두고 돕는다' },
      { id: 'B', text: 'Help if I can manage it', textKo: '여유가 되면 돕는다' },
      { id: 'C', text: 'Suggest they find someone else', textKo: '다른 사람을 찾아보라고 제안한다' },
    ],
  },
  {
    id: 'aff_12',
    axis: 'affiliation',
    text: 'My ideal friendship involves:',
    textKo: '나의 이상적인 우정은:',
    options: [
      { id: 'A', text: 'Daily contact and deep sharing', textKo: '매일 연락하고 깊이 나누는 것' },
      { id: 'B', text: 'Regular catch-ups with mutual support', textKo: '정기적인 만남과 상호 지지' },
      { id: 'C', text: 'Independence with occasional contact', textKo: '가끔 연락하는 독립적인 관계' },
    ],
  },
  {
    id: 'aff_13',
    axis: 'affiliation',
    text: 'When others make mistakes, I:',
    textKo: '다른 사람이 실수할 때 나는:',
    options: [
      { id: 'A', text: 'Forgive easily and offer support', textKo: '쉽게 용서하고 지지를 제공한다' },
      { id: 'B', text: 'Forgive but remember', textKo: '용서하지만 기억한다' },
      { id: 'C', text: 'Have trouble letting it go', textKo: '놓아주기 어렵다' },
    ],
  },
  {
    id: 'aff_14',
    axis: 'affiliation',
    text: 'Cooperation vs competition: I lean toward:',
    textKo: '협력 vs 경쟁에서 나는:',
    options: [
      { id: 'A', text: 'Cooperation and harmony', textKo: '협력과 조화를 선호한다' },
      { id: 'B', text: 'Balance of both', textKo: '둘의 균형을 선호한다' },
      { id: 'C', text: 'Competition and independence', textKo: '경쟁과 독립을 선호한다' },
    ],
  },
  {
    id: 'aff_15',
    axis: 'affiliation',
    text: 'I believe people are generally:',
    textKo: '나는 사람들이 일반적으로:',
    options: [
      { id: 'A', text: 'Good and trustworthy', textKo: '선하고 믿을 수 있다고 믿는다' },
      { id: 'B', text: 'Mixed; depends on the person', textKo: '섞여 있다; 사람에 따라 다르다' },
      { id: 'C', text: 'Self-interested; trust must be earned', textKo: '이기적이다; 신뢰는 얻어야 한다' },
    ],
  },
  {
    id: 'aff_16',
    axis: 'affiliation',
    text: 'When ending a relationship or friendship:',
    textKo: '관계나 우정을 끝낼 때:',
    options: [
      { id: 'A', text: 'I struggle and try to maintain it', textKo: '힘들어하고 유지하려고 노력한다' },
      { id: 'B', text: 'I accept it if necessary', textKo: '필요하다면 받아들인다' },
      { id: 'C', text: 'I can move on without much difficulty', textKo: '큰 어려움 없이 넘어갈 수 있다' },
    ],
  },
];
