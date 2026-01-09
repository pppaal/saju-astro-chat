/**
 * 화성 별자리별 열정 표현 방식
 * 화성은 욕망, 추구, 열정의 표현 방식을 나타냄
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const MARS_LOVE_STYLE: Record<ZodiacSign, BilingualText> = {
  aries: {
    ko: "열정적이고 직접적으로 다가가요. 밀당을 못해요.",
    en: "Approach passionately and directly. Can't play push-pull games."
  },
  taurus: {
    ko: "천천히 깊게 다가가요. 한번 빠지면 끝까지 가요.",
    en: "Approach slowly and deeply. Once in, you go all the way."
  },
  gemini: {
    ko: "말과 지적 유희로 유혹해요. 재미있게 다가가요.",
    en: "Seduce with words and intellectual play. Approach in fun ways."
  },
  cancer: {
    ko: "보호하고 챙기는 방식으로 다가가요. 감정으로 유혹해요.",
    en: "Approach by protecting and caring. Seduce emotionally."
  },
  leo: {
    ko: "로맨틱하고 화려하게 다가가요. 선물과 이벤트를 잘해요.",
    en: "Approach romantically and glamorously. Good at gifts and events."
  },
  virgo: {
    ko: "실용적으로 챙기며 다가가요. 세심한 배려로 유혹해요.",
    en: "Approach by practically caring. Seduce with thoughtful consideration."
  },
  libra: {
    ko: "우아하고 매력적으로 다가가요. 분위기를 잘 만들어요.",
    en: "Approach elegantly and charmingly. Good at creating atmosphere."
  },
  scorpio: {
    ko: "강렬하고 집중적으로 다가가요. 눈빛으로 유혹해요.",
    en: "Approach intensely and focused. Seduce with your gaze."
  },
  sagittarius: {
    ko: "자유롭고 솔직하게 다가가요. 모험을 함께 하자고 해요.",
    en: "Approach freely and honestly. Invite them on adventures."
  },
  capricorn: {
    ko: "진지하고 책임감 있게 다가가요. 미래를 약속해요.",
    en: "Approach seriously and responsibly. Promise a future."
  },
  aquarius: {
    ko: "독특하고 친구처럼 다가가요. 지적 매력으로 유혹해요.",
    en: "Approach uniquely like a friend. Seduce with intellectual charm."
  },
  pisces: {
    ko: "감성적이고 낭만적으로 다가가요. 영혼으로 연결돼요.",
    en: "Approach emotionally and romantically. Connect through souls."
  },
};

/**
 * Lilith 별자리별 숨겨진 욕망
 * 릴리스(블랙 문)는 억압된 욕망, 그림자 자아를 나타냄
 */
export const LILITH_DESIRES: Record<ZodiacSign, BilingualText> = {
  aries: {
    ko: "관계에서 주도권을 갖고 싶은 숨겨진 욕구가 있어요.",
    en: "Hidden desire to lead in relationships."
  },
  taurus: {
    ko: "관능적 즐거움에 대한 깊은 갈망이 있어요.",
    en: "Deep longing for sensual pleasures."
  },
  gemini: {
    ko: "비밀스러운 대화, 금기된 지식에 끌려요.",
    en: "Attracted to secret conversations, forbidden knowledge."
  },
  cancer: {
    ko: "무조건적으로 사랑받고 싶은 갈망이 있어요.",
    en: "Longing to be loved unconditionally."
  },
  leo: {
    ko: "특별한 존재로 숭배받고 싶은 욕구가 있어요.",
    en: "Desire to be worshipped as special."
  },
  virgo: {
    ko: "완벽한 관계에 대한 집착이 있어요.",
    en: "Obsession with perfect relationships."
  },
  libra: {
    ko: "관계 속에서 자아를 잃을까 두려워해요.",
    en: "Fear of losing yourself in relationships."
  },
  scorpio: {
    ko: "연인에 대한 깊은 통제 욕구가 숨어 있어요.",
    en: "Hidden desire for deep control over partners."
  },
  sagittarius: {
    ko: "책임 없이 자유롭게 사랑하고 싶은 마음이 있어요.",
    en: "Want to love freely without responsibility."
  },
  capricorn: {
    ko: "지위 있는 사람에게 끌리는 경향이 있어요.",
    en: "Tendency to be attracted to people of status."
  },
  aquarius: {
    ko: "색다르고 독특한 관계를 갈망해요.",
    en: "Crave unique and unconventional relationships."
  },
  pisces: {
    ko: "비현실적인 이상적 사랑을 꿈꿔요.",
    en: "Dream of unrealistic ideal love."
  },
};
