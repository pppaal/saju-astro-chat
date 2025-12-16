// src/app/api/saju/route.ts

import { NextResponse } from 'next/server';
import { toDate } from 'date-fns-tz';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import Stripe from 'stripe';
import { calculateSajuData } from '@/lib/Saju/saju';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { checkAndConsumeCredits, creditErrorResponse } from '@/lib/credits/withCredits';
import { getCreditBalance } from '@/lib/credits/creditService';

// simple in-memory cache to reduce repeated Stripe lookups per runtime
const premiumCache = new Map<string, { value: boolean; expires: number }>();
const PREMIUM_TTL_MS = 5 * 60 * 1000;

function getCachedPremium(email: string) {
  const entry = premiumCache.get(email.toLowerCase());
  if (entry && entry.expires > Date.now()) return entry.value;
  return null;
}

function setCachedPremium(email: string, value: boolean) {
  premiumCache.set(email.toLowerCase(), { value, expires: Date.now() + PREMIUM_TTL_MS });
}

// 프리미엄 상태 확인 헬퍼
async function checkPremiumStatus(email?: string, ip?: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !email) return false;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email) || email.length > 254) return false;

  const cached = getCachedPremium(email);
  if (cached !== null) return cached;

  try {
    const rlKey = `saju-premium:${email.toLowerCase()}:${ip ?? 'unknown'}`;
    const limit = await rateLimit(rlKey, { limit: 5, windowSeconds: 60 });
    if (!limit.allowed) {
      return false;
    }

    const stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' as any });
    const customers = await stripe.customers.search({
      query: `email:'${email}'`,
      limit: 3,
    });

    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: c.id,
        status: 'all',
        limit: 5,
      });
      const active = subs.data.find((s) =>
        ['active', 'trialing', 'past_due'].includes(s.status)
      );
      if (active) {
        setCachedPremium(email, true);
        return true;
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Premium check failed:', e);
  }
  setCachedPremium(email, false);
  return false;
}
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

// === 고급 분석 모듈 import ===
import { determineGeokguk, getGeokgukDescription } from '@/lib/Saju/geokguk';
import {
  determineYongsin,
  getYongsinDescription,
  getLuckyColors,
  getLuckyDirection,
  getLuckyNumbers,
} from '@/lib/Saju/yongsin';
import { analyzeHyeongchung } from '@/lib/Saju/hyeongchung';
import { calculateTonggeun, calculateDeukryeong } from '@/lib/Saju/tonggeun';
import { getJohuYongsin } from '@/lib/Saju/johuYongsin';
import { analyzeSibsinComprehensive } from '@/lib/Saju/sibsinAnalysis';
import { analyzeHealth, analyzeCareer } from '@/lib/Saju/healthCareer';
import { generateComprehensiveReport } from '@/lib/Saju/comprehensiveReport';
import { calculateComprehensiveScore } from '@/lib/Saju/strengthScore';
import {
  getTwelveStageInterpretation,
  getElementInterpretation,
} from '@/lib/Saju/interpretations';

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

