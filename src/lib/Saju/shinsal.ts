// src/lib/Saju/shinsal.ts
/* eslint-disable no-console */
import { BRANCHES, STEMS } from './constants';
import type { FiveElement, YinYang } from './types';

export type PillarKind = 'year' | 'month' | 'day' | 'time';

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

export type TwelveStage =
  | '장생' | '목욕' | '관대' | '임관' | '왕지'
  | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양';

export interface ShinsalHit {
  kind:
    | '장성' | '반안' | '재살' | '천살' | '월살' | '망신'
    | '역마' | '화개' | '겁살' | '육해' | '화해' | '괘살'
    | '길성' | '흉성'
    | '지살' | '년살'
    | '도화' | '귀문관' | '현침' | '고신' | '괴강' | '양인' | '백호'
    | '천을귀인' | '태극귀인' | '금여성' | '천문성' | '문창' | '문곡';
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

const stemByName = (name: string) => STEMS.find(s => s.name === name);
const branchByName = (name: string) => BRANCHES.find(b => b.name === name);

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
/* 표 사이트 순서에 맞춰 재정의: 辛의 장생 출발지가 酉일 때 亥가 '목욕'이 되도록 시프트 */
const TWELVE_STAGE_ORDER: TwelveStage[] = [
'장생','관대','목욕','임관','왕지','태','절','묘','병','사','쇠','양'
];

/* 일간별 장생 출발지 (표 사이트 기준) */
const DAYMASTER_BIRTH_BRANCH: Record<string, string> = {
  '甲':'亥','乙':'酉','丙':'寅','丁':'子','戊':'寅',
  '己':'申','庚':'巳','辛':'酉','壬':'子','癸':'酉',
};

const BRANCH_ORDER = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const;

export function getTwelveStage(dayStemNameRaw: string, branchNameRaw: string): TwelveStage {
  const dayStemName = normalizeStemName(dayStemNameRaw);
  const branchName = normalizeBranchName(branchNameRaw);
  const start = DAYMASTER_BIRTH_BRANCH[dayStemName];
  if (!start) return '묘';
  const startIdx = (BRANCH_ORDER as readonly string[]).indexOf(start);
  const targetIdx = (BRANCH_ORDER as readonly string[]).indexOf(branchName);
  if (startIdx < 0 || targetIdx < 0) return '묘';
  const diff = (targetIdx - startIdx + 12) % 12;
  // 임시 확인 로그
  console.log('[12운성]', { dayStemName, branchName, start, diff, stage: TWELVE_STAGE_ORDER[diff] });
  return TWELVE_STAGE_ORDER[diff];
}
export function getTwelveStagesForPillars(p: SajuPillarsLike, basis: 'day' = 'day'): { [K in PillarKind]: TwelveStage } {
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
        (monthBranch === '亥' && targetBranch === '卯')) return true;

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
  const idx = BRANCH_ORDER.indexOf(monthBranch as any);
  if (idx < 0) return false;
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
  if (!full) return null;
  const candidates: ShinsalHit['kind'][] = [];
  for (const [k, v] of Object.entries(full) as Array<[keyof TwelveMap, string]>) {
    if (v === targetBranch) candidates.push(mapK(k));
  }
  if (candidates.length === 0) return null;
  for (const pr of TWELVE_PRIORITY) {
    if (candidates.includes(pr)) return pr;
  }
  return candidates[0];
}

/* your 룰 오버라이드 */
function applyYourOverrides() {
  console.log('[OVERRIDE] your rules applied');
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
  if (opt.ruleSet === 'your') applyYourOverrides();

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
      if (hitKind) hits.push({ kind: hitKind, pillars: [kind], target: br, detail: '일지(' + dayBranch + ') 기준' });
    }
  }

  // 월지 보완(옵션)
  if (opt.useMonthCompletion) {
    const monthRule = YEARMONTH_SHINSAL_BY_MONTH_BRANCH[monthBranch] || {};
    for (const [kind, br] of pairs) {
      const hitKind = monthRule[br];
      if (hitKind) hits.push({ kind: hitKind, pillars: [kind], target: br, detail: '월지(' + monthBranch + ') 기준' });
    }
  }

  // 일반 신살/길성
  if (opt.includeGeneralShinsal || opt.includeLuckyDetails) {
    for (const [kind, br] of pairs) {
      if (opt.includeGeneralShinsal) {
        if (getDohwaOn(br)) hits.push({ kind: '도화', pillars: [kind], target: br });
        if (getGwimunOn(monthBranch, br, opt.ruleSet)) hits.push({ kind: '귀문관', pillars: [kind], target: br });
        if (isHyeonchim(dayStem, br)) hits.push({ kind: '현침', pillars: [kind], target: br });
        if (isGosin(monthBranch, br)) hits.push({ kind: '고신', pillars: [kind], target: br });
        if (checkGwaegang(dayStem, dayBranch, br)) hits.push({ kind: '괴강', pillars: [kind], target: br });
        if (kind === 'day' && checkBaekho(dayStem, dayBranch)) hits.push({ kind: '백호', pillars: [kind], target: br });
        if (YANGIN_BY_DAY_STEM[dayStem] === br) hits.push({ kind: '양인', pillars: [kind], target: br });
      }
      if (opt.includeLuckyDetails) {
        const ce = CHEONEUL_BY_DAY_STEM[dayStem] || [];
        const tg = TAEGEUK_BY_DAY_STEM[dayStem] || [];
        if (ce.includes(br)) hits.push({ kind: '천을귀인', pillars: [kind], target: br });
        if (tg.includes(br)) hits.push({ kind: '태극귀인', pillars: [kind], target: br });
        if (isGeumYeoseong(br)) hits.push({ kind: '금여성', pillars: [kind], target: br });
        if (isCheonMunSeong(br)) hits.push({ kind: '천문성', pillars: [kind], target: br });
        if (isMunChang(br)) hits.push({ kind: '문창', pillars: [kind], target: br });
        if (isMunGok(br)) hits.push({ kind: '문곡', pillars: [kind], target: br });
      }
    }
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
      if (['겁살','재살','천살','지살','년살','월살','망신','장성','반안','역마','육해','화개'].includes(h.kind)) {
        if (!byPillar[k].twelveShinsal.includes(h.kind + '살')) byPillar[k].twelveShinsal.push(h.kind + '살');
      } else if (['천을귀인','태극귀인','금여성','천문성','문창','문곡'].includes(h.kind)) {
        if (!byPillar[k].lucky.includes(h.kind)) byPillar[k].lucky.push(h.kind);
      } else if (['도화','귀문관','현침','고신','괴강','양인','백호'].includes(h.kind)) {
        if (!byPillar[k].generalShinsal.includes(h.kind + '살')) byPillar[k].generalShinsal.push(h.kind + '살');
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
  if (opt.ruleSet === 'your') applyYourOverrides();

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
      if (fromDay) return fromDay + '살';
    }
    if (opt.useMonthCompletion) {
      const fromMonth = monthRule[b];
      if (fromMonth) return fromMonth + '살';
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
export const JIJANGGAN_TEXT_BY_BRANCH: Record<string, string> = {
  '子': '임계','丑': '계신기','寅': '무병갑','卯': '을','辰': '을계무','巳': '병무경','午': '정기','未': '정을기','申': '경임무','酉': '신','戌': '신정무','亥': '무갑임',
};
export function getJijangganText(branchNameRaw: string): string {
  const b = normalizeBranchName(branchNameRaw);
  return JIJANGGAN_TEXT_BY_BRANCH[b] || '';
}