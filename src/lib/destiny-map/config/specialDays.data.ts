/**
 * 특별한 날 관련 데이터/Lookup 테이블
 * (삼재, 역마, 도화, 건록, 귀인, 신살 등)
 */

// ============================================================
// 기본 상수 (elements.config.ts에서 re-export)
// ============================================================
// STEMS, BRANCHES, ELEMENT_RELATIONS는 elements.config.ts에서 정의됨

// specialDays.utils.ts에서 내부적으로 사용하는 로컬 상수
export const STEMS_LOCAL = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const BRANCHES_LOCAL = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// ============================================================
// 삼재 (三災) - 12년 주기로 3년간 불운
// ============================================================
export const SAMJAE_BY_YEAR_BRANCH: Record<string, string[]> = {
  // 寅午戌 띠 → 申酉戌 년에 삼재
  "寅": ["申", "酉", "戌"], "午": ["申", "酉", "戌"], "戌": ["申", "酉", "戌"],
  // 巳酉丑 띠 → 寅卯辰 년에 삼재
  "巳": ["寅", "卯", "辰"], "酉": ["寅", "卯", "辰"], "丑": ["寅", "卯", "辰"],
  // 申子辰 띠 → 巳午未 년에 삼재
  "申": ["巳", "午", "未"], "子": ["巳", "午", "未"], "辰": ["巳", "午", "未"],
  // 亥卯未 띠 → 亥子丑 년에 삼재
  "亥": ["亥", "子", "丑"], "卯": ["亥", "子", "丑"], "未": ["亥", "子", "丑"],
};

// ============================================================
// 역마살 (驛馬殺) - 이동/변화의 날
// ============================================================
export const YEOKMA_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "申", "午": "申", "戌": "申",
  "巳": "亥", "酉": "亥", "丑": "亥",
  "申": "寅", "子": "寅", "辰": "寅",
  "亥": "巳", "卯": "巳", "未": "巳",
};

// ============================================================
// 도화살 (桃花殺) - 연애/매력의 날
// ============================================================
export const DOHWA_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "卯", "午": "卯", "戌": "卯",
  "巳": "午", "酉": "午", "丑": "午",
  "申": "酉", "子": "酉", "辰": "酉",
  "亥": "子", "卯": "子", "未": "子",
};

// ============================================================
// 건록 (建祿) - 일간의 록지
// ============================================================
export const GEONROK_BY_DAY_STEM: Record<string, string> = {
  "甲": "寅", "乙": "卯", "丙": "巳", "丁": "午", "戊": "巳",
  "己": "午", "庚": "申", "辛": "酉", "壬": "亥", "癸": "子",
};

// ============================================================
// 십신 완전판 (十神)
// ============================================================
export const SIPSIN_RELATIONS: Record<string, Record<string, string>> = {
  "甲": { "甲": "비견", "乙": "겁재", "丙": "식신", "丁": "상관", "戊": "편재", "己": "정재", "庚": "편관", "辛": "정관", "壬": "편인", "癸": "정인" },
  "乙": { "乙": "비견", "甲": "겁재", "丁": "식신", "丙": "상관", "己": "편재", "戊": "정재", "辛": "편관", "庚": "정관", "癸": "편인", "壬": "정인" },
  "丙": { "丙": "비견", "丁": "겁재", "戊": "식신", "己": "상관", "庚": "편재", "辛": "정재", "壬": "편관", "癸": "정관", "甲": "편인", "乙": "정인" },
  "丁": { "丁": "비견", "丙": "겁재", "己": "식신", "戊": "상관", "辛": "편재", "庚": "정재", "癸": "편관", "壬": "정관", "乙": "편인", "甲": "정인" },
  "戊": { "戊": "비견", "己": "겁재", "庚": "식신", "辛": "상관", "壬": "편재", "癸": "정재", "甲": "편관", "乙": "정관", "丙": "편인", "丁": "정인" },
  "己": { "己": "비견", "戊": "겁재", "辛": "식신", "庚": "상관", "癸": "편재", "壬": "정재", "乙": "편관", "甲": "정관", "丁": "편인", "丙": "정인" },
  "庚": { "庚": "비견", "辛": "겁재", "壬": "식신", "癸": "상관", "甲": "편재", "乙": "정재", "丙": "편관", "丁": "정관", "戊": "편인", "己": "정인" },
  "辛": { "辛": "비견", "庚": "겁재", "癸": "식신", "壬": "상관", "乙": "편재", "甲": "정재", "丁": "편관", "丙": "정관", "己": "편인", "戊": "정인" },
  "壬": { "壬": "비견", "癸": "겁재", "甲": "식신", "乙": "상관", "丙": "편재", "丁": "정재", "戊": "편관", "己": "정관", "庚": "편인", "辛": "정인" },
  "癸": { "癸": "비견", "壬": "겁재", "乙": "식신", "甲": "상관", "丁": "편재", "丙": "정재", "己": "편관", "戊": "정관", "辛": "편인", "庚": "정인" },
};

