import { junoSignTraits, asteroidMessages } from './data';
import type { AstroData } from '../types';

export function getAsteroidsInsight(astro: AstroData | undefined, lang: string): { title: string; insights: { name: string; message: string }[]; emoji: string } | null {
  const isKo = lang === "ko";
  const asteroids = astro?.asteroids;
  if (!asteroids || typeof asteroids !== 'object') return null;

  const insights: { name: string; message: string }[] = [];

  // Juno (결혼, 파트너십)
  if (asteroids.juno?.sign) {
    const sign = asteroids.juno.sign.toLowerCase();
    const trait = junoSignTraits[sign] || { ko: "특별한 자질", en: "special qualities" };
    insights.push({
      name: isKo ? "주노 (이상적 파트너)" : "Juno (Ideal Partner)",
      message: isKo
        ? `${sign} 자리에서 파트너에게 ${trait.ko}을 원해요.`
        : `In ${sign}, you seek ${trait.en} in partners.`
    });
  }

  // Ceres, Pallas, Vesta
  (['ceres', 'pallas', 'vesta'] as const).forEach(name => {
    if (asteroids[name]?.sign) {
      const msg = asteroidMessages[name];
      if (msg) {
        insights.push({
          name: isKo ? msg.nameKo : msg.nameEn,
          message: isKo ? msg.ko : msg.en
        });
      }
    }
  });

  if (insights.length === 0) return null;

  return {
    title: isKo ? "소행성이 보여주는 특성" : "Asteroid Characteristics",
    insights: insights.slice(0, 4),
    emoji: "☄️"
  };
}
