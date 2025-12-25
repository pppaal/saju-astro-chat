import { elementTraits } from '../data';

export function getYongsinAnalysis(saju: any, lang: string): { title: string; element: string; why: string; how: string; emoji: string } | null {
  const isKo = lang === "ko";
  const fiveElements = saju?.fiveElements;
  if (!fiveElements) return null;

  // 가장 약한 오행 찾기 (용신 간이 계산)
  const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (a as number) - (b as number));
  const weakest = sorted[0];
  if (!weakest || typeof weakest[1] !== "number") return null;

  const element = weakest[0];
  const elementInfo = elementTraits[element];
  if (!elementInfo) return null;

  const howToBoost: Record<string, { ko: string; en: string }> = {
    wood: {
      ko: "🌿 녹색 옷, 식물 키우기, 아침 산책, 독서",
      en: "🌿 Green clothes, plants, morning walks, reading"
    },
    fire: {
      ko: "🔥 붉은색 소품, 햇빛 쬐기, 운동, 사람 만나기",
      en: "🔥 Red items, sunlight, exercise, socializing"
    },
    earth: {
      ko: "🏔️ 황토색 소품, 도자기, 규칙적 식사, 등산",
      en: "🏔️ Brown items, pottery, regular meals, hiking"
    },
    metal: {
      ko: "⚔️ 흰색·금색 소품, 정리정돈, 구조화, 명상",
      en: "⚔️ White/gold items, organizing, structure, meditation"
    },
    water: {
      ko: "💧 검은색·파란색, 물 마시기, 휴식, 조용한 시간",
      en: "💧 Black/blue items, hydration, rest, quiet time"
    }
  };

  return {
    title: isKo ? "용신 (필요한 에너지)" : "Yongsin (Needed Energy)",
    element: isKo ? `${elementInfo.ko} 기운` : `${elementInfo.en} energy`,
    why: isKo
      ? `현재 ${elementInfo.ko} 에너지가 ${weakest[1]}%로 부족해요. 이 기운을 보충하면 균형이 맞춰집니다.`
      : `Your ${elementInfo.en} energy is low at ${weakest[1]}%. Boosting this brings balance.`,
    how: isKo ? howToBoost[element].ko : howToBoost[element].en,
    emoji: elementInfo.emoji
  };
}
