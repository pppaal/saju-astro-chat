/**
 * 목성 관련 행운과 확장 영역
 * 목성은 행운, 확장, 성장, 풍요를 나타내는 행성
 */

import type { BilingualText, HouseNumber } from '../../types/core';

/**
 * 목성 하우스별 행운과 확장 영역
 */
export const JUPITER_HOUSE_BLESSINGS: Record<HouseNumber, BilingualText> = {
  1: {
    ko: "자신감과 존재감에서 행운이 와요. 자기 자신을 믿으세요.",
    en: "Luck comes through confidence and presence. Believe in yourself."
  },
  2: {
    ko: "재물과 자원에서 확장이 일어나요. 투자에 운이 있어요.",
    en: "Expansion in wealth and resources. Lucky in investments."
  },
  3: {
    ko: "소통과 학습에서 기회가 와요. 네트워크를 넓히세요.",
    en: "Opportunities through communication and learning. Expand your network."
  },
  4: {
    ko: "가정과 부동산에서 행운이 있어요. 기반이 탄탄해요.",
    en: "Luck in home and real estate. Strong foundation."
  },
  5: {
    ko: "창작과 자기표현에서 빛나요. 취미가 일이 될 수 있어요.",
    en: "Shine in creation and self-expression. Hobbies can become work."
  },
  6: {
    ko: "일상 업무와 건강 분야에서 성장해요. 서비스업에 적합해요.",
    en: "Growth in daily work and health fields. Suited for service."
  },
  7: {
    ko: "파트너십과 협업에서 확장이 일어나요. 좋은 파트너를 만나요.",
    en: "Expansion through partnerships. Meet good partners."
  },
  8: {
    ko: "투자, 상속, 깊은 변화에서 행운이 와요.",
    en: "Luck in investments, inheritance, deep transformation."
  },
  9: {
    ko: "해외, 교육, 출판에서 기회가 와요. 넓게 생각하세요.",
    en: "Opportunities in foreign affairs, education, publishing. Think big."
  },
  10: {
    ko: "커리어와 사회적 지위에서 크게 성장해요. 승진 운이 좋아요.",
    en: "Great growth in career and social status. Good promotion luck."
  },
  11: {
    ko: "인맥과 미래 비전에서 확장이 일어나요. 그룹에서 성공해요.",
    en: "Expansion in connections and future vision. Success in groups."
  },
  12: {
    ko: "영적 성장과 봉사에서 행운이 와요. 숨은 후원자가 있어요.",
    en: "Luck in spiritual growth and service. Hidden supporters exist."
  },
};
