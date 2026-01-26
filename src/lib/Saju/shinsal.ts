// src/lib/Saju/shinsal.ts
import { BRANCHES, STEMS } from './constants';
import type { FiveElement, YinYang, PillarKind, TwelveStage } from './types';

export type { PillarKind, TwelveStage };

export interface PillarBase {
  heavenlyStem: { name: string; element: FiveElement; yin_yang?: YinYang };
  earthlyBranch: { name: string; element: FiveElement; yin_yang?: YinYang };
}

export interface SajuPillarsLike {
  year: PillarBase;
  month: PillarBase;
  day: PillarBase;
  time: PillarBase;
}

// TwelveStage is re-exported from types.ts

export interface ShinsalHit {
  kind:
    | '장성' | '반안' | '재살' | '천살' | '월살' | '망신'
    | '역마' | '화개' | '겁살' | '육해' | '화해' | '괘살'
    | '길성' | '흉성'
    | '지살' | '년살'
    | '도화' | '귀문관' | '현침' | '고신' | '괴강' | '양인' | '백호'
    | '천을귀인' | '태극귀인' | '금여성' | '천문성' | '문창' | '문곡'
    // 확장 신살
    | '공망' | '천의성' | '학당귀인' | '홍염살' | '천라지망' | '원진'
    | '천주귀인' | '암록' | '건록' | '제왕'
    // 추가 신살
    | '삼재' | '천덕귀인' | '월덕귀인';
  pillars: PillarKind[];
  target?: string;
  detail?: string;
}

export interface ShinsalAnnot {
  twelveStage: { [K in PillarKind]: TwelveStage };
  hits: ShinsalHit[];
  byPillar?: {
    [K in PillarKind]: {
      twelveShinsal: string[];
      generalShinsal: string[];
      lucky: string[];
    }
  };
}

export interface AnnotateOptions {
  twelveStageBasis?: 'day';
  includeLucky?: boolean;
  includeUnlucky?: boolean;

  includeTwelveAll?: boolean;
  includeHwaHae?: boolean;
  useMonthCompletion?: boolean;

  includeGeneralShinsal?: boolean;
  includeLuckyDetails?: boolean;

  ruleSet?: 'standard' | 'your';
}

export const DEFAULT_ANNOTATE_OPTIONS: Required<AnnotateOptions> = {
  twelveStageBasis: 'day',
  includeLucky: false,
  includeUnlucky: false,

  includeTwelveAll: true,
  includeHwaHae: false,
  useMonthCompletion: false,

  includeGeneralShinsal: true,
  includeLuckyDetails: true,

  ruleSet: 'standard',
};

const _stemByName = (name: string) => STEMS.find(s => s.name === name);
const _branchByName = (name: string) => BRANCHES.find(b => b.name === name);

/* ===== 정규화 ===== */
const BRANCH_KO_TO_HAN: Record<string, string> = {
  '자':'子','축':'丑','인':'寅','묘':'卯','진':'辰','사':'巳',
  '오':'午','미':'未','신':'申','유':'酉','술':'戌','해':'亥',
};
function normalizeBranchName(n: string): string {
  const t = String(n || '').trim();
  return BRANCH_KO_TO_HAN[t] || t;
}
const STEM_KO_TO_HAN: Record<string, string> = {
  '갑':'甲','을':'乙','병':'丙','정':'丁','무':'戊','기':'己','경':'庚','신':'辛','임':'壬','계':'癸',
};
function normalizeStemName(n: string): string {
  const t = String(n || '').trim();
  return STEM_KO_TO_HAN[t] || t;
}

/* ===== 12운성 ===== */
/* 정통 12운성 순서: 장생 → 목욕 → 관대 → 임관 → 왕지 → 쇠 → 병 → 사 → 묘 → 절 → 태 → 양 */
const TWELVE_STAGE_ORDER: TwelveStage[] = [
  '장생', '목욕', '관대', '임관', '왕지', '쇠', '병', '사', '묘', '절', '태', '양'
];

/* 일간별 장생 출발지 (정통 명리학 기준) */
const DAYMASTER_BIRTH_BRANCH: Record<string, string> = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
  '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯',
};

const BRANCH_ORDER = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const;

export function getTwelveStage(dayStemNameRaw: string, branchNameRaw: string): TwelveStage {
  const dayStemName = normalizeStemName(dayStemNameRaw);
  const branchName = normalizeBranchName(branchNameRaw);
  const start = DAYMASTER_BIRTH_BRANCH[dayStemName];
  if (!start) {return '묘';}
  const startIdx = (BRANCH_ORDER as readonly string[]).indexOf(start);
  const targetIdx = (BRANCH_ORDER as readonly string[]).indexOf(branchName);
  if (startIdx < 0 || targetIdx < 0) {return '묘';}
  const diff = (targetIdx - startIdx + 12) % 12;
  return TWELVE_STAGE_ORDER[diff];
}
export function getTwelveStagesForPillars(p: SajuPillarsLike, _basis: 'day' = 'day'): { [K in PillarKind]: TwelveStage } {
  const dayStemName = normalizeStemName(p.day.heavenlyStem.name);
  return {
    year: getTwelveStage(dayStemName, p.year.earthlyBranch.name),
    month: getTwelveStage(dayStemName, p.month.earthlyBranch.name),
    day: getTwelveStage(dayStemName, p.day.earthlyBranch.name),
    time: getTwelveStage(dayStemName, p.time.earthlyBranch.name),
  };
}

