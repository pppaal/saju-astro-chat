// src/lib/Saju/saju.ts

import { toDate } from 'date-fns-tz';
import Calendar from 'korean-lunar-calendar';
import { FiveElement, YinYang } from './types';
import {
  STEMS, BRANCHES, MONTH_STEM_LOOKUP, TIME_STEM_LOOKUP, JIJANGGAN,
  CHEONEUL_GWIIN_MAP, FIVE_ELEMENT_RELATIONS, getSolarTermKST,
  assertKasiYearInRange
} from './constants';

// 내부 타입(간단화)
type DayMaster = { name: string; element: FiveElement; yin_yang: YinYang };

/* ========== 십성 ==========
   일간(dayMaster) 기준으로 목표 간지의 오행/음양과 비교해 십성 판정 */
function getSibseong(
  dayMaster: { element: FiveElement; yin_yang: YinYang },
  target: { element: FiveElement; yin_yang: YinYang }
): string {
  if (dayMaster.element === target.element) return dayMaster.yin_yang === target.yin_yang ? '비견' : '겁재';
  if (FIVE_ELEMENT_RELATIONS.생하는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '식신' : '상관';
  if (FIVE_ELEMENT_RELATIONS.극하는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편재' : '정재';
  if (FIVE_ELEMENT_RELATIONS.극받는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편관' : '정관';
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편인' : '정인';
  return '';
}

/* ========== 지지 본기(정기) 보정 ========== */
const MAIN_QI: Record<string, string | undefined> = {
  '子': '壬', '丑': '己', '寅': '甲', '卯': '乙',
  '辰': '戊', '巳': '丙', '午': '丁', '未': '己',
  '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
};
function getBranchMainStem(branchName: string) {
  const name = MAIN_QI[branchName];
  return name ? STEMS.find(s => s.name === name)! : undefined;
}

/* ========== 천을귀인 ========== */
function isCheoneulGwiin(dayMasterStemName: string, targetBranchName: string): boolean {
  return CHEONEUL_GWIIN_MAP[dayMasterStemName]?.includes(targetBranchName) ?? false;
}

/* ========== 안전 시간 파서 ========== */
function parseHourMinute(t: string): { h: number; m: number } {
  const s = String(t ?? '').trim().toUpperCase();
  const isPM = /\bPM$/.test(s);
  const isAM = /\bAM$/.test(s);
  const core = s.replace(/\s?(AM|PM)$/i, '');
  const [hh = '0', mm = '0'] = core.split(':');
  let h = Number(hh);
  let m = Number(mm?.replace(/\D/g, '') ?? '0');
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (!Number.isFinite(h)) h = 0;
  if (!Number.isFinite(m)) m = 0;
  if (h < 0) h = 0;
  if (h > 23) h = 23;
  if (m < 0) m = 0;
  if (m > 59) m = 59;
  return { h, m };
}

/* ========== 대운 시작나이 라운딩 정책 ========== */
const DAEUN_ROUNDING: 'round' | 'ceil' | 'floor' = 'round';
function daysToDaeunAge(days: number): number {
  const v = days / 3;
  let age: number;
  if (DAEUN_ROUNDING === 'ceil') age = Math.ceil(v);
  else if (DAEUN_ROUNDING === 'floor') age = Math.floor(v);
  else age = Math.round(v);
  return Math.max(1, age);
}

/* ========== 메인 계산 ========== */
export function calculateSajuData(
  birthDate: string,
  birthTime: string,
  gender: 'male' | 'female',
  calendarType: 'solar' | 'lunar',
  timezone: string,
  lunarLeap?: boolean
) {
  try {
    // 1️⃣ 출생시각: 입력 보정 & 윤달 지원
    let solarBirthDateStr = birthDate;

    if (calendarType === 'lunar') {
      const calendar = new Calendar();
      const [y, m, d] = birthDate.split('-').map(Number);
      calendar.setLunarDate(y, m, d, !!lunarLeap);
      const solar = calendar.getSolarCalendar();
      solarBirthDateStr = `${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`;
    }

    // ✅ 안전한 시간 문자열 처리
    const safeTime = (() => {
      const t = String(birthTime ?? '').trim();
      if (!t) return '00:00:00';
      if (/^\d{1,2}:\d{2}$/.test(t)) return `${t}:00`;
      if (/^\d{1,2}$/.test(t)) return `${t.padStart(2, '0')}:00:00`;
      return t;
    })();

    const isoString = `${solarBirthDateStr}T${safeTime}`;
    const birthDateTime = toDate(isoString, { timeZone: timezone });
    const birthLocal = toDate(isoString, { timeZone: timezone });

    if (isNaN(birthLocal.getTime())) {
      console.error("[saju.ts] ❌ Invalid birthLocal:", { birthDate, birthTime, isoString, timezone });
      throw new Error("Invalid birthLocal date object");
    }

    const year = birthDateTime.getFullYear();
    assertKasiYearInRange(year);
    const month = birthDateTime.getMonth() + 1;

    // Y, M, D
    const fmtNum = (opt: Intl.DateTimeFormatOptions) =>
      Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, ...opt }).format(birthLocal));
    const Y = fmtNum({ year: 'numeric' });
    const M = fmtNum({ month: '2-digit' });
    const D = fmtNum({ day: '2-digit' });

    /* ---------------- 연기둥 ---------------- */
    const ipchunUTC = getSolarTermKST(year, 2)!;
    const sajuYear = birthDateTime < ipchunUTC ? year - 1 : year;
    const idx60Y = (sajuYear - 4 + 6000) % 60;
    const yearPillar = { stem: STEMS[idx60Y % 10], branch: BRANCHES[idx60Y % 12] };

    /* ---------------- 월기둥 ---------------- */
    let sajuMonth = month;
    const termUTC_thisMonth = getSolarTermKST(year, month)!;
    if (birthDateTime < termUTC_thisMonth)
      sajuMonth = (sajuMonth === 1) ? 12 : (sajuMonth - 1);

    const G_BRANCH: ReadonlyArray<string> = ['丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子'];
    const monthBranchName = G_BRANCH[(sajuMonth - 1) % 12];
    const monthBranchIndex = BRANCHES.findIndex(b => b.name === monthBranchName);
    const firstMonthStemName = MONTH_STEM_LOOKUP[yearPillar.stem.name];
    const firstMonthStemIndex = STEMS.findIndex(s => s.name === firstMonthStemName);
    const TIGER_INDEX = BRANCHES.findIndex(b => b.name === '寅');
    const offsetFromTiger = (monthBranchIndex - TIGER_INDEX + 12) % 12;
    const monthStemIndex = (firstMonthStemIndex + offsetFromTiger) % 10;
    const monthPillar = { stem: STEMS[monthStemIndex], branch: BRANCHES[monthBranchIndex] };

    /* ---------------- 일기둥 ---------------- */
    const a = Math.floor((14 - M) / 12);
    const y_ = Y + 4800 - a;
    const m_ = M + 12 * a - 3;
    const jdn = D + Math.floor((153 * m_ + 2) / 5) + 365 * y_ + Math.floor(y_ / 4) - Math.floor(y_ / 100) + Math.floor(y_ / 400) - 32045;
    const dayStemIndex = (jdn + 49) % 10;
    const dayBranchIndex = (jdn + 49) % 12;
    const dayPillar = { stem: STEMS[dayStemIndex], branch: BRANCHES[dayBranchIndex] };
    const dayMaster = dayPillar.stem;

    /* ---------------- 시기둥 ---------------- */
    const { h: hour, m: minute } = parseHourMinute(birthTime);
    const totalMin = hour * 60 + minute;
    const ranges = [
      { idx: 0, start: 23 * 60 + 30, end: 24 * 60 + 60 + 30 }, { idx: 1, start: 1 * 60 + 30, end: 3 * 60 + 30 },
      { idx: 2, start: 3 * 60 + 30, end: 5 * 60 + 30 }, { idx: 3, start: 5 * 60 + 30, end: 7 * 60 + 30 },
      { idx: 4, start: 7 * 60 + 30, end: 9 * 60 + 30 }, { idx: 5, start: 9 * 60 + 30, end: 11 * 60 + 30 },
      { idx: 6, start: 11 * 60 + 30, end: 13 * 60 + 30 }, { idx: 7, start: 13 * 60 + 30, end: 15 * 60 + 30 },
      { idx: 8, start: 15 * 60 + 30, end: 17 * 60 + 30 }, { idx: 9, start: 17 * 60 + 30, end: 19 * 60 + 30 },
      { idx: 10, start: 19 * 60 + 30, end: 21 * 60 + 30 }, { idx: 11, start: 21 * 60 + 30, end: 23 * 60 + 30 },
    ];
    const candidates = [totalMin, totalMin + 24 * 60];
    let hourBranchIndex = 0;
    outer: for (const t of candidates) {
      for (const r of ranges) {
        if (t >= r.start && t < r.end) { hourBranchIndex = r.idx; break outer; }
      }
    }
    const firstHourStemName = TIME_STEM_LOOKUP[dayPillar.stem.name];
    const firstHourStemIndex = STEMS.findIndex(s => s.name === firstHourStemName);
    const timeStemIndex = (firstHourStemIndex + hourBranchIndex) % 10;
    const timePillar = { stem: STEMS[timeStemIndex], branch: BRANCHES[hourBranchIndex] };

    /* ---------------- 대운 계산 ---------------- */
    const isYangYear = yearPillar.stem.yin_yang === '양';
    const isMale = gender === 'male';
    const isForward = (isYangYear && isMale) || (!isYangYear && !isMale);
    const termUTC_current = getSolarTermKST(year, sajuMonth)!;
    let nextTermUTC: Date, prevTermUTC: Date;
    if (isForward) {
      const nextMonth = sajuMonth === 12 ? 1 : sajuMonth + 1;
      const nextYear = sajuMonth === 12 ? year + 1 : year;
      nextTermUTC = getSolarTermKST(nextYear, nextMonth)!;
      prevTermUTC = termUTC_current;
    } else {
      const prevMonth = sajuMonth === 1 ? 12 : sajuMonth - 1;
      const prevYear = sajuMonth === 1 ? year - 1 : year;
      prevTermUTC = getSolarTermKST(prevYear, prevMonth)!;
      nextTermUTC = termUTC_current;
    }

    const diffToTermMs = isForward
      ? nextTermUTC.getTime() - birthDateTime.getTime()
      : birthDateTime.getTime() - prevTermUTC.getTime();
    const daeWoonStartAge = daysToDaeunAge(diffToTermMs / 86400000);

    const daeWoonList: any[] = [];
    const direction = isForward ? 1 : -1;
    let curStemIdx = monthStemIndex;
    let curBranchIdx = monthBranchIndex;
    for (let i = 0; i < 10; i++) {
      const age = i * 10 + daeWoonStartAge;
      curStemIdx = (curStemIdx + direction + 10) % 10;
      curBranchIdx = (curBranchIdx + direction + 12) % 12;
      const s = STEMS[curStemIdx];
      const b = BRANCHES[curBranchIdx];
      const mainForB = getBranchMainStem(b.name);
      daeWoonList.push({
        age,
        heavenlyStem: s.name,
        earthlyBranch: b.name,
        sibsin: { cheon: getSibseong(dayMaster, s), ji: getSibseong(dayMaster, mainForB ?? (b as any)) }
      });
    }

    /* ---------------- 결과 구성 ---------------- */
    const pillars = { yearPillar, monthPillar, dayPillar, timePillar } as const;
    const finalPillars: any = {};
    (['yearPillar', 'monthPillar', 'dayPillar', 'timePillar'] as const).forEach(name => {
      const p = pillars[name];
      const j = JIJANGGAN[p.branch.name];
      const chogiName = j?.초기;
      const junggiName = j?.중기;
      const jeonggiName = j?.정기;
      const mainStem = getBranchMainStem(p.branch.name);

      finalPillars[name] = {
        heavenlyStem: {
          name: p.stem.name,
          element: p.stem.element,
          sibsin: getSibseong(dayMaster, p.stem)
        },
        earthlyBranch: {
          name: p.branch.name,
          element: p.branch.element,
          sibsin: getSibseong(dayMaster, mainStem ?? (p.branch as any))
        },
        jijanggan: {
          chogi: chogiName ? { name: chogiName, sibsin: getSibseong(dayMaster, STEMS.find(s => s.name === chogiName)!) } : undefined,
          junggi: junggiName ? { name: junggiName, sibsin: getSibseong(dayMaster, STEMS.find(s => s.name === junggiName)!) } : undefined,
          jeonggi: jeonggiName ? { name: jeonggiName, sibsin: getSibseong(dayMaster, STEMS.find(s => s.name === jeonggiName)!) } : undefined,
        },
        hiddenStems: {
          main: mainStem?.name ?? null,
          all: [chogiName, junggiName, jeonggiName].filter(Boolean)
        }
      };
    });

    const fiveElementsCount: { [key in FiveElement]: number } = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
    [yearPillar, monthPillar, dayPillar, timePillar].forEach(p => {
      fiveElementsCount[p.stem.element]++;
      fiveElementsCount[p.branch.element]++;
    });

    const yNowLocal = Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric' }).format(new Date()));
    const birthYearLocal = Y;
    const currentAge = yNowLocal - birthYearLocal;
    const currentLuckPillar = daeWoonList.slice().reverse().find(d => currentAge >= d.age) || daeWoonList[0];

    return {
      ...finalPillars,
      daeWoon: { startAge: daeWoonStartAge, isForward, current: currentLuckPillar, list: daeWoonList },
      fiveElements: {
        wood: fiveElementsCount['목'],
        fire: fiveElementsCount['화'],
        earth: fiveElementsCount['토'],
        metal: fiveElementsCount['금'],
        water: fiveElementsCount['수'],
      },
      dayMaster,
    };
  } catch (error) {
    console.error("[saju.ts] Error during Saju data calculation:", error);
    throw new Error(`Error during calculation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/* ========== 연/월/일 유틸 ========== */
export function getAnnualCycles(startYear: number, count: number, dayMaster: DayMaster) {
  const cycles: any[] = [];
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    const idx60 = (year - 4 + 6000) % 60;
    const stem = STEMS[idx60 % 10];
    const branch = BRANCHES[idx60 % 12];
    const mainForB = getBranchMainStem(branch.name);
    cycles.push({
      year,
      heavenlyStem: stem.name,
      earthlyBranch: branch.name,
      sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, mainForB ?? (branch as any)) }
    });
  }
  return cycles;
}

export function getMonthlyCycles(year: number, dayMaster: DayMaster) {
  const cycles: any[] = [];
  const idx60 = (year - 4 + 6000) % 60;
  const yearStemName = STEMS[idx60 % 10].name;
  const firstMonthStemName = MONTH_STEM_LOOKUP[yearStemName];
  const firstMonthStemIndex = STEMS.findIndex(s => s.name === firstMonthStemName);
  const branchOrder = [2,3,4,5,6,7,8,9,10,11,0,1];
  for (let i=0;i<12;i++){
    const stem = STEMS[(firstMonthStemIndex + i)%10];
    const branch = BRANCHES[branchOrder[i]];
    const mainForB = getBranchMainStem(branch.name);
    cycles.push({
      month:i+1,
      heavenlyStem: stem.name,
      earthlyBranch: branch.name,
      sibsin:{ cheon:getSibseong(dayMaster,stem), ji:getSibseong(dayMaster, mainForB ?? (branch as any)) }
    });
  }
  return cycles.sort((a,b)=>a.month-b.month);
}

export function getIljinCalendar(year:number,month:number,dayMaster:DayMaster){
  const daysInMonth=new Date(year,month,0).getDate();
  const calendar:any[]=[];
  for(let day=1;day<=daysInMonth;day++){
    const a=Math.floor((14-month)/12);
    const y_=year+4800-a;
    const m_=month+12*a-3;
    const jdn=day+Math.floor((153*m_+2)/5)+365*y_+Math.floor(y_/4)-Math.floor(y_/100)+Math.floor(y_/400)-32045;
    const stem=STEMS[(jdn+49)%10];
    const branch=BRANCHES[(jdn+49)%12];
    const mainForB=getBranchMainStem(branch.name);
    calendar.push({
      year,month,day,
      heavenlyStem:stem.name,
      earthlyBranch:branch.name,
      sibsin:{ cheon:getSibseong(dayMaster,stem), ji:getSibseong(dayMaster, mainForB ?? (branch as any)) },
      isCheoneulGwiin:isCheoneulGwiin(dayMaster.name,branch.name),
    });
  }
  return calendar;
}