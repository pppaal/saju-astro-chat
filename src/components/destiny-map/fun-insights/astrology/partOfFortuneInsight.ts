import { createHouseInsight } from './utils';
import { fortuneHouseMessages } from './data';
import type { AstroData } from '../types';

export function getPartOfFortuneInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string; house: number } | null {
  const pof = astro?.extraPoints?.partOfFortune;

  return createHouseInsight(
    pof?.house,
    fortuneHouseMessages,
    "행운의 포인트",
    "Fortune Point",
    lang
  );
}
