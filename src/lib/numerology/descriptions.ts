// src/lib/numerology/descriptions.ts
// Human-readable texts for numerology readings. Logic untouched; strings cleaned to ASCII.
import { reduceToCore } from "./utils";

export type CoreKey = "lifePath" | "expression" | "soulUrge" | "personality" | "personalYear" | "personalMonth" | "personalDay";

const base: Record<number, { title: string; tagline: string; aura: string }> = {
  1: { title: "Leader / Pioneer", tagline: "Takes initiative, sets direction, moves first when others hesitate.", aura: "Decisive, self-driven, assertive" },
  2: { title: "Mediator / Partner", tagline: "Builds harmony, senses nuance, brings people to common ground.", aura: "Cooperative, diplomatic, steady" },
  3: { title: "Communicator / Creator", tagline: "Expressive and playful; translates ideas into uplifting stories.", aura: "Artistic, social, optimistic" },
  4: { title: "Builder / Steward", tagline: "Systematic and reliable; turns plans into consistent execution.", aura: "Grounded, methodical, dependable" },
  5: { title: "Explorer / Catalyst", tagline: "Thrives on change; brings momentum and adaptive thinking.", aura: "Adventurous, curious, flexible" },
  6: { title: "Guardian / Nurturer", tagline: "Protects and cares; creates warmth and responsibility for the group.", aura: "Caring, loyal, stabilizing" },
  7: { title: "Seeker / Analyst", tagline: "Looks beneath the surface; seeks depth, truth, and pattern.", aura: "Introspective, discerning, insightful" },
  8: { title: "Executor / Strategist", tagline: "Handles resources and power with focus on outcomes.", aura: "Ambitious, influential, results-oriented" },
  9: { title: "Humanitarian / Visionary", tagline: "Broad perspective; channels compassion into impact.", aura: "Empathetic, inspiring, generous" },
  11: { title: "Illuminator (Master 11)", tagline: "Heightened intuition and inspiration; bridges ideas and spirit.", aura: "Intuitive, visionary, catalytic" },
  22: { title: "Master Builder (Master 22)", tagline: "Turns large visions into tangible systems; long-horizon planner.", aura: "Pragmatic, architecting, enduring" },
  33: { title: "Master Healer (Master 33)", tagline: "Deep service and guidance; heals through wisdom and care.", aura: "Compassionate, integrative, mentoring" },
};

function safeBase(n: unknown) {
  const r = reduceToCore(n);
  return base[r] ?? base[1];
}

const templates: Record<CoreKey, (n: number) => string> = {
  lifePath: (n) => {
    const b = safeBase(n);
    return `Your life path emphasizes ${b.title}. ${b.tagline} Aura highlights: ${b.aura}.`;
  },
  expression: (n) => {
    const b = safeBase(n);
    return `Your expression number channels ${b.title}. ${b.tagline} Aura highlights: ${b.aura}.`;
  },
  soulUrge: (n) => {
    const b = safeBase(n);
    return `Heart's Desire leans toward ${b.title}. ${b.tagline} Aura highlights: ${b.aura}.`;
  },
  personality: (n) => {
    const b = safeBase(n);
    return `Outward personality projects ${b.title}. ${b.tagline} Aura highlights: ${b.aura}.`;
  },
  personalYear: (n) => {
    const b = safeBase(n);
    return `This year carries ${b.title} energy. ${b.tagline}`;
  },
  personalMonth: (n) => {
    const b = safeBase(n);
    return `This month highlights ${b.title} themes. ${b.tagline}`;
  },
  personalDay: (n) => {
    const b = safeBase(n);
    return `Today resonates with ${b.title}. ${b.aura}.`;
  },
};

export function describe(core: CoreKey, n: number) {
  return templates[core](n);
}

export const luckyTag: Record<number, string> = {
  1: "Initiative, independence",
  2: "Partnership, balance",
  3: "Expression, creativity",
  4: "Stability, structure",
  5: "Change, versatility",
  6: "Care, responsibility",
  7: "Insight, research",
  8: "Power, execution",
  9: "Compassion, legacy",
  11: "Vision, inspiration",
  22: "Execution at scale",
  33: "Service, healing",
};
