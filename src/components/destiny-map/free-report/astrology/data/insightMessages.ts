// Centralized astrology insight messages
// Consolidates repeated sign/house message mappings

import type { BilingualText } from '../../data/dayMasterTraits';

// Chiron messages by sign
export const chironMessages: Record<string, { ko: string; en: string; emoji: string }> = {
  aries: {
    ko: "자신감을 되찾는 것이 치유의 열쇠예요. '나도 할 수 있어'라고 말해보세요.",
    en: "Regaining confidence is key to healing. Try saying 'I can do this'.",
    emoji: "💪"
  },
  taurus: {
    ko: "물질적 안정에 대한 불안을 내려놓으세요. 당신은 이미 충분해요.",
    en: "Let go of material security anxiety. You're already enough.",
    emoji: "🌱"
  },
  gemini: {
    ko: "말로 상처받았다면, 말로 치유할 수 있어요. 진솔한 대화를 시도하세요.",
    en: "If words hurt you, words can heal. Try honest conversation.",
    emoji: "💬"
  },
  cancer: {
    ko: "가족 관계의 상처를 인정하는 것부터 시작하세요. 울어도 괜찮아요.",
    en: "Start by acknowledging family wounds. It's okay to cry.",
    emoji: "🏠"
  },
  leo: {
    ko: "인정받지 못한 아픔이 있나요? 스스로를 먼저 인정해주세요.",
    en: "Feeling unrecognized? Acknowledge yourself first.",
    emoji: "👑"
  },
  virgo: {
    ko: "완벽하지 않아도 괜찮아요. 작은 실수는 당신의 가치를 떨어뜨리지 않아요.",
    en: "Imperfection is okay. Small mistakes don't diminish your worth.",
    emoji: "🌸"
  },
  libra: {
    ko: "관계에서 당신만 희생하지 마세요. '나도 중요해'라고 말할 권리가 있어요.",
    en: "Don't sacrifice only yourself in relationships. You matter too.",
    emoji: "⚖️"
  },
  scorpio: {
    ko: "과거의 배신을 용서하세요. 그 무게에서 자유로워질 자격이 있어요.",
    en: "Forgive past betrayals. You deserve freedom from that weight.",
    emoji: "🦋"
  },
  sagittarius: {
    ko: "신념이 흔들린 적 있나요? 새로운 의미를 찾는 여정을 시작하세요.",
    en: "Faith shaken? Begin the journey to find new meaning.",
    emoji: "🏹"
  },
  capricorn: {
    ko: "성공에 대한 강박을 내려놓으세요. 쉬어도 당신의 가치는 변하지 않아요.",
    en: "Let go of success obsession. Resting doesn't change your value.",
    emoji: "🏔️"
  },
  aquarius: {
    ko: "외로움을 인정하세요. 특별하다는 건 혼자라는 뜻이 아니에요.",
    en: "Acknowledge loneliness. Being special doesn't mean being alone.",
    emoji: "🌌"
  },
  pisces: {
    ko: "경계를 세워도 괜찮아요. 모든 사람을 구원할 필요는 없어요.",
    en: "Setting boundaries is okay. You don't need to save everyone.",
    emoji: "🌊"
  }
};

// Lilith messages by sign
export const lilithMessages: Record<string, BilingualText> = {
  aries: {
    ko: "독립과 자유에 대한 강한 욕구가 있어요. '나답게 살고 싶다'는 마음을 억누르지 마세요.",
    en: "Strong desire for independence and freedom. Don't suppress your wish to 'live as myself'."
  },
  taurus: {
    ko: "관능적 즐거움과 물질적 풍요에 대한 깊은 갈망이 있어요. 죄책감 없이 누려도 괜찮아요.",
    en: "Deep longing for sensual pleasure and material abundance. It's okay to enjoy without guilt."
  },
  gemini: {
    ko: "금기된 지식, 비밀스러운 것에 매력을 느껴요. 호기심을 억압하지 마세요.",
    en: "Attracted to forbidden knowledge and secrets. Don't suppress your curiosity."
  },
  cancer: {
    ko: "깊은 정서적 연결과 무조건적 사랑에 대한 갈망이 있어요. 의존을 두려워하지 마세요.",
    en: "Longing for deep emotional connection and unconditional love. Don't fear dependency."
  },
  leo: {
    ko: "주목받고 특별해지고 싶은 욕구가 강해요. 그 욕구는 나쁜 게 아니에요.",
    en: "Strong desire to be noticed and special. That desire isn't bad."
  },
  virgo: {
    ko: "완벽함에 대한 집착이 있어요. 때로는 불완전함이 더 아름다울 수 있어요.",
    en: "Obsession with perfection. Sometimes imperfection can be more beautiful."
  },
  libra: {
    ko: "관계 속에서 자아를 잃는 두려움이 있어요. 혼자여도 괜찮다는 걸 기억하세요.",
    en: "Fear of losing yourself in relationships. Remember it's okay to be alone."
  },
  scorpio: {
    ko: "권력과 통제에 대한 은밀한 욕구가 있어요. 이 에너지를 긍정적으로 쓸 수 있어요.",
    en: "Hidden desire for power and control. You can use this energy positively."
  },
  sagittarius: {
    ko: "속박 없는 자유, 제한 없는 탐험을 갈망해요. 책임을 버리고 떠나고 싶은 마음.",
    en: "Craving freedom without constraints, exploration without limits. The wish to leave responsibilities behind."
  },
  capricorn: {
    ko: "성공과 인정에 대한 강렬한 야망이 있어요. 그 야망을 인정하세요.",
    en: "Intense ambition for success and recognition. Acknowledge that ambition."
  },
  aquarius: {
    ko: "세상의 틀을 깨고 싶은 반항심이 있어요. 그 혁명적 에너지를 받아들이세요.",
    en: "Rebellious spirit wanting to break the world's mold. Embrace that revolutionary energy."
  },
  pisces: {
    ko: "현실에서 도피하고 싶은 욕구가 있어요. 때로는 꿈꾸는 것도 필요해요.",
    en: "Desire to escape reality. Sometimes dreaming is necessary too."
  }
};

