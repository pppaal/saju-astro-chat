/**
 * 특별한 날 관련 설정 (삼재, 역마, 도화, 건록 등)
 */

// 삼재 (三災) - 12년 주기로 3년간 불운
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

// 역마살 (驛馬殺) - 이동/변화의 날
export const YEOKMA_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "申", "午": "申", "戌": "申",
  "巳": "亥", "酉": "亥", "丑": "亥",
  "申": "寅", "子": "寅", "辰": "寅",
  "亥": "巳", "卯": "巳", "未": "巳",
};

// 도화살 (桃花殺) - 연애/매력의 날
export const DOHWA_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "卯", "午": "卯", "戌": "卯",
  "巳": "午", "酉": "午", "丑": "午",
  "申": "酉", "子": "酉", "辰": "酉",
  "亥": "子", "卯": "子", "未": "子",
};

// 건록 (建祿) - 일간의 록지
export const GEONROK_BY_DAY_STEM: Record<string, string> = {
  "甲": "寅", "乙": "卯", "丙": "巳", "丁": "午", "戊": "巳",
  "己": "午", "庚": "申", "辛": "酉", "壬": "亥", "癸": "子",
};

// 십신 완전판 (十神)
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

// Helper functions
export function isSamjaeYear(birthYearBranch: string, currentYearBranch: string): boolean {
  const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[birthYearBranch];
  return samjaeBranches?.includes(currentYearBranch) ?? false;
}

export function isYeokmaDay(birthYearBranch: string, dayBranch: string): boolean {
  return YEOKMA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isDohwaDay(birthYearBranch: string, dayBranch: string): boolean {
  return DOHWA_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

export function isGeonrokDay(dayMasterStem: string, dayBranch: string): boolean {
  return GEONROK_BY_DAY_STEM[dayMasterStem] === dayBranch;
}

export function getSipsin(dayMasterStem: string, targetStem: string): string {
  return SIPSIN_RELATIONS[dayMasterStem]?.[targetStem] ?? "";
}

// 손없는 날 (이사/결혼/개업에 좋은 날)
export function isSonEomneunDay(lunarDay: number): boolean {
  const dayInCycle = lunarDay % 10;
  return dayInCycle === 9 || dayInCycle === 0; // 9, 10, 19, 20, 29, 30일
}

// 간단한 양력→음력 근사 변환 (정확도 ±1~2일)
export function approximateLunarDay(date: Date): number {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(2000, 0, 6);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));
  const lunarMonthDays = 29.53;
  const dayInMonth = ((diffDays % lunarMonthDays) + lunarMonthDays) % lunarMonthDays;
  return Math.floor(dayInMonth) + 1;
}

// ============================================================
// 공망 (空亡) - 일주 기준으로 2개의 지지가 공망
// 60갑자에서 10천간 x 12지지 = 2개 지지가 남음
// ============================================================
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 일주(日柱) 기준 공망 지지 계산
export function getGongmang(dayStem: string, dayBranch: string): string[] {
  const stemIdx = STEMS.indexOf(dayStem);
  const branchIdx = BRANCHES.indexOf(dayBranch);
  if (stemIdx === -1 || branchIdx === -1) return [];

  // 순(旬)의 시작 지지 인덱스: 천간 인덱스만큼 지지가 뒤로 밀림
  // 예: 甲子순 → 공망은 戌亥, 甲寅순 → 공망은 子丑
  const xunStartBranch = (branchIdx - stemIdx + 12) % 12;
  // 공망은 순에서 빠진 2개 지지 (인덱스 10, 11)
  const gongmang1 = BRANCHES[(xunStartBranch + 10) % 12];
  const gongmang2 = BRANCHES[(xunStartBranch + 11) % 12];

  return [gongmang1, gongmang2];
}

// 특정 날의 지지가 공망인지 체크
export function isGongmangDay(dayStem: string, dayBranch: string, targetBranch: string): boolean {
  const gongmangBranches = getGongmang(dayStem, dayBranch);
  return gongmangBranches.includes(targetBranch);
}

// ============================================================
// 원진 (怨嗔) - 서로 원망하고 미워하는 관계
// ============================================================
export const WONJIN: Record<string, string> = {
  "子": "未", "丑": "午", "寅": "巳", "卯": "辰",
  "辰": "卯", "巳": "寅", "午": "丑", "未": "子",
  "申": "亥", "酉": "戌", "戌": "酉", "亥": "申",
};

export function isWonjinDay(dayBranch: string, targetBranch: string): boolean {
  return WONJIN[dayBranch] === targetBranch;
}

// ============================================================
// 귀문관살 (鬼門關殺) - 귀신 문이 열리는 흉한 조합
// ============================================================
export const GWIMUN: Record<string, string> = {
  "子": "卯", "丑": "寅", "寅": "丑", "卯": "子",
  "辰": "亥", "巳": "戌", "午": "酉", "未": "申",
  "申": "未", "酉": "午", "戌": "巳", "亥": "辰",
};

export function isGwimunDay(dayBranch: string, targetBranch: string): boolean {
  return GWIMUN[dayBranch] === targetBranch;
}

// ============================================================
// 암합 (暗合) - 지지 속에 숨은 천간끼리의 합
// 지장간의 정기(正氣) 기준
// ============================================================
export const BRANCH_MAIN_STEM: Record<string, string> = {
  "子": "癸", "丑": "己", "寅": "甲", "卯": "乙",
  "辰": "戊", "巳": "丙", "午": "丁", "未": "己",
  "申": "庚", "酉": "辛", "戌": "戊", "亥": "壬",
};

// 천간합 쌍
const STEM_COMBO_PAIRS: [string, string][] = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]
];

export function isAmhap(branch1: string, branch2: string): boolean {
  const stem1 = BRANCH_MAIN_STEM[branch1];
  const stem2 = BRANCH_MAIN_STEM[branch2];
  if (!stem1 || !stem2) return false;

  return STEM_COMBO_PAIRS.some(([a, b]) =>
    (stem1 === a && stem2 === b) || (stem1 === b && stem2 === a)
  );
}

// ============================================================
// 파 (破) - 파괴/깨짐의 관계
// ============================================================
export const PA: Record<string, string> = {
  "子": "酉", "丑": "辰", "寅": "亥", "卯": "午",
  "辰": "丑", "巳": "申", "午": "卯", "未": "戌",
  "申": "巳", "酉": "子", "戌": "未", "亥": "寅",
};

export function isPaDay(dayBranch: string, targetBranch: string): boolean {
  return PA[dayBranch] === targetBranch;
}

// ============================================================
// 해 (害) - 육합을 깨트리는 관계 (六害)
// ============================================================
export const HAE: Record<string, string> = {
  "子": "未", "丑": "午", "寅": "巳", "卯": "辰",
  "辰": "卯", "巳": "寅", "午": "丑", "未": "子",
  "申": "亥", "酉": "戌", "戌": "酉", "亥": "申",
};

export function isHaeDay(dayBranch: string, targetBranch: string): boolean {
  return HAE[dayBranch] === targetBranch;
}

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

export function isChunganHap(stem1: string, stem2: string): { isHap: boolean; resultElement?: string } {
  const hapInfo = CHUNGAN_HAP[stem1];
  if (hapInfo && hapInfo.partner === stem2) {
    return { isHap: true, resultElement: hapInfo.result };
  }
  return { isHap: false };
}

// ============================================================
// 화개살 (華蓋殺) - 학문/예술/종교 성향, 고독한 기질
// ============================================================
export const HWAGAE_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "戌", "午": "戌", "戌": "戌",
  "巳": "丑", "酉": "丑", "丑": "丑",
  "申": "辰", "子": "辰", "辰": "辰",
  "亥": "未", "卯": "未", "未": "未",
};

export function isHwagaeDay(birthYearBranch: string, dayBranch: string): boolean {
  return HWAGAE_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 겁살 (劫殺) - 재물 손실, 도난 주의
// ============================================================
export const GEOBSAL_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "亥", "午": "亥", "戌": "亥",
  "巳": "寅", "酉": "寅", "丑": "寅",
  "申": "巳", "子": "巳", "辰": "巳",
  "亥": "申", "卯": "申", "未": "申",
};

export function isGeobsalDay(birthYearBranch: string, dayBranch: string): boolean {
  return GEOBSAL_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 백호살 (白虎殺) - 사고, 수술, 피 볼 일 주의
// ============================================================
export const BAEKHO_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "申", "午": "申", "戌": "申",
  "巳": "亥", "酉": "亥", "丑": "亥",
  "申": "寅", "子": "寅", "辰": "寅",
  "亥": "巳", "卯": "巳", "未": "巳",
};

export function isBaekhoDay(birthYearBranch: string, dayBranch: string): boolean {
  return BAEKHO_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 천덕귀인 (天德貴人) - 가장 좋은 귀인, 위기에서 구함
// 월지 기준
// ============================================================
export const CHEONDEOK_BY_MONTH_BRANCH: Record<string, string> = {
  "寅": "丁", "卯": "申", "辰": "壬", "巳": "辛",
  "午": "亥", "未": "甲", "申": "癸", "酉": "寅",
  "戌": "丙", "亥": "乙", "子": "巳", "丑": "庚",
};

export function isCheondeokDay(monthBranch: string, dayStem: string): boolean {
  return CHEONDEOK_BY_MONTH_BRANCH[monthBranch] === dayStem;
}

// ============================================================
// 월덕귀인 (月德貴人) - 월에 따른 귀인
// ============================================================
export const WOLDEOK_BY_MONTH_BRANCH: Record<string, string> = {
  "寅": "丙", "午": "丙", "戌": "丙",  // 화국
  "申": "壬", "子": "壬", "辰": "壬",  // 수국
  "亥": "甲", "卯": "甲", "未": "甲",  // 목국
  "巳": "庚", "酉": "庚", "丑": "庚",  // 금국
};

export function isWoldeokDay(monthBranch: string, dayStem: string): boolean {
  return WOLDEOK_BY_MONTH_BRANCH[monthBranch] === dayStem;
}

// ============================================================
// 천희귀인 (天喜貴人) - 기쁨/경사의 날
// ============================================================
export const CHEONHEE_BY_YEAR_BRANCH: Record<string, string> = {
  "子": "酉", "丑": "申", "寅": "未", "卯": "午",
  "辰": "巳", "巳": "辰", "午": "卯", "未": "寅",
  "申": "丑", "酉": "子", "戌": "亥", "亥": "戌",
};

export function isCheonheeDay(birthYearBranch: string, dayBranch: string): boolean {
  return CHEONHEE_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 홍염살 (紅艶殺) - 연애/이성 인연의 날
// ============================================================
export const HONGYEOM_BY_YEAR_BRANCH: Record<string, string> = {
  "子": "午", "丑": "未", "寅": "申", "卯": "酉",
  "辰": "戌", "巳": "亥", "午": "子", "未": "丑",
  "申": "寅", "酉": "卯", "戌": "辰", "亥": "巳",
};

export function isHongyeomDay(birthYearBranch: string, dayBranch: string): boolean {
  return HONGYEOM_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 천의성 (天醫星) - 건강/치료에 좋은 날
// ============================================================
export const CHEONUI_BY_MONTH_BRANCH: Record<string, string> = {
  "寅": "丑", "卯": "寅", "辰": "卯", "巳": "辰",
  "午": "巳", "未": "午", "申": "未", "酉": "申",
  "戌": "酉", "亥": "戌", "子": "亥", "丑": "子",
};

export function isCheonuiDay(monthBranch: string, dayBranch: string): boolean {
  return CHEONUI_BY_MONTH_BRANCH[monthBranch] === dayBranch;
}

// ============================================================
// 장성살 (將星殺) - 리더십/권력의 날
// ============================================================
export const JANGSEONG_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "午", "午": "午", "戌": "午",
  "巳": "酉", "酉": "酉", "丑": "酉",
  "申": "子", "子": "子", "辰": "子",
  "亥": "卯", "卯": "卯", "未": "卯",
};

export function isJangseongDay(birthYearBranch: string, dayBranch: string): boolean {
  return JANGSEONG_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 반안살 (攀鞍殺) - 승진/명예의 날
// ============================================================
export const BANAN_BY_YEAR_BRANCH: Record<string, string> = {
  "寅": "巳", "午": "巳", "戌": "巳",
  "巳": "申", "酉": "申", "丑": "申",
  "申": "亥", "子": "亥", "辰": "亥",
  "亥": "寅", "卯": "寅", "未": "寅",
};

export function isBananDay(birthYearBranch: string, dayBranch: string): boolean {
  return BANAN_BY_YEAR_BRANCH[birthYearBranch] === dayBranch;
}

// ============================================================
// 문창귀인 (文昌貴人) - 학문/시험/문서의 날
// ============================================================
export const MUNCHANG_BY_DAY_STEM: Record<string, string> = {
  "甲": "巳", "乙": "午", "丙": "申", "丁": "酉",
  "戊": "申", "己": "酉", "庚": "亥", "辛": "子",
  "壬": "寅", "癸": "卯",
};

export function isMunchangDay(dayStem: string, dayBranch: string): boolean {
  return MUNCHANG_BY_DAY_STEM[dayStem] === dayBranch;
}

// ============================================================
// 학당귀인 (學堂貴人) - 학업/자격증의 날
// ============================================================
export const HAKDANG_BY_DAY_STEM: Record<string, string> = {
  "甲": "亥", "乙": "子", "丙": "寅", "丁": "卯",
  "戊": "寅", "己": "卯", "庚": "巳", "辛": "午",
  "壬": "申", "癸": "酉",
};

export function isHakdangDay(dayStem: string, dayBranch: string): boolean {
  return HAKDANG_BY_DAY_STEM[dayStem] === dayBranch;
}

// ============================================================
// 납음(納音) 오행 - 60갑자별 납음 오행
// 더 정교한 일진 분석을 위함
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

export function getNapeumElement(stem: string, branch: string): string | undefined {
  return NAPEUM_ELEMENT_TABLE[stem + branch];
}

// ============================================================
// 12신살 (十二神殺) - 일진별 12신
// ============================================================
export const TWELVE_SPIRITS = ["건", "제", "만", "평", "정", "집", "파", "위", "성", "수", "개", "폐"];

export function getTwelveSpiritForDay(date: Date): { name: string; meaning: string; score: number } {
  // 기준일: 2000년 1월 1일 = "건"
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(2000, 0, 1);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % 12) + 12) % 12;
  const name = TWELVE_SPIRITS[index];

  const meanings: Record<string, { meaning: string; score: number }> = {
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

  return { name, ...meanings[name] };
}

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

export function get28MansionForDay(date: Date): { name: string; meaning: string; score: number } {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(2000, 0, 1);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));
  const index = ((diffDays % 28) + 28) % 28;
  return TWENTY_EIGHT_MANSIONS[index];
}

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

// 태양 황경 근사 계산
function getSunLongitude(date: Date): number {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);
  // 평균 태양 황경 (근사)
  const L = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
  return L < 0 ? L + 360 : L;
}

// 해당 날짜가 절기인지 확인 (±1도 범위)
export function getSolarTermForDate(date: Date): SolarTermInfo | null {
  const sunLong = getSunLongitude(date);

  for (const term of SOLAR_TERMS) {
    const diff = Math.abs(sunLong - term.longitude);
    const normalizedDiff = Math.min(diff, 360 - diff);
    if (normalizedDiff < 1) {  // ±1도 이내
      return term;
    }
  }
  return null;
}

// 다음 절기까지 남은 일수
export function getDaysToNextSolarTerm(date: Date): { term: SolarTermInfo; days: number } {
  const sunLong = getSunLongitude(date);

  // 현재 황경보다 큰 가장 가까운 절기 찾기
  const sortedTerms = [...SOLAR_TERMS].sort((a, b) => a.longitude - b.longitude);

  for (const term of sortedTerms) {
    if (term.longitude > sunLong) {
      const degDiff = term.longitude - sunLong;
      const days = Math.round(degDiff / 0.9856474);  // 태양은 하루에 약 1도 이동
      return { term, days };
    }
  }

  // 연말 → 입춘
  const firstTerm = sortedTerms[0];
  const degDiff = (360 - sunLong) + firstTerm.longitude;
  const days = Math.round(degDiff / 0.9856474);
  return { term: firstTerm, days };
}

// ============================================================
// 일식/월식 분석 (근사 계산)
// ============================================================
export interface EclipseInfo {
  type: "solar" | "lunar";
  subType: "total" | "partial" | "annular" | "penumbral";
  date: Date;
  score: number;
  meaning: string;
}

