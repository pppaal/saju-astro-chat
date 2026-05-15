import { TarotTheme } from './tarot.types'

// 정통 4 스프레드만 유지 (1·3·5·10장) — 깊이 그라데이션.
// 자리 의미는 정통 구조만 유지, 테마별 변종 없음. 질문 톤·도메인은 LLM 이 추출.
export const tarotThemes: TarotTheme[] = [
  {
    id: 'general-insight',
    category: 'Tarot Reading',
    categoryKo: '타로 리딩',
    description: 'Pick a spread by depth — the question itself sets the theme.',
    descriptionKo: '질문은 자유롭게, 깊이에 맞는 스프레드만 고르면 돼요.',
    spreads: [
      {
        id: 'quick-reading',
        title: 'Quick Reading',
        titleKo: '한 장 리딩',
        cardCount: 1,
        description: 'One card — quick answer, daily message, or yes/no feel.',
        descriptionKo: '가벼운 질문 · 데일리 메시지 · 한 줄 답.',
        positions: [{ title: 'Message', titleKo: '메시지' }],
      },
      {
        id: 'past-present-future',
        title: 'Past, Present, Future',
        titleKo: '과거 · 현재 · 미래',
        cardCount: 3,
        description: 'Three cards — flow over time around the question.',
        descriptionKo: '질문의 흐름을 시간 축으로 짚어봐요.',
        positions: [
          { title: 'The Past', titleKo: '과거' },
          { title: 'The Present', titleKo: '현재' },
          { title: 'The Future', titleKo: '미래' },
        ],
      },
      {
        id: 'general-cross',
        title: 'Five-Card Cross',
        titleKo: '5장 크로스',
        cardCount: 5,
        description: 'Five cards — cause, present, ahead, advice, outcome.',
        descriptionKo: '원인 · 현재 · 앞으로 · 조언 · 결과 — 균형 잡힌 리딩.',
        positions: [
          {
            title: 'Root Cause',
            titleKo: '원인',
            meaning: 'The underlying current that set this in motion.',
            meaningKo: '이 일을 만든 근본 흐름.',
          },
          {
            title: 'The Present',
            titleKo: '현재',
            meaning: 'The energy most alive around the question right now.',
            meaningKo: '지금 가장 도드라진 에너지.',
          },
          {
            title: 'What Lies Ahead',
            titleKo: '앞으로의 흐름',
            meaning: 'The next phase if everything keeps flowing as-is.',
            meaningKo: '지금 흐름이 그대로 갔을 때의 다음 국면.',
          },
          {
            title: 'Advice',
            titleKo: '조언',
            meaning: 'The card to consciously pick up to bend the flow.',
            meaningKo: '흐름을 바꾸기 위해 의식적으로 잡아야 할 카드.',
          },
          {
            title: 'Likely Outcome',
            titleKo: '결과',
            meaning: 'Most probable landing point once the advice is taken.',
            meaningKo: '조언을 따랐을 때 가장 가능성 높은 결과.',
          },
        ],
      },
      {
        id: 'celtic-cross',
        title: 'The Celtic Cross',
        titleKo: '켈틱 크로스',
        cardCount: 10,
        description: 'Ten cards — deep, full-context reading.',
        descriptionKo: '인생급 질문을 다각도로 깊게 풀어요.',
        positions: [
          {
            title: 'The Present',
            titleKo: '현재',
            meaning: 'The core situation right now — the heart of the matter.',
            meaningKo: '지금 사용자가 들어가 있는 핵심 상황.',
          },
          {
            title: 'The Challenge',
            titleKo: '도전',
            meaning: 'The variable cutting across the present.',
            meaningKo: '현재를 가로지르는 가장 큰 변수.',
          },
          {
            title: 'The Past',
            titleKo: '과거',
            meaning: 'The root that planted this situation.',
            meaningKo: '지금 일의 뿌리가 된 과거 흐름.',
          },
          {
            title: 'The Future',
            titleKo: '미래',
            meaning: 'The next phase coming up.',
            meaningKo: '가까운 미래에 펼쳐질 다음 국면.',
          },
          {
            title: 'Above (Conscious)',
            titleKo: '의식',
            meaning: 'What the user consciously wants or plans.',
            meaningKo: '의식적으로 원하고 계획하는 것.',
          },
          {
            title: 'Below (Subconscious)',
            titleKo: '무의식',
            meaning: 'The deeper drive shaping decisions.',
            meaningKo: '결정에 영향 주는 깊은 동기.',
          },
          {
            title: 'Advice',
            titleKo: '조언',
            meaning: 'The card to consciously pick up.',
            meaningKo: '의식적으로 잡아야 할 카드의 메시지.',
          },
          {
            title: 'External Influences',
            titleKo: '외부 영향',
            meaning: 'How surroundings shape the user from outside.',
            meaningKo: '주변 사람·환경이 미치는 흐름.',
          },
          {
            title: 'Hopes and Fears',
            titleKo: '희망과 두려움',
            meaning: 'What the user hopes and dreads at once.',
            meaningKo: '동시에 바라고 두려워하는 양면 감정.',
          },
          {
            title: 'The Outcome',
            titleKo: '결과',
            meaning: 'Most probable destination if the current flow continues.',
            meaningKo: '흐름이 이어졌을 때 도달할 가장 가능성 높은 결과.',
          },
        ],
      },
    ],
  },
]
