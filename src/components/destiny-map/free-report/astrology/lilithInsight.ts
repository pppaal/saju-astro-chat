import { createSignInsight } from './utils';
import { lilithMessages } from './data';
import type { AstroData } from '../types';

export function getLilithInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string } | null {
  const lilith = astro?.extraPoints?.lilith;

  return createSignInsight(
    lilith?.sign,
    lilithMessages,
    "숨겨진 욕망 (Lilith)",
    "Hidden Desires (Lilith)",
    "🌒",
    lang
  );
}