// 달의 노드(교점) 근처에서 삭/망이면 일식/월식 가능성
export function checkEclipsePotential(date: Date): { potential: boolean; type: "solar" | "lunar" | null; strength: number } {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 태양 황경
  const sunLong = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
  // 달 황경
  const moonLong = (218.32 + 13.176396 * daysSinceJ2000) % 360;
  // 노드 황경 (역행)
  const nodeLong = (125.0 - 0.0529 * daysSinceJ2000) % 360;

  // 삭(New Moon) 체크 - 태양과 달 합
  const sunMoonDiff = Math.abs(sunLong - moonLong);
  const isNewMoon = sunMoonDiff < 12 || sunMoonDiff > 348;

  // 망(Full Moon) 체크 - 태양과 달 충
  const isFullMoon = Math.abs(sunMoonDiff - 180) < 12;

  // 노드 근처 체크 (±18도)
  const moonNodeDiff = Math.abs(moonLong - nodeLong);
  const normalizedNodeDiff = Math.min(moonNodeDiff, 360 - moonNodeDiff);
  const nearNode = normalizedNodeDiff < 18;

  // 반대 노드도 체크
  const oppositeNodeLong = (nodeLong + 180) % 360;
  const moonOppositeNodeDiff = Math.abs(moonLong - oppositeNodeLong);
  const normalizedOppositeNodeDiff = Math.min(moonOppositeNodeDiff, 360 - moonOppositeNodeDiff);
  const nearOppositeNode = normalizedOppositeNodeDiff < 18;

  if (isNewMoon && (nearNode || nearOppositeNode)) {
    return { potential: true, type: "solar", strength: 18 - normalizedNodeDiff };
  }
  if (isFullMoon && (nearNode || nearOppositeNode)) {
    return { potential: true, type: "lunar", strength: 18 - normalizedNodeDiff };
  }

  return { potential: false, type: null, strength: 0 };
}

// ============================================================
// 행성 역행 상세 분석 (그림자 기간 포함)
// ============================================================
export interface RetrogradePhase {
  phase: "pre-shadow" | "retrograde" | "post-shadow" | "direct";
  planet: string;
  meaning: string;
  score: number;
}

// 수성 역행 상세 (그림자 기간 포함)
export function getMercuryRetrogradePhase(date: Date): RetrogradePhase {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 수성 시노딕 주기: 약 116일
  const cycle = daysSinceJ2000 % 116;

  // 0-14: 프리 쉐도우 (역행 준비)
  // 14-35: 역행
  // 35-49: 포스트 쉐도우 (회복)
  // 49-116: 순행

  if (cycle >= 0 && cycle < 14) {
    return { phase: "pre-shadow", planet: "mercury", meaning: "수성 역행 준비기 - 중요 결정 보류", score: -3 };
  } else if (cycle >= 14 && cycle < 35) {
    return { phase: "retrograde", planet: "mercury", meaning: "수성 역행 - 의사소통/계약 주의", score: -8 };
  } else if (cycle >= 35 && cycle < 49) {
    return { phase: "post-shadow", planet: "mercury", meaning: "수성 역행 회복기 - 재검토 완료", score: -2 };
  } else {
    return { phase: "direct", planet: "mercury", meaning: "수성 순행 - 정상 진행", score: 0 };
  }
}

// 금성 역행 상세
export function getVenusRetrogradePhase(date: Date): RetrogradePhase {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 금성 시노딕 주기: 약 584일
  const cycle = daysSinceJ2000 % 584;

  // 0-20: 프리 쉐도우
  // 20-60: 역행 (약 40일)
  // 60-80: 포스트 쉐도우
  // 80-584: 순행

  if (cycle >= 0 && cycle < 20) {
    return { phase: "pre-shadow", planet: "venus", meaning: "금성 역행 준비기 - 관계 재점검", score: -2 };
  } else if (cycle >= 20 && cycle < 60) {
    return { phase: "retrograde", planet: "venus", meaning: "금성 역행 - 사랑/재물 재고", score: -5 };
  } else if (cycle >= 60 && cycle < 80) {
    return { phase: "post-shadow", planet: "venus", meaning: "금성 역행 회복기", score: -1 };
  } else {
    return { phase: "direct", planet: "venus", meaning: "금성 순행", score: 0 };
  }
}

// 화성 역행 상세
export function getMarsRetrogradePhase(date: Date): RetrogradePhase {
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 화성 시노딕 주기: 약 780일
  const cycle = daysSinceJ2000 % 780;

  // 0-30: 프리 쉐도우
  // 30-102: 역행 (약 72일)
  // 102-132: 포스트 쉐도우
  // 132-780: 순행

  if (cycle >= 0 && cycle < 30) {
    return { phase: "pre-shadow", planet: "mars", meaning: "화성 역행 준비기 - 행동력 저하", score: -2 };
  } else if (cycle >= 30 && cycle < 102) {
    return { phase: "retrograde", planet: "mars", meaning: "화성 역행 - 갈등/분쟁 주의", score: -6 };
  } else if (cycle >= 102 && cycle < 132) {
    return { phase: "post-shadow", planet: "mars", meaning: "화성 역행 회복기", score: -1 };
  } else {
    return { phase: "direct", planet: "mars", meaning: "화성 순행", score: 0 };
  }
}

// ============================================================
// 행성 입궁 (Ingress) - 별자리 변경
// ============================================================
export function getPlanetSignChange(date: Date, daysBefore: number = 3, daysAfter: number = 3): { planet: string; fromSign: string; toSign: string; isTransition: boolean }[] {
  const results: { planet: string; fromSign: string; toSign: string; isTransition: boolean }[] = [];
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                 "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  const daysSinceJ2000 = (date.getTime() - J2000.getTime()) / (1000 * 60 * 60 * 24);

  // 각 행성별 황경 계산 및 사인 경계 체크
  const planets = [
    { name: "sun", rate: 0.9856474, base: 280.46 },
    { name: "moon", rate: 13.176396, base: 218.32 },
    { name: "mercury", rate: 4.0923, base: 280.46 },  // 평균 속도
    { name: "venus", rate: 1.6021, base: 181.98 },
    { name: "mars", rate: 0.5240, base: 355.43 },
    { name: "jupiter", rate: 0.0831, base: 34.35 },
    { name: "saturn", rate: 0.0335, base: 49.94 },
  ];

  for (const planet of planets) {
    const currentLong = (planet.base + planet.rate * daysSinceJ2000) % 360;
    const currentSign = signs[Math.floor(currentLong / 30)];
    const degreeInSign = currentLong % 30;

    // 사인 초입 (0-3도) 또는 사인 끝 (27-30도)이면 전환 중
    if (degreeInSign < daysBefore || degreeInSign > (30 - daysAfter)) {
      const prevSign = signs[(Math.floor(currentLong / 30) - 1 + 12) % 12];
      const nextSign = signs[(Math.floor(currentLong / 30) + 1) % 12];

      results.push({
        planet: planet.name,
        fromSign: degreeInSign < daysBefore ? prevSign : currentSign,
        toSign: degreeInSign < daysBefore ? currentSign : nextSign,
        isTransition: true,
      });
    }
  }

  return results;
}

// ============================================================
// 시주(時柱)와 일진의 관계 분석
// ============================================================
export function analyzeHourPillarWithDay(
  hourBranch: string,
  dayBranch: string,
  dayStem: string
): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // 1. 시지와 일지의 합/충/형/해 관계
  const YUKHAP: Record<string, string> = {
    "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
    "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
    "巳": "申", "申": "巳", "午": "未", "未": "午",
  };

  const CHUNG: Record<string, string> = {
    "子": "午", "午": "子", "丑": "未", "未": "丑",
    "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
    "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
  };

  if (YUKHAP[hourBranch] === dayBranch) {
    score += 10;
    factors.push("hourDayHap");  // 시일합 - 매우 좋음
  }

  if (CHUNG[hourBranch] === dayBranch) {
    score -= 8;
    factors.push("hourDayChung");  // 시일충 - 주의
  }

  // 2. 시지가 천을귀인인지 체크
  const CHEONEUL: Record<string, string[]> = {
    "甲": ["丑", "未"], "乙": ["子", "申"], "丙": ["亥", "酉"], "丁": ["亥", "酉"],
    "戊": ["丑", "未"], "己": ["子", "申"], "庚": ["丑", "未"], "辛": ["寅", "午"],
    "壬": ["卯", "巳"], "癸": ["卯", "巳"],
  };

  if (CHEONEUL[dayStem]?.includes(hourBranch)) {
    score += 12;
    factors.push("hourCheoneul");  // 시주 천을귀인
  }

  // 3. 공망 체크
  const gongmang = getGongmang(dayStem, dayBranch);
  if (gongmang.includes(hourBranch)) {
    score -= 6;
    factors.push("hourGongmang");  // 시주 공망
  }

  return { score, factors };
}

// ============================================================
// 대운 전환기 분석
// ============================================================
export function analyzeDaeunTransition(
  birthYear: number,
  currentYear: number,
  daeunsu: number  // 대운 시작 나이
): { inTransition: boolean; yearsToTransition: number; transitionScore: number } {
  const age = currentYear - birthYear + 1;  // 한국식 나이

  // 대운은 10년 주기
  const yearsIntoDaeun = (age - daeunsu) % 10;
  const yearsToTransition = 10 - yearsIntoDaeun;

  // 전환기: 마지막 1년 또는 첫 1년
  const inTransition = yearsIntoDaeun >= 9 || yearsIntoDaeun <= 1;

  let transitionScore = 0;
  if (yearsIntoDaeun === 9 || yearsIntoDaeun === 0) {
    transitionScore = -5;  // 대운 전환 직전/직후 - 불안정
  } else if (yearsIntoDaeun === 1 || yearsIntoDaeun === 8) {
    transitionScore = -2;  // 전환 근접
  }

  return { inTransition, yearsToTransition, transitionScore };
}

// ============================================================
// 사주 원국과 일진의 상세 관계
// ============================================================
export function analyzeNatalDayRelation(
  natalPillars: {
    year?: { stem: string; branch: string };
    month?: { stem: string; branch: string };
    day?: { stem: string; branch: string };
    time?: { stem: string; branch: string };
  },
  dayGanzhi: { stem: string; branch: string }
): { score: number; factors: string[]; highlights: string[] } {
  let score = 0;
  const factors: string[] = [];
  const highlights: string[] = [];

  const pillars = [
    { name: "year", pillar: natalPillars.year },
    { name: "month", pillar: natalPillars.month },
    { name: "day", pillar: natalPillars.day },
    { name: "time", pillar: natalPillars.time },
  ];

  for (const { name, pillar } of pillars) {
    if (!pillar) continue;

    // 천간합 체크
    const hapResult = isChunganHap(pillar.stem, dayGanzhi.stem);
    if (hapResult.isHap) {
      score += 15;
      factors.push(`${name}StemHap`);
      highlights.push(`${name}주 천간과 합`);
    }

    // 지지 육합 체크
    const YUKHAP: Record<string, string> = {
      "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
      "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
      "巳": "申", "申": "巳", "午": "未", "未": "午",
    };

    if (YUKHAP[pillar.branch] === dayGanzhi.branch) {
      score += 12;
      factors.push(`${name}BranchHap`);
      highlights.push(`${name}주 지지와 합`);
    }

    // 지지 충 체크
    const CHUNG: Record<string, string> = {
      "子": "午", "午": "子", "丑": "未", "未": "丑",
      "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
      "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
    };

    if (CHUNG[pillar.branch] === dayGanzhi.branch) {
      score -= 10;
      factors.push(`${name}BranchChung`);
      highlights.push(`${name}주 지지와 충`);
    }

    // 암합 체크
    if (isAmhap(pillar.branch, dayGanzhi.branch)) {
      score += 8;
      factors.push(`${name}Amhap`);
    }

    // 원진 체크
    if (isWonjinDay(pillar.branch, dayGanzhi.branch)) {
      score -= 6;
      factors.push(`${name}Wonjin`);
    }
  }

  return { score, factors, highlights };
}

// ============================================================
// 삼합회국 (三合會局) 상세 분석 - 지지 3개가 모이면 완전한 오행 형성
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

export interface SamhapAnalysis {
  hasSamhap: boolean;
  element?: string;
  meaning?: string;
  strength: "full" | "partial" | "none";  // 3개 모두/2개/없음
  score: number;
}

export function analyzeSamhapWithDay(
  natalBranches: string[],  // 사주 원국의 지지들
  dayBranch: string
): SamhapAnalysis {
  const allBranches = [...natalBranches, dayBranch];

  for (const [key, group] of Object.entries(SAMHAP_GROUPS)) {
    const matchCount = group.branches.filter(b => allBranches.includes(b)).length;

    if (matchCount === 3) {
      return {
        hasSamhap: true,
        element: group.element,
        meaning: group.meaning,
        strength: "full",
        score: 25,  // 완전한 삼합
      };
    } else if (matchCount === 2 && group.branches.includes(dayBranch)) {
      return {
        hasSamhap: true,
        element: group.element,
        meaning: group.meaning,
        strength: "partial",
        score: 12,  // 반합 (일진이 참여)
      };
    }
  }

  return { hasSamhap: false, strength: "none", score: 0 };
}

// ============================================================
// 월간 트랜짓 어스펙트 상세 분석
// ============================================================
export interface DetailedAspect {
  planet1: string;
  planet2: string;
  aspect: "conjunction" | "opposition" | "trine" | "square" | "sextile" | "quincunx";
  orb: number;  // 오브 (허용 오차)
  applying: boolean;  // 접근 중 vs 분리 중
  meaning: string;
  score: number;
}

const ASPECT_MEANINGS: Record<string, Record<string, { meaning: string; score: number }>> = {
  "jupiter-venus": {
    conjunction: { meaning: "최고의 행운! 재물과 사랑 모두 좋음", score: 20 },
    trine: { meaning: "자연스러운 풍요와 기쁨", score: 15 },
    sextile: { meaning: "좋은 기회가 찾아옴", score: 10 },
    square: { meaning: "과욕 주의, 절제 필요", score: -3 },
    opposition: { meaning: "균형 필요, 양쪽 모두 원함", score: 2 },
    quincunx: { meaning: "조정 필요", score: -1 },
  },
  "saturn-mars": {
    conjunction: { meaning: "강한 시련, 인내 필요", score: -15 },
    square: { meaning: "갈등과 좌절, 분노 조절 필요", score: -12 },
    opposition: { meaning: "외부 압력, 권위자와 충돌", score: -10 },
    trine: { meaning: "끈기 있는 노력으로 성과", score: 8 },
    sextile: { meaning: "규율 있는 행동력", score: 5 },
    quincunx: { meaning: "에너지 조절 어려움", score: -5 },
  },
  "jupiter-saturn": {
    conjunction: { meaning: "새로운 사회적 주기 시작 (20년 주기)", score: 10 },
    square: { meaning: "확장 vs 제한의 긴장", score: -5 },
    opposition: { meaning: "균형점 찾기, 중요한 결정", score: 3 },
    trine: { meaning: "현실적 성장, 안정적 확장", score: 12 },
    sextile: { meaning: "기회와 책임의 조화", score: 8 },
    quincunx: { meaning: "성장 방향 조정 필요", score: -2 },
  },
  "sun-moon": {
    conjunction: { meaning: "신월(朔) - 새로운 시작", score: 8 },
    opposition: { meaning: "보름(望) - 완성과 결실", score: 10 },
    square: { meaning: "상현/하현 - 결정과 행동", score: 0 },
    trine: { meaning: "조화로운 자아와 감정", score: 6 },
    sextile: { meaning: "내면의 균형", score: 4 },
    quincunx: { meaning: "자아 조정 필요", score: -2 },
  },
  "mars-venus": {
    conjunction: { meaning: "강한 끌림, 열정적 만남", score: 10 },
    trine: { meaning: "조화로운 관계, 창조적 에너지", score: 8 },
    square: { meaning: "관계 갈등, 욕망 충돌", score: -6 },
    opposition: { meaning: "밀고 당기기, 긴장된 매력", score: 2 },
    sextile: { meaning: "부드러운 조화", score: 5 },
    quincunx: { meaning: "관계 조정 필요", score: -3 },
  },
  "mercury-jupiter": {
    conjunction: { meaning: "지적 확장, 좋은 소식", score: 12 },
    trine: { meaning: "원활한 의사소통, 학습 최적", score: 10 },
    square: { meaning: "과대망상 주의, 세부사항 놓침", score: -4 },
    opposition: { meaning: "다양한 관점, 과잉 약속", score: -2 },
    sextile: { meaning: "긍정적 사고, 기회 포착", score: 8 },
    quincunx: { meaning: "생각 조정 필요", score: -1 },
  },
};

