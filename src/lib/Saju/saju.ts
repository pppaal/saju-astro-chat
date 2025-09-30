import { toDate } from 'date-fns-tz';
import Calendar from 'korean-lunar-calendar';
import { FiveElement, YinYang } from './types';
import {
  STEMS, BRANCHES, MONTH_STEM_LOOKUP, TIME_STEM_LOOKUP, JIJANGGAN,
  CHEONEUL_GWIIN_MAP, FIVE_ELEMENT_RELATIONS, getSolarTermKST
} from './constants';

// 내부 타입(간단화)
type DayMaster = { name: string; element: FiveElement; yin_yang: YinYang };

// 십성
function getSibseong(dayMaster: { element: FiveElement, yin_yang: YinYang }, target: { element: FiveElement, yin_yang: YinYang }): string {
  if (dayMaster.element === target.element) return dayMaster.yin_yang === target.yin_yang ? '비견' : '겁재';
  if (FIVE_ELEMENT_RELATIONS.생하는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '식신' : '상관';
  if (FIVE_ELEMENT_RELATIONS.극하는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편재' : '정재';
  if (FIVE_ELEMENT_RELATIONS.극받는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편관' : '정관';
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편인' : '정인';
  return '';
}

// 천을귀인
function isCheoneulGwiin(dayMasterStemName: string, targetBranchName: string): boolean {
  return CHEONEUL_GWIIN_MAP[dayMasterStemName]?.includes(targetBranchName) ?? false;
}

// 안전 파서: "06:40", "6:40", "06:40 AM/PM" 모두 처리
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
  if (h < 0) h = 0; if (h > 23) h = 23;
  if (m < 0) m = 0; if (m > 59) m = 59;
  return { h, m };
}

// 메인 계산
export function calculateSajuData(
  birthDate: string, birthTime: string, gender: 'male' | 'female',
  calendarType: 'solar' | 'lunar', timezone: string, longitude: number
) {
  try {
    // 1) 출생시각: 출생지 타임존 사용
    let solarBirthDateStr = birthDate;
    if (calendarType === 'lunar') {
      const calendar = new Calendar();
      const [y, m, d] = birthDate.split('-').map(Number);
      calendar.setLunarDate(y, m, d, false);
      const solar = calendar.getSolarCalendar();
      solarBirthDateStr = `${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`;
    }
    const birthDateTime = toDate(`${solarBirthDateStr}T${birthTime}`, { timeZone: timezone });

    const year = birthDateTime.getFullYear();
    const month = birthDateTime.getMonth() + 1;
    const day = birthDateTime.getDate();

    // 2) 연기둥: 입춘 비교는 KST 고정
    const ipchun = getSolarTermKST(year, 2)!;
    const sajuYear = birthDateTime < ipchun ? year - 1 : year;
    const yearStemIndex = (sajuYear - 4 + 600) % 10;
    const yearBranchIndex = (sajuYear - 4 + 600) % 12;
    const yearPillar = { stem: STEMS[yearStemIndex], branch: BRANCHES[yearBranchIndex] };

    // 3) 월기둥: 해당 월의 절입일과 비교(역시 KST 고정)
    let sajuMonth = month;
    let monthTermDate = getSolarTermKST(year, sajuMonth)!;
    if (birthDateTime < monthTermDate) {
      sajuMonth = (sajuMonth === 1) ? 12 : sajuMonth - 1;
    }
    const monthBranchMap = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];
    const monthBranchIndex = monthBranchMap[sajuMonth - 1];
    const firstMonthStemName = MONTH_STEM_LOOKUP[yearPillar.stem.name];
    const firstMonthStemIndex = STEMS.findIndex(s => s.name === firstMonthStemName);
    const sajuMonthOrderIndex = (monthBranchIndex - 2 + 12) % 12;
    const monthStemIndex = (firstMonthStemIndex + sajuMonthOrderIndex) % 10;
    const monthPillar = { stem: STEMS[monthStemIndex], branch: BRANCHES[monthBranchIndex] };

    // 4) 일기둥(만세력식 JDN)
    const a = Math.floor((14 - month) / 12);
    const y_ = year + 4800 - a;
    const m_ = month + 12 * a - 3;
    const jdn = day + Math.floor((153 * m_ + 2) / 5) + 365 * y_ + Math.floor(y_ / 4) - Math.floor(y_ / 100) + Math.floor(y_ / 400) - 32045;
    const dayStemIndex = (jdn + 49) % 10;
    const dayBranchIndex = (jdn + 49) % 12;
    const dayPillar = { stem: STEMS[dayStemIndex], branch: BRANCHES[dayBranchIndex] };
    const dayMaster = dayPillar.stem;

    // 5) 시기둥(현지 HH:mm 문자열만 사용, 분 단위 경계표 + 子정 23:30 처리)
    const { h: hour, m: minute } = parseHourMinute(birthTime);
    const totalMin = hour * 60 + minute;

    // [start, end) 분 단위 구간. 子(23:30~01:29:59) 처리를 위해 24:00+ 비교도 수행.
    const ranges = [
      { idx: 0, start: 23 * 60 + 30, end: 24 * 60 + 60 + 30 }, // 子 23:30~25:29:59(=01:29:59)
      { idx: 1, start: 1 * 60 + 30, end: 3 * 60 + 30 },   // 丑 01:30~03:29:59
      { idx: 2, start: 3 * 60 + 30, end: 5 * 60 + 30 },   // 寅 03:30~05:29:59
      { idx: 3, start: 5 * 60 + 30, end: 7 * 60 + 30 },   // 卯 05:30~07:29:59
      { idx: 4, start: 7 * 60 + 30, end: 9 * 60 + 30 },   // 辰
      { idx: 5, start: 9 * 60 + 30, end: 11 * 60 + 30 },  // 巳
      { idx: 6, start: 11 * 60 + 30, end: 13 * 60 + 30 }, // 午
      { idx: 7, start: 13 * 60 + 30, end: 15 * 60 + 30 }, // 未
      { idx: 8, start: 15 * 60 + 30, end: 17 * 60 + 30 }, // 申
      { idx: 9, start: 17 * 60 + 30, end: 19 * 60 + 30 }, // 酉
      { idx: 10, start: 19 * 60 + 30, end: 21 * 60 + 30 },// 戌
      { idx: 11, start: 21 * 60 + 30, end: 23 * 60 + 30 },// 亥
    ];

    const candidates = [totalMin, totalMin + 24 * 60];
    let hourBranchIndex = 0;
    outer:
    for (const t of candidates) {
      for (const r of ranges) {
        if (t >= r.start && t < r.end) {
          hourBranchIndex = r.idx;
          break outer;
        }
      }
    }

    const firstHourStemName = TIME_STEM_LOOKUP[dayPillar.stem.name];
    const firstHourStemIndex = STEMS.findIndex(s => s.name === firstHourStemName);
    const timeStemIndex = (firstHourStemIndex + hourBranchIndex) % 10;
    const timePillar = { stem: STEMS[timeStemIndex], branch: BRANCHES[hourBranchIndex] };

    // 6) 대운 방향 및 시작나이(절입 KST 고정 비교)
    const isYangYear = yearPillar.stem.yin_yang === '양';
    const isMale = gender === 'male';
    const isForward = (isYangYear && isMale) || (!isYangYear && !isMale);

    const currentMonthTermYear = year;
    const currentMonthTermMonth = sajuMonth;
    const currentTermDate = getSolarTermKST(currentMonthTermYear, currentMonthTermMonth)!;

    let nextTermDate: Date, prevTermDate: Date;
    if (isForward) {
      const nextMonth = currentMonthTermMonth === 12 ? 1 : currentMonthTermMonth + 1;
      const nextYear = currentMonthTermMonth === 12 ? currentMonthTermYear + 1 : currentMonthTermYear;
      nextTermDate = getSolarTermKST(nextYear, nextMonth)!;
      prevTermDate = currentTermDate;
    } else {
      const prevMonth = currentMonthTermMonth === 1 ? 12 : currentMonthTermMonth - 1;
      const prevYear = currentMonthTermMonth === 1 ? currentMonthTermYear - 1 : currentMonthTermYear;
      prevTermDate = getSolarTermKST(prevYear, prevMonth)!;
      nextTermDate = currentTermDate;
    }

    const diffToTermMs = isForward ? nextTermDate.getTime() - birthDateTime.getTime() : birthDateTime.getTime() - prevTermDate.getTime();
    const diffDays = diffToTermMs / (1000 * 60 * 60 * 24);
    let daeWoonStartAge = Math.round(diffDays / 3); // 통일
    if (daeWoonStartAge < 1) daeWoonStartAge = 1;

    const daeWoonList: any[] = [];
    let currentStemIndex = monthStemIndex;
    let currentBranchIndex = monthBranchIndex;

    for (let i = 0; i < 10; i++) {
      const age = i * 10 + daeWoonStartAge;
      const direction = isForward ? 1 : -1;
      currentStemIndex = (currentStemIndex + direction + 10) % 10;
      currentBranchIndex = (currentBranchIndex + direction + 12) % 12;
      const daeunStem = STEMS[currentStemIndex];
      const daeunBranch = BRANCHES[currentBranchIndex];
      daeWoonList.push({
        age, heavenlyStem: daeunStem.name, earthlyBranch: daeunBranch.name,
        sibsin: { cheon: getSibseong(dayMaster, daeunStem), ji: getSibseong(dayMaster, daeunBranch) }
      });
    }

    // 7) 결과 포맷
    const pillars = { yearPillar, monthPillar, dayPillar, timePillar } as const;
    const finalPillars: any = {};
    (['yearPillar', 'monthPillar', 'dayPillar', 'timePillar'] as const).forEach(name => {
      const p = pillars[name];
      finalPillars[name] = {
        heavenlyStem: { name: p.stem.name, element: p.stem.element, sibsin: getSibseong(dayMaster, p.stem) },
        earthlyBranch: { name: p.branch.name, element: p.branch.element, sibsin: getSibseong(dayMaster, p.branch) },
        jijanggan: {
          chogi: { name: JIJANGGAN[p.branch.name].초기, sibsin: getSibseong(dayMaster, STEMS.find(s => s.name === JIJANGGAN[p.branch.name].초기)!) },
          junggi: { name: JIJANGGAN[p.branch.name].중기, sibsin: getSibseong(dayMaster, STEMS.find(s => s.name === JIJANGGAN[p.branch.name].중기)!) },
          jeonggi: { name: JIJANGGAN[p.branch.name].정기, sibsin: getSibseong(dayMaster, STEMS.find(s => s.name === JIJANGGAN[p.branch.name].정기)!) },
        }
      };
    });

    const fiveElementsCount: { [key in FiveElement]: number } = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
    [yearPillar, monthPillar, dayPillar, timePillar].forEach(p => {
      fiveElementsCount[p.stem.element]++;
      fiveElementsCount[p.branch.element]++;
    });

    const currentAge = new Date().getFullYear() - year + 1;
    const currentLuckPillar = daeWoonList.slice().reverse().find(d => currentAge >= d.age) || daeWoonList[0];

    return {
      ...finalPillars,
      daeWoon: { startAge: daeWoonStartAge, isForward, current: currentLuckPillar, list: daeWoonList },
      fiveElements: {
        wood: fiveElementsCount['목'], fire: fiveElementsCount['화'],
        earth: fiveElementsCount['토'], metal: fiveElementsCount['금'], water: fiveElementsCount['수']
      },
      dayMaster,
    };
  } catch (error) {
    console.error("[saju.ts] Error during Saju data calculation:", error);
    throw new Error(`Error during calculation: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 연/월/일 유틸(현 로직 유지)
export function getAnnualCycles(startYear: number, count: number, dayMaster: DayMaster) {
  const cycles = [];
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    const gapja_index = (year - 4 + 600) % 60;
    const stem = STEMS[gapja_index % 10];
    const branch = BRANCHES[gapja_index % 12];
    cycles.push({
      year, heavenlyStem: stem.name, earthlyBranch: branch.name,
      sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) }
    });
  }
  return cycles;
}

export function getMonthlyCycles(year: number, dayMaster: DayMaster) {
  const cycles = [];
  const year_gapja_index = (year - 4 + 600) % 60;
  const yearStemName = STEMS[year_gapja_index % 10].name;
  const firstMonthStemName = MONTH_STEM_LOOKUP[yearStemName];
  const firstMonthStemIndex = STEMS.findIndex(s => s.name === firstMonthStemName);
  const branchOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];

  for (let i = 0; i < 12; i++) {
    const stem = STEMS[(firstMonthStemIndex + i) % 10];
    const branch = BRANCHES[branchOrder[i]];
    const monthNumber = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11][branch.name === '子' ? 0 : branchOrder[i]];
    cycles.push({
      month: monthNumber, heavenlyStem: stem.name, earthlyBranch: branch.name,
      sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) }
    });
  }
  return cycles.sort((a,b) => a.month - b.month);
}

export function getIljinCalendar(year: number, month: number, dayMaster: DayMaster) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendar = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const a = Math.floor((14 - month) / 12);
    const y_ = year + 4800 - a;
    const m_ = month + 12 * a - 3;
    const jdn = day + Math.floor((153 * m_ + 2) / 5) + 365 * y_ + Math.floor(y_ / 4) - Math.floor(y_ / 100) + Math.floor(y_ / 400) - 32045;
    const stem = STEMS[(jdn + 49) % 10];
    const branch = BRANCHES[(jdn + 49) % 12];
    calendar.push({
      year, month, day, heavenlyStem: stem.name, earthlyBranch: branch.name,
      sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) },
      isCheoneulGwiin: isCheoneulGwiin(dayMaster.name, branch.name),
    });
  }
  return calendar;
}