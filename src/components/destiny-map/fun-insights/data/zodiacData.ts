import { zodiacPersonalityTraits } from './zodiacTraits';

// Base zodiac data - trait is derived from zodiacPersonalityTraits to avoid duplication
export interface ZodiacInfo {
  ko: string;
  en: string;
  emoji: string;
  element: string;
  trait: { ko: string; en: string };
}

const zodiacBaseData: Record<string, Omit<ZodiacInfo, 'trait'>> = {
  aries: { ko: "양자리", en: "Aries", emoji: "♈", element: "fire" },
  taurus: { ko: "황소자리", en: "Taurus", emoji: "♉", element: "earth" },
  gemini: { ko: "쌍둥이자리", en: "Gemini", emoji: "♊", element: "air" },
  cancer: { ko: "게자리", en: "Cancer", emoji: "♋", element: "water" },
  leo: { ko: "사자자리", en: "Leo", emoji: "♌", element: "fire" },
  virgo: { ko: "처녀자리", en: "Virgo", emoji: "♍", element: "earth" },
  libra: { ko: "천칭자리", en: "Libra", emoji: "♎", element: "air" },
  scorpio: { ko: "전갈자리", en: "Scorpio", emoji: "♏", element: "water" },
  sagittarius: { ko: "궁수자리", en: "Sagittarius", emoji: "♐", element: "fire" },
  capricorn: { ko: "염소자리", en: "Capricorn", emoji: "♑", element: "earth" },
  aquarius: { ko: "물병자리", en: "Aquarius", emoji: "♒", element: "air" },
  pisces: { ko: "물고기자리", en: "Pisces", emoji: "♓", element: "water" },
};

// Combine base data with traits from zodiacPersonalityTraits
export const zodiacData: Record<string, ZodiacInfo> = Object.fromEntries(
  Object.entries(zodiacBaseData).map(([key, base]) => [
    key,
    { ...base, trait: zodiacPersonalityTraits[key]?.trait || { ko: "", en: "" } }
  ])
) as Record<string, ZodiacInfo>;
