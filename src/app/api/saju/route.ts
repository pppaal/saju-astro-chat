// src/app/api/saju/route.ts

import { NextResponse } from 'next/server';
import { toDate } from 'date-fns-tz';
import { calculateSajuData } from '@/lib/Saju/saju';
import {
  getDaeunCycles,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
} from '@/lib/Saju/unse';
import { FiveElement, YinYang, SajuPillars } from '@/lib/Saju/types';
import { STEMS } from '@/lib/Saju/constants';
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  getTwelveShinsalSingleByPillar,
} from '@/lib/Saju/shinsal';
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations';

/* -----------------------------
   Utilities
------------------------------*/
function formatSajuForGPT(sajuData: any): string {
  const { yearPillar, monthPillar, dayPillar, timePillar, fiveElements, daeun } = sajuData;
  let prompt = `Analyze the following Saju (Four Pillars of Destiny) information as an expert astrologer.\n\n`;
  prompt += `### 1. Basic Information\n`;
  prompt += `- Four Pillars: ${yearPillar.heavenlyStem.name}${yearPillar.earthlyBranch.name} Year, ${monthPillar.heavenlyStem.name}${monthPillar.earthlyBranch.name} Month, ${dayPillar.heavenlyStem.name}${dayPillar.earthlyBranch.name} Day, ${timePillar.heavenlyStem.name}${timePillar.earthlyBranch.name} Hour\n`;
  prompt += `- Day Master: ${dayPillar.heavenlyStem.name}\n`;
  const currentAge = new Date().getFullYear() - new Date(sajuData.birthDate).getFullYear() + 1;
  const cycles = daeun?.cycles ?? [];
  const currentDaeun = cycles.find((d: any) => currentAge >= d.age && currentAge < d.age + 10);
  if (currentDaeun) {
    prompt += `- Current Grand Cycle: Age ${currentDaeun.age} (${currentDaeun.heavenlyStem}${currentDaeun.earthlyBranch})\n\n`;
  } else {
    prompt += `- Current Grand Cycle: First cycle not started yet.\n\n`;
  }
  prompt += `### 2. Five Elements Distribution\n`;
  prompt += `- Wood: ${fiveElements.wood}\n- Fire: ${fiveElements.fire}\n- Earth: ${fiveElements.earth}\n- Metal: ${fiveElements.metal}\n- Water: ${fiveElements.water}\n\n`;
  prompt += `### 3. Analysis Request\n`;
  prompt += `Provide personality, structure, wealth/health, and this year's advice considering current Grand Cycle.\n`;
  return prompt;
}

const asFiveElement = (e: string): FiveElement => {
  switch (e) {
    case '목': case 'wood': case '木': return '목';
    case '화': case 'fire': case '火': return '화';
    case '토': case 'earth': case '土': return '토';
    case '금': case 'metal': case '金': return '금';
    case '수': case 'water': case '水': return '수';
    default: return '토';
  }
};

const withYY = (src: { name: string; element: string; sibsin?: string }) => {
  const stem = STEMS.find(s => s.name === src.name);
  const yy = (stem ? stem.yin_yang : '양') as YinYang;
  return {
    name: src.name,
    element: asFiveElement(src.element),
    yin_yang: yy,
    sibsin: src.sibsin ?? '',
  };
};

const toBranch = (src: { name: string; element: string; sibsin?: string }) => ({
  name: src.name,
  element: asFiveElement(src.element),
  yin_yang: '양' as YinYang,
  sibsin: src.sibsin ?? '',
});

// KST helper (single)
function nowKST() {
  const now = new Date();
  const y = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now));
  const m = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', month: '2-digit' }).format(now));
  return { year: y, month: m };
}

// Lucky whitelist/ordering
// 라이브러리 kind와 동일한 표기(접미사 '살' 없음)
const LUCKY_ORDER = [
  '도화', '화개', '현침', '귀문관',
  '천을귀인', '태극귀인',
  '역마',
  '금여성', '천문성', '문창', '문곡',
];
const LUCKY_SET = new Set(LUCKY_ORDER);
const sortLucky = (names: string[]) =>
  names.sort((a, b) => LUCKY_ORDER.indexOf(a) - LUCKY_ORDER.indexOf(b));
const pickLucky = (
  items: { kind: string; pillars: string[] }[],
  pillar: 'time' | 'day' | 'month' | 'year'
) =>
  sortLucky(
    Array.from(
      new Set(
        items
          .filter(h => h.pillars.includes(pillar))
          .map(h => h.kind)
          .filter(k => LUCKY_SET.has(k))
      )
    )
  );

