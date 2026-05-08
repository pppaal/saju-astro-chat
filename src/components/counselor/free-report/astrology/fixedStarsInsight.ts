import { selectLang } from './utils';
import type { AstroData, FixedStarData } from '../types';

const titles = { ko: "항성의 축복", en: "Fixed Star Blessings" };
const defaultMessage = {
  ko: "강력한 항성들이 당신의 차트와 결합되어 있어요. 이것은 특별한 재능이나 운명적 사건을 의미할 수 있어요.",
  en: "Powerful fixed stars are conjunct in your chart. This may indicate special talents or fated events."
};

interface ExtendedFixedStarData extends FixedStarData {
  star?: string;
  name_ko?: string;
}

export function getFixedStarsInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; stars: string[]; emoji: string } | null {
  const isKo = lang === "ko";
  const fixedStars = astro?.fixedStars;
  if (!Array.isArray(fixedStars) || fixedStars.length === 0) {return null;}

  const closeStars = fixedStars.filter((s): s is ExtendedFixedStarData => s != null && typeof s === 'object' && typeof s.orb === 'number' && s.orb < 1).slice(0, 3);
  if (closeStars.length === 0) {return null;}

  const starNames = closeStars
    .map((s: ExtendedFixedStarData) => {
      if (typeof s === 'string') {return s;}
      if (typeof s.star === 'string') {return s.star;}
      if (typeof s.name === 'string') {return s.name;}
      if (isKo && typeof s.name_ko === 'string') {return s.name_ko;}
      return null;
    })
    .filter((name): name is string => typeof name === 'string' && name.length > 0);

  if (starNames.length === 0) {return null;}

  return {
    title: selectLang(isKo, titles),
    message: selectLang(isKo, defaultMessage),
    stars: starNames,
    emoji: "⭐"
  };
}
