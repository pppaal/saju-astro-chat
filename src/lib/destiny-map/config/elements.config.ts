/**
 * 오행(五行) 관련 설정
 * 영어 키 버전 - 다국어 인터페이스용
 */

// Re-export from centralized locations
export { STEM_TO_ELEMENT_EN as STEM_TO_ELEMENT } from '@/lib/Saju/stemElementMapping';
export { STEM_NAMES as STEMS, BRANCH_NAMES as BRANCHES } from '@/lib/Saju/constants';

// Re-export 한글 키 버전 (constants.ts에 정의된 것)
export {
  YUKHAP as YUKHAP_KO,
  CHUNG as CHUNG_KO,
  SAMHAP as SAMHAP_KO,
  XING as XING_KO,
  HAI as HAI_KO,
  PA as PA_KO,
} from '@/lib/Saju/constants';

// 오행 관계 (상생/상극) - 영어 키
export const ELEMENT_RELATIONS: Record<string, { generates: string; controls: string; generatedBy: string; controlledBy: string }> = {
  wood: { generates: "fire", controls: "earth", generatedBy: "water", controlledBy: "metal" },
  fire: { generates: "earth", controls: "metal", generatedBy: "wood", controlledBy: "water" },
  earth: { generates: "metal", controls: "water", generatedBy: "fire", controlledBy: "wood" },
  metal: { generates: "water", controls: "wood", generatedBy: "earth", controlledBy: "fire" },
  water: { generates: "wood", controls: "fire", generatedBy: "metal", controlledBy: "earth" },
};

// 지지 → 영어 오행
export const BRANCH_TO_ELEMENT: Record<string, string> = {
  "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
  "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
  "申": "metal", "酉": "metal", "戌": "earth", "亥": "water",
};

// 삼합 (三合) - 영어 키 버전
export const SAMHAP: Record<string, string[]> = {
  water: ["申", "子", "辰"], // 수국
  wood: ["亥", "卯", "未"],  // 목국
  fire: ["寅", "午", "戌"],  // 화국
  metal: ["巳", "酉", "丑"], // 금국
};

// 육합/충/형/해 - 지지 간 관계는 동일하므로 constants.ts 재사용
export { YUKHAP, CHUNG, XING, HAI } from '@/lib/Saju/constants';

// 점성술 원소 → 사주 원소 변환
export const ZODIAC_TO_ELEMENT: Record<string, string> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "metal", libra: "metal", aquarius: "metal",
  cancer: "water", scorpio: "water", pisces: "water",
};

// 한국어 원소명 → 영어
export const ELEMENT_KO_TO_EN: Record<string, string> = {
  "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
};
