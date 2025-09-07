// 1. 카드의 형태(타입)를 정의합니다.
export interface Card {
  name: string;
  meaning_up: string;
  meaning_rev: string;
}

// 2. [핵심!] 'export const'를 사용하여 tarotDeck 변수를 "이름을 붙여서" 내보냅니다.
// 이렇게 해야 다른 파일에서 { tarotDeck } 형태로 정확히 가져올 수 있습니다.
export const tarotDeck: Card[] = [
  {
    name: "The Fool (광대)",
    meaning_up: "새로운 시작, 순수함, 모험, 무한한 가능성.",
    meaning_rev: "무모함, 어리석은 결정, 위험을 간과함.",
  },
  {
    name: "The Magician (마법사)",
    meaning_up: "의지력, 창조, 재능, 힘.",
    meaning_rev: "속임수, 재능의 오용, 조작.",
  },
  {
    name: "The High Priestess (여사제)",
    meaning_up: "직관, 비밀, 지혜, 무의식.",
    meaning_rev: "숨겨진 진실, 피상적인 지식, 혼란.",
  },
  // ... (여기에 78장의 카드 데이터가 모두 들어있다고 가정합니다) ...
  // 마지막 카드 예시
  {
    name: "The World (세계)",
    meaning_up: "완성, 성취, 통합, 여행.",
    meaning_rev: "미완성, 정체, 끝없는 과정.",
  }
];

// 만약 이전에 export default를 사용했다면 그 줄은 삭제해야 합니다.