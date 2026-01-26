// Shared utilities for astrology insight functions

/**
 * Helper to select language-specific text
 */
export function selectLang<T>(isKo: boolean, obj: { ko: T; en: T }): T {
  return isKo ? obj.ko : obj.en;
}

/**
 * Create a simple sign-based insight
 */
export function createSignInsight(
  sign: string | undefined,
  messages: Record<string, { ko: string; en: string; emoji?: string }>,
  titleKo: string,
  titleEn: string,
  defaultEmoji: string,
  lang: string
): { title: string; message: string; emoji: string } | null {
  if (!sign) {return null;}

  const isKo = lang === "ko";
  const signLower = sign.toLowerCase();
  const msg = messages[signLower];

  if (!msg) {return null;}

  return {
    title: isKo ? titleKo : titleEn,
    message: isKo ? msg.ko : msg.en,
    emoji: msg.emoji || defaultEmoji
  };
}

/**
 * Create a house-based insight
 */
export function createHouseInsight(
  house: number | undefined,
  messages: Record<number, { ko: string; en: string; emoji: string }>,
  titleKo: string,
  titleEn: string,
  lang: string
): { title: string; message: string; emoji: string; house: number } | null {
  if (!house) {return null;}

  const isKo = lang === "ko";
  const msg = messages[house];

  if (!msg) {return null;}

  return {
    title: isKo ? titleKo : titleEn,
    message: isKo ? msg.ko : msg.en,
    emoji: msg.emoji,
    house
  };
}
