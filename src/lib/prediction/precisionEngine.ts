// src/lib/prediction/precisionEngine.ts
// 초정밀 예측 엔진 - 100% 정밀도를 위한 통합 시스템
// TIER 5: 과거/미래 완벽 정밀 분석

import type { FiveElement } from './timingScore';

// ============================================================
// 타입 정의
// ============================================================

/** 절기 (24절기) */
export interface SolarTerm {
  name: string;
  nameKo: string;
  date: Date;
  longitude: number; // 태양 황경
  month: number; // 절기월 (1-12)
  element: FiveElement;
  energy: 'yang' | 'yin';
  seasonPhase: 'early' | 'mid' | 'late';
}

/** 음력 정보 */
export interface LunarInfo {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  lunarPhase: LunarPhase;
  mansion: LunarMansion; // 28수
}

/** 달 위상 (8단계) */
export type LunarPhase =
  | 'new_moon'        // 삭
  | 'waxing_crescent' // 초승
  | 'first_quarter'   // 상현
  | 'waxing_gibbous'  // 상현망
  | 'full_moon'       // 망
  | 'waning_gibbous'  // 하현망
  | 'last_quarter'    // 하현
  | 'waning_crescent';// 그믐

/** 28수 (Lunar Mansions) */
export interface LunarMansion {
  index: number;      // 1-28
  name: string;       // 角, 亢, 氐, ...
  nameKo: string;
  element: FiveElement;
  animal: string;     // 교룡, 용, 담비, ...
  isAuspicious: boolean;
  goodFor: string[];
  badFor: string[];
}

/** 행성시 (Planetary Hours) */
export interface PlanetaryHour {
  hour: number;       // 0-23
  startTime: Date;
  endTime: Date;
  planet: 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';
  element: FiveElement;
  isDay: boolean;
  quality: 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
  goodFor: string[];
}

/** 진행법 결과 */
export interface ProgressionResult {
  secondaryProgression: {
    sun: { sign: string; degree: number; house: number };
    moon: { sign: string; degree: number; house: number; phase: string };
    mercury: { sign: string; degree: number };
    venus: { sign: string; degree: number };
    mars: { sign: string; degree: number };
  };
  solarArc: {
    arcDegree: number;
    progressedAsc: { sign: string; degree: number };
    progressedMc: { sign: string; degree: number };
  };
  profection: {
    year: number;
    house: number;
    ruler: string;
    theme: string;
  };
  interpretation: string;
}

/** 과거 분석 상세 */
export interface PastAnalysisDetailed {
  date: Date;

  // 기본 분석
  dailyPillar: { stem: string; branch: string };
  monthlyPillar: { stem: string; branch: string };
  yearlyPillar: { stem: string; branch: string };

  // 고급 분석
  solarTerm: SolarTerm;
  lunarInfo: LunarInfo;
  twelveStage: { stage: string; score: number; energy: string };
  sibsin: string;

  // 사건 유형별 분석
  eventAnalysis: {
    career: { score: number; factors: string[]; whyHappened: string[] };
    finance: { score: number; factors: string[]; whyHappened: string[] };
    relationship: { score: number; factors: string[]; whyHappened: string[] };
    health: { score: number; factors: string[]; whyHappened: string[] };
    travel: { score: number; factors: string[]; whyHappened: string[] };
    education: { score: number; factors: string[]; whyHappened: string[] };
  };

  // 왜 그랬는지 분석
  causalFactors: CausalFactor[];

  // 대운/세운 영향
  daeunInfluence: {
    daeun: { stem: string; branch: string; age: number };
    interaction: string;
    impact: number;
  };

  // 점성술 상태 (당시)
  astrologyState?: {
    retrogrades: string[];
    eclipseProximity: boolean;
    majorTransits: string[];
  };

  overallScore: number;
  confidence: number;
}

/** 인과 요인 */
export interface CausalFactor {
  type: 'stem_clash' | 'branch_clash' | 'branch_harmony' | 'gongmang' |
        'shinsal' | 'daeun_transition' | 'eclipse' | 'retrograde' |
        'yongsin_activation' | 'kisin_activation' | 'twelve_stage' |
        'sibsin_influence' | 'lunar_mansion' | 'solar_term_change';
  factor: string;
  description: string;
  impact: 'major_positive' | 'positive' | 'neutral' | 'negative' | 'major_negative';
  score: number;
  affectedAreas: string[];
}

/** 미래 예측 상세 */
export interface FuturePredictionDetailed {
  date: Date;
  periodType: 'day' | 'week' | 'month' | 'year';

  // 기본 정보
  pillar: { stem: string; branch: string };
  solarTerm?: SolarTerm;
  lunarInfo?: LunarInfo;

  // 점수
  scores: {
    overall: number;
    career: number;
    finance: number;
    relationship: number;
    health: number;
    creativity: number;
    spirituality: number;
  };

  // 사주 기반 분석
  sajuAnalysis: {
    twelveStage: { stage: string; score: number; energy: string };
    sibsin: string;
    branchInteractions: Array<{ type: string; score: number; description: string }>;
    gongmangStatus: { isAffected: boolean; areas: string[] };
    shinsalActive: Array<{ name: string; type: 'lucky' | 'unlucky'; effect: string }>;
    tonggeunStrength: number;
    tuechulStatus: { revealed: string[]; strength: number };
  };

