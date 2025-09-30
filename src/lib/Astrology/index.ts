// src/lib/astrology/index.ts
import { Horoscope, Origin } from 'circular-natal-horoscope-js';
import { getOffsetMinutes } from '@/lib/Saju/timezone';

// 입력 타입: timeZone 추가
export interface NatalChartInput {
  year: number;     // 4-digit, e.g. 1995
  month: number;    // 1-12
  date: number;     // 1-31
  hour: number;     // 0-23
  minute: number;   // 0-59
  latitude: number; // decimal degrees
  longitude: number;// decimal degrees
  locationName: string; // display text
  timeZone: string;     // IANA TZ, e.g., "Asia/Seoul", "America/New_York"
}

// 내부 타입(출력 포맷용)
interface ArcDegrees { degrees: number; minutes: number; seconds: number; }
interface CelestialBody {
  label: string;
  Sign?: { label: string };
  ChartPosition?: { Ecliptic?: { ArcDegrees?: ArcDegrees } };
  House?: { id: number };
  isRetrograde?: boolean;
}
interface House {
  id: number;
  Sign?: { label: string };
  ChartPosition?: { Ecliptic?: { ArcDegrees?: ArcDegrees } };
}
interface Aspect {
  point1: string;
  point2: string;
  aspect: { label: string };
  orb: number;
}

// ---------- 포맷 유틸 ----------
const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
];

function toTotalDegrees(arc: ArcDegrees): number {
  return (arc.degrees ?? 0) + (arc.minutes ?? 0) / 60 + (arc.seconds ?? 0) / 3600;
}

function toSignDegree(totalDeg: number) {
  const norm = ((totalDeg % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const degInSign = norm - signIndex * 30;
  const deg = Math.floor(degInSign);
  const minFloat = (degInSign - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return { sign: SIGNS[signIndex], deg, min, sec };
}

function fmtArc(arc: ArcDegrees) {
  const total = toTotalDegrees(arc);
  const { sign, deg, min } = toSignDegree(total);
  return `${sign} ${deg}°${String(min).padStart(2, '0')}′`;
}

// 로컬(선택 타임존)의 출생시각 → UTC Date로 변환
function toUTCFromLocal(input: NatalChartInput): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  // 사용자가 의미하는 “로컬 시각”을 ISO 문자열로 구성
  const localIso = `${input.year}-${pad(input.month)}-${pad(input.date)}T${pad(input.hour)}:${pad(input.minute)}:00`;
  // 해당 시점 기준으로 선택된 타임존의 오프셋(분) 계산(DST 반영)
  const probeUTC = new Date(Date.UTC(input.year, input.month - 1, input.date, input.hour, input.minute, 0));
  const offsetMin = getOffsetMinutes(probeUTC, input.timeZone);
  // 로컬 = UTC + offset → UTC = 로컬 - offset
  const utcMs = Date.parse(localIso + 'Z') - offsetMin * 60_000;
  return new Date(utcMs);
}

// 메인: 프롬프트 생성
export function generatePromptForGemini(input: NatalChartInput): string {
  const utc = toUTCFromLocal(input);

  // 라이브러리는 UTC 컴포넌트로 전달
  const origin = new Origin({
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth(),   // 0-based
    date: utc.getUTCDate(),
    hour: utc.getUTCHours(),
    minute: utc.getUTCMinutes(),
    latitude: input.latitude,
    longitude: input.longitude,
  });

  const horoscope = new Horoscope({
    origin,
    houseSystem: 'Placidus',
    zodiac: 'tropical',
    aspectPoints: [
      'sun','moon','mercury','venus','mars','jupiter','saturn',
      'uranus','neptune','pluto','ascendant','midheaven',
    ],
    aspectTypes: ['conjunction','opposition','trine','square','sextile'],
  });

  // -----------------------------
  // 텍스트 빌드
  // -----------------------------
  let dataDescription = `--- Birth Chart Data ---\n\n`;

  // 기본 정보: 로컬 시각 + 변환된 UTC 시각 병기
  const pad = (n: number) => String(n).padStart(2, '0');
  dataDescription += `[Basic Information]\n`;
  dataDescription += `- Birth Time (Local ${input.timeZone}): ${input.year}-${pad(input.month)}-${pad(input.date)} ${pad(input.hour)}:${pad(input.minute)}\n`;
  dataDescription += `- Converted UTC Time: ${utc.getUTCFullYear()}-${pad(utc.getUTCMonth()+1)}-${pad(utc.getUTCDate())} ${pad(utc.getUTCHours())}:${pad(utc.getUTCMinutes())}\n`;
  dataDescription += `- Birth Location: ${input.locationName} (Lat ${input.latitude.toFixed(4)}, Lon ${input.longitude.toFixed(4)})\n`;

  // ASC
  const ascendant = horoscope.Ascendant;
  if (ascendant?.ChartPosition?.Ecliptic?.ArcDegrees) {
    dataDescription += `- Ascendant (ASC): ${fmtArc(ascendant.ChartPosition.Ecliptic.ArcDegrees)}\n`;
  }

  // MC
  const midheaven = horoscope.Midheaven;
  if (midheaven?.ChartPosition?.Ecliptic?.ArcDegrees) {
    dataDescription += `- Midheaven (MC): ${fmtArc(midheaven.ChartPosition.Ecliptic.ArcDegrees)}\n`;
  }

  dataDescription += `\n`;

  // 행성 위치
  dataDescription += `[Planetary Positions]\n`;
  horoscope.CelestialBodies.all.forEach((planet: CelestialBody) => {
    if (planet?.ChartPosition?.Ecliptic?.ArcDegrees && planet?.House) {
      const retro = planet.isRetrograde ? ' (retrograde)' : '';
      dataDescription += `- ${planet.label} in ${fmtArc(planet.ChartPosition.Ecliptic.ArcDegrees)}, House ${planet.House.id}${retro}\n`;
    }
  });

  dataDescription += `\n`;

  // 하우스
  dataDescription += `[House System: ${horoscope._houseSystem}]\n`;
  horoscope.Houses.forEach((house: House) => {
    if (house?.ChartPosition?.Ecliptic?.ArcDegrees) {
      dataDescription += `- House ${house.id} cusp: ${fmtArc(house.ChartPosition.Ecliptic.ArcDegrees)}\n`;
    }
  });

  dataDescription += `\n`;

  // 주요 각
  dataDescription += `[Major Aspects]\n`;
  horoscope.Aspects.all.forEach((aspect: Aspect) => {
    if (aspect?.aspect?.label) {
      dataDescription += `- ${aspect.point1} ↔ ${aspect.point2}: ${aspect.aspect.label} (orb ${aspect.orb}°)\n`;
    }
  });

  dataDescription += `\n`;

  const finalPrompt = `Your Cosmic Interpretation
You are the world’s greatest astrologer. Your mission is to provide a profound analysis and insightful advice based on the birth chart data below. Use professional terminology, but explain it in a way that non-experts can also understand. Address both positive potentials and challenging aspects in a balanced manner.

${dataDescription}
--- Analysis ---
Based on this data, please provide a comprehensive interpretation of this person’s personality, talents, potential, and life challenges, offering warm and wise guidance.`;

  return finalPrompt.trim();
}