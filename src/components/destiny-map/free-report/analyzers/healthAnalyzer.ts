import { elementTraits } from '../data';
import type { SajuData } from '../types';

export function getHealthAnalysis(saju: SajuData | undefined, lang: string): { organ: string; status: string; advice: string; emoji: string }[] {
  const isKo = lang === "ko";
  const fiveElements = saju?.fiveElements;
  if (!fiveElements) {return [];}

  const result: { organ: string; status: string; advice: string; emoji: string }[] = [];

  const elementHealth: Record<string, { organ: string; organEn: string; emoji: string; weakness: string; weaknessEn: string }> = {
    wood: { organ: "간/담/눈", organEn: "Liver/Eyes", emoji: "👁️", weakness: "녹색 채소, 눈 휴식 권장", weaknessEn: "Green vegetables, eye rest" },
    fire: { organ: "심장/혈관", organEn: "Heart/Blood", emoji: "❤️", weakness: "스트레스 관리, 적절한 운동", weaknessEn: "Stress management, moderate exercise" },
    earth: { organ: "위장/비장", organEn: "Stomach/Spleen", emoji: "🫁", weakness: "규칙적 식사, 과식 주의", weaknessEn: "Regular meals, avoid overeating" },
    metal: { organ: "폐/피부", organEn: "Lungs/Skin", emoji: "🫁", weakness: "호흡기 관리, 공기 질 주의", weaknessEn: "Respiratory care, air quality" },
    water: { organ: "신장/뼈", organEn: "Kidneys/Bones", emoji: "💧", weakness: "수분 섭취, 보온 필수", weaknessEn: "Hydration, keep warm" },
  };

  const sorted = Object.entries(fiveElements).sort(([,a], [,b]) => (a as number) - (b as number));

  // 가장 약한 오행 2개
  for (let i = 0; i < Math.min(2, sorted.length); i++) {
    const [element, value] = sorted[i];
    const health = elementHealth[element];
    if (health && (value as number) <= 15) {
      result.push({
        organ: isKo ? health.organ : health.organEn,
        status: isKo ? `${elementTraits[element]?.ko} 부족 (${value}%)` : `${elementTraits[element]?.en} weak (${value}%)`,
        advice: isKo ? health.weakness : health.weaknessEn,
        emoji: health.emoji
      });
    }
  }

  return result;
}