// ============================================================
// 원진 (怨嗔) - 서로 원망하고 미워하는 관계
// ============================================================
export const WONJIN: Record<string, string> = {
  "子": "未", "丑": "午", "寅": "巳", "卯": "辰",
  "辰": "卯", "巳": "寅", "午": "丑", "未": "子",
  "申": "亥", "酉": "戌", "戌": "酉", "亥": "申",
};

// ============================================================
// 귀문관살 (鬼門關殺) - 귀신 문이 열리는 흉한 조합
// ============================================================
export const GWIMUN: Record<string, string> = {
  "子": "卯", "丑": "寅", "寅": "丑", "卯": "子",
  "辰": "亥", "巳": "戌", "午": "酉", "未": "申",
  "申": "未", "酉": "午", "戌": "巳", "亥": "辰",
};

// ============================================================
// 지장간 정기(正氣)
// ============================================================
export const BRANCH_MAIN_STEM: Record<string, string> = {
  "子": "癸", "丑": "己", "寅": "甲", "卯": "乙",
  "辰": "戊", "巳": "丙", "午": "丁", "未": "己",
  "申": "庚", "酉": "辛", "戌": "戊", "亥": "壬",
};

// 천간합 쌍
export const STEM_COMBO_PAIRS: [string, string][] = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]
];

// ============================================================
// 파 (破) - 파괴/깨짐의 관계
// ============================================================
export const PA: Record<string, string> = {
  "子": "酉", "丑": "辰", "寅": "亥", "卯": "午",
  "辰": "丑", "巳": "申", "午": "卯", "未": "戌",
  "申": "巳", "酉": "子", "戌": "未", "亥": "寅",
};

// ============================================================
// 해 (害) - 육합을 깨트리는 관계 (六害)
// ============================================================
export const HAE: Record<string, string> = {
  "子": "未", "丑": "午", "寅": "巳", "卯": "辰",
  "辰": "卯", "巳": "寅", "午": "丑", "未": "子",
  "申": "亥", "酉": "戌", "戌": "酉", "亥": "申",
};

// ============================================================
// 천간합 (天干合) - 음양이 합하여 새 오행 생성
// ============================================================
export const CHUNGAN_HAP: Record<string, { partner: string; result: string }> = {
  "甲": { partner: "己", result: "earth" },  // 甲己合土
  "己": { partner: "甲", result: "earth" },
  "乙": { partner: "庚", result: "metal" },  // 乙庚合金
  "庚": { partner: "乙", result: "metal" },
  "丙": { partner: "辛", result: "water" },  // 丙辛合水
  "辛": { partner: "丙", result: "water" },
  "丁": { partner: "壬", result: "wood" },   // 丁壬合木
  "壬": { partner: "丁", result: "wood" },
  "戊": { partner: "癸", result: "fire" },   // 戊癸合火
  "癸": { partner: "戊", result: "fire" },
};