/* ===== 12신살 테이블 ===== */
type TwelveMap = {
  겁살: string; 재살: string; 천살: string; 지살: string; 년살: string; 월살: string;
  망신: string; 장성: string; 반안: string; 역마: string; 육해: string; 화개: string;
};

const TWELVE_SHINSAL_BY_DAY_BRANCH: Record<string, TwelveMap> = {
  '子': { 겁살:'申', 재살:'辰', 천살:'午', 지살:'酉', 년살:'卯', 월살:'未', 망신:'卯', 장성:'寅', 반안:'午', 역마:'巳', 육해:'亥', 화개:'辰' },
  '丑': { 겁살:'酉', 재살:'巳', 천살:'未', 지살:'申', 년살:'辰', 월살:'申', 망신:'辰', 장성:'卯', 반안:'未', 역마:'午', 육해:'子', 화개:'戌' },
  '寅': { 겁살:'戌', 재살:'午', 천살:'申', 지살:'酉', 년살:'巳', 월살:'酉', 망신:'巳', 장성:'辰', 반안:'申', 역마:'未', 육해:'丑', 화개:'亥' },
  '卯': { 겁살:'亥', 재살:'未', 천살:'酉', 지살:'申', 년살:'午', 월살:'戌', 망신:'午', 장성:'巳', 반안:'酉', 역마:'申', 육해:'寅', 화개:'子' },
  '辰': { 겁살:'子', 재살:'申', 천살:'戌', 지살:'酉', 년살:'未', 월살:'亥', 망신:'未', 장성:'午', 반안:'戌', 역마:'酉', 육해:'卯', 화개:'丑' },
  '巳': { 겁살:'丑', 재살:'酉', 천살:'亥', 지살:'戌', 년살:'申', 월살:'子', 망신:'申', 장성:'未', 반안:'亥', 역마:'戌', 육해:'辰', 화개:'寅' },
  '午': { 겁살:'寅', 재살:'亥', 천살:'子', 지살:'丑', 년살:'酉', 월살:'丑', 망신:'酉', 장성:'申', 반안:'子', 역마:'亥', 육해:'巳', 화개:'卯' },
  '未': { 겁살:'卯', 재살:'亥', 천살:'丑', 지살:'亥', 년살:'戌', 월살:'寅', 망신:'戌', 장성:'酉', 반안:'丑', 역마:'子', 육해:'午', 화개:'辰' },
  '申': { 겁살:'辰', 재살:'子', 천살:'寅', 지살:'丑', 년살:'亥', 월살:'卯', 망신:'亥', 장성:'戌', 반안:'寅', 역마:'丑', 육해:'未', 화개:'巳' },
  '酉': { 겁살:'巳', 재살:'丑', 천살:'卯', 지살:'寅', 년살:'子', 월살:'辰', 망신:'子', 장성:'亥', 반안:'卯', 역마:'寅', 육해:'申', 화개:'午' },
  '戌': { 겁살:'午', 재살:'寅', 천살:'辰', 지살:'卯', 년살:'丑', 월살:'巳', 망신:'丑', 장성:'子', 반안:'辰', 역마:'卯', 육해:'酉', 화개:'未' },
  '亥': { 겁살:'未', 재살:'辰', 천살:'巳', 지살:'辰', 년살:'寅', 월살:'午', 망신:'寅', 장성:'丑', 반안:'巳', 역마:'辰', 육해:'戌', 화개:'申' },
};

/* ===== 레거시 간단표 ===== */
const SHINSAL_SIMPLE_BY_DAY_BRANCH: Record<string, Partial<Record<string, ShinsalHit['kind']>>> = {
  '未': { '酉': '장성', '戌': '망신', '子': '역마', '亥': '재살', '丑': '천살', '寅': '월살', '卯': '겁살', '午': '육해' },
  '子': { '寅': '장성', '卯': '망신', '巳': '역마', '辰': '재살', '午': '천살', '未': '월살', '申': '겁살', '亥': '육해' },
  '丑': { '卯': '장성', '辰': '망신', '午': '역마', '巳': '재살', '未': '천살', '申': '월살', '酉': '겁살', '子': '육해' },
  '寅': { '辰': '장성', '巳': '망신', '未': '역마', '午': '재살', '申': '천살', '酉': '월살', '戌': '겁살', '丑': '육해' },
  '卯': { '巳': '장성', '午': '망신', '申': '역마', '未': '재살', '酉': '천살', '戌': '월살', '亥': '겁살', '寅': '육해' },
  '辰': { '午': '장성', '未': '망신', '酉': '역마', '申': '재살', '戌': '천살', '亥': '월살', '子': '겁살', '卯': '육해' },
  '巳': { '未': '장성', '申': '망신', '戌': '역마', '酉': '재살', '亥': '천살', '子': '월살', '丑': '겁살', '辰': '육해' },
  '午': { '申': '장성', '酉': '망신', '亥': '역마', '戌': '재살', '子': '천살', '丑': '월살', '寅': '겁살', '巳': '육해' },
  '申': { '戌': '장성', '亥': '망신', '丑': '역마', '子': '재살', '寅': '천살', '卯': '월살', '辰': '겁살', '未': '육해' },
  '酉': { '亥': '장성', '子': '망신', '寅': '역마', '丑': '재살', '卯': '천살', '辰': '월살', '巳': '겁살', '申': '육해' },
  '戌': { '子': '장성', '丑': '망신', '卯': '역마', '寅': '재살', '辰': '천살', '巳': '월살', '午': '겁살', '酉': '육해' },
  '亥': { '丑': '장성', '寅': '망신', '辰': '역마', '卯': '재살', '巳': '천살', '午': '월살', '未': '겁살', '戌': '육해' },
};

