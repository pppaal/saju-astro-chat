// 탭 컴포넌트 공통 타입
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SajuData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AstroData = any;

export interface TabProps {
  saju?: SajuData;
  astro?: AstroData;
  lang: string;
  isKo: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  destinyNarrative?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  combinedLifeTheme?: any;
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