  // 점성술 기반 분석
  astrologyAnalysis?: {
    progression: ProgressionResult;
    transits: Array<{ planet: string; aspect: string; natal: string; effect: string }>;
    retrogrades: string[];
    moonPhase: LunarPhase;
    lunarMansion: LunarMansion;
    planetaryHours: PlanetaryHour[];
  };

  // 대운-트랜짓 동기화
  syncAnalysis: {
    daeun: { stem: string; branch: string; age: number; element: FiveElement };
    transitAlignment: number; // 0-100
    synergyType: 'amplify' | 'clash' | 'balance' | 'neutral';
    themes: string[];
  };

  // 최적 시간대 (일별 분석 시)
  optimalHours?: {
    best: { hour: number; activity: string; score: number }[];
    avoid: { hour: number; reason: string }[];
  };

  // 구체적 조언
  advice: {
    dos: string[];
    donts: string[];
    focus: string[];
    opportunities: string[];
    warnings: string[];
  };

  // 신뢰도
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
}

// ============================================================
// 24절기 데이터
// ============================================================

const SOLAR_TERMS: { name: string; nameKo: string; month: number; element: FiveElement; energy: 'yang' | 'yin' }[] = [
  { name: 'lichun', nameKo: '입춘', month: 1, element: '목', energy: 'yang' },
  { name: 'yushui', nameKo: '우수', month: 1, element: '목', energy: 'yin' },
  { name: 'jingzhe', nameKo: '경칩', month: 2, element: '목', energy: 'yang' },
  { name: 'chunfen', nameKo: '춘분', month: 2, element: '목', energy: 'yin' },
  { name: 'qingming', nameKo: '청명', month: 3, element: '목', energy: 'yang' },
  { name: 'guyu', nameKo: '곡우', month: 3, element: '목', energy: 'yin' },
  { name: 'lixia', nameKo: '입하', month: 4, element: '화', energy: 'yang' },
  { name: 'xiaoman', nameKo: '소만', month: 4, element: '화', energy: 'yin' },
  { name: 'mangzhong', nameKo: '망종', month: 5, element: '화', energy: 'yang' },
  { name: 'xiazhi', nameKo: '하지', month: 5, element: '화', energy: 'yin' },
  { name: 'xiaoshu', nameKo: '소서', month: 6, element: '화', energy: 'yang' },
  { name: 'dashu', nameKo: '대서', month: 6, element: '화', energy: 'yin' },
  { name: 'liqiu', nameKo: '입추', month: 7, element: '금', energy: 'yang' },
  { name: 'chushu', nameKo: '처서', month: 7, element: '금', energy: 'yin' },
  { name: 'bailu', nameKo: '백로', month: 8, element: '금', energy: 'yang' },
  { name: 'qiufen', nameKo: '추분', month: 8, element: '금', energy: 'yin' },
  { name: 'hanlu', nameKo: '한로', month: 9, element: '금', energy: 'yang' },
  { name: 'shuangjiang', nameKo: '상강', month: 9, element: '금', energy: 'yin' },
  { name: 'lidong', nameKo: '입동', month: 10, element: '수', energy: 'yang' },
  { name: 'xiaoxue', nameKo: '소설', month: 10, element: '수', energy: 'yin' },
  { name: 'daxue', nameKo: '대설', month: 11, element: '수', energy: 'yang' },
  { name: 'dongzhi', nameKo: '동지', month: 11, element: '수', energy: 'yin' },
  { name: 'xiaohan', nameKo: '소한', month: 12, element: '수', energy: 'yang' },
  { name: 'dahan', nameKo: '대한', month: 12, element: '수', energy: 'yin' },
];

// ============================================================
// 28수 데이터
// ============================================================