/* ===== 월지 보완 ===== */
const YEARMONTH_SHINSAL_BY_MONTH_BRANCH: Record<string, Partial<Record<string, ShinsalHit['kind']>>> = {
  '寅': { '申': '역마', '午': '반안', '戌': '반안' },
  '申': { '寅': '역마', '子': '반안', '辰': '반안' },
  '巳': { '亥': '역마', '酉': '반안', '丑': '반안' },
  '亥': { '巳': '역마', '卯': '반안', '未': '반안' },
  '辰': { '戌': '화개' },
  '戌': { '辰': '화개' },
  '丑': { '未': '화개' },
  '未': { '丑': '화개' },
};

/* ===== 일반 신살/길성 ===== */
const YANGIN_BY_DAY_STEM: Record<string, string> = {
  '甲':'卯','乙':'卯','丙':'午','丁':'午','戊':'午','己':'午','庚':'酉','辛':'酉','壬':'子','癸':'子',
};
const GWAEGANG_DAY_BRANCHES = new Set(['辰','戌','丑','未']);
const GWAEGANG_DAY_STEMS = new Set(['庚','辛']);
function checkGwaegang(dayStem: string, dayBranch: string, targetBranch: string): boolean {
  return GWAEGANG_DAY_BRANCHES.has(dayBranch) && GWAEGANG_DAY_STEMS.has(dayStem) && targetBranch === dayBranch;
}
const BAEKHO_DAY_PAIRS = new Set(['庚辰','庚戌','庚寅','庚申','戊申','戊寅','壬辰','壬戌','丙辰','丙戌']);
function checkBaekho(dayStem: string, dayBranch: string): boolean {
  return BAEKHO_DAY_PAIRS.has(dayStem + dayBranch);
}
const DOHWA_SET = new Set(['子','午','卯','酉']);
function getDohwaOn(branch: string): boolean { return DOHWA_SET.has(branch); }

/* 귀문관: standard는 고정 세트, your는 삼합(방국) 기준으로 '좁게' */
const GWIMUN_MONTH_SET = new Set(['戌','亥','子','丑']);
function getGwimunOn(monthBranch: string, targetBranch: string, ruleSet: 'standard' | 'your' = 'standard'): boolean {
  if (ruleSet === 'your') {
    // 표 사이트 특례: 필요한 케이스 우선 허용
    if ((monthBranch === '寅' && targetBranch === '未') ||
        (monthBranch === '亥' && targetBranch === '卯')) {return true;}

    // 기본: 삼합(방국) 내부에서만 귀문관 허용
    const triads: string[][] = [
      ['申','子','辰'],
      ['寅','午','戌'],
      ['巳','酉','丑'],
      ['亥','卯','未'],
    ];
    const group = triads.find(g => g.includes(monthBranch));
    return !!group && group.includes(targetBranch);
  }
  return GWIMUN_MONTH_SET.has(monthBranch) && GWIMUN_MONTH_SET.has(targetBranch);
}

const HYEONCHIM_BY_STEM: Record<string, string> = {
  '甲':'酉','乙':'酉','丙':'子','丁':'子','戊':'卯','己':'卯','庚':'午','辛':'午','壬':'卯','癸':'卯'
};
function isHyeonchim(dayStem: string, branch: string): boolean { return HYEONCHIM_BY_STEM[dayStem] === branch; }
function isGosin(monthBranch: string, target: string): boolean {
  const idx = BRANCH_ORDER.indexOf(monthBranch as typeof BRANCH_ORDER[number]);
  if (idx < 0) {return false;}
  const prev = BRANCH_ORDER[(idx + 11) % 12];
  const next = BRANCH_ORDER[(idx + 1) % 12];
  return target === prev || target === next;
}
const CHEONEUL_BY_DAY_STEM: Record<string, string[]> = {
  '甲':['丑','未'],'乙':['丑','未'],'丙':['申','子'],'丁':['申','子'],'戊':['卯'],'己':['酉'],'庚':['巳','亥'],'辛':['巳','亥'],'壬':['寅','午'],'癸':['寅','午'],
};
const TAEGEUK_BY_DAY_STEM: Record<string, string[]> = {
  '甲':['子','午'],'乙':['子','午'],'丙':['卯','酉'],'丁':['卯','酉'],'戊':['辰','戌'],'己':['辰','戌'],'庚':['丑','未'],'辛':['丑','未'],'壬':['寅','申'],'癸':['寅','申'],
};
function isGeumYeoseong(branch: string): boolean { return branch === '酉' || branch === '辰'; }
function isCheonMunSeong(branch: string): boolean { return branch === '子' || branch === '午'; }
function isMunChang(branch: string): boolean { return branch === '巳' || branch === '酉'; }
function isMunGok(branch: string): boolean { return branch === '亥' || branch === '卯'; }

