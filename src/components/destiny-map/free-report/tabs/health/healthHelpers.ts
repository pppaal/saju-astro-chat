import type { EnergyLevel } from './types';

export function getElementColor(element: string): string {
  const colors: Record<string, string> = { '목': 'bg-green-500', '화': 'bg-red-500', '토': 'bg-yellow-500', '금': 'bg-gray-400', '수': 'bg-blue-500' };
  return colors[element] || 'bg-gray-500';
}

export function getElementEmoji(element: string): string {
  const emojis: Record<string, string> = { '목': '🌳', '화': '🔥', '토': '🏔️', '금': '⚔️', '수': '💧' };
  return emojis[element] || '⚡';
}

export function getStatusColor(status: 'excess' | 'balanced' | 'deficient'): string {
  const colors = { excess: 'text-orange-400', balanced: 'text-green-400', deficient: 'text-blue-400' };
  return colors[status];
}

export function getStatusText(status: 'excess' | 'balanced' | 'deficient', isKo: boolean): string {
  if (status === 'excess') {return isKo ? '과다' : 'Excess';}
  if (status === 'balanced') {return isKo ? '균형' : 'Balanced';}
  return isKo ? '부족' : 'Deficient';
}

export function getVitalityColor(score: number): string {
  if (score >= 80) {return 'from-green-500 to-emerald-400';}
  if (score >= 60) {return 'from-yellow-500 to-amber-400';}
  if (score >= 40) {return 'from-orange-500 to-amber-500';}
  return 'from-red-500 to-rose-400';
}

export function getEnergyLevel(
  energyStrength: Record<string, unknown> | undefined,
  isKo: boolean
): EnergyLevel | null {
  if (!energyStrength) {return null;}
  const levelVal = energyStrength.level || energyStrength.type || "";
  const level = String(levelVal).toLowerCase();

  if (level.includes("강") || level.includes("strong") || level.includes("extreme")) {
    return {
      level: isKo ? "신강" : "Strong Energy",
      emoji: "🔥",
      desc: isKo ? "에너지가 넘치는 타입이에요. 활동적으로 에너지를 발산해야 건강해요." : "You're an energetic type. Stay healthy by being active.",
      advice: isKo ? "가만히 있으면 오히려 몸이 무거워져요. 운동으로 발산하세요." : "Staying still makes your body heavy. Release through exercise."
    };
  } else if (level.includes("약") || level.includes("weak")) {
    return {
      level: isKo ? "신약" : "Gentle Energy",
      emoji: "🌙",
      desc: isKo ? "섬세하고 예민한 타입이에요. 충분한 휴식과 보양이 필요해요." : "You're delicate and sensitive. You need rest and nourishment.",
      advice: isKo ? "무리하지 마세요. 쉬는 것도 능력이에요." : "Don't overdo it. Resting is also an ability."
    };
  }
  return {
    level: isKo ? "중화" : "Balanced Energy",
    emoji: "⚖️",
    desc: isKo ? "균형 잡힌 에너지를 가졌어요. 안정적인 리듬이 건강의 핵심이에요." : "You have balanced energy. Stable rhythm is key to health.",
    advice: isKo ? "급격한 변화보다 꾸준한 관리가 좋아요." : "Steady management is better than drastic changes."
  };
}
