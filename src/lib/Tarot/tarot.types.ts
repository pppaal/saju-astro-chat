// 카드 한 장의 상세 해석 정보
export interface CardMeaning {
  keywords: string[];
  meaning: string;
}

// 타로 카드 1장의 전체 데이터 구조
export interface Card {
  id: number;
  name: string;
  image: string;
  upright: CardMeaning;
  reversed: CardMeaning;
}

// 뽑힌 카드의 정보 (카드 데이터 + 정/역방향 여부)
export interface DrawnCard {
  card: Card;
  isReversed: boolean;
}

// 질문(스프레드)에서 각 카드 위치의 정보
// title은 "과거", "현재" 등 각 위치의 이름입니다.
export interface SpreadPosition {
  title: string;
}

// 질문(스프레드) 1개의 전체 정보
export interface Spread {
  id: string;
  title: string;
  cardCount: number;
  description: string; // 스프레드 전체에 대한 설명
  positions: SpreadPosition[]; // 각 카드 위치에 대한 정보 배열
}

// 질문들을 묶는 테마 1개의 정보 (예: '연애운')
export interface TarotTheme {
  id: string;
  category: string;
  description: string;
  spreads: Spread[];
}