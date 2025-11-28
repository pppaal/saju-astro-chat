// src/lib/Saju/relations.ts

import { BRANCHES, STEMS } from './constants';
import type { PillarKind, RelationHit } from './types';

/* ========== 옵션/유틸 ========== */
export interface AnalyzeRelationsOptions {
  includeHeavenly: boolean;               // 천간 관계 포함
  includeEarthly: boolean;                // 지지 관계 포함
  includeGongmang: boolean;               // 공망 포함
  includeHeavenlyTransformNote?: boolean; // 천간 합화 오행 표기
  includeTrineElementNote?: boolean;      // 삼합/방합 변국 오행 표기
  includeSelfPunish?: boolean;            // 자기형 포함(子子, 午午 등)

  // 공망 산정 기준
  // - 'dayPillar-60jiazi': 일주(60갑자) 기준 공망표 사용(권장, 첨부표와 일치)
  // - 'dayMaster-basic'  : 일간만으로 6패턴 반복(종전 방식)
  // - 'yearPillar-basic' : 연간만으로 6패턴 반복
  gongmangPolicy?: 'dayPillar-60jiazi' | 'dayMaster-basic' | 'yearPillar-basic';

  // 천간충 판정 폭
  // - '4'  : 갑-경, 을-신, 병-임, 정-계 (기존)
  // - '5'  : 위 4쌍 + 무-갑, 기-을
  // - '10' : 양간↔양간, 음간↔음간 전부(갑↔경, 병↔임, 무↔갑… 등 10쌍)
  heavenlyClashMode?: '4' | '5' | '10';
}

export const DEFAULT_RELATION_OPTIONS: AnalyzeRelationsOptions = {
  includeHeavenly: true,
  includeEarthly: true,
  includeGongmang: true,
  includeHeavenlyTransformNote: true,
  includeTrineElementNote: true,
  includeSelfPunish: true,
  gongmangPolicy: 'dayPillar-60jiazi',
  heavenlyClashMode: '5',
};

const stemIndex = (name: string) => STEMS.findIndex(s => s.name === name);
const inSetPair = (a: string, b: string, set: Set<string>) => set.has(`${a}-${b}`);

/* 공통: 한글 지지 → 한자 */
const BRANCH_KO_TO_HAN: Record<string, string> = {
  '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
  '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥',
};
export function normalizeBranchName(n: string): string {
  const t = String(n || '').trim();
  return BRANCH_KO_TO_HAN[t] || t;
}

/* ========== 천간 관계 ========== */
// 천간합(합화 오행)
const HEAVENLY_COMBINES: Record<string, { pair: string; transform?: '목' | '화' | '토' | '금' | '수' }> = {
  '甲': { pair: '己', transform: '토' },
  '乙': { pair: '庚', transform: '금' },
  '丙': { pair: '辛', transform: '수' },
  '丁': { pair: '壬', transform: '목' },
  '戊': { pair: '癸', transform: '화' },
};

// 천간충 세트(모드별)
const HEAVENLY_CLASH_SETS = {
  '4': new Set([
    '甲-庚','庚-甲','乙-辛','辛-乙','丙-壬','壬-丙','丁-癸','癸-丁',
  ]),
  '5': new Set([
    '甲-庚','庚-甲','乙-辛','辛-乙','丙-壬','壬-丙','丁-癸','癸-丁',
    '戊-甲','甲-戊','己-乙','乙-己',
  ]),
  // 10쌍: 양간끼리/음간끼리 상충 전부
  '10': new Set([
    // 양간: 甲丙戊庚壬
    '甲-丙','丙-甲','甲-戊','戊-甲','甲-庚','庚-甲','甲-壬','壬-甲',
    '丙-戊','戊-丙','丙-庚','庚-丙','丙-壬','壬-丙',
    '戊-庚','庚-戊','戊-壬','壬-戊','庚-壬','壬-庚',
    // 음간: 乙丁己辛癸
    '乙-丁','丁-乙','乙-己','己-乙','乙-辛','辛-乙','乙-癸','癸-乙',
    '丁-己','己-丁','丁-辛','辛-丁','丁-癸','癸-丁',
    '己-辛','辛-己','己-癸','癸-己','辛-癸','癸-辛',
  ]),
};