/* ===== 확장 신살 테이블 ===== */

// 공망(空亡): 일주의 순(旬)에서 빠진 두 지지
// 갑자순 → 戌亥 공망, 갑술순 → 申酉 공망, ...
const GONGMANG_BY_DAY_PILLAR: Record<string, string[]> = {
  // 갑자순 (甲子~癸酉)
  '甲子': ['戌','亥'], '乙丑': ['戌','亥'], '丙寅': ['戌','亥'], '丁卯': ['戌','亥'], '戊辰': ['戌','亥'],
  '己巳': ['戌','亥'], '庚午': ['戌','亥'], '辛未': ['戌','亥'], '壬申': ['戌','亥'], '癸酉': ['戌','亥'],
  // 갑술순 (甲戌~癸未)
  '甲戌': ['申','酉'], '乙亥': ['申','酉'], '丙子': ['申','酉'], '丁丑': ['申','酉'], '戊寅': ['申','酉'],
  '己卯': ['申','酉'], '庚辰': ['申','酉'], '辛巳': ['申','酉'], '壬午': ['申','酉'], '癸未': ['申','酉'],
  // 갑신순 (甲申~癸巳)
  '甲申': ['午','未'], '乙酉': ['午','未'], '丙戌': ['午','未'], '丁亥': ['午','未'], '戊子': ['午','未'],
  '己丑': ['午','未'], '庚寅': ['午','未'], '辛卯': ['午','未'], '壬辰': ['午','未'], '癸巳': ['午','未'],
  // 갑오순 (甲午~癸卯)
  '甲午': ['辰','巳'], '乙未': ['辰','巳'], '丙申': ['辰','巳'], '丁酉': ['辰','巳'], '戊戌': ['辰','巳'],
  '己亥': ['辰','巳'], '庚子': ['辰','巳'], '辛丑': ['辰','巳'], '壬寅': ['辰','巳'], '癸卯': ['辰','巳'],
  // 갑진순 (甲辰~癸丑)
  '甲辰': ['寅','卯'], '乙巳': ['寅','卯'], '丙午': ['寅','卯'], '丁未': ['寅','卯'], '戊申': ['寅','卯'],
  '己酉': ['寅','卯'], '庚戌': ['寅','卯'], '辛亥': ['寅','卯'], '壬子': ['寅','卯'], '癸丑': ['寅','卯'],
  // 갑인순 (甲寅~癸亥)
  '甲寅': ['子','丑'], '乙卯': ['子','丑'], '丙辰': ['子','丑'], '丁巳': ['子','丑'], '戊午': ['子','丑'],
  '己未': ['子','丑'], '庚申': ['子','丑'], '辛酉': ['子','丑'], '壬戌': ['子','丑'], '癸亥': ['子','丑'],
};
function getGongmang(dayStem: string, dayBranch: string): string[] {
  return GONGMANG_BY_DAY_PILLAR[dayStem + dayBranch] || [];
}

// 천의성(天醫星): 월지 기준으로 다음 지지
const CHEONUI_BY_MONTH_BRANCH: Record<string, string> = {
  '子': '亥', '丑': '子', '寅': '丑', '卯': '寅', '辰': '卯', '巳': '辰',
  '午': '巳', '未': '午', '申': '未', '酉': '申', '戌': '酉', '亥': '戌',
};
function isCheonuiseong(monthBranch: string, targetBranch: string): boolean {
  return CHEONUI_BY_MONTH_BRANCH[monthBranch] === targetBranch;
}

// 학당귀인(學堂貴人): 일간 기준
const HAKDANG_BY_DAY_STEM: Record<string, string> = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
  '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯',
};
function isHakdangGwiin(dayStem: string, targetBranch: string): boolean {
  return HAKDANG_BY_DAY_STEM[dayStem] === targetBranch;
}

// 홍염살(紅艶殺): 일간 기준 - 이성/연애 관련
const HONGYEOM_BY_DAY_STEM: Record<string, string> = {
  '甲': '午', '乙': '午', '丙': '寅', '丁': '未', '戊': '辰',
  '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申',
};
function isHongyeomsal(dayStem: string, targetBranch: string): boolean {
  return HONGYEOM_BY_DAY_STEM[dayStem] === targetBranch;
}

// 천라지망(天羅地網): 辰~巳는 천라, 戌~亥는 지망
function isCheonraJimang(branch: string): '천라지망' | null {
  if (['辰','巳','戌','亥'].includes(branch)) {return '천라지망';}
  return null;
}

// 원진(元嗔): 6해 관계의 특수 형태
const WONJIN_PAIRS: Record<string, string> = {
  '子': '未', '丑': '午', '寅': '巳', '卯': '辰', '辰': '卯', '巳': '寅',
  '午': '丑', '未': '子', '申': '亥', '酉': '戌', '戌': '酉', '亥': '申',
};
function isWonjin(dayBranch: string, targetBranch: string): boolean {
  return WONJIN_PAIRS[dayBranch] === targetBranch;
}

