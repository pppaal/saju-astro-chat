/**
 * AI-Based Life Recommendation System
 * 사주 + 점성학 + 타로 기반 종합 라이프 추천
 */

import { logger } from "@/lib/logger";

export interface UserProfile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:MM
  city?: string;
  latitude?: number;
  longitude?: number;
  gender?: "male" | "female";

  // 사주 데이터
  saju?: {
    year: string;  // 년주 (예: 庚午)
    month: string; // 월주
    day: string;   // 일주
    hour?: string; // 시주
    elements: {    // 오행 분포
      wood: number;
      fire: number;
      earth: number;
      metal: number;
      water: number;
    };
    heavenlyStem: string; // 천간
    earthlyBranch: string; // 지지
  };

  // 점성학 데이터
  astrology?: {
    sunSign: string;    // 태양 별자리
    moonSign?: string;  // 달 별자리
    rising?: string;    // 상승 별자리
    venus?: string;     // 금성 (연애)
    mars?: string;      // 화성 (에너지)
    jupiter?: string;   // 목성 (행운)
    saturn?: string;    // 토성 (과제)
    houses: {           // 하우스 배치
      h1?: string;      // 1하우스 (자아)
      h2?: string;      // 2하우스 (재물)
      h6?: string;      // 6하우스 (건강/일상)
      h7?: string;      // 7하우스 (관계)
      h10?: string;     // 10하우스 (직업)
    };
  };

  // 최근 타로 결과
  tarot?: {
    cards: string[];
    theme: string;
    date: number;
  };

  // 현재 상황
  currentSituation?: {
    occupation?: string;
    income?: number;
    relationshipStatus?: "single" | "dating" | "married";
    healthIssues?: string[];
    goals?: string[];
  };
}

export interface LifeRecommendation {
  career: CareerRecommendation;
  love: LoveRecommendation;
  fitness: FitnessRecommendation;
  health: HealthRecommendation;
  wealth: WealthRecommendation;
  lifestyle: LifestyleRecommendation;
}

export interface CareerRecommendation {
  recommendedFields: Array<{
    field: string;
    reason: string;
    successRate: number; // 0-100
    timeframe: string;
  }>;
  strengths: string[];
  warnings: string[];
  actionSteps: Array<{
    step: string;
    priority: "high" | "medium" | "low";
    deadline?: string;
  }>;
}

export interface LoveRecommendation {
  idealMatches: Array<{
    sign: string;
    compatibility: number; // 0-100
    reason: string;
  }>;
  avoidSigns: Array<{
    sign: string;
    reason: string;
  }>;
  bestTimePeriod: {
    start: string;
    end: string;
    reason: string;
  };
  meetingPlaces: string[];
  datingTips: string[];
}

export interface FitnessRecommendation {
  recommendedExercises: Array<{
    exercise: string;
    reason: string;
    frequency: string;
    intensity: "low" | "medium" | "high";
  }>;
  bestTimeOfDay: string;
  targetGoal: string;
  avoidActivities: string[];
}

export interface HealthRecommendation {
  vulnerableAreas: Array<{
    area: string;
    severity: "low" | "medium" | "high";
    prevention: string;
  }>;
  dietRecommendations: {
    recommended: string[];
    avoid: string[];
    supplements?: string[];
  };
  sleepSchedule: {
    bedtime: string;
    wakeup: string;
    reason: string;
  };
  mentalHealth: {
    stressManagement: string[];
    mindfulnessPractices: string[];
  };
}

export interface WealthRecommendation {
  currentAnalysis: {
    assets: number;
    projectedGrowth: number;
    timeframe: string;
  };
  investmentStrategy: {
    conservative: { percentage: number; options: string[] };
    moderate: { percentage: number; options: string[] };
    aggressive: { percentage: number; options: string[] };
  };
  incomeStreams: Array<{
    source: string;
    potentialIncome: string;
    effort: "low" | "medium" | "high";
    timeline: string;
  }>;
  luckyPeriods: Array<{
    start: string;
    end: string;
    focus: string;
  }>;
  warnings: string[];
}

export interface LifestyleRecommendation {
  idealLocation: {
    cities: string[];
    reason: string;
    climate: string;
  };
  hobbies: string[];
  travel: {
    destinations: string[];
    bestTimes: string[];
    travelStyle: string;
  };
  socialLife: {
    idealGroupSize: string;
    activities: string[];
    networkingTips: string[];
  };
  dailyRoutine: {
    morning: string[];
    afternoon: string[];
    evening: string[];
  };
}