// ============================================================
// 화개살 (華蓋殺) - 학문/예술/종교 성향, 고독한 기질
// ============================================================
export const HWAGAE_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "戌", "午": "戌", "戌": "戌",
  "巳": "丑", "酉": "丑", "丑": "丑",
  "申": "辰", "子": "辰", "辰": "辰",
  "亥": "未", "卯": "未", "未": "未",
};

// ============================================================
// 겁살 (劫殺) - 재물 손실, 도난 주의
// ============================================================
export const GEOBSAL_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "亥", "午": "亥", "戌": "亥",
  "巳": "寅", "酉": "寅", "丑": "寅",
  "申": "巳", "子": "巳", "辰": "巳",
  "亥": "申", "卯": "申", "未": "申",
};

// ============================================================
// 백호살 (白虎殺) - 사고, 수술, 피 볼 일 주의
// ============================================================
export const BAEKHO_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "申", "午": "申", "戌": "申",
  "巳": "亥", "酉": "亥", "丑": "亥",
  "申": "寅", "子": "寅", "辰": "寅",
  "亥": "巳", "卯": "巳", "未": "巳",
};

// ============================================================
// 천덕귀인 (天德貴人) - 가장 좋은 귀인, 위기에서 구함 (월지 기준)
// ============================================================
export const CHEONDEOK_BY_MONTH_BRANCH: Record<string, string> = {
  "寅": "丁", "卯": "申", "辰": "壬", "巳": "辛",
  "午": "亥", "未": "甲", "申": "癸", "酉": "寅",
  "戌": "丙", "亥": "乙", "子": "巳", "丑": "庚",
};

// ============================================================
// 월덕귀인 (月德貴人) - 월에 따른 귀인
// ============================================================
export const WOLDEOK_BY_MONTH_BRANCH: Record<string, string> = {
  "寅": "丙", "午": "丙", "戌": "丙",  // 화국
  "申": "壬", "子": "壬", "辰": "壬",  // 수국
  "亥": "甲", "卯": "甲", "未": "甲",  // 목국
  "巳": "庚", "酉": "庚", "丑": "庚",  // 금국
};

// ============================================================
// 천희귀인 (天喜貴人) - 기쁨/경사의 날
// ============================================================
export const CHEONHEE_BY_YEAR_BRANCH: Record<string, string> = {
  "子": "酉", "丑": "申", "寅": "未", "卯": "午",
  "辰": "巳", "巳": "辰", "午": "卯", "未": "寅",
  "申": "丑", "酉": "子", "戌": "亥", "亥": "戌",
};

// ============================================================
// 홍염살 (紅艶殺) - 연애/이성 인연의 날
// ============================================================
export const HONGYEOM_BY_YEAR_BRANCH: Record<string, string> = {
  "子": "午", "丑": "未", "寅": "申", "卯": "酉",
  "辰": "戌", "巳": "亥", "午": "子", "未": "丑",
  "申": "寅", "酉": "卯", "戌": "辰", "亥": "巳",
};

// ============================================================
// 천의성 (天醫星) - 건강/치료에 좋은 날
// ============================================================
export const CHEONUI_BY_MONTH_BRANCH: Record<string, string> = {
  "寅": "丑", "卯": "寅", "辰": "卯", "巳": "辰",
  "午": "巳", "未": "午", "申": "未", "酉": "申",
  "戌": "酉", "亥": "戌", "子": "亥", "丑": "子",
};

// ============================================================
// 장성살 (將星殺) - 리더십/권력의 날
// ============================================================
export const JANGSEONG_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "午", "午": "午", "戌": "午",
  "巳": "酉", "酉": "酉", "丑": "酉",
  "申": "子", "子": "子", "辰": "子",
  "亥": "卯", "卯": "卯", "未": "卯",
};

// ============================================================
// 반안살 (攀鞍殺) - 승진/명예의 날
// ============================================================
export const BANAN_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "巳", "午": "巳", "戌": "巳",
  "巳": "申", "酉": "申", "丑": "申",
  "申": "亥", "子": "亥", "辰": "亥",
  "亥": "寅", "卯": "寅", "未": "寅",
};