function analyzeHeavenly(
  p: PillarInput,
  includeTransformNote: boolean,
  clashMode: AnalyzeRelationsOptions['heavenlyClashMode'],
): RelationHit[] {
  const hits: RelationHit[] = [];
  const pairs: Array<[PillarKind, string]> = [
    ['year', p.year.heavenlyStem],
    ['month', p.month.heavenlyStem],
    ['day', p.day.heavenlyStem],
    ['time', p.time.heavenlyStem],
  ];
  const CLASH = HEAVENLY_CLASH_SETS[clashMode || '5'];

  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const [ak, a] = pairs[i];
      const [bk, b] = pairs[j];

      // 합
      const c1 = HEAVENLY_COMBINES[a];
      const c2 = HEAVENLY_COMBINES[b];
      if (c1?.pair === b || c2?.pair === a) {
        const tr = c1?.pair === b ? c1.transform : c2?.transform;
        const d = includeTransformNote && tr ? `${a}-${b} 합화${tr}` : `${a}-${b} 합`;
        hits.push({ kind: '천간합', pillars: [ak, bk], detail: d });
      }

      // 충
      if (CLASH.has(`${a}-${b}`)) {
        hits.push({ kind: '천간충', pillars: [ak, bk], detail: `${a}-${b} 충` });
      }
    }
  }
  return hits;
}

/* ========== 지지 관계 ========== */
// 육합
const EARTHLY_SIX_COMBINES: Record<string, string> = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午',
};

// 삼합(삼합국)
const EARTHLY_TRINES: Array<{ set: [string, string, string]; element: '목' | '화' | '금' | '수' }> = [
  { set: ['申', '子', '辰'], element: '수' },
  { set: ['亥', '卯', '未'], element: '목' },
  { set: ['寅', '午', '戌'], element: '화' },
  { set: ['巳', '酉', '丑'], element: '금' },
];

// 방합(반합)
const EARTHLY_HALF_TRINES: Array<{ pair: [string, string]; element: '목' | '화' | '금' | '수' }> = [
  { pair: ['申', '子'], element: '수' }, { pair: ['子', '辰'], element: '수' },
  { pair: ['亥', '卯'], element: '목' }, { pair: ['卯', '未'], element: '목' },
  { pair: ['寅', '午'], element: '화' }, { pair: ['午', '戌'], element: '화' },
  { pair: ['巳', '酉'], element: '금' }, { pair: ['酉', '丑'], element: '금' },
];

// 충(정충)
const EARTHLY_CLASH_PAIRS = new Set([
  '子-午','午-子','丑-未','未-丑','寅-申','申-寅',
  '卯-酉','酉-卯','辰-戌','戌-辰','巳-亥','亥-巳',
]);

// 형(삼형 + 특수형 + 자기형 옵션)
const EARTHLY_PUNISH_SETS: Array<Set<string>> = [
  new Set(['寅','巳','申']), // 인사신 삼형
  new Set(['丑','戌','未']), // 축술미 삼형
];
const EARTHLY_PUNISH_PAIRS = new Set([
  '子-卯','卯-子', // 무은형
]);
const SELF_PUNISH_PAIRS = new Set([
  '子-子','丑-丑','寅-寅','卯-卯','辰-辰','巳-巳','午-午','未-未','申-申','酉-酉','戌-戌','亥-亥',
]);

// 파
const EARTHLY_BREAK_PAIRS = new Set([
  '子-酉','酉-子','丑-辰','辰-丑','寅-亥','亥-寅',
  '卯-午','午-卯','申-巳','巳-申','未-戌','戌-未',
]);

// 해
const EARTHLY_HARM_PAIRS = new Set([
  '子-未','未-子','丑-午','午-丑','寅-巳','巳-寅',
  '卯-辰','辰-卯','申-亥','亥-申','酉-戌','戌-酉',
]);

// 원진 — 수정(표준 6쌍 대칭)
const EARTHLY_YUANJIN_PAIRS = new Set([
  '子-未','未-子',
  '丑-午','午-丑',
  '寅-巳','巳-寅',
  '卯-辰','辰-卯',
  '申-亥','亥-申',
  '酉-戌','戌-酉',
]);

