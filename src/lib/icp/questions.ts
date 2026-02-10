// src/lib/icp/questions.ts
/**
 * ICP (Interpersonal Circumplex) 설문 질문
 * 두 축 기반: Dominance (주도-수용) & Affiliation (친밀-거리)
 * 32개 질문 (각 축 16개) - 구체적인 일상 상황 기반
 */

export type ICPOption = { id: string; text: string; textKo: string }
export type ICPQuestion = {
  id: string
  axis: 'dominance' | 'affiliation'
  text: string
  textKo: string
  options: ICPOption[]
}

export const TOTAL_ICP_QUESTIONS = 32

export const icpQuestions: ICPQuestion[] = [
  // ========== DOMINANCE AXIS (주도-수용) - 16 questions ==========
  {
    id: 'dom_1',
    axis: 'dominance',
    text: 'When your friend group is choosing where to eat dinner tonight, I:',
    textKo: '친구들과 오늘 저녁을 어디서 먹을지 정할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I suggest a place and try to persuade everyone.',
        textKo: '제가 가고 싶은 곳을 제안하고 설득합니다.',
      },
      {
        id: 'B',
        text: 'I share my preference and see what others think.',
        textKo: '제 의견을 말하고 다른 사람 생각을 들어봅니다.',
      },
      {
        id: 'C',
        text: 'I let others decide and go along.',
        textKo: '다른 사람이 정하면 그대로 따릅니다.',
      },
    ],
  },
  {
    id: 'dom_2',
    axis: 'dominance',
    text: 'During a team project at work or school, I:',
    textKo: '학교나 직장에서 팀 프로젝트를 할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I naturally take the lead and assign tasks.',
        textKo: '자연스럽게 리더 역할을 맡아 역할을 나눕니다.',
      },
      {
        id: 'B',
        text: 'I contribute ideas and help coordinate.',
        textKo: '아이디어를 내고 조율을 돕습니다.',
      },
      {
        id: 'C',
        text: 'I wait for direction and do my assigned part.',
        textKo: '지시를 기다렸다가 맡은 일을 합니다.',
      },
    ],
  },
  {
    id: 'dom_3',
    axis: 'dominance',
    text: 'When a close friend and I disagree about weekend plans, I:',
    textKo: '친한 친구와 주말 계획이 달라 의견이 부딪힐 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I stand firm on what I want to do.',
        textKo: '제가 하고 싶은 일을 분명히 주장합니다.',
      },
      {
        id: 'B',
        text: 'I try to find a middle ground.',
        textKo: '서로 맞출 수 있는 지점을 찾습니다.',
      },
      {
        id: 'C',
        text: 'I usually go with their preference to avoid conflict.',
        textKo: '갈등을 피하려고 보통 친구 의견에 맞춥니다.',
      },
    ],
  },
  {
    id: 'dom_4',
    axis: 'dominance',
    text: 'When my sibling or roommate wants a different show than I do, I:',
    textKo: '가족이나 룸메이트가 저와 다른 TV 프로그램을 보고 싶어 할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I argue for my choice and often get my way.',
        textKo: '제 선택을 주장해서 보통 제 뜻대로 합니다.',
      },
      {
        id: 'B',
        text: 'We take turns or find something we both like.',
        textKo: '번갈아 보거나 둘 다 좋아하는 걸 찾습니다.',
      },
      {
        id: 'C',
        text: 'I let them choose; it is not worth arguing.',
        textKo: '크게 중요하지 않아 양보합니다.',
      },
    ],
  },
  {
    id: 'dom_5',
    axis: 'dominance',
    text: 'When planning a group trip with friends, I:',
    textKo: '친구들과 단체 여행을 계획할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I research and build the itinerary for everyone.',
        textKo: '제가 조사해서 일정을 짭니다.',
      },
      {
        id: 'B',
        text: 'I suggest ideas and we decide together.',
        textKo: '아이디어를 내고 함께 결정합니다.',
      },
      {
        id: 'C',
        text: 'I follow whatever the group decides.',
        textKo: '모두가 정한 대로 따릅니다.',
      },
    ],
  },
  {
    id: 'dom_6',
    axis: 'dominance',
    text: 'When a meeting or class discussion is quiet, I:',
    textKo: '회의나 수업에서 아무도 말이 없을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I break the silence and speak up first.',
        textKo: '침묵을 깨고 먼저 의견을 말합니다.',
      },
      {
        id: 'B',
        text: 'I wait a bit, then speak if no one else does.',
        textKo: '조금 기다렸다가 아무도 말하지 않으면 말합니다.',
      },
      {
        id: 'C',
        text: 'I stay quiet and hope someone else starts.',
        textKo: '조용히 있다가 다른 사람이 시작하길 바랍니다.',
      },
    ],
  },
  {
    id: 'dom_7',
    axis: 'dominance',
    text: 'When a waiter brings the wrong order at a restaurant, I:',
    textKo: '식당에서 주문한 것과 다른 음식이 나왔을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I call them over and ask to fix it right away.',
        textKo: '바로 직원에게 알려서 바꿔 달라고 합니다.',
      },
      {
        id: 'B',
        text: 'I mention it politely when they come by.',
        textKo: '직원이 올 때 정중히 말씀드립니다.',
      },
      {
        id: 'C',
        text: 'I usually just eat it to avoid the hassle.',
        textKo: '번거로워서 그냥 먹는 편입니다.',
      },
    ],
  },
  {
    id: 'dom_8',
    axis: 'dominance',
    text: 'When someone cuts in line in front of me, I:',
    textKo: '누군가 제 앞에 새치기를 했을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I speak up and ask them to wait their turn.',
        textKo: '줄을 서 달라고 말합니다.',
      },
      {
        id: 'B',
        text: 'I might say something depending on the situation.',
        textKo: '상황을 보고 말하기도 합니다.',
      },
      {
        id: 'C',
        text: 'I stay silent even if it bothers me.',
        textKo: '불편해도 조용히 있는 편입니다.',
      },
    ],
  },
  {
    id: 'dom_9',
    axis: 'dominance',
    text: 'When friends are deciding where to go next on a night out, I:',
    textKo: '친구들과 놀다가 다음에 어디 갈지 정할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I make a quick decision and lead the way.',
        textKo: '제가 빠르게 정하고 이끕니다.',
      },
      {
        id: 'B',
        text: 'I suggest a few options to the group.',
        textKo: '몇 가지 선택지를 제안합니다.',
      },
      {
        id: 'C',
        text: 'I go along with wherever the group wants.',
        textKo: '모두가 가고 싶은 곳으로 따라갑니다.',
      },
    ],
  },
  {
    id: 'dom_10',
    axis: 'dominance',
    text: 'When I have a different opinion from my boss or teacher, I:',
    textKo: '상사나 선생님과 의견이 다를 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I respectfully but firmly share my view.',
        textKo: '정중하지만 분명하게 제 의견을 말합니다.',
      },
      {
        id: 'B',
        text: 'I share my thoughts if it seems appropriate.',
        textKo: '상황이 적절해 보이면 조심스럽게 말합니다.',
      },
      {
        id: 'C',
        text: 'I keep it to myself and follow their lead.',
        textKo: '속으로만 생각하고 따릅니다.',
      },
    ],
  },
  {
    id: 'dom_11',
    axis: 'dominance',
    text: 'When dividing household chores with family or roommates, I:',
    textKo: '가족이나 룸메이트와 집안일을 나눌 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I create a schedule and assign tasks.',
        textKo: '일정을 만들고 역할을 나눕니다.',
      },
      { id: 'B', text: 'I discuss and agree together.', textKo: '함께 상의해서 정합니다.' },
      { id: 'C', text: 'I do whatever others ask me to do.', textKo: '부탁받은 일을 합니다.' },
    ],
  },
  {
    id: 'dom_12',
    axis: 'dominance',
    text: 'When playing a board game or video game with friends, I:',
    textKo: '친구들과 보드게임이나 비디오게임을 할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I explain the rules and lead the game.',
        textKo: '규칙을 설명하고 게임을 이끕니다.',
      },
      {
        id: 'B',
        text: 'I participate actively and share strategies.',
        textKo: '적극적으로 참여하고 전략을 나눕니다.',
      },
      {
        id: 'C',
        text: 'I follow along and learn as we play.',
        textKo: '따라 하며 배우는 편입니다.',
      },
    ],
  },
  {
    id: 'dom_13',
    axis: 'dominance',
    text: 'When a group project is going off track, I:',
    textKo: '팀 프로젝트가 엇나가고 있을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I step in and redirect the team.',
        textKo: '제가 나서서 방향을 다시 잡습니다.',
      },
      {
        id: 'B',
        text: 'I raise concerns and suggest solutions.',
        textKo: '문제점을 말하고 해결책을 제안합니다.',
      },
      {
        id: 'C',
        text: 'I wait for someone else to fix it.',
        textKo: '다른 사람이 해결하길 기다립니다.',
      },
    ],
  },
  {
    id: 'dom_14',
    axis: 'dominance',
    text: 'When negotiating a price at a market or with a seller, I:',
    textKo: '시장이나 중고 거래에서 가격을 협상할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I confidently negotiate for a better price.',
        textKo: '자신 있게 깎아 달라고 합니다.',
      },
      {
        id: 'B',
        text: 'I try once or twice, but accept if they refuse.',
        textKo: '한두 번 시도해 보고 안 되면 그대로 삽니다.',
      },
      { id: 'C', text: 'I just pay the asking price.', textKo: '요청한 가격 그대로 지불합니다.' },
    ],
  },
  {
    id: 'dom_15',
    axis: 'dominance',
    text: 'When I think a friend is making a bad decision, I:',
    textKo: '친구가 좋지 않은 선택을 하려는 것 같을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I directly tell them my concerns.',
        textKo: '걱정되는 점을 직접 말합니다.',
      },
      {
        id: 'B',
        text: 'I gently share my perspective if they ask.',
        textKo: '물어보면 조심스럽게 제 생각을 말합니다.',
      },
      {
        id: 'C',
        text: 'I let them figure it out themselves.',
        textKo: '스스로 깨닫게 두는 편입니다.',
      },
    ],
  },
  {
    id: 'dom_16',
    axis: 'dominance',
    text: 'When introducing myself at a new social gathering, I:',
    textKo: '새로운 모임에서 자기소개할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I speak confidently and make a strong impression.',
        textKo: '자신 있게 말해 인상을 남깁니다.',
      },
      {
        id: 'B',
        text: 'I share basic info in a friendly way.',
        textKo: '친근하게 기본 정보를 말합니다.',
      },
      {
        id: 'C',
        text: 'I keep it brief and hope attention moves on.',
        textKo: '짧게 끝내고 관심이 빨리 지나가길 바랍니다.',
      },
    ],
  },

  // ========== AFFILIATION AXIS (친밀-거리) - 16 questions ==========
  {
    id: 'aff_1',
    axis: 'affiliation',
    text: 'When a close friend texts that they are having a bad day, I:',
    textKo: '친한 친구가 "오늘 너무 힘들어"라고 연락했을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I call right away or go see them.',
        textKo: '바로 전화하거나 만나러 갑니다.',
      },
      {
        id: 'B',
        text: 'I send a supportive message and check in later.',
        textKo: '위로 메시지를 보내고 나중에 다시 연락합니다.',
      },
      {
        id: 'C',
        text: 'I acknowledge it briefly and give them space.',
        textKo: '짧게 반응하고 공간을 줍니다.',
      },
    ],
  },
  {
    id: 'aff_2',
    axis: 'affiliation',
    text: 'When meeting the family of a partner or friend for the first time, I:',
    textKo: '연인이나 친구의 가족을 처음 만날 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I warmly engage and try to connect with everyone.',
        textKo: '적극적으로 다가가 친해지려 합니다.',
      },
      {
        id: 'B',
        text: 'I am polite and friendly but take it slow.',
        textKo: '예의 바르게 천천히 친해집니다.',
      },
      {
        id: 'C',
        text: 'I stay quiet and let them approach me.',
        textKo: '조용히 있다가 상대가 먼저 다가오길 기다립니다.',
      },
    ],
  },
  {
    id: 'aff_3',
    axis: 'affiliation',
    text: 'When a coworker I do not know well is eating lunch alone, I:',
    textKo: '잘 모르는 직장 동료가 혼자 점심을 먹고 있을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I invite them to join me or sit with them.',
        textKo: '같이 먹자고 하거나 옆에 앉습니다.',
      },
      {
        id: 'B',
        text: 'I smile and say hi but do not impose.',
        textKo: '인사는 하지만 억지로 함께하진 않습니다.',
      },
      { id: 'C', text: 'I mind my own business.', textKo: '제 일에만 집중합니다.' },
    ],
  },
  {
    id: 'aff_4',
    axis: 'affiliation',
    text: 'When sharing how I really feel after a breakup or loss, I:',
    textKo: '이별이나 힘든 일 뒤에 제 감정을 말할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I open up to close friends and family.',
        textKo: '가까운 사람들에게 솔직하게 털어놓습니다.',
      },
      {
        id: 'B',
        text: 'I share a little with one or two people.',
        textKo: '한두 명에게만 조금 나눕니다.',
      },
      {
        id: 'C',
        text: 'I keep it to myself and process alone.',
        textKo: '혼자 정리하는 편입니다.',
      },
    ],
  },
  {
    id: 'aff_5',
    axis: 'affiliation',
    text: 'When a friend cancels plans at the last minute, I:',
    textKo: '친구가 약속 직전에 취소했을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I understand and reach out to reschedule.',
        textKo: '그럴 수 있다고 생각하고 다시 잡자고 먼저 연락합니다.',
      },
      {
        id: 'B',
        text: 'I am okay with it but wait for them to reschedule.',
        textKo: '괜찮지만 상대가 다시 잡아주길 기다립니다.',
      },
      {
        id: 'C',
        text: 'I feel annoyed and need time before reaching out.',
        textKo: '서운해서 연락하기 전에 시간이 필요합니다.',
      },
    ],
  },
  {
    id: 'aff_6',
    axis: 'affiliation',
    text: 'When I see someone struggling with heavy bags on the street, I:',
    textKo: '길에서 짐이 무거워 보이는 사람을 봤을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I offer to help without hesitation.',
        textKo: '망설임 없이 도와드릴까요 하고 묻습니다.',
      },
      {
        id: 'B',
        text: 'I might help if they seem to need it.',
        textKo: '정말 힘들어 보이면 도와드립니다.',
      },
      {
        id: 'C',
        text: 'I walk by; they can manage.',
        textKo: '지나칩니다. 스스로 할 수 있다고 생각합니다.',
      },
    ],
  },
  {
    id: 'aff_7',
    axis: 'affiliation',
    text: 'When a close friend gives me honest but critical feedback, I:',
    textKo: '친한 친구가 제 행동을 솔직하게 지적할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I appreciate it and take it to heart.',
        textKo: '고맙게 받아들이고 진지하게 생각합니다.',
      },
      {
        id: 'B',
        text: 'I listen but need time to process.',
        textKo: '듣긴 하지만 정리할 시간이 필요합니다.',
      },
      {
        id: 'C',
        text: 'I get defensive or dismiss it.',
        textKo: '방어적이 되거나 대수롭지 않게 넘깁니다.',
      },
    ],
  },
  {
    id: 'aff_8',
    axis: 'affiliation',
    text: 'When meeting someone new at a party or event, I:',
    textKo: '파티나 모임에서 처음 보는 사람을 만났을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I introduce myself and start a conversation.',
        textKo: '먼저 인사하고 대화를 시작합니다.',
      },
      {
        id: 'B',
        text: 'I am friendly if they approach me first.',
        textKo: '상대가 먼저 다가오면 친근하게 대해줍니다.',
      },
      {
        id: 'C',
        text: 'I stick to people I already know.',
        textKo: '아는 사람들 곁에만 있습니다.',
      },
    ],
  },
  {
    id: 'aff_9',
    axis: 'affiliation',
    text: 'When a friend is celebrating good news, I:',
    textKo: '친구에게 좋은 일이 생겨 축하할 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I celebrate enthusiastically with them.',
        textKo: '함께 크게 기뻐하며 축하합니다.',
      },
      { id: 'B', text: 'I congratulate them sincerely.', textKo: '진심으로 축하한다고 말합니다.' },
      {
        id: 'C',
        text: 'I say congrats but do not make a big deal.',
        textKo: '축하한다고 말하되 크게 떠들지는 않습니다.',
      },
    ],
  },
  {
    id: 'aff_10',
    axis: 'affiliation',
    text: 'How often do you reach out to friends just to check in?',
    textKo: '별일 없어도 친구에게 먼저 연락하는 편인가요?',
    options: [
      {
        id: 'A',
        text: 'I reach out often; I like staying connected.',
        textKo: '자주 합니다. 계속 연락하며 지내는 게 좋습니다.',
      },
      {
        id: 'B',
        text: 'I reach out sometimes when I think of them.',
        textKo: '가끔 생각나면 연락합니다.',
      },
      {
        id: 'C',
        text: 'I rarely reach out unless there is a reason.',
        textKo: '거의 하지 않습니다. 이유가 있을 때만 합니다.',
      },
    ],
  },
  {
    id: 'aff_11',
    axis: 'affiliation',
    text: 'When I have a great day and want to share, I:',
    textKo: '좋은 일이 있어 누군가에게 말하고 싶을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I immediately call or message someone close.',
        textKo: '바로 가까운 사람에게 연락합니다.',
      },
      { id: 'B', text: 'I share it when I see them next.', textKo: '다음에 만날 때 이야기합니다.' },
      {
        id: 'C',
        text: 'I enjoy it myself and do not need to share.',
        textKo: '혼자 즐기는 편이라 굳이 말하지 않습니다.',
      },
    ],
  },
  {
    id: 'aff_12',
    axis: 'affiliation',
    text: 'When I have not heard from a friend in a while, I:',
    textKo: '한동안 연락이 없던 친구가 있을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I reach out first to reconnect.',
        textKo: '제가 먼저 연락해서 안부를 묻습니다.',
      },
      {
        id: 'B',
        text: 'I think about them but wait a bit longer.',
        textKo: '생각은 나지만 조금 더 기다립니다.',
      },
      {
        id: 'C',
        text: 'If they want to talk, they will reach out.',
        textKo: '연락하고 싶으면 상대가 먼저 하겠다고 생각합니다.',
      },
    ],
  },
  {
    id: 'aff_13',
    axis: 'affiliation',
    text: 'When someone I recently met asks to hang out one-on-one, I:',
    textKo: '최근에 알게 된 사람이 둘이 보자고 하면 저는:',
    options: [
      {
        id: 'A',
        text: 'I happily agree; I enjoy getting to know new people.',
        textKo: '기쁘게 받아들입니다. 새 사람 알아가는 걸 좋아합니다.',
      },
      {
        id: 'B',
        text: 'I am open to it, but I would prefer a group setting first.',
        textKo: '가능은 하지만 처음엔 여럿이 보는 게 더 편합니다.',
      },
      {
        id: 'C',
        text: 'I hesitate; I need more time.',
        textKo: '망설여집니다. 시간이 더 필요합니다.',
      },
    ],
  },
  {
    id: 'aff_14',
    axis: 'affiliation',
    text: 'When someone at work or school seems left out, I:',
    textKo: '직장이나 학교에서 누군가 소외되어 보일 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I actively include them and make them feel welcome.',
        textKo: '적극적으로 챙기고 환영받는 느낌을 주려 합니다.',
      },
      {
        id: 'B',
        text: 'I am kind to them but do not go out of my way.',
        textKo: '친절하게 대하되 특별히 나서지는 않습니다.',
      },
      { id: 'C', text: 'I focus on my own circle.', textKo: '제 주변 사람들에게만 집중합니다.' },
    ],
  },
  {
    id: 'aff_15',
    axis: 'affiliation',
    text: 'How do you feel about physical affection like hugs with friends?',
    textKo: '친구와 포옹 같은 스킨십에 대해 어떻게 느끼시나요?',
    options: [
      {
        id: 'A',
        text: 'I love it; it is how I show I care.',
        textKo: '좋아합니다. 제 마음을 표현하는 방식입니다.',
      },
      { id: 'B', text: 'It is fine with close friends.', textKo: '가까운 친구와는 괜찮습니다.' },
      {
        id: 'C',
        text: 'I prefer to keep physical distance.',
        textKo: '신체적 거리를 두는 편이 편합니다.',
      },
    ],
  },
  {
    id: 'aff_16',
    axis: 'affiliation',
    text: 'When a friend or family member makes a mistake that affects me, I:',
    textKo: '친구나 가족이 제게 영향을 주는 실수를 했을 때 저는:',
    options: [
      {
        id: 'A',
        text: 'I forgive quickly; relationships matter more.',
        textKo: '금방 용서합니다. 관계가 더 중요하다고 생각합니다.',
      },
      {
        id: 'B',
        text: 'I forgive but need some time.',
        textKo: '용서하지만 시간이 좀 필요합니다.',
      },
      { id: 'C', text: 'I have trouble letting go of it.', textKo: '쉽게 잊기 어렵습니다.' },
    ],
  },
]