// ============================================================
// 문창귀인 (文昌貴人) - 학문/시험/문서의 날
// ============================================================
export const MUNCHANG_BY_DAY_STEM: Record<string, string> = {
  "甲": "巳", "乙": "午", "丙": "申", "丁": "酉",
  "戊": "申", "己": "酉", "庚": "亥", "辛": "子",
  "壬": "寅", "癸": "卯",
};

// ============================================================
// 학당귀인 (學堂貴人) - 학업/자격증의 날
// ============================================================
export const HAKDANG_BY_DAY_STEM: Record<string, string> = {
  "甲": "亥", "乙": "子", "丙": "寅", "丁": "卯",
  "戊": "寅", "己": "卯", "庚": "巳", "辛": "午",
  "壬": "申", "癸": "酉",
};

// ============================================================
// 납음(納音) 오행 - 60갑자별 납음 오행
// ============================================================
export const NAPEUM_ELEMENT_TABLE: Record<string, string> = {
  // 갑자~을축: 해중금
  "甲子": "metal", "乙丑": "metal",
  // 병인~정묘: 노중화
  "丙寅": "fire", "丁卯": "fire",
  // 무진~기사: 대림목
  "戊辰": "wood", "己巳": "wood",
  // 경오~신미: 노방토
  "庚午": "earth", "辛未": "earth",
  // 임신~계유: 검봉금
  "壬申": "metal", "癸酉": "metal",
  // 갑술~을해: 산두화
  "甲戌": "fire", "乙亥": "fire",
  // 병자~정축: 간하수
  "丙子": "water", "丁丑": "water",
  // 무인~기묘: 성두토
  "戊寅": "earth", "己卯": "earth",
  // 경진~신사: 백랍금
  "庚辰": "metal", "辛巳": "metal",
  // 임오~계미: 양류목
  "壬午": "wood", "癸未": "wood",
  // 갑신~을유: 천중수
  "甲申": "water", "乙酉": "water",
  // 병술~정해: 옥상토
  "丙戌": "earth", "丁亥": "earth",
  // 무자~기축: 벽력화
  "戊子": "fire", "己丑": "fire",
  // 경인~신묘: 송백목
  "庚寅": "wood", "辛卯": "wood",
  // 임진~계사: 장류수
  "壬辰": "water", "癸巳": "water",
  // 갑오~을미: 사중금
  "甲午": "metal", "乙未": "metal",
  // 병신~정유: 산하화
  "丙申": "fire", "丁酉": "fire",
  // 무술~기해: 평지목
  "戊戌": "wood", "己亥": "wood",
  // 경자~신축: 벽상토
  "庚子": "earth", "辛丑": "earth",
  // 임인~계묘: 금박금
  "壬寅": "metal", "癸卯": "metal",
  // 갑진~을사: 복등화
  "甲辰": "fire", "乙巳": "fire",
  // 병오~정미: 천하수
  "丙午": "water", "丁未": "water",
  // 무신~기유: 대역토
  "戊申": "earth", "己酉": "earth",
  // 경술~신해: 채천금
  "庚戌": "metal", "辛亥": "metal",
  // 임자~계축: 상자목
  "壬子": "wood", "癸丑": "wood",
  // 갑인~을묘: 대계수
  "甲寅": "water", "乙卯": "water",
  // 병진~정사: 사중토
  "丙辰": "earth", "丁巳": "earth",
  // 무오~기미: 천상화
  "戊午": "fire", "己未": "fire",
  // 경신~신유: 석류목
  "庚申": "wood", "辛酉": "wood",
  // 임술~계해: 대해수
  "壬戌": "water", "癸亥": "water",
};

// ============================================================
// 12신살 (十二神殺) - 일진별 12신
// ============================================================
export const TWELVE_SPIRITS = ["건", "제", "만", "평", "정", "집", "파", "위", "성", "수", "개", "폐"];