// Vertex messages by house
export const vertexHouseMessages: Record<number, { ko: string; en: string; emoji: string }> = {
  1: {
    ko: "나 자신을 찾는 과정에서 운명적 만남이 옵니다. 진정한 나를 보여주세요.",
    en: "Fated encounters come as you discover yourself. Show your true self.",
    emoji: "💫"
  },
  2: {
    ko: "돈이나 재능 관련 일을 할 때 중요한 사람을 만나요. 가치를 함께 만드는 사람.",
    en: "Important people appear through money or talent matters. Build value together.",
    emoji: "💎"
  },
  3: {
    ko: "동네, 학교, 일상에서 운명적 만남이 있어요. 가까운 곳을 주목하세요.",
    en: "Fated encounters happen nearby - neighborhood, school, daily life. Look close.",
    emoji: "📚"
  },
  4: {
    ko: "집이나 가족을 통해, 또는 고향에서 중요한 인연을 만나요. 뿌리를 돌아보세요.",
    en: "Important connections come through home, family, or hometown. Return to roots.",
    emoji: "🏠"
  },
  5: {
    ko: "연애, 취미, 창작 활동에서 운명적 만남이! 즐거운 일을 할 때 나타납니다.",
    en: "Fated encounters in romance, hobbies, creativity. They appear when you have fun.",
    emoji: "💕"
  },
  6: {
    ko: "직장, 봉사, 일상 업무 중에 중요한 사람을 만나요. 성실하게 일하세요.",
    en: "Important people appear at work or through service. Be diligent.",
    emoji: "🔧"
  },
  7: {
    ko: "파트너, 비즈니스 관계에서 운명적 만남이 옵니다. 1:1 관계가 중요해요.",
    en: "Fated encounters through partnerships and business. One-on-one matters.",
    emoji: "💑"
  },
  8: {
    ko: "위기, 변화, 깊은 유대를 통해 중요한 사람을 만나요. 진지한 순간에 나타납니다.",
    en: "Important people appear through crisis, change, deep bonds. In serious moments.",
    emoji: "🌙"
  },
  9: {
    ko: "여행, 유학, 철학 공부할 때 운명적 만남이! 멀리서 찾아옵니다.",
    en: "Fated encounters through travel, study abroad, philosophy. They come from afar.",
    emoji: "🌍"
  },
  10: {
    ko: "커리어, 공적 활동에서 중요한 인연을 만나요. 당신의 일이 사람을 부릅니다.",
    en: "Important people appear through career and public life. Your work attracts them.",
    emoji: "👔"
  },
  11: {
    ko: "친구, 모임, 온라인 커뮤니티에서 운명적 만남이 있어요. 그룹 활동 중에 나타납니다.",
    en: "Fated encounters in friend groups, communities, online. Appear in group settings.",
    emoji: "👥"
  },
  12: {
    ko: "조용한 곳, 병원, 영적 공간에서 중요한 사람을 만나요. 혼자 있을 때 찾아옵니다.",
    en: "Important people in quiet places, hospitals, spiritual spaces. When you're alone.",
    emoji: "🕊️"
  }
};

// Harmonic talents mapping
export const harmonicTalents: Record<number, { ko: string; en: string }> = {
  4: { ko: "구조를 만드는 재능 (조직, 시스템)", en: "Building structures (organization, systems)" },
  5: { ko: "창의적 표현 재능 (예술, 혁신)", en: "Creative expression (art, innovation)" },
  7: { ko: "영적 통찰 재능 (직관, 치유)", en: "Spiritual insight (intuition, healing)" },
  9: { ko: "완성과 마무리 재능 (완벽, 통합)", en: "Completion & perfection (mastery, integration)" }
};