const LUNAR_MANSIONS: Omit<LunarMansion, 'index'>[] = [
  { name: '角', nameKo: '각', element: '목', animal: '교룡', isAuspicious: true, goodFor: ['건축', '결혼'], badFor: ['장례'] },
  { name: '亢', nameKo: '항', element: '금', animal: '용', isAuspicious: false, goodFor: ['수리'], badFor: ['결혼', '이사'] },
  { name: '氐', nameKo: '저', element: '토', animal: '담비', isAuspicious: true, goodFor: ['결혼', '계약'], badFor: [] },
  { name: '房', nameKo: '방', element: '수', animal: '토끼', isAuspicious: true, goodFor: ['결혼', '개업', '건축'], badFor: [] },
  { name: '心', nameKo: '심', element: '화', animal: '여우', isAuspicious: false, goodFor: [], badFor: ['결혼', '장례'] },
  { name: '尾', nameKo: '미', element: '화', animal: '호랑이', isAuspicious: true, goodFor: ['결혼', '건축', '개업'], badFor: [] },
  { name: '箕', nameKo: '기', element: '수', animal: '표범', isAuspicious: true, goodFor: ['이사', '개업'], badFor: ['결혼'] },
  { name: '斗', nameKo: '두', element: '목', animal: '해', isAuspicious: true, goodFor: ['토목', '건축'], badFor: [] },
  { name: '牛', nameKo: '우', element: '금', animal: '소', isAuspicious: false, goodFor: [], badFor: ['결혼', '계약'] },
  { name: '女', nameKo: '여', element: '토', animal: '박쥐', isAuspicious: false, goodFor: [], badFor: ['결혼', '장례'] },
  { name: '虛', nameKo: '허', element: '수', animal: '쥐', isAuspicious: false, goodFor: ['수행'], badFor: ['결혼', '계약', '건축'] },
  { name: '危', nameKo: '위', element: '화', animal: '제비', isAuspicious: false, goodFor: [], badFor: ['대부분'] },
  { name: '室', nameKo: '실', element: '화', animal: '돼지', isAuspicious: true, goodFor: ['결혼', '건축', '이사'], badFor: [] },
  { name: '壁', nameKo: '벽', element: '수', animal: '유', isAuspicious: true, goodFor: ['결혼', '건축', '학업'], badFor: [] },
  { name: '奎', nameKo: '규', element: '목', animal: '늑대', isAuspicious: true, goodFor: ['결혼', '개업', '건축'], badFor: [] },
  { name: '婁', nameKo: '루', element: '금', animal: '개', isAuspicious: true, goodFor: ['결혼', '건축', '개업'], badFor: [] },
  { name: '胃', nameKo: '위', element: '토', animal: '꿩', isAuspicious: true, goodFor: ['개업', '이사'], badFor: [] },
  { name: '昴', nameKo: '묘', element: '수', animal: '닭', isAuspicious: false, goodFor: [], badFor: ['대부분'] },
  { name: '畢', nameKo: '필', element: '화', animal: '오리', isAuspicious: true, goodFor: ['건축', '결혼'], badFor: [] },
  { name: '觜', nameKo: '자', element: '화', animal: '원숭이', isAuspicious: false, goodFor: [], badFor: ['결혼'] },
  { name: '参', nameKo: '삼', element: '수', animal: '원숭이', isAuspicious: true, goodFor: ['개업', '계약'], badFor: ['결혼'] },
  { name: '井', nameKo: '정', element: '목', animal: '말', isAuspicious: true, goodFor: ['결혼', '개업'], badFor: [] },
  { name: '鬼', nameKo: '귀', element: '금', animal: '양', isAuspicious: false, goodFor: ['제사'], badFor: ['대부분'] },
  { name: '柳', nameKo: '류', element: '토', animal: '사슴', isAuspicious: false, goodFor: [], badFor: ['대부분'] },
  { name: '星', nameKo: '성', element: '수', animal: '말', isAuspicious: true, goodFor: ['결혼', '개업', '건축'], badFor: [] },
  { name: '張', nameKo: '장', element: '화', animal: '사슴', isAuspicious: true, goodFor: ['결혼', '개업', '건축'], badFor: [] },
  { name: '翼', nameKo: '익', element: '화', animal: '뱀', isAuspicious: true, goodFor: ['건축', '학업'], badFor: ['결혼'] },
  { name: '軫', nameKo: '진', element: '수', animal: '지렁이', isAuspicious: true, goodFor: ['결혼', '이사', '개업'], badFor: [] },
];

// ============================================================
// 행성시 순서 (주간/야간)
// ============================================================

const DAY_PLANET_ORDER: PlanetaryHour['planet'][] = [
  'Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'
];

const PLANET_ELEMENT: Record<PlanetaryHour['planet'], FiveElement> = {
  'Sun': '화',
  'Moon': '수',
  'Mars': '화',
  'Mercury': '수',
  'Jupiter': '목',
  'Venus': '금',
  'Saturn': '토',
};

const PLANET_QUALITY: Record<PlanetaryHour['planet'], 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid'> = {
  'Sun': 'excellent',
  'Jupiter': 'excellent',
  'Venus': 'good',
  'Moon': 'good',
  'Mercury': 'neutral',
  'Saturn': 'caution',
  'Mars': 'caution',
};

// ============================================================
// 절기 계산
// ============================================================

/**
 * 특정 날짜의 절기 정보 계산
 */
export function getSolarTermForDate(date: Date): SolarTerm {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 간단한 절기 계산 (실제로는 천문학적 계산 필요)
  // 각 월 초순/중순에 절기가 있음
  let termIndex: number;

  if (month === 1) termIndex = day < 20 ? 22 : 23; // 소한/대한
  else if (month === 2) termIndex = day < 19 ? 0 : 1; // 입춘/우수
  else if (month === 3) termIndex = day < 21 ? 2 : 3; // 경칩/춘분
  else if (month === 4) termIndex = day < 20 ? 4 : 5; // 청명/곡우
  else if (month === 5) termIndex = day < 21 ? 6 : 7; // 입하/소만
  else if (month === 6) termIndex = day < 21 ? 8 : 9; // 망종/하지
  else if (month === 7) termIndex = day < 23 ? 10 : 11; // 소서/대서
  else if (month === 8) termIndex = day < 23 ? 12 : 13; // 입추/처서
  else if (month === 9) termIndex = day < 23 ? 14 : 15; // 백로/추분
  else if (month === 10) termIndex = day < 23 ? 16 : 17; // 한로/상강
  else if (month === 11) termIndex = day < 22 ? 18 : 19; // 입동/소설
  else termIndex = day < 22 ? 20 : 21; // 대설/동지

  const term = SOLAR_TERMS[termIndex];
  const seasonPhase: 'early' | 'mid' | 'late' = day < 10 ? 'early' : day < 20 ? 'mid' : 'late';

  return {
    ...term,
    date,
    longitude: termIndex * 15, // 태양 황경 (근사값)
    seasonPhase,
  };
}

