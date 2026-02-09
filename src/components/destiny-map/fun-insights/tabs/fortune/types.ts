// src/components/destiny-map/fun-insights/tabs/fortune/types.ts

export interface CurrentFlow {
  emoji: string;
  title: string;
  flow: string;
  advice: string;
}

export interface PlanetData {
  name?: string;
  sign?: string;
  house?: number;
}

export interface DaeunData {
  current?: boolean;
  isCurrent?: boolean;
  ganji?: string;
  name?: string;
  stem?: { name?: string };
  branch?: { name?: string };
  startAge?: number;
  age?: number;
}

export interface UnseAnnualData {
  year?: number;
  ganji?: string;
  stem?: { name?: string; element?: string };
  branch?: { name?: string };
  element?: string;
}

export interface UnseMonthlyData {
  month?: number;
  ganji?: string;
  stem?: { name?: string; element?: string };
  branch?: { name?: string };
  element?: string;
}

export interface UnseIljinData {
  day?: number;
  ganji?: string;
  stem?: { name?: string; element?: string };
  branch?: { name?: string };
  element?: string;
}

export interface SajuDataExtended {
  dayMaster?: { name?: string; element?: string; heavenlyStem?: string };
  pillars?: { day?: { heavenlyStem?: string | { name?: string } } };
  fourPillars?: { day?: { heavenlyStem?: string } };
  daeun?: DaeunData[];
  bigFortune?: DaeunData[];
  unse?: {
    annual?: UnseAnnualData[];
    monthly?: UnseMonthlyData[];
    iljin?: UnseIljinData[];
  };
}

export interface DayMasterTrait {
  trait: string;
  traitEn: string;
  strength: string;
  strengthEn: string;
  caution: string;
  cautionEn: string;
}

export interface DaeunStemInterpretation {
  ko: string;
  en: string;
  energy: string;
  energyEn: string;
}

export interface JupiterHouseDetail {
  ko: string;
  en: string;
  action: string;
  actionEn: string;
}

export interface SaturnHouseDetail {
  ko: string;
  en: string;
  lesson: string;
  lessonEn: string;
}

export interface YearFortune {
  year: number;
  ganji: string;
  element?: string;
  fortune: {
    theme: string;
    desc: string;
    advice: string;
    emoji: string;
  };
  relation: {
    relation: string;
    impact: string;
    focus: string;
    caution: string;
  };
}

export interface MonthFortune {
  month: number;
  monthName: string;
  ganji: string;
  element?: string;
  fortune: {
    theme: string;
    advice: string;
    emoji: string;
  };
  detail: {
    work: string;
    love: string;
    money: string;
    health: string;
  };
}

export interface TodayFortune {
  ganji: string;
  element?: string;
  fortune: {
    mood: string;
    tip: string;
    emoji: string;
    luckyTime: string;
  };
}

export type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export interface ActionPlanChecklist {
  element: ElementKey;
  focus: string;
  items: string[];
  timing?: string;
  caution?: string;
}

export interface FortuneActionPlan {
  today: ActionPlanChecklist;
  week: ActionPlanChecklist;
}

export interface DaeunRelation {
  relation: string;
  message: string;
  advice: string;
}