export function getDetailedPlanetaryAspects(date: Date): DetailedAspect[] {
  const aspects: DetailedAspect[] = [];
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const daysSinceJ2000 = (dateUtc - J2000) / (1000 * 60 * 60 * 24);

  // 행성 위치 계산 (근사)
  const planets: Record<string, { longitude: number; speed: number }> = {
    sun: { longitude: (280.46 + 0.9856474 * daysSinceJ2000) % 360, speed: 0.9856474 },
    moon: { longitude: (218.32 + 13.176396 * daysSinceJ2000) % 360, speed: 13.176396 },
    mercury: { longitude: (280.46 + 4.0923 * daysSinceJ2000) % 360, speed: 4.0923 },
    venus: { longitude: (181.98 + 1.6021 * daysSinceJ2000) % 360, speed: 1.6021 },
    mars: { longitude: (355.43 + 0.5240 * daysSinceJ2000) % 360, speed: 0.5240 },
    jupiter: { longitude: (34.35 + 0.0831 * daysSinceJ2000) % 360, speed: 0.0831 },
    saturn: { longitude: (49.94 + 0.0335 * daysSinceJ2000) % 360, speed: 0.0335 },
  };

  // 정규화
  for (const p of Object.values(planets)) {
    if (p.longitude < 0) p.longitude += 360;
  }

  const aspectDegrees: Record<string, { angle: number; orb: number }> = {
    conjunction: { angle: 0, orb: 8 },
    opposition: { angle: 180, orb: 8 },
    trine: { angle: 120, orb: 8 },
    square: { angle: 90, orb: 7 },
    sextile: { angle: 60, orb: 6 },
    quincunx: { angle: 150, orb: 3 },
  };

  const pairs = [
    ["jupiter", "venus"],
    ["saturn", "mars"],
    ["jupiter", "saturn"],
    ["sun", "moon"],
    ["mars", "venus"],
    ["mercury", "jupiter"],
  ];

  for (const [p1, p2] of pairs) {
    const diff = Math.abs(planets[p1].longitude - planets[p2].longitude);
    const normalizedDiff = Math.min(diff, 360 - diff);

    for (const [aspectName, { angle, orb }] of Object.entries(aspectDegrees)) {
      const aspectDiff = Math.abs(normalizedDiff - angle);
      if (aspectDiff <= orb) {
        const key = `${p1}-${p2}`;
        const aspectData = ASPECT_MEANINGS[key]?.[aspectName];

        if (aspectData) {
          // 접근 중인지 분리 중인지 계산
          const applying = planets[p1].speed > planets[p2].speed;

          aspects.push({
            planet1: p1,
            planet2: p2,
            aspect: aspectName as DetailedAspect["aspect"],
            orb: aspectDiff,
            applying,
            meaning: aspectData.meaning,
            score: aspectData.score * (applying ? 1.2 : 0.8),  // 접근 중이면 더 강함
          });
        }
        break;
      }
    }
  }

  return aspects;
}

// ============================================================
// 특수 신살 조합 분석 - 여러 신살이 겹칠 때의 시너지/상쇄
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

export function analyzeSalCombinations(activeSals: string[]): SalCombination[] {
  const results: SalCombination[] = [];

  for (const combo of SPECIAL_SAL_COMBINATIONS) {
    if (combo.combination.every(sal => activeSals.includes(sal))) {
      results.push(combo);
    }
  }

  return results;
}

// ============================================================
// 영역별 최적 시간대 분석
// ============================================================
export interface OptimalTimeSlot {
  branch: string;
  period: string;
  score: number;
  activities: string[];
}

export function getOptimalTimesForArea(
  area: "career" | "wealth" | "love" | "health" | "study" | "travel",
  dayMasterElement: string,
  dayBranch: string
): OptimalTimeSlot[] {
  const HOUR_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const HOUR_PERIODS = [
    "23:00-01:00", "01:00-03:00", "03:00-05:00", "05:00-07:00",
    "07:00-09:00", "09:00-11:00", "11:00-13:00", "13:00-15:00",
    "15:00-17:00", "17:00-19:00", "19:00-21:00", "21:00-23:00"
  ];

  const BRANCH_ELEMENTS: Record<string, string> = {
    "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
    "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
    "申": "metal", "酉": "metal", "戌": "earth", "亥": "water"
  };

  const AREA_ELEMENTS: Record<string, string[]> = {
    career: ["wood", "fire"],
    wealth: ["earth", "metal"],
    love: ["fire", "water"],
    health: ["earth", "metal"],
    study: ["water", "wood"],
    travel: ["wood", "metal"],
  };

  const ELEMENT_RELATIONS: Record<string, { generates: string; generatedBy: string }> = {
    wood: { generates: "fire", generatedBy: "water" },
    fire: { generates: "earth", generatedBy: "wood" },
    earth: { generates: "metal", generatedBy: "fire" },
    metal: { generates: "water", generatedBy: "earth" },
    water: { generates: "wood", generatedBy: "metal" },
  };

  const results: OptimalTimeSlot[] = [];
  const favorableElements = AREA_ELEMENTS[area];

  for (let i = 0; i < 12; i++) {
    const branch = HOUR_BRANCHES[i];
    const branchElement = BRANCH_ELEMENTS[branch];
    let score = 50;
    const activities: string[] = [];

    // 1. 영역에 맞는 오행이면 +
    if (favorableElements.includes(branchElement)) {
      score += 15;
      activities.push(`${area}Activity`);
    }

    // 2. 일간을 생해주는 시간이면 +
    if (ELEMENT_RELATIONS[dayMasterElement]?.generatedBy === branchElement) {
      score += 10;
      activities.push("supportive");
    }

    // 3. 일지와 합이면 +
    const YUKHAP: Record<string, string> = {
      "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
      "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
      "巳": "申", "申": "巳", "午": "未", "未": "午",
    };
    if (YUKHAP[dayBranch] === branch) {
      score += 12;
      activities.push("harmony");
    }

    // 4. 일지와 충이면 -
    const CHUNG: Record<string, string> = {
      "子": "午", "午": "子", "丑": "未", "未": "丑",
      "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
      "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
    };
    if (CHUNG[dayBranch] === branch) {
      score -= 15;
      activities.push("avoidConflict");
    }

    results.push({
      branch,
      period: HOUR_PERIODS[i],
      score,
      activities,
    });
  }

  // 점수 높은 순 정렬
  return results.sort((a, b) => b.score - a.score);
}

// ============================================================
// 용신 기반 상세 추천
// ============================================================
export interface YongsinRecommendation {
  direction: string;  // 방향
  color: string;      // 색상
  number: number;     // 숫자
  food: string;       // 음식
  activity: string;   // 활동
  avoidElement: string;  // 피할 것
}

export const ELEMENT_RECOMMENDATIONS: Record<string, YongsinRecommendation> = {
  wood: {
    direction: "동쪽",
    color: "청색/녹색",
    number: 3,
    food: "신맛 음식, 채소, 나물",
    activity: "새벽 활동, 창작, 계획 수립",
    avoidElement: "금(金) - 금속, 흰색, 서쪽",
  },
  fire: {
    direction: "남쪽",
    color: "적색/주황색",
    number: 7,
    food: "쓴맛 음식, 구운 요리",
    activity: "낮 활동, 발표, 홍보, 면접",
    avoidElement: "수(水) - 물, 검정색, 북쪽",
  },
  earth: {
    direction: "중앙/남서",
    color: "황색/갈색",
    number: 5,
    food: "단맛 음식, 곡물, 과일",
    activity: "오후 활동, 중재, 계약, 부동산",
    avoidElement: "목(木) - 나무, 청색, 동쪽",
  },
  metal: {
    direction: "서쪽",
    color: "백색/금색",
    number: 9,
    food: "매운 음식, 생강, 마늘",
    activity: "저녁 활동, 결단, 정리, 수금",
    avoidElement: "화(火) - 불, 적색, 남쪽",
  },
  water: {
    direction: "북쪽",
    color: "흑색/남색",
    number: 1,
    food: "짠맛 음식, 해산물",
    activity: "밤 활동, 연구, 명상, 여행",
    avoidElement: "토(土) - 흙, 황색, 중앙",
  },
};

export function getYongsinRecommendations(yongsinElement: string): YongsinRecommendation | null {
  const element = yongsinElement.toLowerCase();
  return ELEMENT_RECOMMENDATIONS[element] || null;
}

// ============================================================
// 점성술 하우스별 트랜짓 상세 분석
// ============================================================
export interface HouseTransitAnalysis {
  house: number;
  planets: string[];
  themes: string[];
  score: number;
  advice: string;
}

const HOUSE_THEMES: Record<number, { themes: string[]; goodPlanets: string[]; challengingPlanets: string[] }> = {
  1: { themes: ["자아", "외모", "새시작"], goodPlanets: ["jupiter", "venus", "sun"], challengingPlanets: ["saturn", "pluto"] },
  2: { themes: ["재물", "가치관", "소유"], goodPlanets: ["jupiter", "venus"], challengingPlanets: ["saturn", "neptune"] },
  3: { themes: ["의사소통", "학습", "형제"], goodPlanets: ["mercury", "jupiter"], challengingPlanets: ["saturn"] },
  4: { themes: ["가정", "부모", "뿌리"], goodPlanets: ["moon", "jupiter"], challengingPlanets: ["saturn", "pluto"] },
  5: { themes: ["창조", "연애", "자녀"], goodPlanets: ["venus", "jupiter", "sun"], challengingPlanets: ["saturn"] },
  6: { themes: ["건강", "직장", "봉사"], goodPlanets: ["mercury", "mars"], challengingPlanets: ["neptune", "saturn"] },
  7: { themes: ["파트너", "계약", "적"], goodPlanets: ["venus", "jupiter"], challengingPlanets: ["saturn", "mars"] },
  8: { themes: ["변혁", "공유자원", "심리"], goodPlanets: ["pluto"], challengingPlanets: ["saturn", "mars"] },
  9: { themes: ["철학", "해외", "고등교육"], goodPlanets: ["jupiter", "uranus"], challengingPlanets: ["saturn"] },
  10: { themes: ["직업", "명예", "사회적지위"], goodPlanets: ["jupiter", "sun", "saturn"], challengingPlanets: ["neptune"] },
  11: { themes: ["친구", "희망", "단체"], goodPlanets: ["jupiter", "uranus"], challengingPlanets: ["saturn"] },
  12: { themes: ["영성", "은둔", "잠재의식"], goodPlanets: ["neptune", "jupiter"], challengingPlanets: ["saturn", "mars"] },
};