// 천주귀인(天廚貴人): 일간 기준
const CHEONJU_BY_DAY_STEM: Record<string, string> = {
  '甲': '巳', '乙': '午', '丙': '巳', '丁': '午', '戊': '巳',
  '己': '午', '庚': '亥', '辛': '子', '壬': '亥', '癸': '子',
};
function isCheonjuGwiin(dayStem: string, targetBranch: string): boolean {
  return CHEONJU_BY_DAY_STEM[dayStem] === targetBranch;
}

// 암록(暗祿): 건록의 충(沖) 지지
const AMNOK_BY_DAY_STEM: Record<string, string> = {
  '甲': '酉', '乙': '申', '丙': '亥', '丁': '戌', '戊': '亥',
  '己': '戌', '庚': '卯', '辛': '寅', '壬': '巳', '癸': '辰',
};
function isAmnok(dayStem: string, targetBranch: string): boolean {
  return AMNOK_BY_DAY_STEM[dayStem] === targetBranch;
}

// 건록(建祿): 일간의 록지
const GEONROK_BY_DAY_STEM: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
  '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
};
function isGeonrok(dayStem: string, targetBranch: string): boolean {
  return GEONROK_BY_DAY_STEM[dayStem] === targetBranch;
}

// 제왕(帝旺): 12운성 중 왕지와 동일한 위치
const JEWANG_BY_DAY_STEM: Record<string, string> = {
  '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
  '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥',
};
function isJewang(dayStem: string, targetBranch: string): boolean {
  return JEWANG_BY_DAY_STEM[dayStem] === targetBranch;
}

// 삼재(三災): 년지 기준으로 3년 주기의 불운
// 寅午戌 → 申酉戌 삼재, 巳酉丑 → 寅卯辰 삼재, 申子辰 → 巳午未 삼재, 亥卯未 → 亥子丑 삼재
const SAMJAE_BY_YEAR_BRANCH: Record<string, string[]> = {
  '寅': ['申','酉','戌'], '午': ['申','酉','戌'], '戌': ['申','酉','戌'],
  '巳': ['寅','卯','辰'], '酉': ['寅','卯','辰'], '丑': ['寅','卯','辰'],
  '申': ['巳','午','未'], '子': ['巳','午','未'], '辰': ['巳','午','未'],
  '亥': ['亥','子','丑'], '卯': ['亥','子','丑'], '未': ['亥','子','丑'],
};
function isSamjae(yearBranch: string, currentYearBranch: string): boolean {
  const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[yearBranch];
  return samjaeBranches?.includes(currentYearBranch) ?? false;
}

// 천덕귀인(天德貴人): 월지 기준
const CHEONDEOK_BY_MONTH_BRANCH: Record<string, string> = {
  '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
  '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
};
function isCheondeokGwiin(monthBranch: string, targetStem: string): boolean {
  return CHEONDEOK_BY_MONTH_BRANCH[monthBranch] === targetStem;
}

// 월덕귀인(月德貴人): 월지 기준
const WOLDEOK_BY_MONTH_BRANCH: Record<string, string> = {
  '寅': '丙', '卯': '甲', '辰': '壬', '巳': '庚', '午': '丙', '未': '甲',
  '申': '壬', '酉': '庚', '戌': '丙', '亥': '甲', '子': '壬', '丑': '庚',
};
function isWoldeokGwiin(monthBranch: string, targetStem: string): boolean {
  return WOLDEOK_BY_MONTH_BRANCH[monthBranch] === targetStem;
}

/* ===== 예시 길/흉성(유지) ===== */
const LUCKY_BRANCHES = new Set<string>(['寅','午','戌']);
const UNLUCKY_BRANCHES = new Set<string>(['辰','戌']);

/* ===== 12신살 단일 선택 우선순위 ===== */
const TWELVE_PRIORITY: ShinsalHit['kind'][] = [
  '장성','화개','망신','역마','반안','지살','재살','천살','년살','월살','육해'
];

function mapK(k: keyof TwelveMap): ShinsalHit['kind'] {
  return (k === '겁살' ? '겁살' :
    k === '재살' ? '재살' :
    k === '천살' ? '천살' :
    k === '지살' ? '지살' :
    k === '년살' ? '년살' :
    k === '월살' ? '월살' :
    k === '망신' ? '망신' :
    k === '장성' ? '장성' :
    k === '반안' ? '반안' :
    k === '역마' ? '역마' :
    k === '육해' ? '육해' : '화개');
}

function pickTwelveSingle(dayBranch: string, targetBranch: string): ShinsalHit['kind'] | null {
  const full = TWELVE_SHINSAL_BY_DAY_BRANCH[dayBranch];
  if (!full) {return null;}
  const candidates: ShinsalHit['kind'][] = [];
  for (const [k, v] of Object.entries(full) as Array<[keyof TwelveMap, string]>) {
    if (v === targetBranch) {candidates.push(mapK(k));}
  }
  if (candidates.length === 0) {return null;}
  for (const pr of TWELVE_PRIORITY) {
    if (candidates.includes(pr)) {return pr;}
  }
  return candidates[0];
}

/* your 룰 오버라이드 */
function applyYourOverrides() {
  const row = TWELVE_SHINSAL_BY_DAY_BRANCH['未'];
  if (row) {
    row.장성 = '卯'; // 시지 장성
    row.화개 = '未'; // 일지 화개
    row.망신 = '寅'; // 월지 망신
  }
  HYEONCHIM_BY_STEM['辛'] = '未'; // 현침 오버라이드(일간 辛 → 未)
}