export const TWELVE_SPIRITS_MEANINGS: Record<string, { meaning: string; score: number }> = {
  "건": { meaning: "시작/설립에 좋음", score: 10 },
  "제": { meaning: "제거/청소에 좋음", score: 5 },
  "만": { meaning: "만사형통", score: 15 },
  "평": { meaning: "평온/안정", score: 8 },
  "정": { meaning: "정리/마무리에 좋음", score: 7 },
  "집": { meaning: "집중/수집에 좋음", score: 8 },
  "파": { meaning: "파괴/변화의 날", score: -10 },
  "위": { meaning: "위험/주의", score: -8 },
  "성": { meaning: "성취/완성", score: 12 },
  "수": { meaning: "수확/결실", score: 10 },
  "개": { meaning: "개방/개시에 좋음", score: 8 },
  "폐": { meaning: "폐쇄/종결의 날", score: -5 },
};

// ============================================================
// 28수 (二十八宿) - 동양 별자리
// ============================================================
export const TWENTY_EIGHT_MANSIONS = [
  { name: "각", meaning: "시작/계획", score: 8 },
  { name: "항", meaning: "결혼/계약", score: 10 },
  { name: "저", meaning: "축적/저축", score: 6 },
  { name: "방", meaning: "결혼/이사", score: 12 },
  { name: "심", meaning: "제사/기도", score: 5 },
  { name: "미", meaning: "건축/수리", score: 8 },
  { name: "기", meaning: "창고/보관", score: 6 },
  { name: "두", meaning: "혼인/개업", score: 10 },
  { name: "우", meaning: "결혼/취직", score: 9 },
  { name: "여", meaning: "제사/장례", score: 3 },
  { name: "허", meaning: "학업/제사", score: 5 },
  { name: "위", meaning: "결혼/건축", score: 10 },
  { name: "실", meaning: "결혼/이사", score: 12 },
  { name: "벽", meaning: "건축/개업", score: 11 },
  { name: "규", meaning: "결혼/취직", score: 9 },
  { name: "루", meaning: "제사/장례", score: 3 },
  { name: "위", meaning: "창고/보관", score: 6 },
  { name: "묘", meaning: "학업/시험", score: 8 },
  { name: "필", meaning: "결혼/건축", score: 10 },
  { name: "자", meaning: "학업/계약", score: 7 },
  { name: "삼", meaning: "건축/개업", score: 9 },
  { name: "정", meaning: "우물파기", score: 5 },
  { name: "귀", meaning: "제사/기도", score: 4 },
  { name: "류", meaning: "건축/수리", score: 7 },
  { name: "성", meaning: "건축/개업", score: 9 },
  { name: "장", meaning: "건축/개업", score: 10 },
  { name: "익", meaning: "결혼/이사", score: 11 },
  { name: "진", meaning: "제사/장례", score: 3 },
];

// ============================================================
// 12시진별 길흉 (시간대별 분석)
// ============================================================
export const HOUR_BRANCH_MEANINGS: Record<string, { period: string; nature: string; score: number }> = {
  "子": { period: "23:00-01:00", nature: "휴식/명상", score: 5 },
  "丑": { period: "01:00-03:00", nature: "깊은 수면", score: 3 },
  "寅": { period: "03:00-05:00", nature: "기상/준비", score: 6 },
  "卯": { period: "05:00-07:00", nature: "활동시작", score: 8 },
  "辰": { period: "07:00-09:00", nature: "업무시작", score: 10 },
  "巳": { period: "09:00-11:00", nature: "최고집중", score: 12 },
  "午": { period: "11:00-13:00", nature: "정오휴식", score: 8 },
  "未": { period: "13:00-15:00", nature: "오후활동", score: 9 },
  "申": { period: "15:00-17:00", nature: "마무리", score: 7 },
  "酉": { period: "17:00-19:00", nature: "퇴근/정리", score: 6 },
  "戌": { period: "19:00-21:00", nature: "휴식/취미", score: 8 },
  "亥": { period: "21:00-23:00", nature: "수면준비", score: 5 },
};

