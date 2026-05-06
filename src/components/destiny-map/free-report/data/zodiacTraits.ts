// Centralized zodiac traits data
// Consolidates repeated zodiac mappings across analyzers

import type { BilingualText } from './dayMasterTraits';

// Zodiac career traits
export const zodiacCareerTraits: Record<string, {
  style: BilingualText;
  strength: BilingualText;
}> = {
  aries: {
    style: { ko: "선두에서 이끄는 일", en: "Leading from the front" },
    strength: { ko: "추진력, 도전정신", en: "Drive, challenge spirit" }
  },
  taurus: {
    style: { ko: "꾸준히 쌓아가는 일", en: "Steadily building up" },
    strength: { ko: "인내심, 감각", en: "Patience, sensibility" }
  },
  gemini: {
    style: { ko: "다양한 일을 동시에", en: "Multiple tasks simultaneously" },
    strength: { ko: "커뮤니케이션, 적응력", en: "Communication, adaptability" }
  },
  cancer: {
    style: { ko: "돌보고 보호하는 일", en: "Caring and protecting" },
    strength: { ko: "직관, 배려", en: "Intuition, consideration" }
  },
  leo: {
    style: { ko: "주목받는 무대 위의 일", en: "Work on the spotlit stage" },
    strength: { ko: "카리스마, 창의력", en: "Charisma, creativity" }
  },
  virgo: {
    style: { ko: "디테일을 다루는 일", en: "Handling details" },
    strength: { ko: "분석력, 완벽주의", en: "Analysis, perfectionism" }
  },
  libra: {
    style: { ko: "조율하고 균형 잡는 일", en: "Coordinating and balancing" },
    strength: { ko: "외교력, 심미안", en: "Diplomacy, aesthetics" }
  },
  scorpio: {
    style: { ko: "깊이 파고드는 일", en: "Digging deep" },
    strength: { ko: "집중력, 통찰력", en: "Focus, insight" }
  },
  sagittarius: {
    style: { ko: "넓은 세상을 탐험하는 일", en: "Exploring the wide world" },
    strength: { ko: "비전, 낙관주의", en: "Vision, optimism" }
  },
  capricorn: {
    style: { ko: "장기적으로 성취하는 일", en: "Long-term achievement" },
    strength: { ko: "책임감, 전략", en: "Responsibility, strategy" }
  },
  aquarius: {
    style: { ko: "혁신하고 변화시키는 일", en: "Innovating and changing" },
    strength: { ko: "독창성, 인도주의", en: "Originality, humanitarianism" }
  },
  pisces: {
    style: { ko: "상상력으로 창조하는 일", en: "Creating with imagination" },
    strength: { ko: "공감력, 예술성", en: "Empathy, artistry" }
  },
};