/* ===== 신살 계산 ===== */
export function getShinsalHits(p: SajuPillarsLike, options?: Partial<AnnotateOptions>): ShinsalHit[] {
  const opt = { ...DEFAULT_ANNOTATE_OPTIONS, ...(options || {}) };
  if (opt.ruleSet === 'your') {applyYourOverrides();}

  const hits: ShinsalHit[] = [];

  const dayBranch = normalizeBranchName(p.day.earthlyBranch.name);
  const dayStem = normalizeStemName(p.day.heavenlyStem.name);
  const monthBranch = normalizeBranchName(p.month.earthlyBranch.name);

  const pairs: Array<[PillarKind, string]> = [
    ['year', normalizeBranchName(p.year.earthlyBranch.name)],
    ['month', normalizeBranchName(p.month.earthlyBranch.name)],
    ['day', normalizeBranchName(p.day.earthlyBranch.name)],
    ['time', normalizeBranchName(p.time.earthlyBranch.name)],
  ];

  // 12신살: 각 기둥당 1개만
  if (opt.includeTwelveAll) {
    for (const [kind, br] of pairs) {
      const single = pickTwelveSingle(dayBranch, br);
      if (single) {
        hits.push({ kind: single, pillars: [kind], target: br, detail: '일지(' + dayBranch + ') 기준' });
      }
    }
  } else {
    const dayRule = SHINSAL_SIMPLE_BY_DAY_BRANCH[dayBranch] || {};
    for (const [kind, br] of pairs) {
      const hitKind = dayRule[br];
      if (hitKind) {hits.push({ kind: hitKind, pillars: [kind], target: br, detail: '일지(' + dayBranch + ') 기준' });}
    }
  }

  // 월지 보완(옵션)
  if (opt.useMonthCompletion) {
    const monthRule = YEARMONTH_SHINSAL_BY_MONTH_BRANCH[monthBranch] || {};
    for (const [kind, br] of pairs) {
      const hitKind = monthRule[br];
      if (hitKind) {hits.push({ kind: hitKind, pillars: [kind], target: br, detail: '월지(' + monthBranch + ') 기준' });}
    }
  }

  // 일반 신살/길성
  if (opt.includeGeneralShinsal || opt.includeLuckyDetails) {
    // 공망 계산 (일주 기준)
    const gongmangBranches = getGongmang(dayStem, dayBranch);

    for (const [kind, br] of pairs) {
      if (opt.includeGeneralShinsal) {
        if (getDohwaOn(br)) {hits.push({ kind: '도화', pillars: [kind], target: br });}
        if (getGwimunOn(monthBranch, br, opt.ruleSet)) {hits.push({ kind: '귀문관', pillars: [kind], target: br });}
        if (isHyeonchim(dayStem, br)) {hits.push({ kind: '현침', pillars: [kind], target: br });}
        if (isGosin(monthBranch, br)) {hits.push({ kind: '고신', pillars: [kind], target: br });}
        if (checkGwaegang(dayStem, dayBranch, br)) {hits.push({ kind: '괴강', pillars: [kind], target: br });}
        if (kind === 'day' && checkBaekho(dayStem, dayBranch)) {hits.push({ kind: '백호', pillars: [kind], target: br });}
        if (YANGIN_BY_DAY_STEM[dayStem] === br) {hits.push({ kind: '양인', pillars: [kind], target: br });}

        // 확장 신살 (흉성 계열)
        if (gongmangBranches.includes(br)) {hits.push({ kind: '공망', pillars: [kind], target: br, detail: '일주(' + dayStem + dayBranch + ') 기준' });}
        if (isHongyeomsal(dayStem, br)) {hits.push({ kind: '홍염살', pillars: [kind], target: br });}
        if (isCheonraJimang(br)) {hits.push({ kind: '천라지망', pillars: [kind], target: br });}
        if (isWonjin(dayBranch, br)) {hits.push({ kind: '원진', pillars: [kind], target: br });}
      }
      if (opt.includeLuckyDetails) {
        const ce = CHEONEUL_BY_DAY_STEM[dayStem] || [];
        const tg = TAEGEUK_BY_DAY_STEM[dayStem] || [];
        if (ce.includes(br)) {hits.push({ kind: '천을귀인', pillars: [kind], target: br });}
        if (tg.includes(br)) {hits.push({ kind: '태극귀인', pillars: [kind], target: br });}
        if (isGeumYeoseong(br)) {hits.push({ kind: '금여성', pillars: [kind], target: br });}
        if (isCheonMunSeong(br)) {hits.push({ kind: '천문성', pillars: [kind], target: br });}
        if (isMunChang(br)) {hits.push({ kind: '문창', pillars: [kind], target: br });}
        if (isMunGok(br)) {hits.push({ kind: '문곡', pillars: [kind], target: br });}

        // 확장 신살 (길성 계열)
        if (isCheonuiseong(monthBranch, br)) {hits.push({ kind: '천의성', pillars: [kind], target: br });}
        if (isHakdangGwiin(dayStem, br)) {hits.push({ kind: '학당귀인', pillars: [kind], target: br });}
        if (isCheonjuGwiin(dayStem, br)) {hits.push({ kind: '천주귀인', pillars: [kind], target: br });}
        if (isAmnok(dayStem, br)) {hits.push({ kind: '암록', pillars: [kind], target: br });}
        if (isGeonrok(dayStem, br)) {hits.push({ kind: '건록', pillars: [kind], target: br });}
        if (isJewang(dayStem, br)) {hits.push({ kind: '제왕', pillars: [kind], target: br });}
      }
    }
  }

  // 천덕귀인/월덕귀인: 천간 기준으로 확인
  if (opt.includeLuckyDetails) {
    const stemPairs: Array<[PillarKind, string]> = [
      ['year', normalizeStemName(p.year.heavenlyStem.name)],
      ['month', normalizeStemName(p.month.heavenlyStem.name)],
      ['day', normalizeStemName(p.day.heavenlyStem.name)],
      ['time', normalizeStemName(p.time.heavenlyStem.name)],
    ];
    for (const [kind, stem] of stemPairs) {
      if (isCheondeokGwiin(monthBranch, stem)) {hits.push({ kind: '천덕귀인', pillars: [kind], target: stem, detail: '월지(' + monthBranch + ') 기준' });}
      if (isWoldeokGwiin(monthBranch, stem)) {hits.push({ kind: '월덕귀인', pillars: [kind], target: stem, detail: '월지(' + monthBranch + ') 기준' });}
    }
  }

  // 삼재: 년지 기준 (현재 연도 기준으로 판단하려면 추가 파라미터 필요)
  // 기본적으로 사주 내 년지만 표시 (실제 삼재 시기 판단은 운세 모듈에서)
  const yearBranch = normalizeBranchName(p.year.earthlyBranch.name);
  const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[yearBranch];
  if (samjaeBranches && opt.includeGeneralShinsal) {
    hits.push({ kind: '삼재', pillars: ['year'], target: samjaeBranches.join(','), detail: `${yearBranch}띠 삼재 지지: ${samjaeBranches.join(',')}` });
  }

  // 데모 길/흉성 옵션
  if (options?.includeLucky) {
    for (const [kind, br] of pairs) {
      if (LUCKY_BRANCHES.has(br)) {
        hits.push({ kind: '길성', pillars: [kind], target: br, detail: '예시 길성 세트' });
      }
    }
  }
  if (options?.includeUnlucky) {
    for (const [kind, br] of pairs) {
      if (UNLUCKY_BRANCHES.has(br)) {
        hits.push({ kind: '흉성', pillars: [kind], target: br, detail: '예시 흉성 세트' });
      }
    }
  }

  return hits;
}

