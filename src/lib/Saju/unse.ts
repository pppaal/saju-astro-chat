// src/lib/Saju/unse.ts

import { toDate } from 'date-fns-tz';
import {
  STEMS, BRANCHES, MONTH_STEM_LOOKUP, CHEONEUL_GWIIN_MAP,
  FIVE_ELEMENT_RELATIONS, getSolarTermKST
} from './constants';
import {
  FiveElement, YinYang, DayMaster, DaeunData, YeonunData, WolunData, IljinData, StemBranchInfo
} from './types';

// 내부 유틸: 로컬 타임존 영향 제거용 UTC Date 생성
const utcDate = (y: number, m1to12: number, d: number, hh = 0, mm = 0, ss = 0, ms = 0) =>
  new Date(Date.UTC(y, m1to12 - 1, d, hh, mm, ss, ms));

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

// 출생 시각을 "출생지 타임존" 기준 로컬 → UTC 타임스탬프로 정규화
// birthDate는 "출생지 로컬 시각" Date라고 가정하면, 문자열로 안전 변환 후 toDate 사용을 권장
function normalizeBirthToUTC(birthDate: Date, timezone: string): Date {
  // birthDate를 구성요소로 분해해 'yyyy-MM-ddTHH:mm:ss'를 만든 뒤, 해당 타임존으로 toDate
  const y = birthDate.getFullYear();
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  const hh = birthDate.getHours();
  const mi = birthDate.getMinutes();
  const ss = birthDate.getSeconds();
  const isoLocal = `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(hh).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  // date-fns-tz: toDate(로컬ISO, { timeZone }) → 해당 타임존의 로컬시를 실제 UTC로 변환
  try {
    // @ts-ignore: 타입 시그니처 상 overload 이슈 회피
    return toDate(isoLocal, { timeZone: timezone });
  } catch {
    // 실패 시 입력 Date를 있는 그대로 사용(환경 의존). 가능하면 UI에서 24h 입력과 타임존을 강제하세요.
    return birthDate;
  }
}

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

export function getDaeunCycles(
  birthDate: Date,
  gender: 'male' | 'female',
  sajuPillars: SajuPillars,
  dayMaster: DayMaster,
  timezone: string
): { daeunsu: number; cycles: DaeunData[] } {
  if (!birthDate || !sajuPillars || !dayMaster || !timezone) {
    console.error('getDaeunCycles: 유효하지 않은 인자가 전달되었습니다.');
    return { daeunsu: 0, cycles: [] };
  }

  const yearStemYinYang = sajuPillars.year.heavenlyStem.yin_yang;
  const isForward = (yearStemYinYang === '양' && gender === 'male') || (yearStemYinYang === '음' && gender === 'female');

  // 출생 시각을 출생지 타임존 기준 UTC로 정규화하여 환경 차이 제거
  const birthUTC = normalizeBirthToUTC(birthDate, timezone);

  const y = birthUTC.getUTCFullYear();
  const m = birthUTC.getUTCMonth() + 1;

  // 절입 시각은 KST 기준으로 제공된다고 가정(getSolarTermKST)
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
  let daeunsu = Math.round(diffDays / 3);
  if (daeunsu < 1) daeunsu = 1;

  const cycles: DaeunData[] = [];
  const startStemIndex = STEMS.findIndex(s => s.name === sajuPillars.month.heavenlyStem.name);
  const startBranchIndex = BRANCHES.findIndex(b => b.name === sajuPillars.month.earthlyBranch.name);
  if (startStemIndex === -1 || startBranchIndex === -1) {
    console.error('대운 시작 간지를 찾지 못했습니다.');
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
  for (let i = count - 1; i >= 0; i--) {
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

export function getMonthlyCycles(year: number, dayMaster: DayMaster): WolunData[] {
  const cycles: WolunData[] = [];
  const year_gapja_index = (year - 4 + 6000) % 60;
  const yearStemName = STEMS[year_gapja_index % 10]?.name;
  if (!yearStemName) return [];

  const firstMonthStemName = MONTH_STEM_LOOKUP[yearStemName];
  const firstMonthStemIndex = STEMS.findIndex(s => s.name === firstMonthStemName);

  const branchOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
  for (let i = 0; i < 12; i++) {
    const month = i + 1; // 로컬 Date 영향 제거: 그냥 1~12 사용
    const stem = STEMS[(firstMonthStemIndex + i) % 10];
    const branch = BRANCHES[branchOrder[i]];
    if (stem && branch) {
      cycles.push({
        year,
        month,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) },
      });
    }
  }
  // 정렬만 유지(역순 필요하면 reverse 유지)
  return cycles.sort((a, b) => a.month - b.month).reverse();
}

export function getIljinCalendar(year: number, month: number, dayMaster: DayMaster): IljinData[] {
  // daysInMonth를 로컬 대신 UTC 기반으로 계산해 환경 차이 제거
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const calendar: IljinData[] = [];

  // KST 자정(00:00) 기준 UTC 타임스탬프 생성
  const kstMidnightUTC = (Y: number, M: number, D: number): number => {
    // KST = UTC+9 → UTC 시각으로는 전날 15:00
    return Date.UTC(Y, M - 1, D, -9, 0, 0, 0);
  };

  for (let day = 1; day <= daysInMonth; day++) {
    const msUTC = kstMidnightUTC(year, month, day);

    // JDN 계산(UTC 기준)
    // 2440587.5는 Unix epoch(1970-01-01T00:00:00Z)의 JDN
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