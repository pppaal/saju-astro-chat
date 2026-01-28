// src/components/destiny-map/display/types.ts

export interface ImportantYear {
  year: number;
  age: number;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  sajuReason: string;
  astroReason: string;
  advice?: string;
}

export interface CategoryAnalysis {
  icon: string;
  title: string;
  sajuAnalysis: string;
  astroAnalysis: string;
  crossInsight: string;
  keywords?: string[];
  idealPartner?: string;
  timing?: string;
  suitableCareers?: string[];
  wealthType?: string;
  vulnerabilities?: string[];
  advice?: string;
}

export interface KeyInsight {
  type: "strength" | "opportunity" | "caution" | "advice";
  text: string;
  icon?: string;
}

export interface LuckyElements {
  colors?: string[];
  directions?: string[];
  numbers?: number[];
  items?: string[];
}

export interface ThemeSection {
  id: string;
  icon: string;
  title: string;
  titleEn: string;
  content: string;
}

export interface StructuredFortune {
  themeSummary?: string;
  sections?: ThemeSection[];
  lifeTimeline?: {
    description?: string;
    importantYears?: ImportantYear[];
  };
  categoryAnalysis?: Record<string, CategoryAnalysis>;
  keyInsights?: KeyInsight[];
  luckyElements?: LuckyElements;
  sajuHighlight?: { pillar: string; element: string; meaning: string };
  astroHighlight?: { planet: string; sign: string; meaning: string };
  crossHighlights?: { summary: string; points?: string[] };
}

export type LangKey = "en" | "ko" | "ja" | "zh" | "es";
export type ReportType = "core" | "timing" | "compat";