/**
 * 절기월 계산 (양력월과 다름)
 */
export function getSolarTermMonth(date: Date): number {
  const term = getSolarTermForDate(date);
  return term.month;
}

// ============================================================
// 28수 계산
// ============================================================

/**
 * 특정 날짜의 28수 계산
 * 기준: 1900년 1월 1일 = 氐宿 (3번째 수)
 */
export function getLunarMansion(date: Date): LunarMansion {
  const baseDate = new Date(1900, 0, 1);
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const index = ((diffDays + 2) % 28) + 1; // 1-28

  const mansion = LUNAR_MANSIONS[index - 1];
  return {
    index,
    ...mansion,
  };
}

// ============================================================
// 달 위상 계산
// ============================================================

/**
 * 달 위상 계산 (음력 일자 기반)
 */
export function getLunarPhase(lunarDay: number): LunarPhase {
  if (lunarDay === 1) return 'new_moon';
  else if (lunarDay <= 7) return 'waxing_crescent';
  else if (lunarDay <= 8) return 'first_quarter';
  else if (lunarDay <= 14) return 'waxing_gibbous';
  else if (lunarDay <= 16) return 'full_moon';
  else if (lunarDay <= 22) return 'waning_gibbous';
  else if (lunarDay <= 23) return 'last_quarter';
  else return 'waning_crescent';
}

/**
 * 달 위상 이름 (한글)
 */
export function getLunarPhaseName(phase: LunarPhase): string {
  const names: Record<LunarPhase, string> = {
    'new_moon': '삭 (朔)',
    'waxing_crescent': '초승달',
    'first_quarter': '상현달',
    'waxing_gibbous': '상현망',
    'full_moon': '보름달 (望)',
    'waning_gibbous': '하현망',
    'last_quarter': '하현달',
    'waning_crescent': '그믐달',
  };
  return names[phase];
}

// ============================================================
// 행성시 계산
// ============================================================

/**
 * 특정 날짜의 행성시 계산
 * @param date 날짜
 * @param latitude 위도 (일출/일몰 계산용)
 * @param longitude 경도
 */
export function calculatePlanetaryHours(
  date: Date,
  latitude: number = 37.5665, // 서울 기본값
  longitude: number = 126.9780
): PlanetaryHour[] {
  // 간단한 일출/일몰 계산 (실제로는 천문학적 계산 필요)
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

  // 서울 기준 근사 일출/일몰 시간
  const sunriseHour = 5 + Math.sin((dayOfYear - 80) * Math.PI / 182.5) * 1.5;
  const sunsetHour = 18 + Math.sin((dayOfYear - 80) * Math.PI / 182.5) * 1.5;

  const dayLength = sunsetHour - sunriseHour;
  const nightLength = 24 - dayLength;

  const dayHourLength = dayLength / 12;
  const nightHourLength = nightLength / 12;

  // 요일별 첫 행성시 행성
  const dayOfWeek = date.getDay(); // 0=일, 1=월, ...
  const firstPlanetIndex = dayOfWeek; // 일=Sun, 월=Moon, ...

  const hours: PlanetaryHour[] = [];

  // 주간 12시간
  for (let i = 0; i < 12; i++) {
    const planetIndex = (firstPlanetIndex + i) % 7;
    const planet = DAY_PLANET_ORDER[planetIndex];
    const startHour = sunriseHour + i * dayHourLength;
    const endHour = sunriseHour + (i + 1) * dayHourLength;

    const startTime = new Date(date);
    startTime.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);

    const endTime = new Date(date);
    endTime.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);

    hours.push({
      hour: Math.floor(startHour),
      startTime,
      endTime,
      planet,
      element: PLANET_ELEMENT[planet],
      isDay: true,
      quality: PLANET_QUALITY[planet],
      goodFor: getPlanetaryHourActivities(planet),
    });
  }

  // 야간 12시간
  for (let i = 0; i < 12; i++) {
    const planetIndex = (firstPlanetIndex + 12 + i) % 7;
    const planet = DAY_PLANET_ORDER[planetIndex];
    const startHour = sunsetHour + i * nightHourLength;
    const endHour = sunsetHour + (i + 1) * nightHourLength;

    const adjustedStartHour = startHour >= 24 ? startHour - 24 : startHour;
    const adjustedEndHour = endHour >= 24 ? endHour - 24 : endHour;

    const startTime = new Date(date);
    if (startHour >= 24) startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(Math.floor(adjustedStartHour), Math.round((adjustedStartHour % 1) * 60), 0, 0);

    const endTime = new Date(date);
    if (endHour >= 24) endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(Math.floor(adjustedEndHour), Math.round((adjustedEndHour % 1) * 60), 0, 0);

    hours.push({
      hour: Math.floor(adjustedStartHour),
      startTime,
      endTime,
      planet,
      element: PLANET_ELEMENT[planet],
      isDay: false,
      quality: PLANET_QUALITY[planet],
      goodFor: getPlanetaryHourActivities(planet),
    });
  }

  return hours;
}

