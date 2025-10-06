// 파일 경로: src/lib/astrology/astrologyService.ts
import path from 'path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const swisseph = require('swisseph');

// --- 타입 정의 ---
export interface NatalChartInput {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface PlanetData {
  name: string;
  longitude: number;
  formatted: string;
  sign: string;
  degree: number;
  minute: number;
  house: number;
}

export interface NatalChartData {
  planets: PlanetData[];
  ascendant: PlanetData;
  mc: PlanetData;
  houses: { cusp: number; formatted: string }[];
}

// --- 상수 정의 ---
const PLANET_LIST = {
  Sun: swisseph.SE_SUN,
  Moon: swisseph.SE_MOON,
  Mercury: swisseph.SE_MERCURY,
  Venus: swisseph.SE_VENUS,
  Mars: swisseph.SE_MARS,
  Jupiter: swisseph.SE_JUPITER,
  Saturn: swisseph.SE_SATURN,
  Uranus: swisseph.SE_URANUS,
  Neptune: swisseph.SE_NEPTUNE,
  Pluto: swisseph.SE_PLUTO,
  'True Node': swisseph.SE_TRUE_NODE,
};

const ZODIAC_SIGNS = [
  '양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리',
  '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'
];

// --- 헬퍼 함수 ---
function formatLongitude(lon: number) {
  const signIndex = Math.floor(lon / 30);
  const posInSign = lon % 30;
  const degree = Math.floor(posInSign);
  const minute = Math.floor((posInSign - degree) * 60);

  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree,
    minute,
    formatted: `${ZODIAC_SIGNS[signIndex]} ${degree}° ${String(minute).padStart(2, '0')}'`,
  };
}

// --- 핵심 로직 함수 ---
export async function calculateNatalChart(input: NatalChartInput): Promise<NatalChartData> {
  // [치명적인 경로 오류 수정!] 'public' 폴더를 경로에 포함해야 합니다.
  const ephePath = path.join(process.cwd(), 'public', 'ephe');
  swisseph.swe_set_ephe_path(ephePath);

  const birthDateInProvidedTimezone = new Date(input.year, input.month - 1, input.date, input.hour, input.minute);
  
  const utcDate = dayjs.tz(birthDateInProvidedTimezone, input.timeZone).utc().toDate();

  const jdResult = swisseph.swe_utc_to_jd(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds(),
    swisseph.SE_GREG_CAL
  );

  if ('error' in jdResult) {
    throw new Error(`Swiss Ephemeris Error (swe_utc_to_jd): ${jdResult.error}`);
  }
  const ut_jd = jdResult.julianDayUT;

  const housesResult = swisseph.swe_houses(ut_jd, input.latitude, input.longitude, 'P');

  if ('error' in housesResult) {
    throw new Error(`Swiss Ephemeris Error (swe_houses): ${housesResult.error}.`);
  }
  const houses = housesResult;

  const ascendantInfo = formatLongitude(houses.ascendant);
  const mcInfo = formatLongitude(houses.mc);

  const ascendant: PlanetData = { name: 'Ascendant', longitude: houses.ascendant, ...ascendantInfo, house: 1 };
  const mc: PlanetData = { name: 'MC', longitude: houses.mc, ...mcInfo, house: 10 };

  const planets: PlanetData[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const planetCalcResult = swisseph.swe_calc_ut(ut_jd, planetId, 0);
    if ('error' in planetCalcResult) throw new Error(`Swiss Ephemeris Error (swe_calc_ut for ${name}): ${planetCalcResult.error}`);
    if (!('longitude' in planetCalcResult)) throw new Error(`Unexpected coordinate system for ${name}.`);

    const longitude = planetCalcResult.longitude;
    const formattedInfo = formatLongitude(longitude);

    let houseNum = 0;
    for (let i = 0; i < 12; i++) {
      const cuspStart = houses.house[i];
      const cuspEnd = houses.house[(i + 1) % 12];
      if (cuspStart > cuspEnd ? (longitude >= cuspStart || longitude < cuspEnd) : (longitude >= cuspStart && longitude < cuspEnd)) {
        houseNum = i + 1;
        break;
      }
    }
    return { name, longitude, ...formattedInfo, house: houseNum };
  });

  return {
    planets,
    ascendant,
    mc,
    houses: houses.house.map((cusp: number) => ({ cusp, formatted: formatLongitude(cusp).formatted })),
  };
}