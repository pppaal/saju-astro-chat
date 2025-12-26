import { selectLang } from './utils';
import type { AstroData } from '../types';

const titles = { ko: "영혼의 목적", en: "Soul Purpose" };

export function getDraconicInsight(astro: AstroData | undefined, lang: string): { title: string; message: string; emoji: string } | null {
  const isKo = lang === "ko";
  const draconic = astro?.draconic?.comparison;
  if (!draconic) return null;

  let message = "";
  if (typeof draconic === 'string') {
    message = draconic;
  } else if (typeof draconic === 'object' && draconic !== null) {
    if (typeof draconic.summary === 'string') {
      message = draconic.summary;
    } else if (typeof draconic.soulPurpose === 'string') {
      message = draconic.soulPurpose;
    } else if (typeof draconic.soulIdentity === 'string') {
      message = draconic.soulIdentity;
    } else if (typeof draconic.soulNeeds === 'string') {
      message = draconic.soulNeeds;
    } else {
      const parts: string[] = [];
      if (draconic.soulPurpose && typeof draconic.soulPurpose === 'string') parts.push(draconic.soulPurpose);
      if (draconic.soulIdentity && typeof draconic.soulIdentity === 'string') parts.push(draconic.soulIdentity);
      if (draconic.soulNeeds && typeof draconic.soulNeeds === 'string') parts.push(draconic.soulNeeds);
      if (parts.length > 0) {
        message = parts.join(' ');
      }
    }
  }

  if (!message) return null;

  return {
    title: selectLang(isKo, titles),
    message,
    emoji: "🌟"
  };
}
