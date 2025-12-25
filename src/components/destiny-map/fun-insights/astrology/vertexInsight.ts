import { findPlanetSign } from '../utils';

export function getVertexInsight(astro: any, lang: string): { title: string; message: string; emoji: string; house: number } | null {
  const isKo = lang === "ko";
  const vertex = astro?.extraPoints?.vertex;
  if (!vertex?.house) return null;

  const house = vertex.house;
  const houseMessages: Record<number, { ko: string; en: string; emoji: string }> = {
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

  const msg = houseMessages[house];
  if (!msg) return null;

  return {
    title: isKo ? "운명적 만남 포인트" : "Fated Encounter Point",
    message: isKo ? msg.ko : msg.en,
    emoji: msg.emoji,
    house
  };
}
