// src/lib/icp/questions.ts
/**
 * ICP (Interpersonal Circumplex) 설문 질문
 * 두 축 기반: Dominance (주도-수용) & Affiliation (친밀-거리)
 * 32개 질문 (각 축 16개) - 구체적인 일상 상황 기반
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
  // ========== DOMINANCE AXIS (주도-수용) - 16 questions ==========
  {
    id: 'dom_1',
    axis: 'dominance',
    text: 'Your friend group is deciding where to have dinner tonight:',
    textKo: '친구들과 오늘 저녁 뭐 먹을지 정할 때 나는:',
    options: [
      { id: 'A', text: 'I suggest a place and convince everyone', textKo: '내가 가고 싶은 곳을 제안하고 설득한다' },
      { id: 'B', text: 'I share my preference and see what others think', textKo: '내 의견을 말하고 다른 사람 의견도 듣는다' },
      { id: 'C', text: 'I let others decide and go along', textKo: '다른 사람들이 정하면 따라간다' },
    ],
  },
  {
    id: 'dom_2',
    axis: 'dominance',
    text: 'During a team project at work or school:',
    textKo: '팀 프로젝트를 할 때 나는:',
    options: [
      { id: 'A', text: 'I naturally take the lead and assign tasks', textKo: '자연스럽게 리더 역할을 하고 역할을 나눈다' },
      { id: 'B', text: 'I contribute ideas and help coordinate', textKo: '아이디어를 내고 조율을 돕는다' },
      { id: 'C', text: 'I wait for direction and do my assigned part', textKo: '맡은 부분을 열심히 하고 지시를 따른다' },
    ],
  },
  {
    id: 'dom_3',
    axis: 'dominance',
    text: 'When you and a close friend disagree about weekend plans:',
    textKo: '친한 친구와 주말 계획이 달라서 의견이 부딪힐 때:',
    options: [
      { id: 'A', text: 'I stand firm on what I want to do', textKo: '내가 하고 싶은 걸 확실히 주장한다' },
      { id: 'B', text: 'I try to find a middle ground', textKo: '서로 맞출 수 있는 점을 찾는다' },
      { id: 'C', text: 'I usually go with their preference to avoid conflict', textKo: '보통 친구 의견을 따라서 충돌을 피한다' },
    ],
  },
  {
    id: 'dom_4',
    axis: 'dominance',
    text: 'Your sibling or roommate wants to watch a different show than you:',
    textKo: '가족이나 룸메이트가 나와 다른 TV 프로그램을 보고 싶어할 때:',
    options: [
      { id: 'A', text: 'I argue for my choice and usually win', textKo: '내가 보고 싶은 걸 주장해서 대체로 이긴다' },
      { id: 'B', text: 'We take turns or find something we both like', textKo: '번갈아 보거나 둘 다 좋아하는 걸 찾는다' },
      { id: 'C', text: 'I let them choose; it is not worth arguing', textKo: '그냥 양보한다, 싸울 일은 아니니까' },
    ],
  },
  {
    id: 'dom_5',
    axis: 'dominance',
    text: 'When planning a group trip with friends:',
    textKo: '친구들과 여행 계획을 짤 때 나는:',
    options: [
      { id: 'A', text: 'I research and create the itinerary for everyone', textKo: '내가 조사해서 일정을 다 짜온다' },
      { id: 'B', text: 'I suggest ideas and we decide together', textKo: '아이디어를 내고 같이 결정한다' },
      { id: 'C', text: 'I follow whatever the group decides', textKo: '다른 사람들이 정한 대로 따라간다' },
    ],
  },
  {
    id: 'dom_6',
    axis: 'dominance',
    text: 'In a meeting or class discussion where no one is speaking up:',
    textKo: '회의나 수업에서 아무도 말을 안 할 때 나는:',
    options: [
      { id: 'A', text: 'I break the silence and share my thoughts first', textKo: '내가 먼저 침묵을 깨고 의견을 말한다' },
      { id: 'B', text: 'I wait a bit, then speak if no one else does', textKo: '잠깐 기다렸다가 아무도 안 하면 말한다' },
      { id: 'C', text: 'I stay quiet and hope someone else starts', textKo: '조용히 있으면서 다른 사람이 시작하길 바란다' },
    ],
  },
  {
    id: 'dom_7',
    axis: 'dominance',
    text: 'When a waiter brings the wrong order at a restaurant:',
    textKo: '식당에서 주문한 것과 다른 음식이 나왔을 때:',
    options: [
      { id: 'A', text: 'I immediately call them over and ask to fix it', textKo: '바로 직원을 불러서 바꿔달라고 한다' },
      { id: 'B', text: 'I politely mention it when they come by', textKo: '직원이 오면 정중하게 말한다' },
      { id: 'C', text: 'I usually just eat it to avoid the hassle', textKo: '귀찮아서 그냥 먹는 편이다' },
    ],
  },
  {
    id: 'dom_8',
    axis: 'dominance',
    text: 'When someone cuts in line in front of you:',
    textKo: '누군가 내 앞에서 새치기를 했을 때:',
    options: [
      { id: 'A', text: 'I speak up and tell them to wait their turn', textKo: '그 사람에게 줄 서라고 말한다' },
      { id: 'B', text: 'I might say something depending on the situation', textKo: '상황에 따라 말할 수도 있다' },
      { id: 'C', text: 'I stay silent even if it bothers me', textKo: '속으로 불편해도 그냥 있는다' },
    ],
  },
  {
    id: 'dom_9',
    axis: 'dominance',
    text: 'Your friends are debating where to go next on a night out:',
    textKo: '친구들과 놀다가 다음에 어디 갈지 정할 때:',
    options: [
      { id: 'A', text: 'I make a quick decision and lead the way', textKo: '내가 빨리 정해서 앞장선다' },
      { id: 'B', text: 'I propose a few options for the group', textKo: '몇 가지 선택지를 제안한다' },
      { id: 'C', text: 'I follow wherever the group wants to go', textKo: '다들 가고 싶은 데로 따라간다' },
    ],
  },
  {
    id: 'dom_10',
    axis: 'dominance',
    text: 'When you have a different opinion from your boss or teacher:',
    textKo: '상사나 선생님과 의견이 다를 때 나는:',
    options: [
      { id: 'A', text: 'I respectfully but firmly share my view', textKo: '정중하지만 확실하게 내 의견을 말한다' },
      { id: 'B', text: 'I share my thoughts if it seems appropriate', textKo: '적절해 보이면 조심스럽게 말한다' },
      { id: 'C', text: 'I keep it to myself and follow their lead', textKo: '속으로만 생각하고 그분 의견을 따른다' },
    ],
  },
  {
    id: 'dom_11',
    axis: 'dominance',
    text: 'When dividing household chores with family/roommates:',
    textKo: '가족이나 룸메이트와 집안일을 나눌 때:',
    options: [
      { id: 'A', text: 'I create a schedule and assign tasks', textKo: '내가 스케줄을 짜고 역할을 정한다' },
      { id: 'B', text: 'I discuss and we agree together', textKo: '같이 이야기해서 정한다' },
      { id: 'C', text: 'I do whatever others ask me to do', textKo: '시키는 대로 한다' },
    ],
  },
  {
    id: 'dom_12',
    axis: 'dominance',
    text: 'When playing a board game or video game with friends:',
    textKo: '친구들과 게임할 때 나는:',
    options: [
      { id: 'A', text: 'I explain the rules and lead the game', textKo: '규칙을 설명하고 게임을 이끈다' },
      { id: 'B', text: 'I participate actively and share strategies', textKo: '적극적으로 참여하고 전략도 나눈다' },
      { id: 'C', text: 'I follow along and learn as we play', textKo: '따라가면서 배운다' },
    ],
  },
  {
    id: 'dom_13',
    axis: 'dominance',
    text: 'When a group project is going off track:',
    textKo: '팀 프로젝트가 산으로 갈 때 나는:',
    options: [
      { id: 'A', text: 'I step in and redirect the team', textKo: '내가 나서서 방향을 잡아준다' },
      { id: 'B', text: 'I raise concerns and suggest solutions', textKo: '문제점을 말하고 해결책을 제안한다' },
      { id: 'C', text: 'I wait for someone else to fix it', textKo: '다른 사람이 해결해주길 기다린다' },
    ],
  },
  {
    id: 'dom_14',
    axis: 'dominance',
    text: 'When negotiating price at a market or with a seller:',
    textKo: '시장이나 중고거래에서 가격 협상할 때:',
    options: [
      { id: 'A', text: 'I confidently negotiate for a better price', textKo: '자신 있게 깎아달라고 한다' },
      { id: 'B', text: 'I try a little but accept if they refuse', textKo: '한번 해보고 안 되면 그냥 산다' },
      { id: 'C', text: 'I just pay the asking price', textKo: '그냥 달라는 대로 준다' },
    ],
  },
  {
    id: 'dom_15',
    axis: 'dominance',
    text: 'When you think a friend is making a bad decision:',
    textKo: '친구가 안 좋은 선택을 하려는 것 같을 때:',
    options: [
      { id: 'A', text: 'I directly tell them my concerns', textKo: '직접적으로 내 걱정을 말해준다' },
      { id: 'B', text: 'I gently share my perspective if they ask', textKo: '물어보면 조심스럽게 내 생각을 말한다' },
      { id: 'C', text: 'I let them figure it out themselves', textKo: '스스로 알아서 하게 둔다' },
    ],
  },
  {
    id: 'dom_16',
    axis: 'dominance',
    text: 'When introducing yourself at a new social gathering:',
    textKo: '새로운 모임에서 자기소개할 때 나는:',
    options: [
      { id: 'A', text: 'I speak confidently and make a strong impression', textKo: '자신감 있게 임팩트 있게 말한다' },
      { id: 'B', text: 'I share basic info in a friendly way', textKo: '친근하게 기본적인 소개를 한다' },
      { id: 'C', text: 'I keep it brief and hope attention moves on', textKo: '짧게 끝내고 관심이 빨리 지나가길 바란다' },
    ],
  },

  // ========== AFFILIATION AXIS (친밀-거리) - 16 questions ==========
  {
    id: 'aff_1',
    axis: 'affiliation',
    text: 'When a close friend texts that they are having a bad day:',
    textKo: '친한 친구가 "오늘 너무 힘들다"라고 연락 왔을 때:',
    options: [
      { id: 'A', text: 'I call them right away or go see them', textKo: '바로 전화하거나 만나러 간다' },
      { id: 'B', text: 'I send a supportive message and check in later', textKo: '위로 메시지 보내고 나중에 연락한다' },
      { id: 'C', text: 'I acknowledge it briefly and give them space', textKo: '짧게 반응하고 알아서 하게 둔다' },
    ],
  },
  {
    id: 'aff_2',
    axis: 'affiliation',
    text: 'When meeting your partner\'s or friend\'s family for the first time:',
    textKo: '연인이나 친구의 가족을 처음 만날 때 나는:',
    options: [
      { id: 'A', text: 'I warmly engage and try to connect with everyone', textKo: '적극적으로 다가가서 친해지려 한다' },
      { id: 'B', text: 'I am polite and friendly but take it slow', textKo: '예의 바르게 천천히 다가간다' },
      { id: 'C', text: 'I stay quiet and let them approach me', textKo: '조용히 있으면서 상대가 먼저 다가오길 기다린다' },
    ],
  },
  {
    id: 'aff_3',
    axis: 'affiliation',
    text: 'When a coworker you don\'t know well is eating lunch alone:',
    textKo: '잘 모르는 직장 동료가 혼자 점심 먹고 있을 때:',
    options: [
      { id: 'A', text: 'I invite them to join me or sit with them', textKo: '같이 먹자고 하거나 옆에 앉는다' },
      { id: 'B', text: 'I smile and say hi but don\'t impose', textKo: '인사는 하지만 굳이 같이 앉진 않는다' },
      { id: 'C', text: 'I mind my own business', textKo: '내 할 일만 한다' },
    ],
  },
  {
    id: 'aff_4',
    axis: 'affiliation',
    text: 'When sharing how you really feel after a breakup or loss:',
    textKo: '이별이나 힘든 일 후에 내 감정을 말할 때:',
    options: [
      { id: 'A', text: 'I open up to close friends and family', textKo: '가까운 사람들에게 솔직하게 털어놓는다' },
      { id: 'B', text: 'I share a little with one or two people', textKo: '한두 명에게만 조금 말한다' },
      { id: 'C', text: 'I keep it to myself and process alone', textKo: '혼자 삭이고 내 안에서 정리한다' },
    ],
  },
  {
    id: 'aff_5',
    axis: 'affiliation',
    text: 'When a friend cancels plans last minute:',
    textKo: '친구가 약속 직전에 취소했을 때:',
    options: [
      { id: 'A', text: 'I understand; things happen, I reach out to reschedule', textKo: '그럴 수 있지, 다음에 보자고 먼저 연락한다' },
      { id: 'B', text: 'I am okay with it but wait for them to reschedule', textKo: '괜찮지만 상대가 다시 잡기를 기다린다' },
      { id: 'C', text: 'I feel annoyed and need time before reaching out', textKo: '좀 서운해서 연락하기까지 시간이 필요하다' },
    ],
  },
  {
    id: 'aff_6',
    axis: 'affiliation',
    text: 'When you see someone struggling with heavy bags on the street:',
    textKo: '길에서 짐이 무거워 보이는 사람을 봤을 때:',
    options: [
      { id: 'A', text: 'I offer to help without hesitation', textKo: '망설임 없이 도와드릴까요 라고 한다' },
      { id: 'B', text: 'I might help if they look like they need it', textKo: '정말 힘들어 보이면 도와준다' },
      { id: 'C', text: 'I walk by; they can manage', textKo: '그냥 지나간다, 알아서 하겠지' },
    ],
  },
  {
    id: 'aff_7',
    axis: 'affiliation',
    text: 'When a close friend gives you honest but critical feedback:',
    textKo: '친한 친구가 내 행동에 대해 솔직하게 지적할 때:',
    options: [
      { id: 'A', text: 'I appreciate it and take it to heart', textKo: '고맙게 받아들이고 진지하게 생각한다' },
      { id: 'B', text: 'I listen but need time to process', textKo: '듣긴 하지만 시간이 좀 필요하다' },
      { id: 'C', text: 'I get defensive or dismiss it', textKo: '방어적이 되거나 흘려듣게 된다' },
    ],
  },
  {
    id: 'aff_8',
    axis: 'affiliation',
    text: 'When meeting someone new at a party or event:',
    textKo: '파티나 모임에서 처음 보는 사람을 만났을 때:',
    options: [
      { id: 'A', text: 'I introduce myself and start a conversation', textKo: '내가 먼저 다가가서 말을 건다' },
      { id: 'B', text: 'I am friendly if they approach me first', textKo: '상대가 먼저 다가오면 친하게 대한다' },
      { id: 'C', text: 'I stick to people I already know', textKo: '아는 사람들 옆에만 있는다' },
    ],
  },
  {
    id: 'aff_9',
    axis: 'affiliation',
    text: 'When a friend is celebrating good news:',
    textKo: '친구에게 좋은 일이 생겨서 축하할 때:',
    options: [
      { id: 'A', text: 'I celebrate enthusiastically with them', textKo: '같이 진심으로 기뻐하며 축하한다' },
      { id: 'B', text: 'I congratulate them sincerely', textKo: '진심으로 축하한다고 말한다' },
      { id: 'C', text: 'I say congrats but don\'t make a big deal', textKo: '축하한다고만 하고 넘어간다' },
    ],
  },
  {
    id: 'aff_10',
    axis: 'affiliation',
    text: 'How often do you reach out to friends just to check in:',
    textKo: '별일 없어도 친구에게 먼저 연락하는 편인가:',
    options: [
      { id: 'A', text: 'Often; I like staying connected', textKo: '자주, 연락하고 지내는 게 좋다' },
      { id: 'B', text: 'Sometimes when I think of them', textKo: '가끔 생각나면 한다' },
      { id: 'C', text: 'Rarely; I wait until there is a reason', textKo: '거의 안 함, 용건이 있을 때만 한다' },
    ],
  },
  {
    id: 'aff_11',
    axis: 'affiliation',
    text: 'When you had a great day and want to share:',
    textKo: '좋은 일이 있어서 누군가에게 말하고 싶을 때:',
    options: [
      { id: 'A', text: 'I immediately call or message close ones', textKo: '바로 가까운 사람에게 연락한다' },
      { id: 'B', text: 'I share when I see them next', textKo: '다음에 만나면 이야기한다' },
      { id: 'C', text: 'I enjoy it myself; I don\'t need to share', textKo: '혼자 좋으면 됐지, 굳이 말할 필요 없다' },
    ],
  },
  {
    id: 'aff_12',
    axis: 'affiliation',
    text: 'When you haven\'t heard from a friend in a while:',
    textKo: '한동안 연락 없던 친구가 있을 때:',
    options: [
      { id: 'A', text: 'I reach out first to reconnect', textKo: '내가 먼저 연락해서 안부를 묻는다' },
      { id: 'B', text: 'I think about them but wait a bit more', textKo: '생각은 나지만 조금 더 기다린다' },
      { id: 'C', text: 'If they want to talk, they will reach out', textKo: '연락하고 싶으면 걔가 하겠지' },
    ],
  },
  {
    id: 'aff_13',
    axis: 'affiliation',
    text: 'When someone you recently met asks to hang out one-on-one:',
    textKo: '최근에 알게 된 사람이 둘이 만나자고 할 때:',
    options: [
      { id: 'A', text: 'I happily agree; I love getting to know new people', textKo: '좋아, 새 사람 알아가는 거 좋다' },
      { id: 'B', text: 'I am open to it but prefer a group setting first', textKo: '괜찮은데 처음엔 여럿이 만나고 싶다' },
      { id: 'C', text: 'I am hesitant; I need more time', textKo: '좀 망설여진다, 시간이 더 필요하다' },
    ],
  },
  {
    id: 'aff_14',
    axis: 'affiliation',
    text: 'When someone at work or school seems left out:',
    textKo: '직장이나 학교에서 누군가 겉도는 것 같을 때:',
    options: [
      { id: 'A', text: 'I actively include them and make them feel welcome', textKo: '적극적으로 챙기고 껴준다' },
      { id: 'B', text: 'I am nice to them but don\'t go out of my way', textKo: '잘 대해주지만 특별히 챙기진 않는다' },
      { id: 'C', text: 'I focus on my own circle', textKo: '내 사람들에게만 집중한다' },
    ],
  },
  {
    id: 'aff_15',
    axis: 'affiliation',
    text: 'How do you feel about physical affection like hugs with friends:',
    textKo: '친구와 포옹 같은 스킨십에 대해:',
    options: [
      { id: 'A', text: 'I love it; it\'s how I show I care', textKo: '좋다, 내가 친함을 표현하는 방식이다' },
      { id: 'B', text: 'It\'s fine with close friends', textKo: '친한 친구끼린 괜찮다' },
      { id: 'C', text: 'I prefer to keep physical distance', textKo: '거리를 두는 게 편하다' },
    ],
  },
  {
    id: 'aff_16',
    axis: 'affiliation',
    text: 'When a friend or family member makes a mistake that affects you:',
    textKo: '친구나 가족이 나에게 피해를 주는 실수를 했을 때:',
    options: [
      { id: 'A', text: 'I forgive quickly; relationships matter more', textKo: '금방 용서한다, 관계가 더 중요하니까' },
      { id: 'B', text: 'I forgive but need some time', textKo: '용서하지만 시간이 좀 걸린다' },
      { id: 'C', text: 'I have trouble letting go of it', textKo: '쉽게 잊기 어렵다' },
    ],
  },
];