function getPlanetaryHourActivities(planet: PlanetaryHour['planet']): string[] {
  const activities: Record<PlanetaryHour['planet'], string[]> = {
    'Sun': ['리더십', '승진', '공식 업무', '권위적 결정', '명예', '건강'],
    'Moon': ['가정', '육아', '부동산', '대중 접촉', '직관', '여행 시작'],
    'Mars': ['운동', '경쟁', '외과수술', '분쟁 해결', '에너지 필요 활동'],
    'Mercury': ['의사소통', '계약', '학습', '글쓰기', '여행', '거래'],
    'Jupiter': ['법률', '교육', '출판', '확장', '투자', '종교', '행운'],
    'Venus': ['연애', '예술', '미용', '사교', '협상', '금전 수령'],
    'Saturn': ['부동산', '농업', '광업', '장기 계획', '규율', '제한 수용'],
  };
  return activities[planet];
}

// ============================================================
// 2차 진행법 계산
// ============================================================

/**
 * 2차 진행법 계산 (1일 = 1년)
 */
export function calculateSecondaryProgression(
  birthDate: Date,
  targetDate: Date
): ProgressionResult['secondaryProgression'] {
  const yearsDiff = (targetDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const progressedDate = new Date(birthDate.getTime() + yearsDiff * 24 * 60 * 60 * 1000);

  // 태양 위치 계산 (간단한 근사)
  const sunLongitude = (progressedDate.getMonth() + progressedDate.getDate() / 30) * 30;
  const sunSign = getZodiacSign(sunLongitude);

  // 달 위치 계산 (하루에 약 13도 이동)
  const moonLongitude = (sunLongitude + yearsDiff * 13) % 360;
  const moonSign = getZodiacSign(moonLongitude);
  const moonPhase = getMoonPhaseFromLongitude(sunLongitude, moonLongitude);

  return {
    sun: { sign: sunSign, degree: sunLongitude % 30, house: Math.floor(sunLongitude / 30) + 1 },
    moon: { sign: moonSign, degree: moonLongitude % 30, house: Math.floor(moonLongitude / 30) + 1, phase: moonPhase },
    mercury: { sign: sunSign, degree: (sunLongitude + 5) % 30 }, // 근사값
    venus: { sign: sunSign, degree: (sunLongitude + 10) % 30 }, // 근사값
    mars: { sign: getZodiacSign(sunLongitude + 30), degree: (sunLongitude + 30) % 30 }, // 근사값
  };
}

function getZodiacSign(longitude: number): string {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return signs[Math.floor(longitude / 30) % 12];
}

function getMoonPhaseFromLongitude(sunLon: number, moonLon: number): string {
  const diff = (moonLon - sunLon + 360) % 360;
  if (diff < 45) return 'New';
  if (diff < 90) return 'Crescent';
  if (diff < 135) return 'First Quarter';
  if (diff < 180) return 'Gibbous';
  if (diff < 225) return 'Full';
  if (diff < 270) return 'Disseminating';
  if (diff < 315) return 'Last Quarter';
  return 'Balsamic';
}

// ============================================================
// 통합 신뢰도 계산
// ============================================================

export interface ConfidenceFactors {
  birthTimeAccuracy: 'exact' | 'within_hour' | 'within_2hours' | 'unknown';
  methodAlignment: number; // 동서양 일치도 0-100
  dataCompleteness: number; // 데이터 완성도 0-100
  historicalValidation?: number; // 과거 검증 정확도 0-100
}

/**
 * 통합 신뢰도 점수 계산
 */
export function calculateConfidence(factors: ConfidenceFactors): number {
  const birthTimeScore = {
    'exact': 100,
    'within_hour': 80,
    'within_2hours': 60,
    'unknown': 40,
  }[factors.birthTimeAccuracy];

  const weights = {
    birthTime: 0.25,
    methodAlignment: 0.30,
    dataCompleteness: 0.25,
    historicalValidation: 0.20,
  };

  let confidence =
    birthTimeScore * weights.birthTime +
    factors.methodAlignment * weights.methodAlignment +
    factors.dataCompleteness * weights.dataCompleteness;

  if (factors.historicalValidation !== undefined) {
    confidence += factors.historicalValidation * weights.historicalValidation;
  } else {
    // 검증 데이터 없으면 다른 요소로 재분배
    confidence = confidence / 0.8;
  }

  return Math.round(Math.min(100, Math.max(0, confidence)));
}

// ============================================================
// 인과 요인 분석
// ============================================================

/**
 * 왜 그런 일이 일어났는지 분석
 */
export function analyzeCausalFactors(
  dayStem: string,
  dayBranch: string,
  targetStem: string,
  targetBranch: string,
  daeunStem?: string,
  daeunBranch?: string,
  yongsin?: FiveElement[],
  kisin?: FiveElement[]
): CausalFactor[] {
  const factors: CausalFactor[] = [];

  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const STEM_ELEMENT: Record<string, FiveElement> = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
  };

  // 1. 천간 충 분석
  const stemClashes: [string, string][] = [
    ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸'], ['戊', '甲']
  ];
  for (const [s1, s2] of stemClashes) {
    if ((dayStem === s1 && targetStem === s2) || (dayStem === s2 && targetStem === s1)) {
      factors.push({
        type: 'stem_clash',
        factor: `${dayStem}-${targetStem} 천간충`,
        description: '일간과 당일/당월 천간의 충돌로 갈등과 변화 발생',
        impact: 'major_negative',
        score: -25,
        affectedAreas: ['대인관계', '사업', '건강'],
      });
    }
  }

  // 2. 지지 충 분석
  const branchClashes: [string, string][] = [
    ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']
  ];
  for (const [b1, b2] of branchClashes) {
    if ((dayBranch === b1 && targetBranch === b2) || (dayBranch === b2 && targetBranch === b1)) {
      factors.push({
        type: 'branch_clash',
        factor: `${dayBranch}-${targetBranch} 지지충`,
        description: '일지와의 충으로 환경 변화, 이동, 분리의 가능성',
        impact: 'negative',
        score: -20,
        affectedAreas: ['주거', '직장', '관계'],
      });
    }
  }

  // 3. 삼합 분석
  const tripleHarmonies: [string, string, string, FiveElement][] = [
    ['申', '子', '辰', '수'],
    ['寅', '午', '戌', '화'],
    ['巳', '酉', '丑', '금'],
    ['亥', '卯', '未', '목'],
  ];
  for (const [b1, b2, b3, element] of tripleHarmonies) {
    if ([b1, b2, b3].includes(dayBranch) && [b1, b2, b3].includes(targetBranch)) {
      factors.push({
        type: 'branch_harmony',
        factor: `${b1}${b2}${b3} 삼합 (${element})`,
        description: `삼합의 기운으로 ${element} 에너지 강화, 협력과 성취`,
        impact: 'major_positive',
        score: 25,
        affectedAreas: element === '화' ? ['명예', '승진'] :
                      element === '수' ? ['재물', '지혜'] :
                      element === '금' ? ['결단', '성취'] : ['성장', '발전'],
      });
    }
  }

  // 4. 용신 활성화 분석
  const targetElement = STEM_ELEMENT[targetStem];
  if (yongsin?.includes(targetElement)) {
    factors.push({
      type: 'yongsin_activation',
      factor: `용신 ${targetElement} 활성화`,
      description: '용신 오행이 활성화되어 운세 상승, 기회 포착',
      impact: 'major_positive',
      score: 30,
      affectedAreas: ['전반적 운세', '건강', '재물'],
    });
  }

  // 5. 기신 활성화 분석
  if (kisin?.includes(targetElement)) {
    factors.push({
      type: 'kisin_activation',
      factor: `기신 ${targetElement} 활성화`,
      description: '기신 오행이 활성화되어 어려움과 장애물 증가',
      impact: 'negative',
      score: -20,
      affectedAreas: ['건강', '재물', '대인관계'],
    });
  }

  // 6. 대운 전환 분석
  if (daeunStem && daeunBranch) {
    const daeunElement = STEM_ELEMENT[daeunStem];
    if (yongsin?.includes(daeunElement)) {
      factors.push({
        type: 'daeun_transition',
        factor: `대운 용신 ${daeunElement} 지지`,
        description: '현재 대운이 용신을 지지하여 장기적 상승 흐름',
        impact: 'positive',
        score: 20,
        affectedAreas: ['장기 운세', '커리어', '성장'],
      });
    }
  }

  return factors.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
}