export function analyzeHouseTransits(
  houses: number[],  // 12하우스 커스프
  planetPositions: Record<string, number>  // 행성명: 황경
): HouseTransitAnalysis[] {
  if (!houses || houses.length < 12) return [];

  const results: HouseTransitAnalysis[] = [];

  const getHouseForLongitude = (longitude: number): number => {
    for (let i = 0; i < 12; i++) {
      const nextHouse = (i + 1) % 12;
      const start = houses[i];
      const end = houses[nextHouse];
      if (end > start) {
        if (longitude >= start && longitude < end) return i + 1;
      } else {
        if (longitude >= start || longitude < end) return i + 1;
      }
    }
    return 1;
  };

  // 각 하우스에 어떤 행성이 있는지 분석
  const houseOccupants: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) {
    houseOccupants[i] = [];
  }

  for (const [planet, longitude] of Object.entries(planetPositions)) {
    const house = getHouseForLongitude(longitude);
    houseOccupants[house].push(planet);
  }

  // 각 하우스 분석
  for (let house = 1; house <= 12; house++) {
    const occupants = houseOccupants[house];
    if (occupants.length === 0) continue;

    const houseInfo = HOUSE_THEMES[house];
    let score = 50;
    const advices: string[] = [];

    for (const planet of occupants) {
      if (houseInfo.goodPlanets.includes(planet)) {
        score += 15;
        advices.push(`${planet}이(가) ${houseInfo.themes.join("/")}에 좋은 영향`);
      }
      if (houseInfo.challengingPlanets.includes(planet)) {
        score -= 10;
        advices.push(`${planet} 트랜짓으로 ${houseInfo.themes[0]} 영역 주의`);
      }
    }

    results.push({
      house,
      planets: occupants,
      themes: houseInfo.themes,
      score,
      advice: advices.join(". "),
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ============================================================
// 세운/월운 흐름 분석 강화
// ============================================================
export interface FortuneFlowAnalysis {
  period: "yearly" | "monthly";
  stemElement: string;
  branchElement: string;
  compatibility: "excellent" | "good" | "neutral" | "challenging" | "difficult";
  score: number;
  focus: string[];
  warnings: string[];
}

export function analyzeFortuneFlow(
  periodStem: string,
  periodBranch: string,
  dayMaster: string,
  dayMasterElement: string,
  yongsinElement?: string
): FortuneFlowAnalysis {
  const STEM_ELEMENTS: Record<string, string> = {
    "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire",
    "戊": "earth", "己": "earth", "庚": "metal", "辛": "metal",
    "壬": "water", "癸": "water",
  };

  const BRANCH_ELEMENTS: Record<string, string> = {
    "子": "water", "丑": "earth", "寅": "wood", "卯": "wood",
    "辰": "earth", "巳": "fire", "午": "fire", "未": "earth",
    "申": "metal", "酉": "metal", "戌": "earth", "亥": "water",
  };

  const stemEl = STEM_ELEMENTS[periodStem] || "earth";
  const branchEl = BRANCH_ELEMENTS[periodBranch] || "earth";

  const RELATIONS: Record<string, { generates: string; generatedBy: string; controls: string; controlledBy: string }> = {
    wood: { generates: "fire", generatedBy: "water", controls: "earth", controlledBy: "metal" },
    fire: { generates: "earth", generatedBy: "wood", controls: "metal", controlledBy: "water" },
    earth: { generates: "metal", generatedBy: "fire", controls: "water", controlledBy: "wood" },
    metal: { generates: "water", generatedBy: "earth", controls: "wood", controlledBy: "fire" },
    water: { generates: "wood", generatedBy: "metal", controls: "fire", controlledBy: "earth" },
  };

  let score = 50;
  const focus: string[] = [];
  const warnings: string[] = [];
  let compatibility: FortuneFlowAnalysis["compatibility"] = "neutral";

  const rel = RELATIONS[dayMasterElement];
  if (!rel) {
    return { period: "yearly", stemElement: stemEl, branchElement: branchEl, compatibility, score, focus, warnings };
  }

  // 용신과 일치하면 최고
  if (yongsinElement && (stemEl === yongsinElement || branchEl === yongsinElement)) {
    score += 30;
    compatibility = "excellent";
    focus.push("용신이 왔으므로 적극적 활동 추천");
  }

  // 생을 받으면 좋음
  if (stemEl === rel.generatedBy || branchEl === rel.generatedBy) {
    score += 20;
    if (compatibility !== "excellent") compatibility = "good";
    focus.push("에너지를 받는 시기");
  }

  // 같은 오행이면 힘 강화
  if (stemEl === dayMasterElement || branchEl === dayMasterElement) {
    score += 15;
    if (compatibility !== "excellent" && compatibility !== "good") compatibility = "good";
    focus.push("자신감 상승, 주도적 활동");
  }

  // 극을 당하면 주의
  if (stemEl === rel.controlledBy || branchEl === rel.controlledBy) {
    score -= 20;
    compatibility = "challenging";
    warnings.push("외부 압박, 건강 주의");
  }

  // 내가 극하면 재성 (재물운)
  if (stemEl === rel.controls || branchEl === rel.controls) {
    score += 10;
    focus.push("재물운 상승, 투자 검토");
  }

  // 내가 생하면 식상 (표현/자녀)
  if (stemEl === rel.generates || branchEl === rel.generates) {
    score += 5;
    focus.push("창작/표현 좋음, 자녀 관련 일");
  }

  return {
    period: "yearly",
    stemElement: stemEl,
    branchElement: branchEl,
    compatibility,
    score,
    focus,
    warnings,
  };
}

// ========================================
// 12운성(十二運星) 분석
// ========================================

export interface TwelveFortuneStarInfo {
  name: string;
  koreanName: string;
  stage: number; // 1-12
  energy: "rising" | "peak" | "declining" | "dormant";
  score: number;
  meaning: string;
  advice: string;
  areas: {
    career: number;
    wealth: number;
    love: number;
    health: number;
  };
}

// 12운성 정보
const TWELVE_FORTUNE_STARS: Record<string, TwelveFortuneStarInfo> = {
  "장생": {
    name: "jangseong",
    koreanName: "장생(長生)",
    stage: 1,
    energy: "rising",
    score: 85,
    meaning: "탄생과 시작의 기운, 새로운 가능성이 열림",
    advice: "새로운 시작에 좋은 시기, 계획 수립과 학습에 유리",
    areas: { career: 80, wealth: 70, love: 85, health: 90 }
  },
  "목욕": {
    name: "mokyok",
    koreanName: "목욕(沐浴)",
    stage: 2,
    energy: "rising",
    score: 60,
    meaning: "성장통의 시기, 불안정하지만 정화 중",
    advice: "감정 기복 주의, 충동적 결정 자제, 자기 정화에 집중",
    areas: { career: 50, wealth: 40, love: 70, health: 60 }
  },
  "관대": {
    name: "gwandae",
    koreanName: "관대(冠帶)",
    stage: 3,
    energy: "rising",
    score: 75,
    meaning: "성인이 되어 사회로 나감, 독립과 자립",
    advice: "자신감을 갖고 도전할 시기, 네트워킹에 좋음",
    areas: { career: 80, wealth: 65, love: 75, health: 75 }
  },
  "건록": {
    name: "geonrok",
    koreanName: "건록(建祿)",
    stage: 4,
    energy: "peak",
    score: 90,
    meaning: "왕성한 활동력, 직업적 성공의 기운",
    advice: "적극적 활동 추천, 승진/사업 확장에 최적",
    areas: { career: 95, wealth: 85, love: 70, health: 85 }
  },
  "제왕": {
    name: "jewang",
    koreanName: "제왕(帝旺)",
    stage: 5,
    energy: "peak",
    score: 95,
    meaning: "최고의 전성기, 권력과 영향력의 정점",
    advice: "리더십 발휘 최적, 단 오만함 경계 필요",
    areas: { career: 100, wealth: 90, love: 65, health: 80 }
  },
  "쇠": {
    name: "soe",
    koreanName: "쇠(衰)",
    stage: 6,
    energy: "declining",
    score: 55,
    meaning: "전성기 이후 서서히 기운이 빠짐",
    advice: "무리하지 말고 현상 유지, 건강 관리 시작",
    areas: { career: 60, wealth: 55, love: 60, health: 50 }
  },
  "병": {
    name: "byeong",
    koreanName: "병(病)",
    stage: 7,
    energy: "declining",
    score: 40,
    meaning: "기력 저하, 건강과 활력 주의 필요",
    advice: "휴식과 회복에 집중, 큰 결정 미루기",
    areas: { career: 40, wealth: 35, love: 45, health: 30 }
  },
  "사": {
    name: "sa",
    koreanName: "사(死)",
    stage: 8,
    energy: "dormant",
    score: 30,
    meaning: "한 사이클의 끝, 변화 직전의 정체",
    advice: "내면 성찰, 과거 정리, 새 시작 준비",
    areas: { career: 30, wealth: 25, love: 35, health: 35 }
  },
  "묘": {
    name: "myo",
    koreanName: "묘(墓)",
    stage: 9,
    energy: "dormant",
    score: 35,
    meaning: "저장과 축적의 시기, 잠재력 비축",
    advice: "저축/투자에 유리, 숨은 자원 발견 가능",
    areas: { career: 35, wealth: 50, love: 30, health: 40 }
  },
  "절": {
    name: "jeol",
    koreanName: "절(絶)",
    stage: 10,
    energy: "dormant",
    score: 25,
    meaning: "완전한 단절, 리셋의 시기",
    advice: "과거와의 완전한 결별, 새 인연/기회 대기",
    areas: { career: 25, wealth: 20, love: 25, health: 30 }
  },
  "태": {
    name: "tae",
    koreanName: "태(胎)",
    stage: 11,
    energy: "rising",
    score: 50,
    meaning: "새 생명의 잉태, 가능성의 씨앗",
    advice: "아이디어 구상, 계획 수립에 좋음",
    areas: { career: 45, wealth: 40, love: 55, health: 55 }
  },
  "양": {
    name: "yang",
    koreanName: "양(養)",
    stage: 12,
    energy: "rising",
    score: 65,
    meaning: "성장을 위한 양육, 준비 단계",
    advice: "학습과 준비에 최적, 실력 쌓기",
    areas: { career: 60, wealth: 55, love: 65, health: 70 }
  }
};

// 12운성 학파 유형
export type TwelveStarSchool = "standard" | "reverse-yin" | "unified";

/**
 * 천간별 12운성 기준표
 *
 * 학파별 차이:
 * 1. standard (기본/순행파): 양간은 순행, 음간도 순행 (현대 한국 주류)
 * 2. reverse-yin (역행파): 양간은 순행, 음간은 역행 (전통 중국 명리)
 * 3. unified (통일파): 양음간 모두 같은 오행의 양간 기준 (일부 학파)
 */

// 기본 테이블 (순행파 - 현대 한국 주류)
const TWELVE_STAR_TABLE_STANDARD: Record<string, Record<string, string>> = {
  "甲": { "亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양" },
  "乙": { "午": "장생", "巳": "목욕", "辰": "관대", "卯": "건록", "寅": "제왕", "丑": "쇠", "子": "병", "亥": "사", "戌": "묘", "酉": "절", "申": "태", "未": "양" },
  "丙": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "丁": { "酉": "장생", "申": "목욕", "未": "관대", "午": "건록", "巳": "제왕", "辰": "쇠", "卯": "병", "寅": "사", "丑": "묘", "子": "절", "亥": "태", "戌": "양" },
  "戊": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "己": { "酉": "장생", "申": "목욕", "未": "관대", "午": "건록", "巳": "제왕", "辰": "쇠", "卯": "병", "寅": "사", "丑": "묘", "子": "절", "亥": "태", "戌": "양" },
  "庚": { "巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양" },
  "辛": { "子": "장생", "亥": "목욕", "戌": "관대", "酉": "건록", "申": "제왕", "未": "쇠", "午": "병", "巳": "사", "辰": "묘", "卯": "절", "寅": "태", "丑": "양" },
  "壬": { "申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양" },
  "癸": { "卯": "장생", "寅": "목욕", "丑": "관대", "子": "건록", "亥": "제왕", "戌": "쇠", "酉": "병", "申": "사", "未": "묘", "午": "절", "巳": "태", "辰": "양" }
};

// 역행파 테이블 (음간 역순 - 전통 중국 명리)
// 음간(乙丁己辛癸)은 양간과 같은 장생 위치에서 역순으로 진행
const TWELVE_STAR_TABLE_REVERSE_YIN: Record<string, Record<string, string>> = {
  "甲": { "亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양" },
  // 乙은 甲과 같은 亥에서 장생, 역순
  "乙": { "亥": "장생", "戌": "목욕", "酉": "관대", "申": "건록", "未": "제왕", "午": "쇠", "巳": "병", "辰": "사", "卯": "묘", "寅": "절", "丑": "태", "子": "양" },
  "丙": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  // 丁은 丙과 같은 寅에서 장생, 역순
  "丁": { "寅": "장생", "丑": "목욕", "子": "관대", "亥": "건록", "戌": "제왕", "酉": "쇠", "申": "병", "未": "사", "午": "묘", "巳": "절", "辰": "태", "卯": "양" },
  "戊": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  // 己은 戊과 같은 寅에서 장생, 역순
  "己": { "寅": "장생", "丑": "목욕", "子": "관대", "亥": "건록", "戌": "제왕", "酉": "쇠", "申": "병", "未": "사", "午": "묘", "巳": "절", "辰": "태", "卯": "양" },
  "庚": { "巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양" },
  // 辛은 庚과 같은 巳에서 장생, 역순
  "辛": { "巳": "장생", "辰": "목욕", "卯": "관대", "寅": "건록", "丑": "제왕", "子": "쇠", "亥": "병", "戌": "사", "酉": "묘", "申": "절", "未": "태", "午": "양" },
  "壬": { "申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양" },
  // 癸는 壬과 같은 申에서 장생, 역순
  "癸": { "申": "장생", "未": "목욕", "午": "관대", "巳": "건록", "辰": "제왕", "卯": "쇠", "寅": "병", "丑": "사", "子": "묘", "亥": "절", "戌": "태", "酉": "양" }
};

// 통일파 테이블 (음간도 양간과 동일하게 적용)
const TWELVE_STAR_TABLE_UNIFIED: Record<string, Record<string, string>> = {
  "甲": { "亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양" },
  "乙": { "亥": "장생", "子": "목욕", "丑": "관대", "寅": "건록", "卯": "제왕", "辰": "쇠", "巳": "병", "午": "사", "未": "묘", "申": "절", "酉": "태", "戌": "양" },
  "丙": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "丁": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "戊": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "己": { "寅": "장생", "卯": "목욕", "辰": "관대", "巳": "건록", "午": "제왕", "未": "쇠", "申": "병", "酉": "사", "戌": "묘", "亥": "절", "子": "태", "丑": "양" },
  "庚": { "巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양" },
  "辛": { "巳": "장생", "午": "목욕", "未": "관대", "申": "건록", "酉": "제왕", "戌": "쇠", "亥": "병", "子": "사", "丑": "묘", "寅": "절", "卯": "태", "辰": "양" },
  "壬": { "申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양" },
  "癸": { "申": "장생", "酉": "목욕", "戌": "관대", "亥": "건록", "子": "제왕", "丑": "쇠", "寅": "병", "卯": "사", "辰": "묘", "巳": "절", "午": "태", "未": "양" }
};

// 현재 사용할 테이블 (기본값: standard)
let currentTwelveStarSchool: TwelveStarSchool = "standard";

/**
 * 12운성 학파 설정
 */
export function setTwelveStarSchool(school: TwelveStarSchool): void {
  currentTwelveStarSchool = school;
}

/**
 * 현재 12운성 학파 조회
 */
export function getTwelveStarSchool(): TwelveStarSchool {
  return currentTwelveStarSchool;
}

/**
 * 학파에 따른 12운성 테이블 반환
 */
function getTwelveStarTable(school?: TwelveStarSchool): Record<string, Record<string, string>> {
  const targetSchool = school || currentTwelveStarSchool;
  switch (targetSchool) {
    case "reverse-yin":
      return TWELVE_STAR_TABLE_REVERSE_YIN;
    case "unified":
      return TWELVE_STAR_TABLE_UNIFIED;
    case "standard":
    default:
      return TWELVE_STAR_TABLE_STANDARD;
  }
}

export interface TwelveStarAnalysis {
  dayMaster: string;
  targetBranch: string;
  starName: string;
  starInfo: TwelveFortuneStarInfo;
  interpretation: string;
}

/**
 * 12운성 분석 - 일간과 특정 지지의 관계
 * @param dayMaster 일간 (天干)
 * @param targetBranch 대상 지지 (地支)
 * @param school 12운성 학파 (선택사항, 기본값: 현재 설정된 학파)
 */
export function analyzeTwelveFortuneStar(
  dayMaster: string,
  targetBranch: string,
  school?: TwelveStarSchool
): TwelveStarAnalysis | null {
  const table = getTwelveStarTable(school);
  const stemTable = table[dayMaster];
  if (!stemTable) return null;

  const starName = stemTable[targetBranch];
  if (!starName) return null;

  const starInfo = TWELVE_FORTUNE_STARS[starName];
  if (!starInfo) return null;

  const schoolName = school || currentTwelveStarSchool;
  const schoolLabel = schoolName === "standard" ? "순행파" :
                      schoolName === "reverse-yin" ? "역행파" : "통일파";

  const interpretation = `${dayMaster}일간이 ${targetBranch}를 만나면 ${starInfo.koreanName} - ${starInfo.meaning} (${schoolLabel})`;

  return {
    dayMaster,
    targetBranch,
    starName,
    starInfo,
    interpretation
  };
}

/**
 * 오늘의 12운성 전체 분석 (년/월/일/시 각각)
 */
export function analyzeDayTwelveStars(
  dayMaster: string,
  yearBranch: string,
  monthBranch: string,
  dayBranch: string,
  hourBranch?: string
): {
  year: TwelveStarAnalysis | null;
  month: TwelveStarAnalysis | null;
  day: TwelveStarAnalysis | null;
  hour: TwelveStarAnalysis | null;
  overallEnergy: "rising" | "peak" | "declining" | "dormant";
  averageScore: number;
  summary: string;
} {
  const year = analyzeTwelveFortuneStar(dayMaster, yearBranch);
  const month = analyzeTwelveFortuneStar(dayMaster, monthBranch);
  const day = analyzeTwelveFortuneStar(dayMaster, dayBranch);
  const hour = hourBranch ? analyzeTwelveFortuneStar(dayMaster, hourBranch) : null;

  // 평균 점수 계산
  const scores = [year, month, day, hour].filter(Boolean).map(s => s!.starInfo.score);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;

  // 주요 에너지 판단 (일주 기준, 없으면 월주)
  const primaryStar = day || month;
  const overallEnergy = primaryStar?.starInfo.energy || "dormant";

  // 요약 생성
  let summary = "";
  if (averageScore >= 80) {
    summary = "전성기의 기운! 적극적 활동에 최적";
  } else if (averageScore >= 60) {
    summary = "상승세의 기운, 새로운 도전 권장";
  } else if (averageScore >= 40) {
    summary = "안정적 흐름, 현상 유지 추천";
  } else {
    summary = "재충전 시기, 휴식과 내면 성찰";
  }

  return {
    year,
    month,
    day,
    hour,
    overallEnergy,
    averageScore,
    summary
  };
}

// ========================================
// 형살(刑殺) 상세 분석
// ========================================

export interface HyungSalDetail {
  type: "자형" | "삼형" | "무은지형" | "상형";
  branches: string[];
  severity: "high" | "medium" | "low";
  score: number;
  meaning: string;
  warning: string;
  mitigation: string;
}

// 형살 유형별 정보
const HYUNG_SAL_PATTERNS: HyungSalDetail[] = [
  // 자형(自刑) - 같은 지지끼리의 형
  {
    type: "자형",
    branches: ["辰", "辰"],
    severity: "medium",
    score: -15,
    meaning: "진토끼리의 자형 - 고집과 외로움",
    warning: "자기 고집으로 인한 갈등",
    mitigation: "유연한 사고와 타협 필요"
  },
  {
    type: "자형",
    branches: ["午", "午"],
    severity: "medium",
    score: -15,
    meaning: "오화끼리의 자형 - 성급함과 충동",
    warning: "급한 성격으로 인한 실수",
    mitigation: "인내심과 냉정함 필요"
  },
  {
    type: "자형",
    branches: ["酉", "酉"],
    severity: "medium",
    score: -15,
    meaning: "유금끼리의 자형 - 날카로움과 비판",
    warning: "지나친 비판으로 인한 고립",
    mitigation: "관용과 포용력 필요"
  },
  {
    type: "자형",
    branches: ["亥", "亥"],
    severity: "medium",
    score: -15,
    meaning: "해수끼리의 자형 - 우유부단함",
    warning: "결단력 부족으로 기회 상실",
    mitigation: "결단력과 실행력 필요"
  },
  // 삼형(三刑) - 세 지지의 형
  {
    type: "삼형",
    branches: ["寅", "巳", "申"],
    severity: "high",
    score: -30,
    meaning: "인사신 삼형 - 무은지형(無恩之刑), 은혜를 모르는 형",
    warning: "배신, 소송, 관재구설 주의",
    mitigation: "감사하는 마음, 법적 문제 조심"
  },
  {
    type: "삼형",
    branches: ["丑", "戌", "未"],
    severity: "high",
    score: -25,
    meaning: "축술미 삼형 - 지세지형(持勢之刑), 세력 다툼의 형",
    warning: "권력 다툼, 재산 분쟁 주의",
    mitigation: "욕심을 내려놓고 양보"
  },
  {
    type: "삼형",
    branches: ["子", "卯"],
    severity: "medium",
    score: -20,
    meaning: "자묘형 - 무례지형(無禮之刑), 예의 없는 형",
    warning: "예의 문제, 성적 스캔들 주의",
    mitigation: "예절과 절제 필요"
  },
  // 상형(相刑) - 두 지지의 형
  {
    type: "상형",
    branches: ["寅", "巳"],
    severity: "medium",
    score: -18,
    meaning: "인사형 - 상호 해침",
    warning: "가까운 사람과의 갈등",
    mitigation: "소통과 이해 필요"
  },
  {
    type: "상형",
    branches: ["巳", "申"],
    severity: "medium",
    score: -18,
    meaning: "사신형 - 상호 견제",
    warning: "경쟁자와의 마찰",
    mitigation: "협력과 상생 모색"
  },
  {
    type: "상형",
    branches: ["申", "寅"],
    severity: "medium",
    score: -18,
    meaning: "신인형 - 상호 충돌",
    warning: "권위와의 충돌",
    mitigation: "겸손함 유지"
  }
];

/**
 * 형살 상세 분석
 */
export function analyzeHyungSalDetail(branches: string[]): HyungSalDetail[] {
  const results: HyungSalDetail[] = [];

  for (const pattern of HYUNG_SAL_PATTERNS) {
    if (pattern.type === "자형") {
      // 자형은 같은 지지가 2개 이상 있을 때
      const targetBranch = pattern.branches[0];
      const count = branches.filter(b => b === targetBranch).length;
      if (count >= 2) {
        results.push(pattern);
      }
    } else if (pattern.type === "삼형" && pattern.branches.length === 3) {
      // 삼형은 세 지지가 모두 있을 때
      const hasAll = pattern.branches.every(b => branches.includes(b));
      if (hasAll) {
        results.push(pattern);
      }
    } else if (pattern.type === "삼형" && pattern.branches.length === 2) {
      // 자묘형 같은 2개짜리
      const hasAll = pattern.branches.every(b => branches.includes(b));
      if (hasAll) {
        results.push(pattern);
      }
    } else if (pattern.type === "상형") {
      // 상형은 두 지지가 있을 때
      const hasAll = pattern.branches.every(b => branches.includes(b));
      if (hasAll) {
        results.push(pattern);
      }
    }
  }

  return results;
}

// ========================================
// 공망(空亡) 해소 조건 분석
// ========================================

export interface GongmangResolution {
  gongmangBranch: string;
  isResolved: boolean;
  resolutionType: "합" | "충" | "형" | "none";
  resolvingBranch?: string;
  explanation: string;
}

// 육합 관계
const YUKAP_PAIRS: Record<string, string> = {
  "子": "丑", "丑": "子",
  "寅": "亥", "亥": "寅",
  "卯": "戌", "戌": "卯",
  "辰": "酉", "酉": "辰",
  "巳": "申", "申": "巳",
  "午": "未", "未": "午"
};

// 삼합 관계 (배열 형태)
const SAMHAP_BRANCH_ARRAYS = [
  ["寅", "午", "戌"], // 화국
  ["巳", "酉", "丑"], // 금국
  ["申", "子", "辰"], // 수국
  ["亥", "卯", "未"]  // 목국
];

/**
 * 공망 해소 여부 분석
 */
export function analyzeGongmangResolution(
  gongmangBranches: string[],
  presentBranches: string[]
): GongmangResolution[] {
  const results: GongmangResolution[] = [];

  for (const gongmang of gongmangBranches) {
    let isResolved = false;
    let resolutionType: "합" | "충" | "형" | "none" = "none";
    let resolvingBranch: string | undefined;
    let explanation = `${gongmang}은(는) 공망 상태`;

    // 육합으로 해소 확인
    const yukahpPartner = YUKAP_PAIRS[gongmang];
    if (yukahpPartner && presentBranches.includes(yukahpPartner)) {
      isResolved = true;
      resolutionType = "합";
      resolvingBranch = yukahpPartner;
      explanation = `${gongmang}이 ${yukahpPartner}과 육합하여 공망 해소`;
    }

    // 삼합으로 해소 확인 (삼합의 다른 두 지지가 있으면)
    if (!isResolved) {
      for (const group of SAMHAP_BRANCH_ARRAYS) {
        if (group.includes(gongmang)) {
          const others = group.filter((b: string) => b !== gongmang);
          const hasOthers = others.filter((b: string) => presentBranches.includes(b));
          if (hasOthers.length === 2) {
            isResolved = true;
            resolutionType = "합";
            resolvingBranch = others.join(", ");
            explanation = `${gongmang}이 삼합(${group.join("")})으로 공망 해소`;
            break;
          }
        }
      }
    }

    results.push({
      gongmangBranch: gongmang,
      isResolved,
      resolutionType,
      resolvingBranch,
      explanation
    });
  }

  return results;
}

// ========================================
// 행성 품위(Dignity) 분석
// ========================================

export interface PlanetDignity {
  planet: string;
  sign: string;
  dignityType: "domicile" | "exaltation" | "detriment" | "fall" | "peregrine";
  score: number;
  meaning: string;
  effect: string;
}

// 행성별 품위 데이터
const PLANET_DIGNITIES: Record<string, {
  domicile: string[];     // 본거지 (가장 강함)
  exaltation: string;     // 고양 (강함)
  detriment: string[];    // 손해 (약함)
  fall: string;           // 추락 (가장 약함)
}> = {
  "Sun": {
    domicile: ["Leo"],
    exaltation: "Aries",
    detriment: ["Aquarius"],
    fall: "Libra"
  },
  "Moon": {
    domicile: ["Cancer"],
    exaltation: "Taurus",
    detriment: ["Capricorn"],
    fall: "Scorpio"
  },
  "Mercury": {
    domicile: ["Gemini", "Virgo"],
    exaltation: "Virgo",
    detriment: ["Sagittarius", "Pisces"],
    fall: "Pisces"
  },
  "Venus": {
    domicile: ["Taurus", "Libra"],
    exaltation: "Pisces",
    detriment: ["Scorpio", "Aries"],
    fall: "Virgo"
  },
  "Mars": {
    domicile: ["Aries", "Scorpio"],
    exaltation: "Capricorn",
    detriment: ["Libra", "Taurus"],
    fall: "Cancer"
  },
  "Jupiter": {
    domicile: ["Sagittarius", "Pisces"],
    exaltation: "Cancer",
    detriment: ["Gemini", "Virgo"],
    fall: "Capricorn"
  },
  "Saturn": {
    domicile: ["Capricorn", "Aquarius"],
    exaltation: "Libra",
    detriment: ["Cancer", "Leo"],
    fall: "Aries"
  },
  "Uranus": {
    domicile: ["Aquarius"],
    exaltation: "Scorpio",
    detriment: ["Leo"],
    fall: "Taurus"
  },
  "Neptune": {
    domicile: ["Pisces"],
    exaltation: "Leo",
    detriment: ["Virgo"],
    fall: "Aquarius"
  },
  "Pluto": {
    domicile: ["Scorpio"],
    exaltation: "Aries",
    detriment: ["Taurus"],
    fall: "Libra"
  }
};

const DIGNITY_MEANINGS: Record<string, { score: number; meaning: string; effect: string }> = {
  domicile: {
    score: 30,
    meaning: "본거지 - 행성이 가장 편안하고 강력하게 작용",
    effect: "해당 행성의 에너지가 순수하고 강하게 발현"
  },
  exaltation: {
    score: 25,
    meaning: "고양 - 행성이 최고의 영광을 누림",
    effect: "행성 에너지가 고귀하고 이상적으로 표현"
  },
  detriment: {
    score: -20,
    meaning: "손해 - 행성이 불편한 위치",
    effect: "에너지 발현에 어려움, 내적 갈등 가능"
  },
  fall: {
    score: -25,
    meaning: "추락 - 행성이 가장 약한 위치",
    effect: "에너지가 왜곡되거나 억압됨"
  },
  peregrine: {
    score: 0,
    meaning: "방랑 - 특별한 품위 없음",
    effect: "중립적 에너지, 다른 요소에 의해 영향받음"
  }
};

/**
 * 특정 행성의 품위 분석
 */
export function analyzePlanetDignity(planet: string, sign: string): PlanetDignity {
  const dignityData = PLANET_DIGNITIES[planet];

  if (!dignityData) {
    return {
      planet,
      sign,
      dignityType: "peregrine",
      score: 0,
      meaning: "해당 행성의 품위 데이터 없음",
      effect: "분석 불가"
    };
  }

  let dignityType: "domicile" | "exaltation" | "detriment" | "fall" | "peregrine" = "peregrine";

  if (dignityData.domicile.includes(sign)) {
    dignityType = "domicile";
  } else if (dignityData.exaltation === sign) {
    dignityType = "exaltation";
  } else if (dignityData.detriment.includes(sign)) {
    dignityType = "detriment";
  } else if (dignityData.fall === sign) {
    dignityType = "fall";
  }

  const dignityInfo = DIGNITY_MEANINGS[dignityType];

  return {
    planet,
    sign,
    dignityType,
    score: dignityInfo.score,
    meaning: dignityInfo.meaning,
    effect: dignityInfo.effect
  };
}

/**
 * 모든 행성의 품위 분석
 */
export function analyzeAllPlanetDignities(
  planetPositions: Record<string, { sign: string }>
): {
  dignities: PlanetDignity[];
  totalScore: number;
  strongPlanets: string[];
  weakPlanets: string[];
  summary: string;
} {
  const dignities: PlanetDignity[] = [];
  const strongPlanets: string[] = [];
  const weakPlanets: string[] = [];

  for (const [planet, position] of Object.entries(planetPositions)) {
    const dignity = analyzePlanetDignity(planet, position.sign);
    dignities.push(dignity);

    if (dignity.dignityType === "domicile" || dignity.dignityType === "exaltation") {
      strongPlanets.push(planet);
    } else if (dignity.dignityType === "detriment" || dignity.dignityType === "fall") {
      weakPlanets.push(planet);
    }
  }

  const totalScore = dignities.reduce((sum, d) => sum + d.score, 0);

  let summary = "";
  if (strongPlanets.length > weakPlanets.length) {
    summary = `품위가 좋은 행성이 많음 (${strongPlanets.join(", ")}). 전반적으로 유리한 배치.`;
  } else if (weakPlanets.length > strongPlanets.length) {
    summary = `품위가 약한 행성 주의 (${weakPlanets.join(", ")}). 해당 영역에서 추가 노력 필요.`;
  } else {
    summary = "행성 품위가 균형잡혀 있음. 특별한 강약점 없이 안정적.";
  }

  return {
    dignities,
    totalScore,
    strongPlanets,
    weakPlanets,
    summary
  };
}

// ========================================
// 릴리스(Black Moon Lilith) 분석
// ========================================

export interface LilithAnalysis {
  sign: string;
  house?: number;
  theme: string;
  shadowAspect: string;
  desire: string;
  healing: string;
  score: number;
}

const LILITH_BY_SIGN: Record<string, {
  theme: string;
  shadowAspect: string;
  desire: string;
  healing: string;
}> = {
  "Aries": {
    theme: "억압된 분노와 자기주장",
    shadowAspect: "공격성, 충동적 행동, 지배욕",
    desire: "자유롭게 자신을 표현하고 싶은 갈망",
    healing: "건강한 방식으로 분노 표현, 독립성 존중"
  },
  "Taurus": {
    theme: "물질적 욕망과 소유욕",
    shadowAspect: "탐욕, 집착, 관능적 탐닉",
    desire: "물질적 안정과 감각적 쾌락",
    healing: "물질과 영혼의 균형, 감사 연습"
  },
  "Gemini": {
    theme: "소통과 지식의 그림자",
    shadowAspect: "거짓말, 이중성, 피상적 관계",
    desire: "모든 것을 알고 싶은 호기심",
    healing: "진실된 소통, 깊은 연결"
  },
  "Cancer": {
    theme: "감정적 상처와 보호본능",
    shadowAspect: "과잉보호, 의존, 정서적 조종",
    desire: "절대적 안전과 무조건적 사랑",
    healing: "자기 돌봄, 건강한 경계 설정"
  },
  "Leo": {
    theme: "인정욕구와 자존심",
    shadowAspect: "과시욕, 자기도취, 권력욕",
    desire: "특별함과 찬사를 받고 싶음",
    healing: "내면의 가치 인정, 겸손"
  },
  "Virgo": {
    theme: "완벽주의와 비판",
    shadowAspect: "자기비하, 강박, 수치심",
    desire: "완벽한 존재가 되고 싶음",
    healing: "불완전함 수용, 자기 연민"
  },
  "Libra": {
    theme: "관계와 균형의 그림자",
    shadowAspect: "의존, 갈등 회피, 가면",
    desire: "완벽한 파트너십",
    healing: "자기 의견 표현, 혼자만의 시간"
  },
  "Scorpio": {
    theme: "권력과 변환의 깊은 욕망",
    shadowAspect: "집착, 복수, 조종",
    desire: "절대적 통제와 친밀함",
    healing: "신뢰 구축, 취약함 허용"
  },
  "Sagittarius": {
    theme: "자유와 진리의 추구",
    shadowAspect: "과잉 낙관, 책임 회피, 독단",
    desire: "한계 없는 자유와 의미",
    healing: "현실 직시, 책임감"
  },
  "Capricorn": {
    theme: "성취와 통제의 그림자",
    shadowAspect: "냉정함, 일중독, 권위주의",
    desire: "절대적 성공과 인정",
    healing: "감정 허용, 과정 즐기기"
  },
  "Aquarius": {
    theme: "개혁과 소외",
    shadowAspect: "반항, 감정적 분리, 냉소",
    desire: "완전한 독립과 혁명",
    healing: "감정적 연결, 친밀함 허용"
  },
  "Pisces": {
    theme: "환상과 도피",
    shadowAspect: "중독, 자기희생, 현실 회피",
    desire: "절대적 합일과 초월",
    healing: "경계 설정, 현실과 영성의 균형"
  }
};

/**
 * 릴리스(Black Moon) 분석
 */
export function analyzeLilith(sign: string, house?: number): LilithAnalysis {
  const signData = LILITH_BY_SIGN[sign];

  if (!signData) {
    return {
      sign,
      house,
      theme: "알 수 없음",
      shadowAspect: "분석 불가",
      desire: "분석 불가",
      healing: "분석 불가",
      score: 0
    };
  }

  // 하우스별 추가 해석
  let houseEffect = "";
  if (house) {
    const houseThemes: Record<number, string> = {
      1: "자아 정체성에 영향",
      2: "재정과 가치관에 영향",
      3: "소통과 학습에 영향",
      4: "가정과 뿌리에 영향",
      5: "창조성과 로맨스에 영향",
      6: "일상과 건강에 영향",
      7: "파트너십에 영향",
      8: "변환과 친밀함에 영향",
      9: "철학과 여행에 영향",
      10: "커리어와 명성에 영향",
      11: "우정과 이상에 영향",
      12: "무의식과 영성에 영향"
    };
    houseEffect = houseThemes[house] || "";
  }

  return {
    sign,
    house,
    theme: signData.theme + (houseEffect ? ` (${houseEffect})` : ""),
    shadowAspect: signData.shadowAspect,
    desire: signData.desire,
    healing: signData.healing,
    score: 0 // 릴리스는 점수보다 인식이 중요
  };
}

// ========================================
// 파트 오브 포춘(Part of Fortune) 분석
// ========================================

export interface PartOfFortuneAnalysis {
  sign: string;
  house?: number;
  luckArea: string;
  howToActivate: string;
  challenges: string;
  timing: string;
  score: number;
}

const POF_BY_SIGN: Record<string, {
  luckArea: string;
  howToActivate: string;
  challenges: string;
  timing: string;
}> = {
  "Aries": {
    luckArea: "리더십, 새로운 시작, 독립적 활동",
    howToActivate: "과감하게 시작하고 먼저 행동하기",
    challenges: "성급함과 충동 조절",
    timing: "화요일, 양자리 시즌, 일출 시간대"
  },
  "Taurus": {
    luckArea: "재정, 부동산, 예술, 안정적 투자",
    howToActivate: "꾸준함과 인내로 가치 축적",
    challenges: "변화에 대한 저항",
    timing: "금요일, 황소자리 시즌, 저녁 시간"
  },
  "Gemini": {
    luckArea: "소통, 글쓰기, 네트워킹, 교육",
    howToActivate: "다양한 사람과 아이디어 교류",
    challenges: "집중력 유지",
    timing: "수요일, 쌍둥이자리 시즌, 오전 중"
  },
  "Cancer": {
    luckArea: "가정, 가족사업, 부동산, 케어",
    howToActivate: "가족과 공동체를 돌보기",
    challenges: "과거에 대한 집착",
    timing: "월요일, 게자리 시즌, 달이 밝을 때"
  },
  "Leo": {
    luckArea: "창작, 엔터테인먼트, 리더십, 투자",
    howToActivate: "자신감 있게 자기표현하기",
    challenges: "자존심 관리",
    timing: "일요일, 사자자리 시즌, 정오"
  },
  "Virgo": {
    luckArea: "건강, 서비스, 분석, 기술직",
    howToActivate: "디테일에 집중하고 봉사하기",
    challenges: "완벽주의 완화",
    timing: "수요일, 처녀자리 시즌, 오전"
  },
  "Libra": {
    luckArea: "파트너십, 예술, 법률, 외교",
    howToActivate: "협력과 조화 추구",
    challenges: "우유부단함 극복",
    timing: "금요일, 천칭자리 시즌, 일몰"
  },
  "Scorpio": {
    luckArea: "투자, 상속, 연구, 변혁적 일",
    howToActivate: "깊이 파고들고 변화 수용",
    challenges: "신뢰와 집착",
    timing: "화요일, 전갈자리 시즌, 밤"
  },
  "Sagittarius": {
    luckArea: "교육, 출판, 해외, 철학",
    howToActivate: "시야 넓히고 모험하기",
    challenges: "현실성 유지",
    timing: "목요일, 사수자리 시즌, 오후"
  },
  "Capricorn": {
    luckArea: "커리어, 비즈니스, 권위, 구조",
    howToActivate: "장기 계획과 책임감",
    challenges: "경직성 완화",
    timing: "토요일, 염소자리 시즌, 새벽"
  },
  "Aquarius": {
    luckArea: "기술, 혁신, 커뮤니티, 미래산업",
    howToActivate: "독창적 아이디어와 네트워크",
    challenges: "감정적 연결",
    timing: "토요일, 물병자리 시즌, 밤"
  },
  "Pisces": {
    luckArea: "예술, 영성, 치유, 창작",
    howToActivate: "직관을 따르고 영감받기",
    challenges: "현실과의 균형",
    timing: "목요일, 물고기자리 시즌, 명상 시간"
  }
};

/**
 * 파트 오브 포춘 분석
 */
export function analyzePartOfFortune(sign: string, house?: number): PartOfFortuneAnalysis {
  const signData = POF_BY_SIGN[sign];

  if (!signData) {
    return {
      sign,
      house,
      luckArea: "알 수 없음",
      howToActivate: "분석 불가",
      challenges: "분석 불가",
      timing: "분석 불가",
      score: 50
    };
  }

  // 하우스별 강화
  let houseBonus = "";
  let score = 70;
  if (house) {
    if ([1, 5, 9, 11].includes(house)) {
      houseBonus = " (행운의 하우스에 위치!)";
      score = 90;
    } else if ([4, 7, 10].includes(house)) {
      houseBonus = " (앵글 하우스에서 강력)";
      score = 85;
    }
  }

  return {
    sign,
    house,
    luckArea: signData.luckArea + houseBonus,
    howToActivate: signData.howToActivate,
    challenges: signData.challenges,
    timing: signData.timing,
    score
  };
}

// ========================================
// 월별/주간 테마 분석
// ========================================

export interface PeriodTheme {
  period: "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
  mainTheme: string;
  subThemes: string[];
  luckyDays: number[];
  challenges: string[];
  advice: string;
  score: number;
}

/**
 * 월간 테마 분석 (세운/월운 기반)
 */
export function analyzeMonthlyTheme(
  year: number,
  month: number,
  dayMaster: string,
  dayMasterElement: string,
  yongsinElement?: string
): PeriodTheme {
  // 월간지 계산 (간략화)
  const monthStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const monthBranches = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];

  // 간략화된 월간지 (실제로는 만세력 기반 계산 필요)
  const monthStem = monthStems[(year * 12 + month) % 10];
  const monthBranch = monthBranches[(month - 1) % 12];

  const stemElement = getStemElement(monthStem);
  const branchElement = getBranchElement(monthBranch);

  // 오행 관계 분석
  const relationships = getElementRelationship(dayMasterElement);

  let mainTheme = "";
  let subThemes: string[] = [];
  let score = 50;
  const challenges: string[] = [];

  // 용신 월이면 최고
  if (yongsinElement && (stemElement === yongsinElement || branchElement === yongsinElement)) {
    mainTheme = "용신의 달 - 최상의 운세!";
    subThemes = ["모든 일에 순풍", "주요 결정에 좋은 시기"];
    score = 95;
  }
  // 생을 받으면 좋음
  else if (stemElement === relationships.generatedBy || branchElement === relationships.generatedBy) {
    mainTheme = "생기 충만의 달";
    subThemes = ["에너지 상승", "건강 개선"];
    score = 80;
  }
  // 비겁이면 경쟁과 협력
  else if (stemElement === dayMasterElement || branchElement === dayMasterElement) {
    mainTheme = "비겁의 달 - 동료와 경쟁";
    subThemes = ["협력과 경쟁 병존", "자기 주장 필요"];
    challenges.push("동료와의 갈등 주의");
    score = 60;
  }
  // 설기면 표현과 지출
  else if (stemElement === relationships.generates || branchElement === relationships.generates) {
    mainTheme = "식상의 달 - 표현과 창작";
    subThemes = ["창의력 상승", "지출 증가 가능"];
    challenges.push("과도한 에너지 소모 주의");
    score = 70;
  }
  // 재성이면 재물운
  else if (stemElement === relationships.controls || branchElement === relationships.controls) {
    mainTheme = "재성의 달 - 재물과 기회";
    subThemes = ["수입 증가 가능", "투자 기회"];
    challenges.push("무리한 투자 주의");
    score = 75;
  }
  // 관성이면 압박
  else if (stemElement === relationships.controlledBy || branchElement === relationships.controlledBy) {
    mainTheme = "관성의 달 - 책임과 압박";
    subThemes = ["승진/시험 기회", "책임 증가"];
    challenges.push("스트레스 관리 필요", "건강 주의");
    score = 55;
  }
  else {
    mainTheme = "평온한 달";
    subThemes = ["큰 변화 없음", "안정적 흐름"];
    score = 60;
  }

  // 행운의 날 계산 (용신 오행이 강한 날)
  const luckyDays: number[] = [];
  for (let day = 1; day <= 28; day++) {
    if ((day + month) % 5 === 0) { // 간략화된 계산
      luckyDays.push(day);
    }
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return {
    period: "monthly",
    startDate,
    endDate,
    mainTheme,
    subThemes,
    luckyDays,
    challenges,
    advice: `이번 달은 ${mainTheme.split(" - ")[0]}입니다. ${subThemes[0] || ""}`,
    score
  };
}

/**
 * 주간 테마 분석
 */
export function analyzeWeeklyTheme(
  startDate: Date,
  dayMaster: string,
  dayMasterElement: string,
  yongsinElement?: string
): PeriodTheme {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  // 주간 주요 일진 분석 (시작일 기준)
  const dayOfWeek = startDate.getDay();

  let mainTheme = "";
  const subThemes: string[] = [];
  const challenges: string[] = [];
  let score = 60;

  // 요일별 기본 테마
  const weekdayThemes = [
    { theme: "휴식과 재충전", sub: ["가족 시간", "영적 활동"] },
    { theme: "새로운 시작", sub: ["계획 수립", "미팅 잡기"] },
    { theme: "소통과 학습", sub: ["회의", "교육"] },
    { theme: "확장과 성장", sub: ["네트워킹", "기회 탐색"] },
    { theme: "구조화와 정리", sub: ["마감", "정리"] },
    { theme: "사교와 즐거움", sub: ["데이트", "여가"] },
    { theme: "성찰과 마무리", sub: ["주간 정리", "다음 주 준비"] }
  ];

  const weekTheme = weekdayThemes[dayOfWeek];
  mainTheme = `${weekTheme.theme}의 주`;
  subThemes.push(...weekTheme.sub);

  // 용신 기반 조정
  if (yongsinElement) {
    if (yongsinElement === "water") {
      subThemes.push("수요일 특히 유리");
    } else if (yongsinElement === "wood") {
      subThemes.push("목요일 특히 유리");
    } else if (yongsinElement === "fire") {
      subThemes.push("화요일 특히 유리");
    } else if (yongsinElement === "metal") {
      subThemes.push("금요일 특히 유리");
    } else if (yongsinElement === "earth") {
      subThemes.push("토요일 특히 유리");
    }
    score += 10;
  }

  // 행운의 날 (주 내)
  const luckyDays = [1, 3, 5].map(offset => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    return d.getDate();
  });

  return {
    period: "weekly",
    startDate,
    endDate,
    mainTheme,
    subThemes,
    luckyDays,
    challenges,
    advice: `이번 주는 ${mainTheme}. ${subThemes[0] || ""}에 집중하세요.`,
    score
  };
}

// 헬퍼 함수: 천간의 오행
function getStemElement(stem: string): string {
  const stemElements: Record<string, string> = {
    "甲": "wood", "乙": "wood",
    "丙": "fire", "丁": "fire",
    "戊": "earth", "己": "earth",
    "庚": "metal", "辛": "metal",
    "壬": "water", "癸": "water"
  };
  return stemElements[stem] || "earth";
}

// 헬퍼 함수: 지지의 오행
function getBranchElement(branch: string): string {
  const branchElements: Record<string, string> = {
    "寅": "wood", "卯": "wood",
    "巳": "fire", "午": "fire",
    "辰": "earth", "戌": "earth", "丑": "earth", "未": "earth",
    "申": "metal", "酉": "metal",
    "亥": "water", "子": "water"
  };
  return branchElements[branch] || "earth";
}

// 헬퍼 함수: 오행 관계
function getElementRelationship(element: string): {
  generates: string;
  generatedBy: string;
  controls: string;
  controlledBy: string;
} {
  const cycle: Record<string, { generates: string; generatedBy: string; controls: string; controlledBy: string }> = {
    "wood": { generates: "fire", generatedBy: "water", controls: "earth", controlledBy: "metal" },
    "fire": { generates: "earth", generatedBy: "wood", controls: "metal", controlledBy: "water" },
    "earth": { generates: "metal", generatedBy: "fire", controls: "water", controlledBy: "wood" },
    "metal": { generates: "water", generatedBy: "earth", controls: "wood", controlledBy: "fire" },
    "water": { generates: "wood", generatedBy: "metal", controls: "fire", controlledBy: "earth" }
  };
  return cycle[element] || cycle["earth"];
}

// ========================================
// 납음(納音) 오행 분석
// ========================================

export interface NapeumAnalysis {
  stem: string;
  branch: string;
  napeumName: string;
  element: string;
  meaning: string;
  score: number;
}

// 60갑자 납음 오행표
const NAPEUM_TABLE: Record<string, { name: string; element: string; meaning: string }> = {
  "甲子": { name: "해중금", element: "metal", meaning: "바다 속 금 - 숨겨진 재능" },
  "乙丑": { name: "해중금", element: "metal", meaning: "바다 속 금 - 숨겨진 재능" },
  "丙寅": { name: "노중화", element: "fire", meaning: "화덕 속 불 - 강한 열정" },
  "丁卯": { name: "노중화", element: "fire", meaning: "화덕 속 불 - 강한 열정" },
  "戊辰": { name: "대림목", element: "wood", meaning: "큰 숲의 나무 - 성장과 번영" },
  "己巳": { name: "대림목", element: "wood", meaning: "큰 숲의 나무 - 성장과 번영" },
  "庚午": { name: "노방토", element: "earth", meaning: "길가의 흙 - 실용적 기반" },
  "辛未": { name: "노방토", element: "earth", meaning: "길가의 흙 - 실용적 기반" },
  "壬申": { name: "검봉금", element: "metal", meaning: "칼날의 금 - 날카로운 판단" },
  "癸酉": { name: "검봉금", element: "metal", meaning: "칼날의 금 - 날카로운 판단" },
  "甲戌": { name: "산두화", element: "fire", meaning: "산 위의 불 - 밝은 비전" },
  "乙亥": { name: "산두화", element: "fire", meaning: "산 위의 불 - 밝은 비전" },
  "丙子": { name: "간하수", element: "water", meaning: "계곡의 물 - 깊은 지혜" },
  "丁丑": { name: "간하수", element: "water", meaning: "계곡의 물 - 깊은 지혜" },
  "戊寅": { name: "성두토", element: "earth", meaning: "성벽의 흙 - 견고한 방어" },
  "己卯": { name: "성두토", element: "earth", meaning: "성벽의 흙 - 견고한 방어" },
  "庚辰": { name: "백랍금", element: "metal", meaning: "백납의 금 - 순수한 가치" },
  "辛巳": { name: "백랍금", element: "metal", meaning: "백납의 금 - 순수한 가치" },
  "壬午": { name: "양류목", element: "wood", meaning: "버드나무 - 유연한 적응" },
  "癸未": { name: "양류목", element: "wood", meaning: "버드나무 - 유연한 적응" },
  "甲申": { name: "천천수", element: "water", meaning: "샘물 - 끊임없는 창의" },
  "乙酉": { name: "천천수", element: "water", meaning: "샘물 - 끊임없는 창의" },
  "丙戌": { name: "옥상토", element: "earth", meaning: "지붕 위 흙 - 높은 이상" },
  "丁亥": { name: "옥상토", element: "earth", meaning: "지붕 위 흙 - 높은 이상" },
  "戊子": { name: "벽력화", element: "fire", meaning: "번개 불 - 순간적 통찰" },
  "己丑": { name: "벽력화", element: "fire", meaning: "번개 불 - 순간적 통찰" },
  "庚寅": { name: "송백목", element: "wood", meaning: "소나무 - 불굴의 의지" },
  "辛卯": { name: "송백목", element: "wood", meaning: "소나무 - 불굴의 의지" },
  "壬辰": { name: "장류수", element: "water", meaning: "긴 흐르는 물 - 지속적 발전" },
  "癸巳": { name: "장류수", element: "water", meaning: "긴 흐르는 물 - 지속적 발전" },
  "甲午": { name: "사중금", element: "metal", meaning: "모래 속 금 - 숨은 기회" },
  "乙未": { name: "사중금", element: "metal", meaning: "모래 속 금 - 숨은 기회" },
  "丙申": { name: "산하화", element: "fire", meaning: "산 아래 불 - 내면의 열정" },
  "丁酉": { name: "산하화", element: "fire", meaning: "산 아래 불 - 내면의 열정" },
  "戊戌": { name: "평지목", element: "wood", meaning: "평지의 나무 - 안정적 성장" },
  "己亥": { name: "평지목", element: "wood", meaning: "평지의 나무 - 안정적 성장" },
  "庚子": { name: "벽상토", element: "earth", meaning: "벽 위의 흙 - 보호와 안정" },
  "辛丑": { name: "벽상토", element: "earth", meaning: "벽 위의 흙 - 보호와 안정" },
  "壬寅": { name: "금박금", element: "metal", meaning: "금박 - 화려한 표현" },
  "癸卯": { name: "금박금", element: "metal", meaning: "금박 - 화려한 표현" },
  "甲辰": { name: "복등화", element: "fire", meaning: "등불 - 어둠을 밝히는 지혜" },
  "乙巳": { name: "복등화", element: "fire", meaning: "등불 - 어둠을 밝히는 지혜" },
  "丙午": { name: "천하수", element: "water", meaning: "하늘의 물(비) - 은혜와 축복" },
  "丁未": { name: "천하수", element: "water", meaning: "하늘의 물(비) - 은혜와 축복" },
  "戊申": { name: "대역토", element: "earth", meaning: "큰 역토 - 광대한 가능성" },
  "己酉": { name: "대역토", element: "earth", meaning: "큰 역토 - 광대한 가능성" },
  "庚戌": { name: "차천금", element: "metal", meaning: "비녀 금 - 아름다운 정제" },
  "辛亥": { name: "차천금", element: "metal", meaning: "비녀 금 - 아름다운 정제" },
  "壬子": { name: "상자목", element: "wood", meaning: "뽕나무 - 실용적 가치" },
  "癸丑": { name: "상자목", element: "wood", meaning: "뽕나무 - 실용적 가치" },
  "甲寅": { name: "대계수", element: "water", meaning: "큰 시냇물 - 풍요로운 흐름" },
  "乙卯": { name: "대계수", element: "water", meaning: "큰 시냇물 - 풍요로운 흐름" },
  "丙辰": { name: "사중토", element: "earth", meaning: "모래 속 흙 - 잠재적 기반" },
  "丁巳": { name: "사중토", element: "earth", meaning: "모래 속 흙 - 잠재적 기반" },
  "戊午": { name: "천상화", element: "fire", meaning: "하늘의 불(태양) - 밝은 에너지" },
  "己未": { name: "천상화", element: "fire", meaning: "하늘의 불(태양) - 밝은 에너지" },
  "庚申": { name: "석류목", element: "wood", meaning: "석류나무 - 풍성한 결실" },
  "辛酉": { name: "석류목", element: "wood", meaning: "석류나무 - 풍성한 결실" },
  "壬戌": { name: "대해수", element: "water", meaning: "큰 바다 - 무한한 포용" },
  "癸亥": { name: "대해수", element: "water", meaning: "큰 바다 - 무한한 포용" }
};

/**
 * 납음 오행 분석
 */
export function analyzeNapeum(stem: string, branch: string): NapeumAnalysis | null {
  const key = stem + branch;
  const napeum = NAPEUM_TABLE[key];

  if (!napeum) return null;

  return {
    stem,
    branch,
    napeumName: napeum.name,
    element: napeum.element,
    meaning: napeum.meaning,
    score: 0 // 납음 자체는 점수보다 특성
  };
}

/**
 * 납음 상생/상극 분석 (일간 납음과 일진 납음의 관계)
 */
export function analyzeNapeumRelation(
  natalStem: string,
  natalBranch: string,
  dayStem: string,
  dayBranch: string
): { relation: string; score: number; meaning: string } {
  const natalNapeum = analyzeNapeum(natalStem, natalBranch);
  const dayNapeum = analyzeNapeum(dayStem, dayBranch);

  if (!natalNapeum || !dayNapeum) {
    return { relation: "unknown", score: 0, meaning: "분석 불가" };
  }

  const natalEl = natalNapeum.element;
  const dayEl = dayNapeum.element;
  const rel = getElementRelationship(natalEl);

  if (dayEl === natalEl) {
    return { relation: "same", score: 10, meaning: "납음 동기(同氣) - 안정적 에너지" };
  } else if (dayEl === rel.generatedBy) {
    return { relation: "generate", score: 15, meaning: "납음 상생(相生) - 도움받는 날" };
  } else if (dayEl === rel.generates) {
    return { relation: "drain", score: -5, meaning: "납음 설기(泄氣) - 에너지 소모" };
  } else if (dayEl === rel.controls) {
    return { relation: "control", score: 5, meaning: "납음 재성(財星) - 재물 기회" };
  } else if (dayEl === rel.controlledBy) {
    return { relation: "controlled", score: -10, meaning: "납음 극제(剋制) - 외부 압박" };
  }

  return { relation: "neutral", score: 0, meaning: "납음 중립" };
}

// ========================================
// 신살 충돌/상쇄 분석
// ========================================

export interface SalInteraction {
  sal1: string;
  sal2: string;
  interactionType: "cancel" | "amplify" | "modify" | "conflict";
  resultScore: number;
  explanation: string;
}

// 신살 상호작용 규칙
const SAL_INTERACTIONS: SalInteraction[] = [
  // 귀인이 흉살을 해소하는 경우
  { sal1: "천을귀인", sal2: "공망", interactionType: "cancel", resultScore: 15, explanation: "천을귀인이 공망을 해소 - 위기를 기회로" },
  { sal1: "천을귀인", sal2: "백호살", interactionType: "modify", resultScore: 10, explanation: "천을귀인이 백호살을 완화 - 재앙 감소" },
  { sal1: "천덕귀인", sal2: "삼재", interactionType: "modify", resultScore: 8, explanation: "천덕귀인이 삼재를 완화 - 보호받음" },
  { sal1: "월덕귀인", sal2: "겁살", interactionType: "modify", resultScore: 6, explanation: "월덕귀인이 겁살을 완화" },

  // 귀인끼리 시너지
  { sal1: "천을귀인", sal2: "천덕귀인", interactionType: "amplify", resultScore: 25, explanation: "쌍귀인 - 최고의 길일" },
  { sal1: "문창귀인", sal2: "학당귀인", interactionType: "amplify", resultScore: 20, explanation: "학문 쌍귀인 - 시험/학업 최적" },

  // 흉살끼리 악화
  { sal1: "공망", sal2: "삼재", interactionType: "amplify", resultScore: -25, explanation: "공망 + 삼재 = 이중 액운" },
  { sal1: "백호살", sal2: "겁살", interactionType: "amplify", resultScore: -20, explanation: "백호 + 겁살 = 흉사 위험" },
  { sal1: "원진", sal2: "귀문관살", interactionType: "amplify", resultScore: -18, explanation: "원진 + 귀문 = 인간관계 악화" },

  // 상충하는 경우
  { sal1: "도화살", sal2: "역마살", interactionType: "conflict", resultScore: 0, explanation: "도화 + 역마 = 불안정한 인연" },
  { sal1: "건록", sal2: "양인", interactionType: "conflict", resultScore: 5, explanation: "건록 + 양인 = 강한 에너지, 통제 필요" },

  // 도화살 + 홍염살 조합
  { sal1: "도화살", sal2: "홍염살", interactionType: "amplify", resultScore: 15, explanation: "도화 + 홍염 = 매력 극대화" },

  // 역마살 + 장성살
  { sal1: "역마살", sal2: "장성살", interactionType: "amplify", resultScore: 12, explanation: "역마 + 장성 = 승진/발전 이동" },
];

/**
 * 활성화된 신살들 간의 상호작용 분석
 */
export function analyzeSalInteractions(activeSals: string[]): SalInteraction[] {
  const results: SalInteraction[] = [];

  for (const interaction of SAL_INTERACTIONS) {
    const hasSal1 = activeSals.includes(interaction.sal1);
    const hasSal2 = activeSals.includes(interaction.sal2);

    if (hasSal1 && hasSal2) {
      results.push(interaction);
    }
  }

  return results;
}

// ========================================
// 대운/세운 교차점 분석
// ========================================

export interface DaeunSeunCrossAnalysis {
  inCriticalPeriod: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  score: number;
  factors: string[];
  advice: string;
}

/**
 * 대운/세운 교차점 분석 - 대운 전환기 + 세운 흉이면 위험
 */
export function analyzeDaeunSeunCross(
  birthYear: number,
  currentYear: number,
  daeunsu: number,
  dayMasterElement: string,
  yearStem: string,
  yearBranch: string
): DaeunSeunCrossAnalysis {
  const factors: string[] = [];
  let riskScore = 0;

  // 대운 전환기 판단 (대운수 기준)
  const age = currentYear - birthYear;
  const daeunCycle = Math.floor((age - daeunsu) / 10);
  const yearsIntoDaeun = (age - daeunsu) % 10;

  // 대운 전환기 (전후 1년)
  const inDaeunTransition = yearsIntoDaeun <= 1 || yearsIntoDaeun >= 9;

  if (inDaeunTransition) {
    factors.push("대운전환기");
    riskScore += 20;
  }

  // 세운 오행과 일간의 관계
  const yearStemEl = getStemElement(yearStem);
  const rel = getElementRelationship(dayMasterElement);

  if (yearStemEl === rel.controlledBy) {
    factors.push("세운관살");
    riskScore += 25;
  }

  // 대운 전환 + 세운 관살 = 매우 위험
  if (inDaeunTransition && yearStemEl === rel.controlledBy) {
    factors.push("이중위험");
    riskScore += 30;
  }

  // 세운 지지 충 체크 (간략화)
  // 실제로는 사주 원국과 대운 지지와의 충도 봐야 함

  let riskLevel: "low" | "medium" | "high" | "critical";
  let advice: string;

  if (riskScore >= 60) {
    riskLevel = "critical";
    advice = "대운 전환 + 세운 충돌. 큰 결정은 미루고 건강/안전에 최우선";
  } else if (riskScore >= 40) {
    riskLevel = "high";
    advice = "조심이 필요한 시기. 무리한 확장보다 현상 유지";
  } else if (riskScore >= 20) {
    riskLevel = "medium";
    advice = "변화의 시기. 유연하게 대처하면 기회";
  } else {
    riskLevel = "low";
    advice = "안정적인 흐름. 계획대로 진행";
  }

  return {
    inCriticalPeriod: riskScore >= 40,
    riskLevel,
    score: -riskScore,
    factors,
    advice
  };
}

// ========================================
// 사주 원국 강약 동적 분석
// ========================================

export interface DynamicStrengthAnalysis {
  baseStrength: "strong" | "weak" | "balanced";
  currentStrength: "stronger" | "weaker" | "same";
  strengthChange: number; // -100 ~ +100
  factors: string[];
  implication: string;
}

/**
 * 일진에 따른 사주 강약 변화 분석
 */
export function analyzeDynamicStrength(
  dayMasterElement: string,
  originalStrength: "strong" | "weak" | "balanced",
  dayStem: string,
  dayBranch: string,
  monthBranch: string
): DynamicStrengthAnalysis {
  let strengthChange = 0;
  const factors: string[] = [];

  const dayStemEl = getStemElement(dayStem);
  const dayBranchEl = getBranchElement(dayBranch);
  const monthBranchEl = getBranchElement(monthBranch);
  const rel = getElementRelationship(dayMasterElement);

  // 일진 천간이 일간을 생하면 강해짐
  if (dayStemEl === rel.generatedBy) {
    strengthChange += 20;
    factors.push("일간생");
  }
  // 일진 천간이 일간과 같으면 비겁 - 강해짐
  if (dayStemEl === dayMasterElement) {
    strengthChange += 15;
    factors.push("일간비겁");
  }
  // 일진 천간이 일간을 극하면 약해짐
  if (dayStemEl === rel.controlledBy) {
    strengthChange -= 25;
    factors.push("일간극");
  }
  // 일진 천간이 일간의 설기이면 약해짐
  if (dayStemEl === rel.generates) {
    strengthChange -= 10;
    factors.push("일간설");
  }

  // 지지도 분석
  if (dayBranchEl === rel.generatedBy || dayBranchEl === dayMasterElement) {
    strengthChange += 10;
    factors.push("지지부조");
  }
  if (dayBranchEl === rel.controlledBy) {
    strengthChange -= 15;
    factors.push("지지극");
  }

  // 월지(계절) 영향
  if (monthBranchEl === dayMasterElement || monthBranchEl === rel.generatedBy) {
    strengthChange += 5;
    factors.push("득령");
  }

  // 현재 강약 판단
  let currentStrength: "stronger" | "weaker" | "same";
  if (strengthChange >= 15) {
    currentStrength = "stronger";
  } else if (strengthChange <= -15) {
    currentStrength = "weaker";
  } else {
    currentStrength = "same";
  }

  // 함의 해석
  let implication: string;
  if (originalStrength === "weak") {
    if (currentStrength === "stronger") {
      implication = "신약이 보강됨 - 적극적 활동 추천";
    } else if (currentStrength === "weaker") {
      implication = "신약이 더 약해짐 - 휴식과 보양 필요";
    } else {
      implication = "신약 유지 - 무리하지 말 것";
    }
  } else if (originalStrength === "strong") {
    if (currentStrength === "stronger") {
      implication = "신강이 더 강해짐 - 에너지 발산 필요";
    } else if (currentStrength === "weaker") {
      implication = "신강이 조절됨 - 균형 잡힌 상태";
    } else {
      implication = "신강 유지 - 활동적으로";
    }
  } else {
    implication = "중화 상태 - 조화로운 흐름";
  }

  return {
    baseStrength: originalStrength,
    currentStrength,
    strengthChange,
    factors,
    implication
  };
}

// ========================================
// 키론(Chiron) 트랜짓 분석
// ========================================

export interface ChironTransitAnalysis {
  transitSign: string;
  natalSign?: string;
  aspect?: string;
  theme: string;
  healingArea: string;
  challenge: string;
  score: number;
}

// 키론 별자리별 테마
const CHIRON_THEMES: Record<string, { theme: string; healingArea: string; challenge: string }> = {
  "Aries": { theme: "정체성과 자기주장의 상처", healingArea: "자신감 회복", challenge: "분노 조절" },
  "Taurus": { theme: "가치와 자존감의 상처", healingArea: "물질적 안정", challenge: "집착 극복" },
  "Gemini": { theme: "소통과 학습의 상처", healingArea: "표현력 회복", challenge: "산만함 극복" },
  "Cancer": { theme: "가정과 감정의 상처", healingArea: "정서적 안정", challenge: "과거 트라우마" },
  "Leo": { theme: "창조성과 인정의 상처", healingArea: "자기표현", challenge: "인정욕구" },
  "Virgo": { theme: "완벽과 봉사의 상처", healingArea: "자기수용", challenge: "비판적 성향" },
  "Libra": { theme: "관계와 균형의 상처", healingArea: "건강한 경계", challenge: "의존성" },
  "Scorpio": { theme: "권력과 친밀함의 상처", healingArea: "신뢰 회복", challenge: "통제욕" },
  "Sagittarius": { theme: "믿음과 의미의 상처", healingArea: "내면의 지혜", challenge: "독단" },
  "Capricorn": { theme: "성취와 권위의 상처", healingArea: "현실적 목표", challenge: "일중독" },
  "Aquarius": { theme: "소속과 개성의 상처", healingArea: "진정한 연결", challenge: "고립" },
  "Pisces": { theme: "영성과 경계의 상처", healingArea: "영적 통합", challenge: "현실 회피" }
};

/**
 * 키론 트랜짓 분석
 */
export function analyzeChironTransit(
  transitChironSign: string,
  natalChironSign?: string,
  natalSunSign?: string
): ChironTransitAnalysis {
  const themeData = CHIRON_THEMES[transitChironSign] || {
    theme: "치유와 성장",
    healingArea: "내면 작업",
    challenge: "과거 상처"
  };

  let score = 0;
  let aspect: string | undefined;

  // 키론 리턴 (약 50년 주기) - 네이탈 키론과 같은 별자리
  if (natalChironSign && transitChironSign === natalChironSign) {
    aspect = "conjunction";
    score = -5; // 상처가 활성화되지만 치유 기회
  }

  // 태양과의 어스펙트
  if (natalSunSign) {
    const signOrder = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                       "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    const transitIdx = signOrder.indexOf(transitChironSign);
    const sunIdx = signOrder.indexOf(natalSunSign);

    if (transitIdx >= 0 && sunIdx >= 0) {
      const diff = Math.abs(transitIdx - sunIdx);
      if (diff === 0) {
        aspect = "conjunct-sun";
        score = -8;
      } else if (diff === 4 || diff === 8) {
        aspect = "trine-sun";
        score = 5;
      } else if (diff === 3 || diff === 9) {
        aspect = "square-sun";
        score = -6;
      } else if (diff === 6) {
        aspect = "opposite-sun";
        score = -4;
      }
    }
  }

  return {
    transitSign: transitChironSign,
    natalSign: natalChironSign,
    aspect,
    theme: themeData.theme,
    healingArea: themeData.healingArea,
    challenge: themeData.challenge,
    score
  };
}

// ========================================
// 노스노드/사우스노드 트랜짓 분석
// ========================================

export interface NodeTransitAnalysis {
  northNodeSign: string;
  southNodeSign: string;
  theme: string;
  destiny: string;      // 나아가야 할 방향
  release: string;      // 놓아야 할 것
  score: number;
  isNatalNodeActivated: boolean;
}

const NODE_THEMES: Record<string, { destiny: string; release: string }> = {
  "Aries": { destiny: "독립성, 자기주장, 새로운 시작", release: "타인 의존, 우유부단함" },
  "Taurus": { destiny: "안정, 가치 추구, 감각적 즐거움", release: "집착, 소유욕, 변화 저항" },
  "Gemini": { destiny: "소통, 학습, 다양한 경험", release: "독단, 설교적 태도" },
  "Cancer": { destiny: "감정적 안정, 가정, 돌봄", release: "과도한 야망, 냉정함" },
  "Leo": { destiny: "창조적 표현, 리더십, 즐거움", release: "객관성 과잉, 감정 억제" },
  "Virgo": { destiny: "봉사, 분석, 건강 관리", release: "환상, 희생자 의식" },
  "Libra": { destiny: "협력, 관계, 조화", release: "이기주의, 충동성" },
  "Scorpio": { destiny: "변환, 깊은 연결, 심리적 통찰", release: "물질적 집착, 안전 집착" },
  "Sagittarius": { destiny: "탐험, 철학, 높은 학습", release: "피상적 지식, 소문" },
  "Capricorn": { destiny: "성취, 책임, 사회적 기여", release: "감정적 의존, 가족 집착" },
  "Aquarius": { destiny: "혁신, 커뮤니티, 인도주의", release: "자기중심, 인정욕구" },
  "Pisces": { destiny: "영성, 무조건적 사랑, 예술", release: "과도한 분석, 비판" }
};

/**
 * 노드 트랜짓 분석
 */
export function analyzeNodeTransit(
  northNodeSign: string,
  natalNorthNode?: string,
  natalSunSign?: string
): NodeTransitAnalysis {
  // 사우스노드는 노스노드 반대편
  const signOrder = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                     "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  const northIdx = signOrder.indexOf(northNodeSign);
  const southNodeSign = signOrder[(northIdx + 6) % 12];

  const nodeData = NODE_THEMES[northNodeSign] || {
    destiny: "운명적 성장",
    release: "과거 패턴"
  };

  let score = 0;
  let isNatalNodeActivated = false;

  // 태양 위에 노드가 있으면 운명적 시기
  if (natalSunSign === northNodeSign) {
    score += 15;
    isNatalNodeActivated = true;
  } else if (natalSunSign === southNodeSign) {
    score -= 10; // 과거 패턴 활성화
    isNatalNodeActivated = true;
  }

  // 네이탈 노드 리턴 (약 18.6년 주기)
  if (natalNorthNode === northNodeSign) {
    score += 20;
    isNatalNodeActivated = true;
  }

  return {
    northNodeSign,
    southNodeSign,
    theme: `노스노드 ${northNodeSign}: ${nodeData.destiny}`,
    destiny: nodeData.destiny,
    release: NODE_THEMES[southNodeSign]?.destiny || "과거 집착",
    score,
    isNatalNodeActivated
  };
}

// ========================================
// 프로그레스드 문(Progressed Moon) 분석
// ========================================

export interface ProgressedMoonAnalysis {
  currentSign: string;
  yearsInSign: number;    // 현재 사인에서 보낸 기간
  remainingYears: number; // 다음 사인까지 남은 기간
  emotionalTheme: string;
  focus: string[];
  challenges: string[];
  score: number;
}

const PROGRESSED_MOON_THEMES: Record<string, {
  theme: string;
  focus: string[];
  challenges: string[];
}> = {
  "Aries": {
    theme: "새로운 시작, 자기 주장",
    focus: ["독립적 행동", "새 프로젝트", "자기 정체성"],
    challenges: ["충동성", "인내심 부족"]
  },
  "Taurus": {
    theme: "안정과 축적",
    focus: ["재정 관리", "감각적 즐거움", "안정 추구"],
    challenges: ["변화 저항", "물질 집착"]
  },
  "Gemini": {
    theme: "소통과 학습",
    focus: ["새로운 학습", "글쓰기", "네트워킹"],
    challenges: ["산만함", "깊이 부족"]
  },
  "Cancer": {
    theme: "가정과 감정",
    focus: ["가족", "내면 작업", "돌봄"],
    challenges: ["감정 기복", "과거 집착"]
  },
  "Leo": {
    theme: "창조와 표현",
    focus: ["창작 활동", "로맨스", "자녀"],
    challenges: ["자존심", "인정욕구"]
  },
  "Virgo": {
    theme: "정리와 개선",
    focus: ["건강 관리", "기술 향상", "봉사"],
    challenges: ["완벽주의", "자기 비판"]
  },
  "Libra": {
    theme: "관계와 균형",
    focus: ["파트너십", "예술", "협력"],
    challenges: ["우유부단", "갈등 회피"]
  },
  "Scorpio": {
    theme: "변환과 깊이",
    focus: ["심리 탐구", "투자", "친밀함"],
    challenges: ["집착", "비밀주의"]
  },
  "Sagittarius": {
    theme: "확장과 탐험",
    focus: ["여행", "고등 교육", "철학"],
    challenges: ["과잉 낙관", "세부사항 무시"]
  },
  "Capricorn": {
    theme: "성취와 구조",
    focus: ["커리어", "장기 목표", "책임"],
    challenges: ["일중독", "감정 억압"]
  },
  "Aquarius": {
    theme: "혁신과 커뮤니티",
    focus: ["사회 활동", "기술", "우정"],
    challenges: ["감정적 거리", "반항"]
  },
  "Pisces": {
    theme: "영성과 창의성",
    focus: ["명상", "예술", "봉사"],
    challenges: ["현실 도피", "경계 부족"]
  }
};

/**
 * 프로그레스드 문 계산 및 분석
 * 1일 = 1년, 달은 약 2.5년마다 사인 이동
 */
export function analyzeProgressedMoon(
  birthDate: Date,
  currentDate: Date,
  natalMoonSign: string
): ProgressedMoonAnalysis {
  const signOrder = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                     "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  // 나이 계산 (UTC 기준으로 일수 계산 - 서버 타임존 영향 제거)
  const birthUtc = Date.UTC(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const currentUtc = Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const ageInDays = Math.floor((currentUtc - birthUtc) / (1000 * 60 * 60 * 24));
  const ageInYears = ageInDays / 365.25;

  // 프로그레스드 문 위치 (약 2.5년/사인)
  const moonProgressionPerYear = 12 / 27.3; // 달의 황도 1주기 약 27.3일 = 27.3년
  const totalSignsProgressed = ageInYears * moonProgressionPerYear;
  const signsProgressed = Math.floor(totalSignsProgressed);
  const progressInCurrentSign = (totalSignsProgressed - signsProgressed) * 2.5; // 년 단위

  const natalIdx = signOrder.indexOf(natalMoonSign);
  const currentIdx = (natalIdx + signsProgressed) % 12;
  const currentSign = signOrder[currentIdx];

  const yearsInSign = progressInCurrentSign;
  const remainingYears = 2.5 - yearsInSign;

  const themeData = PROGRESSED_MOON_THEMES[currentSign] || {
    theme: "감정적 변화",
    focus: ["내면 작업"],
    challenges: ["불안정"]
  };

  // 점수: 새 사인 진입 시 변화, 사인 중반이 가장 안정
  let score = 0;
  if (yearsInSign < 0.5) {
    score = -5; // 전환기
  } else if (yearsInSign > 2) {
    score = -3; // 마무리기
  } else {
    score = 5; // 안정기
  }

  return {
    currentSign,
    yearsInSign: Math.round(yearsInSign * 10) / 10,
    remainingYears: Math.round(remainingYears * 10) / 10,
    emotionalTheme: themeData.theme,
    focus: themeData.focus,
    challenges: themeData.challenges,
    score
  };
}

// ========================================
// Solar Arc Directions 분석
// ========================================

export interface SolarArcAnalysis {
  arcDegrees: number;      // 진행된 도수 (나이와 동일)
  sunProgressedSign: string;
  mcProgressedSign: string;
  ascProgressedSign: string;
  significantAspects: string[];
  themes: string[];
  score: number;
}

/**
 * Solar Arc Directions 분석
 * 1년 = 약 1도 진행
 */
export function analyzeSolarArc(
  age: number,
  natalSunLongitude: number,
  natalMCLongitude?: number,
  natalAscLongitude?: number
): SolarArcAnalysis {
  const signOrder = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                     "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

  const arcDegrees = age; // 1년 = 1도

  // 진행된 태양 위치
  const progressedSunLong = (natalSunLongitude + arcDegrees) % 360;
  const sunProgressedSign = signOrder[Math.floor(progressedSunLong / 30)];

  // 진행된 MC (천정점)
  let mcProgressedSign = "";
  if (natalMCLongitude !== undefined) {
    const progressedMCLong = (natalMCLongitude + arcDegrees) % 360;
    mcProgressedSign = signOrder[Math.floor(progressedMCLong / 30)];
  }

  // 진행된 ASC (상승점)
  let ascProgressedSign = "";
  if (natalAscLongitude !== undefined) {
    const progressedAscLong = (natalAscLongitude + arcDegrees) % 360;
    ascProgressedSign = signOrder[Math.floor(progressedAscLong / 30)];
  }

  const significantAspects: string[] = [];
  const themes: string[] = [];
  let score = 0;

  // 사인 경계 진입 (0-1도) 체크 - 중요한 전환점
  const degreeInSign = progressedSunLong % 30;
  if (degreeInSign < 1 || degreeInSign > 29) {
    significantAspects.push("태양 사인 전환");
    themes.push("인생의 새로운 장");
    score += 10;
  }

  // 특정 도수 (15도 - 사인 중앙, 가장 강력)
  if (degreeInSign >= 14 && degreeInSign <= 16) {
    significantAspects.push("태양 사인 정점");
    themes.push("현재 에너지 최고조");
    score += 5;
  }

  // 중요한 나이들 (30, 45, 60, 75)
  if (age === 30) {
    significantAspects.push("새턴 리턴 동기화");
    themes.push("인생 구조 재정립");
  } else if (age === 45) {
    significantAspects.push("중년 전환점");
    themes.push("후반생 준비");
  } else if (age === 60) {
    significantAspects.push("두 번째 새턴 리턴 동기화");
    themes.push("지혜의 시기");
  }

  return {
    arcDegrees,
    sunProgressedSign,
    mcProgressedSign,
    ascProgressedSign,
    significantAspects,
    themes,
    score
  };
}

// ========================================
// 사주-점성술 오행 매핑 정교화
// ========================================

export interface ElementMappingDetail {
  sajuElement: string;
  astroElements: string[];
  signs: string[];
  planets: string[];
  compatibility: number; // 0-100
}

// 오행과 점성술 요소의 상세 매핑
export const ELEMENT_ASTRO_MAPPING: Record<string, ElementMappingDetail> = {
  "wood": {
    sajuElement: "목(木)",
    astroElements: ["air"], // 성장, 확장
    signs: ["Gemini", "Libra", "Aquarius", "Sagittarius"], // 공기 + 목성 지배
    planets: ["Jupiter", "Mercury"],
    compatibility: 75
  },
  "fire": {
    sajuElement: "화(火)",
    astroElements: ["fire"],
    signs: ["Aries", "Leo", "Sagittarius"],
    planets: ["Sun", "Mars"],
    compatibility: 95
  },
  "earth": {
    sajuElement: "토(土)",
    astroElements: ["earth"],
    signs: ["Taurus", "Virgo", "Capricorn"],
    planets: ["Saturn", "Venus"],
    compatibility: 90
  },
  "metal": {
    sajuElement: "금(金)",
    astroElements: ["air", "earth"], // 단단함, 정제
    signs: ["Libra", "Aquarius", "Capricorn", "Virgo"],
    planets: ["Venus", "Saturn", "Uranus"],
    compatibility: 70
  },
  "water": {
    sajuElement: "수(水)",
    astroElements: ["water"],
    signs: ["Cancer", "Scorpio", "Pisces"],
    planets: ["Moon", "Neptune", "Pluto"],
    compatibility: 95
  }
};

/**
 * 사주 오행과 점성술 배치의 호환성 분석
 */
export function analyzeElementCompatibility(
  sajuElement: string,
  sunSign: string,
  moonSign?: string
): { compatibility: number; harmony: string; advice: string } {
  const mapping = ELEMENT_ASTRO_MAPPING[sajuElement];
  if (!mapping) {
    return { compatibility: 50, harmony: "neutral", advice: "기본 분석" };
  }

  let score = 0;

  // 태양 별자리 호환성
  if (mapping.signs.includes(sunSign)) {
    score += 40;
  }

  // 달 별자리 호환성
  if (moonSign && mapping.signs.includes(moonSign)) {
    score += 30;
  }

  // 기본 호환성 점수 추가
  score += mapping.compatibility * 0.3;

  let harmony: string;
  let advice: string;

  if (score >= 70) {
    harmony = "excellent";
    advice = "사주와 점성술이 조화롭습니다. 양 체계의 장점을 활용하세요.";
  } else if (score >= 50) {
    harmony = "good";
    advice = "대체로 조화롭습니다. 부조화 영역은 성장의 기회입니다.";
  } else if (score >= 30) {
    harmony = "moderate";
    advice = "일부 긴장이 있습니다. 균형을 찾는 노력이 필요합니다.";
  } else {
    harmony = "challenging";
    advice = "도전적 조합입니다. 내면 통합 작업이 도움됩니다.";
  }

  return {
    compatibility: Math.min(100, score),
    harmony,
    advice
  };
}

// ========================================
// 시간대별 최적 활동 추천
// ========================================

export interface HourlyRecommendation {
  hour: number;          // 0-23
  sijiName: string;      // 12시진 이름
  planetaryHour: string; // 행성 시간
  bestActivities: string[];
  avoidActivities: string[];
  score: number;
}

// 12시진 정보
const SIJI_INFO: Record<string, {
  hours: number[];
  branch: string;
  element: string;
  bestFor: string[];
  avoidFor: string[];
}> = {
  "자시": { hours: [23, 0], branch: "子", element: "water", bestFor: ["명상", "계획", "휴식"], avoidFor: ["중요 결정", "계약"] },
  "축시": { hours: [1, 2], branch: "丑", element: "earth", bestFor: ["준비", "정리"], avoidFor: ["새 시작"] },
  "인시": { hours: [3, 4], branch: "寅", element: "wood", bestFor: ["기상", "운동", "계획"], avoidFor: ["중요 미팅"] },
  "묘시": { hours: [5, 6], branch: "卯", element: "wood", bestFor: ["창작", "아이디어"], avoidFor: ["충돌"] },
  "진시": { hours: [7, 8], branch: "辰", element: "earth", bestFor: ["업무 시작", "미팅"], avoidFor: ["휴식"] },
  "사시": { hours: [9, 10], branch: "巳", element: "fire", bestFor: ["발표", "영업", "소통"], avoidFor: ["조용한 작업"] },
  "오시": { hours: [11, 12], branch: "午", element: "fire", bestFor: ["중요 결정", "계약"], avoidFor: ["휴식", "갈등"] },
  "미시": { hours: [13, 14], branch: "未", element: "earth", bestFor: ["협력", "팀워크"], avoidFor: ["새 시작"] },
  "신시": { hours: [15, 16], branch: "申", element: "metal", bestFor: ["분석", "정리", "마무리"], avoidFor: ["충동적 결정"] },
  "유시": { hours: [17, 18], branch: "酉", element: "metal", bestFor: ["평가", "반성"], avoidFor: ["새 프로젝트"] },
  "술시": { hours: [19, 20], branch: "戌", element: "earth", bestFor: ["사교", "저녁 식사"], avoidFor: ["중요 결정"] },
  "해시": { hours: [21, 22], branch: "亥", element: "water", bestFor: ["휴식", "명상", "계획"], avoidFor: ["활동적 일"] }
};

// 행성 시간 순서 (일요일 일출부터)
const PLANETARY_HOUR_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];

/**
 * 시간대별 최적 활동 추천
 */
export function getHourlyRecommendation(
  hour: number,
  dayOfWeek: number, // 0=일, 1=월, ...
  dayMasterElement: string,
  yongsinElement?: string
): HourlyRecommendation {
  // 12시진 찾기
  let sijiName = "";
  let sijiData: typeof SIJI_INFO[keyof typeof SIJI_INFO] | null = null;

  for (const [name, data] of Object.entries(SIJI_INFO)) {
    if (data.hours.includes(hour) ||
        (name === "자시" && (hour === 23 || hour === 0))) {
      sijiName = name;
      sijiData = data;
      break;
    }
  }

  if (!sijiData) {
    sijiData = SIJI_INFO["자시"]; // 기본값
    sijiName = "자시";
  }

  // 행성 시간 계산 (간략화)
  const planetIdx = (dayOfWeek * 24 + hour) % 7;
  const planetaryHour = PLANETARY_HOUR_ORDER[planetIdx];

  // 활동 추천 조합
  const bestActivities = [...sijiData.bestFor];
  const avoidActivities = [...sijiData.avoidFor];

  // 일간 오행에 따른 조정
  const rel = getElementRelationship(dayMasterElement);
  if (sijiData.element === dayMasterElement || sijiData.element === rel.generatedBy) {
    bestActivities.push("중요 업무");
  }
  if (sijiData.element === rel.controlledBy) {
    avoidActivities.push("무리한 활동");
  }

  // 용신에 맞는 시간이면 추가 보너스
  let score = 50;
  if (yongsinElement && sijiData.element === yongsinElement) {
    score += 20;
    bestActivities.push("용신 시간 - 최적");
  }

  // 행성 시간에 따른 조정
  if (planetaryHour === "Jupiter") {
    score += 10;
    bestActivities.push("확장", "학습");
  } else if (planetaryHour === "Saturn") {
    score -= 5;
    bestActivities.push("구조화", "마무리");
  } else if (planetaryHour === "Venus") {
    bestActivities.push("연애", "예술");
  } else if (planetaryHour === "Mars") {
    bestActivities.push("경쟁", "운동");
    avoidActivities.push("갈등 상황");
  }

  return {
    hour,
    sijiName,
    planetaryHour,
    bestActivities: [...new Set(bestActivities)],
    avoidActivities: [...new Set(avoidActivities)],
    score
  };
}

// ========================================
// 음력 기반 분석 강화
// ========================================

export interface LunarAnalysis {
  lunarMonth: number;
  lunarDay: number;
  lunarPhase: string;
  isLeapMonth: boolean;
  specialDay: string | null;
  recommendations: string[];
  score: number;
}

// 음력 특별일
const LUNAR_SPECIAL_DAYS: Record<string, { name: string; meaning: string; score: number }> = {
  "1-1": { name: "설날", meaning: "새해 시작, 가족 화합", score: 20 },
  "1-15": { name: "정월대보름", meaning: "소원 성취, 액막이", score: 15 },
  "3-3": { name: "삼짇날", meaning: "봄의 시작, 진달래", score: 8 },
  "4-8": { name: "석가탄신일", meaning: "자비와 깨달음", score: 10 },
  "5-5": { name: "단오", meaning: "액막이, 건강", score: 12 },
  "7-7": { name: "칠석", meaning: "연인의 날, 소원", score: 10 },
  "7-15": { name: "백중", meaning: "조상 공양", score: 8 },
  "8-15": { name: "추석", meaning: "풍요와 감사, 가족", score: 20 },
  "9-9": { name: "중양절", meaning: "장수, 국화", score: 8 },
  "10-15": { name: "하원", meaning: "마무리", score: 5 },
  "12-30": { name: "섣달그믐", meaning: "한 해 마무리", score: 10 }
};

/**
 * 음력 날짜 분석 (근사치 - 실제로는 정확한 음력 변환 필요)
 */
export function analyzeLunarDate(
  gregorianDate: Date
): LunarAnalysis {
  // 간략화된 음력 계산 (실제로는 천문 계산 또는 DB 필요)
  // 여기서는 근사치 사용
  const year = gregorianDate.getFullYear();
  const month = gregorianDate.getMonth() + 1;
  const day = gregorianDate.getDate();

  // 대략적인 음력 월/일 계산 (실제 변환은 더 복잡)
  // 음력은 양력보다 약 1달 뒤처짐
  let lunarMonth = month - 1;
  if (lunarMonth <= 0) lunarMonth = 12;

  // 음력일은 비슷하게 유지 (실제로는 달의 위상에 따라 다름)
  const lunarDay = day;

  // 달의 위상 (UTC 기준으로 연초부터 일수 계산 - 서버 타임존 영향 제거)
  const moonCycle = 29.53;
  const yearStartUtc = Date.UTC(year, 0, 0);
  const dateUtc = Date.UTC(gregorianDate.getFullYear(), gregorianDate.getMonth(), gregorianDate.getDate());
  const dayOfYear = Math.floor((dateUtc - yearStartUtc) / (1000 * 60 * 60 * 24));
  const moonPhaseDay = dayOfYear % moonCycle;

  let lunarPhase: string;
  if (moonPhaseDay < 1.85) {
    lunarPhase = "삭(朔) - 새달";
  } else if (moonPhaseDay < 7.38) {
    lunarPhase = "상현(上弦)";
  } else if (moonPhaseDay < 14.77) {
    lunarPhase = "망(望) - 보름달";
  } else if (moonPhaseDay < 22.15) {
    lunarPhase = "하현(下弦)";
  } else {
    lunarPhase = "그믐";
  }

  // 특별일 체크
  const dateKey = `${lunarMonth}-${lunarDay}`;
  const specialDayInfo = LUNAR_SPECIAL_DAYS[dateKey];
  const specialDay = specialDayInfo?.name || null;

  const recommendations: string[] = [];
  let score = 0;

  if (specialDayInfo) {
    recommendations.push(specialDayInfo.meaning);
    score += specialDayInfo.score;
  }

  // 보름/그믐 추천
  if (lunarPhase.includes("보름")) {
    recommendations.push("완성", "수확", "감사");
    score += 8;
  } else if (lunarPhase.includes("새달")) {
    recommendations.push("새 시작", "계획", "씨앗 뿌리기");
    score += 5;
  }

  return {
    lunarMonth,
    lunarDay,
    lunarPhase,
    isLeapMonth: false, // 간략화
    specialDay,
    recommendations,
    score
  };
}