/**
 * AI 기반 종합 라이프 추천 생성
 */
export async function generateLifeRecommendations(
  profile: UserProfile
): Promise<LifeRecommendation> {
  const apiUrl = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";

  try {
    const response = await fetch(`${apiUrl}/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.recommendations;
  } catch (error) {
    logger.error("Error generating recommendations:", error);

    // Fallback: Generate mock recommendations
    return generateMockRecommendations(profile);
  }
}

/**
 * Mock 추천 생성 (백엔드 없을 때)
 */
function generateMockRecommendations(profile: UserProfile): LifeRecommendation {
  const elements = profile.saju?.elements;
  const sunSign = profile.astrology?.sunSign || "Aries";
  const dominantElement = elements
    ? Object.entries(elements).sort(([,a], [,b]) => b - a)[0][0]
    : "fire";

  return {
    career: {
      recommendedFields: [
        {
          field: dominantElement === "fire" ? "창업/스타트업" : "금융/투자",
          reason: `${dominantElement} 기운이 강해 ${dominantElement === "fire" ? "열정과 추진력" : "분석력과 안정성"}이 뛰어남`,
          successRate: 85,
          timeframe: "6-12개월",
        },
        {
          field: sunSign === "Aries" ? "IT/테크" : "크리에이티브",
          reason: `${sunSign}의 특성상 혁신적이고 독립적인 업무 환경 적합`,
          successRate: 78,
          timeframe: "12-18개월",
        },
      ],
      strengths: [
        "리더십과 결단력",
        "창의적 문제 해결 능력",
        "높은 추진력과 실행력",
      ],
      warnings: [
        "단기적 성과에 집착하지 말 것",
        "팀워크와 협업 역량 개발 필요",
      ],
      actionSteps: [
        {
          step: "6개월 내 사이드 프로젝트 시작",
          priority: "high",
          deadline: "2025-06-01",
        },
        {
          step: "관련 분야 네트워킹 강화",
          priority: "high",
        },
        {
          step: "온라인 강의/컨설팅 준비",
          priority: "medium",
        },
      ],
    },

    love: {
      idealMatches: [
        {
          sign: "Leo",
          compatibility: 92,
          reason: "불의 기운이 조화를 이루며 서로의 열정을 증폭시킴",
        },
        {
          sign: "Sagittarius",
          compatibility: 88,
          reason: "모험심과 자유로운 성향이 잘 맞음",
        },
        {
          sign: "Gemini",
          compatibility: 81,
          reason: "지적 교류와 커뮤니케이션이 원활함",
        },
      ],
      avoidSigns: [
        {
          sign: "Cancer",
          reason: "감정적 소통 방식 차이로 갈등 가능성 높음",
        },
        {
          sign: "Capricorn",
          reason: "가치관과 라이프스타일 차이",
        },
      ],
      bestTimePeriod: {
        start: "2025-07-01",
        end: "2025-09-30",
        reason: "목성의 행운기, 금성의 긍정적 배치",
      },
      meetingPlaces: [
        "스포츠 동호회 (테니스, 등산)",
        "크리에이티브 워크샵",
        "음악 페스티벌",
        "해외 여행",
      ],
      datingTips: [
        "솔직하고 직설적인 커뮤니케이션",
        "액티브한 데이트 활동 선호",
        "개인 공간 존중 필수",
      ],
    },

    fitness: {
      recommendedExercises: [
        {
          exercise: "복싱/킥복싱",
          reason: "화 기운을 건강하게 발산",
          frequency: "주 3-4회",
          intensity: "high",
        },
        {
          exercise: "암벽등반",
          reason: "도전 정신과 집중력 향상",
          frequency: "주 2회",
          intensity: "high",
        },
        {
          exercise: "요가",
          reason: "과도한 화 기운 조절",
          frequency: "주 2-3회",
          intensity: "low",
        },
      ],
      bestTimeOfDay: "오전 6-8시 (양기 상승 시간)",
      targetGoal: "근력+유산소 균형, 화 기운 조절",
      avoidActivities: [
        "과도한 고강도 운동 (부상 위험)",
        "늦은 밤 운동 (수면 방해)",
      ],
    },

    health: {
      vulnerableAreas: [
        {
          area: "심장/혈압",
          severity: "medium",
          prevention: "정기 검진, 스트레스 관리, 유산소 운동",
        },
        {
          area: "간 기능",
          severity: "low",
          prevention: "음주 절제, 11시 전 취침",
        },
      ],
      dietRecommendations: {
        recommended: [
          "녹색 채소 (케일, 시금치)",
          "견과류",
          "블루베리",
          "연어",
        ],
        avoid: [
          "과도한 붉은 고기",
          "가공식품",
          "과도한 카페인",
        ],
        supplements: ["오메가3", "비타민D", "마그네슘"],
      },
      sleepSchedule: {
        bedtime: "23:00",
        wakeup: "06:00",
        reason: "간 회복 시간 확보 (23:00-01:00)",
      },
      mentalHealth: {
        stressManagement: [
          "명상 (하루 10-15분)",
          "자연 속 산책",
          "창의적 활동 (그림, 음악)",
        ],
        mindfulnessPractices: [
          "아침 일기 작성",
          "감사 일기",
          "디지털 디톡스 (주 1회)",
        ],
      },
    },

    wealth: {
      currentAnalysis: {
        assets: profile.currentSituation?.income ? profile.currentSituation.income * 12 : 30000000,
        projectedGrowth: 3.5,
        timeframe: "3년",
      },
      investmentStrategy: {
        conservative: {
          percentage: 50,
          options: ["배당주", "채권", "예금"],
        },
        moderate: {
          percentage: 30,
          options: ["테크 주식", "ETF", "리츠"],
        },
        aggressive: {
          percentage: 20,
          options: ["성장주", "스타트업 투자", "암호화폐 (소액)"],
        },
      },
      incomeStreams: [
        {
          source: "온라인 강의/컨설팅",
          potentialIncome: "월 200-500만원",
          effort: "medium",
          timeline: "3-6개월",
        },
        {
          source: "사이드 프로젝트/앱",
          potentialIncome: "월 100-1000만원",
          effort: "high",
          timeline: "6-12개월",
        },
        {
          source: "투자 수익",
          potentialIncome: "월 50-200만원",
          effort: "low",
          timeline: "12-24개월",
        },
      ],
      luckyPeriods: [
        {
          start: "2025-05-01",
          end: "2025-07-31",
          focus: "새로운 프로젝트 시작, 투자",
        },
        {
          start: "2025-10-01",
          end: "2025-12-31",
          focus: "수익 실현, 재무 구조 조정",
        },
      ],
      warnings: [
        "충동적 투자 금물",
        "한 곳에 올인하지 말 것",
        "단기 차익보다 장기 성장 focus",
      ],
    },

    lifestyle: {
      idealLocation: {
        cities: ["강남", "판교", "성수", "해외: 싱가포르, 도쿄"],
        reason: "창의적이고 역동적인 환경, 불/화 에너지",
        climate: "온화하거나 따뜻한 기후",
      },
      hobbies: [
        "사진/영상 제작",
        "DJ/음악",
        "모터사이클",
        "서핑",
        "독서 (자기계발, 철학)",
      ],
      travel: {
        destinations: [
          "동남아 (태국, 발리) - 불 에너지 충전",
          "유럽 (스페인, 이탈리아) - 문화 체험",
          "미국 서부 (LA, 샌프란시스코) - 창업 영감",
        ],
        bestTimes: ["2025년 7-9월", "2026년 1-3월"],
        travelStyle: "액티브/모험 중심, 새로운 경험",
      },
      socialLife: {
        idealGroupSize: "소규모 (3-5명) 깊은 관계 선호",
        activities: [
          "크리에이티브 워크샵",
          "스타트업 밋업",
          "스포츠 동호회",
        ],
        networkingTips: [
          "온라인 커뮤니티 활동",
          "컨퍼런스 참석",
          "멘토링 관계 구축",
        ],
      },
      dailyRoutine: {
        morning: [
          "06:00 기상",
          "명상/스트레칭 15분",
          "고강도 운동 1시간",
          "샤워 + 건강한 아침",
        ],
        afternoon: [
          "집중 업무 (09:00-12:00)",
          "가벼운 산책 + 점심",
          "창의적 작업 (14:00-18:00)",
        ],
        evening: [
          "저녁 식사 (18:30)",
          "취미 활동/독서 (19:00-21:00)",
          "일기/회고 (21:30)",
          "23:00 취침",
        ],
      },
    },
  };
}
