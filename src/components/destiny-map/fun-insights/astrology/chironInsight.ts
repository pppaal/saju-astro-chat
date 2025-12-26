import { createSignInsight } from './utils';
import { chironMessages } from './data';
import type { AstroData } from '../types';

export function getChironInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string } | null {
  const chiron = astro?.extraPoints?.chiron;

  return createSignInsight(
    chiron?.sign,
    chironMessages,
    "치유 포인트 (Chiron)",
    "Healing Point (Chiron)",
    "💫",
    lang
  );
}
