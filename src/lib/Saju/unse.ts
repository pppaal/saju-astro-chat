// src/lib/Saju/unse.ts
import { toDate } from 'date-fns-tz';
import {
  STEMS, BRANCHES, MONTH_STEM_LOOKUP, CHEONEUL_GWIIN_MAP,
  FIVE_ELEMENT_RELATIONS, getSolarTermKST
} from './constants';
import {
  FiveElement, YinYang, DayMaster, DaeunData, YeonunData, WolunData, IljinData, StemBranchInfo
} from './types';

export interface Pillar {
  heavenlyStem: StemBranchInfo;
  earthlyBranch: StemBranchInfo;
}
export interface SajuPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  time: Pillar;
}

function getSibseong(dayMaster: { element: FiveElement; yin_yang: YinYang }, target: StemBranchInfo): string {
  if (!dayMaster || !target) return '';
  if (dayMaster.element === target.element) return dayMaster.yin_yang === target.yin_yang ? '비견' : '겁재';
  if (FIVE_ELEMENT_RELATIONS.생하는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '식신' : '상관';
  if (FIVE_ELEMENT_RELATIONS.극하는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편재' : '정재';
  if (FIVE_ELEMENT_RELATIONS.극받는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편관' : '정관';
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayMaster.element] === target.element) return dayMaster.yin_yang === target.yin_yang ? '편인' : '정인';
  return '';
}

function isCheoneulGwiin(dayMasterStemName: string, targetBranchName: string): boolean {
  return CHEONEUL_GWIIN_MAP[dayMasterStemName]?.includes(targetBranchName) ?? false;
}

export function getDaeunCycles(
  birthDate: Date,
  gender: 'male' | 'female',
  sajuPillars: SajuPillars,
  dayMaster: DayMaster,
  timezone: string
): { daeunsu: number; cycles: DaeunData[] } {
  if (!birthDate || !sajuPillars || !dayMaster || !timezone) {
    console.error("getDaeunCycles: 유효하지 않은 인자가 전달되었습니다.");
    return { daeunsu: 0, cycles: [] };
  }

  const yearStemYinYang = sajuPillars.year.heavenlyStem.yin_yang;
  const isForward = (yearStemYinYang === '양' && gender === 'male') || (yearStemYinYang === '음' && gender === 'female');

  const y = birthDate.getFullYear();
  const m = birthDate.getMonth() + 1;
  const cur = getSolarTermKST(y, m);
  if (!cur) return { daeunsu: 0, cycles: [] };

  let previousTerm: Date, nextTerm: Date;
  if (birthDate.getTime() >= cur.getTime()) {
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    previousTerm = cur;
    nextTerm = getSolarTermKST(ny, nm)!;
  } else {
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    previousTerm = getSolarTermKST(py, pm)!;
    nextTerm = cur;
  }

  const diffMs = isForward ? nextTerm.getTime() - birthDate.getTime() : birthDate.getTime() - previousTerm.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  let daeunsu = Math.round(diffDays / 3);
  if (daeunsu < 1) daeunsu = 1;

  const cycles: DaeunData[] = [];
  const startStemIndex = STEMS.findIndex(s => s.name === sajuPillars.month.heavenlyStem.name);
  const startBranchIndex = BRANCHES.findIndex(b => b.name === sajuPillars.month.earthlyBranch.name);
  if (startStemIndex === -1 || startBranchIndex === -1) {
    console.error("대운 시작 간지를 찾지 못했습니다.");
    return { daeunsu: 0, cycles: [] };
  }

  for (let i = 0; i < 10; i++) {
    const age = daeunsu + (i * 10);
    const step = i + 1;
    const direction = isForward ? 1 : -1;
    const stemIndex = (startStemIndex + (step * direction) + 100) % 10;
    const branchIndex = (startBranchIndex + (step * direction) + 120) % 12;
    const stem = STEMS[stemIndex];
    const branch = BRANCHES[branchIndex];
    if (stem && branch) {
      cycles.push({
        age, heavenlyStem: stem.name, earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) }
      });
    }
  }

  return { daeunsu, cycles };
}

export function getAnnualCycles(startYear: number, count: number, dayMaster: DayMaster): YeonunData[] {
  const cycles: YeonunData[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const year = startYear + i;
    const gapja_index = (year - 4 + 6000) % 60;
    const stem = STEMS[gapja_index % 10];
    const branch = BRANCHES[gapja_index % 12];
    if (stem && branch) {
      cycles.push({
        year, heavenlyStem: stem.name, earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) }
      });
    }
  }
  return cycles;
}

export function getMonthlyCycles(year: number, dayMaster: DayMaster): WolunData[] {
  const cycles: WolunData[] = [];
  const year_gapja_index = (year - 4 + 6000) % 60;
  const yearStemName = STEMS[year_gapja_index % 10]?.name;
  if (!yearStemName) return [];

  const firstMonthStemName = MONTH_STEM_LOOKUP[yearStemName];
  const firstMonthStemIndex = STEMS.findIndex(s => s.name === firstMonthStemName);

  const branchOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
  for (let i = 0; i < 12; i++) {
    const monthJs = new Date(year, i + 1, 15).getMonth();
    const stem = STEMS[(firstMonthStemIndex + i) % 10];
    const branch = BRANCHES[branchOrder[i]];
    if (stem && branch) {
      cycles.push({
        year, month: monthJs + 1, heavenlyStem: stem.name, earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) }
      });
    }
  }
  return cycles.sort((a, b) => a.month - b.month).reverse();
}

export function getIljinCalendar(year: number, month: number, dayMaster: DayMaster): IljinData[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendar: IljinData[] = [];

  // KST 자정(00:00) 기준 UTC 타임스탬프 생성 헬퍼
  const kstMidnightUTC = (Y: number, M: number, D: number): number => {
    // KST는 UTC+9 → UTC 기준으로는 전날 15:00
    return Date.UTC(Y, M - 1, D, 0 - 9, 0, 0, 0);
  };

  for (let day = 1; day <= daysInMonth; day++) {
    // KST 자정 고정
    const msUTC = kstMidnightUTC(year, month, day);
    const jdn = Math.floor(msUTC / 86400000 + 2440587.5);

    // 일간 간지
    const stemIndex = (jdn + 9) % 10;
    const branchIndex = (jdn + 1) % 12;

    const stem = STEMS[stemIndex];
    const branch = BRANCHES[branchIndex];
    if (!stem || !branch) continue;

    calendar.push({
      year,
      month,
      day,
      heavenlyStem: stem.name,
      earthlyBranch: branch.name,
      sibsin: {
        cheon: getSibseong(dayMaster, stem),
        ji: getSibseong(dayMaster, branch),
      },
      isCheoneulGwiin: isCheoneulGwiin(dayMaster.name, branch.name),
    });
  }

  return calendar;
}