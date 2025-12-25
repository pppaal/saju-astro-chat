export function getLuckyItems(saju: any, lang: string): { item: string; reason: string }[] {
  if (!saju?.fiveElements) return [];
  const isKo = lang === "ko";

  const sorted = Object.entries(saju.fiveElements).sort(([,a], [,b]) => (a as number) - (b as number));
  const weakest = sorted[0]?.[0];

  const items: Record<string, { ko: string[]; en: string[] }> = {
    wood: {
      ko: ["🕯️ 캔들/조명", "화 기운 활성화", "❤️ 빨간색 아이템", "열정 에너지", "☀️ 남쪽 방향", "화 기운 방위"],
      en: ["🕯️ Candles", "Fire activation", "❤️ Red items", "Passion energy", "☀️ South direction", "Fire direction"]
    },
    fire: {
      ko: ["🕯️ 캔들/조명", "화 기운 활성화", "❤️ 빨간색 아이템", "열정 에너지", "☀️ 남쪽 방향", "화 기운 방위"],
      en: ["🕯️ Candles", "Fire activation", "❤️ Red items", "Passion energy", "☀️ South direction", "Fire direction"]
    },
    earth: {
      ko: ["🏺 도자기/세라믹", "토 기운 안정", "🟤 베이지/갈색", "신뢰 에너지", "🏔️ 중앙 위치", "토 기운 중심"],
      en: ["🏺 Ceramics", "Earth stability", "🟤 Beige/brown", "Trust energy", "🏔️ Center position", "Earth center"]
    },
    metal: {
      ko: ["⌚ 메탈 악세서리", "금 기운 결단력", "🤍 흰색/은색", "정화 에너지", "🌅 서쪽 방향", "금 기운 방위"],
      en: ["⌚ Metal accessories", "Decisiveness", "🤍 White/silver", "Purifying", "🌅 West direction", "Metal direction"]
    },
    water: {
      ko: ["💧 수족관/분수", "수 기운 지혜", "💙 파란색/검정", "유연함 에너지", "🌊 북쪽 방향", "수 기운 방위"],
      en: ["💧 Aquarium/fountain", "Wisdom", "💙 Blue/black", "Flexibility", "🌊 North direction", "Water direction"]
    },
  };

  const itemList = items[weakest]?.[isKo ? "ko" : "en"] || [];
  const result: { item: string; reason: string }[] = [];

  for (let i = 0; i < itemList.length; i += 2) {
    if (itemList[i] && itemList[i + 1]) {
      result.push({ item: itemList[i], reason: itemList[i + 1] });
    }
  }

  return result;
}