/* -----------------------------
   지장간 포매터
------------------------------*/
type JGItem = { name?: string; sibsin?: string };
type JijangganAny = string | { [k: string]: any } | JGItem[] | null | undefined;

const HANGUL_TO_HANJA_STEM: Record<string, string> = {
  갑: '甲', 을: '乙', 병: '丙', 정: '丁', 무: '戊', 기: '己', 경: '庚', 신: '辛', 임: '壬', 계: '癸',
};
const HANJA_TO_HANGUL_STEM: Record<string, string> = Object.fromEntries(
  Object.entries(HANGUL_TO_HANJA_STEM).map(([ko, han]) => [han, ko])
);

// 한자 정규화: (한글 → 한자)
const normalizeStemName = (name?: string) => {
if (!name) return name;
if (HANJA_TO_HANGUL_STEM[name]) return name; // 이미 한자면 그대로
return HANGUL_TO_HANJA_STEM[name] ?? name; // 한글이면 한자로 매핑
};

// 한글로 환원: (한자 → 한글)
const toHangulStem = (name?: string) => {
if (!name) return name;
if (HANGUL_TO_HANJA_STEM[name]) return name; // 이미 한글이면 그대로
return HANJA_TO_HANGUL_STEM[name] ?? name; // 한자면 한글로 매핑
};

// 십신 테이블(일간 → 대상 천간 → 십신)
const SIBSIN_TABLE: Record<string, Record<string, string>> = {
  甲: { 甲: '비견', 乙: '겁재', 丙: '식신', 丁: '상관', 戊: '편재', 己: '정재', 庚: '편관', 辛: '정관', 壬: '편인', 癸: '정인' },
  乙: { 甲: '겁재', 乙: '비견', 丙: '상관', 丁: '식신', 戊: '정재', 己: '편재', 庚: '정관', 辛: '편관', 壬: '정인', 癸: '편인' },
  丙: { 甲: '편인', 乙: '정인', 丙: '비견', 丁: '겁재', 戊: '식신', 己: '상관', 庚: '편재', 辛: '정재', 壬: '편관', 癸: '정관' },
  丁: { 甲: '정인', 乙: '편인', 丙: '겁재', 丁: '비견', 戊: '상관', 己: '식신', 庚: '정재', 辛: '편재', 壬: '정관', 癸: '편관' },
  戊: { 甲: '정관', 乙: '편관', 丙: '편인', 丁: '정인', 戊: '비견', 己: '겁재', 庚: '식신', 辛: '상관', 壬: '편재', 癸: '정재' },
  己: { 甲: '편관', 乙: '정관', 丙: '정인', 丁: '편인', 戊: '겁재', 己: '비견', 庚: '상관', 辛: '식신', 壬: '정재', 癸: '편재' },
  庚: { 甲: '정재', 乙: '편재', 丙: '정관', 丁: '편관', 戊: '편인', 己: '정인', 庚: '비견', 辛: '겁재', 壬: '식신', 癸: '상관' },
  辛: { 甲: '편재', 乙: '정재', 丙: '편관', 丁: '정관', 戊: '정인', 己: '편인', 庚: '겁재', 辛: '비견', 壬: '상관', 癸: '식신' },
  壬: { 甲: '상관', 乙: '식신', 丙: '편재', 丁: '정재', 戊: '정관', 己: '편관', 庚: '편인', 辛: '정인', 壬: '비견', 癸: '겁재' },
  癸: { 甲: '식신', 乙: '상관', 丙: '정재', 丁: '편재', 戊: '편관', 己: '정관', 庚: '정인', 辛: '편인', 壬: '겁재', 癸: '비견' },
};

// 무엇이 오든 {chogi,junggi,jeonggi} 객체로
const coerceJijanggan = (raw: JijangganAny): { chogi?: JGItem; junggi?: JGItem; jeonggi?: JGItem } => {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as any;
  const arr: JGItem[] = Array.isArray(raw)
    ? raw.map((x) => (typeof x === 'object' ? x : { name: String(x) }))
    : String(raw).split('').filter(Boolean).map((ch) => ({ name: ch }));
  return { chogi: arr[0], junggi: arr[1], jeonggi: arr[2] };
};