function analyzeEarthly(
  p: PillarInput,
  includeTrineNote: boolean,
  includeSelfPunish: boolean,
): RelationHit[] {
  const hits: RelationHit[] = [];
  const pairs: Array<[PillarKind, string]> = [
    ['year', normalizeBranchName(p.year.earthlyBranch)],
    ['month', normalizeBranchName(p.month.earthlyBranch)],
    ['day', normalizeBranchName(p.day.earthlyBranch)],
    ['time', normalizeBranchName(p.time.earthlyBranch)],
  ];

  // 2지지 관계
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const [ak, a] = pairs[i];
      const [bk, b] = pairs[j];

      // 육합
      if (EARTHLY_SIX_COMBINES[a] === b) {
        hits.push({ kind: '지지육합', pillars: [ak, bk], detail: `${a}-${b} 육합` });
      }
      // 충
      if (inSetPair(a, b, EARTHLY_CLASH_PAIRS)) {
        hits.push({ kind: '지지충', pillars: [ak, bk], detail: `${a}-${b} 충` });
      }
      // 형
      if (
        EARTHLY_PUNISH_SETS.some(set => set.has(a) && set.has(b)) ||
        inSetPair(a, b, EARTHLY_PUNISH_PAIRS) ||
        (includeSelfPunish && inSetPair(a, b, SELF_PUNISH_PAIRS))
      ) {
        hits.push({ kind: '지지형', pillars: [ak, bk], detail: `${a}-${b} 형` });
      }
      // 파
      if (inSetPair(a, b, EARTHLY_BREAK_PAIRS)) {
        hits.push({ kind: '지지파', pillars: [ak, bk], detail: `${a}-${b} 파` });
      }
      // 해
      if (inSetPair(a, b, EARTHLY_HARM_PAIRS)) {
        hits.push({ kind: '지지해', pillars: [ak, bk], detail: `${a}-${b} 해` });
      }
      // 원진
      if (inSetPair(a, b, EARTHLY_YUANJIN_PAIRS)) {
        hits.push({ kind: '원진', pillars: [ak, bk], detail: `${a}-${b} 원진` });
      }
      // 방합(반합) — 삼합이 이미 성립하면 동일 세트 방합은 숨김(중복 방지)
      const half = EARTHLY_HALF_TRINES.find(
        ({ pair }) =>
          (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a),
      );
      if (half) {
        const sameSet = EARTHLY_TRINES.find(tri => tri.set.includes(half.pair[0]) && tri.set.includes(half.pair[1]));
        const allBranches = pairs.map(([_, v]) => v);
        const triSatisfied = !!sameSet && sameSet.set.every(z => allBranches.includes(z));
        if (!triSatisfied) {
          hits.push({
            kind: '지지방합',
            pillars: [ak, bk],
            detail: includeTrineNote ? `${a}-${b} 방합(${half.element})` : `${a}-${b} 방합`,
          });
        }
      }
    }
  }

  // 삼합(3지지 충족 시)
  const all = pairs.map(([k, v]) => ({ k, v }));
  for (const tri of EARTHLY_TRINES) {
    const present = all.filter(x => tri.set.includes(x.v));
    if (present.length >= 3) {
      const ps = present.slice(0, 3).map(x => x.k) as PillarKind[];
      hits.push({
        kind: '지지삼합',
        pillars: ps,
        detail: includeTrineNote ? `${tri.set.join('·')} 삼합(${tri.element})` : `${tri.set.join('·')} 삼합`,
      });
    }
  }

  return hits;
}

/* ========== 공망(空亡) ========== */
// 60갑자 일주 기준 공망표(이미지 표와 일치)
const GONGMANG_BY_DAY_PILLAR: Record<string, [string, string]> = {
  // 戌亥
  '甲子':['戌','亥'],'乙丑':['戌','亥'],'丙寅':['戌','亥'],'丁卯':['戌','亥'],'戊辰':['戌','亥'],
  '己巳':['戌','亥'],'庚午':['戌','亥'],'辛未':['戌','亥'],'壬申':['戌','亥'],'癸酉':['戌','亥'],
  // 申酉
  '甲戌':['申','酉'],'乙亥':['申','酉'],'丙子':['申','酉'],'丁丑':['申','酉'],'戊寅':['申','酉'],
  '己卯':['申','酉'],'庚辰':['申','酉'],'辛巳':['申','酉'],'壬午':['申','酉'],'癸未':['申','酉'],
  // 午未
  '甲申':['午','未'],'乙酉':['午','未'],'丙戌':['午','未'],'丁亥':['午','未'],'戊子':['午','未'],
  '己丑':['午','未'],'庚寅':['午','未'],'辛卯':['午','未'],'壬辰':['午','未'],'癸巳':['午','未'],
  // 辰巳
  '甲午':['辰','巳'],'乙未':['辰','巳'],'丙申':['辰','巳'],'丁酉':['辰','巳'],'戊戌':['辰','巳'],
  '己亥':['辰','巳'],'庚子':['辰','巳'],'辛丑':['辰','巳'],'壬寅':['辰','巳'],'癸卯':['辰','巳'],
  // 寅卯
  '甲辰':['寅','卯'],'乙巳':['寅','卯'],'丙午':['寅','卯'],'丁未':['寅','卯'],'戊申':['寅','卯'],
  '己酉':['寅','卯'],'庚戌':['寅','卯'],'辛亥':['寅','卯'],'壬子':['寅','卯'],'癸丑':['寅','卯'],
  // 子丑
  '甲寅':['子','丑'],'乙卯':['子','丑'],'丙辰':['子','丑'],'丁巳':['子','丑'],'戊午':['子','丑'],
  '己未':['子','丑'],'庚申':['子','丑'],'辛酉':['子','丑'],'壬戌':['子','丑'],'癸亥':['子','丑'],
};