export function annotateShinsal(p: SajuPillarsLike, options?: Partial<AnnotateOptions>): ShinsalAnnot {
  const opt = { ...DEFAULT_ANNOTATE_OPTIONS, ...(options || {}) };
  const twelveStage = getTwelveStagesForPillars(p, opt.twelveStageBasis);
  const hits = getShinsalHits(p, opt);

  const byPillar: ShinsalAnnot['byPillar'] = {
    year: { twelveShinsal: [], generalShinsal: [], lucky: [] },
    month: { twelveShinsal: [], generalShinsal: [], lucky: [] },
    day: { twelveShinsal: [], generalShinsal: [], lucky: [] },
    time: { twelveShinsal: [], generalShinsal: [], lucky: [] },
  };

  for (const h of hits) {
    for (const k of h.pillars) {
      // 12신살
      if (['겁살','재살','천살','지살','년살','월살','망신','장성','반안','역마','육해','화개'].includes(h.kind)) {
        if (!byPillar[k].twelveShinsal.includes(h.kind + '살')) {byPillar[k].twelveShinsal.push(h.kind + '살');}
      }
      // 길성 (기존 + 확장 + 추가)
      else if (['천을귀인','태극귀인','금여성','천문성','문창','문곡','천의성','학당귀인','천주귀인','암록','건록','제왕','천덕귀인','월덕귀인'].includes(h.kind)) {
        if (!byPillar[k].lucky.includes(h.kind)) {byPillar[k].lucky.push(h.kind);}
      }
      // 일반/흉성 신살 (기존 + 확장 + 추가)
      else if (['도화','귀문관','현침','고신','괴강','양인','백호','공망','홍염살','천라지망','원진','삼재'].includes(h.kind)) {
        const label = h.kind.endsWith('살') ? h.kind : h.kind + '살';
        if (!byPillar[k].generalShinsal.includes(label)) {byPillar[k].generalShinsal.push(label);}
      }
    }
  }

  return { twelveStage, hits, byPillar };
}