// 지장간에 십신 보강(표시는 쓰지 않지만 내부 유지)
const enrichSibsin = (jg: { chogi?: JGItem; junggi?: JGItem; jeonggi?: JGItem }, dayMasterStem: string) => {
  const dm = normalizeStemName(dayMasterStem);
  const map = dm ? SIBSIN_TABLE[dm] : undefined;
  if (!map) return jg;
  for (const key of ['chogi', 'junggi', 'jeonggi'] as const) {
    const it = jg[key];
    if (it && it.name) {
      const stemName = normalizeStemName(it.name);
if (!stemName) continue; // undefined 가드
if (!it.sibsin && map[stemName]) {
it.sibsin = map[stemName];
it.name = stemName; // 한자 통일
} else {
it.name = stemName;
}
    }
  }
  return jg;
};

// 원문 문자열/배열 생성(한글로)
const buildJijangganRaw = (raw: JijangganAny) => {
  if (typeof raw === 'string') {
    const list = raw.split('').filter(Boolean);
    return { raw, list };
  }
  if (Array.isArray(raw)) {
    const list = raw.map(v => typeof v === 'string' ? v : (v?.name ?? '')).filter(Boolean);
    return { raw: list.join(''), list };
  }
  if (raw && typeof raw === 'object') {
    const keys: (keyof any)[] = ['chogi', 'junggi', 'jeonggi'];
    const list = keys.map(k => {
      const v: any = (raw as any)[k];
      if (!v) return '';
      const name = typeof v === 'string' ? v : v.name;
      return toHangulStem(name);
    }).filter(Boolean);
    return { raw: list.join(''), list };
  }
  return { raw: '', list: [] as string[] };
};

/* -----------------------------
   Handler
------------------------------*/
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
    }

    const { birthDate: birthDateString, birthTime: birthTimeRaw, gender, calendarType, timezone } = body;
    if (!birthDateString || !birthTimeRaw || !gender || !calendarType || !timezone) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    const birthDate = toDate(`${birthDateString}T${birthTimeRaw}:00`, { timeZone: timezone });
    const adjustedBirthTime = String(birthTimeRaw);

    const sajuResult = calculateSajuData(
      birthDateString,
      adjustedBirthTime,
      gender,
      calendarType,
      timezone,
      false
    );

    const sajuPillars: SajuPillars = {
      year: {
        heavenlyStem: withYY(sajuResult.yearPillar.heavenlyStem),
        earthlyBranch: toBranch(sajuResult.yearPillar.earthlyBranch),
        jijanggan: sajuResult.yearPillar.jijanggan,
      },
      month: {
        heavenlyStem: withYY(sajuResult.monthPillar.heavenlyStem),
        earthlyBranch: toBranch(sajuResult.monthPillar.earthlyBranch),
        jijanggan: sajuResult.monthPillar.jijanggan,
      },
      day: {
        heavenlyStem: withYY(sajuResult.dayPillar.heavenlyStem),
        earthlyBranch: toBranch(sajuResult.dayPillar.earthlyBranch),
        jijanggan: sajuResult.dayPillar.jijanggan,
      },
      time: {
        heavenlyStem: withYY(sajuResult.timePillar.heavenlyStem),
        earthlyBranch: toBranch(sajuResult.timePillar.earthlyBranch),
        jijanggan: sajuResult.timePillar.jijanggan,
      },
    };

    // 운세들
    const daeunInfo = getDaeunCycles(
      birthDate,
      gender,
      sajuPillars,
      sajuResult.dayMaster,
      'Asia/Seoul'
    );
    const { year: currentYearKST, month: currentMonthKST } = nowKST();
    const yeonun = getAnnualCycles(currentYearKST, 10, sajuResult.dayMaster);
    const wolun = getMonthlyCycles(currentYearKST, sajuResult.dayMaster);
    const iljin = getIljinCalendar(currentYearKST, currentMonthKST, sajuResult.dayMaster);

    // 12운성/신살/길성
    const twelveStages = getTwelveStagesForPillars(sajuPillars);

    // your 규칙 적용
    const twelveShinsalSingle = getTwelveShinsalSingleByPillar(sajuPillars, {
  includeTwelveAll: true,
  useMonthCompletion: false,
  ruleSet: 'your',
});

