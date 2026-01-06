// 탭 컴포넌트 공통 타입
export interface SajuData {
  dayMaster?: { name?: string; element?: string; heavenlyStem?: string };
  pillars?: {
    year?: { heavenlyStem?: string; earthlyBranch?: string };
    month?: { heavenlyStem?: string; earthlyBranch?: string };
    day?: { heavenlyStem?: string; earthlyBranch?: string };
    time?: { heavenlyStem?: string; earthlyBranch?: string };
  };
  fiveElements?: Record<string, number>;
  sinsal?: {
    luckyList?: Array<{ name: string }>;
    unluckyList?: Array<{ name: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AstroData {
  planets?: Array<{ name?: string; sign?: string; house?: number; longitude?: number }>;
  houses?: Array<{ index?: number; cusp?: number; sign?: string }>;
  aspects?: Array<{ from?: string; to?: string; type?: string; orb?: number }>;
  [key: string]: unknown;
}

export interface TabProps {
  saju?: SajuData;
  astro?: AstroData;
  lang: string;
  isKo: boolean;
  data: Record<string, unknown>;
  destinyNarrative?: Record<string, unknown>;
  combinedLifeTheme?: Record<string, unknown>;
}

// 탭 ID 타입
export type TabId = 'personality' | 'love' | 'career' | 'fortune' | 'health' | 'karma';

// 탭 정의 타입
export interface TabDefinition {
  id: TabId;
  label: string;
  emoji: string;
  desc: string;
}