// ============================================================
// 24절기 (二十四節氣) - 태양 황경 기반
// ============================================================
export interface SolarTermInfo {
  name: string;
  koreanName: string;
  longitude: number;  // 태양 황경
  meaning: string;
  score: number;
  type: "major" | "minor";  // 절기 vs 중기
}

export const SOLAR_TERMS: SolarTermInfo[] = [
  { name: "lichun", koreanName: "입춘", longitude: 315, meaning: "봄의 시작, 새해 시작", score: 15, type: "major" },
  { name: "yushui", koreanName: "우수", longitude: 330, meaning: "눈이 비로 변함", score: 5, type: "minor" },
  { name: "jingzhe", koreanName: "경칩", longitude: 345, meaning: "개구리 깨어남", score: 8, type: "major" },
  { name: "chunfen", koreanName: "춘분", longitude: 0, meaning: "낮밤 길이 같음", score: 12, type: "minor" },
  { name: "qingming", koreanName: "청명", longitude: 15, meaning: "맑고 밝은 날", score: 10, type: "major" },
  { name: "guyu", koreanName: "곡우", longitude: 30, meaning: "비가 곡식 기름", score: 6, type: "minor" },
  { name: "lixia", koreanName: "입하", longitude: 45, meaning: "여름의 시작", score: 10, type: "major" },
  { name: "xiaoman", koreanName: "소만", longitude: 60, meaning: "작은 풍성", score: 5, type: "minor" },
  { name: "mangzhong", koreanName: "망종", longitude: 75, meaning: "씨뿌리기", score: 7, type: "major" },
  { name: "xiazhi", koreanName: "하지", longitude: 90, meaning: "낮이 가장 긴 날", score: 15, type: "minor" },
  { name: "xiaoshu", koreanName: "소서", longitude: 105, meaning: "작은 더위", score: 5, type: "major" },
  { name: "dashu", koreanName: "대서", longitude: 120, meaning: "큰 더위", score: 3, type: "minor" },
  { name: "liqiu", koreanName: "입추", longitude: 135, meaning: "가을의 시작", score: 10, type: "major" },
  { name: "chushu", koreanName: "처서", longitude: 150, meaning: "더위 물러감", score: 6, type: "minor" },
  { name: "bailu", koreanName: "백로", longitude: 165, meaning: "이슬 내림", score: 7, type: "major" },
  { name: "qiufen", koreanName: "추분", longitude: 180, meaning: "낮밤 길이 같음", score: 12, type: "minor" },
  { name: "hanlu", koreanName: "한로", longitude: 195, meaning: "찬 이슬", score: 5, type: "major" },
  { name: "shuangjiang", koreanName: "상강", longitude: 210, meaning: "서리 내림", score: 4, type: "minor" },
  { name: "lidong", koreanName: "입동", longitude: 225, meaning: "겨울의 시작", score: 8, type: "major" },
  { name: "xiaoxue", koreanName: "소설", longitude: 240, meaning: "작은 눈", score: 5, type: "minor" },
  { name: "daxue", koreanName: "대설", longitude: 255, meaning: "큰 눈", score: 4, type: "major" },
  { name: "dongzhi", koreanName: "동지", longitude: 270, meaning: "낮이 가장 짧은 날", score: 15, type: "minor" },
  { name: "xiaohan", koreanName: "소한", longitude: 285, meaning: "작은 추위", score: 3, type: "major" },
  { name: "dahan", koreanName: "대한", longitude: 300, meaning: "큰 추위", score: 2, type: "minor" },
];

// ============================================================
// 삼합회국 (三合會局) 데이터
// ============================================================
export const SAMHAP_GROUPS: Record<string, { branches: string[]; element: string; meaning: string }> = {
  wood: { branches: ["亥", "卯", "未"], element: "wood", meaning: "목국 - 성장/발전/시작" },
  fire: { branches: ["寅", "午", "戌"], element: "fire", meaning: "화국 - 열정/명예/표현" },
  metal: { branches: ["巳", "酉", "丑"], element: "metal", meaning: "금국 - 결단/재물/실행" },
  water: { branches: ["申", "子", "辰"], element: "water", meaning: "수국 - 지혜/유연/흐름" },
};