const rawShinsal = getShinsalHits(sajuPillars, {
  includeLucky: true,
  includeUnlucky: true,
  includeTwelveAll: true,
  useMonthCompletion: false,
  includeGeneralShinsal: true,
  includeLuckyDetails: true,
  ruleSet: 'your',
});

    // 표시 데이터 구성
    const dayMasterStem = sajuResult.dayPillar.heavenlyStem.name;

    const buildPillar = (pillar: 'time' | 'day' | 'month' | 'year') => {
      const p = sajuResult[`${pillar}Pillar` as const];
      const jgRaw = buildJijangganRaw(p.jijanggan);
      const jgObj = enrichSibsin(coerceJijanggan(p.jijanggan), dayMasterStem);
      const display = ['chogi', 'junggi', 'jeonggi']
        .map(k => {
          const it: any = (jgObj as any)[k];
          if (!it?.name) return '';
          const han = it.name; // hanja
          const sib = it.sibsin ? `(${it.sibsin})` : '';
          return `${han}${sib}`;
        })
        .filter(Boolean)
        .join(' · ');
      const shinsalKinds = rawShinsal.filter(h => h.pillars.includes(pillar)).map(h => h.kind);

        // [여기부터 추가] 길성 화이트리스트 + 라벨
  const LUCKY_ORDER = [
    '도화','화개','현침','귀문관','역마','고신',
    '천을귀인','태극귀인','금여성','천문성','문창','문곡',
  ];
  const LUCKY_SET = new Set(LUCKY_ORDER);

  const luckyKinds = Array.from(new Set(
    rawShinsal
      .filter(h => h.pillars.includes(pillar))
      .map(h => h.kind)
      .filter(k => LUCKY_SET.has(k))
  )).sort((a, b) => LUCKY_ORDER.indexOf(a) - LUCKY_ORDER.indexOf(b));

  const _lucky = luckyKinds.map(n =>
    ['천을귀인','태극귀인','금여성','천문성','문창','문곡'].includes(n) ? n : `${n}살`
  );
  // [추가 끝]


      return {
        stem: p.heavenlyStem.name,
        branch: p.earthlyBranch.name,
        jijanggan: {
          raw: jgRaw.raw,
          list: jgRaw.list,
          display,
          object: jgObj,
        },
        twelveStage: twelveStages[pillar],
        twelveShinsal: Array.isArray(twelveShinsalSingle[pillar])
          ? twelveShinsalSingle[pillar]
          : [twelveShinsalSingle[pillar]].filter(Boolean),
        lucky: pickLucky(rawShinsal, pillar),
        shinsal: shinsalKinds,
        shinsalSummary: pickLucky(rawShinsal, pillar).join('·'),
      };
    };

    const byPillar = {
      time: buildPillar('time'),
      day: buildPillar('day'),
      month: buildPillar('month'),
      year: buildPillar('year'),
    };

    // 관계 분석
    const relationsInput = toAnalyzeInputFromSaju(
      {
        year: sajuResult.yearPillar,
        month: sajuResult.monthPillar,
        day: sajuResult.dayPillar,
        time: sajuResult.timePillar,
      },
      sajuResult.dayPillar.heavenlyStem.name
    );
    const relations = analyzeRelations(relationsInput);

    const gptPrompt = formatSajuForGPT({
      ...sajuResult,
      birthDate: birthDateString,
      daeun: daeunInfo,
    });

    return NextResponse.json({
      birthYear: new Date(birthDateString).getFullYear(),
      birthDate: birthDateString,
      yearPillar: sajuResult.yearPillar,
      monthPillar: sajuResult.monthPillar,
      dayPillar: sajuResult.dayPillar,
      timePillar: sajuResult.timePillar,
      fiveElements: sajuResult.fiveElements,
      dayMaster: sajuResult.dayMaster,

      daeun: daeunInfo,
      yeonun,
      wolun,
      iljin,

      // 표 렌더링용
      table: { byPillar },

      // 카드 렌더링용 신살
      shinsal: (rawShinsal || [])
        .map(h => {
          const first = h.pillars?.[0];
          const scope =
            first === 'year' ? '연주' :
            first === 'month' ? '월주' :
            first === 'day' ? '일주' :
            first === 'time' ? '시주' : '';
          return {
            name: h.kind,
            scope,
            from: h.target ?? '',
            to: '',
            note: h.detail ?? '',
          };
        })
        .filter(x => x.name && x.scope),

      // 디버깅 원본
      shinsalRaw: rawShinsal,

      relations,
      gptPrompt,
    });
  } catch (error) {
    console.error('[API /api/saju] Uncaught error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: `Internal Server Error: ${msg}` }, { status: 500 });
  }
}