// Juno sign traits for partnership
export const junoSignTraits: Record<string, { ko: string; en: string }> = {
  aries: { ko: "열정과 주도성", en: "passion and initiative" },
  taurus: { ko: "안정과 충실함", en: "stability and loyalty" },
  gemini: { ko: "지적 교감", en: "intellectual connection" },
  cancer: { ko: "정서적 유대", en: "emotional bond" },
  leo: { ko: "인정과 칭찬", en: "recognition and praise" },
  virgo: { ko: "실용성과 헌신", en: "practicality and devotion" },
  libra: { ko: "조화와 균형", en: "harmony and balance" },
  scorpio: { ko: "깊은 유대", en: "deep bond" },
  sagittarius: { ko: "자유와 모험", en: "freedom and adventure" },
  capricorn: { ko: "신뢰와 안정", en: "trust and stability" },
  aquarius: { ko: "독창성과 우정", en: "originality and friendship" },
  pisces: { ko: "영적 연결", en: "spiritual connection" }
};

// Asteroid messages
export const asteroidMessages: Record<string, { nameKo: string; nameEn: string; ko: string; en: string }> = {
  ceres: {
    nameKo: "세레스 (돌봄 방식)",
    nameEn: "Ceres (Nurturing Style)",
    ko: "타인을 돌보고 양육하는 특별한 능력이 있어요. 이 에너지로 주변을 따뜻하게 만들어요.",
    en: "You have a special ability to care for and nurture others. This energy warms your surroundings."
  },
  pallas: {
    nameKo: "팔라스 (지혜)",
    nameEn: "Pallas (Wisdom)",
    ko: "패턴을 보고 전략을 세우는 능력이 뛰어나요. 복잡한 문제를 창의적으로 해결해요.",
    en: "Excellent at seeing patterns and forming strategies. You solve complex problems creatively."
  },
  vesta: {
    nameKo: "베스타 (헌신)",
    nameEn: "Vesta (Devotion)",
    ko: "중요한 일에 깊이 몰입하는 능력이 있어요. 한 가지에 집중하면 놀라운 성과를 내요.",
    en: "Ability to deeply immerse in important matters. When focused, you achieve amazing results."
  }
};

// Part of Fortune messages by house
export const fortuneHouseMessages: Record<number, { ko: string; en: string; emoji: string }> = {
  1: {
    ko: "자기 자신을 표현할 때 행운이 찾아와요. 당당하게 나를 드러내세요!",
    en: "Fortune comes when you express yourself. Be bold and show who you are!",
    emoji: "✨"
  },
  2: {
    ko: "돈 버는 일, 내 재능을 활용할 때 행운이 옵니다. 가진 것을 잘 활용하세요.",
    en: "Fortune comes through earning and using your talents. Use what you have!",
    emoji: "💰"
  },
  3: {
    ko: "소통하고, 배우고, 가까운 사람들과 어울릴 때 행운이 따라요.",
    en: "Fortune comes through communication, learning, and close connections.",
    emoji: "💬"
  },
  4: {
    ko: "집과 가족, 내면의 안정을 찾을 때 행운이 깃듭니다. 집을 아늑하게 만드세요.",
    en: "Fortune comes through home, family, and inner peace. Make your home cozy.",
    emoji: "🏡"
  },
  5: {
    ko: "창작하고, 놀고, 사랑할 때 행운이 옵니다. 즐거움을 추구하세요!",
    en: "Fortune comes through creativity, play, and romance. Pursue joy!",
    emoji: "🎨"
  },
  6: {
    ko: "일하고, 건강 챙기고, 남을 도울 때 행운이 따라요. 성실함이 복을 부릅니다.",
    en: "Fortune comes through work, health, and helping others. Diligence brings luck.",
    emoji: "🌱"
  },
  7: {
    ko: "파트너십, 협력, 관계 맺기에서 행운이 옵니다. 좋은 사람과 함께하세요.",
    en: "Fortune comes through partnerships and relationships. Team up with good people.",
    emoji: "🤝"
  },
  8: {
    ko: "변화, 깊은 유대, 타인의 자원을 활용할 때 행운이 옵니다. 깊이 들어가세요.",
    en: "Fortune comes through transformation and shared resources. Go deep.",
    emoji: "🔮"
  },
  9: {
    ko: "여행, 공부, 새로운 세계를 탐험할 때 행운이 따라요. 멀리 나가보세요!",
    en: "Fortune comes through travel, study, and exploring new worlds. Go far!",
    emoji: "✈️"
  },
  10: {
    ko: "커리어, 사회적 성공, 목표 달성할 때 행운이 옵니다. 정상을 향해 가세요.",
    en: "Fortune comes through career and social success. Aim for the top!",
    emoji: "🏆"
  },
  11: {
    ko: "친구, 커뮤니티, 미래 계획에서 행운이 옵니다. 같은 꿈을 가진 사람들과 함께하세요.",
    en: "Fortune comes through friends, community, and future plans. Find your tribe!",
    emoji: "🌟"
  },
  12: {
    ko: "혼자만의 시간, 영적 탐구, 봉사할 때 행운이 찾아와요. 내면을 들여다보세요.",
    en: "Fortune comes through solitude, spirituality, and service. Look within.",
    emoji: "🙏"
  }
};