// 종전: 일간/연간만으로 6패턴 반복
const GONGMANG_BY_STEM_INDEX: Record<number, [string, string]> = {
  // 0=甲,1=乙,2=丙,3=丁,4=戊,5=己,6=庚,7=辛,8=壬,9=癸
  0: ['戌','亥'], 1: ['申','酉'], 2: ['午','未'], 3: ['辰','巳'], 4: ['寅','卯'],
  5: ['子','丑'], 6: ['戌','亥'], 7: ['申','酉'], 8: ['午','未'], 9: ['辰','巳'],
};

function analyzeGongmang(
  p: PillarInput,
  policy: AnalyzeRelationsOptions['gongmangPolicy'],
  dayMasterStem?: string,
): RelationHit[] {
  const hits: RelationHit[] = [];

  let gm: [string, string] | undefined;

  if (policy === 'dayPillar-60jiazi') {
    const dayPillar = `${p.day.heavenlyStem}${normalizeBranchName(p.day.earthlyBranch)}`;
    gm = GONGMANG_BY_DAY_PILLAR[dayPillar];
  } else {
    // basic 모드: 일간/연간의 천간으로 공망 계산
    let baseStem = dayMasterStem ?? p.day.heavenlyStem;
    if (policy === 'yearPillar-basic') baseStem = p.year.heavenlyStem;
    const idx = stemIndex(baseStem);
    if (idx >= 0) gm = GONGMANG_BY_STEM_INDEX[idx];
  }

  if (!gm) return hits;
  const [b1, b2] = gm;

  const map: Array<[PillarKind, string]> = [
    ['year', normalizeBranchName(p.year.earthlyBranch)],
    ['month', normalizeBranchName(p.month.earthlyBranch)],
    ['day', normalizeBranchName(p.day.earthlyBranch)],
    ['time', normalizeBranchName(p.time.earthlyBranch)],
  ];

  for (const [k, v] of map) {
    if (v === b1 || v === b2) {
      hits.push({ kind: '공망', pillars: [k], detail: `공망(${v})` });
    }
  }
  return hits;
}

/* ========== 외부 API ========== */
export interface PillarInput {
  year:  { heavenlyStem: string; earthlyBranch: string };
  month: { heavenlyStem: string; earthlyBranch: string };
  day:   { heavenlyStem: string; earthlyBranch: string };
  time:  { heavenlyStem: string; earthlyBranch: string };
}
export interface AnalyzeInput {
  pillars: PillarInput;
  dayMasterStem?: string;
  options?: Partial<AnalyzeRelationsOptions>;
}

export function analyzeRelations(input: AnalyzeInput): RelationHit[] {
  const { pillars, dayMasterStem, options } = input;
  const opt: AnalyzeRelationsOptions = { ...DEFAULT_RELATION_OPTIONS, ...(options || {}) };

  const hits: RelationHit[] = [];
  if (opt.includeHeavenly) {
    hits.push(...analyzeHeavenly(pillars, !!opt.includeHeavenlyTransformNote, opt.heavenlyClashMode));
  }
  if (opt.includeEarthly) {
    hits.push(...analyzeEarthly(pillars, !!opt.includeTrineElementNote, !!opt.includeSelfPunish));
  }
  if (opt.includeGongmang) {
    hits.push(...analyzeGongmang(pillars, opt.gongmangPolicy!, dayMasterStem));
  }

  // 정렬: kind, 기둥 수, detail
  return hits.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      (a.pillars.length - b.pillars.length) ||
      (a.detail || '').localeCompare(b.detail || ''),
  );
}

/* ========== 어댑터: 기존 Pillars 구조 → AnalyzeInput ========== */
export function toAnalyzeInputFromSaju(
  p: {
    year:  { heavenlyStem: { name: string }; earthlyBranch: { name: string } };
    month: { heavenlyStem: { name: string }; earthlyBranch: { name: string } };
    day:   { heavenlyStem: { name: string }; earthlyBranch: { name: string } };
    time:  { heavenlyStem: { name: string }; earthlyBranch: { name: string } };
  },
  dayMasterStemName?: string,
  options?: Partial<AnalyzeRelationsOptions>,
): AnalyzeInput {
  return {
    pillars: {
      year:  { heavenlyStem: p.year.heavenlyStem.name,  earthlyBranch: p.year.earthlyBranch.name },
      month: { heavenlyStem: p.month.heavenlyStem.name, earthlyBranch: p.month.earthlyBranch.name },
      day:   { heavenlyStem: p.day.heavenlyStem.name,   earthlyBranch: p.day.earthlyBranch.name },
      time:  { heavenlyStem: p.time.heavenlyStem.name,  earthlyBranch: p.time.earthlyBranch.name },
    },
    dayMasterStem: dayMasterStemName,
    options,
  };
}