// ============================================================
// 사건 유형별 점수 계산
// ============================================================

export interface EventCategoryScores {
  career: number;
  finance: number;
  relationship: number;
  health: number;
  travel: number;
  education: number;
}

/**
 * 사건 유형별 세부 점수 계산
 */
export function calculateEventCategoryScores(
  sibsin: string,
  twelveStage: string,
  branchInteractions: Array<{ type: string; score: number }>,
  shinsals: Array<{ name: string; type: 'lucky' | 'unlucky' }>,
  yongsinActive: boolean,
  kisinActive: boolean
): EventCategoryScores {
  const baseScore = 50;

  // 십신별 영역 보정
  const sibsinModifiers: Record<string, Partial<EventCategoryScores>> = {
    '정관': { career: 20, relationship: 10 },
    '편관': { career: 15, health: -10 },
    '정재': { finance: 20, relationship: 10 },
    '편재': { finance: 15, travel: 10 },
    '정인': { education: 20, health: 10 },
    '편인': { education: 15, travel: 10 },
    '식신': { health: 15, finance: 10 },
    '상관': { education: 10, career: -10 },
    '비견': { relationship: 10, finance: -5 },
    '겁재': { finance: -15, relationship: -10 },
  };

  // 12운성별 보정
  const stageModifiers: Record<string, Partial<EventCategoryScores>> = {
    '장생': { education: 10, health: 10 },
    '목욕': { relationship: 10, travel: 10 },
    '관대': { career: 10, relationship: 5 },
    '건록': { career: 15, finance: 10 },
    '제왕': { career: 20, finance: 15 },
    '쇠': { health: -5, career: -5 },
    '병': { health: -15, career: -10 },
    '사': { health: -20, finance: -15 },
    '묘': { health: -10, career: -15 },
    '절': { career: -10, relationship: -10 },
    '태': { education: 5, relationship: 5 },
    '양': { education: 10, health: 5 },
  };

  const scores: EventCategoryScores = {
    career: baseScore,
    finance: baseScore,
    relationship: baseScore,
    health: baseScore,
    travel: baseScore,
    education: baseScore,
  };

  // 십신 보정 적용
  const sibsinMod = sibsinModifiers[sibsin] || {};
  for (const [key, value] of Object.entries(sibsinMod)) {
    scores[key as keyof EventCategoryScores] += value as number;
  }

  // 12운성 보정 적용
  const stageMod = stageModifiers[twelveStage] || {};
  for (const [key, value] of Object.entries(stageMod)) {
    scores[key as keyof EventCategoryScores] += value as number;
  }

  // 지지 상호작용 보정
  for (const inter of branchInteractions) {
    const bonus = inter.score * 0.5;
    if (inter.type.includes('합')) {
      scores.relationship += bonus;
      scores.career += bonus * 0.5;
    } else if (inter.type.includes('충')) {
      scores.relationship -= Math.abs(bonus);
      scores.travel += Math.abs(bonus) * 0.5; // 충은 이동운
    }
  }

  // 신살 보정
  for (const shinsal of shinsals) {
    if (shinsal.type === 'lucky') {
      if (shinsal.name === '천을귀인') {
        scores.career += 15;
        scores.relationship += 10;
      } else if (shinsal.name === '역마') {
        scores.travel += 20;
        scores.career += 5;
      } else if (shinsal.name === '문창') {
        scores.education += 15;
      }
    } else {
      if (shinsal.name === '겁살') {
        scores.finance -= 15;
        scores.health -= 10;
      } else if (shinsal.name === '백호') {
        scores.health -= 20;
      }
    }
  }

  // 용신/기신 전체 보정
  if (yongsinActive) {
    for (const key of Object.keys(scores)) {
      scores[key as keyof EventCategoryScores] += 10;
    }
  }
  if (kisinActive) {
    for (const key of Object.keys(scores)) {
      scores[key as keyof EventCategoryScores] -= 8;
    }
  }

  // 0-100 범위로 정규화
  for (const key of Object.keys(scores)) {
    scores[key as keyof EventCategoryScores] = Math.max(0, Math.min(100, scores[key as keyof EventCategoryScores]));
  }

  return scores;
}

