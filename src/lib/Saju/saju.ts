// src/lib/Saju/saju.ts
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

// 메인 계산
export function calculateSajuData(
  birthDate: string, birthTime: string, gender: 'male' | 'female',
  calendarType: 'solar' | 'lunar', timezone: string, longitude: number
) {
  try {
    // 1) 출생시각: 출생지 타임존(OpenCage) 사용
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

    // 5) 시기둥(출생지 타임존 기준 시각)
    const [hour, minute] = birthTime.split(':').map(Number);
    const timeValue = hour * 100 + minute;
    let hourBranchIndex: number;
    if (timeValue >= 2330 || timeValue < 130) hourBranchIndex = 0; else if (timeValue < 330) hourBranchIndex = 1;
    else if (timeValue < 530) hourBranchIndex = 2; else if (timeValue < 730) hourBranchIndex = 3;
    else if (timeValue < 930) hourBranchIndex = 4; else if (timeValue < 1130) hourBranchIndex = 5;
    else if (timeValue < 1330) hourBranchIndex = 6; else if (timeValue < 1530) hourBranchIndex = 7;
    else if (timeValue < 1730) hourBranchIndex = 8; else if (timeValue < 1930) hourBranchIndex = 9;
    else if (timeValue < 2130) hourBranchIndex = 10; else hourBranchIndex = 11;

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