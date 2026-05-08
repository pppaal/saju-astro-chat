// Re-export from centralized location for backwards compatibility
export { ELEMENT_EN_TO_KO as elementKeyMapReverse } from '@/lib/Saju/constants';

export const elementKeyMap: Record<string, string> = {
  "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
};

// Chinese to Korean heavenly stem conversion
// Includes romanization support
export const tianGanMap: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
  "Gab": "갑", "Eul": "을", "Byung": "병", "Jung": "정", "Mu": "무",
  "Gi": "기", "Gyung": "경", "Shin": "신", "Im": "임", "Gye": "계",
};

export const elementRelations = {
  generates: { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" } as Record<string, string>,
  controls: { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" } as Record<string, string>,
  supportedBy: { wood: "water", fire: "wood", earth: "fire", metal: "earth", water: "metal" } as Record<string, string>,
};

export const astroToSaju: Record<string, string> = { fire: "fire", earth: "earth", air: "metal", water: "water" };

export const monthElements: Record<number, string> = {
  1: "water", 2: "wood", 3: "wood", 4: "earth", 5: "fire", 6: "fire",
  7: "earth", 8: "metal", 9: "metal", 10: "earth", 11: "water", 12: "water"
};