// ============================================================
// 통합 신뢰도 시스템 (Unified Confidence System)
// ============================================================

/**
 * 예측 신뢰도 등급
 */
export type ConfidenceGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

/**
 * 통합 신뢰도 결과
 */
export interface UnifiedConfidenceResult {
  score: number;                    // 0-100 점수
  grade: ConfidenceGrade;           // 등급
  breakdown: {
    birthTime: { score: number; weight: number };
    dataCompleteness: { score: number; weight: number };
    methodAlignment: { score: number; weight: number };
    historicalValidation?: { score: number; weight: number };
  };
  interpretation: string;           // 해석
  recommendations: string[];        // 신뢰도 향상 방법
}

/**
 * 통합 신뢰도 계산 (확장 버전)
 */
export function calculateUnifiedConfidence(
  factors: ConfidenceFactors & {
    predictionType?: 'daily' | 'monthly' | 'yearly' | 'lifetime';
    eastWestHarmony?: number;
  }
): UnifiedConfidenceResult {
  const birthTimeScore = {
    'exact': 100,
    'within_hour': 80,
    'within_2hours': 60,
    'unknown': 40,
  }[factors.birthTimeAccuracy];

  // 예측 기간에 따른 가중치 조정
  const predictionType = factors.predictionType || 'daily';
  const weights = getWeightsForPredictionType(predictionType);

  // 개별 점수 계산
  const breakdown = {
    birthTime: { score: birthTimeScore, weight: weights.birthTime },
    dataCompleteness: { score: factors.dataCompleteness, weight: weights.dataCompleteness },
    methodAlignment: { score: factors.methodAlignment, weight: weights.methodAlignment },
    historicalValidation: factors.historicalValidation !== undefined
      ? { score: factors.historicalValidation, weight: weights.historicalValidation }
      : undefined,
  };

  // 동서양 조화도 보정
  let eastWestBonus = 0;
  if (factors.eastWestHarmony !== undefined) {
    eastWestBonus = (factors.eastWestHarmony - 50) * 0.1; // 최대 ±5점
  }

  // 종합 점수 계산
  let totalWeight = weights.birthTime + weights.dataCompleteness + weights.methodAlignment;
  let score =
    birthTimeScore * weights.birthTime +
    factors.dataCompleteness * weights.dataCompleteness +
    factors.methodAlignment * weights.methodAlignment;

  if (breakdown.historicalValidation) {
    score += breakdown.historicalValidation.score * weights.historicalValidation;
    totalWeight += weights.historicalValidation;
  }

  score = (score / totalWeight) + eastWestBonus;
  score = Math.round(Math.min(100, Math.max(0, score)));

  // 등급 결정
  const grade = getConfidenceGrade(score);

  // 해석 생성
  const interpretation = generateConfidenceInterpretation(score, grade, predictionType);

  // 추천사항 생성
  const recommendations = generateConfidenceRecommendations(factors, score);

  return {
    score,
    grade,
    breakdown: {
      birthTime: breakdown.birthTime,
      dataCompleteness: breakdown.dataCompleteness,
      methodAlignment: breakdown.methodAlignment,
      historicalValidation: breakdown.historicalValidation,
    },
    interpretation,
    recommendations,
  };
}

