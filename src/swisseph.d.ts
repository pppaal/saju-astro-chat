// This tells TypeScript to add to the existing 'swisseph' module
declare module 'swisseph' {
  // --- Constants ---
  export const SE_SUN: number;
  export const SE_MOON: number;
  export const SE_MERCURY: number;
  export const SE_VENUS: number;
  export const SE_MARS: number;
  export const SE_JUPITER: number;
  export const SE_SATURN: number;
  export const SE_URANUS: number;
  export const SE_NEPTUNE: number;
  export const SE_PLUTO: number;
  export const SE_GREG_CAL: number;
  export const SEFLG_SPEED: number;


  // --- Functions ---
  export function swe_julday(year: number, month: number, day: number, hour: number, gregflag: number): number;

  type SwissEphSuccessResult = { longitude: number; latitude: number; distance: number; longitudeSpeed: number; latitudeSpeed: number; distanceSpeed: number; rflag: number; };
  type SwissEphErrorResult = { error: string; };

  export function swe_calc_ut(jd_ut: number, ipl: number, ifldag: number, callback: (result: SwissEphSuccessResult | SwissEphErrorResult) => void): void;

  // 💡 --- 핵심 수정사항 --- 💡
  // swe_houses의 실제 반환 타입과 일치하도록 최종 정의합니다.
  type SwissEphHousesResult = {
    house: number[];      // 'houses' (복수형)가 아닌 'house' (단수형)
    ascendant: number;    // 'ascmc' 배열 대신 별도 속성
    mc: number;           // 'ascmc' 배열 대신 별도 속성
    [key: string]: any; // 그 외 다른 속성들도 허용
  };

  export function swe_houses(jd_ut: number, lat: number, lon: number, hsys: string): SwissEphHousesResult;
  
  export function swe_set_ephe_path(path: string): void;
}

