export type TarotCard = {
  name: string;
  nameKo: string;
  icon: string;
  number: string;
  suit?: string;
  image: string;
};

export type ServiceLink = {
  key: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
};

export type ServiceKey =
  | "destinyMap"
  | "aiReports"
  | "lifePrediction"
  | "tarot"
  | "calendar"
  | "dream"
  | "personality"
  | "icp"
  | "numerology"
  | "astrology"
  | "saju"
  | "compatibility"
  | "pastLife"
  | "iching";

export const TAROT_CARD_BACK = "/images/tarot-main/back.png";

export const TAROT_DECK: TarotCard[] = [
  // Major Arcana (0-21)
  { name: "THE FOOL", nameKo: "바보", icon: "★", number: "0", image: "/images/tarot-main/major-00-fool.png" },
  { name: "THE MAGICIAN", nameKo: "마법사", icon: "★", number: "I", image: "/images/tarot-main/major-01-magician.png" },
  { name: "THE HIGH PRIESTESS", nameKo: "여사제", icon: "★", number: "II", image: "/images/tarot-main/major-02-high-priestess.png" },
  { name: "THE EMPRESS", nameKo: "여황제", icon: "★", number: "III", image: "/images/tarot-main/major-03-empress.png" },
  { name: "THE EMPEROR", nameKo: "황제", icon: "★", number: "IV", image: "/images/tarot-main/major-04-emperor.png" },
  { name: "THE HIEROPHANT", nameKo: "교황", icon: "★", number: "V", image: "/images/tarot-main/major-05-hierophant.png" },
  { name: "THE LOVERS", nameKo: "연인", icon: "★", number: "VI", image: "/images/tarot-main/major-06-lovers.png" },
  { name: "THE CHARIOT", nameKo: "전차", icon: "★", number: "VII", image: "/images/tarot-main/major-07-chariot.png" },
  { name: "STRENGTH", nameKo: "힘", icon: "★", number: "VIII", image: "/images/tarot-main/major-08-strength.png" },
  { name: "THE HERMIT", nameKo: "은둔자", icon: "★", number: "IX", image: "/images/tarot-main/major-09-hermit.png" },
  { name: "WHEEL OF FORTUNE", nameKo: "운명의 수레바퀴", icon: "★", number: "X", image: "/images/tarot-main/major-10-wheel.png" },
  { name: "JUSTICE", nameKo: "정의", icon: "★", number: "XI", image: "/images/tarot-main/major-11-justice.png" },
  { name: "THE HANGED MAN", nameKo: "매달린 사람", icon: "★", number: "XII", image: "/images/tarot-main/major-12-hanged.png" },
  { name: "DEATH", nameKo: "죽음", icon: "★", number: "XIII", image: "/images/tarot-main/major-13-death.png" },
  { name: "TEMPERANCE", nameKo: "절제", icon: "★", number: "XIV", image: "/images/tarot-main/major-14-temperance.png" },
  { name: "THE DEVIL", nameKo: "악마", icon: "★", number: "XV", image: "/images/tarot-main/major-15-devil.png" },
  { name: "THE TOWER", nameKo: "탑", icon: "★", number: "XVI", image: "/images/tarot-main/major-16-tower.png" },
  { name: "THE STAR", nameKo: "별", icon: "★", number: "XVII", image: "/images/tarot-main/major-17-star.png" },
  { name: "THE MOON", nameKo: "달", icon: "★", number: "XVIII", image: "/images/tarot-main/major-18-moon.png" },
  { name: "THE SUN", nameKo: "태양", icon: "★", number: "XIX", image: "/images/tarot-main/major-19-sun.png" },
  { name: "JUDGEMENT", nameKo: "심판", icon: "★", number: "XX", image: "/images/tarot-main/major-20-judgement.png" },
  { name: "THE WORLD", nameKo: "세계", icon: "★", number: "XXI", image: "/images/tarot-main/major-21-world.png" },

  // Wands (22-35)
  { name: "ACE OF WANDS", nameKo: "완드 에이스", icon: "⚡", number: "A", suit: "WANDS", image: "/images/tarot-main/wands-01.png" },
  { name: "TWO OF WANDS", nameKo: "완드 2", icon: "⚡", number: "II", suit: "WANDS", image: "/images/tarot-main/wands-02.png" },
  { name: "THREE OF WANDS", nameKo: "완드 3", icon: "⚡", number: "III", suit: "WANDS", image: "/images/tarot-main/wands-03.png" },
  { name: "FOUR OF WANDS", nameKo: "완드 4", icon: "⚡", number: "IV", suit: "WANDS", image: "/images/tarot-main/wands-04.png" },
  { name: "FIVE OF WANDS", nameKo: "완드 5", icon: "⚡", number: "V", suit: "WANDS", image: "/images/tarot-main/wands-05.png" },
  { name: "SIX OF WANDS", nameKo: "완드 6", icon: "⚡", number: "VI", suit: "WANDS", image: "/images/tarot-main/wands-06.png" },
  { name: "SEVEN OF WANDS", nameKo: "완드 7", icon: "⚡", number: "VII", suit: "WANDS", image: "/images/tarot-main/wands-07.png" },
  { name: "EIGHT OF WANDS", nameKo: "완드 8", icon: "⚡", number: "VIII", suit: "WANDS", image: "/images/tarot-main/wands-08.png" },
  { name: "NINE OF WANDS", nameKo: "완드 9", icon: "⚡", number: "IX", suit: "WANDS", image: "/images/tarot-main/wands-09.png" },
  { name: "TEN OF WANDS", nameKo: "완드 10", icon: "⚡", number: "X", suit: "WANDS", image: "/images/tarot-main/wands-10.png" },
  { name: "PAGE OF WANDS", nameKo: "완드 시종", icon: "⚡", number: "P", suit: "WANDS", image: "/images/tarot-main/wands-11-page.png" },
  { name: "KNIGHT OF WANDS", nameKo: "완드 기사", icon: "⚡", number: "Kn", suit: "WANDS", image: "/images/tarot-main/wands-12-knight.png" },
  { name: "QUEEN OF WANDS", nameKo: "완드 여왕", icon: "⚡", number: "Q", suit: "WANDS", image: "/images/tarot-main/wands-13-queen.png" },
  { name: "KING OF WANDS", nameKo: "완드 왕", icon: "⚡", number: "K", suit: "WANDS", image: "/images/tarot-main/wands-14-king.png" },

  // Cups (36-49)
  { name: "ACE OF CUPS", nameKo: "컵 에이스", icon: "☾", number: "A", suit: "CUPS", image: "/images/tarot-main/cups-01.png" },
  { name: "TWO OF CUPS", nameKo: "컵 2", icon: "☾", number: "II", suit: "CUPS", image: "/images/tarot-main/cups-02.png" },
  { name: "THREE OF CUPS", nameKo: "컵 3", icon: "☾", number: "III", suit: "CUPS", image: "/images/tarot-main/cups-03.png" },
  { name: "FOUR OF CUPS", nameKo: "컵 4", icon: "☾", number: "IV", suit: "CUPS", image: "/images/tarot-main/cups-04.png" },
  { name: "FIVE OF CUPS", nameKo: "컵 5", icon: "☾", number: "V", suit: "CUPS", image: "/images/tarot-main/cups-05.png" },
  { name: "SIX OF CUPS", nameKo: "컵 6", icon: "☾", number: "VI", suit: "CUPS", image: "/images/tarot-main/cups-06.png" },
  { name: "SEVEN OF CUPS", nameKo: "컵 7", icon: "☾", number: "VII", suit: "CUPS", image: "/images/tarot-main/cups-07.png" },
  { name: "EIGHT OF CUPS", nameKo: "컵 8", icon: "☾", number: "VIII", suit: "CUPS", image: "/images/tarot-main/cups-08.png" },
  { name: "NINE OF CUPS", nameKo: "컵 9", icon: "☾", number: "IX", suit: "CUPS", image: "/images/tarot-main/cups-09.png" },
  { name: "TEN OF CUPS", nameKo: "컵 10", icon: "☾", number: "X", suit: "CUPS", image: "/images/tarot-main/cups-10.png" },
  { name: "PAGE OF CUPS", nameKo: "컵 시종", icon: "☾", number: "P", suit: "CUPS", image: "/images/tarot-main/cups-11-page.png" },
  { name: "KNIGHT OF CUPS", nameKo: "컵 기사", icon: "☾", number: "Kn", suit: "CUPS", image: "/images/tarot-main/cups-12-knight.png" },
  { name: "QUEEN OF CUPS", nameKo: "컵 여왕", icon: "☾", number: "Q", suit: "CUPS", image: "/images/tarot-main/cups-13-queen.png" },
  { name: "KING OF CUPS", nameKo: "컵 왕", icon: "☾", number: "K", suit: "CUPS", image: "/images/tarot-main/cups-14-king.png" },

  // Swords (50-63)
  { name: "ACE OF SWORDS", nameKo: "검 에이스", icon: "⚔", number: "A", suit: "SWORDS", image: "/images/tarot-main/swords-01.png" },
  { name: "TWO OF SWORDS", nameKo: "검 2", icon: "⚔", number: "II", suit: "SWORDS", image: "/images/tarot-main/swords-02.png" },
  { name: "THREE OF SWORDS", nameKo: "검 3", icon: "⚔", number: "III", suit: "SWORDS", image: "/images/tarot-main/swords-03.png" },
  { name: "FOUR OF SWORDS", nameKo: "검 4", icon: "⚔", number: "IV", suit: "SWORDS", image: "/images/tarot-main/swords-04.png" },
  { name: "FIVE OF SWORDS", nameKo: "검 5", icon: "⚔", number: "V", suit: "SWORDS", image: "/images/tarot-main/swords-05.png" },
  { name: "SIX OF SWORDS", nameKo: "검 6", icon: "⚔", number: "VI", suit: "SWORDS", image: "/images/tarot-main/swords-06.png" },
  { name: "SEVEN OF SWORDS", nameKo: "검 7", icon: "⚔", number: "VII", suit: "SWORDS", image: "/images/tarot-main/swords-07.png" },
  { name: "EIGHT OF SWORDS", nameKo: "검 8", icon: "⚔", number: "VIII", suit: "SWORDS", image: "/images/tarot-main/swords-08.png" },
  { name: "NINE OF SWORDS", nameKo: "검 9", icon: "⚔", number: "IX", suit: "SWORDS", image: "/images/tarot-main/swords-09.png" },
  { name: "TEN OF SWORDS", nameKo: "검 10", icon: "⚔", number: "X", suit: "SWORDS", image: "/images/tarot-main/swords-10.png" },
  { name: "PAGE OF SWORDS", nameKo: "검 시종", icon: "⚔", number: "P", suit: "SWORDS", image: "/images/tarot-main/swords-11-page.png" },
  { name: "KNIGHT OF SWORDS", nameKo: "검 기사", icon: "⚔", number: "Kn", suit: "SWORDS", image: "/images/tarot-main/swords-12-knight.png" },
  { name: "QUEEN OF SWORDS", nameKo: "검 여왕", icon: "⚔", number: "Q", suit: "SWORDS", image: "/images/tarot-main/swords-13-queen.png" },
  { name: "KING OF SWORDS", nameKo: "검 왕", icon: "⚔", number: "K", suit: "SWORDS", image: "/images/tarot-main/swords-14-king.png" },

  // Pentacles (64-77)
  { name: "ACE OF PENTACLES", nameKo: "펜타클 에이스", icon: "⛤", number: "A", suit: "PENTACLES", image: "/images/tarot-main/pentacles-01.png" },
  { name: "TWO OF PENTACLES", nameKo: "펜타클 2", icon: "⛤", number: "II", suit: "PENTACLES", image: "/images/tarot-main/pentacles-02.png" },
  { name: "THREE OF PENTACLES", nameKo: "펜타클 3", icon: "⛤", number: "III", suit: "PENTACLES", image: "/images/tarot-main/pentacles-03.png" },
  { name: "FOUR OF PENTACLES", nameKo: "펜타클 4", icon: "⛤", number: "IV", suit: "PENTACLES", image: "/images/tarot-main/pentacles-04.png" },
  { name: "FIVE OF PENTACLES", nameKo: "펜타클 5", icon: "⛤", number: "V", suit: "PENTACLES", image: "/images/tarot-main/pentacles-05.png" },
  { name: "SIX OF PENTACLES", nameKo: "펜타클 6", icon: "⛤", number: "VI", suit: "PENTACLES", image: "/images/tarot-main/pentacles-06.png" },
  { name: "SEVEN OF PENTACLES", nameKo: "펜타클 7", icon: "⛤", number: "VII", suit: "PENTACLES", image: "/images/tarot-main/pentacles-07.png" },
  { name: "EIGHT OF PENTACLES", nameKo: "펜타클 8", icon: "⛤", number: "VIII", suit: "PENTACLES", image: "/images/tarot-main/pentacles-08.png" },
  { name: "NINE OF PENTACLES", nameKo: "펜타클 9", icon: "⛤", number: "IX", suit: "PENTACLES", image: "/images/tarot-main/pentacles-09.png" },
  { name: "TEN OF PENTACLES", nameKo: "펜타클 10", icon: "⛤", number: "X", suit: "PENTACLES", image: "/images/tarot-main/pentacles-10.png" },
  { name: "PAGE OF PENTACLES", nameKo: "펜타클 시종", icon: "⛤", number: "P", suit: "PENTACLES", image: "/images/tarot-main/pentacles-11-page.png" },
  { name: "KNIGHT OF PENTACLES", nameKo: "펜타클 기사", icon: "⛤", number: "Kn", suit: "PENTACLES", image: "/images/tarot-main/pentacles-12-knight.png" },
  { name: "QUEEN OF PENTACLES", nameKo: "펜타클 여왕", icon: "⛤", number: "Q", suit: "PENTACLES", image: "/images/tarot-main/pentacles-13-queen.png" },
  { name: "KING OF PENTACLES", nameKo: "펜타클 왕", icon: "⛤", number: "K", suit: "PENTACLES", image: "/images/tarot-main/pentacles-14-king.png" },
];

export const SERVICE_LINKS: ServiceLink[] = [
  { key: "destinyMap", href: "/destiny-map", icon: "🗺️" },
  { key: "aiReports", href: "/premium-reports", icon: "🤖" },
  { key: "lifePrediction", href: "/life-prediction", icon: "📈" },
  { key: "tarot", href: "/tarot", icon: "🔮" },
  { key: "calendar", href: "/calendar", icon: "🗓️" },
  { key: "dream", href: "/dream", icon: "🌙" },
  { key: "personality", href: "/personality", icon: "🌈" },
  { key: "icp", href: "/icp", icon: "🎭" },
  { key: "numerology", href: "/numerology", icon: "🔢" },
  { key: "astrology", href: "/astrology", icon: "✨" },
  { key: "saju", href: "/saju", icon: "☯️" },
  { key: "compatibility", href: "/compatibility", icon: "💕" },
  { key: "pastLife", href: "/past-life", icon: "🔄" },
  { key: "iching", href: "/iching", icon: "📜" },
  { key: "destinyMatch", href: "/destiny-match", icon: "💘" },
];