// Zodiac love traits
export const zodiacLoveTraits: Record<string, {
  style: BilingualText;
  attract: BilingualText;
}> = {
  aries: {
    style: { ko: "직진형 연애, 마음에 들면 바로 고백", en: "Direct approach, confess right away when interested" },
    attract: { ko: "자신감 있고 도전적인 사람", en: "Confident, challenging people" }
  },
  taurus: {
    style: { ko: "천천히 깊어지는 연애, 한번 시작하면 오래감", en: "Slowly deepening love, lasts long once started" },
    attract: { ko: "안정적이고 감각적인 사람", en: "Stable, sensual people" }
  },
  gemini: {
    style: { ko: "재미있고 지적인 대화가 중요, 다양한 경험 추구", en: "Fun intellectual conversation matters, seeking varied experiences" },
    attract: { ko: "위트 있고 다재다능한 사람", en: "Witty, versatile people" }
  },
  cancer: {
    style: { ko: "보호하고 싶고 보호받고 싶은 연애", en: "Want to protect and be protected" },
    attract: { ko: "다정하고 가정적인 사람", en: "Warm, family-oriented people" }
  },
  leo: {
    style: { ko: "드라마틱하고 로맨틱한 연애, 인정받고 싶어함", en: "Dramatic, romantic love, wanting recognition" },
    attract: { ko: "당신을 특별하게 대해주는 사람", en: "People who treat you specially" }
  },
  virgo: {
    style: { ko: "섬세하게 챙기는 연애, 디테일에 신경씀", en: "Careful, detail-oriented love" },
    attract: { ko: "정돈되고 진지한 사람", en: "Organized, serious people" }
  },
  libra: {
    style: { ko: "조화롭고 아름다운 관계 추구", en: "Pursuing harmonious, beautiful relationships" },
    attract: { ko: "세련되고 균형 잡힌 사람", en: "Refined, balanced people" }
  },
  scorpio: {
    style: { ko: "깊고 강렬한 연애, 올인하거나 아예 안하거나", en: "Deep, intense love, all in or nothing" },
    attract: { ko: "미스터리하고 깊이 있는 사람", en: "Mysterious, deep people" }
  },
  sagittarius: {
    style: { ko: "자유롭고 모험적인 연애", en: "Free, adventurous love" },
    attract: { ko: "함께 세상을 탐험할 사람", en: "People to explore the world with" }
  },
  capricorn: {
    style: { ko: "진지하고 미래지향적인 연애", en: "Serious, future-oriented love" },
    attract: { ko: "야망 있고 책임감 있는 사람", en: "Ambitious, responsible people" }
  },
  aquarius: {
    style: { ko: "독특하고 자유로운 연애, 친구 같은 관계", en: "Unique, free love, friend-like relationship" },
    attract: { ko: "독창적이고 지적인 사람", en: "Original, intellectual people" }
  },
  pisces: {
    style: { ko: "로맨틱하고 감성적인 연애, 영혼의 연결 추구", en: "Romantic, emotional love, seeking soul connection" },
    attract: { ko: "예술적이고 감성적인 사람", en: "Artistic, emotional people" }
  },
};

// Zodiac personality traits
export const zodiacPersonalityTraits: Record<string, {
  trait: BilingualText;
  strength: BilingualText;
}> = {
  aries: { trait: { ko: "도전적이고 직진하는", en: "Challenging and direct" }, strength: { ko: "용기", en: "Courage" } },
  taurus: { trait: { ko: "안정적이고 감각적인", en: "Stable and sensual" }, strength: { ko: "인내심", en: "Patience" } },
  gemini: { trait: { ko: "다재다능하고 호기심 많은", en: "Versatile and curious" }, strength: { ko: "커뮤니케이션", en: "Communication" } },
  cancer: { trait: { ko: "보호적이고 감성적인", en: "Protective and emotional" }, strength: { ko: "직관", en: "Intuition" } },
  leo: { trait: { ko: "당당하고 창의적인", en: "Dignified and creative" }, strength: { ko: "자신감", en: "Confidence" } },
  virgo: { trait: { ko: "분석적이고 완벽주의인", en: "Analytical and perfectionist" }, strength: { ko: "분석력", en: "Analysis" } },
  libra: { trait: { ko: "조화롭고 외교적인", en: "Harmonious and diplomatic" }, strength: { ko: "균형감각", en: "Balance" } },
  scorpio: { trait: { ko: "강렬하고 통찰력 있는", en: "Intense and insightful" }, strength: { ko: "집중력", en: "Focus" } },
  sagittarius: { trait: { ko: "자유롭고 낙관적인", en: "Free and optimistic" }, strength: { ko: "비전", en: "Vision" } },
  capricorn: { trait: { ko: "야망 있고 책임감 있는", en: "Ambitious and responsible" }, strength: { ko: "끈기", en: "Perseverance" } },
  aquarius: { trait: { ko: "독창적이고 인도주의적인", en: "Original and humanitarian" }, strength: { ko: "혁신", en: "Innovation" } },
  pisces: { trait: { ko: "상상력 풍부하고 공감하는", en: "Imaginative and empathetic" }, strength: { ko: "공감력", en: "Empathy" } },
};
