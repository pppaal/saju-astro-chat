import { findPlanetSign } from '../utils';

export function getPartOfFortuneInsight(astro: any, lang: string): { title: string; message: string; emoji: string; house: number } | null {
  const isKo = lang === "ko";
  const pof = astro?.extraPoints?.partOfFortune;
  if (!pof?.house) return null;

  const house = pof.house;
  const houseMessages: Record<number, { ko: string; en: string; emoji: string }> = {
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

  const msg = houseMessages[house];
  if (!msg) return null;

  return {
    title: isKo ? "행운의 포인트" : "Fortune Point",
    message: isKo ? msg.ko : msg.en,
    emoji: msg.emoji,
    house
  };
}
