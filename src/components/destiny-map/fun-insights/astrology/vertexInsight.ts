import { createHouseInsight } from './utils';
import { vertexHouseMessages } from './data';
import type { AstroData } from '../types';

export function getVertexInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string; house: number } | null {
  const vertex = astro?.extraPoints?.vertex;

  return createHouseInsight(
    vertex?.house,
    vertexHouseMessages,
    "운명적 만남 포인트",
    "Fated Encounter Point",
    lang
  );
}
