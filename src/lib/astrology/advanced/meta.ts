// src/lib/astrology/advanced/meta.ts
import type { ChartMeta } from "../foundation/types";
import type { AstroOptions } from "./options";
import { getSwisseph } from "../foundation/ephe";

export type EngineMeta = {
  engine: "Swiss Ephemeris";
  seVersion: string;
  nodeType: "true" | "mean";
};

export type ExtendedMeta = ChartMeta & EngineMeta;

export function buildEngineMeta(meta: ChartMeta, opts: Required<AstroOptions>): ExtendedMeta {
  const swisseph = getSwisseph() as any;
  const seVersion = typeof swisseph.swe_version === "function" ? swisseph.swe_version() : "unknown";
  return {
    ...meta,
    engine: "Swiss Ephemeris",
    seVersion,
    nodeType: opts.nodeType,
  };
}
