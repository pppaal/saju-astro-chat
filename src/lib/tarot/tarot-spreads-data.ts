import { TarotTheme } from './tarot.types'

// 4 동적 스프레드 — 1·3·5·7장. 자리(positions) 는 고정 라벨 대신
// LLM 이 사용자 질문 맥락에 맞춰 응답 시 직접 명명한다.
// 자리 의미가 비어 있어도 UI/API 가 동작하도록 positions 는 빈 배열로 둠.
// 기존 스프레드 ID(`quick-reading` / `past-present-future` / `general-cross`
// / `celtic-cross`) 는 깨지는 라우트·저장 데이터를 피하려 그대로 유지.
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
]
