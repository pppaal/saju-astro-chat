// src/lib/astrology/foundation/eclipses.ts
// 이클립스 (Eclipse) 영향 계산 — Swiss Ephemeris 실시간 계산.
//
// 이전: 2020~2030년 49건 하드코딩 → 2030년 이후 신호 0건.
// 현재: swe_sol_eclipse_when_glob + swe_lun_eclipse_when 으로 임의 기간 계산.
//
// 캐시 전략:
//   - in-memory Map<rangeKey, Eclipse[]> — 같은 (startYear, endYear) 범위 결과 재사용.
//   - 천체 이벤트는 결정적이므로 TTL 없음 (프로세스 lifetime).
//   - rangeKey: `${startJD|0}_${endJD|0}` (JD floor — 같은 날 = 같은 키).
//
// 비싼 호출: 100년 윈도우당 일식 ~240회 + 월식 ~230회 → 합 ~470 swisseph 콜.
// 본명 차트 평생 계산 시 최초 1회만 발생, 이후 캐시 hit.

import { Chart, ZodiacKo } from "./types";
import { shortestAngle, formatLongitude, ZODIAC_SIGNS } from "./utils";
import { getSwisseph } from "./ephe";
import { extractSwissLongitude, getSwissEphFlags } from "./shared";
import { logger } from "@/lib/logger";

export interface Eclipse {
  type: "solar" | "lunar";
  date: string;           // ISO date (YYYY-MM-DD)
  longitude: number;      // 이클립스 발생 시 태양(일식)/달(월식) 황도경도
  sign: ZodiacKo;
  degree: number;
  description: string;
  /** Eclipse kind. solar: total | annular | partial | hybrid. lunar: total | partial | penumbral. */
  kind?: "total" | "annular" | "partial" | "hybrid" | "penumbral";
  /** Eclipse magnitude (1.0 ≈ total, <1.0 partial). solar only when available. */
  magnitude?: number;
}

export interface EclipseImpact {
  eclipse: Eclipse;
  affectedPoint: string;  // 영향받는 행성/포인트
  aspectType: "conjunction" | "opposition" | "square";
  orb: number;
  house: number;          // 이클립스가 떨어지는 하우스
  interpretation: string;
}

// ============================================================
// Swiss Ephemeris Eclipse Computation
// ============================================================

/** Convert a Date to Julian Day UT via swe_utc_to_jd. */
function dateToJD(date: Date): number {
  const sw = getSwisseph();
  const result = sw.swe_utc_to_jd(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    sw.SE_GREG_CAL
  );
  if ("error" in result) {
    throw new Error(`Eclipse JD conversion failed: ${result.error}`);
  }
  return result.julianDayUT;
}

