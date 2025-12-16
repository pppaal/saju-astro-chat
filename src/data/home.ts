export type TarotCard = {
  name: string;
  icon: string;
  number: string;
  suit?: string;
};

export type ServiceLink = {
  key: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
};

const MAJOR_ICON = "★";
const WANDS_ICON = "⚡";
const CUPS_ICON = "☾";
const SWORDS_ICON = "⚔";
const PENTACLES_ICON = "⛤";

export const TAROT_DECK: TarotCard[] = [
  // Major Arcana
  { name: "THE FOOL", icon: MAJOR_ICON, number: "0" },
  { name: "THE MAGICIAN", icon: MAJOR_ICON, number: "I" },
  { name: "THE HIGH PRIESTESS", icon: MAJOR_ICON, number: "II" },
  { name: "THE EMPRESS", icon: MAJOR_ICON, number: "III" },
  { name: "THE EMPEROR", icon: MAJOR_ICON, number: "IV" },
  { name: "THE HIEROPHANT", icon: MAJOR_ICON, number: "V" },
  { name: "THE LOVERS", icon: MAJOR_ICON, number: "VI" },
  { name: "THE CHARIOT", icon: MAJOR_ICON, number: "VII" },
  { name: "STRENGTH", icon: MAJOR_ICON, number: "VIII" },
  { name: "THE HERMIT", icon: MAJOR_ICON, number: "IX" },
  { name: "WHEEL OF FORTUNE", icon: MAJOR_ICON, number: "X" },
  { name: "JUSTICE", icon: MAJOR_ICON, number: "XI" },
  { name: "THE HANGED MAN", icon: MAJOR_ICON, number: "XII" },
  { name: "DEATH", icon: MAJOR_ICON, number: "XIII" },
  { name: "TEMPERANCE", icon: MAJOR_ICON, number: "XIV" },
  { name: "THE DEVIL", icon: MAJOR_ICON, number: "XV" },
  { name: "THE TOWER", icon: MAJOR_ICON, number: "XVI" },
  { name: "THE STAR", icon: MAJOR_ICON, number: "XVII" },
  { name: "THE MOON", icon: MAJOR_ICON, number: "XVIII" },
  { name: "THE SUN", icon: MAJOR_ICON, number: "XIX" },
  { name: "JUDGEMENT", icon: MAJOR_ICON, number: "XX" },
  { name: "THE WORLD", icon: MAJOR_ICON, number: "XXI" },

  // Wands
  { name: "ACE OF WANDS", icon: WANDS_ICON, number: "A", suit: "WANDS" },
  { name: "TWO OF WANDS", icon: WANDS_ICON, number: "II", suit: "WANDS" },
  { name: "THREE OF WANDS", icon: WANDS_ICON, number: "III", suit: "WANDS" },
  { name: "FOUR OF WANDS", icon: WANDS_ICON, number: "IV", suit: "WANDS" },
  { name: "FIVE OF WANDS", icon: WANDS_ICON, number: "V", suit: "WANDS" },
  { name: "SIX OF WANDS", icon: WANDS_ICON, number: "VI", suit: "WANDS" },
  { name: "SEVEN OF WANDS", icon: WANDS_ICON, number: "VII", suit: "WANDS" },
  { name: "EIGHT OF WANDS", icon: WANDS_ICON, number: "VIII", suit: "WANDS" },
  { name: "NINE OF WANDS", icon: WANDS_ICON, number: "IX", suit: "WANDS" },
  { name: "TEN OF WANDS", icon: WANDS_ICON, number: "X", suit: "WANDS" },
  { name: "PAGE OF WANDS", icon: WANDS_ICON, number: "P", suit: "WANDS" },
  { name: "KNIGHT OF WANDS", icon: WANDS_ICON, number: "Kn", suit: "WANDS" },
  { name: "QUEEN OF WANDS", icon: WANDS_ICON, number: "Q", suit: "WANDS" },
  { name: "KING OF WANDS", icon: WANDS_ICON, number: "K", suit: "WANDS" },

  // Cups
  { name: "ACE OF CUPS", icon: CUPS_ICON, number: "A", suit: "CUPS" },
  { name: "TWO OF CUPS", icon: CUPS_ICON, number: "II", suit: "CUPS" },
  { name: "THREE OF CUPS", icon: CUPS_ICON, number: "III", suit: "CUPS" },
  { name: "FOUR OF CUPS", icon: CUPS_ICON, number: "IV", suit: "CUPS" },
  { name: "FIVE OF CUPS", icon: CUPS_ICON, number: "V", suit: "CUPS" },
  { name: "SIX OF CUPS", icon: CUPS_ICON, number: "VI", suit: "CUPS" },
  { name: "SEVEN OF CUPS", icon: CUPS_ICON, number: "VII", suit: "CUPS" },
  { name: "EIGHT OF CUPS", icon: CUPS_ICON, number: "VIII", suit: "CUPS" },
  { name: "NINE OF CUPS", icon: CUPS_ICON, number: "IX", suit: "CUPS" },
  { name: "TEN OF CUPS", icon: CUPS_ICON, number: "X", suit: "CUPS" },
  { name: "PAGE OF CUPS", icon: CUPS_ICON, number: "P", suit: "CUPS" },
  { name: "KNIGHT OF CUPS", icon: CUPS_ICON, number: "Kn", suit: "CUPS" },
  { name: "QUEEN OF CUPS", icon: CUPS_ICON, number: "Q", suit: "CUPS" },
  { name: "KING OF CUPS", icon: CUPS_ICON, number: "K", suit: "CUPS" },

  // Swords
  { name: "ACE OF SWORDS", icon: SWORDS_ICON, number: "A", suit: "SWORDS" },
  { name: "TWO OF SWORDS", icon: SWORDS_ICON, number: "II", suit: "SWORDS" },
  { name: "THREE OF SWORDS", icon: SWORDS_ICON, number: "III", suit: "SWORDS" },
  { name: "FOUR OF SWORDS", icon: SWORDS_ICON, number: "IV", suit: "SWORDS" },
  { name: "FIVE OF SWORDS", icon: SWORDS_ICON, number: "V", suit: "SWORDS" },
  { name: "SIX OF SWORDS", icon: SWORDS_ICON, number: "VI", suit: "SWORDS" },
  { name: "SEVEN OF SWORDS", icon: SWORDS_ICON, number: "VII", suit: "SWORDS" },
  { name: "EIGHT OF SWORDS", icon: SWORDS_ICON, number: "VIII", suit: "SWORDS" },
  { name: "NINE OF SWORDS", icon: SWORDS_ICON, number: "IX", suit: "SWORDS" },
  { name: "TEN OF SWORDS", icon: SWORDS_ICON, number: "X", suit: "SWORDS" },
  { name: "PAGE OF SWORDS", icon: SWORDS_ICON, number: "P", suit: "SWORDS" },
  { name: "KNIGHT OF SWORDS", icon: SWORDS_ICON, number: "Kn", suit: "SWORDS" },
  { name: "QUEEN OF SWORDS", icon: SWORDS_ICON, number: "Q", suit: "SWORDS" },
  { name: "KING OF SWORDS", icon: SWORDS_ICON, number: "K", suit: "SWORDS" },

  // Pentacles
  { name: "ACE OF PENTACLES", icon: PENTACLES_ICON, number: "A", suit: "PENTACLES" },
  { name: "TWO OF PENTACLES", icon: PENTACLES_ICON, number: "II", suit: "PENTACLES" },
  { name: "THREE OF PENTACLES", icon: PENTACLES_ICON, number: "III", suit: "PENTACLES" },
  { name: "FOUR OF PENTACLES", icon: PENTACLES_ICON, number: "IV", suit: "PENTACLES" },
  { name: "FIVE OF PENTACLES", icon: PENTACLES_ICON, number: "V", suit: "PENTACLES" },
  { name: "SIX OF PENTACLES", icon: PENTACLES_ICON, number: "VI", suit: "PENTACLES" },
  { name: "SEVEN OF PENTACLES", icon: PENTACLES_ICON, number: "VII", suit: "PENTACLES" },
  { name: "EIGHT OF PENTACLES", icon: PENTACLES_ICON, number: "VIII", suit: "PENTACLES" },
  { name: "NINE OF PENTACLES", icon: PENTACLES_ICON, number: "IX", suit: "PENTACLES" },
  { name: "TEN OF PENTACLES", icon: PENTACLES_ICON, number: "X", suit: "PENTACLES" },
  { name: "PAGE OF PENTACLES", icon: PENTACLES_ICON, number: "P", suit: "PENTACLES" },
  { name: "KNIGHT OF PENTACLES", icon: PENTACLES_ICON, number: "Kn", suit: "PENTACLES" },
  { name: "QUEEN OF PENTACLES", icon: PENTACLES_ICON, number: "Q", suit: "PENTACLES" },
  { name: "KING OF PENTACLES", icon: PENTACLES_ICON, number: "K", suit: "PENTACLES" },
];

export const SERVICE_LINKS: ServiceLink[] = [
  { key: "destinyMap", href: "/destiny-map", icon: "🗺️" },
  { key: "calendar", href: "/calendar", icon: "🗓️" },
  { key: "astrology", href: "/astrology", icon: "✨" },
  { key: "saju", href: "/saju", icon: "☯️" },
  { key: "tarot", href: "/tarot", icon: "🔮" },
  { key: "iching", href: "/iching", icon: "📜" },
  { key: "dream", href: "/dream", icon: "🌙" },
  { key: "numerology", href: "/numerology", icon: "🔢" },
  { key: "compatibility", href: "/compatibility", icon: "❤️" },
  { key: "personality", href: "/personality", icon: "🌈" },
  { key: "destinyMatch", href: "/destiny-match", icon: "💫", comingSoon: true },
  { key: "pastLife", href: "/past-life", icon: "🔄", comingSoon: true },
];
