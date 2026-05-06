export interface GeokgukInfo {
  name?: string;
  type?: string;
}

// SajuData와 별도로 정의 (확장이 아닌 독립 타입으로 캐스팅에 사용)
export interface SajuWithGeokguk {
  advancedAnalysis?: {
    geokguk?: GeokgukInfo;
  };
}

export interface CareerAnalysis {
  workStyle: string;
  strengths: string[];
  idealEnvironment: string;
  avoidEnvironment: string;
  growthTip?: string;
  suggestedFields: string[];
  publicImage?: string;
  careerPath?: string;
  currentPhase?: string;
  sibsinCareer?: string;
  leadershipStyle?: string;
  jupiterBlessings?: string;
  saturnMcAspect?: string;
  sunSaturnAspect?: string;
  // 새로 추가된 필드들
  overseasFortune?: string;
  wealthStyle?: string;
  successTiming?: string;
  wealthScore?: number;
  mcSign?: string;
  decisionStyle?: string;
  teamworkStyle?: string;
}