// 타임존 기반 현재 날짜 헬퍼
function getNowInTimezone(tz?: string) {
  const now = new Date();
  const effectiveTz = tz || 'Asia/Seoul';
  try {
    const y = Number(new Intl.DateTimeFormat('en-CA', { timeZone: effectiveTz, year: 'numeric' }).format(now));
    const m = Number(new Intl.DateTimeFormat('en-CA', { timeZone: effectiveTz, month: '2-digit' }).format(now));
    const d = Number(new Intl.DateTimeFormat('en-CA', { timeZone: effectiveTz, day: '2-digit' }).format(now));
    return { year: y, month: m, day: d };
  } catch {
    // fallback to KST
    const y = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now));
    const m = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', month: '2-digit' }).format(now));
    const d = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', day: '2-digit' }).format(now));
    return { year: y, month: m, day: d };
  }
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
    const ip = getClientIp(req.headers as Headers);
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
    }

    const { birthDate: birthDateString, birthTime: birthTimeRaw, gender, calendarType, timezone, userTimezone } = body;
    if (!birthDateString || !birthTimeRaw || !gender || !calendarType || !timezone) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // 세션 및 크레딧 확인
    const session = await getServerSession(authOptions);

    // 크레딧 시스템으로 프리미엄 체크 (새로운 방식)
    let isPremium = false;
    let creditBalance = null;

    if (session?.user?.id) {
      // 크레딧 체크 및 소비
      const creditResult = await checkAndConsumeCredits("reading", 1);
      if (!creditResult.allowed) {
        return creditErrorResponse(creditResult);
      }

      // 플랜 기반 프리미엄 체크
      creditBalance = await getCreditBalance(session.user.id);
      isPremium = creditBalance.plan !== "free";
    } else {
      // 비로그인 사용자: 기존 Stripe 체크 (호환성)
      isPremium = session?.user?.email
        ? await checkPremiumStatus(session.user.email, ip)
        : false;
    }

    // 사용자 현재 위치 타임존 (운세 계산용) - 없으면 출생 타임존 사용
    const effectiveUserTz = userTimezone || timezone;

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
    // 사용자 타임존 기준 현재 날짜로 운세 계산
    const userNow = getNowInTimezone(effectiveUserTz);
    const yeonun = getAnnualCycles(userNow.year, 10, sajuResult.dayMaster);
    const wolun = getMonthlyCycles(userNow.year, sajuResult.dayMaster);
    const iljin = getIljinCalendar(userNow.year, userNow.month, sajuResult.dayMaster);

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

    // ======== 고급 분석 시작 ========

    // 고급 분석 함수용 간단한 형식으로 변환
    // (일부 모듈은 'time', 다른 모듈은 'hour' 사용 - 둘 다 포함)
    const timePillarSimple = {
      stem: sajuResult.timePillar.heavenlyStem.name,
      branch: sajuResult.timePillar.earthlyBranch.name,
    };
    const simplePillars = {
      year: {
        stem: sajuResult.yearPillar.heavenlyStem.name,
        branch: sajuResult.yearPillar.earthlyBranch.name,
      },
      month: {
        stem: sajuResult.monthPillar.heavenlyStem.name,
        branch: sajuResult.monthPillar.earthlyBranch.name,
      },
      day: {
        stem: sajuResult.dayPillar.heavenlyStem.name,
        branch: sajuResult.dayPillar.earthlyBranch.name,
      },
      time: timePillarSimple,
      hour: timePillarSimple,  // alias for modules that use 'hour'
    };

    // 공통 pillarsWithHour 객체 (hour key 사용하는 모듈용) - 한 번만 정의
    const pillarsWithHour = {
      year: { stem: simplePillars.year.stem, branch: simplePillars.year.branch },
      month: { stem: simplePillars.month.stem, branch: simplePillars.month.branch },
      day: { stem: simplePillars.day.stem, branch: simplePillars.day.branch },
      hour: { stem: simplePillars.time.stem, branch: simplePillars.time.branch },
    };

    // 1. 격국 분석
    let geokgukAnalysis = null;
    try {
      const geokguk = determineGeokguk(simplePillars);
      geokgukAnalysis = {
        ...geokguk,
        description: getGeokgukDescription(geokguk.primary),
      };
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Geokguk analysis failed:', e);
    }

    // 2. 용신 분석
    let yongsinAnalysis = null;
    try {
      const yongsin = determineYongsin(simplePillars);
      const luckyColors = getLuckyColors(yongsin.primaryYongsin);
      const luckyDirection = getLuckyDirection(yongsin.primaryYongsin);
      const luckyNumbers = getLuckyNumbers(yongsin.primaryYongsin);
      yongsinAnalysis = {
        ...yongsin,
        description: getYongsinDescription(yongsin.primaryYongsin),
        luckyColors,
        luckyDirection,
        luckyNumbers,
      };
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Yongsin analysis failed:', e);
    }

    // 3. 형충회합 분석
    let hyeongchungAnalysis = null;
    try {
      hyeongchungAnalysis = analyzeHyeongchung(simplePillars);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Hyeongchung analysis failed:', e);
    }

    // 4. 통근/득령 분석
    let tonggeunAnalysis = null;
    let deukryeongAnalysis = null;
    try {
      tonggeunAnalysis = calculateTonggeun(dayMasterStem, simplePillars);
      deukryeongAnalysis = calculateDeukryeong(dayMasterStem, sajuResult.monthPillar.earthlyBranch.name);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Tonggeun/Deukryeong analysis failed:', e);
    }

    // 5. 조후용신 (궁통보감) - dayMasterStem (甲,乙...) 사용, element (목,화...) 아님
    let johuYongsinAnalysis = null;
    try {
      const monthBranch = sajuResult.monthPillar.earthlyBranch.name;
      johuYongsinAnalysis = getJohuYongsin(dayMasterStem, monthBranch);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] JohuYongsin analysis failed:', e);
    }

    // 6. 십신 종합 분석 (uses hour instead of time)
    let sibsinAnalysis = null;
    try {
      sibsinAnalysis = analyzeSibsinComprehensive(pillarsWithHour as any);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Sibsin analysis failed:', e);
    }

    // 7. 건강 분석
    let healthAnalysis = null;
    try {
      healthAnalysis = analyzeHealth(pillarsWithHour as any);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Health analysis failed:', e);
    }

    // 8. 직업 적성 분석
    let careerAnalysis = null;
    try {
      careerAnalysis = analyzeCareer(pillarsWithHour as any);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Career analysis failed:', e);
    }

    // 9. 종합 점수 (uses full SajuPillars type from types.ts)
    let comprehensiveScore = null;
    try {
      comprehensiveScore = calculateComprehensiveScore(sajuPillars);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Comprehensive score failed:', e);
    }

    // 10. 종합 리포트
    let comprehensiveReport = null;
    try {
      comprehensiveReport = generateComprehensiveReport(pillarsWithHour as any);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Comprehensive report failed:', e);
    }

    // 11. 해석 데이터 수집
    const interpretations = {
      twelveStages: {} as Record<string, any>,
      elements: {} as Record<string, any>,
    };
    try {
      // 12운성 해석
      for (const [pillar, stage] of Object.entries(twelveStages)) {
        if (stage) {
          interpretations.twelveStages[pillar] = getTwelveStageInterpretation(stage as any);
        }
      }
      // 오행 해석
      for (const [elem, count] of Object.entries(sajuResult.fiveElements)) {
        if ((count as number) > 0) {
          interpretations.elements[elem] = getElementInterpretation(elem as any);
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Saju API] Interpretations failed:', e);
    }

    // ======== 고급 분석 끝 ========

    const gptPrompt = formatSajuForGPT({
      ...sajuResult,
      birthDate: birthDateString,
      daeun: daeunInfo,
    });

    // 분석 기준일 (사용자 타임존)
    const analysisDate = `${userNow.year}-${String(userNow.month).padStart(2, '0')}-${String(userNow.day).padStart(2, '0')}`;

    // ======== 프리미엄 콘텐츠 분리 ========
    // 무료: 기본 명식, 오행, 합충, 신살 (형충회합)
    // 유료: 격국, 용신, 건강/직업 분석, 종합 리포트

    // 무료 사용자용 미리보기 (일부 정보만 노출)
    const freePreview = {
      // 격국 - 이름만 노출
      geokguk: geokgukAnalysis ? {
        primary: geokgukAnalysis.primary,
        category: geokgukAnalysis.category,
        // description, confidence는 유료
      } : null,
      // 용신 - 행운색/방향만 노출
      yongsin: yongsinAnalysis ? {
        primaryYongsin: yongsinAnalysis.primaryYongsin,
        luckyColors: yongsinAnalysis.luckyColors,
        // description, secondaryYongsin, kibsin 등은 유료
      } : null,
      // 형충회합 - 무료 (기본 분석)
      hyeongchung: hyeongchungAnalysis,
      // 나머지는 잠금
      tonggeun: null,
      deukryeong: null,
      johuYongsin: null,
      sibsin: null,
      health: null,
      career: null,
      score: comprehensiveScore ? {
        overall: comprehensiveScore.overall,
        grade: comprehensiveScore.grade,
        // 상세 breakdown은 유료
      } : null,
      report: null,
      interpretations: null,
    };

    // 프리미엄 사용자용 전체 분석
    const fullAdvancedAnalysis = {
      geokguk: geokgukAnalysis,
      yongsin: yongsinAnalysis,
      hyeongchung: hyeongchungAnalysis,
      tonggeun: tonggeunAnalysis,
      deukryeong: deukryeongAnalysis,
      johuYongsin: johuYongsinAnalysis,
      sibsin: sibsinAnalysis,
      health: healthAnalysis,
      career: careerAnalysis,
      score: comprehensiveScore,
      report: comprehensiveReport,
      interpretations,
    };

    // ======== AI 백엔드 호출 (GPT) ========
    let aiInterpretation = '';
    let aiModelUsed = '';
    const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || 'http://127.0.0.1:5000';

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const apiToken = process.env.ADMIN_API_TOKEN;
      if (apiToken) {
        headers['X-API-KEY'] = apiToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const aiResponse = await fetch(`${backendUrl}/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          theme: 'saju',
          prompt: gptPrompt,
          saju: {
            dayMaster: sajuResult.dayMaster,
            fiveElements: sajuResult.fiveElements,
            pillars: simplePillars,
            daeun: daeunInfo,
            yeonun,
            wolun,
          },
          locale: body.locale || 'ko',
          advancedSaju: isPremium ? fullAdvancedAnalysis : null,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiInterpretation = aiData?.data?.fusion_layer || aiData?.data?.report || '';
        aiModelUsed = aiData?.data?.model || 'gpt-4o';
      }
    } catch (aiErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Saju API] AI backend call failed:', aiErr);
      }
      aiInterpretation = '';
      aiModelUsed = 'error-fallback';
    }

    return NextResponse.json({
      // 프리미엄 상태 플래그
      isPremium,
      isLoggedIn: !!session?.user?.id,

      birthYear: new Date(birthDateString).getFullYear(),
      birthDate: birthDateString,
      analysisDate,
      userTimezone: effectiveUserTz,
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

      // ======== AI 해석 결과 (GPT) ========
      aiInterpretation,
      aiModelUsed,

      // ======== 고급 분석 결과 (프리미엄 여부에 따라 분기) ========
      advancedAnalysis: isPremium ? fullAdvancedAnalysis : freePreview,
    });
  } catch (error) {
    console.error('[API /api/saju] Uncaught error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: `Internal Server Error: ${msg}` }, { status: 500 });
  }
}