// 방합(方合) - 계절 지지 3개가 모임
export const BANGHAP_GROUPS: Record<string, { branches: string[]; element: string; season: string }> = {
  spring: { branches: ["寅", "卯", "辰"], element: "wood", season: "봄" },
  summer: { branches: ["巳", "午", "未"], element: "fire", season: "여름" },
  autumn: { branches: ["申", "酉", "戌"], element: "metal", season: "가을" },
  winter: { branches: ["亥", "子", "丑"], element: "water", season: "겨울" },
};

// ============================================================
// 특수 신살 조합 데이터
// ============================================================
export interface SalCombination {
  combination: string[];
  type: "synergy" | "conflict" | "neutral";
  effect: string;
  scoreModifier: number;
}

export const SPECIAL_SAL_COMBINATIONS: SalCombination[] = [
  // 시너지 조합
  { combination: ["천을귀인", "천덕귀인"], type: "synergy", effect: "최강 길일! 모든 흉이 해소됨", scoreModifier: 30 },
  { combination: ["천을귀인", "월덕귀인"], type: "synergy", effect: "귀인의 보호, 위기 극복", scoreModifier: 25 },
  { combination: ["문창귀인", "학당귀인"], type: "synergy", effect: "학업/시험 최적일", scoreModifier: 20 },
  { combination: ["도화살", "홍염살"], type: "synergy", effect: "강한 이성 인연, 연애 최적", scoreModifier: 15 },
  { combination: ["역마살", "반안살"], type: "synergy", effect: "이동 중 승진/명예", scoreModifier: 18 },
  { combination: ["장성살", "건록"], type: "synergy", effect: "리더십 발휘, 권력 상승", scoreModifier: 22 },

  // 상쇄 조합 (흉이 길로 해소)
  { combination: ["삼재", "천을귀인"], type: "conflict", effect: "삼재가 귀인으로 완화됨", scoreModifier: 15 },
  { combination: ["백호살", "천의성"], type: "conflict", effect: "사고 위험이 치유로 전환", scoreModifier: 12 },
  { combination: ["겁살", "건록"], type: "conflict", effect: "재물 손실이 안정으로", scoreModifier: 10 },
  { combination: ["공망", "천을귀인"], type: "conflict", effect: "공허함이 귀인으로 채워짐", scoreModifier: 8 },

  // 흉 + 흉 = 더 흉
  { combination: ["삼재", "백호살"], type: "synergy", effect: "이중 흉! 모든 활동 주의", scoreModifier: -25 },
  { combination: ["귀문관살", "원진"], type: "synergy", effect: "관계/정신적 어려움", scoreModifier: -20 },
  { combination: ["겁살", "공망"], type: "synergy", effect: "재물 손실 + 허무감", scoreModifier: -18 },
];

// ============================================================
// 오행 상생상극 관계
// ============================================================
export const STEM_ELEMENTS: Record<string, string> = {
  "甲": "wood", "乙": "wood",
  "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth",
  "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};

export const BRANCH_ELEMENTS: Record<string, string> = {
  "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
  "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
  "申": "metal", "酉": "metal", "戌": "earth", "亥": "water",
};

// ELEMENT_RELATIONS는 elements.config.ts에서 정의됨 - 중복 제거
// utils에서 사용하는 로컬 버전
export const ELEMENT_RELATIONS_LOCAL: Record<string, { generates: string; generatedBy: string; controls: string; controlledBy: string }> = {
  wood: { generates: "fire", generatedBy: "water", controls: "earth", controlledBy: "metal" },
  fire: { generates: "earth", generatedBy: "wood", controls: "metal", controlledBy: "water" },
  earth: { generates: "metal", generatedBy: "fire", controls: "water", controlledBy: "wood" },
  metal: { generates: "water", generatedBy: "earth", controls: "wood", controlledBy: "fire" },
  water: { generates: "wood", generatedBy: "metal", controls: "fire", controlledBy: "earth" },
};