/** Convert a JD UT to ISO 8601 string. */
function jdToISOString(jd: number): string {
  const sw = getSwisseph();
  const result = sw.swe_jdut1_to_utc(jd, sw.SE_GREG_CAL);
  if ("error" in result) {
    throw new Error(`Eclipse JD→UTC failed: ${result.error}`);
  }
  const { year, month, day, hour, minute, second } = result;
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  const sec = pad(second);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${sec}Z`;
}

/** Decode solar eclipse rflag → kind. */
function decodeSolarKind(rflag: number): Eclipse["kind"] {
  const sw = getSwisseph();
  if (rflag & sw.SE_ECL_TOTAL) return "total";
  if (rflag & sw.SE_ECL_ANNULAR_TOTAL) return "hybrid";
  if (rflag & sw.SE_ECL_ANNULAR) return "annular";
  if (rflag & sw.SE_ECL_PARTIAL) return "partial";
  return "partial";
}

/** Decode lunar eclipse rflag → kind. */
function decodeLunarKind(rflag: number): Eclipse["kind"] {
  const sw = getSwisseph();
  if (rflag & sw.SE_ECL_TOTAL) return "total";
  if (rflag & sw.SE_ECL_PARTIAL) return "partial";
  if (rflag & sw.SE_ECL_PENUMBRAL) return "penumbral";
  return "penumbral";
}

/** Sun ecliptic longitude at given JD UT. */
function sunLongitudeAtJD(jd: number): number {
  const sw = getSwisseph();
  const res = sw.swe_calc_ut(jd, sw.SE_SUN, getSwissEphFlags());
  if ("error" in res) {
    throw new Error(`Sun calc at eclipse failed: ${res.error}`);
  }
  return extractSwissLongitude(res as unknown as Record<string, unknown>);
}

/** Moon ecliptic longitude at given JD UT. */
function moonLongitudeAtJD(jd: number): number {
  const sw = getSwisseph();
  const res = sw.swe_calc_ut(jd, sw.SE_MOON, getSwissEphFlags());
  if ("error" in res) {
    throw new Error(`Moon calc at eclipse failed: ${res.error}`);
  }
  return extractSwissLongitude(res as unknown as Record<string, unknown>);
}

/**
 * Detect whether the swisseph runtime exposes the eclipse functions.
 * Test environments mock swisseph but may not mock eclipse helpers — return false
 * so callers degrade gracefully to empty arrays instead of crashing.
 */
function hasEclipseSupport(): boolean {
  try {
    const sw = getSwisseph() as unknown as Record<string, unknown>;
    return (
      typeof sw.swe_sol_eclipse_when_glob === "function" &&
      typeof sw.swe_lun_eclipse_when === "function"
    );
  } catch {
    return false;
  }
}

/**
 * Compute every solar eclipse with maximum JD ∈ [startJD, endJD).
 * Uses Swiss Eph swe_sol_eclipse_when_glob iteratively (forward search).
 */
function computeSolarEclipses(startJD: number, endJD: number): Eclipse[] {
  const sw = getSwisseph();
  const out: Eclipse[] = [];
  let cursor = startJD;
  // Search any solar eclipse type.
  const ifltype = 0;
  // Safety bound: avg solar eclipse cadence ≈ 173 days. 200 years ≈ 425 events.
  // Allow +50% slack to avoid premature exit.
  const maxIter = Math.ceil((endJD - startJD) / 50) + 50;
  for (let i = 0; i < maxIter; i++) {
    const res = sw.swe_sol_eclipse_when_glob(cursor, sw.SEFLG_SWIEPH, ifltype, 0);
    if ("error" in res) {
      // swisseph returns an error string when no more eclipses found in range.
      break;
    }
    const peakJD = res.maximum;
    if (!Number.isFinite(peakJD) || peakJD >= endJD) break;
    if (peakJD < startJD) {
      // Shouldn't happen, but guard anyway.
      cursor = peakJD + 1;
      continue;
    }
    const sunLon = sunLongitudeAtJD(peakJD);
    const { sign, degree } = formatLongitude(sunLon);
    const iso = jdToISOString(peakJD);
    const kind = decodeSolarKind(res.rflag);
    const dateStr = iso.slice(0, 10);
    const kindLabel: Record<NonNullable<Eclipse["kind"]>, string> = {
      total: "개기일식",
      annular: "금환일식",
      partial: "부분일식",
      hybrid: "혼성일식",
      penumbral: "부분일식",
    };
    out.push({
      type: "solar",
      date: dateStr,
      longitude: sunLon,
      sign,
      degree,
      description: `${dateStr} ${kindLabel[kind ?? "partial"]}`,
      kind,
    });
    // Advance cursor past this peak. Solar eclipses are ≥ ~150 days apart.
    cursor = peakJD + 1;
  }
  return out;
}

/**
 * Compute every lunar eclipse with maximum JD ∈ [startJD, endJD).
 */
function computeLunarEclipses(startJD: number, endJD: number): Eclipse[] {
  const sw = getSwisseph();
  const out: Eclipse[] = [];
  let cursor = startJD;
  const ifltype = 0;
  const maxIter = Math.ceil((endJD - startJD) / 50) + 50;
  for (let i = 0; i < maxIter; i++) {
    const res = sw.swe_lun_eclipse_when(cursor, sw.SEFLG_SWIEPH, ifltype, 0);
    if ("error" in res) {
      break;
    }
    const peakJD = res.maximum;
    if (!Number.isFinite(peakJD) || peakJD >= endJD) break;
    if (peakJD < startJD) {
      cursor = peakJD + 1;
      continue;
    }
    const moonLon = moonLongitudeAtJD(peakJD);
    const { sign, degree } = formatLongitude(moonLon);
    const iso = jdToISOString(peakJD);
    const kind = decodeLunarKind(res.rflag);
    const dateStr = iso.slice(0, 10);
    const kindLabel: Record<NonNullable<Eclipse["kind"]>, string> = {
      total: "개기월식",
      partial: "부분월식",
      penumbral: "반영월식",
      annular: "부분월식",
      hybrid: "부분월식",
    };
    out.push({
      type: "lunar",
      date: dateStr,
      longitude: moonLon,
      sign,
      degree,
      description: `${dateStr} ${kindLabel[kind ?? "penumbral"]}`,
      kind,
    });
    cursor = peakJD + 1;
  }
  return out;
}

// ============================================================
// Range cache (in-memory, process-lifetime)
// ============================================================

const eclipseRangeCache = new Map<string, Eclipse[]>();

function rangeKey(startJD: number, endJD: number): string {
  return `${Math.floor(startJD)}_${Math.floor(endJD)}`;
}

/**
 * Internal: compute eclipses (solar + lunar) over [startJD, endJD), cached.
 * Returns sorted by date ascending.
 */
function eclipsesInJDRange(startJD: number, endJD: number): Eclipse[] {
  const key = rangeKey(startJD, endJD);
  const cached = eclipseRangeCache.get(key);
  if (cached) return cached;

  if (!hasEclipseSupport()) {
    // Test mock or stripped runtime — degrade gracefully.
    eclipseRangeCache.set(key, []);
    return [];
  }

  let solar: Eclipse[] = [];
  let lunar: Eclipse[] = [];
  try {
    solar = computeSolarEclipses(startJD, endJD);
  } catch (err) {
    logger.warn("[eclipses] solar computation failed", { err: String(err) });
  }
  try {
    lunar = computeLunarEclipses(startJD, endJD);
  } catch (err) {
    logger.warn("[eclipses] lunar computation failed", { err: String(err) });
  }
  const merged = [...solar, ...lunar].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  eclipseRangeCache.set(key, merged);
  return merged;
}

/** Test/diagnostic helper: clear the in-memory eclipse cache. */
export function _clearEclipseCache(): void {
  eclipseRangeCache.clear();
}

// ============================================================
// Public API
// ============================================================

/**
 * 특정 기간의 이클립스 가져오기 (Swiss Ephemeris 실시간 계산, 캐시됨).
 * @param startDate ISO date or datetime string.
 * @param endDate   ISO date or datetime string (exclusive).
 */
export function getEclipsesBetween(
  startDate: string | Date,
  endDate: string | Date
): Eclipse[] {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end <= start) return [];

  let startJD: number;
  let endJD: number;
  try {
    startJD = dateToJD(start);
    endJD = dateToJD(end);
  } catch {
    return [];
  }
  return eclipsesInJDRange(startJD, endJD);
}

/**
 * Default natal span: from `now - 50 years` to `now + 100 years`.
 * Covers a typical lifetime including childhood eclipses + future events.
 * Used by `getAllEclipses()` and `getUpcomingEclipses()` when no range is given.
 */
function defaultLifespanRange(reference: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(reference);
  start.setUTCFullYear(reference.getUTCFullYear() - 50);
  const end = new Date(reference);
  end.setUTCFullYear(reference.getUTCFullYear() + 100);
  return { start, end };
}

/**
 * 다가오는 이클립스 가져오기.
 * `fromDate` 부터 100년 윈도우 내에서 최대 `count` 개.
 */
export function getUpcomingEclipses(
  fromDate: Date = new Date(),
  count: number = 4
): Eclipse[] {
  const end = new Date(fromDate);
  end.setUTCFullYear(fromDate.getUTCFullYear() + 100);
  const all = getEclipsesBetween(fromDate, end);
  return all.slice(0, count);
}

/**
 * 특정 사인의 이클립스 가져오기 (기본 수명 윈도우 기준).
 */
export function getEclipsesInSign(
  sign: ZodiacKo,
  startDate?: Date,
  endDate?: Date
): Eclipse[] {
  const range = !startDate || !endDate ? defaultLifespanRange() : null;
  const start = startDate ?? range!.start;
  const end = endDate ?? range!.end;
  return getEclipsesBetween(start, end).filter((eclipse) => eclipse.sign === sign);
}

/**
 * 모든 이클립스 데이터 가져오기 (기본 수명 윈도우 기준).
 * 이전 동기 시그니처 유지 — 캐시 hit 시 즉시 반환, miss 시 ~500 swisseph 콜.
 */
export function getAllEclipses(startDate?: Date, endDate?: Date): Eclipse[] {
  const range = !startDate || !endDate ? defaultLifespanRange() : null;
  const start = startDate ?? range!.start;
  const end = endDate ?? range!.end;
  return getEclipsesBetween(start, end);
}

/**
 * 본명 차트 평생 + 미래 100년 이클립스 — 캘린더 추출기용.
 * @param birthDate 본명 출생일.
 * @param horizonYearsAhead 미래 윈도우 (기본 100년).
 */
export function getLifetimeEclipses(
  birthDate: Date,
  horizonYearsAhead: number = 100
): Eclipse[] {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setUTCFullYear(now.getUTCFullYear() + horizonYearsAhead);
  return getEclipsesBetween(birthDate, horizon);
}

/**
 * 이클립스가 차트에 미치는 영향 찾기.
 * `eclipses` 미지정 시 기본 수명 윈도우(±50/+100년)에서 자동 계산.
 */
export function findEclipseImpact(
  chart: Chart,
  eclipses?: Eclipse[],
  orb: number = 3.0
): EclipseImpact[] {
  const list = eclipses ?? getAllEclipses();
  const impacts: EclipseImpact[] = [];
  const allPoints = [...chart.planets, chart.ascendant, chart.mc];

  for (const eclipse of list) {
    // 이클립스가 떨어지는 하우스 찾기
    let eclipseHouse = 1;
    for (let i = 0; i < 12; i++) {
      const nextI = (i + 1) % 12;
      const cusp = chart.houses[i].cusp;
      let nextCusp = chart.houses[nextI].cusp;

      if (nextCusp < cusp) {nextCusp += 360;}
      let testLon = eclipse.longitude;
      if (testLon < cusp) {testLon += 360;}

      if (testLon >= cusp && testLon < nextCusp) {
        eclipseHouse = i + 1;
        break;
      }
    }

    for (const point of allPoints) {
      const diff = shortestAngle(point.longitude, eclipse.longitude);

      // Conjunction
      if (diff <= orb) {
        impacts.push({
          eclipse,
          affectedPoint: point.name,
          aspectType: "conjunction",
          orb: diff,
          house: eclipseHouse,
          interpretation: getEclipseInterpretation(eclipse, point.name, "conjunction", eclipseHouse),
        });
      }
      // Opposition
      else if (Math.abs(diff - 180) <= orb) {
        impacts.push({
          eclipse,
          affectedPoint: point.name,
          aspectType: "opposition",
          orb: Math.abs(diff - 180),
          house: eclipseHouse,
          interpretation: getEclipseInterpretation(eclipse, point.name, "opposition", eclipseHouse),
        });
      }
      // Square
      else if (Math.abs(diff - 90) <= orb) {
        impacts.push({
          eclipse,
          affectedPoint: point.name,
          aspectType: "square",
          orb: Math.abs(diff - 90),
          house: eclipseHouse,
          interpretation: getEclipseInterpretation(eclipse, point.name, "square", eclipseHouse),
        });
      }
    }
  }

  return impacts.sort((a, b) => a.orb - b.orb);
}

/**
 * 이클립스 해석 생성
 */
function getEclipseInterpretation(
  eclipse: Eclipse,
  planet: string,
  aspect: "conjunction" | "opposition" | "square",
  house: number
): string {
  const eclipseType = eclipse.type === "solar" ? "일식" : "월식";
  const aspectKo = aspect === "conjunction" ? "합" : aspect === "opposition" ? "충" : "사각";

  const baseInterpretation = `${eclipse.date}의 ${eclipseType}이 ${house}하우스에서 ${planet}와 ${aspectKo}을 이룹니다.`;

  const planetMeanings: Record<string, string> = {
    Sun: "정체성과 자아의식에 중요한 변화의 시기",
    Moon: "감정과 내면 세계에 깊은 변형의 시기",
    Mercury: "소통, 학습, 이동에 관한 중요한 사건",
    Venus: "사랑, 관계, 가치관에 관한 전환점",
    Mars: "에너지, 야망, 행동력에 관한 중요한 시기",
    Jupiter: "확장, 성장, 기회에 관한 중요한 문",
    Saturn: "책임, 구조, 장기 목표에 관한 전환점",
    Uranus: "갑작스러운 변화와 혁명적 전환",
    Neptune: "영적 각성 또는 혼란의 시기",
    Pluto: "깊은 변형과 재탄생의 시기",
    Ascendant: "자아 이미지와 삶의 방향에 중요한 변화",
    MC: "커리어와 사회적 위치에 중요한 전환점",
    "True Node": "운명적 전환점, 삶의 방향에 관한 중요한 시기",
  };

  const meaning = planetMeanings[planet] || "중요한 변화의 시기";

  return `${baseInterpretation} ${meaning}.`;
}

/**
 * 이클립스 축(Eclipse Axis) 분석
 * 이클립스는 항상 반대 사인 축에서 발생합니다.
 */
export function getEclipseAxis(eclipse: Eclipse): {
  primary: ZodiacKo;
  opposite: ZodiacKo;
} {
  const signIndex = ZODIAC_SIGNS.indexOf(eclipse.sign);
  const oppositeIndex = (signIndex + 6) % 12;

  return {
    primary: eclipse.sign,
    opposite: ZODIAC_SIGNS[oppositeIndex],
  };
}

/**
 * 차트에서 이클립스 시즌 민감도 확인
 * 노드 축 근처에 행성이 있으면 이클립스에 더 민감합니다.
 */
export function checkEclipseSensitivity(
  chart: Chart,
  orb: number = 5
): {
  sensitive: boolean;
  sensitivePoints: string[];
  nodeSign: ZodiacKo | null;
} {
  const node = chart.planets.find((p) => p.name === "True Node" || p.name === "Mean Node");
  if (!node) {
    return { sensitive: false, sensitivePoints: [], nodeSign: null };
  }

  const sensitivePoints: string[] = [];
  const allPoints = [...chart.planets, chart.ascendant, chart.mc];

  for (const point of allPoints) {
    if (point.name === node.name) {continue;}

    const diff = shortestAngle(point.longitude, node.longitude);
    // 노드와 합 또는 충
    if (diff <= orb || Math.abs(diff - 180) <= orb) {
      sensitivePoints.push(point.name);
    }
  }

  return {
    sensitive: sensitivePoints.length > 0,
    sensitivePoints,
    nodeSign: node.sign,
  };
}