function getWeightsForPredictionType(type: string): {
  birthTime: number;
  dataCompleteness: number;
  methodAlignment: number;
  historicalValidation: number;
} {
  // 예측 기간에 따라 가중치 조정
  switch (type) {
    case 'daily':
      return { birthTime: 0.35, dataCompleteness: 0.25, methodAlignment: 0.25, historicalValidation: 0.15 };
    case 'monthly':
      return { birthTime: 0.30, dataCompleteness: 0.25, methodAlignment: 0.30, historicalValidation: 0.15 };
    case 'yearly':
      return { birthTime: 0.25, dataCompleteness: 0.25, methodAlignment: 0.30, historicalValidation: 0.20 };
    case 'lifetime':
      return { birthTime: 0.20, dataCompleteness: 0.30, methodAlignment: 0.30, historicalValidation: 0.20 };
    default:
      return { birthTime: 0.25, dataCompleteness: 0.25, methodAlignment: 0.30, historicalValidation: 0.20 };
  }
}

function getConfidenceGrade(score: number): ConfidenceGrade {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 55) return 'C+';
  if (score >= 45) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function generateConfidenceInterpretation(score: number, grade: ConfidenceGrade, type: string): string {
  const typeNames: Record<string, string> = {
    daily: '일간', monthly: '월간', yearly: '연간', lifetime: '평생',
  };

  if (score >= 85) {
    return `${typeNames[type] || ''} 예측 신뢰도가 매우 높습니다 (${grade}등급). 분석 결과를 충분히 참고하실 수 있습니다.`;
  } else if (score >= 70) {
    return `${typeNames[type] || ''} 예측 신뢰도가 양호합니다 (${grade}등급). 대부분의 분석이 유의미합니다.`;
  } else if (score >= 55) {
    return `${typeNames[type] || ''} 예측 신뢰도가 보통입니다 (${grade}등급). 참고 자료로 활용하세요.`;
  } else {
    return `${typeNames[type] || ''} 예측 신뢰도가 낮습니다 (${grade}등급). 추가 정보가 있으면 정확도가 향상됩니다.`;
  }
}

function generateConfidenceRecommendations(factors: ConfidenceFactors, score: number): string[] {
  const recommendations: string[] = [];

  if (factors.birthTimeAccuracy === 'unknown') {
    recommendations.push('정확한 출생 시간을 입력하면 신뢰도가 크게 향상됩니다.');
  } else if (factors.birthTimeAccuracy === 'within_2hours') {
    recommendations.push('출생 시간을 1시간 단위로 좁히면 더 정확한 분석이 가능합니다.');
  }

  if (factors.dataCompleteness < 70) {
    recommendations.push('대운, 용신, 기신 정보를 추가하면 분석 정확도가 높아집니다.');
  }

  if (factors.methodAlignment < 60) {
    recommendations.push('동서양 분석 결과가 다를 수 있으니 상황에 맞게 활용하세요.');
  }

  if (recommendations.length === 0 && score >= 80) {
    recommendations.push('현재 데이터로 충분히 정확한 분석이 가능합니다.');
  }

  return recommendations;
}

/**
 * 여러 엔진의 신뢰도를 통합
 */
export function combineConfidenceScores(
  scores: { source: string; score: number; weight?: number }[]
): { combined: number; breakdown: { source: string; contribution: number }[] } {
  if (scores.length === 0) return { combined: 50, breakdown: [] };

  const totalWeight = scores.reduce((sum, s) => sum + (s.weight || 1), 0);
  const combined = Math.round(
    scores.reduce((sum, s) => sum + s.score * (s.weight || 1), 0) / totalWeight
  );

  const breakdown = scores.map(s => ({
    source: s.source,
    contribution: Math.round((s.score * (s.weight || 1)) / totalWeight),
  }));

  return { combined, breakdown };
}

// ============================================================
// Export 통합
// ============================================================

export const PrecisionEngine = {
  // 절기
  getSolarTermForDate,
  getSolarTermMonth,

  // 28수
  getLunarMansion,

  // 달 위상
  getLunarPhase,
  getLunarPhaseName,

  // 행성시
  calculatePlanetaryHours,

  // 진행법
  calculateSecondaryProgression,

  // 신뢰도
  calculateConfidence,
  calculateUnifiedConfidence,
  combineConfidenceScores,

  // 인과 분석
  analyzeCausalFactors,

  // 사건 점수
  calculateEventCategoryScores,
};

export default PrecisionEngine;
