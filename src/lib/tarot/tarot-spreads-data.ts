import { TarotTheme } from './tarot.types'

// 스프레드 — 자리(positions)는 고정 라벨 대신 LLM 이 사용자 질문 맥락에
// 맞춰 응답 시 직접 명명한다(positions 는 빈 배열). 다만 spreadTitle 은
// 프롬프트에 그대로 들어가므로, 목적형 제목("관계 십자" 등)이 해석 방향을
// 부드럽게 잡아준다.
// general-insight 의 4개 스프레드 ID(`quick-reading` / `past-present-future`
// / `general-cross` / `celtic-cross`)는 기존 라우트·저장 데이터 호환을 위해
// 절대 바꾸지 않는다.
export const tarotThemes: TarotTheme[] = [
  {
    id: 'general-insight',
    category: 'Tarot Reading',
    categoryKo: '타로 리딩',
    description: 'Pick how many cards — the LLM names each seat from your question.',
    descriptionKo: '카드 매수만 고르면 됩니다. 자리 이름은 질문에 맞춰 자동으로 정해져요.',
    spreads: [
      {
        id: 'quick-reading',
        title: '1-Card Reading',
        titleKo: '1장 리딩',
        cardCount: 1,
        description: 'One card — quick answer, daily message, or yes/no feel.',
        descriptionKo: '가벼운 질문 · 데일리 메시지 · 한 줄 답.',
        positions: [],
      },
      {
        id: 'past-present-future',
        title: '3-Card Reading',
        titleKo: '3장 리딩',
        cardCount: 3,
        description: 'Three cards — flow around the question.',
        descriptionKo: '질문의 흐름을 세 갈래로 풀어요.',
        positions: [],
      },
      {
        id: 'general-cross',
        title: '5-Card Reading',
        titleKo: '5장 리딩',
        cardCount: 5,
        description: 'Five cards — broader picture around the question.',
        descriptionKo: '질문을 다섯 각도로 균형 있게 봅니다.',
        positions: [],
      },
      {
        id: 'celtic-cross',
        title: '7-Card Reading',
        titleKo: '7장 리딩',
        cardCount: 7,
        description: 'Seven cards — full reading around the question.',
        descriptionKo: '질문을 일곱 각도로 깊이 풀어요.',
        positions: [],
      },
    ],
  },
  {
    id: 'love',
    category: 'Love & Relationship',
    categoryKo: '연애·관계',
    description: 'Spreads centered on feelings, connection, and where a bond is heading.',
    descriptionKo: '마음·관계의 흐름과 방향에 집중한 스프레드.',
    spreads: [
      {
        id: 'two-hearts',
        title: 'Two Hearts',
        titleKo: '두 마음',
        cardCount: 3,
        description: 'Your feelings, their feelings, and where it flows.',
        descriptionKo: '내 마음 · 상대 마음 · 둘의 흐름.',
        positions: [],
      },
      {
        id: 'relationship-cross',
        title: 'Relationship Cross',
        titleKo: '관계 십자',
        cardCount: 5,
        description: 'A deeper look at the bond, the block, and the path forward.',
        descriptionKo: '유대 · 걸림돌 · 나아갈 길까지 깊게.',
        positions: [],
      },
    ],
  },
  {
    id: 'decision',
    category: 'Decision & Choice',
    categoryKo: '결정·선택',
    description: 'Weigh options and find a clear lean.',
    descriptionKo: '선택지를 견주고 기울기를 찾는 스프레드.',
    spreads: [
      {
        id: 'yes-no',
        title: 'Yes or No',
        titleKo: '예 / 아니오',
        cardCount: 1,
        description: 'One card for a clear lean on a yes/no question.',
        descriptionKo: '예/아니오 질문에 한 장으로 기울기를 잡아요.',
        positions: [],
      },
      {
        id: 'crossroads',
        title: 'Crossroads',
        titleKo: '갈림길',
        cardCount: 4,
        description: 'Now, choice A, choice B, and guidance.',
        descriptionKo: '현재 · 선택 A · 선택 B · 조언.',
        positions: [],
      },
    ],
  },
  {
    id: 'career',
    category: 'Career & Money',
    categoryKo: '커리어·재물',
    description: 'Direction for work, money, and the next move.',
    descriptionKo: '일·돈·다음 한 수의 방향.',
    spreads: [
      {
        id: 'career-path',
        title: 'Career Path',
        titleKo: '커리어 경로',
        cardCount: 5,
        description: 'Where you are, what helps, what blocks, and the next step.',
        descriptionKo: '현 위치 · 강점 · 걸림돌 · 다음 한 수.',
        positions: [],
      },
    ],
  },
]