/* ===== 어댑터 ===== */
export interface SajuPillarsAdapterInput {
  yearPillar: { heavenlyStem: { name: string; element: FiveElement }; earthlyBranch: { name: string; element: FiveElement } };
  monthPillar: { heavenlyStem: { name: string; element: FiveElement }; earthlyBranch: { name: string; element: FiveElement } };
  dayPillar: { heavenlyStem: { name: string; element: FiveElement }; earthlyBranch: { name: string; element: FiveElement } };
  timePillar: { heavenlyStem: { name: string; element: FiveElement }; earthlyBranch: { name: string; element: FiveElement } };
}
export function toSajuPillarsLike(input: SajuPillarsAdapterInput): SajuPillarsLike {
  return {
    year: {
      heavenlyStem: { name: normalizeStemName(input.yearPillar.heavenlyStem.name), element: input.yearPillar.heavenlyStem.element },
      earthlyBranch: { name: normalizeBranchName(input.yearPillar.earthlyBranch.name), element: input.yearPillar.earthlyBranch.element },
    },
    month: {
      heavenlyStem: { name: normalizeStemName(input.monthPillar.heavenlyStem.name), element: input.monthPillar.heavenlyStem.element },
      earthlyBranch: { name: normalizeBranchName(input.monthPillar.earthlyBranch.name), element: input.monthPillar.earthlyBranch.element },
    },
    day: {
      heavenlyStem: { name: normalizeStemName(input.dayPillar.heavenlyStem.name), element: input.dayPillar.heavenlyStem.element },
      earthlyBranch: { name: normalizeBranchName(input.dayPillar.earthlyBranch.name), element: input.dayPillar.earthlyBranch.element },
    },
    time: {
      heavenlyStem: { name: normalizeStemName(input.timePillar.heavenlyStem.name), element: input.timePillar.heavenlyStem.element },
      earthlyBranch: { name: normalizeBranchName(input.timePillar.earthlyBranch.name), element: input.timePillar.earthlyBranch.element },
    },
  };
}

/* ===== 단일 12신살/길성 ===== */
export function getTwelveShinsalSingleByPillar(p: SajuPillarsLike, options?: Partial<AnnotateOptions>): { year: string; month: string; day: string; time: string } {
  const opt = { ...DEFAULT_ANNOTATE_OPTIONS, ...(options || {}) };
  if (opt.ruleSet === 'your') {applyYourOverrides();}

  const dayBranch = normalizeBranchName(p.day.earthlyBranch.name);
  const monthBranch = normalizeBranchName(p.month.earthlyBranch.name);
  const monthRule = YEARMONTH_SHINSAL_BY_MONTH_BRANCH[monthBranch] || {};

  const pick = (branchNameRaw: string) => {
    const b = normalizeBranchName(branchNameRaw);
    if (opt.includeTwelveAll) {
      const single = pickTwelveSingle(dayBranch, b);
      return single ? single + '살' : '';
    } else {
      const fromDay = SHINSAL_SIMPLE_BY_DAY_BRANCH[dayBranch]?.[b];
      if (fromDay) {return fromDay + '살';}
    }
    if (opt.useMonthCompletion) {
      const fromMonth = monthRule[b];
      if (fromMonth) {return fromMonth + '살';}
    }
    return '';
  };

  return {
    time: pick(p.time.earthlyBranch.name),
    day: pick(p.day.earthlyBranch.name),
    month: pick(p.month.earthlyBranch.name),
    year: pick(p.year.earthlyBranch.name),
  };
}

export function getLuckySingleByPillar(p: SajuPillarsLike): { year: string; month: string; day: string; time: string } {
  const hits = getShinsalHits(
    {
      year: { heavenlyStem: p.year.heavenlyStem, earthlyBranch: { ...p.year.earthlyBranch, name: normalizeBranchName(p.year.earthlyBranch.name) } },
      month: { heavenlyStem: p.month.heavenlyStem, earthlyBranch: { ...p.month.earthlyBranch, name: normalizeBranchName(p.month.earthlyBranch.name) } },
      day: { heavenlyStem: p.day.heavenlyStem, earthlyBranch: { ...p.day.earthlyBranch, name: normalizeBranchName(p.day.earthlyBranch.name) } },
      time: { heavenlyStem: p.time.heavenlyStem, earthlyBranch: { ...p.time.earthlyBranch, name: normalizeBranchName(p.time.earthlyBranch.name) } },
    },
    { includeLuckyDetails: true, includeGeneralShinsal: false, includeTwelveAll: false }
  );
  const anyLuckyOn = (k: PillarKind) => hits.some(h => ['천을귀인','태극귀인','금여성','천문성','문창','문곡'].includes(h.kind) && h.pillars.includes(k));
  const pick = (k: PillarKind) => anyLuckyOn(k) ? '길성' : '';
  return {
    time: pick('time'),
    day: pick('day'),
    month: pick('month'),
    year: pick('year'),
  };
}

/* ===== 지장간 텍스트 ===== */
// 순서: 여기 → 중기 → 정기 (정기만 있는 지지는 하나만)
export const JIJANGGAN_TEXT_BY_BRANCH: Record<string, string> = {
  '子': '계',           // 정기만
  '丑': '계신기',       // 여기(계) 중기(신) 정기(기)
  '寅': '무병갑',       // 여기(무) 중기(병) 정기(갑)
  '卯': '을',           // 정기만
  '辰': '을계무',       // 여기(을) 중기(계) 정기(무)
  '巳': '무경병',       // 여기(무) 중기(경) 정기(병)
  '午': '기정',         // 여기(기) 정기(정) - 중기 없음
  '未': '정을기',       // 여기(정) 중기(을) 정기(기)
  '申': '무임경',       // 여기(무) 중기(임) 정기(경)
  '酉': '신',           // 정기만
  '戌': '신정무',       // 여기(신) 중기(정) 정기(무)
  '亥': '무임',         // 여기(무) 정기(임) - 중기 없음
};
export function getJijangganText(branchNameRaw: string): string {
  const b = normalizeBranchName(branchNameRaw);
  return JIJANGGAN_TEXT_BY_BRANCH[b] || '';
}
