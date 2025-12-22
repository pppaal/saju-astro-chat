// src/lib/Saju/unse.ts

import { toDate } from 'date-fns-tz';
import {
  STEMS, BRANCHES, MONTH_STEM_LOOKUP, CHEONEUL_GWIIN_MAP,
  FIVE_ELEMENT_RELATIONS, getSolarTermKST
} from './constants';
import {
  FiveElement, YinYang, DayMaster, DaeunData, YeonunData, WolunData, IljinData, StemBranchInfo,
  SajuPillars as SajuPillarsAll
} from './types';

// 내부 유틸: 로컬 타임존 영향 제거용 UTC Date 생성
const utcDate = (y: number, m1to12: number, d: number, hh = 0, mm = 0, ss = 0, ms = 0) =>
  new Date(Date.UTC(y, m1to12 - 1, d, hh, mm, ss, ms));

function getSibseong(
  dayMaster: { element: FiveElement; yin_yang: YinYang },
  target: StemBranchInfo
): string {
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

// 출생 시각을 "출생지 타임존" 기준 로컬 → UTC 타임스탬프로 정규화
function normalizeBirthToUTC(birthDate: Date, timezone: string): Date {
  const y = birthDate.getFullYear();
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  const hh = birthDate.getHours();
  const mi = birthDate.getMinutes();
  const ss = birthDate.getSeconds();

  const isoLocal = `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(hh).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  try {
    // date-fns-tz: 문자열을 timezone 로컬 시각으로 해석해 UTC Date 반환
    return toDate(isoLocal, { timeZone: timezone } as Parameters<typeof toDate>[1]);
  } catch {
    // 폴백: 최소한 호스트 타임존 영향 없이 UTC로 동일 숫자 시각 구성
    return utcDate(y, m, d, hh, mi, ss, 0);
  }
}

/* === 대운 라운딩 정책 === */
const DAEUN_ROUNDING: 'round' | 'ceil' | 'floor' = 'round';
function daysToDaeunAge(days: number): number {
  const v = days / 3;
  let age: number;
  if (DAEUN_ROUNDING === 'ceil') age = Math.ceil(v);
  else if (DAEUN_ROUNDING === 'floor') age = Math.floor(v);
  else age = Math.round(v);
  return Math.max(1, age);
}

export function getDaeunCycles(
  birthDate: Date,
  gender: 'male' | 'female',
  sajuPillars: SajuPillarsAll,
  dayMaster: DayMaster,
  timezone: string
): { daeunsu: number; cycles: DaeunData[] } {
  if (!birthDate || !sajuPillars || !dayMaster || !timezone) {
    console.error('getDaeunCycles: 유효하지 않은 인자');
    return { daeunsu: 0, cycles: [] };
  }

  const yearStemYinYang = sajuPillars.year.heavenlyStem.yin_yang;
  const isForward = (yearStemYinYang === '양' && gender === 'male') || (yearStemYinYang === '음' && gender === 'female');

  const birthUTC = normalizeBirthToUTC(birthDate, timezone);
  const y = birthUTC.getUTCFullYear();
  const m = birthUTC.getUTCMonth() + 1;

  // 주의: getSolarTermKST가 KST 기준 Date를 반환한다고 가정
  const cur = getSolarTermKST(y, m);
  if (!cur) return { daeunsu: 0, cycles: [] };

  let previousTerm: Date, nextTerm: Date;
  if (birthUTC.getTime() >= cur.getTime()) {
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    previousTerm = cur;
    const nt = getSolarTermKST(ny, nm);
    if (!nt) return { daeunsu: 0, cycles: [] };
    nextTerm = nt;
  } else {
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    const pt = getSolarTermKST(py, pm);
    if (!pt) return { daeunsu: 0, cycles: [] };
    previousTerm = pt;
    nextTerm = cur;
  }

  const diffMs = isForward ? nextTerm.getTime() - birthUTC.getTime() : birthUTC.getTime() - previousTerm.getTime();
  const diffDays = diffMs / 86400000;
  const daeunsu = daysToDaeunAge(diffDays);

  const cycles: DaeunData[] = [];
  const startStemIndex = STEMS.findIndex(s => s.name === sajuPillars.month.heavenlyStem.name);
  const startBranchIndex = BRANCHES.findIndex(b => b.name === sajuPillars.month.earthlyBranch.name);
  if (startStemIndex === -1 || startBranchIndex === -1) {
    console.error('대운 시작 간지 탐색 실패');
    return { daeunsu: 0, cycles: [] };
  }

  const direction = isForward ? 1 : -1;
  for (let i = 0; i < 10; i++) {
    const age = daeunsu + i * 10;
    const step = i + 1;
    const stemIndex = (startStemIndex + step * direction + 1000) % 10;
    const branchIndex = (startBranchIndex + step * direction + 1200) % 12;
    const stem = STEMS[stemIndex];
    const branch = BRANCHES[branchIndex];
    if (stem && branch) {
      cycles.push({
        age,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: {
          cheon: getSibseong(dayMaster, stem),
          ji: getSibseong(dayMaster, branch),
        },
      });
    }
  }

  return { daeunsu, cycles };
}

export function getAnnualCycles(startYear: number, count: number, dayMaster: DayMaster): YeonunData[] {
  const cycles: YeonunData[] = [];
  // 연도순으로 정렬: startYear, startYear+1, startYear+2, ...
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    const gapja_index = (year - 4 + 6000) % 60;
    const stem = STEMS[gapja_index % 10];
    const branch = BRANCHES[gapja_index % 12];
    if (stem && branch) {
      cycles.push({
        year,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) },
      });
    }
  }
  return cycles;
}

// 절기(월) → 지지 매핑: 절기월 2=寅, 3=卯, ... 12=子, 1=丑
const SOLAR_TERM_MONTH_TO_BRANCH: Record<number, string> = {
  2: '寅', 3: '卯', 4: '辰', 5: '巳', 6: '午', 7: '未',
  8: '申', 9: '酉', 10: '戌', 11: '亥', 12: '子', 1: '丑'
};

export interface WolunDataExtended extends WolunData {
  solarTermStart?: Date;   // 절입일 (절기 시작)
  solarTermEnd?: Date;     // 다음 절입일 전까지
}

export function getMonthlyCycles(year: number, dayMaster: DayMaster, options?: { useSolarTerms?: boolean }): WolunDataExtended[] {
  const cycles: WolunDataExtended[] = [];
  const useSolarTerms = options?.useSolarTerms ?? false;

  // 해당 연도의 년간 찾기 (입춘 기준, 간편화: 양력 연도 사용)
  const year_gapja_index = (year - 4 + 6000) % 60;
  const yearStemName = STEMS[year_gapja_index % 10]?.name;
  if (!yearStemName) return [];

  const firstMonthStemName = MONTH_STEM_LOOKUP[yearStemName]; // 寅월의 월간
  const firstMonthStemIndex = STEMS.findIndex(s => s.name === firstMonthStemName);
  const TIGER_INDEX = BRANCHES.findIndex(b => b.name === '寅');

  // 절기 기반: 월 2~12, 다음해 1 (입춘~소한)
  // 양력 기준: 월 1~12 (간편화 모드)
  if (useSolarTerms) {
    // 절기 기반 정밀 모드: 절기월 2(입춘)~1(소한) 순환
    const solarMonths = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1];

    for (let i = 0; i < 12; i++) {
      const solarMonth = solarMonths[i];
      const isNextYear = solarMonth === 1; // 1월(소한)은 다음해에 속함
      const actualYear = isNextYear ? year + 1 : year;

      const branchName = SOLAR_TERM_MONTH_TO_BRANCH[solarMonth];
      const branchIndex = BRANCHES.findIndex(b => b.name === branchName);
      const offsetFromTiger = (branchIndex - TIGER_INDEX + 12) % 12;
      const stem = STEMS[(firstMonthStemIndex + offsetFromTiger) % 10];
      const branch = BRANCHES[branchIndex];

      // 절입일 계산
      const termStart = getSolarTermKST(actualYear, solarMonth);
      const nextSolarMonth = solarMonths[(i + 1) % 12];
      const nextActualYear = nextSolarMonth <= solarMonth && nextSolarMonth !== 1 ? actualYear + 1 :
                             (nextSolarMonth === 1 && solarMonth !== 12 ? actualYear + 1 : actualYear);
      const termEnd = getSolarTermKST(nextActualYear, nextSolarMonth);

      cycles.push({
        year: actualYear,
        month: solarMonth,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) },
        solarTermStart: termStart ?? undefined,
        solarTermEnd: termEnd ?? undefined,
      });
    }
  } else {
    // 간편 모드: 양력월 1~12 → 지지 丑~子 순서
    const G_BRANCH: ReadonlyArray<string> = ['丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','子'];

    for (let i = 0; i < 12; i++) {
      const month = i + 1;
      const branchName = G_BRANCH[i];
      const branchIndex = BRANCHES.findIndex(b => b.name === branchName);
      const offsetFromTiger = (branchIndex - TIGER_INDEX + 12) % 12;
      const stem = STEMS[(firstMonthStemIndex + offsetFromTiger) % 10];
      const branch = BRANCHES[branchIndex];

      cycles.push({
        year,
        month,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) },
      });
    }
  }

  return cycles.sort((a, b) => a.month - b.month);
}

/* ===================== 일진(KST 기준) 확정 ===================== */
export function getIljinCalendar(year: number, month: number, dayMaster: DayMaster): IljinData[] {
  const calendar: IljinData[] = [];

  const kstMidnightUTC = (Y: number, M: number, D: number): number =>
    Date.UTC(Y, M - 1, D, -9, 0, 0, 0);

  // 1984-02-04 00:00 KST == 1984-02-03 15:00 UTC
  const BASE_UTC_MS = Date.UTC(1984, 1, 3, 15, 0, 0, 0);
  const BASE_EPOCH_DAYS = Math.floor(BASE_UTC_MS / 86400000);
  const DAY_MS = 86400000;

  const firstUTC = kstMidnightUTC(year, month, 1);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextFirstUTC = kstMidnightUTC(nextYear, nextMonth, 1);

  let d = 1;
  for (let ms = firstUTC; ms < nextFirstUTC; ms += DAY_MS, d++) {
    const curDays = Math.floor(ms / DAY_MS);
    const offset = (curDays - BASE_EPOCH_DAYS) + 4; // 포함 보정

    const stemIndex = ((offset % 10) + 10) % 10;
    const branchIndex = ((offset % 12) + 12) % 12;

    const stem = STEMS[stemIndex];
    const branch = BRANCHES[branchIndex];
    if (!stem || !branch) continue;

    calendar.push({
      year,
      month,
      day: d,
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