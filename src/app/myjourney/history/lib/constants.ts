/**
 * @file History page constants
 * Extracted from page.tsx for modularity
 */

import type { ServiceConfig } from './types';

// Service configuration with icons and colors (titles and descriptions from i18n)
export const SERVICE_CONFIG: Record<string, ServiceConfig> = {
  "daily-fortune": { icon: "🌟", titleKey: "history.services.dailyFortune.title", descKey: "history.services.dailyFortune.desc", color: "#fbbf24" },
  "destiny-map": { icon: "🗺️", titleKey: "history.services.destinyMap.title", descKey: "history.services.destinyMap.desc", color: "#8b5cf6" },
  "premium-reports": { icon: "🤖", titleKey: "history.services.aiReports.title", descKey: "history.services.aiReports.desc", color: "#06b6d4" },
  "destiny-calendar": { icon: "📅", titleKey: "history.services.destinyCalendar.title", descKey: "history.services.destinyCalendar.desc", color: "#10b981" },
  "life-prediction": { icon: "📈", titleKey: "history.services.lifePrediction.title", descKey: "history.services.lifePrediction.desc", color: "#a855f7" },
  "life-prediction-timing": { icon: "⏰", titleKey: "history.services.lifePredictionTiming.title", descKey: "history.services.lifePredictionTiming.desc", color: "#8b5cf6" },
  iching: { icon: "📜", titleKey: "history.services.iching.title", descKey: "history.services.iching.desc", color: "#6366f1" },
  tarot: { icon: "🔮", titleKey: "history.services.tarot.title", descKey: "history.services.tarot.desc", color: "#ec4899" },
  saju: { icon: "☯️", titleKey: "history.services.saju.title", descKey: "history.services.saju.desc", color: "#f97316" },
  astrology: { icon: "✨", titleKey: "history.services.astrology.title", descKey: "history.services.astrology.desc", color: "#06b6d4" },
  dream: { icon: "🌙", titleKey: "history.services.dream.title", descKey: "history.services.dream.desc", color: "#a855f7" },
  compatibility: { icon: "💕", titleKey: "history.services.compatibility.title", descKey: "history.services.compatibility.desc", color: "#f43f5e" },
  numerology: { icon: "🔢", titleKey: "history.services.numerology.title", descKey: "history.services.numerology.desc", color: "#14b8a6" },
  personality: { icon: "🌈", titleKey: "history.services.personality.title", descKey: "history.services.personality.desc", color: "#0ea5e9" },
  "personality-icp": { icon: "🎭", titleKey: "history.services.personalityIcp.title", descKey: "history.services.personalityIcp.desc", color: "#3b82f6" },
  "personality-compatibility": { icon: "💞", titleKey: "history.services.personalityCompatibility.title", descKey: "history.services.personalityCompatibility.desc", color: "#ec4899" },
  "past-life": { icon: "🔄", titleKey: "history.services.pastLife.title", descKey: "history.services.pastLife.desc", color: "#ff6e7f" },
  "destiny-pal": { icon: "🤝", titleKey: "history.services.destinyPal.title", descKey: "history.services.destinyPal.desc", color: "#8b5cf6" },
  "destiny-matrix": { icon: "🔷", titleKey: "history.services.destinyMatrix.title", descKey: "history.services.destinyMatrix.desc", color: "#6366f1" },
};

// Display settings
export const INITIAL_DISPLAY_COUNT = 5;

// All services to display (in order)
export const ALL_SERVICES_ORDER = [
  "destiny-map",
  "destiny-calendar",
  "life-prediction-timing",
  "tarot",
  "personality",
  "personality-icp",
  "personality-compatibility",
  "dream",
];
