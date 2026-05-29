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
  export const SEFLG_SWIEPH: number;

  // Extra points
  export const SE_TRUE_NODE: number;
  export const SE_CHIRON: number;
  export const SE_MEAN_APOG: number;  // Mean Lilith
  export const SE_OSCU_APOG: number;  // Osculating Lilith

  // Asteroids
  export const SE_CERES: number;
  export const SE_PALLAS: number;
  export const SE_JUNO: number;
  export const SE_VESTA: number;

  // Eclipse flags (subset — see Swiss Ephemeris manual for full list)
  export const SE_ECL_CENTRAL: number;
  export const SE_ECL_NONCENTRAL: number;
  export const SE_ECL_TOTAL: number;
  export const SE_ECL_ANNULAR: number;
  export const SE_ECL_PARTIAL: number;
  export const SE_ECL_ANNULAR_TOTAL: number;
  export const SE_ECL_PENUMBRAL: number;
  export const SE_ECL_ALLTYPES_SOLAR: number;
  export const SE_ECL_ALLTYPES_LUNAR: number;
  export const SE_ECL_ONE_TRY: number;


  // --- Functions ---
  export function swe_julday(year: number, month: number, day: number, hour: number, gregflag: number): number;

  type SwissEphSuccessResult = {
    longitude: number;
    latitude: number;
    distance: number;
    longitudeSpeed: number;
    latitudeSpeed: number;
    distanceSpeed: number;
    rflag: number;
    speed?: number;  // Alias for longitudeSpeed
  };
  type SwissEphErrorResult = { error: string; };

  // Overloads: with callback (async) or without (sync)
  export function swe_calc_ut(jd_ut: number, ipl: number, iflag: number, callback: (result: SwissEphSuccessResult | SwissEphErrorResult) => void): void;
  export function swe_calc_ut(jd_ut: number, ipl: number, iflag: number): SwissEphSuccessResult | SwissEphErrorResult;

  // UTC to Julian Day conversion
  type SwissEphUtcToJdResult = { julianDayUT: number; julianDayET: number; } | SwissEphErrorResult;
  export function swe_utc_to_jd(year: number, month: number, day: number, hour: number, minute: number, second: number, gregflag: number): SwissEphUtcToJdResult;

  // Julian Day to UTC conversion
  type SwissEphJdToUtcResult = { year: number; month: number; day: number; hour: number; minute: number; second: number; };
  export function swe_jdut1_to_utc(jd_ut: number, gregflag: number): SwissEphJdToUtcResult;

  // 💡 --- 핵심 수정사항 --- 💡
  // swe_houses의 실제 반환 타입과 일치하도록 최종 정의합니다.
  type SwissEphHousesResult = {
    house: number[];      // 'houses' (복수형)가 아닌 'house' (단수형)
    ascendant: number;    // 'ascmc' 배열 대신 별도 속성
    mc: number;           // 'ascmc' 배열 대신 별도 속성
    armc?: number;        // ARMC (sidereal time)
    vertex?: number;      // Vertex
    equatorialAscendant?: number;
    coAscendantKoch?: number;
    coAscendantMunkasey?: number;
    polarAscendant?: number;
  };

  export function swe_houses(jd_ut: number, lat: number, lon: number, hsys: string): SwissEphHousesResult | SwissEphErrorResult;
  
  export function swe_set_ephe_path(path: string): void;

  export function swe_version(): string;

  // Eclipse calculation results
  type SwissEphSolEclipseWhenGlobResult =
    | {
        rflag: number;
        maximum: number;
        noon: number;
        begin: number;
        end: number;
        totalBegin: number;
        totalEnd: number;
        centerBegin: number;
        centerEnd: number;
      }
    | SwissEphErrorResult;

  type SwissEphLunEclipseWhenResult =
    | {
        rflag: number;
        maximum: number;
        partialBegin: number;
        partialEnd: number;
        totalBegin: number;
        totalEnd: number;
        penumbralBegin: number;
        penumbralEnd: number;
      }
    | SwissEphErrorResult;

  export function swe_sol_eclipse_when_glob(
    tjd_start: number,
    ifl: number,
    ifltype: number,
    backward: 0 | 1
  ): SwissEphSolEclipseWhenGlobResult;
  export function swe_sol_eclipse_when_glob(
    tjd_start: number,
    ifl: number,
    ifltype: number,
    backward: 0 | 1,
    callback: (result: SwissEphSolEclipseWhenGlobResult) => void
  ): void;

  export function swe_lun_eclipse_when(
    tjd_start: number,
    ifl: number,
    ifltype: number,
    backward: 0 | 1
  ): SwissEphLunEclipseWhenResult;
  export function swe_lun_eclipse_when(
    tjd_start: number,
    ifl: number,
    ifltype: number,
    backward: 0 | 1,
    callback: (result: SwissEphLunEclipseWhenResult) => void
  ): void;
}

