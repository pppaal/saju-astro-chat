import { junoSignTraits, asteroidMessages } from './data';
import {
  getAsteroidSignInterpretation,
  getAsteroidThemeKo,
  type AsteroidName,
} from '@/lib/astrology/asteroidInterpretations';
import type { ZodiacName } from '@/lib/astrology/interpretations';
import type { AstroData } from '../types';
import { eulReul } from '@/lib/i18n/koParticle';

// Capitalize first letter so the lowercase signs we pick up from the
// chart data ('leo') match the ZodiacName lookup table ('Leo'). Returns
// null when the input isn't one of the 12 western signs.
function toZodiacName(raw: unknown): ZodiacName | null {
  if (typeof raw !== 'string' || raw.length === 0) return null
  const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  const valid: ZodiacName[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ]
  return (valid as string[]).includes(normalized) ? (normalized as ZodiacName) : null
}

export function getAsteroidsInsight(astro: AstroData | undefined, lang: string): { title: string; insights: { name: string; message: string }[]; emoji: string } | null {
  const isKo = lang === "ko";
  const asteroids = astro?.asteroids;
  if (!asteroids || typeof asteroids !== 'object') {return null;}

  const insights: { name: string; message: string }[] = [];

  // Juno (결혼·파트너십) — keep the original short trait line so the
  // copy stays warm; supplement with the rich-DB sentence underneath.
  if (asteroids.juno?.sign) {
    const sign = asteroids.juno.sign.toLowerCase();
    const trait = junoSignTraits[sign] || { ko: "특별한 자질", en: "special qualities" };
    const zodiac = toZodiacName(asteroids.juno.sign)
    const richJuno = zodiac
      ? getAsteroidSignInterpretation('Juno', zodiac, isKo ? 'ko' : 'en')
      : null
    const lead = isKo
      ? `${sign} 자리에서 파트너에게 ${trait.ko}${eulReul(trait.ko)} 원해요.`
      : `In ${sign}, you seek ${trait.en} in partners.`
    insights.push({
      name: isKo ? "주노 (이상적 파트너)" : "Juno (Ideal Partner)",
      message: richJuno ? `${lead} ${richJuno}.` : lead,
    });
  }

  // Ceres / Pallas / Vesta — the previous version only printed a one-line
  // archetype summary from data.ts ("Ceres: 돌봄·양육"). Now we look the
  // chart's sign placement up in the canonical interpretation DB
  // (asteroidInterpretations.ts, 96 fragments × 4 asteroids) so each
  // entry reads like "Ceres in Leo — 자부심·창조·드라마틱한 표현으로 돌봄".
  (['ceres', 'pallas', 'vesta'] as const).forEach(name => {
    const placement = asteroids[name]
    if (!placement?.sign) return
    const zodiac = toZodiacName(placement.sign)
    const msg = asteroidMessages[name]
    const asteroidName = (name.charAt(0).toUpperCase() + name.slice(1)) as AsteroidName
    const rich = zodiac
      ? getAsteroidSignInterpretation(asteroidName, zodiac, isKo ? 'ko' : 'en')
      : null
    const themeLead = isKo
      ? `${getAsteroidThemeKo(asteroidName)} — `
      : ''
    insights.push({
      name: isKo ? (msg?.nameKo ?? asteroidName) : (msg?.nameEn ?? asteroidName),
      message: rich
        ? `${themeLead}${zodiac} 자리: ${rich}.`
        : (isKo ? (msg?.ko ?? '') : (msg?.en ?? '')),
    });
  });

  if (insights.length === 0) {return null;}

  return {
    title: isKo ? "소행성이 보여주는 특성" : "Asteroid Characteristics",
    insights: insights.slice(0, 4),
    emoji: "☄️"
  };
}
