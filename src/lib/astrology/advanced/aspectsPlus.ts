// src/lib/astrology/advanced/aspectsPlus.ts
import { findAspects as baseFind, findNatalAspects as baseFindNatal } from "../foundation/aspects";
import type { AspectRules, Chart, AspectHit } from "../foundation/types";
import { resolveOptions, AstroOptions } from "./options";

const P_WEIGHT: Record<string, number> = {
  Sun: 1.0, Moon: 1.05, Mercury: 0.95, Venus: 0.95, Mars: 1.0,
  Jupiter: 0.9, Saturn: 0.9, Uranus: 0.85, Neptune: 0.85, Pluto: 0.85,
  "True Node": 0.9, "Chiron": 0.9, "Lilith(True)": 0.9, "Lilith(Mean)": 0.9,
  Ascendant: 1.1, MC: 1.0,
};

function buildRules(base: AspectRules = {}, opts: Required<AstroOptions>): AspectRules {
  const isSaju = opts.theme === "saju";
  const includeMinor = opts.includeMinorAspects && !isSaju;

  return {
    ...base,
    includeMinor,
    maxResults: base.maxResults ?? (isSaju ? 30 : 50),
    orbs: {
      default: base.orbs?.default ?? 1.8,
      Sun: base.orbs?.Sun ?? 1.6,
      Moon: base.orbs?.Moon ?? 2.6,
      inner: base.orbs?.inner ?? 1.5,
      outer: base.orbs?.outer ?? 2.0,
      angles: base.orbs?.angles ?? 2.2,
    },
    perAspectOrbs: {
      ...base.perAspectOrbs,
      semisextile: base.perAspectOrbs?.semisextile ?? (isSaju ? 0.6 : 1.0),
      quincunx:    base.perAspectOrbs?.quincunx    ?? (isSaju ? 0.8 : 1.2),
      quintile:    base.perAspectOrbs?.quintile    ?? (isSaju ? 0.8 : 1.2),
      biquintile:  base.perAspectOrbs?.biquintile  ?? (isSaju ? 0.8 : 1.2),
    },
    perPairOrbs: { ...(base.perPairOrbs ?? {}) },
    scoring: {
      weights: {
        orb: base.scoring?.weights?.orb ?? 0.55,
        aspect: base.scoring?.weights?.aspect ?? 0.4,
        speed: base.scoring?.weights?.speed ?? 0.05,
      },
    },
  };
}

function applyPlanetWeights(hits: AspectHit[]): AspectHit[] {
  return hits.map(h => {
    const aw = Math.max(P_WEIGHT[h.from.name] ?? 1, P_WEIGHT[h.to.name] ?? 1);
    const score = (h.score ?? 0) * aw;
    return { ...h, score: Number(score.toFixed(3)) };
  });
}

export function findAspectsPlus(natal: Chart, transit: Chart, baseRules: AspectRules = {}, options?: AstroOptions): AspectHit[] {
  const opts = resolveOptions(options);
  const rules = buildRules(baseRules, opts);
  const raw = baseFind(natal, transit, rules);
  return applyPlanetWeights(raw);
}

export function findNatalAspectsPlus(natal: Chart, baseRules: AspectRules = {}, options?: AstroOptions): AspectHit[] {
  const opts = resolveOptions(options);
  const rules = buildRules(baseRules, opts);
  const raw = baseFindNatal(natal, rules);
  return applyPlanetWeights(raw);
}