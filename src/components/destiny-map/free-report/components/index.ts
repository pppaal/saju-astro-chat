// src/components/destiny-map/free-report/components/index.ts
// Component exports for FreeReport

export { default as PremiumReportCTA, type ReportSection } from "./PremiumReportCTA";

// Re-exports for the 11 cards that surface engine-generated data which
// previously wasn't rendered in the free report UI. Each card is silent
// (returns null) when its data slice is missing.
export { default as SajuComprehensiveScoreCard } from "../SajuComprehensiveScoreCard";
export { default as UltraAdvancedSajuCard } from "../UltraAdvancedSajuCard";
export { default as HealthCareerCard } from "../HealthCareerCard";
export { default as JohuYongsinCard } from "../JohuYongsinCard";
export { default as SinsalByPillarCard } from "../SinsalByPillarCard";
export { default as ProgressionsCard } from "../ProgressionsCard";
export { default as SolarLunarReturnCard } from "../SolarLunarReturnCard";
export { default as ElectionalCard } from "../ElectionalCard";
export { default as MidpointsCard } from "../MidpointsCard";
export { default as TransitsCard } from "../TransitsCard";
export { default as AspectsListCard } from "../AspectsListCard";
